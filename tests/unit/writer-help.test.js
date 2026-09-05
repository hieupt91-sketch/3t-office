/**
 * VN Office — Unit tests: cơ chế Trợ giúp dùng chung + nội dung Writer
 */

import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { getHelpEntriesForApp, getHelpEntryById, HELP_ENTRIES, registerHelpEntries } from "../../platform/help/help-catalog.js";
import { foldHelpText, searchHelpEntries } from "../../platform/help/help-service.js";
import { HelpPanel } from "../../platform/help/help-panel.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

export async function runWriterHelpTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Help: catalog Writer có Word Count, Track Changes và ít nhất 4 tính năng sẵn có", () => {
    const ids = WRITER_HELP_ENTRIES.map((entry) => entry.id);
    const required = [
      "writer.review.wordCount",
      "writer.trackChanges",
      "writer.reference.citations",
      "writer.reference.captions",
      "writer.mailMerge",
      "writer.reference.toc"
    ];
    for (const id of required) {
      if (!ids.includes(id)) throw new Error(`Thiếu bài hướng dẫn ${id}`);
    }
    if (getHelpEntriesForApp("writer").length < 6) throw new Error("Catalog Writer quá mỏng");
    if (getHelpEntriesForApp("sheet").length !== 0) throw new Error("Sheet chưa được phép có entry trong task này");
  });

  await test("Help: mỗi bài có tiêu đề, mô tả, vị trí ribbon và bước dùng thật (không placeholder)", () => {
    const banned = /lorem|todo|placeholder|xxx|nội dung mẫu|coming soon/i;
    for (const entry of WRITER_HELP_ENTRIES) {
      if (!entry.title || !entry.summary) throw new Error(`${entry.id} thiếu title/summary`);
      if (!entry.ribbon?.tab || !entry.ribbon?.group) throw new Error(`${entry.id} thiếu vị trí ribbon`);
      if (!Array.isArray(entry.steps) || entry.steps.length < 3) throw new Error(`${entry.id} thiếu bước dùng`);
      const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
      if (banned.test(blob)) throw new Error(`${entry.id} còn nội dung giả`);
    }
  });

  await test("Help: tìm theo tên có dấu, không dấu và theo tab ribbon", () => {
    const byAccent = searchHelpEntries("đếm từ", { app: "writer" });
    const byFolded = searchHelpEntries("dem tu", { app: "writer" });
    const citations = searchHelpEntries("trích dẫn", { app: "writer" });
    const reviewTab = searchHelpEntries("Đánh giá", { app: "writer" });
    if (!byAccent.some((entry) => entry.id === "writer.review.wordCount")) {
      throw new Error("Không tìm thấy Đếm từ theo tên có dấu");
    }
    if (!byFolded.some((entry) => entry.id === "writer.review.wordCount")) {
      throw new Error("Không tìm thấy Đếm từ khi bỏ dấu");
    }
    if (!citations.some((entry) => entry.id === "writer.reference.citations")) {
      throw new Error("Không tìm thấy Trích dẫn");
    }
    if (!reviewTab.some((entry) => entry.id === "writer.review.wordCount" || entry.id === "writer.trackChanges")) {
      throw new Error("Tìm theo tab Đánh giá không ra Word Count/Track Changes");
    }
    if (foldHelpText("Đếm từ") !== "dem tu") throw new Error("foldHelpText không bỏ dấu tiếng Việt");
  });

  await test("Help: getHelpEntryById nhận cả id bài và commandId thành viên", () => {
    const byGroup = getHelpEntryById("writer.trackChanges");
    const byCommand = getHelpEntryById("writer.trackChanges.acceptOne");
    if (!byGroup || byGroup.title !== "Theo dõi thay đổi") throw new Error("Sai bài theo id nhóm");
    if (!byCommand || byCommand.id !== "writer.trackChanges") throw new Error("Sai bài theo commandId");
  });

  await test("Help: lệnh writer.help.open (F1), icon, i18n và tab Trợ giúp trên ribbon Writer", () => {
    const cmd = WRITER_COMMANDS.find((item) => item.id === "writer.help.open");
    if (!cmd) throw new Error("Thiếu writer.help.open");
    if (cmd.shortcut !== "F1") throw new Error("Help phải gắn F1");
    if (!ICONS.help?.includes("<svg")) throw new Error("Thiếu icon help");
    if (!viStrings.commands["writer.help.open"]?.label) throw new Error("Thiếu i18n VI");
    if (!enStrings.commands["writer.help.open"]?.label) throw new Error("Thiếu i18n EN");
    const helpTab = WRITER_RIBBON_TABS.find((tab) => tab.id === "help");
    const ids = flattenRibbonItems(helpTab?.groups?.[0]?.items || []).map((item) => item.commandId);
    if (!ids.includes("writer.help.open")) throw new Error("Tab Trợ giúp thiếu nút mở panel");
  });

  await test("Help: HelpPanel lọc danh sách theo query mà không cần DOM", () => {
    const panel = new HelpPanel({ app: "writer" });
    panel._query = "caption";
    const visible = panel.getVisibleEntries();
    if (!visible.some((entry) => entry.id === "writer.reference.captions")) {
      throw new Error("Panel không lọc được Chú thích ảnh");
    }
    if (visible.some((entry) => entry.id === "writer.mailMerge")) {
      throw new Error("Panel lộ bài không khớp query");
    }
  });

  await test("Help: registerHelpEntries cho phép app khác bổ sung sau này", () => {
    const before = HELP_ENTRIES.length;
    registerHelpEntries([{
      id: "sheet.help.probe",
      app: "sheet",
      title: "Probe",
      summary: "Chỉ dùng trong test, sẽ gỡ ngay.",
      ribbon: { tab: "Trang đầu", group: "Clipboard" },
      steps: ["Một", "Hai", "Ba"]
    }]);
    const added = getHelpEntryById("sheet.help.probe");
    if (!added) throw new Error("registerHelpEntries không thêm được");
    const idx = HELP_ENTRIES.findIndex((entry) => entry.id === "sheet.help.probe");
    if (idx >= 0) HELP_ENTRIES.splice(idx, 1);
    if (HELP_ENTRIES.length !== before) throw new Error("Không gỡ probe test");
  });

  return results;
}
