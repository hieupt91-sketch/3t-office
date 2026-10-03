/**
 * Cổng khách hàng 3T Office — Kịch bản JavaScript
 * Kết nối API cổng khách hàng: Đăng nhập mã 6 số, quản lý key, thiết bị, kích hoạt ngoại tuyến, đơn hàng.
 */

document.addEventListener("DOMContentLoaded", () => {
  initPortal();
});

function initPortal() {
  const alertBox = document.getElementById("portal-alert");
  const viewLogin = document.getElementById("view-portal-login");
  const viewDashboard = document.getElementById("view-portal-dashboard");

  const stepEmail = document.getElementById("login-step-email");
  const stepCode = document.getElementById("login-step-code");
  const formRequestCode = document.getElementById("form-request-code");
  const formVerifyCode = document.getElementById("form-verify-code");
  const inputEmail = document.getElementById("input-email");
  const inputCode = document.getElementById("input-code");
  const displayTargetEmail = document.getElementById("display-target-email");
  const btnBackEmail = document.getElementById("btn-back-email");
  const btnResendCode = document.getElementById("btn-resend-code");
  const resendCountdown = document.getElementById("resend-countdown");

  const userNameEl = document.getElementById("dashboard-user-name");
  const userEmailEl = document.getElementById("dashboard-user-email");
  const btnLogout = document.getElementById("btn-portal-logout");

  const tabButtons = document.querySelectorAll(".portal-tab-btn");
  const tabPanels = document.querySelectorAll(".portal-tab-panel");

  const licensesContainer = document.getElementById("licenses-container");
  const devicesTbody = document.getElementById("devices-tbody");
  const ordersTbody = document.getElementById("orders-tbody");

  const formOffline = document.getElementById("form-portal-offline");
  const offlineResult = document.getElementById("portal-offline-result");
  const offlineToken = document.getElementById("portal-offline-token");
  const btnCopyToken = document.getElementById("btn-copy-portal-token");

  const modalReissue = document.getElementById("modal-confirm-reissue");
  const btnCancelReissue = document.getElementById("btn-cancel-reissue");
  const btnProceedReissue = document.getElementById("btn-proceed-reissue");

  let currentTargetEmail = "";
  let resendTimer = null;
  let pendingReissueId = null;

  function showAlert(msg, type = "info") {
    if (!alertBox) return;
    alertBox.className = `portal-alert portal-alert-${type}`;
    alertBox.textContent = msg;
    alertBox.style.display = "block";
    alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function hideAlert() {
    if (alertBox) alertBox.style.display = "none";
  }

  // Chuyển tab
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");
      tabButtons.forEach((b) => b.classList.remove("active"));
      tabPanels.forEach((p) => (p.style.display = "none"));

      btn.classList.add("active");
      const targetPanel = document.getElementById(`panel-tab-${targetTab}`);
      if (targetPanel) targetPanel.style.display = "block";
    });
  });

  // Kiểm tra phiên đăng nhập hiện hữu
  async function checkCurrentSession() {
    try {
      const res = await fetch("/api/v1/portal/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        showDashboard(data.customer);
      } else {
        showLoginView();
      }
    } catch (_) {
      showLoginView();
    }
  }

  function showLoginView() {
    if (viewLogin) viewLogin.style.display = "block";
    if (viewDashboard) viewDashboard.style.display = "none";
    if (stepEmail) stepEmail.style.display = "block";
    if (stepCode) stepCode.style.display = "none";
  }

  function showDashboard(customer) {
    if (viewLogin) viewLogin.style.display = "none";
    if (viewDashboard) viewDashboard.style.display = "block";
    if (userNameEl) userNameEl.textContent = customer.name || "Khách hàng 3T Office";
    if (userEmailEl) userEmailEl.textContent = customer.email || "";

    hideAlert();
    loadLicenses();
    loadDevices();
    loadOrders();
  }

  // 1. Gửi mã xác thực đăng nhập
  if (formRequestCode) {
    formRequestCode.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const email = inputEmail.value.trim().toLowerCase();
      if (!email) return;

      const btn = document.getElementById("btn-send-code");
      btn.disabled = true;
      btn.textContent = "Đang gửi mã...";

      try {
        const res = await fetch("/api/v1/portal/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        if (res.ok) {
          currentTargetEmail = email;
          if (displayTargetEmail) displayTargetEmail.textContent = email;
          stepEmail.style.display = "none";
          stepCode.style.display = "block";
          if (inputCode) {
            inputCode.value = "";
            inputCode.focus();
          }
          startResendCountdown(60);
          showAlert("Mã xác thực đã được gửi tới hộp thư của bạn. Vui lòng kiểm tra và nhập mã.", "success");
        } else {
          showAlert(data.detail || "Không thể gửi mã xác thực. Vui lòng thử lại sau.", "danger");
        }
      } catch (err) {
        showAlert("Lỗi kết nối máy chủ. Vui lòng kiểm tra đường truyền mạng.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = "Gửi mã xác thực đăng nhập";
      }
    });
  }

  function startResendCountdown(seconds) {
    if (resendTimer) clearInterval(resendTimer);
    btnResendCode.disabled = true;
    let remaining = seconds;
    resendCountdown.textContent = remaining;

    resendTimer = setInterval(() => {
      remaining -= 1;
      resendCountdown.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(resendTimer);
        btnResendCode.disabled = false;
        btnResendCode.textContent = "Gửi lại mã xác thực";
      }
    }, 1000);
  }

  if (btnBackEmail) {
    btnBackEmail.addEventListener("click", () => {
      stepCode.style.display = "none";
      stepEmail.style.display = "block";
      hideAlert();
    });
  }

  if (btnResendCode) {
    btnResendCode.addEventListener("click", async () => {
      if (!currentTargetEmail) return;
      btnResendCode.disabled = true;
      try {
        const res = await fetch("/api/v1/portal/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: currentTargetEmail }),
        });
        if (res.ok) {
          showAlert("Đã gửi lại mã xác thực mới vào email của bạn.", "success");
          startResendCountdown(60);
        } else {
          showAlert("Không thể gửi lại mã vào lúc này.", "danger");
          btnResendCode.disabled = false;
        }
      } catch (_) {
        btnResendCode.disabled = false;
      }
    });
  }

  // 2. Xác thực mã 6 số
  if (formVerifyCode) {
    formVerifyCode.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const code = inputCode.value.trim();
      if (!code || code.length !== 6) {
        showAlert("Vui lòng nhập đúng 6 chữ số mã xác thực.", "danger");
        return;
      }

      const btn = document.getElementById("btn-verify-code");
      btn.disabled = true;
      btn.textContent = "Đang xác thực...";

      try {
        const res = await fetch("/api/v1/portal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email: currentTargetEmail, code }),
        });

        const data = await res.json();
        if (res.ok) {
          showDashboard(data.customer);
        } else {
          showAlert(data.detail || "Mã xác thực không chính xác hoặc đã hết hạn.", "danger");
        }
      } catch (err) {
        showAlert("Lỗi kết nối máy chủ khi xác thực.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = "Xác nhận & Đăng nhập";
      }
    });
  }

  // 3. Đăng xuất
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await fetch("/api/v1/portal/logout", {
          method: "POST",
          credentials: "include",
        });
      } catch (_) {}
      showLoginView();
      showAlert("Bạn đã đăng xuất khỏi cổng khách hàng thành công.", "info");
    });
  }

  // 4. Tải danh sách License Keys
  async function loadLicenses() {
    if (!licensesContainer) return;
    try {
      const res = await fetch("/api/v1/portal/licenses", { credentials: "include" });
      if (!res.ok) throw new Error("Không thể tải danh sách bản quyền");
      const data = await res.json();
      const licenses = data.licenses || [];

      if (licenses.length === 0) {
        licensesContainer.innerHTML = `
          <div style="text-align: center; padding: var(--space-8); color: var(--text-muted);">
            Bạn chưa có mã bản quyền nào. Bạn có thể <a href="../ban-quyen.html" style="color: var(--brand-blue); font-weight: 600;">đặt mua bản quyền tại đây</a>.
          </div>
        `;
        return;
      }

      // Đưa mã bản quyền đầu tiên vào ô kích hoạt ngoại tuyến để tiện dụng
      const firstActive = licenses.find((l) => l.status === "active");
      const offlineKeyInput = document.getElementById("portal-offline-key");
      if (firstActive && offlineKeyInput && !offlineKeyInput.value) {
        offlineKeyInput.value = firstActive.key || "";
      }

      licensesContainer.innerHTML = licenses.map((lic) => `
        <div class="portal-lic-item">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span class="portal-badge portal-badge-${lic.status === 'active' ? 'active' : 'revoked'}">
                ${lic.status === 'active' ? 'Đang hoạt động' : 'Đã thu hồi'}
              </span>
              <span style="font-size: 0.813rem; color: var(--text-dim);">${lic.plan_name || 'Gói vĩnh viễn'}</span>
            </div>
            <div class="portal-key-text">${lic.key || 'Mã ẩn'}</div>
            <div style="font-size: 0.813rem; color: var(--text-muted); margin-top: 4px;">
              Thiết bị sử dụng: <strong>${lic.seats_used || 0}</strong> / ${lic.seats_max || 1} máy &bull; 
              Ngày kích hoạt: ${lic.created_at ? new Date(lic.created_at).toLocaleDateString('vi-VN') : '—'}
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="portal-btn portal-btn-secondary portal-btn-sm btn-copy-key" data-key="${lic.key}">
              Sao chép mã
            </button>
            ${lic.status === 'active' ? `
              <button type="button" class="portal-btn portal-btn-secondary portal-btn-sm btn-reissue-key" data-id="${lic.id}">
                Cấp lại mã mới
              </button>
            ` : ''}
          </div>
        </div>
      `).join("");

      // Gắn sự kiện sao chép
      licensesContainer.querySelectorAll(".btn-copy-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          const key = btn.getAttribute("data-key");
          if (key) {
            navigator.clipboard.writeText(key).then(() => {
              btn.textContent = "Đã chép!";
              setTimeout(() => (btn.textContent = "Sao chép mã"), 2000);
            });
          }
        });
      });

      // Gắn sự kiện cấp lại key
      licensesContainer.querySelectorAll(".btn-reissue-key").forEach((btn) => {
        btn.addEventListener("click", () => {
          pendingReissueId = btn.getAttribute("data-id");
          if (modalReissue) modalReissue.style.display = "flex";
        });
      });

    } catch (err) {
      licensesContainer.innerHTML = `
        <div style="text-align: center; padding: var(--space-6); color: var(--adm-danger, #DC2626);">
          ${err.message || 'Lỗi nạp dữ liệu bản quyền.'}
        </div>
      `;
    }
  }

  // Xử lý modal Reissue
  if (btnCancelReissue) {
    btnCancelReissue.addEventListener("click", () => {
      pendingReissueId = null;
      if (modalReissue) modalReissue.style.display = "none";
    });
  }

  if (btnProceedReissue) {
    btnProceedReissue.addEventListener("click", async () => {
      if (!pendingReissueId) return;
      btnProceedReissue.disabled = true;
      btnProceedReissue.textContent = "Đang xử lý...";

      try {
        const res = await fetch(`/api/v1/portal/licenses/${pendingReissueId}/reissue`, {
          method: "POST",
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) {
          showAlert(`Cấp lại mã thành công! Mã bản quyền mới của bạn: ${data.new_key}`, "success");
          if (modalReissue) modalReissue.style.display = "none";
          loadLicenses();
        } else {
          showAlert(data.detail || "Không thể cấp lại mã bản quyền.", "danger");
        }
      } catch (err) {
        showAlert("Lỗi khi gửi yêu cầu cấp lại mã.", "danger");
      } finally {
        btnProceedReissue.disabled = false;
        btnProceedReissue.textContent = "Xác nhận cấp lại mã";
        pendingReissueId = null;
      }
    });
  }

  // 5. Tải danh sách thiết bị
  async function loadDevices() {
    if (!devicesTbody) return;
    try {
      const res = await fetch("/api/v1/portal/devices", { credentials: "include" });
      if (!res.ok) throw new Error("Không thể tải danh sách thiết bị");
      const data = await res.json();
      const devices = data.devices || [];

      if (devices.length === 0) {
        devicesTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">
              Chưa có máy tính nào liên kết bản quyền. Hãy mở ứng dụng 3T Office trên máy tính và nhập mã bản quyền.
            </td>
          </tr>
        `;
        return;
      }

      devicesTbody.innerHTML = devices.map((dev) => `
        <tr>
          <td><strong>${dev.device_name || 'Máy tính văn phòng'}</strong></td>
          <td>${dev.platform || 'Windows'}</td>
          <td>${dev.app_version || '0.9.8'}</td>
          <td><code style="font-family: var(--font-mono); font-size: 0.813rem;">${dev.key_hint || '—'}</code></td>
          <td>${dev.activated_at ? new Date(dev.activated_at).toLocaleDateString('vi-VN') : '—'}</td>
          <td>
            <button type="button" class="portal-btn portal-btn-secondary portal-btn-sm btn-remove-dev" data-id="${dev.id}">
              Gỡ máy
            </button>
          </td>
        </tr>
      `).join("");

      // Gắn sự kiện gỡ máy
      devicesTbody.querySelectorAll(".btn-remove-dev").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const devId = btn.getAttribute("data-id");
          if (!devId) return;
          if (!confirm("Bạn có chắc chắn muốn gỡ máy tính này ra khỏi bản quyền?")) return;

          btn.disabled = true;
          try {
            const res = await fetch(`/api/v1/portal/devices/${devId}/remove`, {
              method: "POST",
              credentials: "include",
            });
            if (res.ok) {
              showAlert("Đã gỡ thiết bị thành công. Vị trí kích hoạt đã được giải phóng.", "success");
              loadDevices();
              loadLicenses();
            } else {
              const errData = await res.json();
              showAlert(errData.detail || "Không thể gỡ thiết bị.", "danger");
              btn.disabled = false;
            }
          } catch (_) {
            showAlert("Lỗi kết nối khi gỡ thiết bị.", "danger");
            btn.disabled = false;
          }
        });
      });

    } catch (err) {
      devicesTbody.innerHTML = `
        <tr><td colspan="6" style="text-align: center; color: var(--adm-danger, #DC2626);">${err.message}</td></tr>
      `;
    }
  }

  // 6. Tải lịch sử đơn hàng
  async function loadOrders() {
    if (!ordersTbody) return;
    try {
      const res = await fetch("/api/v1/portal/orders", { credentials: "include" });
      if (!res.ok) throw new Error("Không thể tải lịch sử đơn hàng");
      const data = await res.json();
      const orders = data.orders || [];

      if (orders.length === 0) {
        ordersTbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: var(--space-6); color: var(--text-muted);">
              Chưa có lịch sử giao dịch nào.
            </td>
          </tr>
        `;
        return;
      }

      ordersTbody.innerHTML = orders.map((ord) => `
        <tr>
          <td><strong style="font-family: var(--font-mono);">${ord.code || '—'}</strong></td>
          <td>${ord.created_at ? new Date(ord.created_at).toLocaleDateString('vi-VN') : '—'}</td>
          <td>${ord.plan_name || 'Bản quyền vĩnh viễn'}</td>
          <td>${ord.quantity || 1}</td>
          <td><strong>${(ord.amount_vnd || 0).toLocaleString('vi-VN')} đ</strong></td>
          <td>
            <span class="portal-badge portal-badge-${ord.status === 'fulfilled' ? 'active' : (ord.status === 'pending' ? 'pending' : 'revoked')}">
              ${ord.status === 'fulfilled' ? 'Hoàn tất' : (ord.status === 'pending' ? 'Chờ thanh toán' : ord.status)}
            </span>
          </td>
        </tr>
      `).join("");

    } catch (err) {
      ordersTbody.innerHTML = `
        <tr><td colspan="6" style="text-align: center; color: var(--adm-danger, #DC2626);">${err.message}</td></tr>
      `;
    }
  }

  // 7. Tạo mã kích hoạt ngoại tuyến
  if (formOffline) {
    formOffline.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideAlert();
      const key = document.getElementById("portal-offline-key").value.trim();
      const device_fingerprint = document.getElementById("portal-offline-device").value.trim();
      const device_name = document.getElementById("portal-offline-name").value.trim();

      const btn = formOffline.querySelector("button[type='submit']");
      btn.disabled = true;
      btn.textContent = "Đang tạo mã...";

      try {
        const res = await fetch("/api/v1/portal/offline-activation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ key, device_fingerprint, device_name }),
        });

        const data = await res.json();
        if (res.ok) {
          offlineToken.value = data.activation_token || "";
          offlineResult.style.display = "block";
          showAlert("Đã tạo khóa kích hoạt ngoại tuyến thành công!", "success");
          loadDevices();
          loadLicenses();
        } else {
          showAlert(data.detail || "Không thể tạo mã kích hoạt ngoại tuyến. Vui lòng kiểm tra lại mã bản quyền và mã thiết bị.", "danger");
        }
      } catch (err) {
        showAlert("Lỗi khi kết nối tới máy chủ.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = "Tạo khóa kích hoạt ngoại tuyến";
      }
    });
  }

  if (btnCopyToken) {
    btnCopyToken.addEventListener("click", () => {
      if (offlineToken && offlineToken.value) {
        navigator.clipboard.writeText(offlineToken.value).then(() => {
          btnCopyToken.textContent = "Đã chép khóa!";
          setTimeout(() => (btnCopyToken.textContent = "Sao chép chuỗi mã"), 2000);
        });
      }
    });
  }

  // Khởi động
  checkCurrentSession();
}
