/**
 * VN Writer Application Entrypoint — Refined Enterprise Edition
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { WRITER_RIBBON_TABS, applyLocaleToWriterRibbon } from "./writer-ribbon.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { bootstrapPlatform } from "../../platform/bootstrap.js";
import { createStyleGalleryStrip } from "./style-gallery.js";
import { t } from "../../platform/i18n/i18n.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";

export class WriterApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.adapter = null;
    this.canvas = null;
    this._lifecycleObserver = null;
  }

  async init(options = {}) {
    await bootstrapPlatform();
    globalShortcutManager.setActiveScope("writer");

    const isBlank = options.templateId === "blank";
    this.shell = new AppShell({
      appName: "writer",
      appTitle: "VN Writer",
      documentName: options.documentName || (isBlank ? "Tài liệu 1.docx" : "Quyết định ban hành tiêu chuẩn 01.docx")
    });
    this.shell.mount(this.mountElement);
    this._watchLifecycle();
    applyLocaleToWriterRibbon(WRITER_RIBBON_TABS);
    this.shell.ribbonHost.setStructure(WRITER_RIBBON_TABS, "home");

    // Khung giao diện Writer: Ruler + Viewport + Trang A4
    const container = document.createElement("div");
    container.className = "vno-writer-container";

    // Thước đo ngang (Ruler)
    const ruler = document.createElement("div");
    ruler.className = "vno-writer-ruler";
    ruler.innerHTML = `
      <div class="vno-ruler-track">
        <div class="vno-ruler-marker-left" title="Lề trái: 30mm (NĐ 30/2020/NĐ-CP)"></div>
        <div class="vno-ruler-scale"></div>
        <div class="vno-ruler-marker-right" title="Lề phải: 15mm (NĐ 30/2020/NĐ-CP)"></div>
      </div>
    `;
    container.appendChild(ruler);

    // Viewport cuộn trang
    const viewport = document.createElement("div");
    viewport.className = "vno-writer-viewport";

    // Trang giấy A4
    this.canvas = document.createElement("div");
    this.canvas.className = "vno-writer-page";
    this.canvas.setAttribute("spellcheck", "false");

    const header = document.createElement("div");
    header.className = "vno-writer-header";
    header.setAttribute("contenteditable", "true");
    header.setAttribute("spellcheck", "false");
    header.setAttribute("data-placeholder", t("writerDialogs.comments.placeholderHeader"));

    const body = document.createElement("div");
    body.className = "vno-writer-body";
    body.setAttribute("contenteditable", "true");
    body.setAttribute("spellcheck", "false");

    const footer = document.createElement("div");
    footer.className = "vno-writer-footer";
    footer.setAttribute("contenteditable", "true");
    footer.setAttribute("spellcheck", "false");
    footer.setAttribute("data-placeholder", t("writerDialogs.comments.placeholderFooter"));

    if (isBlank) {
      body.innerHTML = `<p><br></p>`;
    } else {
      header.innerHTML = `<p style="text-align:right; font-size:9.5pt; color:#64748b; margin:0;">VN Office — Mẫu văn bản hành chính</p>`;
      footer.innerHTML = `<p style="text-align:center; font-size:9.5pt; color:#64748b; margin:0;">Trang 1 / 1</p>`;
      // Mẫu văn bản chuẩn hóa
      body.innerHTML = `
      <table style="width:100%; border:none; margin-bottom:18pt;">
        <tr>
          <td style="width:45%; text-align:center; border:none; padding:0; vertical-align:top;">
            <div><strong>ỦY BAN NHÂN DÂN</strong></div>
            <div><strong>THÀNH PHỐ HÀ NỘI</strong></div>
            <div style="letter-spacing:1px;">----------------</div>
            <div style="font-size:13pt; margin-top:4pt;">Số: 26/QĐ-UBND</div>
          </td>
          <td style="width:55%; text-align:center; border:none; padding:0; vertical-align:top;">
            <div><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></div>
            <div style="font-weight:bold;">Độc lập - Tự do - Hạnh phúc</div>
            <div style="letter-spacing:2px;">-------------------------</div>
            <div style="font-style:italic; font-size:13pt; margin-top:4pt;">Hà Nội, ngày 03 tháng 09 năm 2026</div>
          </td>
        </tr>
      </table>

      <h1>QUYẾT ĐỊNH</h1>
      <p style="text-align:center; font-weight:bold; font-size:14pt; margin-bottom:16pt;">Về việc ban hành Bộ Ứng dụng Văn phòng Việt Nam — VN Office</p>

      <p style="text-align:center; font-style:italic; margin-bottom:14pt;">CHỦ TỊCH ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI</p>

      <p><em>Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;</em></p>
      <p><em>Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;</em></p>
      <p><em>Xét đề nghị của Giám đốc Sở Thông tin và Truyền thông và Lead Engineering Agent dự án VN Office.</em></p>

      <h2>QUYẾT ĐỊNH:</h2>

      <p><strong>Điều 1.</strong> Phê duyệt và chính thức áp dụng bộ giải pháp phần mềm văn phòng <strong>VN Office</strong> (bao gồm <strong>VN Writer</strong>, <strong>VN Sheet</strong> và <strong>VN Slides</strong>) tại các cơ quan, đơn vị, doanh nghiệp trên địa bàn.</p>

      <p><strong>Điều 2.</strong> Bộ ứng dụng VN Office đáp ứng đầy đủ quy chuẩn bảo mật dữ liệu, kế thừa sức mạnh xử lý định dạng ODF/OOXML của LibreOffice Core, đồng thời mang giao diện thuần Việt trực quan, hiện đại và chuẩn mực.</p>

      <p><strong>Điều 3.</strong> Quyết định này có hiệu lực kể từ ngày ký. Chánh Văn phòng UBND Thành phố, Thủ trưởng các cơ quan, ban, ngành chịu trách nhiệm thi hành Quyết định này./.</p>

      <table style="width:100%; border:none; margin-top:28pt;">
        <tr>
          <td style="width:55%; border:none; font-size:11pt; line-height:1.3; vertical-align:top;">
            <strong><em>Nơi nhận:</em></strong><br>
            - Như Điều 3;<br>
            - Văn phòng Chính phủ;<br>
            - Cổng TTĐT Thành phố;<br>
            - Lưu: VT, TH.
          </td>
          <td style="width:45%; border:none; text-align:center; vertical-align:top;">
            <strong>CHỦ TỊCH</strong><br>
            <em>(Đã ký và đóng dấu)</em><br><br><br><br>
            <strong>Trần Văn Nam</strong>
          </td>
        </tr>
      </table>
    `;
    }

    this.canvas.appendChild(header);
    this.canvas.appendChild(body);
    this.canvas.appendChild(footer);

    viewport.appendChild(this.canvas);

    const workspace = document.createElement("div");
    workspace.className = "vno-writer-workspace";
    workspace.appendChild(viewport);

    const commentsPanel = document.createElement("aside");
    commentsPanel.className = "vno-writer-comments-panel";
    commentsPanel.setAttribute("aria-label", t("writerDialogs.comments.panelLabel"));
    commentsPanel.hidden = true;
    workspace.appendChild(commentsPanel);

    container.appendChild(workspace);
    this.shell.setEditorCanvas(container);

    this.adapter = new WriterAdapter(this.canvas);
    this.adapter.setCommentsPanel(commentsPanel);
    this.adapter.attach();

    this._mountStyleGalleryRibbonStrip();
    this._watchRibbonForStyleGalleryStrip();
    this._setupContentObserver();
    console.log("[WriterApp] Đã khởi tạo VN Writer chuẩn hóa cao cấp.");
  }

  /**
   * `_mountStyleGalleryRibbonStrip()` chèn dải thẻ kiểu trực tiếp vào DOM ribbon đã
   * dựng sẵn (không qua cấu trúc `WRITER_RIBBON_TABS`). Mỗi lần đổi tab, `RibbonHost.render()`
   * xóa sạch `innerHTML` rồi dựng lại toàn bộ ribbon từ đầu — nên dải kiểu bị mất và
   * KHÔNG bao giờ tự chèn lại (bug thật: người dùng thấy dải kiểu "biến mất" sau khi
   * chuyển tab rồi quay lại, chứ không phải "đã hết lỗi"). Theo dõi bằng MutationObserver
   * để tự chèn lại mỗi khi ribbon được dựng lại.
   */
  _watchRibbonForStyleGalleryStrip() {
    if (typeof MutationObserver === "undefined" || !this.mountElement) return;
    if (this._styleGalleryObserver) return;
    this._styleGalleryObserver = new MutationObserver(() => {
      this._mountStyleGalleryRibbonStrip();
    });
    this._styleGalleryObserver.observe(this.mountElement, { childList: true, subtree: true });
  }

  /**
   * `mountElement` (#vno-app-root) là node DOM dùng chung, tái sử dụng bởi mọi lần
   * chuyển app (Writer/Sheet/Slides đều mount vào cùng node này qua AppShell.mount(),
   * hàm này set data-app=<tên app>). Không có cơ chế dọn dẹp thì mỗi lần quay lại
   * Writer sẽ tạo thêm một WriterApp mới trong khi observer của phiên trước vẫn sống,
   * giữ sống vĩnh viễn adapter cũ (rò rỉ bộ nhớ) và chạy lại trên mọi thay đổi DOM của
   * cả Sheet/Slides. Theo dõi thuộc tính data-app: khi nó đổi khỏi "writer" nghĩa là
   * app khác vừa mount đè lên, tự dọn dẹp phiên này.
   */
  _watchLifecycle() {
    this._lifecycleObserver?.disconnect();
    if (typeof MutationObserver === "undefined" || !this.mountElement) return;
    this._lifecycleObserver = new MutationObserver(() => {
      if (this.mountElement.getAttribute("data-app") !== "writer") this.destroy();
    });
    this._lifecycleObserver.observe(this.mountElement, { attributes: true, attributeFilter: ["data-app"] });
  }

  destroy() {
    this._lifecycleObserver?.disconnect();
    this._lifecycleObserver = null;
    this._styleGalleryObserver?.disconnect();
    this._styleGalleryObserver = null;
  }

  _mountStyleGalleryRibbonStrip() {
    if (typeof document === "undefined") return;
    const groups = this.mountElement?.querySelectorAll?.(".vno-ribbon-group") || [];
    let stylesGroup = null;
    const localizedStylesLabel = t("writerRibbon.group.styles");
    for (const g of groups) {
      const label = g.querySelector?.(".vno-ribbon-group-label")?.textContent?.trim();
      if (
        label === "Kiểu dáng" ||
        label === "Styles" ||
        label === localizedStylesLabel ||
        g.querySelector?.('button[data-command-id="writer.style.gallery"]')
      ) {
        stylesGroup = g;
        break;
      }
    }
    if (stylesGroup) {
      const itemsEl = stylesGroup.querySelector?.(".vno-ribbon-group-items");
      if (itemsEl && !itemsEl.querySelector?.(".vno-style-gallery-strip")) {
        const strip = createStyleGalleryStrip({
          activeStyle: this.adapter?.getCurrentParagraphStyle?.() || "normal",
          onSelectStyle: (styleId) => this.adapter?._applyParagraphStyle?.(styleId)
        });
        if (strip) {
          itemsEl.appendChild(strip);
        }
      }
    }
  }

  _setupContentObserver() {
    const updateStats = () => {
      const text = (this.canvas.innerText || "").trim();
      const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
      const chars = text.replace(/[\r\n]/g, "").length;
      const paragraphs = text ? text.split(/\n+/).filter(p => p.trim().length > 0).length : 0;
      // Số trang thật do WriterAdapter._recomputeLivePagination() đo và tính (dựa trên
      // chiều cao thật của nội dung, không phải chỉ đếm ngắt trang thủ công như trước).
      // Debounce 250ms nên ngay sau khi gõ có thể còn số cũ trong chốc lát — sự kiện
      // "vno-pagination-updated" bên dưới sẽ gọi lại updateStats() khi số mới sẵn sàng.
      const totalPages = Math.max(1, this.adapter?._livePageCount || 1);

      this.shell.setStatus(
        `Trang 1 / ${totalPages}  |  ${words} từ  |  ${chars} ký tự  |  ${paragraphs} đoạn  |  Tiếng Việt (NĐ 30/2020/NĐ-CP)`
      );
    };

    this.canvas.addEventListener("input", updateStats);
    this.canvas.addEventListener("vno-pagination-updated", updateStats);
    updateStats();
  }
}
