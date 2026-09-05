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
