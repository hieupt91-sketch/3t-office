/**
 * VN Office — Unit tests: catalog Trợ giúp VN Sheet
 */

import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { getHelpEntriesForApp, getHelpEntryById } from "../../platform/help/help-catalog.js";
import { foldHelpText, searchHelpEntries } from "../../platform/help/help-service.js";
import { HelpPanel } from "../../platform/help/help-panel.js";
import { SHEET_COMMANDS, WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

export async function runSheetHelpTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Help Sheet: catalog có ít nhất 10 bài quan trọng khớp UI", () => {
    const ids = SHEET_HELP_ENTRIES.map((entry) => entry.id);
    const required = [
      "sheet.formula.basic",
      "sheet.format.number",
      "sheet.format.cellsDialog",
      "sheet.cells.format",
      "sheet.data.pivotTable",
      "sheet.format.conditional",
      "sheet.data.validation",
      "sheet.data.goalSeek",
      "sheet.edit.formatPainter",
      "sheet.selection.range",
      "sheet.chart.insert",
      "sheet.view.freezePanes"
    ];
    for (const id of required) {
      if (!ids.includes(id)) throw new Error(`Thiếu bài hướng dẫn ${id}`);
    }
    if (getHelpEntriesForApp("sheet").length < 10) throw new Error("Catalog Sheet quá mỏng");
    if (SHEET_HELP_ENTRIES.some((entry) => entry.app !== "sheet")) {
      throw new Error("Entry Sheet gán sai app");
    }
  });

  await test("Help Sheet: mỗi bài có tiêu đề, mô tả, vị trí ribbon và bước dùng thật", () => {
    const banned = /lorem|todo|placeholder|xxx|nội dung mẫu|coming soon/i;
    for (const entry of SHEET_HELP_ENTRIES) {
      if (!entry.title || !entry.summary) throw new Error(`${entry.id} thiếu title/summary`);
      if (!entry.ribbon?.tab || !entry.ribbon?.group) throw new Error(`${entry.id} thiếu vị trí ribbon`);
      if (!Array.isArray(entry.steps) || entry.steps.length < 3) throw new Error(`${entry.id} thiếu bước dùng`);
      const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
      if (banned.test(blob)) throw new Error(`${entry.id} còn nội dung giả`);
    }
  });

  await test("Help Sheet: tìm theo tên có dấu, không dấu và theo tab ribbon", () => {
    const byAccent = searchHelpEntries("bảng tổng hợp", { app: "sheet" });
    const byFolded = searchHelpEntries("bang tong hop", { app: "sheet" });
    const goalSeek = searchHelpEntries("dò tìm mục tiêu", { app: "sheet" });
    const homeTab = searchHelpEntries("Trang đầu", { app: "sheet" });
    if (!byAccent.some((entry) => entry.id === "sheet.data.pivotTable")) {
      throw new Error("Không tìm thấy Pivot theo tên có dấu");
    }
    if (!byFolded.some((entry) => entry.id === "sheet.data.pivotTable")) {
      throw new Error("Không tìm thấy Pivot khi bỏ dấu");
    }
    if (!goalSeek.some((entry) => entry.id === "sheet.data.goalSeek")) {
      throw new Error("Không tìm thấy Dò tìm mục tiêu");
    }
    if (!homeTab.some((entry) => entry.id === "sheet.format.number" || entry.id === "sheet.edit.formatPainter")) {
      throw new Error("Tìm theo tab Trang đầu không ra Định dạng số / Format Painter");
    }
    if (foldHelpText("Bảng tổng hợp") !== "bang tong hop") throw new Error("foldHelpText không bỏ dấu tiếng Việt");
  });

  await test("Help Sheet: getHelpEntryById nhận cả id bài và commandId thành viên", () => {
    const byGroup = getHelpEntryById("sheet.data.pivotTable");
    const byCommand = getHelpEntryById("sheet.data.pivotRefresh");
    if (!byGroup || byGroup.title !== "Bảng tổng hợp (Pivot Table)") throw new Error("Sai bài theo id nhóm");
    if (!byCommand || byCommand.id !== "sheet.data.pivotTable") throw new Error("Sai bài theo commandId");
  });

  await test("Help Sheet: lệnh sheet.help.open (F1), icon, i18n và tab Trợ giúp", () => {
    const cmd = SHEET_COMMANDS.find((item) => item.id === "sheet.help.open");
    if (!cmd) throw new Error("Thiếu sheet.help.open");
    if (cmd.shortcut !== "F1") throw new Error("Help Sheet phải gắn F1 (scope sheet, không đụng Writer)");
    if (!cmd.isToggle) throw new Error("sheet.help.open phải isToggle");
    if (!ICONS.help?.includes("<svg")) throw new Error("Thiếu icon help");
    if (!viStrings.commands["sheet.help.open"]?.label) throw new Error("Thiếu i18n VI");
    if (!enStrings.commands["sheet.help.open"]?.label) throw new Error("Thiếu i18n EN");
    const writerHelp = WRITER_COMMANDS.find((item) => item.id === "writer.help.open");
    if (!writerHelp || writerHelp.shortcut !== "F1") throw new Error("Không được làm hỏng F1 Writer");
    const helpTab = SHEET_RIBBON_TABS.find((tab) => tab.id === "help");
    const ids = flattenRibbonItems(helpTab?.groups?.[0]?.items || []).map((item) => item.commandId);
    if (!ids.includes("sheet.help.open")) throw new Error("Tab Trợ giúp Sheet thiếu nút mở panel");
  });

  await test("Help Sheet: HelpPanel lọc danh sách theo query, không lộ bài Writer", () => {
    const panel = new HelpPanel({ app: "sheet" });
    panel._query = "pivot";
    const visible = panel.getVisibleEntries();
    if (!visible.some((entry) => entry.id === "sheet.data.pivotTable")) {
      throw new Error("Panel không lọc được Pivot");
    }
    if (visible.some((entry) => entry.id === "sheet.data.goalSeek")) {
      throw new Error("Panel lộ bài không khớp query");
    }
    if (visible.some((entry) => entry.app !== "sheet")) {
      throw new Error("Panel Sheet lộ bài Writer/Slides");
    }
  });

  await test("Help Sheet Batch 1: có bài định dạng ô, dữ liệu, xem trang, hàng/cột và chèn cơ bản", () => {
    const ids = SHEET_HELP_ENTRIES.map((entry) => entry.id);
    const required = [
      "sheet.cell.font",
      "sheet.cell.alignment",
      "sheet.data.sortFilter",
      "sheet.data.toolsBasic",
      "sheet.data.outline",
      "sheet.view.workbookViews",
      "sheet.view.show",
      "sheet.view.zoom",
      "sheet.cells.insertDelete",
      "sheet.insert.image",
      "sheet.insert.hyperlink",
      "sheet.insert.textbox",
      "sheet.insert.dateTime"
    ];
    for (const id of required) {
      if (!ids.includes(id)) throw new Error(`Thiếu bài hướng dẫn ${id}`);
    }
    const byId = Object.fromEntries(SHEET_HELP_ENTRIES.map((entry) => [entry.id, entry]));
    const expectCmds = {
      "sheet.cell.font": ["sheet.cell.bold", "sheet.font.family", "sheet.cell.fillColor"],
      "sheet.cell.alignment": ["sheet.cell.mergeCenter", "sheet.cell.wrapText", "sheet.cell.alignMiddle", "sheet.cell.orientation"],
      "sheet.data.sortFilter": ["sheet.data.sortAsc", "sheet.data.filter"],
      "sheet.data.toolsBasic": ["sheet.data.textToColumns", "sheet.data.flashFill", "sheet.data.removeDuplicates"],
      "sheet.data.outline": ["sheet.data.group", "sheet.data.subtotal"],
      "sheet.view.workbookViews": ["sheet.view.normal", "sheet.view.pageBreakPreview", "sheet.view.pageLayout"],
      "sheet.view.show": ["sheet.view.formulaBar", "sheet.view.gridlines", "sheet.view.headings"],
      "sheet.view.zoom": ["sheet.view.zoomIn", "sheet.view.zoomReset"],
      "sheet.cells.insertDelete": ["sheet.row.insert", "sheet.col.delete"],
      "sheet.insert.image": ["sheet.insert.image"],
      "sheet.insert.hyperlink": ["sheet.insert.hyperlink"],
      "sheet.insert.textbox": ["sheet.insert.textbox"],
      "sheet.insert.dateTime": ["sheet.insert.date", "sheet.insert.time"]
    };
    for (const [id, cmds] of Object.entries(expectCmds)) {
      const entry = byId[id];
      for (const cmd of cmds) {
        if (!(entry.commandIds || []).includes(cmd)) {
          throw new Error(`${id} thiếu commandId ${cmd}`);
        }
      }
    }
    if (byId["sheet.cell.alignment"].ribbon.group !== "Căn chỉnh") {
      throw new Error("Bài căn chỉnh/trộn ô phải trỏ nhóm Căn chỉnh");
    }
    if (byId["sheet.data.sortFilter"].ribbon.tab !== "Dữ liệu") {
      throw new Error("Bài sắp xếp/lọc phải ở tab Dữ liệu");
    }
  });

  await test("Help Sheet Batch 2: có bài công thức nâng cao, dán đặc biệt, in và kiểu ô", () => {
    const ids = SHEET_HELP_ENTRIES.map((entry) => entry.id);
    const required = [
      "sheet.formula.functionCategories",
      "sheet.formula.namedRanges",
      "sheet.formula.auditing",
      "sheet.formula.calculation",
      "sheet.edit.pasteSpecialHelp",
      "sheet.nav.keyboardSelect",
      "sheet.view.zoomWindowExtra",
      "sheet.review.spellCheck",
      "sheet.review.commentInsert",
      "sheet.page.printAreaBreaks",
      "sheet.insert.sparklines",
      "sheet.style.tableAndCells",
      "sheet.edit.fillAndClear",
      "sheet.edit.findReplace"
    ];
    for (const id of required) {
      if (!ids.includes(id)) throw new Error(`Thiếu bài hướng dẫn ${id}`);
    }
    const byId = Object.fromEntries(SHEET_HELP_ENTRIES.map((entry) => [entry.id, entry]));
    const expectCmds = {
      "sheet.formula.functionCategories": ["sheet.formula.categoryFinancial", "sheet.formula.categoryMore", "sheet.formula.categoryLookup"],
      "sheet.formula.namedRanges": ["sheet.formula.nameManager", "sheet.formula.createFromSelection", "sheet.formula.useInFormula"],
      "sheet.formula.auditing": ["sheet.formula.tracePrecedents", "sheet.formula.watchWindow", "sheet.view.toggleFormulas"],
      "sheet.formula.calculation": ["sheet.calc.modeManual", "sheet.formula.recalculate", "sheet.formula.arrayEnter"],
      "sheet.edit.pasteSpecialHelp": ["sheet.edit.pasteSpecial"],
      "sheet.nav.keyboardSelect": ["sheet.nav.home", "sheet.cell.edit", "sheet.select.column"],
      "sheet.view.zoomWindowExtra": ["sheet.view.zoomToSelection", "sheet.view.newWindow"],
      "sheet.review.spellCheck": ["sheet.review.spellCheck"],
      "sheet.review.commentInsert": ["sheet.review.commentInsert"],
      "sheet.page.printAreaBreaks": ["sheet.page.setPrintArea", "sheet.page.insertPageBreak"],
      "sheet.insert.sparklines": ["sheet.insert.sparklineLine", "sheet.insert.sparklineColumn"],
      "sheet.style.tableAndCells": ["sheet.style.formatAsTable", "sheet.style.cellStyles"],
      "sheet.edit.fillAndClear": ["sheet.edit.fillDown", "sheet.edit.clearContents"],
      "sheet.edit.findReplace": ["common.edit.find", "common.edit.replace"]
    };
    for (const [id, cmds] of Object.entries(expectCmds)) {
      const entry = byId[id];
      for (const cmd of cmds) {
        if (!(entry.commandIds || []).includes(cmd)) {
          throw new Error(`${id} thiếu commandId ${cmd}`);
        }
      }
    }
    if (byId["sheet.formula.namedRanges"].ribbon.group !== "Tên đã xác định") {
      throw new Error("Bài named range phải trỏ nhóm Tên đã xác định");
    }
    if (byId["sheet.formula.auditing"].ribbon.tab !== "Công thức") {
      throw new Error("Bài kiểm tra công thức phải ở tab Công thức");
    }
    if (byId["sheet.review.spellCheck"].ribbon.tab !== "Xem xét") {
      throw new Error("Bài chính tả Sheet phải ở tab Xem xét");
    }
    // Ribbon rework (main 6050354) moved Print Area / Breaks into Page Setup, like Excel.
    if (byId["sheet.page.printAreaBreaks"].ribbon.group !== "Thiết lập trang") {
      throw new Error("Bài vùng in phải trỏ nhóm Thiết lập trang");
    }
    if (byId["sheet.edit.findReplace"].ribbon.group !== "Chỉnh sửa") {
      throw new Error("Bài Tìm/Thay thế phải trỏ nhóm Chỉnh sửa");
    }
  });

  await test("Help Sheet: có bài Ước lượng công thức khớp ribbon tab Công thức", () => {
    const entry = getHelpEntryById("sheet.formula.evaluateFormula");
    if (!entry) throw new Error("Thiếu bài sheet.formula.evaluateFormula");
    if (entry.ribbon?.tab !== "Công thức" || entry.ribbon?.group !== "Kiểm tra công thức") {
      throw new Error("Bài Evaluate Formula phải ở tab Công thức / nhóm Kiểm tra công thức");
    }
    if (!(entry.commandIds || []).includes("sheet.formula.evaluateFormula")) {
      throw new Error("Bài Evaluate Formula thiếu commandId");
    }
    if (entry.steps.length < 3) throw new Error("Bài Evaluate Formula thiếu bước dùng");
    const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
    if (!/Ước lượng/.test(blob) || !/gạch chân/.test(blob)) {
      throw new Error("Bài Evaluate Formula chưa mô tả nút Ước lượng / gạch chân");
    }
    const found = searchHelpEntries("ước lượng công thức", { app: "sheet" });
    if (!found.some((item) => item.id === "sheet.formula.evaluateFormula")) {
      throw new Error("Không tìm thấy Ước lượng công thức trong catalog");
    }
  });

  await test("Help Sheet: hướng dẫn cụ thể các hàm thống kê và ngày nâng cao", () => {
    const entry = getHelpEntryById("sheet.formula.excel2016Functions");
    if (!entry || entry.ribbon?.tab !== "Công thức" || entry.ribbon?.group !== "Hàm tính toán") {
      throw new Error("Thiếu bài hướng dẫn hàm nâng cao tại Công thức / Hàm tính toán");
    }
    const content = [entry.title, entry.summary, ...entry.steps].join(" ");
    for (const name of ["MODE", "PERCENTILE", "ADDRESS", "FORMULATEXT", "YEARFRAC"]) {
      if (!content.includes(name)) throw new Error(`Bài hướng dẫn thiếu ${name}`);
    }
    if (!searchHelpEntries("YEARFRAC", { app: "sheet" }).some(item => item.id === entry.id)) {
      throw new Error("Không tìm được bài hướng dẫn YEARFRAC trong Trợ giúp Sheet");
    }
  });

  await test("Help Sheet: có bài Hợp nhất dữ liệu khớp ribbon tab Dữ liệu", () => {
    const entry = getHelpEntryById("sheet.data.consolidate");
    if (!entry) throw new Error("Thiếu bài sheet.data.consolidate");
    if (entry.ribbon?.tab !== "Dữ liệu" || entry.ribbon?.group !== "Công cụ dữ liệu") {
      throw new Error("Bài Consolidate phải ở tab Dữ liệu / nhóm Công cụ dữ liệu");
    }
    if (!(entry.commandIds || []).includes("sheet.data.consolidate")) {
      throw new Error("Bài Consolidate thiếu commandId");
    }
    if (entry.steps.length < 3) throw new Error("Bài Consolidate thiếu bước dùng");
    const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
    if (!/Hợp nhất/.test(blob) || !/Duyệt/.test(blob) || !/Nhãn ở hàng trên/.test(blob)) {
      throw new Error("Bài Consolidate chưa mô tả nút Hợp nhất / Duyệt / nhãn hàng trên");
    }
    const found = searchHelpEntries("hợp nhất dữ liệu", { app: "sheet" });
    if (!found.some((item) => item.id === "sheet.data.consolidate")) {
      throw new Error("Không tìm thấy Hợp nhất dữ liệu trong catalog");
    }
  });

  await test("Help Sheet: không làm hỏng catalog Writer", () => {
    const writer = getHelpEntriesForApp("writer");
    if (writer.length < 6) throw new Error("Catalog Writer bị mất bài");
    if (!getHelpEntryById("writer.review.wordCount")) throw new Error("Mất bài Đếm từ");
    if (searchHelpEntries("đếm từ", { app: "sheet" }).some((entry) => entry.id === "writer.review.wordCount")) {
      throw new Error("Tìm Sheet lại ra bài Writer");
    }
  });

  return results;
}
