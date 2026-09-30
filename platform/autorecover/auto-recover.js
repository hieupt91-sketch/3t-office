import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { RecoveryDialog } from "./recovery-dialog.js";

const APP_NAMES = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };
const DEFAULT_SETTINGS = Object.freeze({ enabled: true, interval_minutes: 5 });
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    return (char === "x" ? random : (random & 3) | 8).toString(16);
  });
}

function normalizedSettings(settings = {}) {
  const minutes = Number.parseInt(settings.interval_minutes, 10);
  return {
    enabled: settings.enabled !== false,
    interval_minutes: Math.min(MAX_INTERVAL_MINUTES, Math.max(MIN_INTERVAL_MINUTES, Number.isFinite(minutes) ? minutes : DEFAULT_SETTINGS.interval_minutes))
  };
}

export class AutoRecoverManager {
  constructor({ bridge = globalUnoBridge, timers = globalThis, idleScheduler = null, documentRef = globalThis.document } = {}) {
    this.bridge = bridge;
    this.timers = timers;
    this.document = documentRef;
    this.idleScheduler = idleScheduler || ((callback) => {
      if (typeof globalThis.requestIdleCallback === "function") {
        const id = globalThis.requestIdleCallback(callback, { timeout: 2000 });
        return () => globalThis.cancelIdleCallback?.(id);
      }
      const id = this.timers.setTimeout(callback, 400);
      return () => this.timers.clearTimeout(id);
    });
    this.settings = { ...DEFAULT_SETTINGS };
    this.context = null;
    this.timerId = null;
    this.cancelIdle = null;
    this.snapshotInFlight = false;
    this.snapshotTask = null;
    this.settingsLoaded = false;
    this.leftoversLoaded = false;
    this.leftovers = [];
    this.dialog = null;
    this._settingsPanels = new WeakSet();
    this._wrappedAdapters = new WeakSet();
  }

  async register({ appKind, adapter, shell, helpPanel, serialize, restore, options = {} }) {
    if (!adapter || !APP_NAMES[appKind]) return false;
    if (this.context?.adapter !== adapter) this._stopTimer();
    this.context = {
      appKind, adapter, shell, serialize, restore,
      docId: makeId(),
      identity: this._identity(adapter, shell),
      recoverySnapshotId: null,
      lastError: ""
    };
    this._wrapSave(adapter);
    if (!this.settingsLoaded) {
      try {
        this.settings = normalizedSettings(await this.bridge.getAutoRecoverSettings());
      } catch {
        this.settings = { ...DEFAULT_SETTINGS };
      }
      this.settingsLoaded = true;
    }
    await this._loadLeftovers();
    this.mountSettings(helpPanel);
    this._configureTimer();
    if (options.recoverySnapshotId) this._setHelpStatus("Đang mở bản khôi phục đã chọn…");
    return true;
  }

  detach(adapter) {
    if (!this.context || this.context.adapter !== adapter) return;
    this._stopTimer();
    this.context = null;
  }

  _identity(adapter, shell) {
    const source = adapter._sourcePath || adapter.sourceFilePath || "";
    return `${source}\u0000${shell?.documentName || adapter.sourceFileName || adapter.sourceFilePath || ""}`;
  }

  _wrapSave(adapter) {
    if (this._wrappedAdapters.has(adapter)) return;
    this._wrappedAdapters.add(adapter);
    for (const methodName of ["save", "saveAs"]) {
      if (typeof adapter[methodName] !== "function") continue;
      const original = adapter[methodName].bind(adapter);
      adapter[methodName] = async (...args) => {
        const result = await original(...args);
        if (result === true) await this._clearSavedSnapshots(adapter);
        return result;
      };
    }
  }

  async _clearSavedSnapshots(adapter) {
    const context = this.context;
    if (!context || context.adapter !== adapter) return;
    this.cancelIdle?.();
    this.cancelIdle = null;
    if (this.snapshotTask) await this.snapshotTask;
    const ids = [context.recoverySnapshotId];
    try { await this.bridge.deleteAutoRecoverDocument(context.docId); } catch { /* Save already succeeded; stale snapshot is safer than failing Save. */ }
    for (const snapshotId of ids) {
      if (snapshotId) {
        try { await this.bridge.deleteAutoRecoverSnapshot(snapshotId); } catch { /* Save already succeeded. */ }
      }
    }
    context.recoverySnapshotId = null;
    context.docId = makeId();
    context.identity = this._identity(adapter, context.shell);
  }

  _configureTimer() {
    this._stopTimer();
    if (!this.context || !this.settings.enabled || this.bridge.desktopApi === null || typeof this.timers.setInterval !== "function") return;
    const interval = this.settings.interval_minutes * 60 * 1000;
    this.timerId = this.timers.setInterval(() => this.tick(), interval);
  }

  _stopTimer() {
    if (this.timerId != null) this.timers.clearInterval?.(this.timerId);
    this.timerId = null;
    this.cancelIdle?.();
    this.cancelIdle = null;
  }

