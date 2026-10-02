/**
 * 3T Office LibreOffice Adapter — UNO Bridge & Dispatch Manager
 * Kết nối Command Bus với LibreOffice UNO Service / Dispatch Framework
 */

import { mapVnCommandToUno } from "./command-dispatch-mapper.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";

export class UnoBridge {
  constructor() {
    this.isConnected = false;
    this.activeDocument = null;
    this.desktopApi = null; // window.pywebview.api — cầu nối Python thật tới LibreOffice headless
    this.hasRealEngine = false;
    this._listeners = new Map();
    this._browserDocumentSequences = { writer: 1, sheet: 1, slides: 1 };
    // Bind standard command handlers immediately upon module import.
    // This runs AFTER bootstrapPlatform() registers commands (see index.html order),
    // but BEFORE app attach() binds its own handlers, so apps can overwrite as needed.
    this._bindAllStandardCommands();
  }

  /**
   * Khởi tạo kết nối tới LibreOffice Core Engine.
   * Cầu nối thật duy nhất hiện có là Python/pywebview Bridge (`main.py`) — KHÔNG có host
   * native WebView2 nào được project này đăng ký (`AddHostObjectToScript` không tồn tại
   * ở đâu trong repo). Trước đây có nhánh kiểm tra `window.chrome.webview.hostObjects.unoBridge`
   * tưởng là "phát hiện native host", nhưng `window.chrome.webview` LUÔN tồn tại trên mọi
   * trang chạy trong WebView2 (chính là backend mà pywebview dùng trên Windows — không liên
   * quan gì tới việc có native host thật hay không), và `hostObjects.<tên bất kỳ>` của
   * WebView2 luôn trả về một proxy callable KHÔNG BAO GIỜ throw kể cả khi chưa có host object
   * nào tên đó được đăng ký thật. Kết quả: nhánh này LUÔN "thành công" giả trên Windows, gán
   * `isConnected = true` mà KHÔNG BAO GIỜ gán `desktopApi`, khiến nhánh pywebview thật (bên
   * dưới) không bao giờ chạy tới — đây chính là lỗi thật khiến Mở/Lưu/Xuất PDF luôn báo "chỉ
   * khả dụng trong Desktop App" NGAY TRONG CHÍNH Desktop App thật, xác nhận bằng cách kết nối
   * Playwright qua CDP thẳng vào cửa sổ ứng dụng thật đang chạy. Không giả vờ "đã kết nối" khi
   * không có engine thật — UI phải biết sự thật để báo người dùng đúng.
   */
  async init() {
    if (!this.isConnected && typeof window !== "undefined") {
      // pywebview chèn `window.pywebview.api` KHÔNG đồng bộ, thường VÀI TRĂM MILISECONDS
      // sau khi trang bắt đầu chạy script (đặc biệt trên backend WebView2 của Windows).
      // `bootstrapPlatform()` gọi `init()` ngay từ dòng script đầu tiên của index.html —
      // nếu kiểm tra `window.pywebview.api` đồng bộ như trước, gần như luôn thua cuộc đua
      // và rơi vào nhánh "không có engine" VĨNH VIỄN cho cả phiên, dù app Desktop thật đang
      // chạy và LibreOffice engine thật hoàn toàn sẵn sàng — đây là lỗi thật khiến Mở/Lưu/Xuất
      // PDF luôn báo "chỉ khả dụng trong Desktop App" ngay trong chính Desktop App. pywebview
      // bắn sự kiện `pywebviewready` trên `window` ngay khi cầu nối sẵn sàng; chờ sự kiện đó
      // (có timeout để không treo UI khi chạy trong trình duyệt thường, nơi sự kiện này
      // không bao giờ bắn).
      await this._waitForPywebviewBridge();
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

    // _bindAllStandardCommands() already called in constructor during module import.
    // Do not call again here to avoid overwriting app-specific handlers bound in attach().
  }

  /**
   * Chờ pywebview chèn xong `window.pywebview.api`, tối đa `timeoutMs`.
   * Trả về ngay nếu đã sẵn sàng, hoặc nếu không chạy trong pywebview (trình duyệt
   * thường/Playwright) thì sự kiện sẽ không bao giờ bắn — timeout đảm bảo không treo UI.
   */
  _waitForPywebviewBridge(timeoutMs = 3000) {
    return new Promise((resolve) => {
      if (window.pywebview && window.pywebview.api) return resolve();
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("pywebviewready", onReady);
        resolve();
      };
      const onReady = () => finish();
      window.addEventListener("pywebviewready", onReady, { once: true });
      setTimeout(finish, timeoutMs);
    });
  }

