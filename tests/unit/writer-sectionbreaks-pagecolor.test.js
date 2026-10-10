import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

function assert(value, message) { if (!value) throw new Error(message); }

function createAdapter(html = "<p>Nội dung</p>") {
  const body = {
    innerHTML: html,
    innerText: String(html || "").replace(/<[^>]*>/g, " "),
    contains: () => true,
    querySelectorAll: () => [],
    addEventListener() {},
    focus() {},
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}
  };
  body.querySelector = (selector) => {
    const id = String(selector).match(/data-vno-section-id=["']([^"']+)["']/)?.[1];
    if (!id || !body.innerHTML.includes('data-vno-section-id="' + id + '"')) return null;
    return {
      nodeType: 1,
      classList: { contains: (name) => name === "vno-section-break" },
      getAttribute: (name) => name === "data-vno-section-id" ? id : null,
      nextElementSibling: null,
      remove() {
        const markerText = 'data-vno-section-id="' + id + '"';
        const attrAt = body.innerHTML.indexOf(markerText);
        const openAt = body.innerHTML.lastIndexOf("<div", attrAt);
        const closeAt = body.innerHTML.indexOf("</div>", attrAt);
        if (openAt >= 0 && closeAt >= 0) body.innerHTML = body.innerHTML.slice(0, openAt) + body.innerHTML.slice(closeAt + 6);
      }
    };
  };
  const header = { innerHTML: "", innerText: "" };
  const footer = { innerHTML: "", innerText: "" };
  const style = { setProperty() {} };
  const editor = {
    style,
    innerHTML: html,
    querySelector(selector) { if (selector === ".vno-writer-body") return body; if (selector === ".vno-writer-header") return header; if (selector === ".vno-writer-footer") return footer; return null; },
    closest() { return { style: { setProperty() {} } }; },
    addEventListener() {}, removeEventListener() {}
  };
  return { adapter: new WriterAdapter(editor), editor, body };
}

export async function runWriterSectionBreaksPageColorTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("Writer Page Color: command, ribbon, icon và Help được nối thật", () => {
    assert(WRITER_COMMANDS.some((item) => item.id === "writer.page.color"), "Thiếu command Page Color");
    const design = WRITER_RIBBON_TABS.find((tab) => tab.id === "design");
    assert(design?.groups.some((group) => group.items.some((item) => item.commandId === "writer.page.color")), "Thiếu Page Color trên Design");
    assert(ICONS.pageColor?.includes("<svg"), "Thiếu icon Page Color");
    assert(WRITER_HELP_ENTRIES.some((entry) => entry.id === "writer.page.color" && entry.steps.length >= 3), "Thiếu Help Page Color");
  });

  await test("Writer Page Color: đổi model, CSS canvas/export và Undo/Redo", () => {
    const { adapter, editor } = createAdapter();
    adapter.setPageColor("#dbeafe");
    assert(adapter.pageColor === "#dbeafe", "Model không đổi màu");
    assert(editor.style.backgroundColor === "#dbeafe", "Canvas không đổi màu");
    assert(adapter._contentForExport().includes("background-color: #dbeafe"), "Export thiếu page background");
    assert(adapter.undo(), "Không Undo được Page Color");
    assert(adapter.pageColor === "transparent", "Undo không phục hồi không màu");
    assert(adapter.redo(), "Không Redo được Page Color");
    assert(adapter.pageColor === "#dbeafe", "Redo không phục hồi màu");
  });

  await test("Writer Section Break: Next Page tạo hai vùng có Page Setup độc lập", () => {
    const { adapter, body } = createAdapter("<p>Mục một</p>");
    const secondId = adapter.insertSectionBreak("nextPage");
    adapter.setPageSetup({ orientation: "landscape", margins: { left: 12 } });
    assert(body.innerHTML.includes('data-vno-section-break="nextPage"'), "Thiếu marker Next Page");
    assert(adapter.sectionPageSetups["section-1"].orientation === "portrait", "Mục trước bị đổi hướng giấy");
    assert(adapter.sectionPageSetups[secondId].orientation === "landscape", "Mục sau không có hướng giấy riêng");
    assert(adapter.sectionPageSetups[secondId].margins.left === 12, "Mục sau không có lề riêng");
    const exported = adapter._contentForExport();
    assert(exported.includes("@page vno-section-1") && exported.includes(`@page vno-${secondId}`), "Export thiếu named page styles");
    assert(exported.includes("size:297mm 210mm"), "Export thiếu landscape thật cho mục sau");
    assert(adapter.undo(), "Không Undo được Page Setup của mục sau");
    assert(adapter.sectionPageSetups[secondId].orientation === "portrait", "Undo không phục hồi mục sau");
  });

  await test("W20e: export section break consumes its UI spacer", () => {
    const marker = '<p>Trước</p><div data-vno-section-break="nextPage" data-vno-section-id="section-2">---</div><p><br></p><p>Sau</p>';
    const { adapter } = createAdapter(marker);
    const exported = adapter._contentForExport();
    assert(!exported.includes('<p><br></p>'), "Spacer UI còn lại tạo thêm trang trắng");
    assert(exported.includes('data-vno-export-section="section-2"'), "Mất vùng trang kế tiếp");
  });

  await test("W20e: marker không có spacer (phong bì/nhãn/FODT) vẫn tách mục khi export", () => {
    const marker = '<p>Trước</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2" contenteditable="false">---</div><p>Phong bì sau</p>';
    const { adapter } = createAdapter(marker);
    const exported = adapter._contentForExport();
    assert(exported.includes('data-vno-export-section="section-2"'), "Marker không spacer bị bỏ qua, mất vùng trang kế tiếp");
    assert(/data-vno-export-section="section-2"[^>]*>\s*<p>Phong bì sau<\/p>/.test(exported), `Đoạn sau marker phải mở đầu mục 2: ${exported}`);
    assert(!exported.includes("data-vno-section-break="), "Marker UI còn sót trong HTML export");
  });

  await test("Writer Section Break: ribbon có đủ Page/Column/Next/Continuous/Even/Odd và Help", () => {
    const layout = WRITER_RIBBON_TABS.find((tab) => tab.id === "layout");
    const dropdown = layout.groups.flatMap((group) => group.items).find((item) => item.id === "writer.layout.breaks");
    const ids = dropdown?.items.map((item) => item.commandId) || [];
    for (const id of ["writer.page.break", "writer.break.column", "writer.section.nextPage", "writer.section.continuous", "writer.section.evenPage", "writer.section.oddPage"]) assert(ids.includes(id), `Dropdown thiếu ${id}`);
    assert(WRITER_HELP_ENTRIES.some((entry) => entry.id === "writer.section.breaks"), "Thiếu Help Section Breaks");
  });

  await test("Writer import syncs Letter geometry and margins to the active section", async () => {
    const { adapter } = createAdapter();
    const originalOpen = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      fileName: "letter.docx",
      content: "<html><head><style>@page { size: 21.59cm 27.94cm; margin-top: 1.3cm; margin-right: 2.5cm; margin-bottom: 0.9cm; margin-left: 2.5cm; }</style></head><body><p>Letter</p></body></html>"
    });
    try {
      assert(await adapter.open(), "Could not open Letter fixture");
      const exported = adapter._contentForExport();
      assert(exported.includes("@page { size: 215.9mm 279.4mm; margin: 13mm 25mm 9mm 25mm;"), "Global @page lost imported Letter geometry/margins");
      assert(exported.includes("@page vno-section-1 { size:215.9mm 279.4mm; margin:13mm 25mm 9mm 25mm;"), "Section @page was not synchronized with imported Letter geometry/margins");
    } finally {
      globalUnoBridge.openRealFile = originalOpen;
    }
  });

  await test("Writer import preserves custom geometry in global and section CSS", async () => {
    const { adapter, editor } = createAdapter();
    const originalOpen = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      fileName: "custom.docx",
      content: "<html><head><style>@page { size: 14.65cm 21.3cm; }</style></head><body><p>Custom</p></body></html>"
    });
    try {
      assert(await adapter.open(), "Could not open custom-size fixture");
      const exported = adapter._contentForExport();
      assert(adapter.pageSetup.size === "custom" && adapter.pageSetup.widthMm === 146.5 && adapter.pageSetup.heightMm === 213, "Model lost custom dimensions");
      assert(exported.includes("@page { size: 146.5mm 213mm;"), "Global @page lost custom geometry");
      assert(exported.includes("@page vno-section-1 { size:146.5mm 213mm;"), "Section @page lost custom geometry");
      assert(editor.style.width === `${(146.5 * 3.7795275591).toFixed(1)}px`, "Canvas did not use the custom width");
    } finally {
      globalUnoBridge.openRealFile = originalOpen;
    }
  });

  await test("Writer new document remains A4 by default", () => {
    const { adapter } = createAdapter();
    assert(adapter.pageSetup.size === "a4", "New document default is no longer A4");
    assert(adapter._getPageSetupCss().includes("size: 210mm 297mm"), "New document CSS is no longer A4");
  });

  await test("Writer Section Break: insert and delete both support Undo/Redo", () => {
    const { adapter, body } = createAdapter("<p>Trước</p>");
    const sectionId = adapter.insertSectionBreak("nextPage");
    assert(body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Insert không tạo marker");
    assert(adapter.undo(), "Undo insert thất bại");
    assert(!body.innerHTML.includes("vno-section-break"), "Undo không bỏ marker");
    assert(!adapter.sectionPageSetups[sectionId], "Undo không bỏ model của mục");
    assert(adapter.redo(), "Redo insert thất bại");
    assert(body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Redo không khôi phục marker");
    assert(adapter.deleteSectionBreak(sectionId), "Delete command không xóa marker");
    assert(!body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Delete vẫn để marker");
    assert(!adapter.sectionPageSetups[sectionId], "Delete vẫn để model mục");
    assert(adapter.undo(), "Undo delete thất bại");
    assert(body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Undo delete không khôi phục marker");
    assert(adapter.sectionPageSetups[sectionId], "Undo delete không khôi phục model mục");
    assert(adapter.redo(), "Redo delete thất bại");
    assert(!adapter.sectionPageSetups[sectionId], "Redo delete không xóa model mục");
  });

  await test("Writer Page Setup: apply-to scope and section header/footer options are independent", () => {
    const { adapter } = createAdapter("<p>Mục đầu</p>");
    const secondId = adapter.insertSectionBreak("nextPage");
    adapter.activateSection(secondId);
    adapter.setPageSetup({ orientation: "landscape", margins: { left: 27 } });
    assert(adapter.sectionPageSetups["section-1"].orientation === "portrait", "Đổi hướng giấy đã làm thay đổi mục trước");
    assert(adapter.sectionPageSetups[secondId].margins.left === 27, "Lề riêng của mục hiện tại không được lưu");
    adapter.setDifferentFirstPage(true, secondId);
    adapter.setDifferentOddEven(true, secondId);
    adapter.setPageNumberFormat({ restart: true, startAt: 7 }, secondId);
    assert(adapter.sectionHeadersFooters[secondId].differentFirstPage, "Mất tùy chọn Trang đầu khác biệt");
    assert(adapter.sectionHeadersFooters[secondId].differentOddEven, "Mất tùy chọn Trang chẵn và lẻ khác nhau");
    assert(adapter.sectionHeadersFooters[secondId].pageNumberRestart && adapter.sectionHeadersFooters[secondId].pageNumberStart === 7, "Mất tùy chọn bắt đầu số trang");
    adapter.setPageSetup({ orientation: "portrait", applyTo: "whole" });
    assert(adapter.sectionPageSetups["section-1"].orientation === "portrait" && adapter.sectionPageSetups[secondId].orientation === "portrait", "Áp dụng toàn tài liệu không cập nhật mọi mục");
  });

  await test("Writer Section Options: Layout ribbon exposes and executes section commands", async () => {
    const layout = WRITER_RIBBON_TABS.find((tab) => tab.id === "layout");
    const dropdown = layout?.groups.flatMap((group) => group.items).find((item) => item.id === "writer.layout.sectionOptions");
    const commandIds = dropdown?.items.map((item) => item.commandId) || [];
    for (const id of ["writer.section.options", "writer.pageNumber.format", "writer.section.delete"]) {
      assert(commandIds.includes(id), `Tùy chọn mục thiếu ${id}`);
      assert(WRITER_COMMANDS.some((item) => item.id === id), `Thiếu command definition ${id}`);
    }
    assert(WRITER_HELP_ENTRIES.some((entry) => entry.id === "writer.section.headers-footers"), "Thiếu Help đầu trang/chân trang");
    const { adapter, body } = createAdapter("<p>Trước</p>");
    adapter.attach();
    const sectionId = await globalCommandBus.execute("writer.section.continuous");
    assert(sectionId && body.innerHTML.includes('data-vno-section-break="continuous"'), "Command Bus không chèn ngắt mục liên tục");
    assert(adapter.sectionHeadersFooters[sectionId].linkToPrevious, "Liên kết với mục trước không mặc định bật");
  });

  await test("Writer section import maps geometry, header variants, and numbering", () => {
    const { adapter } = createAdapter();
    const documentXml = '<w:document><w:body>' +
      '<w:p><w:pPr><w:sectPr><w:headerReference w:type="default" r:id="rId1"/>' +
      '<w:headerReference w:type="first" r:id="rId2"/><w:headerReference w:type="even" r:id="rId3"/>' +
      '<w:type w:val="continuous"/><w:pgSz w:w="11906" w:h="16838"/>' +
      '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/></w:sectPr></w:pPr>' +
      '</w:p><w:sectPr><w:headerReference w:type="default" r:id="rId4"/>' +
      '<w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>' +
      '<w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/>' +
      '<w:titlePg/><w:pgNumType w:start="7"/></w:sectPr></w:body></w:document>';
    const headerXml = (value) => `<w:hdr><w:p><w:r><w:t>${value}</w:t></w:r></w:p></w:hdr>`;
    const imported = adapter._extractSectionsFromOoxml(
      documentXml,
      { rId1: headerXml("Default One"), rId2: headerXml("First One"), rId3: headerXml("Even One"), rId4: headerXml("Section Two") },
      {},
      { rId1: "header1.xml", rId2: "header2.xml", rId3: "header3.xml", rId4: "header4.xml" },
      null,
      "<w:settings><w:evenAndOddHeaders/></w:settings>"
    );
    assert(imported?.sections.length === 2, "Không nhận đủ hai mục");
    assert(imported.sections[0].type === "continuous", "Sai kiểu ngắt mục liên tục");
    assert(imported.sectionPageSetups["section-2"].orientation === "landscape", "Mất hướng giấy ngang của mục 2");
    const first = imported.sectionHeadersFooters["section-1"];
    assert(first.headers.default.includes("Default One"), "Mất đầu trang mặc định");
    assert(first.headers.first.includes("First One"), "Mất đầu trang trang đầu");
    assert(first.headers.even.includes("Even One"), "Mất đầu trang trang chẵn");
    assert(first.differentOddEven, "Không đọc w:evenAndOddHeaders");
    const second = imported.sectionHeadersFooters["section-2"];
    assert(second.differentFirstPage, "Không đọc w:titlePg");
    assert(second.pageNumberRestart && second.pageNumberStart === 7, "Không đọc w:pgNumType w:start");
    assert(second.header.includes("Section Two"), "Mất đầu trang riêng của mục 2");
  });

  await test("Writer Section Break: deleteSectionBreak finds active section break and does not fail silently", () => {
    const { adapter, body } = createAdapter("<p>Đoạn 1</p>");
    adapter.attach();
    const sId = adapter.insertSectionBreak("nextPage");
    assert(body.innerHTML.includes(`data-vno-section-id="${sId}"`), "Ngắt mục chưa được chèn");
    assert(adapter.activeSectionId === sId, "Mục mới chưa được kích hoạt");

    // Gọi deleteSectionBreak không tham số khi con trỏ ở mục 2
    const deleted = adapter.deleteSectionBreak();
    assert(deleted, "deleteSectionBreak trả về false khi có ngắt mục");
    assert(!body.innerHTML.includes(`data-vno-section-id="${sId}"`), "Ngắt mục không bị gỡ khỏi body");
    assert(!adapter.sectionPageSetups[sId], "sectionPageSetups chưa dọn mục đã xóa");
  });

  await test("Writer Section Columns: columns apply to active section when sections exist", () => {
    const { adapter, body } = createAdapter("<p>Đoạn mục 1</p>");
    adapter.attach();
    const sId = adapter.insertSectionBreak("continuous");
    adapter.setColumns({ count: 2, gap: 10, rule: false });

    assert(adapter.sectionPageSetups[sId]?.columns?.count === 2, "sectionPageSetups của mục 2 không lưu columns count=2");
    const exportedHtml = adapter._contentForExport();
    assert(exportedHtml.includes('<!--vno-sections-meta:'), "Xuất thiếu vno-sections-meta");
    assert(exportedHtml.includes('"count":2'), "vno-sections-meta thiếu columns count:2");
    assert(!exportedHtml.includes('<div class="vno-writer-columns-content vno-writer-body"'), "Đa mục không được bọc toàn thân trong columns-content");
  });

  return results;
}
