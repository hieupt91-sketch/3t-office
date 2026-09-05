/**
 * VN Office — Unit tests: catalog Trợ giúp VN Slides
 */

import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";
import { getHelpEntriesForApp, getHelpEntryById } from "../../platform/help/help-catalog.js";
import { foldHelpText, searchHelpEntries } from "../../platform/help/help-service.js";
import { HelpPanel } from "../../platform/help/help-panel.js";
import { SLIDES_COMMANDS, WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

export async function runSlidesHelpTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Help Slides: catalog có ít nhất 10 bài quan trọng khớp UI", () => {
    const ids = SLIDES_HELP_ENTRIES.map((entry) => entry.id);
    const required = [
      "slides.diagram.insert",
      "slides.insert.chart",
      "slides.slide.toggleHidden",
      "slides.text.fontParagraph",
      "slides.insert.wordart",
      "slides.edit.formatPainter",
      "slides.design.formatBackground",
      "slides.view.slideSorter",
      "slides.animation.apply",
      "slides.animation.pane",
      "slides.show.setupShow",
      "slides.transition.apply"
    ];
    for (const id of required) {
      if (!ids.includes(id)) throw new Error(`Thiếu bài hướng dẫn ${id}`);
    }
    if (getHelpEntriesForApp("slides").length < 10) throw new Error("Catalog Slides quá mỏng");
    if (SLIDES_HELP_ENTRIES.some((entry) => entry.app !== "slides")) {
      throw new Error("Entry Slides gán sai app");
    }
  });

  await test("Help Slides: mỗi bài có tiêu đề, mô tả, vị trí ribbon và bước dùng thật", () => {
    const banned = /lorem|todo|placeholder|xxx|nội dung mẫu|coming soon/i;
    for (const entry of SLIDES_HELP_ENTRIES) {
      if (!entry.title || !entry.summary) throw new Error(`${entry.id} thiếu title/summary`);
      if (!entry.ribbon?.tab || !entry.ribbon?.group) throw new Error(`${entry.id} thiếu vị trí ribbon`);
      if (!Array.isArray(entry.steps) || entry.steps.length < 3) throw new Error(`${entry.id} thiếu bước dùng`);
      const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
      if (banned.test(blob)) throw new Error(`${entry.id} còn nội dung giả`);
    }
  });

  await test("Help Slides: tìm theo tên có dấu, không dấu và theo tab ribbon", () => {
    const byAccent = searchHelpEntries("chữ nghệ thuật", { app: "slides" });
    const byFolded = searchHelpEntries("chu nghe thuat", { app: "slides" });
    const sorter = searchHelpEntries("bộ sắp xếp", { app: "slides" });
    const insertTab = searchHelpEntries("Chèn", { app: "slides" });
    if (!byAccent.some((entry) => entry.id === "slides.insert.wordart")) {
      throw new Error("Không tìm thấy WordArt theo tên có dấu");
    }
    if (!byFolded.some((entry) => entry.id === "slides.insert.wordart")) {
      throw new Error("Không tìm thấy WordArt khi bỏ dấu");
    }
    if (!sorter.some((entry) => entry.id === "slides.view.slideSorter")) {
      throw new Error("Không tìm thấy Bộ sắp xếp trang");
    }
    if (!insertTab.some((entry) => entry.id === "slides.diagram.insert" || entry.id === "slides.insert.chart")) {
      throw new Error("Tìm theo tab Chèn không ra Sơ đồ / Biểu đồ");
    }
    if (foldHelpText("Chữ nghệ thuật") !== "chu nghe thuat") throw new Error("foldHelpText không bỏ dấu tiếng Việt");
  });

  await test("Help Slides: getHelpEntryById nhận cả id bài và commandId thành viên", () => {
    const byGroup = getHelpEntryById("slides.text.fontParagraph");
    const byCommand = getHelpEntryById("slides.text.bold");
    if (!byGroup || byGroup.title !== "Định dạng chữ và đoạn văn") throw new Error("Sai bài theo id nhóm");
    if (!byCommand || byCommand.id !== "slides.text.fontParagraph") throw new Error("Sai bài theo commandId");
  });

  await test("Help Slides: lệnh slides.help.open (F1), icon, i18n và tab Trợ giúp", () => {
    const cmd = SLIDES_COMMANDS.find((item) => item.id === "slides.help.open");
    if (!cmd) throw new Error("Thiếu slides.help.open");
    if (cmd.shortcut !== "F1") throw new Error("Help Slides phải gắn F1 (scope slides)");
    if (!cmd.isToggle) throw new Error("slides.help.open phải isToggle");
    if (!ICONS.help?.includes("<svg")) throw new Error("Thiếu icon help");
    if (!viStrings.commands["slides.help.open"]?.label) throw new Error("Thiếu i18n VI");
    if (!enStrings.commands["slides.help.open"]?.label) throw new Error("Thiếu i18n EN");
    const writerHelp = WRITER_COMMANDS.find((item) => item.id === "writer.help.open");
    if (!writerHelp || writerHelp.shortcut !== "F1") throw new Error("Không được làm hỏng F1 Writer");
    const helpTab = SLIDES_RIBBON_TABS.find((tab) => tab.id === "help");
    const ids = flattenRibbonItems(helpTab?.groups?.[0]?.items || []).map((item) => item.commandId);
    if (!ids.includes("slides.help.open")) throw new Error("Tab Trợ giúp Slides thiếu nút mở panel");
  });

  await test("Help Slides: HelpPanel lọc danh sách theo query, không lộ bài Writer/Sheet", () => {
    const panel = new HelpPanel({ app: "slides" });
    panel._query = "smartart";
    const visible = panel.getVisibleEntries();
    if (!visible.some((entry) => entry.id === "slides.diagram.insert")) {
      throw new Error("Panel không lọc được Sơ đồ/SmartArt");
    }
    if (visible.some((entry) => entry.id === "slides.transition.apply")) {
      throw new Error("Panel lộ bài không khớp query");
    }
    if (visible.some((entry) => entry.app !== "slides")) {
      throw new Error("Panel Slides lộ bài Writer/Sheet");
    }
  });

  await test("Help Slides: không làm hỏng catalog Writer", () => {
    const writer = getHelpEntriesForApp("writer");
    if (writer.length < 6) throw new Error("Catalog Writer bị mất bài");
    if (!getHelpEntryById("writer.trackChanges")) throw new Error("Mất bài Theo dõi thay đổi");
    if (searchHelpEntries("trích dẫn", { app: "slides" }).some((entry) => entry.app === "writer")) {
      throw new Error("Tìm Slides lại ra bài Writer");
    }
  });

  return results;
}
