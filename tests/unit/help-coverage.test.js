/**
 * VN Office — Unit Tests: Kiểm tra độ phủ Hướng dẫn sử dụng (Help Coverage Guard)
 * Đảm bảo 100% lệnh trên Ribbon có handler đều được bài Help nhắc tới.
 */

import { analyzeHelpCoverage } from "../../scripts/help-coverage.mjs";
import { searchHelpEntries } from "../../platform/help/help-service.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { AUTORECOVER_HELP_ENTRIES } from "../../platform/help/entries-autorecover.js";

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

  const analysis = analyzeHelpCoverage();

  await test("Help Coverage: 100% lệnh ribbon VN Writer có handler đều được phủ bài Help", () => {
    const writer = analysis.writer;
    if (writer.uncoveredCount > 0) {
      const details = writer.uncoveredCommands
        .map((c) => `[${c.tabLabel} > ${c.groupLabel}] ${c.commandId} (${c.label})`)
        .join("; ");
      throw new Error(`Còn ${writer.uncoveredCount} lệnh Writer chưa có bài Help: ${details}`);
    }
    if (writer.coveredCount !== writer.liveCount || writer.liveCount !== 131) {
      throw new Error(`Số lượng lệnh Writer không khớp: covered=${writer.coveredCount}, live=${writer.liveCount}`);
    }
  });

  await test("Help Coverage: 100% lệnh ribbon VN Sheet có handler đều được phủ bài Help", () => {
    const sheet = analysis.sheet;
    if (sheet.uncoveredCount > 0) {
      const details = sheet.uncoveredCommands
        .map((c) => `[${c.tabLabel} > ${c.groupLabel}] ${c.commandId} (${c.label})`)
        .join("; ");
      throw new Error(`Còn ${sheet.uncoveredCount} lệnh Sheet chưa có bài Help: ${details}`);
    }
    if (sheet.coveredCount !== sheet.liveCount || sheet.liveCount !== 152) {
      throw new Error(`Số lượng lệnh Sheet không khớp: covered=${sheet.coveredCount}, live=${sheet.liveCount}`);
    }
  });

  await test("Help Coverage: Không phát hiện nút chết không có handler trên ribbon", () => {
    const writerDead = analysis.writer.deadCount;
    const sheetDead = analysis.sheet.deadCount;
    if (writerDead > 0 || sheetDead > 0) {
      throw new Error(`Phát hiện nút chết: Writer=${writerDead}, Sheet=${sheetDead}`);
    }
  });

  await test("Help Coverage: Toàn bộ bài Help Writer và Sheet chuẩn cấu trúc, không placeholder", () => {
    const banned = /lorem|todo|placeholder|xxx|nội dung mẫu|coming soon/i;
    const allEntries = [...WRITER_HELP_ENTRIES, ...SHEET_HELP_ENTRIES];

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

  return results;
}
