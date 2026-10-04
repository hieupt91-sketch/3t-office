/**
 * Trình quản trị hệ thống bản quyền 3T Office
 * Mã nguồn thuần không phụ thuộc thư viện ngoài, tối ưu bảo mật và phân quyền vai trò.
 */

(function () {
  "use strict";

  let currentAdmin = null;
  let currentRole = "viewer";
  let csrfToken = "";
  let activeTab = "overview";
  let generatedKeysCache = [];
  let lastActivityTime = Date.now();
  let sessionTimer = null;

  const elements = {
    loginView: document.getElementById("view-login"),
    dashboardView: document.getElementById("view-dashboard"),
    loginForm: document.getElementById("login-form"),
    loginError: document.getElementById("login-error"),
    adminUserName: document.getElementById("admin-user-name"),
    adminUserRole: document.getElementById("admin-user-role"),
    logoutBtn: document.getElementById("logout-btn"),
    btnChangePwdHeader: document.getElementById("btn-change-pwd-header"),
    sessionWarning: document.getElementById("session-warning"),
    sessionTimeoutSecs: document.getElementById("session-timeout-secs"),
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

  function resetActivity() {
    lastActivityTime = Date.now();
    if (elements.sessionWarning) elements.sessionWarning.style.display = "none";
  }

  window.addEventListener("mousemove", resetActivity, { passive: true });
  window.addEventListener("keydown", resetActivity, { passive: true });
  window.addEventListener("click", resetActivity, { passive: true });

  function startSessionTimer() {
    if (sessionTimer) clearInterval(sessionTimer);
    sessionTimer = setInterval(() => {
      if (!currentAdmin) return;
      const inactiveSecs = Math.floor((Date.now() - lastActivityTime) / 1000);
      const remainingSecs = 1800 - inactiveSecs; // 30 phút = 1800 giây

      if (remainingSecs <= 300 && remainingSecs > 0) {
        if (elements.sessionWarning) {
          elements.sessionWarning.style.display = "block";
          if (elements.sessionTimeoutSecs) elements.sessionTimeoutSecs.textContent = remainingSecs;
        }
      } else if (remainingSecs <= 0) {
        // Hết hạn 30 phút tự động đăng xuất
        clearInterval(sessionTimer);
        sessionTimer = null;
        handleSessionExpired();
      }
    }, 1000);
  }

  async function handleSessionExpired() {
    try {
      await fetch("/api/v1/admin/logout", { method: "POST" });
    } catch (_) {}
    showLoginView();
    setStatusMessage(elements.loginError, "Phiên làm việc đã hết hạn do không hoạt động trong 30 phút.", "warning");
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

  function applyRolePermissions() {
    // Cập nhật nhãn vai trò
    if (elements.adminUserRole) {
      elements.adminUserRole.style.display = "inline-block";
      elements.adminUserRole.className = `role-badge role-badge-${currentRole}`;
      if (currentRole === "owner") elements.adminUserRole.textContent = "Chủ sở hữu";
      else if (currentRole === "support") elements.adminUserRole.textContent = "Hỗ trợ";
      else elements.adminUserRole.textContent = "Chỉ xem";
    }

    // Ẩn hoặc tắt nút ghi đối với vai trò hạn chế
    const writeElements = document.querySelectorAll(".require-write");
    const ownerElements = document.querySelectorAll(".require-owner");

    if (currentRole === "viewer") {
      writeElements.forEach((el) => {
        el.style.display = "none";
      });
      ownerElements.forEach((el) => {
        el.style.display = "none";
      });
    } else if (currentRole === "support") {
      writeElements.forEach((el) => {
        el.style.display = "";
      });
      ownerElements.forEach((el) => {
        el.style.display = "none";
      });
    } else {
      writeElements.forEach((el) => {
        el.style.display = "";
      });
      ownerElements.forEach((el) => {
        el.style.display = "";
      });
    }
  }

  function showLoginView() {
    currentAdmin = null;
    currentRole = "viewer";
    csrfToken = "";
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
    if (elements.loginView) elements.loginView.style.display = "block";
    if (elements.dashboardView) elements.dashboardView.style.display = "none";
    if (elements.logoutBtn) elements.logoutBtn.style.display = "none";
    if (elements.btnChangePwdHeader) elements.btnChangePwdHeader.style.display = "none";
    if (elements.adminUserName) elements.adminUserName.textContent = "";
    if (elements.adminUserRole) elements.adminUserRole.style.display = "none";
    if (elements.sessionWarning) elements.sessionWarning.style.display = "none";
  }

  function showDashboardView(adminName, role, token) {
    currentAdmin = adminName;
    currentRole = role || "viewer";
    csrfToken = token || csrfToken;

    if (elements.loginView) elements.loginView.style.display = "none";
    if (elements.dashboardView) elements.dashboardView.style.display = "block";
    if (elements.logoutBtn) elements.logoutBtn.style.display = "inline-flex";
    if (elements.btnChangePwdHeader) elements.btnChangePwdHeader.style.display = "inline-flex";
    if (elements.adminUserName) elements.adminUserName.textContent = adminName;

    applyRolePermissions();
    resetActivity();
    startSessionTimer();
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
    else if (tabName === "orders") loadOrders();
    else if (tabName === "reconciliation") loadReconciliation();
    else if (tabName === "customers") loadCustomers();
    else if (tabName === "invoices") loadInvoices();
    else if (tabName === "keys") loadKeys();
    else if (tabName === "outbox") loadOutbox();
    else if (tabName === "reports") loadReports();
    else if (tabName === "releases") loadReleases();
    else if (tabName === "audit") loadAudit();
    else if (tabName === "settings") loadSettings();
  }

  // Khởi tạo và kiểm tra phiên làm việc
  async function checkSession() {
    try {
      const res = await fetch("/api/v1/admin/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          showDashboardView(data.admin, data.role || "viewer", data.csrf_token);
          return;
        }
      }
    } catch (_) {}
    showLoginView();
  }

  // Xử lý Đăng nhập
  if (elements.loginForm) {
    elements.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      setStatusMessage(elements.loginError, "", "");
      const username = document.getElementById("login-username").value.trim();
      const password = document.getElementById("login-password").value;
      const totp_code = document.getElementById("login-totp").value.trim() || undefined;

      try {
        const res = await apiRequest("/api/v1/admin/login", {
          method: "POST",
          body: { username, password, totp_code },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          showDashboardView(data.admin, data.role, data.csrf_token);

          // Nếu máy chủ yêu cầu đổi mật khẩu lần đầu
          if (data.must_change_password) {
            openChangePasswordModal(true);
          }
        } else {
          const msg = data.message || "Tên đăng nhập, mật khẩu hoặc mã 2FA không chính xác.";
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
      } catch (_) {}
      showLoginView();
    });
  }

  // Gắn sự kiện chuyển tab
  elements.tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // 1. Tải dữ liệu Tổng quan
  async function loadOverview() {
    try {
      const res = await apiRequest("/api/v1/admin/overview");
      if (!res.ok) return;
      const data = await res.json();
      document.getElementById("kpi-total-keys").textContent = data.total_keys || 0;
      document.getElementById("kpi-active-keys").textContent = data.active_keys || 0;
      document.getElementById("kpi-revoked-keys").textContent = data.revoked_keys || 0;
      document.getElementById("kpi-devices").textContent = data.total_active_devices || 0;
      document.getElementById("kpi-errors-24h").textContent = data.error_groups_24h || 0;

      // KPI thương mại mới
      const revToday = document.getElementById("kpi-revenue-today");
      if (revToday) revToday.textContent = `${(data.revenue_today || 0).toLocaleString("vi-VN")} đ`;

      const pendingOrders = document.getElementById("kpi-orders-pending");
      if (pendingOrders) pendingOrders.textContent = data.orders_pending || 0;

      const unmatchedPay = document.getElementById("kpi-unmatched-payments");
      if (unmatchedPay) unmatchedPay.textContent = data.unmatched_payments || 0;

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
    } catch (_) {}
  }

  // 2. Tải và hiển thị danh sách Đơn hàng
  async function loadOrders() {
    const tbody = document.getElementById("orders-tbody");
    if (!tbody) return;
    const q = (document.getElementById("orders-search")?.value || "").trim();
    const status = document.getElementById("orders-filter-status")?.value || "";

    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Đang tải danh sách đơn hàng...</td></tr>';
    try {
      const res = await apiRequest(`/api/v1/admin/orders?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}&limit=50`);
      if (!res.ok) return;
      const data = await res.json();
      const orders = data.orders || [];

      if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">Không tìm thấy đơn hàng nào</td></tr>';
        return;
      }

      tbody.innerHTML = orders
        .map((o) => `
        <tr>
          <td><strong style="font-family: var(--font-mono);">${escapeHtml(o.code)}</strong></td>
          <td>${escapeHtml(o.customer_name || "—")}</td>
          <td>${escapeHtml(o.customer_email || "—")}</td>
          <td>${escapeHtml(o.plan_name || "Gói vĩnh viễn")}</td>
          <td>${o.quantity || 1}</td>
          <td><strong>${(o.amount_vnd || 0).toLocaleString("vi-VN")} đ</strong></td>
          <td>
            <span class="badge ${o.status === 'fulfilled' ? 'badge-active' : (o.status === 'pending' ? 'badge-warning' : 'badge-revoked')}">
              ${o.status === 'fulfilled' ? 'Hoàn tất' : (o.status === 'pending' ? 'Chờ thanh toán' : o.status)}
            </span>
          </td>
          <td>${formatDate(o.created_at)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.adminShowOrderDetail('${o.id}')">Chi tiết</button>
          </td>
        </tr>
      `).join("");
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:red;">Lỗi nạp danh sách đơn hàng</td></tr>';
    }
  }

  // 3. Tải danh sách giao dịch chưa khớp
  async function loadReconciliation() {
    const tbody = document.getElementById("reconcile-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Đang tải danh sách giao dịch...</td></tr>';

    try {
      const res = await apiRequest("/api/v1/admin/payments/unmatched");
      if (!res.ok) return;
      const data = await res.json();
      const payments = data.unmatched_payments || [];

      if (payments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--adm-success);">Không có giao dịch nào chưa khớp</td></tr>';
        return;
      }

      tbody.innerHTML = payments
        .map((p) => `
        <tr>
          <td><code style="font-family: var(--font-mono);">${escapeHtml(p.provider_ref)}</code></td>
          <td>${escapeHtml(p.provider)}</td>
          <td><strong style="color: var(--adm-warning);">${(p.amount_vnd || 0).toLocaleString("vi-VN")} đ</strong></td>
          <td>${formatDate(p.created_at)}</td>
          <td><span class="badge badge-warning">Chưa khớp</span></td>
          <td>
            <button type="button" class="btn btn-primary btn-sm require-write" onclick="window.adminOpenAssignPayment('${p.id}')">Gán vào đơn</button>
          </td>
        </tr>
      `).join("");
      applyRolePermissions();
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Lỗi tải dữ liệu đối soát</td></tr>';
    }
  }

  // 4. Tải danh sách Khách hàng
  async function loadCustomers() {
    const tbody = document.getElementById("customers-tbody");
    if (!tbody) return;
    const q = (document.getElementById("customers-search")?.value || "").trim();

    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Đang tải danh sách khách hàng...</td></tr>';
    try {
      const res = await apiRequest(`/api/v1/admin/customers?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      const customers = data.customers || [];

      if (customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Không tìm thấy khách hàng nào</td></tr>';
        return;
      }

      tbody.innerHTML = customers
        .map((c) => `
        <tr>
          <td><strong>${escapeHtml(c.name || "—")}</strong></td>
          <td>${escapeHtml(c.email)}</td>
          <td>${escapeHtml(c.phone || "—")}</td>
          <td>${escapeHtml(c.company || "—")}</td>
          <td>${escapeHtml(c.tax_code || "—")}</td>
          <td>${c.total_orders || 0}</td>
          <td>${c.active_keys || 0}</td>
          <td><strong>${(c.total_spent_vnd || 0).toLocaleString("vi-VN")} đ</strong></td>
        </tr>
      `).join("");
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Lỗi tải danh sách khách hàng</td></tr>';
    }
  }

  // 5. Tải danh sách Hóa đơn
  async function loadInvoices() {
    const tbody = document.getElementById("invoices-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Đang tải danh sách hóa đơn...</td></tr>';

    try {
      const res = await apiRequest("/api/v1/admin/invoices");
      if (!res.ok) return;
      const data = await res.json();
      const invoices = data.invoices || [];

      if (invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Chưa có hóa đơn nào được tạo</td></tr>';
        return;
      }

      tbody.innerHTML = invoices
        .map((inv) => `
        <tr>
          <td><strong>${escapeHtml(inv.invoice_number)}</strong></td>
          <td><code>${escapeHtml(inv.order_code || inv.order_id)}</code></td>
          <td>${escapeHtml(inv.buyer_name || "—")}</td>
          <td>${escapeHtml(inv.buyer_tax_code || "—")}</td>
          <td>${(inv.total_vnd || 0).toLocaleString("vi-VN")} đ</td>
          <td>${formatDate(inv.issued_at)}</td>
          <td><span class="badge ${inv.status === 'issued' ? 'badge-active' : 'badge-revoked'}">${inv.status}</span></td>
          <td>
            ${inv.pdf_url ? `<a href="${escapeHtml(inv.pdf_url)}" target="_blank" class="btn btn-secondary btn-sm">Xem PDF</a>` : "—"}
          </td>
        </tr>
      `).join("");
      applyRolePermissions();
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Lỗi nạp hóa đơn</td></tr>';
    }
  }

  // 6. Tải và hiển thị danh sách Key
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
                  ? `<button type="button" class="btn btn-secondary btn-sm require-write" onclick="window.adminUpdateSeats('${k.id}', ${k.seats_max})">Sửa máy</button>
                     <button type="button" class="btn btn-secondary btn-sm require-write" onclick="window.adminReissueKey('${k.id}')">Cấp lại</button>
                     <button type="button" class="btn btn-danger btn-sm require-owner" onclick="window.adminRevokeKey('${k.id}')">Thu hồi</button>`
                  : ""
              }
            </div>
          </td>
        </tr>`;
        })
        .join("");

      renderKeysPagination(data.total, data.page, data.page_size);
      applyRolePermissions();
    } catch (_) {
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

  // 7. Tải Outbox Email
  async function loadOutbox() {
    const tbody = document.getElementById("outbox-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải danh sách thư...</td></tr>';

    try {
      const res = await apiRequest("/api/v1/admin/emails/outbox");
      if (!res.ok) return;
      const data = await res.json();
      const emails = data.emails || [];

      if (emails.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Hàng đợi thư rỗng</td></tr>';
        return;
      }

      tbody.innerHTML = emails
        .map((em) => `
        <tr>
          <td>${formatDate(em.created_at)}</td>
          <td><strong>${escapeHtml(em.to_email)}</strong></td>
          <td><code>${escapeHtml(em.template)}</code></td>
          <td>
            <span class="badge ${em.status === 'sent' ? 'badge-active' : (em.status === 'queued' ? 'badge-warning' : 'badge-revoked')}">
              ${em.status}
            </span>
          </td>
          <td>${em.attempts || 0}</td>
          <td style="font-size: 12px; color: var(--adm-text-muted);">${escapeHtml(em.last_error || "—")}</td>
          <td>
            ${em.status !== 'sent' ? `
              <button type="button" class="btn btn-secondary btn-sm require-write" onclick="window.adminRetryEmail('${em.id}')">Gửi lại</button>
            ` : '—'}
          </td>
        </tr>
      `).join("");
      applyRolePermissions();
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Lỗi tải danh sách thư</td></tr>';
    }
  }

  // 8. Tải Báo cáo lỗi
  async function loadReports() {
    const tbody = document.getElementById("reports-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải danh sách...</td></tr>';

    try {
      const res = await apiRequest("/api/v1/admin/reports");
      if (!res.ok) return;
      const data = await res.json();
      const groups = data.error_groups || [];

      if (groups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--adm-success);">Không ghi nhận sự cố nào gần đây</td></tr>';
        return;
      }

      tbody.innerHTML = groups
        .map((g) => `
        <tr>
          <td><strong>${escapeHtml(g.app_name)}</strong></td>
          <td>${escapeHtml(g.app_version)}</td>
          <td><code class="code-text">${escapeHtml(g.signature)}</code></td>
          <td><strong>${g.count}</strong></td>
          <td>${g.unique_devices || 1}</td>
          <td>${formatDate(g.last_seen)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.adminShowReportDetail('${g.signature}')">Chi tiết</button>
          </td>
        </tr>
      `).join("");
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Lỗi tải báo cáo sự cố</td></tr>';
    }
  }

  // 9. Tải Kênh phát hành & Bộ cài
  async function loadReleases() {
    const chanBody = document.getElementById("releases-channels-tbody");
    const dlBody = document.getElementById("releases-downloads-tbody");

    try {
      const res = await apiRequest("/api/v1/admin/releases");
      if (!res.ok) return;
      const data = await res.json();

      if (chanBody) {
        chanBody.innerHTML = (data.channels || []).map((ch) => `
          <tr>
            <td><strong>${escapeHtml(ch.channel)}</strong></td>
            <td>${escapeHtml(ch.version)}</td>
            <td>${formatDate(ch.released_at)}</td>
            <td><code class="code-text" style="font-size:11px;">${escapeHtml(ch.manifest_hash || "—")}</code></td>
            <td>
              <button type="button" class="btn btn-danger btn-sm require-owner" onclick="window.adminRollbackRelease('${ch.channel}')">Rút lại</button>
            </td>
          </tr>
        `).join("");
      }

      if (dlBody) {
        dlBody.innerHTML = (data.downloads || []).map((d) => `
          <tr>
            <td><strong>${escapeHtml(d.file_name)}</strong></td>
            <td>${(d.size_bytes / (1024 * 1024)).toFixed(1)} MB</td>
            <td><code class="code-text" style="font-size:11px;">${escapeHtml(d.sha256)}</code></td>
            <td>
              <a href="${escapeHtml(d.url)}" class="btn btn-secondary btn-sm">Tải thử</a>
            </td>
          </tr>
        `).join("");
      }
      applyRolePermissions();
    } catch (_) {}
  }

  // 10. Tải Nhật ký quản trị
  async function loadAudit() {
    const tbody = document.getElementById("audit-tbody");
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải nhật ký...</td></tr>';

    try {
      const res = await apiRequest("/api/v1/admin/audit");
      if (!res.ok) return;
      const data = await res.json();
      const logs = data.audit_logs || [];

      if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nhật ký thao tác trống</td></tr>';
        return;
      }

      tbody.innerHTML = logs.map((l) => `
        <tr>
          <td>${formatDate(l.created_at)}</td>
          <td><strong>${escapeHtml(l.admin_user || "system")}</strong></td>
          <td><code>${escapeHtml(l.action)}</code></td>
          <td>${escapeHtml(l.target || "—")}</td>
        </tr>
      `).join("");
    } catch (_) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red;">Lỗi tải nhật ký</td></tr>';
    }
  }

  // 11. Tải và xử lý Cài đặt hệ thống
  async function loadSettings() {
    // Nạp giá gói bán
    try {
      const res = await apiRequest("/api/v1/shop/plans");
      if (res.ok) {
        const data = await res.json();
        const p = (data.plans || []).find((x) => x.code === "perpetual");
        if (p) {
          const priceInput = document.getElementById("set-plan-price");
          if (priceInput) priceInput.value = p.price_vnd || 0;
        }
      }
    } catch (_) {}

    // Nạp danh sách admin users
    const adminsTbody = document.getElementById("admins-tbody");
    if (adminsTbody) {
      try {
        const res = await apiRequest("/api/v1/admin/users");
        if (res.ok) {
          const data = await res.json();
          const users = data.users || [];
          adminsTbody.innerHTML = users.map((u) => `
            <tr>
              <td><strong>${escapeHtml(u.username)}</strong></td>
              <td>${escapeHtml(u.full_name || "—")}</td>
              <td>${escapeHtml(u.email || "—")}</td>
              <td><span class="role-badge role-badge-${u.role}">${escapeHtml(u.role)}</span></td>
              <td>${u.totp_enabled ? '<span style="color:var(--adm-success); font-weight:700;">Đã bật</span>' : '<span style="color:var(--adm-text-muted);">Chưa bật</span>'}</td>
              <td>${formatDate(u.last_login_at)}</td>
              <td>${u.is_active ? '<span class="badge badge-active">Hoạt động</span>' : '<span class="badge badge-revoked">Khóa</span>'}</td>
            </tr>
          `).join("");
        }
      } catch (_) {
        adminsTbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Lỗi tải danh sách quản trị viên</td></tr>';
      }
    }
    applyRolePermissions();
  }

  // Gắn form Cài đặt giá gói
  const formPlan = document.getElementById("form-settings-plan");
  if (formPlan) {
    formPlan.addEventListener("submit", async (e) => {
      e.preventDefault();
      const price_vnd = parseInt(document.getElementById("set-plan-price").value, 10) || 0;
      try {
        const res = await apiRequest("/api/v1/admin/settings/plans/perpetual", {
          method: "PUT",
          body: { price_vnd },
        });
        if (res.ok) alert("Đã cập nhật đơn giá gói vĩnh viễn thành công!");
        else alert("Không thể cập nhật giá gói.");
      } catch (err) {
        alert(err.message || "Lỗi cập nhật giá.");
      }
    });
  }

  // Thiết lập 2FA TOTP
  const btnStartTotp = document.getElementById("btn-start-totp");
  const totpSetupBox = document.getElementById("totp-setup-box");
  const totpSecretText = document.getElementById("totp-secret-text");
  const btnConfirmTotp = document.getElementById("btn-confirm-totp");

  if (btnStartTotp) {
    btnStartTotp.addEventListener("click", async () => {
      try {
        const res = await apiRequest("/api/v1/admin/2fa/setup", { method: "POST" });
        const data = await res.json();
        if (res.ok && data.secret) {
          totpSecretText.textContent = data.secret;
          totpSetupBox.style.display = "block";
        } else {
          alert(data.detail || "Không thể khởi tạo 2FA.");
        }
      } catch (_) {
        alert("Lỗi khi kết nối máy chủ thiết lập 2FA.");
      }
    });
  }

  if (btnConfirmTotp) {
    btnConfirmTotp.addEventListener("click", async () => {
      const code = document.getElementById("totp-verify-code").value.trim();
      if (!code || code.length !== 6) {
        alert("Vui lòng nhập đúng 6 chữ số mã xác thực.");
        return;
      }
      try {
        const res = await apiRequest("/api/v1/admin/2fa/verify", {
          method: "POST",
          body: { code },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          alert("Kích hoạt xác thực 2 yếu tố (2FA TOTP) thành công!");
          totpSetupBox.style.display = "none";
          loadSettings();
        } else {
          alert(data.detail || "Mã xác thực không chính xác.");
        }
      } catch (_) {
        alert("Lỗi xác nhận mã 2FA.");
      }
    });
  }

  // Đổi mật khẩu
  function openChangePasswordModal(isFirstTime = false) {
    const modal = document.getElementById("modal-change-password");
    const title = document.getElementById("change-pwd-title");
    const alertBox = document.getElementById("change-pwd-alert");
    if (!modal) return;
    if (alertBox) alertBox.style.display = "none";
    if (title) title.textContent = isFirstTime ? "Bắt buộc đổi mật khẩu lần đầu" : "Đổi mật khẩu tài khoản";
    modal.style.display = "flex";
  }

  if (elements.btnChangePwdHeader) {
    elements.btnChangePwdHeader.addEventListener("click", () => openChangePasswordModal(false));
  }

  const btnCloseChangePwd = document.getElementById("btn-close-change-pwd");
  if (btnCloseChangePwd) {
    btnCloseChangePwd.addEventListener("click", () => {
      document.getElementById("modal-change-password").style.display = "none";
    });
  }

  const formChangePwd = document.getElementById("form-change-password");
  if (formChangePwd) {
    formChangePwd.addEventListener("submit", async (e) => {
      e.preventDefault();
      const old_password = document.getElementById("pwd-old").value;
      const new_password = document.getElementById("pwd-new").value;
      const confirm_password = document.getElementById("pwd-confirm").value;
      const alertBox = document.getElementById("change-pwd-alert");

      if (new_password !== confirm_password) {
        setStatusMessage(alertBox, "Mật khẩu mới và xác nhận mật khẩu không khớp.", "danger");
        return;
      }

      try {
        const res = await apiRequest("/api/v1/admin/change-password", {
          method: "POST",
          body: { old_password, new_password },
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          alert("Đổi mật khẩu thành công!");
          document.getElementById("modal-change-password").style.display = "none";
          formChangePwd.reset();
        } else {
          setStatusMessage(alertBox, data.detail || "Không thể đổi mật khẩu.", "danger");
        }
      } catch (err) {
        setStatusMessage(alertBox, err.message || "Lỗi kết nối máy chủ.", "danger");
      }
    });
  }

  // Modal Chi tiết Đơn hàng & Hoàn tiền
  let activeDetailOrderId = null;
  window.adminShowOrderDetail = async function (orderId) {
    const modal = document.getElementById("modal-order-detail");
    if (!modal) return;
    activeDetailOrderId = orderId;

    try {
      const res = await apiRequest(`/api/v1/admin/orders/${orderId}`);
      if (!res.ok) return;
      const data = await res.json();
      const ord = data.order;

      document.getElementById("ord-detail-code").textContent = ord.code;
      document.getElementById("ord-detail-cust").textContent = ord.customer_name || "—";
      document.getElementById("ord-detail-email").textContent = ord.customer_email || "—";
      document.getElementById("ord-detail-phone").textContent = ord.customer_phone || "—";
      document.getElementById("ord-detail-tax").textContent = ord.customer_tax_code || "—";
      document.getElementById("ord-detail-plan").textContent = ord.plan_name || "Gói vĩnh viễn";
      document.getElementById("ord-detail-qty").textContent = ord.quantity || 1;
      document.getElementById("ord-detail-amount").textContent = `${(ord.amount_vnd || 0).toLocaleString("vi-VN")} đ`;
      document.getElementById("ord-detail-status").textContent = ord.status;

      const keysEl = document.getElementById("ord-detail-keys");
      const keys = data.keys || [];
      keysEl.textContent = keys.length ? keys.map((k) => `Mã: ${k.key || k.hint} (Trạng thái: ${k.status})`).join("\n") : "Chưa có mã được cấp";

      modal.style.display = "flex";
      applyRolePermissions();
    } catch (_) {}
  };

  const btnCloseOrderDetail = document.getElementById("btn-close-order-detail");
  if (btnCloseOrderDetail) {
    btnCloseOrderDetail.addEventListener("click", () => {
      document.getElementById("modal-order-detail").style.display = "none";
      activeDetailOrderId = null;
    });
  }

  const btnRefundOrder = document.getElementById("btn-order-refund");
  if (btnRefundOrder) {
    btnRefundOrder.addEventListener("click", async () => {
      if (!activeDetailOrderId) return;
      const reason = prompt("Nhập lý do hoàn tiền và thu hồi mã:");
      if (!reason) return;

      try {
        const res = await apiRequest(`/api/v1/admin/orders/${activeDetailOrderId}/refund`, {
          method: "POST",
          body: { reason },
        });
        const data = await res.json();
        if (res.ok) {
          alert(`Đã hoàn tiền và thu hồi ${data.revoked_count || 0} mã bản quyền thành công.`);
          document.getElementById("modal-order-detail").style.display = "none";
          loadOrders();
        } else {
          alert(data.detail || "Không thể hoàn tiền đơn hàng.");
        }
      } catch (_) {
        alert("Lỗi khi thực hiện hoàn tiền.");
      }
    });
  }

  // Modal Gán giao dịch chưa khớp
  let activeAssignPaymentId = null;
  window.adminOpenAssignPayment = function (paymentId) {
    activeAssignPaymentId = paymentId;
    document.getElementById("assign-payment-id").value = paymentId;
    document.getElementById("modal-assign-payment").style.display = "flex";
  };

  const btnCloseAssign = document.getElementById("btn-close-assign");
  if (btnCloseAssign) {
    btnCloseAssign.addEventListener("click", () => {
      document.getElementById("modal-assign-payment").style.display = "none";
      activeAssignPaymentId = null;
    });
  }

  const formAssign = document.getElementById("form-assign-payment");
  if (formAssign) {
    formAssign.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payment_id = activeAssignPaymentId;
      const order_code = document.getElementById("assign-order-code").value.trim();
      if (!order_code) return;

      try {
        const res = await apiRequest(`/api/v1/admin/payments/${payment_id}/assign`, {
          method: "POST",
          body: { order_code },
        });
        const data = await res.json();
        if (res.ok) {
          alert("Gán giao dịch và kích hoạt đơn hàng thành công!");
          document.getElementById("modal-assign-payment").style.display = "none";
          loadReconciliation();
          loadOrders();
        } else {
          alert(data.detail || "Không thể gán giao dịch.");
        }
      } catch (_) {
        alert("Lỗi kết nối khi gán giao dịch.");
      }
    });
  }

  // Xuất CSV
  document.getElementById("btn-export-orders-csv")?.addEventListener("click", () => {
    window.location.href = "/api/v1/admin/orders/export/csv";
  });
  document.getElementById("btn-export-reconcile-csv")?.addEventListener("click", () => {
    window.location.href = "/api/v1/admin/payments/export/csv";
  });
  document.getElementById("btn-export-audit-csv")?.addEventListener("click", () => {
    window.location.href = "/api/v1/admin/audit/export/csv";
  });

  // Modal Tạo Hóa Đơn Nhập Tay
  const btnOpenCreateInvoice = document.getElementById("btn-open-create-invoice");
  const modalCreateInvoice = document.getElementById("modal-create-invoice");
  const btnCloseInvoiceModal = document.getElementById("btn-close-invoice-modal");
  const formCreateInvoice = document.getElementById("form-create-invoice");

  if (btnOpenCreateInvoice) {
    btnOpenCreateInvoice.addEventListener("click", () => {
      if (modalCreateInvoice) modalCreateInvoice.style.display = "flex";
    });
  }
  if (btnCloseInvoiceModal) {
    btnCloseInvoiceModal.addEventListener("click", () => {
      if (modalCreateInvoice) modalCreateInvoice.style.display = "none";
    });
  }
  if (formCreateInvoice) {
    formCreateInvoice.addEventListener("submit", async (e) => {
      e.preventDefault();
      const order_id = document.getElementById("inv-order-id").value.trim();
      const invoice_number = document.getElementById("inv-number").value.trim();
      const buyer_name = document.getElementById("inv-buyer-name").value.trim();
      const buyer_tax_code = document.getElementById("inv-buyer-tax").value.trim();
      const pdf_url = document.getElementById("inv-pdf-url").value.trim();

      try {
        const res = await apiRequest("/api/v1/admin/invoices", {
          method: "POST",
          body: { order_id, invoice_number, buyer_name, buyer_tax_code, pdf_url },
        });
        if (res.ok) {
          alert("Lưu hóa đơn thành công!");
          modalCreateInvoice.style.display = "none";
          formCreateInvoice.reset();
          loadInvoices();
        } else {
          const d = await res.json();
          alert(d.detail || "Không thể tạo hóa đơn.");
        }
      } catch (_) {
        alert("Lỗi khi tạo hóa đơn.");
      }
    });
  }

  // Modal Tạo Admin Mới
  const btnOpenCreateAdmin = document.getElementById("btn-open-create-admin");
  const modalCreateAdmin = document.getElementById("modal-create-admin");
  const btnCloseCreateAdmin = document.getElementById("btn-close-create-admin");
  const formCreateAdmin = document.getElementById("form-create-admin");

  if (btnOpenCreateAdmin) {
    btnOpenCreateAdmin.addEventListener("click", () => {
      if (modalCreateAdmin) modalCreateAdmin.style.display = "flex";
    });
  }
  if (btnCloseCreateAdmin) {
    btnCloseCreateAdmin.addEventListener("click", () => {
      if (modalCreateAdmin) modalCreateAdmin.style.display = "none";
    });
  }
  if (formCreateAdmin) {
    formCreateAdmin.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("new-admin-user").value.trim();
      const password = document.getElementById("new-admin-pwd").value;
      const full_name = document.getElementById("new-admin-name").value.trim();
      const email = document.getElementById("new-admin-email").value.trim();
      const role = document.getElementById("new-admin-role").value;

      try {
        const res = await apiRequest("/api/v1/admin/users", {
          method: "POST",
          body: { username, password, full_name, email, role },
        });
        if (res.ok) {
          alert("Tạo tài khoản quản trị viên mới thành công!");
          modalCreateAdmin.style.display = "none";
          formCreateAdmin.reset();
          loadSettings();
        } else {
          const d = await res.json();
          alert(d.detail || "Không thể tạo quản trị viên.");
        }
      } catch (_) {
        alert("Lỗi khi tạo tài khoản quản trị.");
      }
    });
  }

  // Xử lý gửi lại email và test send
  window.adminRetryEmail = async function (outboxId) {
    try {
      const res = await apiRequest(`/api/v1/admin/emails/outbox/${outboxId}/retry`, { method: "POST" });
      if (res.ok) {
        alert("Đã gửi lại yêu cầu vào hàng đợi.");
        loadOutbox();
      } else {
        alert("Không thể gửi lại email.");
      }
    } catch (_) {}
  };

  document.getElementById("btn-test-smtp")?.addEventListener("click", async () => {
    const to_email = prompt("Nhập email nhận thư kiểm tra:");
    if (!to_email) return;
    try {
      const res = await apiRequest("/api/v1/admin/emails/test-send", {
        method: "POST",
        body: { to_email },
      });
      const data = await res.json();
      if (res.ok) alert("Đã gửi thư thử nghiệm: " + (data.message || "OK"));
      else alert(data.detail || "Lỗi gửi thư thử nghiệm.");
      loadOutbox();
    } catch (_) {
      alert("Lỗi kết nối khi gửi thư.");
    }
  });

  // Hỗ trợ tiện ích
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  }

  function formatDate(isoStr) {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("vi-VN");
    } catch (_) {
      return isoStr;
    }
  }

  // Khởi động
  checkSession();
})();
