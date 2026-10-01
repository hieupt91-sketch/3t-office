/**
 * 3T Office Platform — Global Command Bus
 * Tuân thủ chuẩn 01-architecture/COMMAND-ARCHITECTURE.md
 */

export class CommandBus {
  constructor() {
    /** @type {Map<string, import('./command-types.js').CommandDefinition>} */
    this._definitions = new Map();
    /** @type {Map<string, import('./command-types.js').CommandState>} */
    this._states = new Map();
    /** @type {Map<string, Function>} */
    this._handlers = new Map();
    /** @type {Set<Function>} */
    this._listeners = new Set();
    /** @type {Array<{commandId: string, timestamp: number, args: any}>} */
    this._history = [];
    this._maxHistory = 100;
    /** @type {Array<{commandId: string, args: any}>|null} Ghi macro đang chạy, null = không ghi */
    this._macroSteps = null;
  }

  /**
   * Bắt đầu ghi macro: mọi lệnh thật thực thi qua execute() từ giờ trở đi
   * (trừ chính các lệnh common.macro.*) được ghi lại theo đúng thứ tự.
   */
  startMacroRecording() {
    this._macroSteps = [];
  }

  /** Đang ghi macro hay không. */
  isRecordingMacro() {
    return this._macroSteps !== null;
  }

  /**
   * Dừng ghi macro, trả về danh sách bước đã ghi (không tự lưu — nơi gọi
   * quyết định lưu hay hủy).
   * @returns {Array<{commandId: string, args: any}>}
   */
  stopMacroRecording() {
    const steps = this._macroSteps || [];
    this._macroSteps = null;
    return steps;
  }

  /**
   * Đăng ký định nghĩa lệnh vào Command Bus
   * @param {import('./command-types.js').CommandDefinition} def
   */
  register(def) {
    if (!def || !def.id) {
      throw new Error("Lệnh phải có định danh id hợp lệ.");
    }
    this._definitions.set(def.id, def);
    
    // Khởi tạo trạng thái mặc định
    this._states.set(def.id, {
      enabled: true,
      checked: false,
      visible: true,
      label: def.label,
      tooltip: def.tooltip || def.label,
      shortcut: def.shortcut || "",
      icon: def.icon || ""
    });

    if (def.defaultHandler) {
      this._handlers.set(def.id, def.defaultHandler);
    }
  }

  /**
   * Gắn handler thực thi từ Adapter hoặc Platform Service
   * @param {string} commandId 
   * @param {Function} handler 
   */
  bindHandler(commandId, handler) {
    if (!this._definitions.has(commandId)) {
      console.warn(`[CommandBus] Gắn handler cho lệnh chưa khai báo: ${commandId}`);
    }
    this._handlers.set(commandId, handler);
  }

  /**
   * Kiểm tra lệnh đã có handler gắn vào hay chưa
   * @param {string} commandId
   * @returns {boolean}
   */
  hasHandler(commandId) {
    return this._handlers.has(commandId);
  }

  /**
   * Cập nhật trạng thái lệnh (enabled, checked, visible...)
   * @param {string} commandId 
   * @param {Partial<import('./command-types.js').CommandState>} newState 
   */
  updateState(commandId, newState) {
    const current = this._states.get(commandId);
    if (!current) return;

    const updated = { ...current, ...newState };
    this._states.set(commandId, updated);
    this._notify(commandId, updated);
  }

  /**
   * Lấy trạng thái hiện tại của một lệnh
   * @param {string} commandId 
   * @returns {import('./command-types.js').CommandState | null}
   */
  getState(commandId) {
    return this._states.get(commandId) || null;
  }

  /**
   * Lấy định nghĩa của một lệnh
   * @param {string} commandId 
   */
  getDefinition(commandId) {
    return this._definitions.get(commandId) || null;
  }

  /**
   * Thực thi một lệnh thông qua Bus
   * @param {string} commandId 
   * @param {any} [args] 
   * @returns {Promise<any>}
   */
  async execute(commandId, args = null) {
    const def = this._definitions.get(commandId);
    const state = this._states.get(commandId);

    if (state && !state.enabled) {
      console.warn(`[CommandBus] Lệnh ${commandId} hiện đang bị vô hiệu hóa (disabled).`);
      return false;
    }

    const handler = this._handlers.get(commandId);
    if (!handler) {
      console.warn(`[CommandBus] Chưa có handler xử lý cho lệnh: ${commandId}`);
      return false;
    }

    try {
      this._recordHistory(commandId, args);
      // Ghi macro: bỏ qua chính các lệnh điều khiển macro.* để không tự ghi
      // đè lên nhau (bấm "Dừng ghi" không được lọt vào chính macro đang ghi).
      if (this._macroSteps !== null && !commandId.startsWith("common.macro.")) {
        this._macroSteps.push({ commandId, args });
      }
      const result = await handler(args);
      
      // Nếu là lệnh toggle, tự động cập nhật checked state nếu handler không tự đổi
      if (def && def.isToggle && result !== undefined && typeof result === "boolean") {
        this.updateState(commandId, { checked: result });
      }
      return result !== undefined ? result : true;
    } catch (err) {
      console.error(`[CommandBus] Lỗi thực thi lệnh [${commandId}]:`, err);
      throw err;
    }
  }

  /**
   * Bí danh tương thích cho execute()
   */
  dispatch(commandId, args = null) {
    return this.execute(commandId, args);
  }

  /**
   * Lắng nghe sự kiện thay đổi trạng thái của các lệnh
   * @param {Function} callback (commandId, state) => void
   * @returns {Function} hàm hủy đăng ký (unsubscribe)
   */
  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  _notify(commandId, state) {
    for (const listener of this._listeners) {
      try {
        listener(commandId, state);
      } catch (e) {
        console.error("[CommandBus] Lỗi listener subscriber:", e);
      }
    }
  }

  _recordHistory(commandId, args) {
    this._history.push({
      commandId,
      timestamp: Date.now(),
      args
    });
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  /**
   * Lấy lịch sử thực thi lệnh (phục vụ Diagnostics & Testing)
   */
  getHistory() {
    return [...this._history];
  }
}

// Global default singleton instance
export const globalCommandBus = new CommandBus();
if (typeof globalThis !== "undefined") {
  globalThis.globalCommandBus = globalCommandBus;
}
if (typeof window !== "undefined") {
  window.globalCommandBus = globalCommandBus;
}
