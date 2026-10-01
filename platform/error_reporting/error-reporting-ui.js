/** Shared consent, feedback and Help controls for all 3T Office desktop apps. */

import { createFrontendErrorReporter } from "./frontend-reporter.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function getBridge() {
  return typeof window !== "undefined" ? window.pywebview?.api : null;
}

function focusableElements(root) {
  return [...root.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")]
    .filter((element) => !element.hidden && element.getAttribute("aria-hidden") !== "true");
}

export function handleDialogKeydown(event, dialog, close) {
  if (event.key === "Escape") {
    event.preventDefault();
    close(null);
    return;
  }
  if (event.key !== "Tab") return;
  const focusables = focusableElements(dialog);
  if (!focusables.length) {
    event.preventDefault();
    dialog.focus();
  } else if (event.shiftKey && document.activeElement === focusables[0]) {
    event.preventDefault();
    focusables.at(-1).focus();
  } else if (!event.shiftKey && document.activeElement === focusables.at(-1)) {
    event.preventDefault();
    focusables[0].focus();
  }
}

function showDialog({ title, body, actions, focusSelector, onSubmit, onClose }) {
  if (typeof document === "undefined" || !document.body) return null;
  const previousFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-error-reporting-overlay";
  const titleId = `vno-report-dialog-title-${Date.now()}`;
  overlay.innerHTML = `
    <section class="vno-dialog-box vno-error-reporting-dialog" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1">
      <header class="vno-dialog-header"><strong id="${titleId}">${escapeHtml(title)}</strong>
        <button type="button" class="vno-btn vno-btn-icon-only" data-dialog-close aria-label="Đóng">×</button>
      </header>
      <div class="vno-dialog-body">${body}</div>
      <footer class="vno-dialog-footer">${actions}</footer>
    </section>`;
  document.body.appendChild(overlay);
  const dialog = overlay.querySelector("[role='dialog']");
  let closed = false;
  const close = (result = null) => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    previousFocus?.focus?.();
    onClose?.(result);
  };
  const onKeyDown = (event) => {
    handleDialogKeydown(event, dialog, close);
  };
  overlay.querySelector("[data-dialog-close]").addEventListener("click", () => close(null));
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(null); });
  overlay.querySelectorAll("[data-dialog-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!onSubmit) return close(button.dataset.dialogAction);
      const result = await onSubmit(button.dataset.dialogAction, dialog, close);
      if (result !== false) close(button.dataset.dialogAction);
    });
  });
  document.addEventListener("keydown", onKeyDown);
  (dialog.querySelector(focusSelector) || dialog).focus();
  return { overlay, dialog, close };
}

export class ErrorReportingUI {
  constructor({ api = getBridge, hooks = createFrontendErrorReporter(), dialogFactory = showDialog } = {}) {
    this.api = api;
    this.hooks = hooks;
    this.dialogFactory = dialogFactory;
    this.state = null;
    this._boundClick = (event) => this._handleClick(event);
    this._mounted = false;
    this._consentDialogShown = false;
  }

  mount() {
    if (this._mounted || typeof document === "undefined" || typeof document.addEventListener !== "function") return this;
    this._mounted = true;
    this.hooks.install();
    document.addEventListener("click", this._boundClick);
    return this;
  }

  async initialize({ deferConsentPrompt = false } = {}) {
    this.mount();
    await this.refresh();
    if (!deferConsentPrompt && this.state?.enabled && this.state.consent === "unknown" && !this._consentDialogShown) {
      this._consentDialogShown = true;
      this.showConsentDialog();
    }
    return this.state;
  }

  async refresh() {
    try {
      const bridge = this.api();
      if (bridge?.get_error_reporting_state) this.state = await bridge.get_error_reporting_state();
    } catch { /* Missing bridge should not affect offline/browser use. */ }
    this._renderPreferences();
    return this.state;
  }

  async setConsent(granted) {
    try {
      const bridge = this.api();
      if (!bridge?.set_error_reporting_consent) throw new Error("Cầu nối báo cáo hiện không khả dụng.");
      this.state = await bridge.set_error_reporting_consent(Boolean(granted));
    } catch {
      this._showStatus("Không lưu được lựa chọn. Hãy thử lại.", true);
      return false;
    }
    this._renderPreferences();
    return true;
  }

  showConsentDialog() {
    const networkNote = this.state?.endpoint_configured
      ? "Nếu bật, báo cáo được xếp hàng cục bộ rồi gửi nền khi có mạng."
      : "Bản cài đặt hiện chưa có địa chỉ máy chủ; báo cáo vẫn chỉ lưu cục bộ cho đến khi được cấu hình.";
    return this.dialogFactory({
      title: "Chia sẻ báo cáo lỗi kỹ thuật?",
      focusSelector: "[data-dialog-action='deny']",
      body: `
        <p>3T Office có thể gửi dữ liệu kỹ thuật để nhóm phát triển sửa lỗi. ${escapeHtml(networkNote)}</p>
        <h3>Dữ liệu có thể được gửi</h3>
        <ul><li>Ứng dụng, phiên bản, hệ điều hành.</li><li>Loại lỗi, thông điệp và ngăn xếp đã lọc.</li><li>Mã cài đặt ngẫu nhiên để gom nhóm lỗi trùng.</li></ul>
        <h3>Không bao giờ được gửi tự động</h3>
        <p>Nội dung tài liệu, tên hoặc đường dẫn tệp, ô tính, đoạn văn, tên trang tính, công thức, clipboard và tên người dùng Windows.</p>
        <p>Bạn có thể đổi lựa chọn trong tab Trợ giúp. Mô tả góp ý tự nhập chỉ được lưu trên máy; 3T Office không gửi tài liệu hoặc tệp đính kèm.</p>
        <p class="vno-report-dialog-status" role="status" aria-live="polite"></p>`,
      actions: `<button type="button" class="vno-btn" data-dialog-action="deny">Chỉ ghi cục bộ</button>
        <button type="button" class="vno-btn vno-btn-primary" data-dialog-action="grant">Cho phép gửi tự động</button>`,
      onSubmit: async (action, _dialog, close) => {
        if (action === "grant" || action === "deny") {
          if (!await this.setConsent(action === "grant")) return false;
          close(action);
        }
        return false;
      }
    });
  }

