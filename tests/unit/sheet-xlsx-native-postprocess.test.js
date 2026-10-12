/**
 * Unit tests — Sheet native XLSX post-process (workbookProtection lockStructure).
 * No soffice. Fake OOXML ZIP + the real LibreOffice workbook.xml shape from probe.
 */
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import {
  applyWorkbookProtectionLockStructure,
  fodsHasStructureProtection,
  resolveWorkbookProtectionEnabled,
  workbookHasStructureLock
} from "../../adapters/libreoffice/sheet/xlsx-workbook-protection.js";
import { postProcessSheetXlsx } from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import { createZip, readZipEntry } from "../helpers/zip-package.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Exact child order LibreOffice Calc wrote in the Phase 1 probe. */
const LO_WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><fileVersion appName="Calc" lowestEdited="4"/><workbookPr backupFile="false" showObjects="all" date1904="false"/><workbookProtection lockWindows="false"/><bookViews><workbookView showHorizontalScroll="true" showVerticalScroll="true" showSheetTabs="true" xWindow="0" yWindow="0" windowWidth="16384" windowHeight="8192" tabRatio="500" firstSheet="0" activeTab="0"/></bookViews><sheets><sheet name="BaoCao" sheetId="1" state="visible" r:id="rId3"/></sheets><calcPr iterateCount="100" refMode="A1" iterate="false" iterateDelta="0.001"/></workbook>`;

function fakeXlsx(workbookXml) {
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/worksheets/sheet1.xml", data: '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>' }
  ]);
}

function protectionSnippet(xml) {
  return String(xml).match(/<(?:[\w]+:)?workbookProtection\b[^>]*\/?\s*>/i)?.[0] || "";
}

function assertSchemaSlot(xml) {
  const pr = xml.search(/<(?:[\w]+:)?workbookPr\b/i);
  const prot = xml.search(/<(?:[\w]+:)?workbookProtection\b/i);
  const views = xml.search(/<(?:[\w]+:)?bookViews\b/i);
  const sheets = xml.search(/<(?:[\w]+:)?sheets\b/i);
  assert(prot >= 0, "thiếu workbookProtection");
  if (pr >= 0) assert(pr < prot, "workbookProtection phải sau workbookPr");
  const after = views >= 0 ? views : sheets;
  assert(after >= 0 && prot < after, "workbookProtection phải trước bookViews/sheets (CT_Workbook)");
}

export async function runSheetXlsxNativePostprocessTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("LibreOffice workbook.xml: thêm lockStructure=1 trên element có sẵn, đúng chỗ schema", () => {
    assert(!workbookHasStructureLock(LO_WORKBOOK_XML), "probe LO chưa khóa structure");
    const next = applyWorkbookProtectionLockStructure(LO_WORKBOOK_XML);
    assert(workbookHasStructureLock(next), "sau patch phải có lockStructure=1|true");
    const tag = protectionSnippet(next);
    assert(/lockWindows="false"/i.test(tag), "giữ lockWindows có sẵn");
    assert(/lockStructure="1"/i.test(tag), "lockStructure=1");
    assert(/<workbookProtection\b[^>]*\/>/i.test(tag), "self-closing vẫn self-closing");
    assert((next.match(/<workbookProtection\b/gi) || []).length === 1, "không nhân đôi element");
    assertSchemaSlot(next);
  });

  test("Thiếu workbookProtection: chèn trước bookViews", () => {
    const xml = `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fileVersion appName="Calc"/><workbookPr/><bookViews><workbookView/></bookViews><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const next = applyWorkbookProtectionLockStructure(xml);
    assertSchemaSlot(next);
    assert(/<workbookProtection lockStructure="1"\/>/i.test(next), `tag=${protectionSnippet(next)}`);
  });

  test("Thiếu bookViews: chèn trước sheets", () => {
    const xml = `<?xml version="1.0"?><workbook><workbookPr/><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const next = applyWorkbookProtectionLockStructure(xml);
    const prot = next.search(/<workbookProtection\b/);
    const sheets = next.search(/<sheets\b/);
    assert(prot >= 0 && prot < sheets, "phải trước sheets");
  });

  test("Idempotent khi đã lockStructure=1", () => {
    const once = applyWorkbookProtectionLockStructure(LO_WORKBOOK_XML);
    const twice = applyWorkbookProtectionLockStructure(once);
    assert(once === twice, "patch lần hai không đổi XML");
  });

  test("lockStructure=0 được nâng lên 1", () => {
    const xml = `<workbook><workbookProtection lockStructure="0" lockWindows="false"/><sheets/></workbook>`;
    const next = applyWorkbookProtectionLockStructure(xml);
    assert(/lockStructure="1"/i.test(protectionSnippet(next)), protectionSnippet(next));
    assert(!/lockStructure="0"/i.test(next), "không còn 0");
  });

  test("FODS detect table:structure-protected; resolve từ grid/adapter", () => {
    const adapter = new SheetAdapter({
      sheets: ["A"],
      activeSheet: "A",
      sheetsData: { A: new Map() },
      workbookProtection: { enabled: true, password: "" }
    });
    assert(adapter.wantsNativeXlsxWorkbookProtection() === true, "adapter đọc grid");
    const fods = adapter.serializeToFods();
    assert(fodsHasStructureProtection(fods), "serialize FODS phải có structure-protected");
    assert(resolveWorkbookProtectionEnabled({ sourceFods: fods }) === true, "detect từ FODS");
    assert(resolveWorkbookProtectionEnabled({ grid: { workbookProtection: { enabled: false } } }) === false);
    assert(resolveWorkbookProtectionEnabled({ workbookProtectionEnabled: true, sourceFods: "<office:spreadsheet/>" }) === true, "boolean thắng FODS");
    assert(resolveWorkbookProtectionEnabled({ adapter }) === true);
    const off = new SheetAdapter({
      sheets: ["A"],
      activeSheet: "A",
      sheetsData: { A: new Map() },
      workbookProtection: { enabled: false, password: "" }
    });
    assert(off.wantsNativeXlsxWorkbookProtection() === false, "tắt thì không patch");
    assert(!fodsHasStructureProtection(off.serializeToFods()), "FODS tắt không có attr");
  });

  test("FIX-S17: chế độ tính toán round-trip trong metadata FODS", () => {
    const source = new SheetAdapter({
      sheets: ["A"], activeSheet: "A", sheetsData: { A: new Map() },
      commentsBySheet: { A: {} }, calculationMode: "manual"
    });
    const fods = source.serializeToFods();
    assert(/vno:calculation-mode="manual"/.test(fods), "FODS phải đánh dấu chế độ thủ công");
    const parsed = new SheetAdapter(null).parseFods(fods);
    assert(parsed.calculationMode === "manual", "parseFods phải khôi phục chế độ thủ công");
  });

  test("FIX-S17: hộp văn bản giữ nội dung, ô neo và kích thước qua FODS", () => {
    const source = new SheetAdapter({
      sheets: ["A"], activeSheet: "A", sheetsData: { A: new Map() }, commentsBySheet: { A: {} },
      textBoxesBySheet: { A: [{ text: "Hộp & dữ liệu", anchor: { c: "C", r: 4 }, widthPx: 240, heightPx: 90 }] }
    });
    const fods = source.serializeToFods();
    const parsed = new SheetAdapter(null).parseFods(fods);
    assert(parsed.textBoxesBySheet?.A?.length === 1, "parseFods phải khôi phục hộp văn bản");
    assert(parsed.textBoxesBySheet.A[0].text === "Hộp & dữ liệu", "nội dung phải được giữ");
    assert(parsed.textBoxesBySheet.A[0].anchor.c === "C" && parsed.textBoxesBySheet.A[0].anchor.r === 4, "vị trí phải được giữ");
    assert(parsed.textBoxesBySheet.A[0].widthPx === 240 && parsed.textBoxesBySheet.A[0].heightPx === 90, "kích thước phải được giữ");
  });

  test("FIX-S17: trạng thái Đã xử lý của ghi chú legacy round-trip trong FODS", () => {
    const source = new SheetAdapter({
      sheets: ["A"], activeSheet: "A", sheetsData: { A: new Map([["C2", { val: "ô", formula: "", style: {} }]]) },
      commentsBySheet: { A: { C2: { coord: "C2", text: "Nhận xét", author: "Người dùng", resolved: true } } }
    });
    const fods = source.serializeToFods();
    assert(/vno:resolved-comments="[^\"]*&quot;C2&quot;:true/.test(fods), "FODS phải mang trạng thái resolved");
    const parsed = new SheetAdapter(null).parseFods(fods);
    assert(parsed.commentsBySheet.A.C2.resolved === true, "parseFods phải khôi phục resolved=true");
  });

  test("postProcessSheetXlsx ghi lockStructure vào xl/workbook.xml; không đụng sheet1", () => {
    const zip = fakeXlsx(LO_WORKBOOK_XML);
    const patched = postProcessSheetXlsx(zip, { workbookProtectionEnabled: true });
    const xml = readZipEntry(patched, "xl/workbook.xml").toString("utf8");
    assert(workbookHasStructureLock(xml), xml.slice(0, 400));
    assertSchemaSlot(xml);
    const sheet = readZipEntry(patched, "xl/worksheets/sheet1.xml").toString("utf8");
    assert(/<worksheet\b/.test(sheet), "giữ worksheet");
  });

  test("postProcessSheetXlsx no-op khi không bật bảo vệ", () => {
    const zip = fakeXlsx(LO_WORKBOOK_XML);
    const patched = postProcessSheetXlsx(zip, { workbookProtectionEnabled: false });
    assert(Buffer.compare(zip, patched) === 0, "không rewrite ZIP khi không khóa");
    const xml = readZipEntry(patched, "xl/workbook.xml").toString("utf8");
    assert(!workbookHasStructureLock(xml), "không tự thêm lock khi enabled=false");
  });

  return results;
}
