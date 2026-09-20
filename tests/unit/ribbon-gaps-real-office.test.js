import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

export async function runRibbonGapsRealOfficeTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const flatten = items => items.flatMap(item => item.items ? flatten(item.items) : [item]);

  await test("Ribbon gaps: Sheet Font giữ đúng thứ tự select/select/grow/shrink trước B/I/U", () => {
    const group = SHEET_RIBBON_TABS[0].groups.find(item => item.labelKey === "sheetRibbon.group.font");
    const ids = flatten(group.items).map(item => item.commandId);
    assert(JSON.stringify(ids.slice(0, 7)) === JSON.stringify([
      "sheet.font.family", "sheet.font.size", "sheet.font.grow", "sheet.font.shrink",
      "sheet.cell.bold", "sheet.cell.italic", "sheet.cell.underline"
    ]), `Thứ tự Font sai: ${ids.join(", ")}`);
  });

  await test("Ribbon gaps: Sheet Alignment và Number có đủ command quan sát từ Excel", () => {
    const groups = SHEET_RIBBON_TABS[0].groups;
    const alignment = flatten(groups.find(item => item.labelKey === "sheetRibbon.group.alignment").items).map(item => item.commandId);
    const number = flatten(groups.find(item => item.labelKey === "sheetRibbon.group.number").items).map(item => item.commandId);
    ["sheet.cell.alignTop", "sheet.cell.alignMiddle", "sheet.cell.alignBottom", "sheet.cell.wrapText", "sheet.cell.orientation", "sheet.cell.indentIncrease", "sheet.cell.indentDecrease"]
      .forEach(id => assert(alignment.includes(id), `Thiếu ${id}`));
    ["sheet.format.quickCategory", "sheet.format.increaseDecimal", "sheet.format.decreaseDecimal"]
      .forEach(id => assert(number.includes(id), `Thiếu ${id}`));
  });

  await test("Ribbon gaps: Sheet lưu font, wrap, indent và numberFormat trong item.style", () => {
    const container = { querySelector: () => null, querySelectorAll: () => [] };
    const grid = new SheetGridController(container);
    grid.setFontFamily("Calibri"); grid.setFontSize(11); grid.adjustFontSize(1);
    grid.toggleWrapText(); grid.adjustIndent(1);
    grid.applyQuickNumberCategory("currency"); grid.adjustDecimalPlaces(1);
    const style = grid.cellsData.get("A1").style;
    assert(style.fontFamily === "Calibri" && style.fontSize === "16px", "Font style không đúng theo đơn vị pt");
    assert(style.whiteSpace === "normal" && style.paddingLeft === "20px", "Wrap/indent không đúng");
    assert(style.numberFormat.category === "currency" && style.numberFormat.decimals === 3, "Number format không đúng");
  });

  await test("Ribbon gaps: Writer Home có Sort/¶/Shading/Borders và icon Change Case Aa riêng", () => {
    const groups = WRITER_RIBBON_TABS[0].groups;
    const font = flatten(groups.find(group => group.id === "font").items).map(item => item.commandId);
    const paragraph = flatten(groups.find(group => group.id === "paragraph").items).map(item => item.commandId);
    assert(font.includes("writer.text.changeCase"), "Thiếu Change Case");
    ["writer.para.sort", "writer.para.showFormattingMarks", "writer.para.shading", "writer.para.borders"]
      .forEach(id => assert(paragraph.includes(id), `Thiếu ${id}`));
    assert(globalCommandBus.getDefinition("writer.text.changeCase")?.icon === "changeCase", "Change Case còn dùng icon tạm");
    assert(ICONS.changeCase.includes("<svg") && ICONS.changeCase.includes("path"), "Icon Aa không phải SVG vector thật");
  });

  return results;
}