  tick() {
    const context = this.context;
    if (!context || !this.settings.enabled || this.snapshotInFlight || !context.adapter.isDirty) return false;
    if (context.identity !== this._identity(context.adapter, context.shell)) {
      context.docId = makeId();
      context.identity = this._identity(context.adapter, context.shell);
      context.recoverySnapshotId = null;
    }
    this.cancelIdle?.();
    this.cancelIdle = this.idleScheduler(() => {
      this.cancelIdle = null;
      const task = this._takeSnapshot(context);
      this.snapshotTask = task;
      void task.finally(() => {
        if (this.snapshotTask === task) this.snapshotTask = null;
      });
    });
    return true;
  }

  async _takeSnapshot(context) {
    if (this.context !== context || this.snapshotInFlight || !context.adapter.isDirty || !this.settings.enabled) return false;
    this.snapshotInFlight = true;
    try {
      const content = context.serialize();
      if (typeof content !== "string" || !content.length) throw new Error("Bộ tuần tự hóa không trả về nội dung tài liệu.");
      const title = context.shell?.documentName || context.adapter.sourceFileName || "Tài liệu chưa đặt tên";
      const originalPath = context.adapter._sourcePath || context.adapter.sourceFilePath || "";
      const result = await this.bridge.writeAutoRecoverSnapshot({
        docId: context.docId,
        appKind: context.appKind,
        content,
        originalPath,
        title,
        format: { writer: "html", sheet: "fods", slides: "fodp" }[context.appKind]
      });
      if (result?.status !== "ok") throw new Error(result?.message || "Không thể lưu bản khôi phục.");
      if (result.written && context.recoverySnapshotId && context.recoverySnapshotId !== result.snapshot_id) {
        try { await this.bridge.deleteAutoRecoverSnapshot(context.recoverySnapshotId); } catch { /* Retain the previous recovery point if cleanup fails. */ }
      }
      context.recoverySnapshotId = result.snapshot_id || context.recoverySnapshotId;
      context.lastError = "";
      this._setHelpStatus(result.written ? "Đã lưu bản khôi phục trên thiết bị này." : "Tài liệu chưa thay đổi kể từ bản khôi phục gần nhất.");
      return true;
    } catch (error) {
      context.lastError = String(error?.message || error);
      context.shell?.setStatus?.(`AutoRecover: ${context.lastError}`);
      this._setHelpStatus(`Không thể lưu bản khôi phục: ${context.lastError}`);
      return false;
    } finally {
      this.snapshotInFlight = false;
    }
  }

  async setSettings(value) {
    const requested = normalizedSettings(value);
    try {
      const saved = await this.bridge.setAutoRecoverSettings(requested);
      if (saved?.status === "error") throw new Error(saved.message || "Không thể ghi cài đặt.");
      this.settings = normalizedSettings(saved);
      this._configureTimer();
      this._setHelpStatus(this.settings.enabled
        ? `AutoRecover đang bật — mỗi ${this.settings.interval_minutes} phút.`
        : "AutoRecover đang tắt. Bản đã lưu vẫn còn cho đến khi lưu tài liệu hoặc đóng ứng dụng bình thường.");
      this._syncSettingsControls();
      return this.settings;
    } catch (error) {
      this._setHelpStatus(`Không thể lưu cài đặt AutoRecover: ${error?.message || error}`);
      return null;
    }
  }

  mountSettings(helpPanel) {
    const root = helpPanel?.root;
    if (!root || this._settingsPanels.has(root) || !this.document?.createElement) return;
    const section = this.document.createElement("section");
    section.className = "vno-autorecover-settings";
    section.setAttribute("aria-labelledby", "vno-autorecover-settings-title");
    section.innerHTML = `
      <h3 id="vno-autorecover-settings-title">Tự động khôi phục</h3>
      <label class="vno-autorecover-toggle"><input type="checkbox" class="vno-autorecover-enabled"><span>Bật lưu khôi phục tự động</span></label>
      <label class="vno-autorecover-interval-label" for="vno-autorecover-interval">Lưu mỗi</label>
      <div class="vno-autorecover-interval-row"><input type="number" id="vno-autorecover-interval" class="vno-autorecover-interval" min="1" max="60" step="1"><span>phút (1–60)</span></div>
      <div class="vno-autorecover-actions"><button type="button" class="vno-btn vno-autorecover-show">Xem bản khôi phục</button></div>
      <p class="vno-autorecover-status" role="status" aria-live="polite"></p>`;
    root.insertBefore(section, root.querySelector(".vno-help-body"));
    this._settingsPanels.add(root);
    const enabled = section.querySelector(".vno-autorecover-enabled");
    const interval = section.querySelector(".vno-autorecover-interval");
    enabled.checked = this.settings.enabled;
    interval.value = String(this.settings.interval_minutes);
    enabled.addEventListener("change", () => void this.setSettings({ enabled: enabled.checked, interval_minutes: interval.value }));
    interval.addEventListener("change", () => void this.setSettings({ enabled: enabled.checked, interval_minutes: interval.value }));
    section.querySelector(".vno-autorecover-show").addEventListener("click", () => void this.showRecoveryDialog());
    if (!this.bridge.desktopApi) {
      enabled.disabled = true;
      interval.disabled = true;
      this._setHelpStatus("Tự động khôi phục khả dụng trong ứng dụng 3T Office Desktop.");
    } else {
      this._setHelpStatus(this.settings.enabled ? `Đang bật — mỗi ${this.settings.interval_minutes} phút.` : "Đang tắt.");
    }
  }

