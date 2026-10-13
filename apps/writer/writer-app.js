/**
 * 3T Doc Application Entrypoint — Refined Enterprise Edition
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { WRITER_RIBBON_TABS, applyLocaleToWriterRibbon } from "./writer-ribbon.js";
import { WriterArrangeController } from "./writer-arrange.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { bootstrapPlatform } from "../../platform/bootstrap.js";
import { t } from "../../platform/i18n/i18n.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { withLazyFeatureProgress } from "../../platform/startup/lazy-feature.js";
import { WriterViewController } from "./writer-view-controller.js";
import { WriterRulerController } from "./writer-ruler-controller.js";
import { WriterTableController } from "./writer-table.js";
import { getHelpEntryById } from "../../platform/help/help-catalog.js";
import { InputNormalizer } from "../../platform/keyboard/input-normalizer.js";
import { showContextMenu, closeActiveContextMenu } from "../../platform/ui-kit/components.js";
import { showPageSetupDialog } from "./page-setup-dialog.js";
import { WriterAutoCorrectPreferences, WriterAutoCorrectController } from "./auto-correct.js";
import { createWriterAutoCorrectOptionsProvider } from "./auto-correct-options.js";

export class WriterApp {
  constructor(mountElement) {
    this.mountElement = mountElement;
    this.shell = null;
    this.adapter = null;
    this.canvas = null;
    this._lifecycleObserver = null;
    this.viewController = null;
    this.rulerController = null;
    this.spellcheckController = null;
    this.helpPanel = null;
    this.autoRecoverManager = null;
    this.workspace = null;
    this._styleGalleryModulePromise = null;
    this._helpPanelPromise = null;
    this.autoCorrectPreferences = new WriterAutoCorrectPreferences();
  }

  async init(options = {}) {
    await bootstrapPlatform();
    globalShortcutManager.setActiveScope("writer");

    const templateId = options.templateId || "blank";
    const isBlank = templateId === "blank";
    this.shell = new AppShell({
      appName: "writer",
      appTitle: "Doc",
      documentName: options.documentName || (isBlank ? "Tài liệu 1.docx" : "Quyết định ban hành tiêu chuẩn 01.docx"),
      onApplyTemplate: (selectedTemplateId) => this._applyTemplate(selectedTemplateId),
      optionsProvider: createWriterAutoCorrectOptionsProvider(this.autoCorrectPreferences)
    });
    // Dùng cùng bộ đếm với thanh trạng thái và hộp thoại Đếm từ khi Trợ lý AI tóm tắt.
    this.shell.getDocumentWordCount = () => this.adapter?.getWordCountStats({ preferSelection: false })?.words;
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
    ruler.setAttribute("role", "toolbar");
    ruler.setAttribute("aria-label", "Thước ngang");
    ruler.innerHTML = `
      <div class="vno-ruler-track">
        <div class="vno-ruler-margin vno-ruler-margin-left"></div>
        <div class="vno-ruler-scale"></div>
        <div class="vno-ruler-margin vno-ruler-margin-right"></div>
        <div class="vno-ruler-marker vno-ruler-margin-handle vno-ruler-marker-left" data-ruler-kind="marginLeft" role="slider" tabindex="0"></div>
        <div class="vno-ruler-marker vno-ruler-first-line" data-ruler-kind="firstLine" role="slider" tabindex="0"></div>
        <div class="vno-ruler-marker vno-ruler-hanging" data-ruler-kind="hanging" role="slider" tabindex="0"></div>
        <div class="vno-ruler-marker vno-ruler-left-indent" data-ruler-kind="leftIndent" role="slider" tabindex="0"></div>
        <div class="vno-ruler-marker vno-ruler-right-indent" data-ruler-kind="rightIndent" role="slider" tabindex="0"></div>
        <div class="vno-ruler-marker vno-ruler-margin-handle vno-ruler-marker-right" data-ruler-kind="marginRight" role="slider" tabindex="0"></div>
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
    header.dataset.vnoNativeClipboard = "true";
    header.setAttribute("spellcheck", "false");
    header.setAttribute("role", "textbox");
    header.setAttribute("aria-label", "Đầu trang");
    header.setAttribute("aria-multiline", "true");
    header.setAttribute("data-placeholder", t("writerDialogs.comments.placeholderHeader"));

    const body = document.createElement("div");
    body.className = "vno-writer-body";
    body.setAttribute("contenteditable", "true");
    body.dataset.vnoNativeClipboard = "true";
    body.setAttribute("spellcheck", "false");
    body.setAttribute("role", "textbox");
    body.setAttribute("aria-label", "Nội dung văn bản");
    body.setAttribute("aria-multiline", "true");

    const footer = document.createElement("div");
    footer.className = "vno-writer-footer";
    footer.setAttribute("contenteditable", "true");
    footer.dataset.vnoNativeClipboard = "true";
    footer.setAttribute("spellcheck", "false");
    footer.setAttribute("role", "textbox");
    footer.setAttribute("aria-label", "Chân trang");
    footer.setAttribute("aria-multiline", "true");
    footer.setAttribute("data-placeholder", t("writerDialogs.comments.placeholderFooter"));

    // Dựng nội dung mẫu một lần rồi giữ bản HTML sạch để thẻ mẫu trong Backstage
    // có thể áp dụng vào tài liệu đang mở, thay vì chỉ đổi tên tab.
    header.innerHTML = `<p style="text-align:right; font-size:9.5pt; color:#64748b; margin:0;">3T Office — Mẫu văn bản hành chính</p>`;
    footer.innerHTML = `<p style="text-align:center; font-size:9.5pt; color:#64748b; margin:0;">Trang 1 / 1</p>`;
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
      <p style="text-align:center; font-weight:bold; font-size:14pt; margin-bottom:16pt;">Về việc ban hành Bộ Ứng dụng Văn phòng Việt Nam — 3T Office</p>

      <p style="text-align:center; font-style:italic; margin-bottom:14pt;">CHỦ TỊCH ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI</p>

      <p><em>Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;</em></p>
      <p><em>Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;</em></p>
      <p><em>Xét đề nghị của Giám đốc Sở Thông tin và Truyền thông và Lead Engineering Agent dự án 3T Office.</em></p>

      <h2>QUYẾT ĐỊNH:</h2>

      <p><strong>Điều 1.</strong> Phê duyệt và chính thức áp dụng bộ giải pháp phần mềm văn phòng <strong>3T Office</strong> (bao gồm <strong>Doc</strong>, <strong>Sheet</strong> và <strong>Slide</strong>) tại các cơ quan, đơn vị, doanh nghiệp trên địa bàn.</p>

      <p><strong>Điều 2.</strong> Nhân viên sử dụng Doc để soạn công văn, Sheet để lập bảng theo dõi và Slide để chuẩn bị báo cáo cuộc họp. Tài liệu được lưu trên máy tính; cần kiểm tra nội dung và bố cục trước khi gửi.</p>

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
    this._administrativeTemplateHtml = {
      header: header.innerHTML,
      body: body.innerHTML,
      footer: footer.innerHTML
    };
    if (isBlank) {
      header.innerHTML = "";
      body.innerHTML = `<p><br></p>`;
      footer.innerHTML = "";
    }

    this.canvas.appendChild(header);
    this.canvas.appendChild(body);
    this.canvas.appendChild(footer);

    viewport.appendChild(this.canvas);

    // Thước đo dọc (Vertical Ruler)
    const verticalRuler = document.createElement("div");
    verticalRuler.className = "vno-writer-ruler-vertical";
    verticalRuler.setAttribute("role", "presentation");
    verticalRuler.setAttribute("aria-hidden", "true");
    verticalRuler.innerHTML = `
      <div class="vno-ruler-vertical-track">
        <div class="vno-ruler-marker-top" title="Lề trên: 20mm (NĐ 30/2020/NĐ-CP)"></div>
        <div class="vno-ruler-vertical-scale"></div>
        <div class="vno-ruler-marker-bottom" title="Lề dưới: 20mm (NĐ 30/2020/NĐ-CP)"></div>
      </div>
    `;

    const workspace = document.createElement("div");
    workspace.className = "vno-writer-workspace";
    workspace.appendChild(verticalRuler);
    workspace.appendChild(viewport);

    const commentsPanel = document.createElement("aside");
    commentsPanel.className = "vno-writer-comments-panel";
    commentsPanel.setAttribute("aria-label", t("writerDialogs.comments.panelLabel"));
    commentsPanel.hidden = true;
    workspace.appendChild(commentsPanel);

    this.workspace = workspace;
    globalCommandBus.bindHandler("writer.help.open", (args) => {
      return withLazyFeatureProgress("writer", "Trợ giúp", () => this._ensureHelpPanel()).then((panel) => {
        if (args?.entryId || args?.query != null) return panel.open(args);
        if (!panel.isOpen()) {
          const entryId = getWriterContextHelpEntryId(document.activeElement);
          if (entryId) return panel.open({ entryId });
        }
        return panel.toggle();
      });
    });

    globalCommandBus.bindHandler("writer.review.toggleSpellCheck", () => {
      return this.toggleSpellcheck();
    });

    globalCommandBus.bindHandler("writer.page.setupDialog", async () => {
      if (this.adapter && typeof this.adapter._openPageSetup === "function") {
        return await this.adapter._openPageSetup();
      }
      const res = await showPageSetupDialog();
      if (res && res.margins) {
        await globalCommandBus.execute("writer.ruler.setPageMargins", { margins: res.margins });
      }
      return res;
    });

    container.appendChild(workspace);
    this.shell.setEditorCanvas(container);

    this.adapter = new WriterAdapter(this.canvas);
    this.adapter.setCommentsPanel(commentsPanel);
    this.adapter.setShell(this.shell);
    this.adapter.attach();
    if (isBlank) {
      const firstParagraph = body.querySelector("p") || body;
      body.focus();
      const selection = window.getSelection?.();
      const range = document.createRange?.();
      if (selection && range) {
        range.selectNodeContents(firstParagraph);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    this.arrangeController = new WriterArrangeController({
      body,
      page: this.canvas,
      adapter: this.adapter,
      ribbonHost: this.shell.ribbonHost,
      mountElement: this.mountElement
    }).attach();

    this.tableController = new WriterTableController({
      body,
      page: this.canvas,
      adapter: this.adapter,
      ribbonHost: this.shell.ribbonHost,
      mountElement: this.mountElement,
      shell: this.shell
    }).attach();
    this.adapter.tableController = this.tableController;

    this.viewController = new WriterViewController({
      container,
      viewport,
      page: this.canvas,
      ruler,
      verticalRuler,
      shell: this.shell
    }).attach();

    this.rulerController = new WriterRulerController({
      ruler,
      page: this.canvas,
      body,
      viewport,
      shell: this.shell
    }).attach();

    this.shell.onZoomChange = (percent) => {
      this.viewController.setZoom(percent / 100);
    };
    this._setupContentObserver();
    this._editableRoots = [header, body, footer];
    this._normalizers = this._editableRoots.map(root => new InputNormalizer({
      target: root,
      onWordCommit: () => this.adapter?.recordSnapshot?.("Gõ chữ")
    }).attach(root));
    this.autoCorrectController = new WriterAutoCorrectController({
      getSettings: () => this.autoCorrectPreferences.getSettings(),
      getReplacements: () => this.autoCorrectPreferences.getReplacements(),
      onCorrect: () => { if (this.adapter) this.adapter.isDirty = true; }
    }).attach(this._editableRoots);
    this._autoRecoverOptions = options;
    this._setupContextMenu(body);
    this._setupTextDragDrop(body);
    console.log("[WriterApp] Đã khởi tạo 3T Doc chuẩn hóa cao cấp.");
  }

  async _applyTemplate(templateId) {
    if (templateId !== "admin_doc" || !this._administrativeTemplateHtml || !this.adapter) return false;

    // Reuse Writer's existing new-document reset so an applied template never
    // retains the old file path, comments, document styles or undo history.
    await this.adapter.newDocument();
    const header = this.canvas?.querySelector?.(".vno-writer-header");
    const body = this.canvas?.querySelector?.(".vno-writer-body");
    const footer = this.canvas?.querySelector?.(".vno-writer-footer");
    if (!body) return false;

    if (header) header.innerHTML = this._administrativeTemplateHtml.header;
    body.innerHTML = this._administrativeTemplateHtml.body;
    if (footer) footer.innerHTML = this._administrativeTemplateHtml.footer;
    this.canvas?.classList?.remove?.("vno-doc-imported");

    this.adapter.sourceFileName = "Quyết định ban hành tiêu chuẩn 01";
    this.adapter.documentContent = this.canvas?.innerHTML || "";
    this.adapter.isDirty = false;
    this.adapter._openedEditorDomHash = this.adapter._editorDomFingerprint?.() || "";
    this.adapter.clearUndoRedo?.();
    this.shell?.resetDocumentChrome?.("Quyết định ban hành tiêu chuẩn 01.docx", "home", false);
    this.adapter._recomputeLivePagination?.();

    const firstBlock = body.querySelector?.("p, h1, table") || body;
    body.focus?.();
    const selection = typeof window !== "undefined" ? window.getSelection?.() : null;
    const range = typeof document !== "undefined" ? document.createRange?.() : null;
    if (selection && range && firstBlock) {
      range.selectNodeContents(firstBlock);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return true;
  }

  async initializeBackgroundServices() {
    const [helpPanel] = await Promise.all([
      this._ensureHelpPanel(),
      this._mountStyleGalleryRibbonStrip(),
      this._loadSpellcheck()
    ]);
    this._watchRibbonForStyleGalleryStrip();
    const { autoRecoverManager } = await import("../../platform/autorecover/auto-recover.js");
    this.autoRecoverManager = autoRecoverManager;
    await autoRecoverManager.register({
      appKind: "writer",
      adapter: this.adapter,
      shell: this.shell,
      helpPanel,
      serialize: () => this.adapter._contentForExport(),
      restore: (content, manifest) => this.adapter.restoreFromAutoRecover(content, manifest),
      options: this._autoRecoverOptions
    });
  }

  async showStartupRecovery() {
    const { autoRecoverManager } = await import("../../platform/autorecover/auto-recover.js");
    await autoRecoverManager.showStartupRecovery();
  }

  async _ensureHelpPanel() {
    if (this.helpPanel) return this.helpPanel;
    if (!this._helpPanelPromise) {
      this.shell?.setStatus?.("Đang tải Trợ giúp Doc…");
      this._helpPanelPromise = Promise.all([
        import("../../platform/help/index.js"),
        import("../../platform/help/entries-writer.js")
      ]).then(([{ HelpPanel }]) => {
        if (!this.helpPanel && this.workspace) {
          this.helpPanel = new HelpPanel({ app: "writer" });
          this.helpPanel.mount(this.workspace);
          this.shell?.setStatus?.("Sẵn sàng");
        }
        return this.helpPanel;
      }).catch((error) => {
        this._helpPanelPromise = null;
        this.shell?.setStatus?.("Không tải được Trợ giúp Doc.");
        throw error;
      });
    }
    return this._helpPanelPromise;
  }

  async _loadSpellcheck() {
    try {
      const [{ VietnameseSpellChecker }, { SpellcheckDomController }, { VIETNAMESE_DICTIONARY_WORDS }] = await Promise.all([
        import("../../platform/text/vi-spellchecker.js"),
        import("../../platform/text/spellcheck-dom-controller.js"),
        import("../../platform/text/dictionaries/vi-dictionary.js")
      ]);
      this._setupVietnameseSpellcheck(this._editableRoots, { VietnameseSpellChecker, SpellcheckDomController, VIETNAMESE_DICTIONARY_WORDS });
    } catch (error) {
      this.canvas.dataset.spellcheckStatus = "error";
      console.warn("[WriterApp] Không thể tải kiểm tra chính tả tiếng Việt:", error);
    }
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
    this.autoRecoverManager?.detach(this.adapter);
    this._lifecycleObserver?.disconnect();
    this._lifecycleObserver = null;
    this._styleGalleryObserver?.disconnect();
    this._styleGalleryObserver = null;
    this.viewController?.destroy();
    this.viewController = null;
    this.rulerController?.destroy();
    this.rulerController = null;
    this.arrangeController?.destroy();
    this.arrangeController = null;
    this.tableController?.destroy();
    this.tableController = null;
    this.spellcheckController?.destroy();
    this.spellcheckController = null;
    this._normalizers?.forEach(n => n.destroy());
    this._normalizers = [];
    this.autoCorrectController?.destroy();
    this.autoCorrectController = null;
    this._closeContextMenu();
    if (this._statusSelectionChangeHandler && typeof document !== "undefined") {
      document.removeEventListener?.("selectionchange", this._statusSelectionChangeHandler);
      this._statusSelectionChangeHandler = null;
    }
    this.canvas?.querySelector?.(".vno-writer-body")?.removeEventListener?.("contextmenu", this._contextMenuHandler);
    this.helpPanel?.destroy();
    this.helpPanel = null;
  }

  toggleSpellcheck() {
    if (!this.spellcheckController) return false;
    const next = !this.spellcheckController.enabled;
    this.spellcheckController.setEnabled(next);
    import("../../platform/text/spellcheck-dom-controller.js").then(({ setSpellcheckEnabled }) => {
      setSpellcheckEnabled(next);
    }).catch(() => {});
    globalCommandBus.updateState("writer.review.toggleSpellCheck", { checked: next });
    return next;
  }

  _setupVietnameseSpellcheck(editableRoots, { VietnameseSpellChecker, SpellcheckDomController, VIETNAMESE_DICTIONARY_WORDS }) {
    this.canvas.dataset.spellcheckStatus = "loading";
    try {
      const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
      this.spellcheckController = new SpellcheckDomController({
        roots: editableRoots,
        checker,
        debounceMs: 400,
        onReplace: () => {
          this.adapter?.recordSnapshot?.("Sửa chính tả");
        }
      }).attach();
      this.canvas.dataset.spellcheckStatus = "ready";
      globalCommandBus.updateState("writer.review.toggleSpellCheck", { checked: this.spellcheckController.enabled });
    } catch (error) {
      this.canvas.dataset.spellcheckStatus = "error";
      this.canvas.title = "Không thể tải bộ kiểm tra chính tả tiếng Việt.";
      console.warn("[WriterApp] Không thể khởi tạo kiểm tra chính tả tiếng Việt:", error);
    }
  }

  _mountStyleGalleryRibbonStrip() {
    if (!this._styleGalleryModulePromise) this._styleGalleryModulePromise = import("./style-gallery.js");
    return this._styleGalleryModulePromise.then(({ createStyleGalleryStrip }) => this._mountStyleGalleryStrip(createStyleGalleryStrip));
  }

  _mountStyleGalleryStrip(createStyleGalleryStrip) {
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
      const stats = this.adapter?.getWordCountStats?.({ preferSelection: false }) || {
        words: 0
      };
      // Số trang thật do WriterAdapter._recomputeLivePagination() đo và tính (dựa trên
      // chiều cao thật của nội dung, không phải chỉ đếm ngắt trang thủ công như trước).
      // Debounce 250ms nên ngay sau khi gõ có thể còn số cũ trong chốc lát — sự kiện
      // "vno-pagination-updated" bên dưới sẽ gọi lại updateStats() khi số mới sẵn sàng.
      const totalPages = Math.max(1, this.adapter?._livePageCount || 1);
      const currentPage = Math.max(1, Math.min(totalPages, this.adapter?.getCurrentPage?.() || 1));

      this.shell.setStatus(
        `Trang ${currentPage} / ${totalPages}  |  Tiếng Việt (NĐ 30/2020/NĐ-CP)`
      );
      this._renderWordCountStatus(stats);
    };

    // Đếm từ dùng innerText (ép bố cục đồng bộ, ~27 ms ở tài liệu 50 trang): gộp theo nhịp gõ thay vì chạy sau từng phím.
    let statsTimer = null;
    const updateStatsSoon = () => {
      if (statsTimer) clearTimeout(statsTimer);
      statsTimer = setTimeout(() => { statsTimer = null; updateStats(); }, 350);
    };
    this.canvas.addEventListener("input", (event) => {
      if (event.isTrusted && this.adapter && this.adapter._wordCountSourceText != null) {
        this.adapter._wordCountSourceTextInvalidated = true;
      }
      updateStatsSoon();
    });
    this.canvas.addEventListener("vno-pagination-updated", updateStats);
    this._statusSelectionChangeHandler = updateStatsSoon;
    if (typeof document !== "undefined") document.addEventListener?.("selectionchange", updateStatsSoon);
    updateStats();
  }

  _renderWordCountStatus(stats) {
    const left = this.mountElement?.querySelector?.(".vno-statusbar-left");
    if (!left) return;
    let chip = left.querySelector("#vno-status-wordcount");
    if (!chip) {
      chip = document.createElement("button");
      chip.type = "button";
      chip.id = "vno-status-wordcount";
      chip.className = "vno-status-wordcount";
      chip.addEventListener("click", () => globalCommandBus.execute("writer.review.wordCount"));
      const first = left.firstElementChild;
      if (first && first.nextSibling) {
        left.insertBefore(chip, first.nextSibling);
      } else {
        left.appendChild(chip);
      }
      const sep = document.createElement("span");
      sep.setAttribute("aria-hidden", "true");
      sep.textContent = "|";
      left.insertBefore(sep, chip.nextSibling);
    }
    const count = Number(stats?.words) || 0;
    const template = t("writerDialogs.wordCount.statusLabel", { count: String(count) });
    chip.textContent = template && template !== "writerDialogs.wordCount.statusLabel"
      ? template
      : `${count} từ`;
    chip.title = t("writerDialogs.wordCount.title") === "writerDialogs.wordCount.title"
      ? "Nhấp để xem thống kê đếm từ"
      : t("writerDialogs.wordCount.title");
    chip.setAttribute("aria-label", chip.textContent);
  }

  _setupContextMenu(body) {
    if (!body?.addEventListener) return;
    this._contextMenuHandler = (event) => {
      event.preventDefault();
      this._openEditorContextMenu(event);
    };
    body.addEventListener("contextmenu", this._contextMenuHandler);
    if (this.canvas) {
      const header = this.canvas.querySelector(".vno-writer-header");
      const footer = this.canvas.querySelector(".vno-writer-footer");
      header?.addEventListener?.("contextmenu", this._contextMenuHandler);
      footer?.addEventListener?.("contextmenu", this._contextMenuHandler);
    }
  }

  _setupTextDragDrop(body) {
    if (!body) return;

    let dragPending = null;

    body.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      const rects = range.getClientRects();
      let inside = false;
      for (const r of rects) {
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          inside = true;
          break;
        }
      }

      if (inside) {
        dragPending = {
          startX: e.clientX,
          startY: e.clientY,
          isCtrl: e.ctrlKey,
          range: range.cloneRange(),
          started: false
        };
      }
    });

    const onDocMouseMove = (e) => {
      if (!dragPending) return;
      if (!dragPending.started) {
        if (Math.hypot(e.clientX - dragPending.startX, e.clientY - dragPending.startY) > 4) {
          dragPending.started = true;
          document.body.style.cursor = (e.ctrlKey || dragPending.isCtrl) ? "copy" : "move";
        }
      }
      if (dragPending.started) {
        e.preventDefault();
      }
    };

    const onDocMouseUp = (e) => {
      if (!dragPending) return;
      if (dragPending.started) {
        const isCopy = e.ctrlKey || dragPending.isCtrl;
        let dropRange = null;

        if (document.caretRangeFromPoint) {
          dropRange = document.caretRangeFromPoint(e.clientX, e.clientY);
        }
        if (!dropRange && document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
          if (pos) {
            dropRange = document.createRange();
            dropRange.setStart(pos.offsetNode, pos.offset);
            dropRange.collapse(true);
          }
        }
        if (!dropRange) {
          const el = document.elementFromPoint(e.clientX, e.clientY);
          if (el && body.contains(el)) {
            dropRange = document.createRange();
            dropRange.selectNodeContents(el);
            dropRange.collapse(false);
          }
        }

        if (dropRange) {
          if (this.adapter) {
            this.adapter._lastSnapshot = this.adapter._createSnapshot("before.dragDrop");
          }

          const srcRange = dragPending.range;
          const contents = isCopy ? srcRange.cloneContents() : srcRange.extractContents();
          dropRange.insertNode(contents);

          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            const newSel = document.createRange();
            newSel.selectNode(contents);
            sel.addRange(newSel);
          }

          if (this.adapter) {
            this.adapter.isDirty = true;
            this.adapter.recordSnapshot(isCopy ? "writer.text.copyDrag" : "writer.text.moveDrag");
          }
          body.focus();
        }
        document.body.style.cursor = "";
      }
      dragPending = null;
    };

    document.addEventListener("mousemove", onDocMouseMove);
    document.addEventListener("mouseup", onDocMouseUp);
  }

  _openEditorContextMenu(event) {
    this._closeContextMenu();

    const target = event.target;
    const x = event.clientX;
    const y = event.clientY;

    const spellMarker = target?.closest?.("[data-vno-spelling-uncertain], .vno-spelling-uncertain, .vno-spellcheck-marker");
    const spellItems = [];
    if (spellMarker && this.spellcheckController?.checker) {
      const word = spellMarker.textContent;
      let contextPrev = "";
      const parentBlock = spellMarker.closest?.("p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,div");
      if (parentBlock) {
        const fullText = parentBlock.textContent || "";
        const markerIndex = fullText.indexOf(word);
        if (markerIndex > 0) {
          const textBefore = fullText.slice(0, markerIndex).trim();
          const match = textBefore.match(/[\p{L}\p{M}]+$/u);
          if (match) contextPrev = match[0];
        }
      }
      const suggestions = this.spellcheckController.checker.suggest(word, { contextPrev }) || [];
      for (const suggestion of suggestions) {
        spellItems.push({
          label: suggestion,
          className: "vno-spellcheck-suggestion",
          action: () => {
            this.spellcheckController.applySuggestion(spellMarker, suggestion);
          }
        });
      }
      if (spellItems.length) {
        spellItems.push({ sep: true });
      }
      spellItems.push({
        label: "Bỏ qua",
        action: () => {
          this.spellcheckController.checker.ignore(word);
          this.spellcheckController.refresh?.();
        }
      });
      spellItems.push({
        label: "Thêm vào từ điển",
        className: "vno-spellcheck-add",
        action: () => {
          this.spellcheckController.checker.addToPersonalDictionary(word);
          this.spellcheckController.refresh?.();
        }
      });
      spellItems.push({ sep: true });
    }

    const li = target?.closest?.("li");
    const ol = target?.closest?.("ol");
    const listTarget = li || ol;
    const listContextItems = [];
    if (listTarget) {
      listContextItems.push({
        label: "Đánh số lại từ 1",
        command: "writer.list.restartNumbering",
        args: listTarget,
        action: () => globalCommandBus.execute("writer.list.restartNumbering", listTarget)
      });
      listContextItems.push({
        label: "Tiếp tục đánh số",
        command: "writer.list.continueNumbering",
        args: listTarget,
        action: () => globalCommandBus.execute("writer.list.continueNumbering", listTarget)
      });
      listContextItems.push({ sep: true });
    }

    const baseItems = [
      { label: "Cắt", shortcut: "Ctrl+X", command: "common.edit.cut" },
      { label: "Sao chép", shortcut: "Ctrl+C", command: "common.edit.copy" },
      { label: "Dán", shortcut: "Ctrl+V", command: "common.edit.paste" },
      { label: "Dán chỉ giữ chữ", shortcut: "Ctrl+Shift+V", command: "common.edit.pastePlain" },
      { label: "Dán đặc biệt...", command: "writer.edit.pasteSpecial" },
      { sep: true },
      { label: "Phông chữ", shortcut: "Ctrl+Shift+F", command: "writer.font.family" },
      { label: "Đoạn văn...", command: "writer.format.paragraphDialog" },
      {
        label: "Danh sách",
        items: [
          { label: "Gạch đầu dòng", command: "writer.list.bullet" },
          { label: "Đánh số", command: "writer.list.numbered" },
          { sep: true },
          { label: "1. / 1.1. / 1.1.1.", command: "writer.para.multilevelList", args: "decimal" },
          { label: "1. / a. / i.", command: "writer.para.multilevelList", args: "letter" },
          { label: "Điều 1. / 1. / a)", command: "writer.para.multilevelList", args: "nd30" },
          { sep: true },
          { label: "Đánh số lại từ 1", command: "writer.list.restartNumbering", args: listTarget },
          { label: "Tiếp tục đánh số", command: "writer.list.continueNumbering", args: listTarget }
        ]
      },
      {
        label: "Chèn",
        items: [
          { label: "Bảng...", command: "writer.table.insert" },
          { label: "Hình ảnh...", command: "writer.image.insert" },
          { label: "Liên kết...", command: "common.edit.hyperlink" },
          { label: "Ký hiệu...", command: "writer.insert.symbol" }
        ]
      },
      { sep: true },
      {
        label: "Tìm kiếm / Thay thế",
        items: [
          { label: "Tìm kiếm...", shortcut: "Ctrl+F", command: "common.edit.find" },
          { label: "Thay thế...", shortcut: "Ctrl+H", command: "common.edit.replace" }
        ]
      }
    ];

    const allItems = [...spellItems, ...listContextItems, ...baseItems];
    const className = [
      "vno-writer-context-menu",
      listTarget ? "vno-list-context-menu" : ""
    ].filter(Boolean).join(" ");

    this._activeContextMenu = showContextMenu({
      x,
      y,
      items: allItems,
      className,
      ariaLabel: "Menu ngữ cảnh văn bản",
      previousFocus: target
    });
  }

  _closeContextMenu() {
    if (this._activeContextMenu) {
      this._activeContextMenu.closeAll?.();
      this._activeContextMenu = null;
    } else {
      closeActiveContextMenu();
    }
  }

}

export function getWriterContextHelpEntryId(activeElement) {
  const commandId = activeElement?.closest?.("[data-command-id]")?.dataset?.commandId;
  const entry = commandId ? getHelpEntryById(commandId) : null;
  return entry?.app === "writer" ? entry.id : null;
}
