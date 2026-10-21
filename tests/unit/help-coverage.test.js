import { analyzeHelpCoverage } from "../../scripts/help-coverage.mjs";
import { searchHelpEntries } from "../../platform/help/help-service.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";
import { AUTORECOVER_HELP_ENTRIES } from "../../platform/help/entries-autorecover.js";
import { LAUNCHER_HELP_ENTRIES } from "../../platform/help/entries-launcher.js";
import { HELP_ENTRIES, registerHelpEntries } from "../../platform/help/help-catalog.js";
import { COMMON_COMMANDS } from "../../platform/commands/command-definitions.js";

/** Danh mục các nút đang chờ hoàn thiện theo docs/RIBBON-BACKLOG.md */
const PENDING_BACKLOG_EXCEPTIONS = new Set([
  // Tất cả các lệnh hiện đã có bài Help tương ứng.
]);

export async function runHelpCoverageTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  registerHelpEntries(SHEET_HELP_ENTRIES);
  registerHelpEntries(SLIDES_HELP_ENTRIES);
  const analysis = analyzeHelpCoverage();

  await test("Help Coverage: 100% lệnh ribbon VN Writer có handler đều được phủ bài Help", () => {
    const writer = analysis.writer;
    const uncovered = writer.uncoveredCommands.filter((c) => !PENDING_BACKLOG_EXCEPTIONS.has(c.commandId));
    if (uncovered.length > 0) {
      const details = uncovered
        .map((c) => `[${c.tabLabel} > ${c.groupLabel}] ${c.commandId} (${c.label})`)
        .join("; ");
      throw new Error(`Còn ${uncovered.length} lệnh Writer chưa có bài Help: ${details}`);
    }
    // Section options from main, paragraph-formatting, table controls and numbered list restart/continue commands, pasteSpecial and spellcheck toggle are covered.
    // NAV1 adds writer.view.navigationPane with its own complete Help entry.
    // Includes the Styles Pane and Create Style commands added with WRITER-STYLES.
    if (writer.coveredCount !== writer.liveCount || writer.liveCount !== 230) {
      throw new Error(`Số lượng lệnh Writer không khớp: covered=${writer.coveredCount}, live=${writer.liveCount}`);
    }
  });

  await test("Help Coverage: 100% lệnh ribbon VN Sheet có handler đều được phủ bài Help", () => {
    const sheet = analysis.sheet;
    const uncovered = sheet.uncoveredCommands.filter((c) => !PENDING_BACKLOG_EXCEPTIONS.has(c.commandId));
    if (uncovered.length > 0) {
      const details = uncovered
        .map((c) => `[${c.tabLabel} > ${c.groupLabel}] ${c.commandId} (${c.label})`)
        .join("; ");
      throw new Error(`Còn ${uncovered.length} lệnh Sheet chưa có bài Help: ${details}`);
    }
    if (sheet.coveredCount !== sheet.liveCount || sheet.liveCount !== 216) {
      throw new Error(`Số lượng lệnh Sheet không khớp: covered=${sheet.coveredCount}, live=${sheet.liveCount}`);
    }
  });

  await test("Help Coverage: 100% lệnh ribbon VN Slides có handler đều được phủ bài Help", () => {
    const slides = analysis.slides;
    const uncovered = slides.uncoveredCommands.filter((c) => !PENDING_BACKLOG_EXCEPTIONS.has(c.commandId));
    if (uncovered.length > 0) {
      const details = uncovered
        .map((c) => `[${c.tabLabel} > ${c.groupLabel}] ${c.commandId} (${c.label})`)
        .join("; ");
      throw new Error(`Còn ${uncovered.length} lệnh Slides chưa có bài Help: ${details}`);
    }
    if (slides.coveredCount !== slides.liveCount || slides.liveCount !== 193) {
      throw new Error(`Số lượng lệnh Slides không khớp: covered=${slides.coveredCount}, live=${slides.liveCount}`);
    }
    const transitionHelp = SLIDES_HELP_ENTRIES.find((entry) => entry.commandIds?.includes("slides.transition.apply"));
    if (!transitionHelp || !transitionHelp.steps?.some((step) => step.includes("Quét") && step.includes("Che phủ"))) {
      throw new Error("Hướng dẫn tiếng Việt cho hộp thoại Chuyển tiếp phải nêu rõ Quét và Che phủ");
    }
  });

  await test("Help Coverage: Không phát hiện nút chết không có handler trên ribbon", () => {
    const writerDead = analysis.writer.deadCount;
    const sheetDead = analysis.sheet.deadCount;
    const slidesDead = analysis.slides.deadCount;
    if (writerDead > 0 || sheetDead > 0 || slidesDead > 0) {
      throw new Error(`Phát hiện nút chết: Writer=${writerDead}, Sheet=${sheetDead}, Slides=${slidesDead}`);
    }
  });

  await test("Help Coverage: Toàn bộ bài Help Writer, Sheet và Slides chuẩn cấu trúc, không placeholder", () => {
    const banned = /lorem|todo|placeholder|xxx|nội dung mẫu|coming soon/i;
    const allEntries = [...WRITER_HELP_ENTRIES, ...SHEET_HELP_ENTRIES, ...SLIDES_HELP_ENTRIES];

    for (const entry of allEntries) {
      if (!entry.id || !entry.title || !entry.summary) {
        throw new Error(`Bài ${entry.id || "không tên"} thiếu id/title/summary`);
      }
      if (!entry.ribbon?.tab || !entry.ribbon?.group) {
        throw new Error(`Bài ${entry.id} thiếu thông tin vị trí ribbon`);
      }
      if (!Array.isArray(entry.commandIds)) {
        throw new Error(`Bài ${entry.id} thiếu mảng commandIds`);
      }
      if (!Array.isArray(entry.steps) || entry.steps.length < 3) {
        throw new Error(`Bài ${entry.id} phải có ít nhất 3 bước thực hiện cụ thể`);
      }
      const textBlob = [entry.title, entry.summary, ...entry.steps].join(" ");
      if (banned.test(textBlob)) {
        throw new Error(`Bài ${entry.id} chứa nội dung placeholder/giả`);
      }
    }
  });

  await test("Help Coverage: Mọi bài Help trong Catalog có tiêu đề, app hợp lệ, độ dài thân bài > 200 ký tự và ít nhất 2 bước", () => {
    for (const entry of HELP_ENTRIES) {
      if (!entry.id) {
        throw new Error("Phát hiện bài Help thiếu id");
      }
      if (!entry.title || typeof entry.title !== "string" || !entry.title.trim()) {
        throw new Error(`Bài ${entry.id} thiếu tiêu đề (title)`);
      }
      if (!["writer", "sheet", "slides", "common"].includes(entry.app)) {
        throw new Error(`Bài ${entry.id} có app '${entry.app}' không hợp lệ (phải là writer, sheet, slides hoặc common)`);
      }
      const body = [entry.summary || "", ...(entry.steps || []), entry.note || ""].join(" ").trim();
      if (body.length <= 200) {
        throw new Error(`Bài ${entry.id} có độ dài thân bài (${body.length} ký tự) chưa vượt quá 200 ký tự`);
      }
      if (!Array.isArray(entry.steps) || entry.steps.length < 2) {
        throw new Error(`Bài ${entry.id} phải có ít nhất 2 bước thực hiện cụ thể (hiện có ${entry.steps?.length || 0})`);
      }
    }
  });

  await test("Help Coverage: Không dùng tên sản phẩm độc quyền bị cấm (Word, Excel, PowerPoint)", () => {
    const bannedRegex = /\b(Word|Excel|PowerPoint)\b/i;

    const violations = [];
    for (const entry of HELP_ENTRIES) {
      const fullText = [entry.title || "", entry.summary || "", ...(entry.steps || []), entry.note || ""].join(" ");
      const match = fullText.match(bannedRegex);
      if (match) {
        violations.push(`${entry.id} (${match[0]})`);
      }
    }
    if (violations.length > 0) {
      throw new Error(`Phát hiện tên sản phẩm bị cấm trong ${violations.length} bài Help: ${violations.join(", ")}`);
    }
  });

  await test("Help Coverage: Toàn bộ 9 tính năng Shared Platform cốt lõi đều có bài Help chuyên biệt", () => {
    const platformIds = [
      "common.platform.pasteSpecialHelp",
      "common.platform.printAndExportPdfHelp",
      "common.platform.findReplaceHelp",
      "common.platform.themeDarkLightHelp",
      "common.platform.quickStartHelp",
      "common.platform.contextualF1Help",
      "common.platform.keyTipsHelp",
      "common.platform.oneClickUpdateHelp",
      "common.platform.autoRecoverHelp"
    ];
    for (const pid of platformIds) {
      const entry = HELP_ENTRIES.find((e) => e.id === pid);
      if (!entry) {
        throw new Error(`Thiếu bài Help cho tính năng Shared Platform: ${pid}`);
      }
    }
  });

  await test("Help Coverage: Mã hóa bằng mật khẩu có lệnh và hướng dẫn trong cả ba ứng dụng", () => {
    if (!COMMON_COMMANDS.some(command => command.id === "common.file.passwordProtection")) {
      throw new Error("Thiếu lệnh common.file.passwordProtection trong command-definitions");
    }
    for (const app of ["writer", "sheet", "slides"]) {
      const entry = HELP_ENTRIES.find(item => item.id === `${app}.file.passwordProtection`);
      if (!entry || !entry.commandIds.includes("common.file.passwordProtection") || entry.steps.length < 3) {
        throw new Error(`Thiếu hướng dẫn mã hóa mật khẩu cho ${app}`);
      }
    }
  });

  await test("Help Coverage: Hộp thoại cốt lõi của cả 3 ứng dụng đều có bài Help hướng dẫn chi tiết", () => {
    const dialogHelpIds = [
      "writer.dialog.pageSetupHelp",
      "writer.dialog.paragraphHelp",
      "writer.dialog.fontHelp",
      "sheet.dialog.formatCellsHelp",
      "sheet.dialog.cellStylesHelp",
      "sheet.dialog.dataValidationHelp",
      "slides.dialog.insertTableHelp",
      "slides.dialog.headerFooterHelp",
      "slides.dialog.setupShowHelp",
      "common.dialog.findReplaceHelp",
      "common.dialog.macroManagerHelp",
      "common.dialog.printHelp"
    ];
    for (const did of dialogHelpIds) {
      const entry = HELP_ENTRIES.find((e) => e.id === did);
      if (!entry) {
        throw new Error(`Thiếu bài Help cho hộp thoại: ${did}`);
      }
    }
  });

  await test("Help Coverage: Tìm kiếm trợ giúp tiếng Việt ra chính xác các bài mới", () => {
    // Writer tests
    const writerClipboard = searchHelpEntries("sao chép định dạng", { app: "writer" });
    if (!writerClipboard.some((e) => e.id === "writer.clipboard.cutCopyPaste")) {
      throw new Error("Không tìm thấy bài Cắt sao chép dán Writer");
    }

    const writerFind = searchHelpEntries("tìm kiếm thay thế", { app: "writer" });
    if (!writerFind.some((e) => e.id === "writer.edit.findReplaceSelect")) {
      throw new Error("Không tìm thấy bài Tìm kiếm thay thế Writer");
    }

    const writerSpell = searchHelpEntries("soát lỗi chính tả", { app: "writer" });
    if (!writerSpell.some((e) => e.id === "writer.review.spellCheck")) {
      throw new Error("Không tìm thấy bài Soát lỗi chính tả Writer");
    }

    const writerHelpGuide = searchHelpEntries("tra cứu trợ giúp", { app: "writer" });
    if (!writerHelpGuide.some((e) => e.id === "writer.help.guide")) {
      throw new Error("Không tìm thấy bài Tra cứu trợ giúp Writer");
    }

    // Sheet tests
    const sheetClipboard = searchHelpEntries("cắt sao chép", { app: "sheet" });
    if (!sheetClipboard.some((e) => e.id === "sheet.clipboard.cutCopyPaste")) {
      throw new Error("Không tìm thấy bài Cắt sao chép dán Sheet");
    }

    const sheetOrientation = searchHelpEntries("hướng giấy", { app: "sheet" });
    if (!sheetOrientation.some((e) => e.id === "sheet.page.orientationAndSize")) {
      throw new Error("Không tìm thấy bài Hướng giấy khổ giấy Sheet");
    }

    const sheetHelpGuide = searchHelpEntries("hướng dẫn sử dụng", { app: "sheet" });
    if (!sheetHelpGuide.some((e) => e.id === "sheet.help.guide")) {
      throw new Error("Không tìm thấy bài Hướng dẫn sử dụng Sheet");
    }

    const sheetAi = searchHelpEntries("tóm tắt nhanh", { app: "sheet" });
    if (!sheetAi.some((e) => e.id === "sheet.ai.analysis")) {
      throw new Error("Không tìm thấy bài Trợ lý VN AI Sheet");
    }
  });

  await test("Help Coverage: AutoRecover có hướng dẫn cụ thể cho cả Writer, Sheet và Slides", () => {
    for (const app of ["writer", "sheet", "slides"]) {
      const entry = AUTORECOVER_HELP_ENTRIES.find((candidate) => candidate.app === app);
      if (!entry || entry.steps.length < 4 || !entry.summary.includes("AutoRecover")) {
        throw new Error(`Thiếu hướng dẫn AutoRecover cụ thể cho VN ${app}.`);
      }
      if (!entry.steps.some((step) => step.includes("Trợ giúp")) || !entry.steps.some((step) => step.includes("Lưu"))) {
        throw new Error(`Hướng dẫn AutoRecover của ${app} phải nêu vị trí UI và cách lưu bản phục hồi.`);
      }
      const result = searchHelpEntries("tự động khôi phục", { app });
      if (!result.some((candidate) => candidate.id === entry.id)) {
        throw new Error(`Không tìm thấy bài AutoRecover tiếng Việt cho ${app}.`);
      }
    }
  });

  await test("Help Coverage: có hướng dẫn mở Doc, Sheet và Slide từ Start Menu hoặc Desktop", () => {
    const expected = [
      { app: "writer", name: "Doc" },
      { app: "sheet", name: "Sheet" },
      { app: "slides", name: "Slide" }
    ];
    for (const { app, name } of expected) {
      const entry = LAUNCHER_HELP_ENTRIES.find((candidate) => candidate.app === app);
      if (!entry || !entry.title.includes(name)) throw new Error(`Thiếu bài Help mở ${name}.`);
      if (!entry.summary.includes("Start Menu > 3T Office") || !entry.summary.includes("Màn hình nền")) {
        throw new Error(`Bài Help ${name} phải nêu đúng thư mục Start Menu và Desktop.`);
      }
      if (!entry.steps.some((step) => step.includes(`rồi chọn ${name}`)) ||
          !entry.steps.some((step) => step.includes(`${name} trên Màn hình nền`))) {
        throw new Error(`Bài Help ${name} thiếu các bước mở từ Start Menu hoặc Desktop.`);
      }
      if (!searchHelpEntries(`Mở ${name} từ lối tắt`, { app }).some((candidate) => candidate.id === entry.id)) {
        throw new Error(`Không thể tìm bài Help mở ${name} trong ứng dụng ${app}.`);
      }
    }
  });

  return results;
}
