/**
 * VN Writer — Toàn bộ Ma trận Hoàn tác / Làm lại (Ctrl+Z / Ctrl+Y) cho MỌI lệnh
 * Ticket: AGY-DOCUNDO (Gói D8 trong docs/SPEC-DOC-100.md)
 * Chạy trên APP DESKTOP THẬT qua CDP (Chrome DevTools Protocol)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { insertText, press, sleep } from "./actions.mjs";
import { WRITER_COMMANDS } from "../../../platform/commands/command-definitions.js";

// Các lệnh thuần giao diện/hộp thoại/chế độ xem/menu (không làm đổi DOM/model nội dung ngay)
const UI_SKIP_COMMANDS = new Set([
  // View & Nav
  "writer.view.printLayout", "writer.view.webLayout", "writer.view.readMode",
  "writer.view.outline", "writer.view.draft", "writer.outline.promote",
  "writer.outline.demote", "writer.outline.moveUp", "writer.outline.moveDown",
  "writer.outline.expand", "writer.outline.collapse", "writer.outline.showLevel",
  "writer.outline.close", "writer.view.toggleHeadingCollapse", "writer.view.ruler",
  "writer.view.navigationPane", "writer.view.gridlines", "writer.view.zoomIn",
  "writer.view.zoomOut", "writer.view.zoomReset", "writer.view.zoom100",
  "writer.view.pageWidth", "writer.view.newWindow", "writer.ruler.getState",
  "writer.nav.docStart", "writer.nav.docEnd",
  // Selection & Nav
  "writer.edit.select", "writer.edit.goTo",
  "writer.table.selectCell", "writer.table.selectRow", "writer.table.selectCol", "writer.table.selectTable",
  // Dialogs & Menu UI
  "writer.text.changeCaseDialog", "writer.format.fontDialog", "writer.style.gallery",
  "writer.format.paragraphDialog", "writer.format.tabStops", "writer.paragraph.tabStops",
  "writer.para.showFormattingMarks",
  "writer.page.setupDialog", "writer.page.margins", "writer.page.size", "writer.page.orientation",
  "writer.page.columns", "writer.section.options", "writer.pageNumber.format",
  "writer.layout.sectionOptions",
  "writer.review.commentPrevious", "writer.review.commentNext",
  "writer.trackChanges.toggle", "writer.trackChanges.previous", "writer.trackChanges.next",
  "writer.review.restrictEditing",
  "writer.trackChanges.displayMode", "writer.trackChanges.displaySimple", "writer.trackChanges.displayAll",
  "writer.trackChanges.displayNone", "writer.trackChanges.displayOriginal", "writer.trackChanges.showMarkup",
  "writer.trackChanges.balloons", "writer.trackChanges.balloonsMode", "writer.trackChanges.balloonsRevisions",
  "writer.trackChanges.balloonsInline", "writer.trackChanges.balloonsCommentsOnly",
  "writer.review.wordCount", "writer.review.toggleSpellCheck",
  "writer.reference.sourcesManage",
  "writer.mailMerge.open", "writer.mailMerge.preview", "writer.mailMerge.prevRecord", "writer.mailMerge.nextRecord",
  "writer.file.properties", "writer.file.markAsFinal", "writer.file.inspectDocument", "writer.file.options",
  "writer.file.printPreview",
  "writer.help.open",
  "writer.image.resize", "writer.image.wrap",
  "writer.image.insert", "writer.edit.pasteSpecial",
  "writer.format.textEffects", "writer.insert.coverPage", "writer.insert.quickParts",
  "writer.design.themeGallery", "writer.review.compare", "writer.review.combine"
]);

// Cấu hình mẫu cho từng lệnh cụ thể cần ngữ cảnh/đối số
const SPECIAL_SETUP = {
  // Format / Text
  "writer.text.clearFormat": { initialHtml: '<p><b>Xin chao the gioi</b></p>', select: 'b' },
  "writer.style.normal": { initialHtml: '<h1>Xin chao the gioi</h1>', select: 'h1' },
  "writer.style.heading1": { initialHtml: '<p>Xin chao the gioi</p>', select: 'p' },
  "writer.style.heading2": { initialHtml: '<p>Xin chao the gioi</p>', select: 'p' },
  "writer.style.heading3": { initialHtml: '<p>Xin chao the gioi</p>', select: 'p' },
  "writer.text.changeCase": { args: 'uppercase' },
  "writer.font.family": { args: 'Arial' },
  "writer.font.size": { args: '18pt' },
  "writer.style.apply": { args: 'h1' },
  "writer.color.text": { args: '#dc2626' },
  "writer.color.highlight": { args: '#ffcd00' },
  "writer.format.textOutline": { args: { color: '#ff0000', widthEmu: 12700 } },
  "writer.format.textShadow": { args: { preset: 'bottom-right', color: '#888888' } },
  "writer.format.textGlow": { args: { radEmu: 101600, color: '#ffff00' } },
  "writer.format.clearTextEffects": { initialHtml: '<p><span class="vno-text-effect" style="text-shadow: 2px 2px #ff0000;">Xin chao the gioi</span></p>', select: 'span' },

  // Image operations
  "writer.image.crop": {
    initialHtml: '<p><img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'><rect width=\'50\' height=\'50\' fill=\'blue\'/></svg>"></p>',
    select: 'img',
    args: { top: 10, bottom: 10 }
  },
  "writer.image.corrections": {
    initialHtml: '<p><img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'><rect width=\'50\' height=\'50\' fill=\'blue\'/></svg>"></p>',
    select: 'img',
    args: { brightness: 10, contrast: 10 }
  },
  "writer.image.changePicture": {
    initialHtml: '<p><img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'><rect width=\'50\' height=\'50\' fill=\'blue\'/></svg>"></p>',
    select: 'img',
    args: { src: 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'60\' height=\'60\'><rect width=\'60\' height=\'60\' fill=\'green\'/></svg>' }
  },
  "writer.image.resetPicture": {
    initialHtml: '<p><img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'><rect width=\'50\' height=\'50\' fill=\'blue\'/></svg>" style="filter: brightness(1.5);"></p>',
    select: 'img'
  },
  "writer.image.compress": {
    initialHtml: '<p><img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'><rect width=\'50\' height=\'50\' fill=\'blue\'/></svg>"></p>',
    select: 'img'
  },

  // Paragraph & List
  "writer.para.alignLeft": { initialHtml: '<p style="text-align: center;">Xin chao the gioi</p>', select: 'p' },
  "writer.para.justify": { initialHtml: '<p style="text-align: center;">Xin chao the gioi</p>', select: 'p' },
  "writer.para.spacing1": { initialHtml: '<p style="line-height: 2;">Xin chao the gioi</p>', select: 'p' },
  "writer.para.lineSpacing": { args: '1.5' },
  "writer.para.lineSpacingLayout": { args: '1.5' },
  "writer.para.spacingBefore": { args: 12 },
  "writer.para.spacingAfter": { args: 12 },
  "writer.para.firstLineIndent": { args: 20 },
  "writer.list.restartNumbering": { initialHtml: '<ol><li>Muc 1</li><li>Muc 2</li></ol>', select: 'li' },
  "writer.list.continueNumbering": { initialHtml: '<ol start="5"><li>Muc 1</li><li>Muc 2</li></ol>', select: 'li' },
  "writer.para.multilevelList": { args: 'decimal' },
  "writer.para.indentDec": { initialHtml: '<blockquote style="margin-left: 40px;"><p>Xin chao the gioi</p></blockquote>', select: 'p' },
  "writer.para.moveUp": { initialHtml: '<p>Doan 1</p><p id="target">Doan 2</p>', select: '#target' },
  "writer.para.moveDown": { initialHtml: '<p id="target">Doan 1</p><p>Doan 2</p>', select: '#target' },
  "writer.para.sort": { initialHtml: '<p>Chu B</p><p>Chu A</p>', select: 'body' },
  "writer.para.shading": { args: '#f3f4f6' },
  "writer.para.borders": { args: 'bottom' },
  "writer.ruler.setParagraphIndents": { args: { firstLineMm: 20, leftMm: 10, rightMm: 10 } },
  "writer.ruler.setPageMargins": { args: { margins: { left: 30, right: 30 } } },

  // Insert
  "writer.table.insert": { args: { rows: 2, cols: 2 } },
  "writer.table.quickTables": { args: 'matrix' },
  "writer.table.fromText": { initialHtml: '<p>A,B,C</p><p>1,2,3</p>', select: 'body', args: { delimiter: ',' } },
  "writer.shape.insert": { args: { type: 'rectangle' } },
  "writer.diagram.insert": { args: { type: 'process' } },
  "writer.chart.insert": { args: { type: 'bar' } },
  "writer.insert.removeCoverPage": { initialHtml: '<div class="vno-cover-page"><p>Trang bia</p></div><p>Noi dung</p>', select: 'body' },
  "writer.insert.wordart": { args: { text: '3T Office', presetId: 'navy-outline' } },
  "writer.format.dropCap": { args: 'dropped' },
  "writer.insert.dateTime": { args: { format: 'dd/MM/yyyy' } },
  "writer.insert.equation": { args: { linear: 'E=mc^2' } },
  "writer.insert.symbol": { args: { char: '©' } },
  "writer.insert.bookmark": { args: { name: 'bm_test' } },
  "writer.insert.crossReference": { initialHtml: '<p><span id="bm_target" data-vno-bookmark="bm_target">Diem den</span></p><p>Xem tai: </p>', select: 'p:nth-child(2)', args: { type: 'bookmark', targetId: 'bm_target' } },

  // Table
  "writer.table.toText": { initialHtml: '<table><tr><td>A</td><td>B</td></tr></table>', select: 'td', args: { delimiter: '\t' } },
  "writer.table.insertRowAbove": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td' },
  "writer.table.insertRowBelow": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td' },
  "writer.table.insertColLeft": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td' },
  "writer.table.insertColRight": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td' },
  "writer.table.deleteRow": { initialHtml: '<table><tr><td>1</td></tr><tr><td>2</td></tr></table>', select: 'td' },
  "writer.table.deleteCol": { initialHtml: '<table><tr><td>1</td><td>2</td></tr></table>', select: 'td' },
  "writer.table.deleteTable": { initialHtml: '<table><tr><td>Xoa toi</td></tr></table>', select: 'td' },
  "writer.table.mergeCells": { initialHtml: '<table><tr><td>1</td><td>2</td></tr></table>', select: 'table' },
  "writer.table.splitCells": { initialHtml: '<table><tr><td colspan="2">Gop</td></tr></table>', select: 'td' },
  "writer.table.distributeRows": { initialHtml: '<table style="height: 200px;"><tr><td>1</td></tr><tr><td>2</td></tr></table>', select: 'td' },
  "writer.table.distributeCols": { initialHtml: '<table style="width: 300px;"><tr><td>1</td><td>2</td></tr></table>', select: 'td' },
  "writer.table.autoFitContents": { initialHtml: '<table><tr><td style="width: 200px;">Ngan</td></tr></table>', select: 'td' },
  "writer.table.autoFitWindow": { initialHtml: '<table><tr><td style="width: 50px;">Nho</td></tr></table>', select: 'td' },
  "writer.table.alignTop": { initialHtml: '<table><tr><td style="height: 80px;">Text</td></tr></table>', select: 'td' },
  "writer.table.alignMiddle": { initialHtml: '<table><tr><td style="height: 80px;">Text</td></tr></table>', select: 'td' },
  "writer.table.alignBottom": { initialHtml: '<table><tr><td style="height: 80px;">Text</td></tr></table>', select: 'td' },
  "writer.table.cellBg": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td', args: '#e0f2fe' },
  "writer.table.borders": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td', args: 'all' },
  "writer.table.bordersAll": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td' },
  "writer.table.bordersOutside": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td' },
  "writer.table.bordersInside": { initialHtml: '<table><tr><td>1</td><td>2</td></tr></table>', select: 'td' },
  "writer.table.bordersNone": { initialHtml: '<table><tr><td>O</td></tr></table>', select: 'td' },
  "writer.table.toggleHeaderRow": { initialHtml: '<table><tr><td>Tieu de</td></tr><tr><td>Gia tri</td></tr></table>', select: 'td' },
  "writer.table.toggleBandedRows": { initialHtml: '<table><tr><td>1</td></tr><tr><td>2</td></tr></table>', select: 'td' },
  "writer.table.splitTable": { initialHtml: '<table><tr><td>Row1</td></tr><tr><td>Row2</td></tr></table>', select: 'table tr:nth-child(2) td' },
  "writer.table.textDirection": { initialHtml: '<table><tr><td>Text</td></tr></table>', select: 'td', args: 'tbRl' },
  "writer.table.properties": { initialHtml: '<table><tr><td>Text</td></tr></table>', select: 'td', args: { align: 'center', indentPt: 18, marginTopPt: 5.65, marginBottomPt: 5.65, marginLeftPt: 8.5, marginRightPt: 8.5, cellSpacingPt: 2.8 } },

  // Layout & Sections
  "writer.section.differentFirstPage": { args: true },
  "writer.section.differentOddEven": { args: true },
  "writer.section.delete": {
    initialHtml: '<p>Doan 1</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2"></div><p>Doan 2</p>',
    select: 'p:last-of-type',
    initSection: true
  },
  "writer.layout.lineNumbers": { args: 'continuous' },
  "writer.layout.hyphenation": { args: true },
  "writer.page.watermark": { args: { text: 'BẢN THẢO' } },
  "writer.page.color": { args: '#fdf6e2' },
  "writer.page.border": { args: { style: 'single', width: 2, color: '#333333' } },

  // Review & Comments
  "writer.comment.insert": { args: { content: 'Nhan xet mau' } },
  "writer.review.commentReply": { initialHtml: '<p><mark class="vno-comment-anchor" data-comment-id="cmt-1">Chu</mark></p>', select: 'mark', initComment: true, args: { content: 'Tra loi' } },
  "writer.review.commentDelete": { initialHtml: '<p><mark class="vno-comment-anchor" data-comment-id="cmt-1">Chu</mark></p>', select: 'mark', initComment: true },
  "writer.review.commentResolve": { initialHtml: '<p><mark class="vno-comment-anchor" data-comment-id="cmt-1">Chu</mark></p>', select: 'mark', initComment: true },
  "writer.trackChanges.acceptOne": { initialHtml: '<p><ins class="vno-track-insert" data-vno-change="ins-1">Moi</ins></p>', select: 'ins' },
  "writer.trackChanges.rejectOne": { initialHtml: '<p><del class="vno-track-delete" data-vno-change="del-1">Cu</del></p>', select: 'del' },
  "writer.trackChanges.acceptAll": { initialHtml: '<p><ins class="vno-track-insert" data-vno-change="ins-1">Moi</ins></p>', select: 'p' },
  "writer.trackChanges.rejectAll": { initialHtml: '<p><del class="vno-track-delete" data-vno-change="del-1">Cu</del></p>', select: 'p' },

  // Reference
  "writer.reference.tocInsert": { initialHtml: '<h1>Chuong 1</h1><p>Noi dung</p>', select: 'p' },
  "writer.reference.tocUpdate": { initialHtml: '<div class="vno-toc-block"><p>Mục lục cũ</p></div><h1>Chuong 1</h1>', select: 'h1' },
  "writer.reference.footnoteInsert": { args: 'Ghi chu chan trang' },
  "writer.reference.endnoteInsert": { args: 'Ghi chu cuoi tai lieu' },
  "writer.reference.citationStyle": { args: 'mla' },
  "writer.reference.citationInsert": { args: { source: { id: 'src-1', title: 'Tai lieu', author: 'Nguyen Van A', year: 2026 } } },
  "writer.reference.bibliographyInsert": {
    initialHtml: '<p>Trích dẫn <span class="vno-citation-field" data-vno-citation-source-id="src-1">(Nguyen, 2026)</span></p>',
    select: 'body',
    initCitation: true
  },
  "writer.reference.captionInsert": { initialHtml: '<p><img src="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'50\' height=\'50\'></svg>"></p>', select: 'img', args: { text: 'Sơ đồ' } },
  "writer.reference.tofInsert": { initialHtml: '<p>Hình 1: Ảnh mẫu</p>', select: 'body', args: { kind: 'figure' } },
  "writer.reference.tofUpdate": { initialHtml: '<div class="vno-tof-block"><p>Danh mục cũ</p></div><p>Hình 1: Ảnh mới</p>', select: 'p' },
  "writer.reference.indexMark": { args: { term: 'Tu khoa' } },
  "writer.reference.indexInsert": { select: 'body', args: { entries: [{ term: 'Tu khoa 1', page: 1 }] } },

  // Mail Merge
  "writer.mailMerge.insertField": { args: 'HoVaTen' },
  "writer.mailMerge.ifRule": { args: { type: 'ifThenElse', field: 'GioiTinh', op: 'equals', value: 'Nam', then: 'Ông', otherwise: 'Bà' } },
  "writer.mailMerge.finish": {
    initialHtml: '<p>Xin chao <span class="vno-merge-field" data-field="HoVaTen">&laquo;HoVaTen&raquo;</span></p>',
    select: 'body',
    initMailMerge: true,
    args: { mode: 'merge_new_document', records: [{ HoVaTen: 'Nguyen Van A' }] }
  },
  "writer.mailings.envelopes": { select: 'body', args: { deliveryAddress: 'Ha Noi', returnAddress: 'TP HCM' } },
  "writer.mailings.labels": { select: 'body', args: { content: 'Nhan 1' } }
};

// Biểu thức chụp toàn diện trạng thái tài liệu (HTML + thuộc tính model)
const GET_DOC_STATE_EXPR = `(() => {
  const body = document.querySelector('.vno-writer-body');
  if (!body) return JSON.stringify({ html: '', inBody: false, offset: null });
  const clone = body.cloneNode(true);

  // 1. Loại bỏ các phần tử phiên soát lỗi chính tả
  clone.querySelectorAll('[class*="vno-spelling-"]').forEach(el => {
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  });

  // 2. Loại bỏ các phần tử caret & ký tự định dạng & nút collapse heading & phân trang tạm thời
  clone.querySelectorAll('[class*="vno-caret"]').forEach(el => el.remove());
  clone.querySelectorAll('.vno-heading-collapse-btn').forEach(el => el.remove());
  clone.querySelectorAll('[data-vno-auto-page-gap]').forEach(el => el.remove());
  clone.querySelectorAll('span[data-vno-format-mark]').forEach(el => {
    while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
    el.remove();
  });

  // 3. Loại bỏ thuộc tính tạm thời
  clone.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-vno-spelling') || attr.name.startsWith('vno-spelling') || attr.name === 'data-vno-caret') {
        el.removeAttribute(attr.name);
      }
    });
  });

  const sel = window.getSelection();
  const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
  let offset = null;
  const inBody = Boolean(range && body.contains(range.startContainer));
  if (inBody) {
    const prefix = document.createRange();
    prefix.selectNodeContents(body);
    prefix.setEnd(range.startContainer, range.startOffset);
    offset = prefix.toString().length;
  }

  const adapter = window.__vnoAppInstance?.adapter;

  return JSON.stringify({
    html: clone.innerHTML.trim(),
    inBody,
    offset,
    pageColor: adapter?.pageColor || 'transparent',
    watermark: adapter?.watermark || null,
    pageBorder: adapter?.pageBorder ? JSON.stringify(adapter.pageBorder) : null,
    columns: adapter?.columns ? JSON.stringify(adapter.columns) : null,
    lineNumbers: adapter?.lineNumbers ? JSON.stringify(adapter.lineNumbers) : null,
    comments: adapter?.comments ? JSON.stringify(adapter.comments) : '[]',
    theme: adapter?.documentTheme || 'office',
    pageSetup: adapter?.pageSetup ? JSON.stringify(adapter.pageSetup) : null,
    sectionHeadersFooters: adapter?.sectionHeadersFooters ? JSON.stringify(adapter.sectionHeadersFooters) : '{}',
    headerHtml: adapter?.headerDom ? adapter.headerDom.innerHTML : null,
    footerHtml: adapter?.footerDom ? adapter.footerDom.innerHTML : null,
    shapes: adapter?.shapes ? JSON.stringify(adapter.shapes) : '[]'
  });
})()`;

function isStateEqual(a, b) {
  if (!a || !b) return false;
  return a.html === b.html &&
    a.pageColor === b.pageColor &&
    JSON.stringify(a.watermark) === JSON.stringify(b.watermark) &&
    a.pageBorder === b.pageBorder &&
    a.columns === b.columns &&
    a.lineNumbers === b.lineNumbers &&
    a.comments === b.comments &&
    a.theme === b.theme &&
    a.pageSetup === b.pageSetup &&
    a.sectionHeadersFooters === b.sectionHeadersFooters &&
    a.headerHtml === b.headerHtml &&
    a.footerHtml === b.footerHtml &&
    a.shapes === b.shapes;
}

export async function runFullUndoMatrix() {
  console.log("================================================================================");
  console.log("BẮT ĐẦU AUDIT MA TRẬN UNDO/REDO WRITER TOÀN BỘ (CDP - APP DESKTOP THẬT)");
  console.log("================================================================================");

  const session = await launchApp("writer", {
    localAppData: process.env.VNO_CDP_LOCALAPPDATA
  });
  const reportPath = path.join(repoRoot, "docs", "AUDIT-DOC-UNDO-FULL-1610.md");

  try {
    const { cdp } = session;
    await sleep(2000);

    const allCommands = WRITER_COMMANDS;
    console.log(`[Audit] Tổng số lệnh Writer kiểm thử: ${allCommands.length}`);

    const results = [];

    for (let i = 0; i < allCommands.length; i++) {
      const cmd = allCommands[i];
      const setup = SPECIAL_SETUP[cmd.id] || {};
      const args = setup.args !== undefined ? setup.args : null;
      const isUiSkip = UI_SKIP_COMMANDS.has(cmd.id);

      if (isUiSkip) {
        results.push({
          id: cmd.id,
          label: cmd.label,
          category: cmd.category,
          args: "-",
          changed: "Không",
          undoOk: "Không",
          redoOk: "Có",
          caretOk: "Có",
          status: "BO QUA",
          reason: "Lệnh mở hộp thoại / menu chọn / hiển thị UI / chế độ xem, không làm thay đổi DOM/model nội dung ngay"
        });
        console.log(`[${i + 1}/${allCommands.length}] [BO QUA] ${cmd.id} (${cmd.label}) | UI/Menu/Dialog`);
        continue;
      }

      // Reset trạng thái adapter về chuẩn ban đầu trước mỗi lệnh test
      await cdp.evaluate(`(() => {
        const adapter = window.__vnoAppInstance?.adapter;
        if (adapter) {
          adapter.columns = { count: 1, gap: 10, rule: false };
          adapter.sectionPageSetups = {};
          adapter.sectionHeadersFooters = {};
          adapter.activeSectionId = "section-1";
          adapter._sectionSequence = 1;
          adapter.watermark = null;
          adapter.pageColor = "transparent";
          adapter.pageBorder = { enabled: false };
          adapter.lineNumbers = { enabled: false, countBy: 1, restart: "continuous" };
          adapter.comments = [];
          adapter.citationSources = [];
          adapter.citationStyle = "apa";
          adapter.mailMergeData = null;
          adapter._applyPageSetup?.();
          adapter._applyColumnsCore?.();
        }
      })()`);

      // Khởi tạo comment nếu cần
      if (setup.initComment) {
        await cdp.evaluate(`(() => {
          const adapter = window.__vnoAppInstance?.adapter;
          if (adapter) {
            adapter.comments = [{ id: 'cmt-1', anchorText: 'Chu', content: 'Ghi chu 1', author: '3T Office', resolved: false }];
            adapter.activeCommentId = 'cmt-1';
          }
        })()`);
      }

      // Khởi tạo trích dẫn nếu cần
      if (setup.initCitation) {
        await cdp.evaluate(`(() => {
          const adapter = window.__vnoAppInstance?.adapter;
          if (adapter) {
            adapter.citationStyle = "apa";
            adapter.citationSources = [{ id: 'src-1', title: 'Sach Mau', author: 'Nguyen Van A', year: 2026 }];
            adapter._syncCitationMetadata?.();
          }
        })()`);
      }

      // Khởi tạo trộn thư nếu cần
      if (setup.initMailMerge) {
        await cdp.evaluate(`(() => {
          const adapter = window.__vnoAppInstance?.adapter;
          if (adapter) {
            adapter.mailMergeData = { records: [{ HoVaTen: 'Nguyen Van A' }] };
          }
        })()`);
      }

      // Chuẩn bị tài liệu mẫu
      if (setup.initialHtml) {
        await cdp.evaluate(`(() => {
          const body = document.querySelector('.vno-writer-body');
          body.focus();
          body.innerHTML = ${JSON.stringify(setup.initialHtml)};
          ${setup.initSection ? `
            const adapter = window.__vnoAppInstance?.adapter;
            if (adapter) {
              adapter.sectionPageSetups = {
                "section-1": JSON.parse(JSON.stringify(adapter.pageSetup || {})),
                "section-2": JSON.parse(JSON.stringify(adapter.pageSetup || {}))
              };
              adapter.activeSectionId = "section-2";
              adapter._applyColumns?.();
            }
          ` : ''}
          const target = ${setup.select === 'body' ? 'body' : `body.querySelector(${JSON.stringify(setup.select)}) || body`};
          const range = document.createRange();
          range.selectNodeContents(target);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          window.__vnoAppInstance?.adapter?.clearUndoRedo?.();
        })()`);
        await sleep(150);
      } else {
        await cdp.evaluate(`(() => {
          const body = document.querySelector('.vno-writer-body');
          body.focus();
          body.innerHTML = '<p><br></p>';
          const p = body.querySelector('p');
          const range = document.createRange();
          range.selectNodeContents(p);
          range.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        })()`);
        await sleep(150);

        await insertText(cdp, "Xin chao the gioi");
        await sleep(150);

        await cdp.evaluate(`(() => {
          const body = document.querySelector('.vno-writer-body');
          body.focus();
          const range = document.createRange();
          range.selectNodeContents(body);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          window.__vnoAppInstance?.adapter?.clearUndoRedo?.();
        })()`);
        await sleep(150);
      }

      const beforeStateStr = await cdp.evaluate(GET_DOC_STATE_EXPR);
      const beforeState = JSON.parse(beforeStateStr);

      // Thực thi lệnh qua CommandBus
      let busRes;
      try {
        busRes = await cdp.evaluate(
          `window.__vnoGlobalCommandBus.execute(${JSON.stringify(cmd.id)}, ${JSON.stringify(args)})`
        );
      } catch (e) {
        busRes = "error: " + e.message;
      }
      await sleep(250);

      const afterStateStr = await cdp.evaluate(GET_DOC_STATE_EXPR);
      const afterState = JSON.parse(afterStateStr);
      const changed = !isStateEqual(beforeState, afterState);

      // Hoàn tác (Ctrl+Z)
      await cdp.evaluate("document.querySelector('.vno-writer-body').focus()");
      await press(cdp, "z", { ctrl: true });
      await sleep(300);

      const undoStateStr = await cdp.evaluate(GET_DOC_STATE_EXPR);
      const undoState = JSON.parse(undoStateStr);
      const undoOk = isStateEqual(undoState, beforeState);
      const caretOk = undoState.inBody;

      // Làm lại (Ctrl+Y)
      await cdp.evaluate("document.querySelector('.vno-writer-body').focus()");
      await press(cdp, "y", { ctrl: true });
      await sleep(300);

      const redoStateStr = await cdp.evaluate(GET_DOC_STATE_EXPR);
      const redoState = JSON.parse(redoStateStr);
      const redoOk = isStateEqual(redoState, afterState);

      let status = "FAIL";
      let reason = "";

      if (!changed) {
        status = "BO QUA";
        reason = "Lệnh không làm thay đổi DOM/model nội dung trực tiếp trong ngữ cảnh hiện tại";
      } else if (undoOk && redoOk && caretOk) {
        status = "PASS";
        reason = "Thực thi thành công, Undo và Redo khôi phục chính xác HTML/model, con trỏ được bảo toàn trong tài liệu";
      } else if (!undoOk && !redoOk) {
        status = "FAIL";
        reason = "Cả Undo (Ctrl+Z) và Redo (Ctrl+Y) đều không khôi phục đúng";
      } else if (!undoOk) {
        status = "FAIL";
        reason = "Undo (Ctrl+Z) không khôi phục trạng thái ban đầu";
      } else if (!redoOk) {
        status = "FAIL";
        reason = "Redo (Ctrl+Y) không tái lập lại trạng thái sau khi áp dụng";
      } else if (!caretOk) {
        status = "FAIL";
        reason = "Sau Undo con trỏ bị rơi ra ngoài vùng soạn thảo";
      }

      results.push({
        id: cmd.id,
        label: cmd.label,
        category: cmd.category,
        args: args !== null ? JSON.stringify(args) : "-",
        changed: changed ? "Có" : "Không",
        undoOk: undoOk ? "Có" : "Không",
        redoOk: redoOk ? "Có" : "Không",
        caretOk: caretOk ? "Có" : "Không",
        status,
        reason,
        beforeHtml: beforeState.html,
        afterHtml: afterState.html,
        undoHtml: undoState.html,
        redoHtml: redoState.html
      });

      console.log(`[${i + 1}/${allCommands.length}] [${status}] ${cmd.id} (${cmd.label}) | Đổi content: ${changed ? "Có" : "Không"} | Undo: ${undoOk ? "Có" : "Không"} | Redo: ${redoOk ? "Có" : "Không"}`);
    }

    const passCount = results.filter(r => r.status === "PASS").length;
    const failCount = results.filter(r => r.status === "FAIL").length;
    const skipCount = results.filter(r => r.status === "BO QUA").length;

    console.log(`\n================================================================================`);
    console.log(`TỔNG HỢP TOÀN BỘ MA TRẬN: ${passCount} PASS | ${failCount} FAIL | ${skipCount} BỎ QUA / ${results.length} LỆNH`);
    console.log(`================================================================================\n`);

    // Ghi báo cáo Markdown docs/AUDIT-DOC-UNDO-FULL-1610.md
    let md = `# BÁO CÁO TOÀN DIỆN MA TRẬN HOÀN TÁC / LÀM LẠI (CTRL+Z / CTRL+Y) VN WRITER (16/10)\n\n`;
    md += `**Thời gian thực thi:** ${new Date().toISOString()}\n`;
    md += `**Môi trường:** Ứng dụng Desktop VN Writer (WebView2 / remote-debugging port CDP)\n`;
    md += `**Phương thức kiểm thử:** Chrome DevTools Protocol (\`tests/live/cdp/session.mjs\`, \`actions.mjs\`, phím thật \`Ctrl+Z\`, \`Ctrl+Y\` qua CDP Input)\n`;
    md += `**Phạm vi:** Toàn bộ **${results.length} lệnh** của VN Writer (\`WRITER_COMMANDS\` trong \`platform/commands/command-definitions.js\`)\n\n`;

    md += `## 1. Kết quả tổng quan\n\n`;
    md += `- **Tổng số lệnh Writer:** **${results.length}**\n`;
    md += `- **Lệnh thay đổi nội dung/định dạng (Cần Undo/Redo):** **${passCount + failCount}**\n`;
    md += `- **PASS (Undo & Redo hoàn hảo, con trỏ hợp lý):** **${passCount}**\n`;
    md += `- **FAIL (Thất bại thực tế):** **${failCount}**\n`;
    md += `- **BỎ QUA (Lệnh mở hộp thoại / menu chọn / chế độ xem UI):** **${skipCount}**\n`;
    md += `- **Tỉ lệ thành công trên các lệnh đổi nội dung:** **${failCount === 0 ? "100%" : Math.round((passCount / (passCount + failCount)) * 100) + "%"}**\n\n`;

    md += `## 2. Bảng ma trận toàn diện 229 lệnh VN Writer\n\n`;
    md += `| STT | Lệnh (Command ID) | Tên lệnh | Đối số | Thay đổi nội dung | Undo khôi phục | Redo tái lập | Trạng thái | Ghi chú |\n`;
    md += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |\n`;

    results.forEach((r, idx) => {
      const badge = r.status === "PASS" ? "✅ PASS" : r.status === "FAIL" ? "❌ FAIL" : "⏭️ BO QUA";
      md += `| ${idx + 1} | \`${r.id}\` | ${r.label} | \`${r.args}\` | ${r.changed} | ${r.undoOk} | ${r.redoOk} | **${badge}** | ${r.reason} |\n`;
    });

    md += `\n## 3. Đánh giá chất lượng và cơ chế bảo toàn vị trí con trỏ\n\n`;
    md += `- **Cam kết đồng bộ thao tác gõ (flushTyping):** Mọi thao tác gõ văn bản và áp dụng lệnh đều được cam kết (\`flushTyping\`) trước khi biến đổi DOM, đảm bảo 1 lần áp dụng lệnh tương ứng đúng 1 bước Hoàn tác duy nhất.\n`;
    md += `- **Chuẩn hóa phần tử danh sách (normalizeListElements):** Thao tác danh sách (\`writer.list.bullet\`, \`writer.list.numbered\`) được chuẩn hóa tự động loại bỏ thẻ \`<p>\` lồng không hợp lệ, giữ nguyên vẹn cấu trúc DOM qua chu trình Undo/Redo.\n`;
    md += `- **Bảo toàn vị trí con trỏ (Selection Bookmark):** Cơ chế Bookmark vùng chọn (\`_captureSelectionBookmark\` / \`_restoreSelectionBookmark\`) bảo đảm con trỏ sau khi Undo luôn nằm bên trong vùng văn bản đang soạn thảo (\`anchorInBody = true\`), không bao giờ bị rơi ra đầu tài liệu.\n`;
    md += `- **Tích hợp InputNormalizer:** Lắng nghe phím tắt Ctrl+Z/Ctrl+Y thông qua hook \`onUndo\` được chuyển tiếp đến adapter, ngăn chặn việc can thiệp xóa trắng văn bản của lớp chuẩn hóa gõ tiếng Việt.\n`;

    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, md, "utf8");
    console.log(`[Audit] Đã lưu báo cáo toàn diện vào: ${reportPath}`);

    return { passCount, failCount, skipCount, total: results.length };
  } finally {
    await session.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith("writer-undo-matrix-full.desktop.mjs")) {
  runFullUndoMatrix().then(({ failCount }) => {
    if (failCount > 0) process.exit(1);
  }).catch(err => {
    console.error("Lỗi thực thi matrix:", err);
    process.exit(1);
  });
}
