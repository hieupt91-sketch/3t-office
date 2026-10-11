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
import { getWriterContextHelpEntryId } from "../../apps/writer/writer-app.js";

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
    const writerOnly = getHelpEntriesForApp("writer");
    if (writerOnly.some((entry) => entry.app !== "writer")) {
      throw new Error("getHelpEntriesForApp(writer) lẫn entry app khác");
    }
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

  await test("Help: F1 mở đúng bài theo nút ribbon đang focus", () => {
    const trackToggle = { closest: () => ({ dataset: { commandId: "writer.trackChanges.toggle" } }) };
    const tableInsert = { closest: () => ({ dataset: { commandId: "writer.table.insert" } }) };
    const unknown = { closest: () => ({ dataset: { commandId: "sheet.cell.bold" } }) };
    if (getWriterContextHelpEntryId(trackToggle) !== "writer.trackChanges") throw new Error("F1 không phân giải nút Theo dõi thay đổi");
    if (getWriterContextHelpEntryId(tableInsert) !== "writer.table.insert") throw new Error("F1 không phân giải nút Chèn bảng");
    if (getWriterContextHelpEntryId(unknown) !== null) throw new Error("Writer không nhận bài hướng dẫn của app khác");
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

  await test("Help Writer Batch 1: có bài định dạng chữ, căn lề, chèn cơ bản và xem trang", () => {
    const ids = WRITER_HELP_ENTRIES.map((entry) => entry.id);
    const required = [
      "writer.text.basicFormat",
      "writer.para.alignAndList",
      "writer.table.insert",
      "writer.image.insert",
      "writer.headerFooter",
      "writer.insert.textObjects",
      "writer.insert.symbol",
      "writer.view.layouts",
      "writer.view.zoom"
    ];
    for (const id of required) {
      if (!ids.includes(id)) throw new Error(`Thiếu bài hướng dẫn ${id}`);
    }
    const byId = Object.fromEntries(WRITER_HELP_ENTRIES.map((entry) => [entry.id, entry]));
    const expectCmds = {
      "writer.text.basicFormat": ["writer.text.bold", "writer.text.italic", "writer.font.family", "writer.color.text"],
      "writer.para.alignAndList": ["writer.para.alignLeft", "writer.list.bullet", "writer.para.spacing15"],
      "writer.table.insert": ["writer.table.insert"],
      "writer.image.insert": ["writer.image.insert"],
      "writer.headerFooter": ["writer.header.insert", "writer.footer.insert"],
      "writer.insert.textObjects": ["writer.insert.textbox", "writer.insert.dateTime"],
      "writer.insert.symbol": ["writer.insert.symbol"],
      "writer.view.layouts": ["writer.view.printLayout", "writer.view.readMode"],
      "writer.view.zoom": ["writer.view.zoomIn", "writer.view.zoom100"]
    };
    for (const [id, cmds] of Object.entries(expectCmds)) {
      const entry = byId[id];
      for (const cmd of cmds) {
        if (!(entry.commandIds || []).includes(cmd)) {
          throw new Error(`${id} thiếu commandId ${cmd}`);
        }
      }
    }
    if (byId["writer.text.basicFormat"].ribbon.group !== "Phông chữ") {
      throw new Error("Bài định dạng chữ phải trỏ nhóm Phông chữ");
    }
    if (byId["writer.view.layouts"].ribbon.tab !== "Chế độ xem") {
      throw new Error("Bài dạng xem phải ở tab Chế độ xem");
    }
    const footerHelp = byId["writer.headerFooter"];
    if (!footerHelp.summary.includes("PAGE / NUMPAGES") || !(footerHelp.steps.join(" ").includes("Print Preview") && footerHelp.steps.join(" ").includes("tổng số trang"))) {
      throw new Error("Hướng dẫn chân trang phải giải thích trường số trang sống và cách xem số theo từng trang");
    }
  });

  await test("Help Writer Batch 2: có bài kiểu, bố cục trang, chú thích và chèn nâng cao", () => {
    const ids = WRITER_HELP_ENTRIES.map((entry) => entry.id);
    const required = [
      "writer.view.showAndWindow",
      "writer.nav.documentBounds",
      "writer.style.galleryAndNormal",
      "writer.design.themes",
      "writer.text.changeCaseHelp",
      "writer.format.fontDialogHelp",
      "writer.para.advanced",
      "writer.insert.illustrationsExtra",
      "writer.format.dropCapHelp",
      "writer.insert.equationHelp",
      "writer.insert.equationBookmark",
      "writer.comment.insertHelp",
      "writer.page.setup",
      "writer.page.columnsHelp",
      "writer.page.watermarkBorder",
      "writer.file.printPreviewHelp",
      "writer.reference.notes"
    ];
    for (const id of required) {
      if (!ids.includes(id)) throw new Error(`Thiếu bài hướng dẫn ${id}`);
    }
    const byId = Object.fromEntries(WRITER_HELP_ENTRIES.map((entry) => [entry.id, entry]));
    const expectCmds = {
      "writer.view.showAndWindow": ["writer.view.ruler", "writer.view.pageWidth", "writer.view.newWindow"],
      "writer.nav.documentBounds": ["writer.nav.docStart", "writer.nav.docEnd"],
      "writer.style.galleryAndNormal": ["writer.style.gallery", "writer.style.normal", "writer.style.apply"],
      "writer.design.themes": ["writer.design.themeGallery"],
      "writer.text.changeCaseHelp": ["writer.text.changeCase"],
      "writer.format.fontDialogHelp": ["writer.format.fontDialog"],
      "writer.para.advanced": ["writer.para.sort", "writer.para.shading", "writer.para.moveUp"],
      "writer.insert.illustrationsExtra": ["writer.shape.insert", "writer.diagram.insert", "writer.chart.insert"],
      "writer.format.dropCapHelp": ["writer.format.dropCap"],
      "writer.insert.equationHelp": ["writer.insert.equation"],
      "writer.insert.equationBookmark": ["writer.insert.bookmark", "writer.insert.crossReference"],
      "writer.comment.insertHelp": ["writer.comment.insert"],
      "writer.page.setup": ["writer.page.margins", "writer.page.orientation", "writer.page.size"],
      "writer.page.columnsHelp": ["writer.page.columns", "writer.page.columns2", "writer.page.columns3"],
      "writer.page.watermarkBorder": ["writer.page.watermark", "writer.page.border"],
      "writer.file.printPreviewHelp": ["writer.file.printPreview"],
      "writer.reference.notes": ["writer.reference.footnoteInsert", "writer.reference.endnoteInsert"]
    };
    for (const [id, cmds] of Object.entries(expectCmds)) {
      const entry = byId[id];
      for (const cmd of cmds) {
        if (!(entry.commandIds || []).includes(cmd)) {
          throw new Error(`${id} thiếu commandId ${cmd}`);
        }
      }
    }
    const equationHelp = byId["writer.insert.equationHelp"];
    const equationSteps = equationHelp.steps.join(" ");
    for (const detail of ["Alt+=", "a/b", "x^2", "\\sqrt(x)", "Tab", "Enter", "Delete", ".docx"]) {
      if (!equationSteps.includes(detail)) throw new Error(`HÆ°á»›ng dáº«n phÆ°Æ¡ng trÃ¬nh thiáº¿u bÆ°á»›c ${detail}`);
    }
    if (!equationHelp.title.includes("Doc") || !equationHelp.summary.includes("xem trước kết quả")) {
      throw new Error("HÆ°á»›ng dáº«n phÆ°Æ¡ng trÃ¬nh pháº£i khá»›p UI Doc vÃ  cÃ³ mÃ´ táº£ xem trÆ°á»›c");
    }
    if (byId["writer.page.setup"].ribbon.tab !== "Bố cục") {
      throw new Error("Bài thiết lập trang phải ở tab Bố cục");
    }
    if (byId["writer.page.columnsHelp"].ribbon.group !== "Thiết lập trang") {
      throw new Error("Bài chia cột phải trỏ nhóm Thiết lập trang");
    }
    if (byId["writer.reference.notes"].ribbon.tab !== "Tham chiếu") {
      throw new Error("Bài chú thích phải ở tab Tham chiếu");
    }
    const illustrations = byId["writer.insert.illustrationsExtra"];
    const illustrationsBlob = [illustrations.summary, ...(illustrations.steps || [])].join(" ");
    if (/không mở hộp|chèn ngay đối tượng mặc định|Nhấn là chèn ngay, không hộp thoại/i.test(illustrationsBlob)) {
      throw new Error("Bài writer.insert.illustrationsExtra vẫn mô tả hành vi cũ (chèn mặc định, không mở dialog)");
    }
    if (!/hộp thoại/.test(illustrationsBlob) || !/Hình tròn/.test(illustrationsBlob) || !/Chèn sơ đồ SmartArt/.test(illustrationsBlob) || !/Chèn biểu đồ minh họa/.test(illustrationsBlob)) {
      throw new Error("Bài writer.insert.illustrationsExtra chưa mô tả hộp thoại chọn hình/sơ đồ/biểu đồ thật");
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
