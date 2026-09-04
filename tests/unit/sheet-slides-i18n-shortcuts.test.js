import { setLocale, t, tCommand, applyLocaleToTabs } from "../../platform/i18n/i18n.js";
import { COMMON_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";

export async function runSheetSlidesI18nShortcutTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  await test("Sheet/Slides i18n: mọi command có label và tooltip VI/EN", () => {
    for (const locale of ["vi", "en"]) { setLocale(locale); for (const command of [...SHEET_COMMANDS, ...SLIDES_COMMANDS]) if (!tCommand(command.id, "label") || !tCommand(command.id, "tooltip")) throw new Error(`${locale} thiếu ${command.id}`); }
  });
  await test("Sheet/Slides i18n: thuật ngữ command chuẩn đổi EN và VI", () => {
    setLocale("en"); if (tCommand("sheet.data.pivotTable", "label") !== "PivotTable" || tCommand("slides.show.rehearseTimings", "label") !== "Rehearse Timings") throw new Error("Nhãn EN sai");
    setLocale("vi"); if (tCommand("sheet.data.pivotTable", "label") !== "Bảng tổng hợp" || tCommand("slides.show.rehearseTimings", "label") !== "Tập dượt hẹn giờ") throw new Error("Nhãn VI sai");
  });
  await test("Sheet/Slides i18n: mọi tab và group có key hợp lệ", () => {
    for (const locale of ["vi", "en"]) { setLocale(locale); for (const tabs of [SHEET_RIBBON_TABS, SLIDES_RIBBON_TABS]) for (const tab of tabs) { if (!tab.labelKey || t(tab.labelKey) === tab.labelKey) throw new Error(`${locale} thiếu tab ${tab.id}`); for (const group of tab.groups) if (!group.labelKey || t(group.labelKey) === group.labelKey) throw new Error(`${locale} thiếu group ${group.label}`); } }
  });
  await test("Sheet/Slides i18n: ribbon clone đổi EN/VI, không mutate fallback", () => {
    setLocale("en"); if (applyLocaleToTabs(SHEET_RIBBON_TABS)[0].groups[1].label !== "Font" || applyLocaleToTabs(SLIDES_RIBBON_TABS).find(tab => tab.id === "slideshow")?.label !== "Slide Show") throw new Error("Ribbon EN sai");
    if (SHEET_RIBBON_TABS[0].label !== "Trang đầu") throw new Error("Đã mutate fallback"); setLocale("vi"); if (applyLocaleToTabs(SLIDES_RIBBON_TABS)[0].label !== "Trang đầu") throw new Error("Ribbon VI sai");
  });
  await test("Sheet/Slides i18n: dialog chính có EN/VI", () => {
    setLocale("en"); if (t("sheetDialogs.pivotTitle") !== "Create PivotTable" || t("slidesDialogs.animationTitle") !== "Object Animations") throw new Error("Dialog EN sai");
    setLocale("vi"); if (t("sheetDialogs.pivotTitle") !== "Tạo Bảng tổng hợp" || t("slidesDialogs.animationTitle") !== "Hiệu Ứng Đối Tượng (Object Animations)") throw new Error("Dialog VI sai");
  });
  const assertUnique = (name, commands) => { const seen = new Map(); for (const command of [...COMMON_COMMANDS, ...commands]) { if (!command.shortcut) continue; const key = command.shortcut.toLowerCase(); if (seen.has(key)) throw new Error(`${name}: ${command.shortcut}: ${seen.get(key)} / ${command.id}`); seen.set(key, command.id); } };
  await test("Sheet shortcuts: không trùng trong app hoặc common", () => assertUnique("Sheet", SHEET_COMMANDS));
  await test("Slides shortcuts: không trùng trong app hoặc common", () => assertUnique("Slides", SLIDES_COMMANDS));
  await test("Shortcut Excel/PowerPoint trọng yếu đúng chuẩn", () => {
    const expected = { "sheet.row.insert": "Ctrl+Shift+=", "sheet.formula.sum": "Alt+=", "sheet.data.filter": "Ctrl+Shift+L", "slides.slide.new": "Ctrl+M", "slides.slide.duplicate": "Ctrl+D", "slides.show.startFromBegin": "F5", "slides.show.startFromCurrent": "Shift+F5" };
    for (const [id, shortcut] of Object.entries(expected)) if ([...SHEET_COMMANDS, ...SLIDES_COMMANDS].find(item => item.id === id)?.shortcut !== shortcut) throw new Error(`${id} != ${shortcut}`);
  });
  setLocale("vi"); return results;
}