  _syncSettingsControls() {
    this.document?.querySelectorAll?.(".vno-autorecover-settings").forEach((section) => {
      const enabled = section.querySelector(".vno-autorecover-enabled");
      const interval = section.querySelector(".vno-autorecover-interval");
      if (enabled) enabled.checked = this.settings.enabled;
      if (interval) interval.value = String(this.settings.interval_minutes);
    });
  }

  _setHelpStatus(message) {
    const section = this.document?.querySelector?.(".vno-autorecover-settings");
    const status = section?.querySelector?.(".vno-autorecover-status");
    if (status) status.textContent = message;
  }

  async _loadLeftovers() {
    if (this.leftoversLoaded) return this.leftovers;
    try {
      this.leftovers = await this.bridge.listAutoRecoverSnapshots() || [];
    } catch {
      this.leftovers = [];
    }
    this.leftoversLoaded = true;
    return this.leftovers;
  }

  async showStartupRecovery() {
    await this._loadLeftovers();
    if (!this.leftovers.length || !this.context) return false;
    this.dialog = new RecoveryDialog({
      items: this.leftovers,
      onRecover: (id) => this.recoverSnapshot(id),
      onDelete: (id) => this.deleteSnapshot(id)
    });
    return this.dialog.mount();
  }

  async showRecoveryDialog() {
    await this._loadLeftovers();
    if (!this.leftovers.length) {
      this._setHelpStatus("Không có bản khôi phục từ phiên trước.");
      return false;
    }
    return this.showStartupRecovery();
  }

  async deleteSnapshot(snapshotId) {
    const deleted = await this.bridge.deleteAutoRecoverSnapshot(snapshotId);
    if (!deleted) return { ok: false, error: "Không xóa được bản khôi phục. Tệp vẫn được giữ nguyên." };
    this.leftovers = this.leftovers.filter((item) => item.snapshot_id !== snapshotId);
    return { ok: true, deleted: true };
  }

  async recoverSnapshot(snapshotId) {
    const item = this.leftovers.find((candidate) => candidate.snapshot_id === snapshotId);
    if (!item) return { ok: false, error: "Không tìm thấy mục khôi phục. Tệp vẫn được giữ nguyên." };
    if (!this.context) return { ok: false, error: "Ứng dụng chưa sẵn sàng để khôi phục." };
    if (item.app_kind !== this.context.appKind) {
      const switchApp = this.context.shell?.onSwitchApp || globalThis.__vnoAppInstance?.shell?.onSwitchApp;
      if (typeof switchApp !== "function" || !APP_NAMES[item.app_kind]) {
        return { ok: false, error: "Hãy mở đúng ứng dụng để khôi phục tài liệu này. Bản khôi phục vẫn được giữ nguyên." };
      }
      const switched = await switchApp(item.app_kind, { templateId: "blank", recoverySnapshotId: snapshotId });
      if (!switched || !this.context || this.context.appKind !== item.app_kind) {
        return { ok: false, error: "Không thể chuyển sang ứng dụng phù hợp. Bản khôi phục vẫn được giữ nguyên." };
      }
    }
    const context = this.context;
    const loaded = await this.bridge.readAutoRecoverSnapshot(snapshotId);
    if (loaded?.status !== "ok") {
      return { ok: false, error: loaded?.message || "Bản khôi phục bị hỏng hoặc không tương thích. Tệp vẫn được giữ nguyên." };
    }
    try {
      const restored = await context.restore(loaded.content, loaded.manifest, item);
      if (restored === false) throw new Error("Không thể nạp nội dung vào tài liệu.");
      context.recoverySnapshotId = snapshotId;
      context.docId = makeId();
      context.identity = this._identity(context.adapter, context.shell);
      this._setHelpStatus("Đã mở bản khôi phục dưới dạng tài liệu chưa lưu. Dùng Tệp → Lưu hoặc Ctrl+S để chọn nơi lưu bản này.");
      return { ok: true };
    } catch (error) {
      return { ok: false, error: `Không thể mở bản khôi phục: ${error?.message || error}. Tệp vẫn được giữ nguyên.` };
    }
  }
}

export const autoRecoverManager = new AutoRecoverManager();
