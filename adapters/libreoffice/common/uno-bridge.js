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
    this.desktopApi = null; // window.pywebview.api — cầu nối Python thật tới LibreOffice headless
    this.hasRealEngine = false;
    this._listeners = new Map();
  }

  /**
   * Khởi tạo kết nối tới LibreOffice Core Engine.
   * Thứ tự ưu tiên: WebView2 Native Host > Python/pywebview Bridge (thật) > không có engine.
   * Không giả vờ "đã kết nối" khi không có engine thật — UI phải biết sự thật để báo người dùng đúng.
   */
  async init() {
    if (typeof window !== "undefined" && window.chrome && window.chrome.webview) {
      try {
        this.nativeBridge = window.chrome.webview.hostObjects.unoBridge;
        this.isConnected = true;
        this.hasRealEngine = true;
        console.log("[UnoBridge] Đã kết nối với Native LibreOffice Core qua WebView2 Host.");
      } catch (e) {
        console.warn("[UnoBridge] Không kết nối được Native Host WebView2:", e);
      }
    }

    if (!this.isConnected && typeof window !== "undefined" && window.pywebview && window.pywebview.api) {
      this.desktopApi = window.pywebview.api;
      this.isConnected = true;
      try {
        const status = await this.desktopApi.engine_status();
        this.hasRealEngine = !!(status && status.available);
        console.log(
          this.hasRealEngine
            ? "[UnoBridge] Đã kết nối Python Desktop Bridge — LibreOffice engine thật sẵn sàng."
            : "[UnoBridge] Đã kết nối Python Desktop Bridge nhưng KHÔNG tìm thấy LibreOffice engine trên máy."
        );
      } catch (e) {
        console.warn("[UnoBridge] Không lấy được trạng thái engine từ Python Bridge:", e);
      }
    }

    if (!this.isConnected) {
      console.warn(
        "[UnoBridge] Không chạy trong ứng dụng Desktop (pywebview) — chỉ khả dụng chỉnh sửa trong trình duyệt, " +
          "các thao tác Mở/Lưu/Xuất PDF với tệp thật sẽ KHÔNG hoạt động cho tới khi chạy qua VN-Office.bat."
      );
    }

    this._bindAllStandardCommands();
  }

  /**
   * Mở một tệp tài liệu thật qua hộp thoại native (chỉ khả dụng trong Desktop App).
   * @param {"writer"|"sheet"|"slides"} appKind
   */
  async openRealFile(appKind) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng Mở tệp thật chỉ khả dụng trong VN Office Desktop App (đã cài LibreOffice).",
      };
    }
    return await this.desktopApi.open_document_dialog(appKind);
  }

  /**
   * Lưu nội dung hiện tại thành tệp thật (DOCX/XLSX/...) qua hộp thoại native.
   * @param {"writer"|"sheet"|"slides"} appKind
   * @param {string} content
   * @param {string} [targetFormat]
   * @param {string} [suggestedName]
   */
  async saveRealFile(appKind, content, targetFormat, suggestedName) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng Lưu tệp thật chỉ khả dụng trong VN Office Desktop App (đã cài LibreOffice).",
      };
    }
    return await this.desktopApi.save_document_dialog(content, appKind, targetFormat, suggestedName);
  }

  /**
   * Xuất PDF thật từ nội dung hiện tại qua hộp thoại native.
   * @param {"writer"|"sheet"|"slides"} appKind
   * @param {string} content
   * @param {string} [suggestedName]
   */
  async exportRealPdf(appKind, content, suggestedName) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng Xuất PDF thật chỉ khả dụng trong VN Office Desktop App (đã cài LibreOffice).",
      };
    }
    return await this.desktopApi.export_pdf_dialog(content, appKind, suggestedName);
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
