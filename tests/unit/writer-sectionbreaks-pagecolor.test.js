import { PAGE_MARGIN_PRESETS, PAGE_SIZES_MM, WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

function assert(value, message) { if (!value) throw new Error(message); }

function createAdapter(html = "<p>Ná»™i dung</p>") {
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

  await test("Writer Page Setup: Word margin presets and A5 are available with exact millimeter geometry", () => {
    assert(JSON.stringify(PAGE_MARGIN_PRESETS.normal) === JSON.stringify({ top: 25.4, bottom: 25.4, left: 25.4, right: 25.4 }), "Normal preset must use 1 inch on every side");
    assert(JSON.stringify(PAGE_MARGIN_PRESETS.narrow) === JSON.stringify({ top: 12.7, bottom: 12.7, left: 12.7, right: 12.7 }), "Narrow preset must use 0.5 inch on every side");
    assert(JSON.stringify(PAGE_MARGIN_PRESETS.moderate) === JSON.stringify({ top: 25.4, bottom: 25.4, left: 19.05, right: 19.05 }), "Moderate preset geometry changed");
    assert(JSON.stringify(PAGE_MARGIN_PRESETS.wide) === JSON.stringify({ top: 25.4, bottom: 25.4, left: 50.8, right: 50.8 }), "Wide preset geometry changed");
    assert(PAGE_SIZES_MM.a5.w === 148 && PAGE_SIZES_MM.a5.h === 210, "A5 must be 148 x 210 mm");
    const help = WRITER_HELP_ENTRIES.find((entry) => entry.id === "writer.page.setup");
    assert(help?.steps.join(" ").includes("A5") && help?.steps.join(" ").includes("Narrow") && help?.steps.join(" ").includes("Wide"), "Page Setup help must explain A5 and margin presets");
  });

  await test("Writer Page Color: command, ribbon, icon vÃ  Help Ä‘Æ°á»£c ná»‘i tháº­t", () => {
    assert(WRITER_COMMANDS.some((item) => item.id === "writer.page.color"), "Thiáº¿u command Page Color");
    const design = WRITER_RIBBON_TABS.find((tab) => tab.id === "design");
    assert(design?.groups.some((group) => group.items.some((item) => item.commandId === "writer.page.color")), "Thiáº¿u Page Color trÃªn Design");
    assert(ICONS.pageColor?.includes("<svg"), "Thiáº¿u icon Page Color");
    assert(WRITER_HELP_ENTRIES.some((entry) => entry.id === "writer.page.color" && entry.steps.length >= 3), "Thiáº¿u Help Page Color");
  });

  await test("Writer Page Color: Ä‘á»•i model, CSS canvas/export vÃ  Undo/Redo", () => {
    const { adapter, editor } = createAdapter();
    adapter.setPageColor("#dbeafe");
    assert(adapter.pageColor === "#dbeafe", "Model khÃ´ng Ä‘á»•i mÃ u");
    assert(editor.style.backgroundColor === "#dbeafe", "Canvas khÃ´ng Ä‘á»•i mÃ u");
    assert(adapter._contentForExport().includes("background-color: #dbeafe"), "Export thiáº¿u page background");
    assert(adapter.undo(), "KhÃ´ng Undo Ä‘Æ°á»£c Page Color");
    assert(adapter.pageColor === "transparent", "Undo khÃ´ng phá»¥c há»“i khÃ´ng mÃ u");
    assert(adapter.redo(), "KhÃ´ng Redo Ä‘Æ°á»£c Page Color");
    assert(adapter.pageColor === "#dbeafe", "Redo khÃ´ng phá»¥c há»“i mÃ u");
  });

  await test("Writer Section Break: Next Page táº¡o hai vÃ¹ng cÃ³ Page Setup Ä‘á»™c láº­p", () => {
    const { adapter, body } = createAdapter("<p>Má»¥c má»™t</p>");
    const secondId = adapter.insertSectionBreak("nextPage");
    adapter.setPageSetup({ orientation: "landscape", margins: { left: 12 } });
    assert(body.innerHTML.includes('data-vno-section-break="nextPage"'), "Thiáº¿u marker Next Page");
    assert(adapter.sectionPageSetups["section-1"].orientation === "portrait", "Má»¥c trÆ°á»›c bá»‹ Ä‘á»•i hÆ°á»›ng giáº¥y");
    assert(adapter.sectionPageSetups[secondId].orientation === "landscape", "Má»¥c sau khÃ´ng cÃ³ hÆ°á»›ng giáº¥y riÃªng");
    assert(adapter.sectionPageSetups[secondId].margins.left === 12, "Má»¥c sau khÃ´ng cÃ³ lá» riÃªng");
    const exported = adapter._contentForExport();
    assert(exported.includes("@page vno-section-1") && exported.includes(`@page vno-${secondId}`), "Export thiáº¿u named page styles");
    assert(exported.includes("size:297mm 210mm"), "Export thiáº¿u landscape tháº­t cho má»¥c sau");
    assert(adapter.undo(), "KhÃ´ng Undo Ä‘Æ°á»£c Page Setup cá»§a má»¥c sau");
    assert(adapter.sectionPageSetups[secondId].orientation === "portrait", "Undo khÃ´ng phá»¥c há»“i má»¥c sau");
  });

  await test("W20e: export section break consumes its UI spacer", () => {
    const marker = '<p>TrÆ°á»›c</p><div data-vno-section-break="nextPage" data-vno-section-id="section-2">---</div><p><br></p><p>Sau</p>';
    const { adapter } = createAdapter(marker);
    const exported = adapter._contentForExport();
    assert(!exported.includes('<p><br></p>'), "Spacer UI cÃ²n láº¡i táº¡o thÃªm trang tráº¯ng");
    assert(exported.includes('data-vno-export-section="section-2"'), "Máº¥t vÃ¹ng trang káº¿ tiáº¿p");
  });

  await test("W20e: marker khÃ´ng cÃ³ spacer (phong bÃ¬/nhÃ£n/FODT) váº«n tÃ¡ch má»¥c khi export", () => {
    const marker = '<p>TrÆ°á»›c</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2" contenteditable="false">---</div><p>Phong bÃ¬ sau</p>';
    const { adapter } = createAdapter(marker);
    const exported = adapter._contentForExport();
    assert(exported.includes('data-vno-export-section="section-2"'), "Marker khÃ´ng spacer bá»‹ bá» qua, máº¥t vÃ¹ng trang káº¿ tiáº¿p");
    assert(/data-vno-export-section="section-2"[^>]*>\s*<p>Phong bÃ¬ sau<\/p>/.test(exported), `Äoáº¡n sau marker pháº£i má»Ÿ Ä‘áº§u má»¥c 2: ${exported}`);
    assert(!exported.includes("data-vno-section-break="), "Marker UI cÃ²n sÃ³t trong HTML export");
  });

  await test("Writer Section Break: ribbon cÃ³ Ä‘á»§ Page/Column/Next/Continuous/Even/Odd vÃ  Help", () => {
    const layout = WRITER_RIBBON_TABS.find((tab) => tab.id === "layout");
    const dropdown = layout.groups.flatMap((group) => group.items).find((item) => item.id === "writer.layout.breaks");
    const ids = dropdown?.items.map((item) => item.commandId) || [];
    for (const id of ["writer.page.break", "writer.break.column", "writer.section.nextPage", "writer.section.continuous", "writer.section.evenPage", "writer.section.oddPage"]) assert(ids.includes(id), `Dropdown thiáº¿u ${id}`);
    assert(WRITER_HELP_ENTRIES.some((entry) => entry.id === "writer.section.breaks"), "Thiáº¿u Help Section Breaks");
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
    const { adapter, body } = createAdapter("<p>TrÆ°á»›c</p>");
    const sectionId = adapter.insertSectionBreak("nextPage");
    assert(body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Insert khÃ´ng táº¡o marker");
    assert(adapter.undo(), "Undo insert tháº¥t báº¡i");
    assert(!body.innerHTML.includes("vno-section-break"), "Undo khÃ´ng bá» marker");
    assert(!adapter.sectionPageSetups[sectionId], "Undo khÃ´ng bá» model cá»§a má»¥c");
    assert(adapter.redo(), "Redo insert tháº¥t báº¡i");
    assert(body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Redo khÃ´ng khÃ´i phá»¥c marker");
    assert(adapter.deleteSectionBreak(sectionId), "Delete command khÃ´ng xÃ³a marker");
    assert(!body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Delete váº«n Ä‘á»ƒ marker");
    assert(!adapter.sectionPageSetups[sectionId], "Delete váº«n Ä‘á»ƒ model má»¥c");
    assert(adapter.undo(), "Undo delete tháº¥t báº¡i");
    assert(body.innerHTML.includes(`data-vno-section-id="${sectionId}"`), "Undo delete khÃ´ng khÃ´i phá»¥c marker");
    assert(adapter.sectionPageSetups[sectionId], "Undo delete khÃ´ng khÃ´i phá»¥c model má»¥c");
    assert(adapter.redo(), "Redo delete tháº¥t báº¡i");
    assert(!adapter.sectionPageSetups[sectionId], "Redo delete khÃ´ng xÃ³a model má»¥c");
  });

  await test("Writer Page Setup: apply-to scope and section header/footer options are independent", () => {
    const { adapter } = createAdapter("<p>Má»¥c Ä‘áº§u</p>");
    const secondId = adapter.insertSectionBreak("nextPage");
    adapter.activateSection(secondId);
    adapter.setPageSetup({ orientation: "landscape", margins: { left: 27 } });
    assert(adapter.sectionPageSetups["section-1"].orientation === "portrait", "Äá»•i hÆ°á»›ng giáº¥y Ä‘Ã£ lÃ m thay Ä‘á»•i má»¥c trÆ°á»›c");
    assert(adapter.sectionPageSetups[secondId].margins.left === 27, "Lá» riÃªng cá»§a má»¥c hiá»‡n táº¡i khÃ´ng Ä‘Æ°á»£c lÆ°u");
    adapter.setDifferentFirstPage(true, secondId);
    adapter.setDifferentOddEven(true, secondId);
    adapter.setPageNumberFormat({ restart: true, startAt: 7 }, secondId);
    assert(adapter.sectionHeadersFooters[secondId].differentFirstPage, "Máº¥t tÃ¹y chá»n Trang Ä‘áº§u khÃ¡c biá»‡t");
    assert(adapter.sectionHeadersFooters[secondId].differentOddEven, "Máº¥t tÃ¹y chá»n Trang cháºµn vÃ  láº» khÃ¡c nhau");
    assert(adapter.sectionHeadersFooters[secondId].pageNumberRestart && adapter.sectionHeadersFooters[secondId].pageNumberStart === 7, "Máº¥t tÃ¹y chá»n báº¯t Ä‘áº§u sá»‘ trang");
    adapter.setPageSetup({ orientation: "portrait", applyTo: "whole" });
    assert(adapter.sectionPageSetups["section-1"].orientation === "portrait" && adapter.sectionPageSetups[secondId].orientation === "portrait", "Ãp dá»¥ng toÃ n tÃ i liá»‡u khÃ´ng cáº­p nháº­t má»i má»¥c");
  });

  await test("Writer Section Options: Layout ribbon exposes and executes section commands", async () => {
    const layout = WRITER_RIBBON_TABS.find((tab) => tab.id === "layout");
    const dropdown = layout?.groups.flatMap((group) => group.items).find((item) => item.id === "writer.layout.sectionOptions");
    const commandIds = dropdown?.items.map((item) => item.commandId) || [];
    for (const id of ["writer.section.options", "writer.pageNumber.format", "writer.section.delete"]) {
      assert(commandIds.includes(id), `TÃ¹y chá»n má»¥c thiáº¿u ${id}`);
      assert(WRITER_COMMANDS.some((item) => item.id === id), `Thiáº¿u command definition ${id}`);
    }
    assert(WRITER_HELP_ENTRIES.some((entry) => entry.id === "writer.section.headers-footers"), "Thiáº¿u Help Ä‘áº§u trang/chÃ¢n trang");
    const { adapter, body } = createAdapter("<p>TrÆ°á»›c</p>");
    adapter.attach();
    const sectionId = await globalCommandBus.execute("writer.section.continuous");
    assert(sectionId && body.innerHTML.includes('data-vno-section-break="continuous"'), "Command Bus khÃ´ng chÃ¨n ngáº¯t má»¥c liÃªn tá»¥c");
    assert(adapter.sectionHeadersFooters[sectionId].linkToPrevious, "LiÃªn káº¿t vá»›i má»¥c trÆ°á»›c khÃ´ng máº·c Ä‘á»‹nh báº­t");
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
    assert(imported?.sections.length === 2, "KhÃ´ng nháº­n Ä‘á»§ hai má»¥c");
    assert(imported.sections[0].type === "continuous", "Sai kiá»ƒu ngáº¯t má»¥c liÃªn tá»¥c");
    assert(imported.sectionPageSetups["section-2"].orientation === "landscape", "Máº¥t hÆ°á»›ng giáº¥y ngang cá»§a má»¥c 2");
    const first = imported.sectionHeadersFooters["section-1"];
    assert(first.headers.default.includes("Default One"), "Máº¥t Ä‘áº§u trang máº·c Ä‘á»‹nh");
    assert(first.headers.first.includes("First One"), "Máº¥t Ä‘áº§u trang trang Ä‘áº§u");
    assert(first.headers.even.includes("Even One"), "Máº¥t Ä‘áº§u trang trang cháºµn");
    assert(first.differentOddEven, "KhÃ´ng Ä‘á»c w:evenAndOddHeaders");
    const second = imported.sectionHeadersFooters["section-2"];
    assert(second.differentFirstPage, "KhÃ´ng Ä‘á»c w:titlePg");
    assert(second.pageNumberRestart && second.pageNumberStart === 7, "KhÃ´ng Ä‘á»c w:pgNumType w:start");
    assert(second.header.includes("Section Two"), "Máº¥t Ä‘áº§u trang riÃªng cá»§a má»¥c 2");
  });

  await test("Writer Section Break: deleteSectionBreak finds active section break and does not fail silently", () => {
    const { adapter, body } = createAdapter("<p>Äoáº¡n 1</p>");
    adapter.attach();
    const sId = adapter.insertSectionBreak("nextPage");
    assert(body.innerHTML.includes(`data-vno-section-id="${sId}"`), "Ngáº¯t má»¥c chÆ°a Ä‘Æ°á»£c chÃ¨n");
    assert(adapter.activeSectionId === sId, "Má»¥c má»›i chÆ°a Ä‘Æ°á»£c kÃ­ch hoáº¡t");

    // Gá»i deleteSectionBreak khÃ´ng tham sá»‘ khi con trá» á»Ÿ má»¥c 2
    const deleted = adapter.deleteSectionBreak();
    assert(deleted, "deleteSectionBreak tráº£ vá» false khi cÃ³ ngáº¯t má»¥c");
    assert(!body.innerHTML.includes(`data-vno-section-id="${sId}"`), "Ngáº¯t má»¥c khÃ´ng bá»‹ gá»¡ khá»i body");
    assert(!adapter.sectionPageSetups[sId], "sectionPageSetups chÆ°a dá»n má»¥c Ä‘Ã£ xÃ³a");
  });

  await test("Writer Section Columns: columns apply to active section when sections exist", () => {
    const { adapter, body } = createAdapter("<p>Äoáº¡n má»¥c 1</p>");
    adapter.attach();
    const sId = adapter.insertSectionBreak("continuous");
    adapter.setColumns({ count: 2, gap: 10, rule: false });

    assert(adapter.sectionPageSetups[sId]?.columns?.count === 2, "sectionPageSetups cá»§a má»¥c 2 khÃ´ng lÆ°u columns count=2");
    const exportedHtml = adapter._contentForExport();
    assert(exportedHtml.includes('<!--vno-sections-meta:'), "Xuáº¥t thiáº¿u vno-sections-meta");
    assert(exportedHtml.includes('"count":2'), "vno-sections-meta thiáº¿u columns count:2");
    assert(!exportedHtml.includes('<div class="vno-writer-columns-content vno-writer-body"'), "Äa má»¥c khÃ´ng Ä‘Æ°á»£c bá»c toÃ n thÃ¢n trong columns-content");
  });

  await test("Writer Section Columns: _extractSectionsFromOoxml extracts w:cols into section pageSetup", () => {
    const { adapter } = createAdapter();
    const docXml = `
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:sectPr><w:type w:val="continuous"/><w:cols w:num="2" w:space="567" w:sep="1"/></w:sectPr></w:pPr><w:r><w:t>Sec 1</w:t></w:r></w:p>
          <w:sectPr><w:cols w:space="720"/></w:sectPr>
        </w:body>
      </w:document>
    `;
    const res = adapter._extractSectionsFromOoxml(docXml);
    assert(res && res.sections.length === 2, "Cáº§n trÃ­ch xuáº¥t Ä‘Ãºng 2 sections");
    assert(res.sectionPageSetups["section-1"]?.columns?.count === 2, "Section 1 pháº£i cÃ³ 2 cá»™t");
    assert(res.sectionPageSetups["section-1"]?.columns?.rule === true, "Section 1 pháº£i cÃ³ Ä‘Æ°á»ng káº»");
    assert(res.sectionPageSetups["section-2"]?.columns?.count === 1, "Section 2 pháº£i cÃ³ 1 cá»™t");
  });

  await test("Writer Section Columns: single section document updates sectionPageSetups and adapter.columns", () => {
    const { adapter } = createAdapter("<p>Äoáº¡n Ä‘Æ¡n má»¥c</p>");
    adapter.attach();
    adapter.setColumns({ count: 3, gap: 12, rule: true });
    assert(adapter.columns.count === 3, "adapter.columns pháº£i cÃ³ 3 cá»™t");
    assert(adapter.sectionPageSetups["section-1"]?.columns?.count === 3, "sectionPageSetups section-1 pháº£i cÃ³ 3 cá»™t");
  });

  return results;
}
