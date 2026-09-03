/**
 * VN Writer Application Entrypoint
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { WRITER_RIBBON_TABS } from "./writer-ribbon.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export class WriterApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.adapter = null;
    this.canvas = null;
  }

  async init() {
    // 1. Đăng ký toàn bộ Command definitions
    registerAllStandardCommands(globalCommandBus);

    // 2. Khởi tạo UNO Bridge
    await globalUnoBridge.init();

    // 3. Khởi tạo Application Shell
    this.shell = new AppShell({
      appName: "writer",
      appTitle: "VN Writer",
      documentName: "Văn bản hành chính 1.docx"
    });
    this.shell.mount(this.mountElement);

    // 4. Thiết lập cấu trúc Ribbon cho Writer
    this.shell.ribbonHost.setStructure(WRITER_RIBBON_TABS, "home");

    // 5. Tạo Document Canvas (Trang A4)
    this.canvas = document.createElement("div");
    this.canvas.className = "vno-writer-canvas";
    this.canvas.setAttribute("contenteditable", "true");
    this.canvas.setAttribute("spellcheck", "false");

    // Mẫu văn bản hành chính Việt Nam chuẩn khởi đầu
    this.canvas.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:20pt; font-size:12pt;">
        <div style="text-align:center;">
          <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
          <div style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</div>
          <div style="letter-spacing:2px;">-------------------</div>
        </div>
        <div style="text-align:center;">
          <div><strong>BỘ CÔNG THƯƠNG</strong></div>
          <div>Số: 01/QĐ-BCT</div>
          <div style="font-style:italic;">Hà Nội, ngày 03 tháng 09 năm 2026</div>
        </div>
      </div>
      <h1>QUYẾT ĐỊNH</h1>
      <p style="text-align:center; font-style:italic; margin-bottom:16pt;">Về việc ban hành Tiêu chuẩn Kỹ thuật Bộ Ứng dụng Văn phòng VN Office</p>
      <p>Căn cứ Nghị định số 30/2020/NĐ-CP về công tác văn thư và định dạng văn bản hành chính;</p>
      <p>Theo đề nghị của Lead Engineering Agent phụ trách dự án phát triển phần mềm nội địa;</p>
      <h2>QUYẾT ĐỊNH:</h2>
      <p><strong>Điều 1.</strong> Chính thức phê duyệt và đưa vào vận hành phiên bản thử nghiệm đầu tiên của bộ ứng dụng VN Office bao gồm: VN Writer, VN Sheet và VN Slides.</p>
      <p><strong>Điều 2.</strong> Các đơn vị liên quan chịu trách nhiệm thi hành quyết định này kể từ ngày ký.</p>
    `;

    this.shell.setEditorCanvas(this.canvas);

    // 6. Gắn Writer Adapter
    this.adapter = new WriterAdapter(this.canvas);
    this.adapter.attach();

    // 7. Lắng nghe thay đổi nội dung để cập nhật số từ / ký tự
    this._setupContentObserver();

    console.log("[WriterApp] Khởi tạo VN Writer hoàn tất thành công.");
  }

  _setupContentObserver() {
    const updateStats = () => {
      const text = this.canvas.innerText || "";
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      const chars = text.length;
      this.shell.setStatus(`Trang 1 / 1  |  ${words} từ  |  ${chars} ký tự`);
    };

    this.canvas.addEventListener("input", updateStats);
    updateStats();
  }
}