  showFeedbackDialog() {
    const stateNote = "Mô tả góp ý được lưu trên máy này và không gửi lên máy chủ.";
    return this.dialogFactory({
      title: "Báo lỗi / Góp ý",
      focusSelector: "textarea",
      body: `
        <p>Mô tả tối đa 4.000 ký tự. ${escapeHtml(stateNote)}</p>
        <label for="vno-report-description">Mô tả</label>
        <textarea id="vno-report-description" maxlength="4000" rows="6"></textarea>
        <p class="vno-report-warning">Tài liệu, tệp đính kèm và nội dung mô tả tự nhập không được gửi qua mạng.</p>
        <p class="vno-report-dialog-status" role="status" aria-live="polite"></p>`,
      actions: `<button type="button" class="vno-btn" data-dialog-action="cancel">Hủy</button>
        <button type="button" class="vno-btn vno-btn-primary" data-dialog-action="submit">Gửi góp ý</button>`,
      onSubmit: async (action, dialog, close) => {
        if (action !== "submit") return true;
      const description = dialog.querySelector("#vno-report-description").value.trim();
        const status = dialog.querySelector(".vno-report-dialog-status");
        if (!description) {
          status.textContent = "Vui lòng nhập mô tả trước khi gửi.";
          dialog.querySelector("#vno-report-description").focus();
          return false;
        }
        const button = dialog.querySelector("[data-dialog-action='submit']");
        button.disabled = true;
        status.textContent = "Đang lưu báo cáo…";
        try {
          const bridge = this.api();
          if (!bridge?.submit_user_feedback) throw new Error("Cầu nối báo cáo hiện không khả dụng.");
          const app = typeof document.querySelector === "function"
            ? document.querySelector("#vno-app-root")?.getAttribute?.("data-app")
            : undefined;
          const result = await bridge.submit_user_feedback(description, false, app);
          if (!result?.queued) throw new Error(result?.error || "Không lưu được báo cáo.");
          status.textContent = "Đã lưu góp ý cục bộ trên máy này. Nội dung không được gửi qua mạng.";
          setTimeout(() => close("submitted"), 900);
        } catch (error) {
          status.textContent = String(error?.message || "Không gửi được góp ý. Hãy thử lại.");
          button.disabled = false;
          return false;
        }
        return false;
      }
    });
  }

  async _handleClick(event) {
    const openButton = event.target.closest?.("[data-vno-report-open]");
    if (openButton) {
      event.preventDefault();
      await this.refresh();
      this.showFeedbackDialog();
      return;
    }
    const consentInput = event.target.closest?.("[data-vno-report-consent]");
    if (consentInput) {
      const nextValue = Boolean(consentInput.checked);
      if (!await this.setConsent(nextValue)) consentInput.checked = !nextValue;
    }
  }

  _renderPreferences() {
    if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
    document.querySelectorAll("[data-vno-report-consent]").forEach((input) => {
      input.checked = this.state?.consent === "granted";
      input.disabled = this.state?.enabled === false;
    });
    document.querySelectorAll("[data-vno-report-open]").forEach((button) => {
      button.disabled = this.state?.enabled === false;
    });
    const attachmentOption = typeof document.querySelector === "function"
      ? document.querySelector("#vno-report-attach")
      : null;
    if (attachmentOption) attachmentOption.disabled = this.state?.has_current_file === false;
    document.querySelectorAll("[data-vno-reporting-status]").forEach((element) => {
      if (!this.state) element.textContent = "Trạng thái chưa khả dụng.";
      else if (!this.state.enabled) element.textContent = "Tính năng báo cáo đã tắt trong cấu hình.";
      else if (!this.state.endpoint_configured) element.textContent = "Chưa cấu hình máy chủ; báo cáo chỉ lưu cục bộ.";
      else if (this.state.consent === "granted") element.textContent = "Đang bật gửi báo cáo lỗi tự động.";
      else element.textContent = "Đang tắt gửi tự động; lỗi chỉ lưu cục bộ.";
    });
  }

  _showStatus(message, isError = false) {
    if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return;
    document.querySelectorAll(".vno-report-dialog-status").forEach((element) => {
      element.textContent = message;
      element.dataset.error = isError ? "true" : "false";
    });
  }

  destroy() {
    if (!this._mounted) return;
    if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
      document.removeEventListener("click", this._boundClick);
    }
    this.hooks.uninstall();
    this._mounted = false;
  }
}
