/**
 * VN Office LibreOffice Adapter — UNO Bridge & Dispatch Manager
 * Kết nối Command Bus với LibreOffice UNO Service / Dispatch Framework
 */

import { mapVnCommandToUno } from "./command-dispatch-mapper.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";

export class UnoBridge {
  constructor() {
    this.isConnected = false;
    this.activeDocument = null;
    this.nativeBridge = null; // window.chrome?.webview?.hostObjects?.unoBridge hoặc Native IPC
    this._listeners = new Map();
  }

  /**
   * Khởi tạo kết nối tới LibreOffice Core Engine
   */
  async init() {
    // Kiểm tra xem có môi trường Native WebView2 Host / IPC không
    if (typeof window !== "undefined" && window.chrome && window.chrome.webview) {
      try {
        this.nativeBridge = window.chrome.webview.hostObjects.unoBridge;
        this.isConnected = true;
        console.log("[UnoBridge] Đã kết nối với Native LibreOffice Core qua WebView2 Host.");
      } catch (e) {
        console.warn("[UnoBridge] Không kết nối được Native Host, chuyển sang Virtual Engine:", e);
      }
    }

    if (!this.isConnected) {
      console.log("[UnoBridge] Đang sử dụng Virtual Document Model Bridge (Dev/Test Mode).");
      this.isConnected = true;
    }

    this._bindAllStandardCommands();
  }

  /**
   * Tự động gắn tất cả các lệnh đã ánh xạ từ Command Bus sang Dispatch Handler
   */
  _bindAllStandardCommands() {
    const definitions = globalCommandBus._definitions;
    for (const [cmdId, def] of definitions.entries()) {
      const unoUrl = mapVnCommandToUno(cmdId);
      if (unoUrl) {
        globalCommandBus.bindHandler(cmdId, async (args) => {
          return await this.dispatch(unoUrl, args, cmdId);
        });
      }
    }
  }

  /**
   * Gửi lệnh dispatch tới Core
   * @param {string} unoUrl 
   * @param {any} [args] 
   * @param {string} [vnCmdId] 
   */
  async dispatch(unoUrl, args, vnCmdId) {
    if (this.nativeBridge) {
      return await this.nativeBridge.dispatch(unoUrl, JSON.stringify(args || {}));
    }

    // Virtual / Embedded Dispatch Handler (Đảm bảo hoạt động trơn tru trong mọi môi trường)
    if (this.activeDocument) {
      return await this.activeDocument.handleDispatch(unoUrl, args, vnCmdId);
    }

    console.log(`[UnoBridge Mock Dispatch] ${unoUrl} (VN: ${vnCmdId || "n/a"})`, args);
    return true;
  }

  /**
   * Gắn tài liệu đang mở hiện tại vào Bridge
   */
  attachDocument(doc) {
    this.activeDocument = doc;
  }

  /**
   * Cập nhật trạng thái lệnh ngược về UI (từ Core listener)
   */
  notifyStateChange(vnCmdId, state) {
    globalCommandBus.updateState(vnCmdId, state);
  }
}

export const globalUnoBridge = new UnoBridge();
