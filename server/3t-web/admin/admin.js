/**
 * Trình quản trị hệ thống bản quyền 3T Office
 * Mã nguồn thuần không phụ thuộc thư viện ngoài
 */

(function () {
  "use strict";

  let currentAdmin = null;
  let csrfToken = "";
  let activeTab = "overview";
  let generatedKeysCache = [];

  const elements = {
    loginView: document.getElementById("view-login"),
    dashboardView: document.getElementById("view-dashboard"),
    loginForm: document.getElementById("login-form"),
    loginError: document.getElementById("login-error"),
    adminUserName: document.getElementById("admin-user-name"),
    logoutBtn: document.getElementById("logout-btn"),
    tabs: document.querySelectorAll(".tab-btn"),
    tabPanels: document.querySelectorAll(".tab-panel"),
  };

  function setStatusMessage(el, text, type) {
    if (!el) return;
    if (!text) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    el.className = `alert alert-${type}`;
    el.textContent = text;
    el.style.display = "block";
  }

  async function apiRequest(url, options = {}) {
    options.headers = options.headers || {};
    if (options.method && options.method !== "GET" && csrfToken) {
      options.headers["x-csrf-token"] = csrfToken;
    }
    options.credentials = "same-origin";
    if (options.body && typeof options.body === "object" && !(options.body instanceof FormData)) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, options);
    if (response.status === 401 && url !== "/api/v1/admin/login") {
      showLoginView();
      throw new Error("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
    }
    return response;
  }

  function showLoginView() {
    currentAdmin = null;
    csrfToken = "";
    if (elements.loginView) elements.loginView.style.display = "block";
    if (elements.dashboardView) elements.dashboardView.style.display = "none";
    if (elements.logoutBtn) elements.logoutBtn.style.display = "none";
    if (elements.adminUserName) elements.adminUserName.textContent = "";
  }

  function showDashboardView(adminName, token) {
    currentAdmin = adminName;
    csrfToken = token || csrfToken;
    if (elements.loginView) elements.loginView.style.display = "none";
    if (elements.dashboardView) elements.dashboardView.style.display = "block";
    if (elements.logoutBtn) elements.logoutBtn.style.display = "inline-flex";
    if (elements.adminUserName) elements.adminUserName.textContent = adminName;
    switchTab(activeTab);
  }

  function switchTab(tabName) {
    activeTab = tabName;
    elements.tabs.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    elements.tabPanels.forEach((panel) => {
      panel.style.display = panel.id === `panel-${tabName}` ? "block" : "none";
    });

    if (tabName === "overview") loadOverview();
    else if (tabName === "keys") loadKeys();
    else if (tabName === "reports") loadReports();
    else if (tabName === "releases") loadReleases();
    else if (tabName === "audit") loadAudit();
  }

  // Khởi tạo và kiểm tra phiên làm việc
  async function checkSession() {
    try {
      const res = await fetch("/api/v1/admin/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          showDashboardView(data.admin, data.csrf_token);
          return;
        }
      }
    } catch (e) {
      // Bỏ qua lỗi mạng khi khởi tạo
    }
    showLoginView();
  }

  // Xử lý Đăng nhập
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatusMessage(elements.loginError, "", "");
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value;

      try {
        const res = await apiRequest("/api/v1/admin/login", {
          method: "POST",
          body: { username, password },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          showDashboardView(data.admin, data.csrf_token);
        } else {
          const msg = data.message || "Tên đăng nhập hoặc mật khẩu không chính xác.";
          setStatusMessage(elements.loginError, msg, "danger");
        }
      } catch (err) {
        setStatusMessage(elements.loginError, err.message || "Lỗi kết nối máy chủ.", "danger");
      }
    });
  }

  // Xử lý Đăng xuất
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener("click", async () => {
      try {
        await apiRequest("/api/v1/admin/logout", { method: "POST" });
      } catch (e) {}
      showLoginView();
    });
  }

  // Gắn sự kiện chuyển tab
  elements.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Tải dữ liệu Tổng quan
  async function loadOverview() {
    try {
      const res = await apiRequest("/api/v1/admin/overview");
      if (!res.ok) return;
      const data = await res.json();
      document.getElementById("kpi-total-keys").textContent = data.total_keys || 0;
      document.getElementById("kpi-active-keys").textContent = data.active_keys || 0;
      document.getElementById("kpi-revoked-keys").textContent = data.revoked_keys || 0;
      document.getElementById("kpi-devices").textContent = data.total_active_devices || 0;
      document.getElementById("kpi-7d").textContent = data.activations_7d || 0;
      document.getElementById("kpi-errors-24h").textContent = data.error_groups_24h || 0;

      const channelsBody = document.getElementById("overview-channels-tbody");
      if (channelsBody) {
        if (!data.channels || data.channels.length === 0) {
          channelsBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Chưa có kênh cập nhật nào</td></tr>';
        } else {
          channelsBody.innerHTML = data.channels
            .map(
              (ch) => `<tr>
              <td><strong>${escapeHtml(ch.channel)}</strong></td>
              <td>${escapeHtml(ch.version)}</td>
              <td>${escapeHtml(ch.updated_at || "—")}</td>
            </tr>`
            )
            .join("");
        }
      }
    } catch (e) {}
  }

  // Tải và hiển thị danh sách Key
  let currentKeyPage = 1;
  async function loadKeys(page = 1) {
    currentKeyPage = page;
    const q = (document.getElementById("keys-search")?.value || "").trim();
    const status = document.getElementById("keys-filter-status")?.value || "all";
    const tbody = document.getElementById("keys-tbody");
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải danh sách...</td></tr>';
    try {
      const res = await apiRequest(`/api/v1/admin/keys?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&page=${page}&page_size=20`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data.keys || data.keys.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không tìm thấy mã bản quyền nào</td></tr>';
        return;
      }

      tbody.innerHTML = data.keys
        .map((k) => {
          const isRevoked = k.status === "revoked";
          const statusBadge = isRevoked
            ? '<span class="badge badge-revoked">Đã thu hồi</span>'
            : '<span class="badge badge-active">Hoạt động</span>';

          return `<tr>
          <td><span class="code-text">…${escapeHtml(k.key_hint)}</span></td>
          <td>${escapeHtml(k.note || "—")}</td>
          <td>${escapeHtml(k.email || "—")}</td>
          <td>${k.seats_used} / ${k.seats_max}</td>
          <td>${statusBadge}</td>
          <td>${formatDate(k.created_at)}</td>
          <td>
            <div style="display:flex; gap:4px; flex-wrap:wrap;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.adminShowKeyDetail('${k.id}')">Chi tiết</button>
              ${
                !isRevoked
                  ? `<button type="button" class="btn btn-secondary btn-sm" onclick="window.adminUpdateSeats('${k.id}', ${k.seats_max})">Sửa máy</button>
                     <button type="button" class="btn btn-secondary btn-sm" onclick="window.adminReissueKey('${k.id}')">Cấp lại</button>
                     <button type="button" class="btn btn-danger btn-sm" onclick="window.adminRevokeKey('${k.id}')">Thu hồi</button>`
                  : ""
              }
            </div>
          </td>
        </tr>`;
        })
        .join("");

      // Phân trang
      renderKeysPagination(data.total, data.page, data.page_size);
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red;">Lỗi tải danh sách</td></tr>';
    }
  }

  function renderKeysPagination(total, page, pageSize) {
    const pag = document.getElementById("keys-pagination");
    if (!pag) return;
    const totalPages = Math.ceil(total / pageSize);
    if (totalPages <= 1) {
      pag.innerHTML = `<span>Tổng số: ${total} mã bản quyền</span>`;
      return;
    }
    pag.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%; gap:8px;">
        <span>Trang ${page} / ${totalPages} (Tổng: ${total})</span>
        <div style="display:flex; gap:4px;">
          <button type="button" class="btn btn-secondary btn-sm" ${page <= 1 ? "disabled" : ""} onclick="window.adminLoadKeysPage(${page - 1})">Trước</button>
          <button type="button" class="btn btn-secondary btn-sm" ${page >= totalPages ? "disabled" : ""} onclick="window.adminLoadKeysPage(${page + 1})">Sau</button>
        </div>
      </div>
    `;
  }

  window.adminLoadKeysPage = function (page) {
    loadKeys(page);
  };

  const keysSearchInput = document.getElementById("keys-search");
  if (keysSearchInput) {
    keysSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadKeys(1);
    });
  }
  const keysFilterStatus = document.getElementById("keys-filter-status");
  if (keysFilterStatus) {
    keysFilterStatus.addEventListener("change", () => loadKeys(1));
  }

  // Modal Tạo Key
  const createKeyModal = document.getElementById("modal-create-keys");
  const openCreateKeyBtn = document.getElementById("btn-open-create-keys");
  const closeCreateKeyBtn = document.getElementById("btn-close-create-keys");
  const formCreateKeys = document.getElementById("form-create-keys");
  const createdResultBox = document.getElementById("created-keys-result");

  if (openCreateKeyBtn && createKeyModal) {
    openCreateKeyBtn.addEventListener("click", () => {
      createKeyModal.style.display = "flex";
      document.getElementById("create-key-error").style.display = "none";
    });
  }
  if (closeCreateKeyBtn && createKeyModal) {
    closeCreateKeyBtn.addEventListener("click", () => {
      createKeyModal.style.display = "none";
    });
  }

  if (formCreateKeys) {
    formCreateKeys.addEventListener("submit", async (e) => {
      e.preventDefault();
      const count = parseInt(document.getElementById("create-count").value, 10) || 1;
      const seatsMax = parseInt(document.getElementById("create-seats").value, 10) || 2;
      const note = document.getElementById("create-note").value.trim();
      const email = document.getElementById("create-email").value.trim();
      const errBox = document.getElementById("create-key-error");

      try {
        const res = await apiRequest("/api/v1/admin/keys", {
          method: "POST",
          body: { count, seats_max: seatsMax, note, email },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          createKeyModal.style.display = "none";
          showCreatedKeysResult(data.keys, note, email, seatsMax);
          loadKeys(1);
        } else {
          setStatusMessage(errBox, data.message || "Lỗi tạo mã bản quyền.", "danger");
        }
      } catch (err) {
        setStatusMessage(errBox, err.message || "Lỗi kết nối.", "danger");
      }
    });
  }

  function showCreatedKeysResult(keys, note, email, seatsMax) {
    generatedKeysCache = keys.map((k) => ({
      key: k,
      note: note,
      email: email,
      seats: seatsMax,
    }));

    if (createdResultBox) {
      createdResultBox.style.display = "block";
      const listEl = document.getElementById("created-keys-list");
      if (listEl) {
        listEl.innerHTML = keys
          .map((k) => `<div style="padding:4px 0;"><span class="code-text" style="font-size:14px;font-weight:600;">${k}</span></div>`)
          .join("");
      }
      createdResultBox.scrollIntoView({ behavior: "smooth" });
    }
  }

  // Tải tệp CSV danh sách key vừa tạo
  const downloadCsvBtn = document.getElementById("btn-download-csv");
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", () => {
      if (!generatedKeysCache || generatedKeysCache.length === 0) return;
      let csvContent = "\uFEFFMa_Ban_Quyen,Ghi_Chu,Email,So_May\n";
      generatedKeysCache.forEach((row) => {
        csvContent += `"${row.key}","${(row.note || "").replace(/"/g, '""')}","${(row.email || "").replace(/"/g, '""')}",${row.seats}\n`;
      });
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `3t-office-keys-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Thu hồi key
  window.adminRevokeKey = async function (keyId) {
    if (!confirm("Bạn có chắc chắn muốn thu hồi mã bản quyền này không? Tất cả thiết bị đang sử dụng sẽ bị hủy quyền.")) {
      return;
    }
    try {
      const res = await apiRequest(`/api/v1/admin/keys/${keyId}/revoke`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("Đã thu hồi mã bản quyền thành công.");
        loadKeys(currentKeyPage);
      } else {
        alert(data.message || "Không thể thu hồi mã bản quyền.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  // Cấp lại key
  window.adminReissueKey = async function (keyId) {
    if (!confirm("Cấp lại mã bản quyền mới sẽ thu hồi mã bản quyền cũ ngay lập tức. Bạn có muốn tiếp tục?")) {
      return;
    }
    try {
      const res = await apiRequest(`/api/v1/admin/keys/${keyId}/reissue`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        showCreatedKeysResult([data.key], data.note, data.email, data.seats_max);
        alert(`Đã cấp lại mã bản quyền mới thành công:\n${data.key}\n\nLưu ý: Mã bản quyền chỉ hiển thị một lần này!`);
        loadKeys(currentKeyPage);
      } else {
        alert(data.message || "Không thể cấp lại mã bản quyền.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  // Sửa số máy tối đa
  window.adminUpdateSeats = async function (keyId, currentSeats) {
    const val = prompt("Nhập số lượng máy tối đa cho mã bản quyền này:", currentSeats);
    if (!val) return;
    const seatsMax = parseInt(val, 10);
    if (isNaN(seatsMax) || seatsMax < 1 || seatsMax > 100) {
      alert("Số máy phải nằm trong khoảng từ 1 đến 100.");
      return;
    }
    try {
      const res = await apiRequest(`/api/v1/admin/keys/${keyId}/seats`, {
        method: "POST",
        body: { seats_max: seatsMax },
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("Đã cập nhật số máy thành công.");
        loadKeys(currentKeyPage);
      } else {
        alert(data.message || "Không thể cập nhật số máy.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  // Chi tiết Key và danh sách thiết bị
  const detailModal = document.getElementById("modal-key-detail");
  const closeDetailBtn = document.getElementById("btn-close-key-detail");
  if (closeDetailBtn && detailModal) {
    closeDetailBtn.addEventListener("click", () => {
      detailModal.style.display = "none";
    });
  }

  window.adminShowKeyDetail = async function (keyId) {
    try {
      const res = await apiRequest(`/api/v1/admin/keys/${keyId}`);
      if (!res.ok) return;
      const data = await res.json();
      const k = data.key;
      document.getElementById("detail-key-hint").textContent = `…${k.key_hint}`;
      document.getElementById("detail-key-status").textContent = k.status === "active" ? "Hoạt động" : "Đã thu hồi";
      document.getElementById("detail-key-seats").textContent = `${k.seats_used} / ${k.seats_max}`;
      document.getElementById("detail-key-note").textContent = k.note || "—";
      document.getElementById("detail-key-email").textContent = k.email || "—";

      const devTbody = document.getElementById("detail-devices-tbody");
      if (devTbody) {
        if (!data.activations || data.activations.length === 0) {
          devTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Chưa có thiết bị nào kích hoạt</td></tr>';
        } else {
          devTbody.innerHTML = data.activations
            .map((a) => {
              const isRemoved = a.removed_at !== null;
              return `<tr>
              <td><strong>${escapeHtml(a.device_name || "Thiết bị")}</strong></td>
              <td>${escapeHtml(a.app_version || "—")}</td>
              <td>${formatDate(a.first_at)}</td>
              <td>${formatDate(a.last_check_at)}</td>
              <td>
                ${
                  !isRemoved
                    ? `<button type="button" class="btn btn-danger btn-sm" onclick="window.adminRemoveDevice('${k.id}', '${a.id}')">Gỡ máy</button>`
                    : '<span style="color:var(--adm-text-muted);">Đã gỡ</span>'
                }
              </td>
            </tr>`;
            })
            .join("");
        }
      }

      if (detailModal) detailModal.style.display = "flex";
    } catch (e) {
      alert("Lỗi tải thông tin chi tiết.");
    }
  };

  // Gỡ thiết bị khỏi key
  window.adminRemoveDevice = async function (keyId, deviceId) {
    if (!confirm("Bạn có chắc chắn muốn gỡ thiết bị này? Thiết bị sẽ mất quyền kích hoạt.")) {
      return;
    }
    try {
      const res = await apiRequest(`/api/v1/admin/keys/${keyId}/devices/${deviceId}/remove`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.ok) {
        alert("Đã gỡ thiết bị thành công.");
        window.adminShowKeyDetail(keyId);
        loadKeys(currentKeyPage);
      } else {
        alert(data.message || "Không thể gỡ thiết bị.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
  };

  // Kích hoạt ngoại tuyến
  const formOffline = document.getElementById("form-offline-activate");
  const offlineResultBox = document.getElementById("offline-result-box");
  const offlineErrorBox = document.getElementById("offline-error-box");
  const offlineCodeOutput = document.getElementById("offline-code-output");
  const copyOfflineCodeBtn = document.getElementById("btn-copy-offline-code");

  if (formOffline) {
    formOffline.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatusMessage(offlineErrorBox, "", "");
      if (offlineResultBox) offlineResultBox.style.display = "none";

      const key = document.getElementById("offline-key").value.trim();
      const deviceCode = document.getElementById("offline-device-code").value.trim();
      const deviceName = document.getElementById("offline-device-name").value.trim();

      try {
        const res = await apiRequest("/api/v1/admin/license/activate-offline", {
          method: "POST",
          body: { key, device_code: deviceCode, device_name: deviceName || null },
        });
        const data = await res.json();
        if (res.ok && data.activation_code) {
          if (offlineCodeOutput) offlineCodeOutput.textContent = data.activation_code;
          if (offlineResultBox) offlineResultBox.style.display = "block";
        } else {
          setStatusMessage(offlineErrorBox, data.message || "Không thể tạo mã kích hoạt ngoại tuyến.", "danger");
        }
      } catch (err) {
        setStatusMessage(offlineErrorBox, err.message || "Lỗi kết nối.", "danger");
      }
    });
  }

  if (copyOfflineCodeBtn && offlineCodeOutput) {
    copyOfflineCodeBtn.addEventListener("click", () => {
      const text = offlineCodeOutput.textContent;
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          alert("Đã sao chép mã kích hoạt vào bộ nhớ đệm!");
        })
        .catch(() => {
          alert("Vui lòng bôi đen và sao chép thủ công.");
        });
    });
  }

  // Báo cáo lỗi (Reports)
  async function loadReports() {
    const tbody = document.getElementById("reports-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải danh sách báo lỗi...</td></tr>';
    try {
      const res = await apiRequest("/api/v1/admin/reports");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.groups || data.groups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Không có báo cáo lỗi nào được ghi nhận</td></tr>';
        return;
      }

      window.reportsCache = data.groups;
      tbody.innerHTML = data.groups
        .map(
          (r, idx) => `<tr>
          <td><span class="badge badge-active">${escapeHtml(r.apps || "Chung")}</span></td>
          <td>${escapeHtml(r.version)}</td>
          <td><span class="code-text">${escapeHtml(r.error_type || "Error")}</span></td>
          <td>${r.occurrences}</td>
          <td>${r.installations}</td>
          <td>${formatDate(r.last_seen)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.adminViewReportDetail(${idx})">Xem mẫu</button>
          </td>
        </tr>`
        )
        .join("");
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:red;">Lỗi tải danh sách báo lỗi</td></tr>';
    }
  }

  const reportModal = document.getElementById("modal-report-detail");
  const closeReportBtn = document.getElementById("btn-close-report-detail");
  if (closeReportBtn && reportModal) {
    closeReportBtn.addEventListener("click", () => {
      reportModal.style.display = "none";
    });
  }

  window.adminViewReportDetail = function (idx) {
    const report = window.reportsCache && window.reportsCache[idx];
    if (!report || !reportModal) return;
    document.getElementById("report-modal-label").textContent = `${report.error_type} (${report.version})`;
    document.getElementById("report-modal-msg").textContent = report.sample_message || "—";
    document.getElementById("report-modal-stack").textContent = report.sample_stack || "Không có nhật ký ngăn xếp";
    reportModal.style.display = "flex";
  };

  // Phát hành & Bộ cài (Releases)
  async function loadReleases() {
    const chBody = document.getElementById("releases-channels-tbody");
    const dlBody = document.getElementById("releases-downloads-tbody");
    try {
      const res = await apiRequest("/api/v1/admin/releases");
      if (!res.ok) return;
      const data = await res.json();

      if (chBody) {
        if (!data.channels || data.channels.length === 0) {
          chBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Không có dữ liệu kênh phát hành</td></tr>';
        } else {
          chBody.innerHTML = data.channels
            .map(
              (c) => `<tr>
              <td><strong>${escapeHtml(c.channel)}</strong></td>
              <td>${escapeHtml(c.version)}</td>
              <td>${escapeHtml(c.date || "—")}</td>
              <td><span class="code-text">${escapeHtml(c.manifest_sha256 ? c.manifest_sha256.slice(0, 16) + "…" : "—")}</span></td>
            </tr>`
            )
            .join("");
        }
      }

      if (dlBody) {
        if (!data.downloads || data.downloads.length === 0) {
          dlBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chưa có tệp bộ cài nào trong thư mục tải về</td></tr>';
        } else {
          dlBody.innerHTML = data.downloads
            .map(
              (d) => `<tr>
              <td><strong>${escapeHtml(d.file_name)}</strong></td>
              <td>${formatBytes(d.file_size)}</td>
              <td><span class="code-text">${escapeHtml(d.sha256)}</span></td>
              <td>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.adminCheckDownloadLink('${escapeHtml(d.file_name)}')">Kiểm tra tải</button>
              </td>
            </tr>`
            )
            .join("");
        }
      }
    } catch (e) {}
  }

  window.adminCheckDownloadLink = async function (fileName) {
    try {
      const res = await fetch(`/downloads/${encodeURIComponent(fileName)}`, { method: "HEAD" });
      if (res.ok) {
        alert(`Đường tải tệp '${fileName}' hoạt động bình thường (Mã trạng thái HTTP ${res.status}).`);
      } else {
        alert(`Lỗi đường tải: HTTP ${res.status}`);
      }
    } catch (e) {
      alert("Không thể kết nối để kiểm tra đường tải.");
    }
  };

  // Nhật ký Quản trị (Audit)
  async function loadAudit() {
    const tbody = document.getElementById("audit-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải nhật ký...</td></tr>';
    try {
      const res = await apiRequest("/api/v1/admin/audit?limit=100");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.audit_logs || data.audit_logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Chưa có thao tác quản trị nào được ghi lại</td></tr>';
        return;
      }

      tbody.innerHTML = data.audit_logs
        .map(
          (a) => `<tr>
          <td>${formatDate(a.at)}</td>
          <td><strong>${escapeHtml(a.admin)}</strong></td>
          <td><span class="badge badge-active">${escapeHtml(a.action)}</span></td>
          <td><span class="code-text">${escapeHtml(a.target)}</span></td>
        </tr>`
        )
        .join("");
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:red;">Lỗi tải nhật ký</td></tr>';
    }
  }

  // Tiện ích
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch (e) {
      return isoStr;
    }
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Khởi động
  checkSession();
})();
