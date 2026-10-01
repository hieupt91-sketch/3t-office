const APP_NAMES = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };
import { t } from "../i18n/i18n.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function handleRecoveryDialogKeydown(event, focusable = []) {
  if (event.key === "Escape") {
    event.preventDefault();
    return "close";
  }
  if (event.key !== "Tab" || !focusable.length) return null;
  const activeIndex = focusable.indexOf(event.target);
  const nextIndex = event.shiftKey
    ? (activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1)
    : (activeIndex < 0 || activeIndex === focusable.length - 1 ? 0 : activeIndex + 1);
  event.preventDefault();
  focusable[nextIndex]?.focus?.();
  return "focus";
}

export class RecoveryDialog {
  constructor({ items, onRecover, onDelete, onLater, documentRef = globalThis.document }) {
    this.items = [...(items || [])];
    this.onRecover = onRecover;
    this.onDelete = onDelete;
    this.onLater = onLater;
    this.document = documentRef;
    this.root = null;
    this._previousFocus = this.document?.activeElement || null;
  }

  mount() {
    if (!this.document?.body) return false;
    this.close(false);
    const overlay = this.document.createElement("div");
    overlay.className = "vno-recovery-overlay";
    overlay.innerHTML = `
      <section class="vno-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="vno-recovery-title" aria-describedby="vno-recovery-description" tabindex="-1">
        <header class="vno-recovery-header"><div><h2 id="vno-recovery-title">${t("autoRecover.dialogTitle")}</h2><p id="vno-recovery-description">${t("autoRecover.dialogDescription")}</p></div></header>
        <div class="vno-recovery-list" role="list"></div>
        <div class="vno-recovery-message" aria-live="polite" role="status"></div>
        <footer><button type="button" class="vno-btn vno-recovery-later">${t("autoRecover.later")}</button></footer>
      </section>`;
    this.root = overlay;
    this.document.body.appendChild(overlay);
    overlay.addEventListener("click", (event) => {
      const recoverButton = event.target.closest?.("[data-recovery-action='recover']");
      const deleteButton = event.target.closest?.("[data-recovery-action='delete']");
      if (recoverButton) void this._runAction(recoverButton, () => this.onRecover?.(recoverButton.dataset.snapshotId));
      if (deleteButton) void this._runAction(deleteButton, () => this.onDelete?.(deleteButton.dataset.snapshotId));
      if (event.target.closest?.(".vno-recovery-later")) this.close();
    });
    overlay.addEventListener("keydown", (event) => {
      const buttons = Array.from(overlay.querySelectorAll("button:not([disabled])"));
      const result = handleRecoveryDialogKeydown(event, buttons);
      if (result === "close") this.close();
    });
    this.render();
    overlay.querySelector(".vno-recovery-dialog")?.focus?.();
    return true;
  }

  async _runAction(button, action) {
    if (button.disabled) return;
    button.disabled = true;
    this._setMessage("");
    try {
      const result = await action();
      if (result?.ok) {
        if (result.deleted) {
          this.items = this.items.filter((item) => item.snapshot_id !== button.dataset.snapshotId);
          this.render();
          this._setMessage(this.items.length ? "Đã xóa bản khôi phục đã chọn." : "Đã xóa bản khôi phục. Không còn mục nào trong danh sách.");
        } else if (result.close !== false) {
          this.close();
        }
      } else {
        this._setMessage(result?.error || "Không thể thực hiện thao tác. Bản khôi phục vẫn được giữ nguyên.");
        button.disabled = false;
      }
    } catch (error) {
      this._setMessage(`Không thể thực hiện thao tác: ${error?.message || error}. Bản khôi phục vẫn được giữ nguyên.`);
      button.disabled = false;
    }
  }

  _setMessage(message) {
    const node = this.root?.querySelector(".vno-recovery-message");
    if (node) node.textContent = message;
  }

  render() {
    const list = this.root?.querySelector(".vno-recovery-list");
    if (!list) return;
    list.replaceChildren();
    if (!this.items.length) {
      const empty = this.document.createElement("p");
      empty.className = "vno-recovery-empty";
      empty.textContent = t("autoRecover.empty");
      list.appendChild(empty);
      return;
    }
    for (const item of this.items) {
      const card = this.document.createElement("article");
      card.className = "vno-recovery-item";
      card.setAttribute("role", "listitem");
      const appName = APP_NAMES[item.app_kind] || "Ứng dụng không xác định";
      const originalName = String(item.original_path || "").split(/[\\/]/).filter(Boolean).pop() || "Tài liệu chưa lưu";
      const when = item.saved_at ? new Date(item.saved_at).toLocaleString("vi-VN") : "Thời gian không xác định";
      card.innerHTML = `
        <div class="vno-recovery-item-main">
          <strong>${escapeHtml(item.title || "Tài liệu chưa đặt tên")}</strong>
          <p>${escapeHtml(appName)} · ${escapeHtml(originalName)}</p>
          <time>${escapeHtml(when)}</time>
        </div>
        <div class="vno-recovery-item-actions">
          <button type="button" class="vno-btn vno-btn-primary" data-recovery-action="recover" data-snapshot-id="${escapeHtml(item.snapshot_id)}">${t("autoRecover.recover")}</button>
          <button type="button" class="vno-btn" data-recovery-action="delete" data-snapshot-id="${escapeHtml(item.snapshot_id)}">${t("autoRecover.discard")}</button>
        </div>`;
      list.appendChild(card);
    }
  }

  close(restoreFocus = true) {
    const wasMounted = Boolean(this.root);
    this.root?.remove?.();
    this.root = null;
    if (restoreFocus) this._previousFocus?.focus?.();
    if (wasMounted) this.onLater?.();
  }
}