  /**
   * Mở một tệp tài liệu thật qua hộp thoại native (chỉ khả dụng trong Desktop App).
   * @param {"writer"|"sheet"|"slides"} appKind
   */
  async openRealFile(appKind) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng Mở tệp thật chỉ khả dụng trong 3T Office bản cài trên máy.",
      };
    }
    return await this.desktopApi.open_document_dialog(appKind);
  }

  async createNewDocumentWindow(appKind) {
    if (this.desktopApi?.create_new_document_window) {
      return await this.desktopApi.create_new_document_window(appKind);
    }
    if (typeof window === "undefined" || typeof window.open !== "function") {
      return { status: "error", message: "Không thể mở cửa sổ tài liệu mới." };
    }
    const prefixes = { writer: "Tài liệu", sheet: "Bảng tính", slides: "Bản trình bày" };
    const extensions = { writer: "docx", sheet: "xlsx", slides: "pptx" };
    if (!prefixes[appKind]) return { status: "error", message: "Loại tài liệu không hợp lệ." };
    const sequence = ++this._browserDocumentSequences[appKind];
    const url = new URL(window.location.href);
    url.searchParams.delete("openFile");
    url.searchParams.set("documentName", `${prefixes[appKind]} ${sequence}.${extensions[appKind]}`);
    const opened = window.open(url.toString(), "_blank");
    return opened
      ? { status: "ok" }
      : { status: "error", message: "Trình duyệt đã chặn cửa sổ tài liệu mới." };
  }

  async openFileInNewWindow(filePath, appKind) {
    if (this.desktopApi?.open_file_in_new_window) {
      return await this.desktopApi.open_file_in_new_window(filePath, appKind);
    }
    return { status: "error", message: "Mở tệp gần đây trong cửa sổ mới chỉ khả dụng trong 3T Office Desktop." };
  }

  async setWindowTitle(title) {
    if (!this.desktopApi?.set_window_title) return false;
    return await this.desktopApi.set_window_title(String(title || "3T Office"));
  }

  async closeCurrentWindow() {
    if (this.desktopApi?.close_current_window) {
      return await this.desktopApi.close_current_window();
    }
    return { status: "error", message: "Không thể đóng cửa sổ tài liệu hiện tại." };
  }

  /**
   * Mở tệp nguồn dữ liệu trộn thư (.xlsx, .xls, .csv, .tsv) qua hộp thoại native desktop.
   */
  async openMailMergeDataSource() {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng đọc tệp bảng tính chỉ khả dụng trong 3T Office bản cài trên máy.",
      };
    }
    if (typeof this.desktopApi.open_mail_merge_data_dialog === "function") {
      return await this.desktopApi.open_mail_merge_data_dialog();
    }
    return {
      status: "error",
      message: "Hệ thống chưa hỗ trợ hộp thoại nguồn dữ liệu.",
    };
  }

  async getSheetOpenFallback(openId) {
    if (!this.desktopApi) return { status: "error", message: "Không thể lấy dữ liệu dự phòng của bảng tính." };
    return await this.desktopApi.get_sheet_open_fallback(openId || "");
  }

  async getLatestSheetOpenFallback() {
    if (!this.desktopApi) return { status: "error", message: "Không thể lấy dữ liệu dự phòng của bảng tính." };
    return await this.desktopApi.get_latest_sheet_open_fallback();
  }

  async releaseSheetOpenFallback(openId) {
    if (!this.desktopApi || !openId) return false;
    return await this.desktopApi.release_sheet_open_fallback(openId);
  }

  async reportFrontendError(payload) {
    if (!this.desktopApi) return { queued: false };
    return await this.desktopApi.report_frontend_error(payload);
  }

  /**
   * Lưu nội dung hiện tại thành tệp thật (DOCX/XLSX/...) qua hộp thoại native.
   * @param {"writer"|"sheet"|"slides"} appKind
   * @param {string} content
   * @param {string} [targetFormat]
   * @param {string} [suggestedName]
   * @param {string} [sourcePath]
   */
  async saveRealFile(appKind, content, targetFormat, suggestedName, sourcePath) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng Lưu tệp thật chỉ khả dụng trong 3T Office bản cài trên máy.",
      };
    }
    return await this.desktopApi.save_document_dialog(content, appKind, targetFormat, suggestedName, sourcePath);
  }

  /**
   * Lưu nội dung trực tiếp vào tệp đích đang mở (không mở hộp thoại).
   * @param {"writer"|"sheet"|"slides"} appKind
   * @param {string} content
   * @param {string} targetPath
   * @param {string} [sourcePath]
   */
  async saveRealFileInPlace(appKind, content, targetPath, sourcePath) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng Lưu tệp thật chỉ khả dụng trong 3T Office bản cài trên máy.",
      };
    }
    return await this.desktopApi.save_document_in_place(content, appKind, targetPath, sourcePath || targetPath);
  }

  /**
   * Xuất PDF thật từ nội dung hiện tại qua hộp thoại native.
   * @param {"writer"|"sheet"|"slides"} appKind
   * @param {string} content
   * @param {string} [suggestedName]
   */
  async exportRealPdf(appKind, content, suggestedName, sourcePath) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng Xuất PDF thật chỉ khả dụng trong 3T Office bản cài trên máy.",
      };
    }
    return await this.desktopApi.export_pdf_dialog(content, appKind, suggestedName, sourcePath);
  }

  async preparePrintDocument(appKind, content, suggestedName, sourcePath, useOffice = true, printOptions = null) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return {
        status: "error",
        message: "Chức năng In chỉ khả dụng trong 3T Office bản cài trên máy.",
      };
    }
    return await this.desktopApi.prepare_print_document(
      appKind, content, suggestedName, sourcePath, useOffice, printOptions,
    );
  }

  async getPrintEngineStatus(appKind) {
    if (!this.desktopApi) return { status: "ok", officeAvailable: false, preferredEngine: "LibreOffice" };
    return await this.desktopApi.get_print_engine_status(appKind);
  }

  async getPrintPreviewPage(sessionId, pageNumber) {
    if (!this.desktopApi) return { status: "error", message: "Cầu nối Python của ứng dụng chưa sẵn sàng." };
    return await this.desktopApi.get_print_preview_page(sessionId, pageNumber);
  }

  async getInstalledPrinters() {
    if (!this.desktopApi) return { status: "error", message: "Danh sách máy in chỉ khả dụng trong 3T Office Desktop." };
    return await this.desktopApi.get_installed_printers();
  }

  async printDocument(sessionId, settings) {
    if (!this.desktopApi || !this.hasRealEngine) {
      return { status: "error", message: "Không tìm thấy dịch vụ in trên máy này." };
    }
    return await this.desktopApi.print_document(sessionId, settings);
  }

  async cancelPrintDocument(sessionId) {
    if (!this.desktopApi || !sessionId) return false;
    return await this.desktopApi.cancel_print_document(sessionId);
  }

  async readClipboardData() {
    if (!this.desktopApi?.read_clipboard_data) {
      return { status: "unavailable", text: "", html: "" };
    }
    return await this.desktopApi.read_clipboard_data();
  }

  // AutoRecover is a local app-data service and does not require the LibreOffice engine.
  async getAutoRecoverSettings() {
    if (!this.desktopApi) return { enabled: true, interval_minutes: 2 };
    return await this.desktopApi.get_autorecover_settings();
  }

  async setAutoRecoverSettings(settings) {
    if (!this.desktopApi) return { enabled: true, interval_minutes: 2 };
    return await this.desktopApi.set_autorecover_settings(settings);
  }

  async listAutoRecoverSnapshots() {
    if (!this.desktopApi) return [];
    return await this.desktopApi.list_autorecover_snapshots();
  }

  async readAutoRecoverSnapshot(snapshotId) {
    if (!this.desktopApi) return { status: "error", message: "AutoRecover chỉ khả dụng trong 3T Office Desktop." };
    return await this.desktopApi.read_autorecover_snapshot(snapshotId);
  }

  async writeAutoRecoverSnapshot({ docId, appKind, content, originalPath = "", title = "", format }) {
    if (!this.desktopApi) return { status: "error", message: "AutoRecover chỉ khả dụng trong 3T Office Desktop." };
    return await this.desktopApi.write_autorecover_snapshot(docId, appKind, content, originalPath, title, format);
  }

  async deleteAutoRecoverSnapshot(snapshotId) {
    if (!this.desktopApi) return false;
    return await this.desktopApi.delete_autorecover_snapshot(snapshotId);
  }

  async deleteAutoRecoverDocument(docId) {
    if (!this.desktopApi) return false;
    return await this.desktopApi.delete_autorecover_document(docId);
  }

  async getPerformanceLogSettings() {
    if (!this.desktopApi?.get_performance_log_settings) return { enabled: false };
    return await this.desktopApi.get_performance_log_settings();
  }

  async setPerformanceLogSettings(settings) {
    if (!this.desktopApi?.set_performance_log_settings) return { status: "error", message: "Tùy chọn chỉ khả dụng trong 3T Office Desktop." };
    return await this.desktopApi.set_performance_log_settings(settings);
  }

  async openPerformanceLogFolder() {
    if (!this.desktopApi?.open_performance_log_folder) return { status: "error", message: "Tùy chọn chỉ khả dụng trong 3T Office Desktop." };
    return await this.desktopApi.open_performance_log_folder();
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
