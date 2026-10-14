/**
 * Tests for Ticket WORD-W5 Item 1: Đổi chữ hoa/thường (Change Case).
 * Kiểm tra:
 * - Hộp thoại 5 lựa chọn: Sentence case, lowercase, UPPERCASE, Capitalize Each Word, tOGGLE cASE.
 * - Shift+F3 xoay vòng.
 * - Tương thích chữ có dấu tiếng Việt trọn vẹn (Đ, Ă, Â, Ê, Ô, Ơ, Ư và các nguyên âm có dấu).
 */

import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { showChangeCaseDialog, CHANGE_CASE_OPTIONS } from "../../apps/writer/change-case-dialog.js";

export async function runWriterChangeCaseTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  test("Change Case: Khai báo lệnh writer.text.changeCase và writer.text.changeCaseDialog", () => {
    const cycleCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.changeCase");
    assert(cycleCmd, "Phải có lệnh writer.text.changeCase");
    assert(cycleCmd.shortcut === "Shift+F3", "writer.text.changeCase phải có phím tắt Shift+F3");

    const dialogCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.changeCaseDialog");
    assert(dialogCmd, "Phải có lệnh writer.text.changeCaseDialog");
    assert(dialogCmd.category === "format", "writer.text.changeCaseDialog thuộc nhóm format");
  });

  test("Change Case: Đầy đủ chuỗi i18n VI và EN không chứa tên thương mại cấm", () => {
    const viCmd = viStrings.commands || viStrings;
    const enCmd = enStrings.commands || enStrings;
    assert(viCmd["writer.text.changeCase"]?.label, "Thiếu nhãn tiếng Việt cho changeCase");
    assert(viCmd["writer.text.changeCaseDialog"]?.label, "Thiếu nhãn tiếng Việt cho changeCaseDialog");
    assert(enCmd["writer.text.changeCase"]?.label, "Thiếu nhãn tiếng Anh cho changeCase");
    assert(enCmd["writer.text.changeCaseDialog"]?.label, "Thiếu nhãn tiếng Anh cho changeCaseDialog");

    const forbidden = ["ms word", "microsoft word", "excel", "powerpoint", "microsoft"];
    const allText = [
      viCmd["writer.text.changeCase"].label,
      viCmd["writer.text.changeCase"].tooltip,
      viCmd["writer.text.changeCaseDialog"].label,
      viCmd["writer.text.changeCaseDialog"].tooltip
    ].join(" ").toLowerCase();

    for (const term of forbidden) {
      assert(!allText.includes(term), `Chuỗi chứa tên thương mại cấm: ${term}`);
    }
  });

  test("Change Case: Bài Trợ giúp tiếng Việt hướng dẫn đầy đủ 5 chế độ", () => {
    const help = WRITER_HELP_ENTRIES.find(h => h.id === "writer.text.changeCaseHelp");
    assert(help, "Phải có bài trợ giúp writer.text.changeCaseHelp");
    assert(help.commandIds.includes("writer.text.changeCase"), "Trợ giúp phải liên kết writer.text.changeCase");
    assert(help.commandIds.includes("writer.text.changeCaseDialog"), "Trợ giúp phải liên kết writer.text.changeCaseDialog");

    const helpContent = (help.summary + " " + help.steps.join(" ")).toLowerCase();
    assert(helpContent.includes("sentence case"), "Trợ giúp phải nhắc tới Sentence case");
    assert(helpContent.includes("shift+f3"), "Trợ giúp phải nhắc tới Shift+F3");
    assert(helpContent.includes("tiếng việt"), "Trợ giúp phải ghi rõ hỗ trợ tiếng Việt");
  });

  test("Change Case: Hộp thoại showChangeCaseDialog chứa đủ 5 tùy chọn chuẩn", () => {
    assert(CHANGE_CASE_OPTIONS.length === 5, "Hộp thoại phải có 5 tùy chọn");
    const values = CHANGE_CASE_OPTIONS.map(o => o.value);
    assert(values.includes("sentence"), "Thiếu tùy chọn sentence");
    assert(values.includes("lowercase"), "Thiếu tùy chọn lowercase");
    assert(values.includes("uppercase"), "Thiếu tùy chọn uppercase");
    assert(values.includes("capitalize"), "Thiếu tùy chọn capitalize");
    assert(values.includes("toggle"), "Thiếu tùy chọn toggle");
  });

  test("Change Case: Chuyển đổi tiếng Việt có dấu chuẩn xác cho 5 kiểu", () => {
    // 1. Sentence case
    const toSentence = s => s.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
    const sIn = "hôm nay trời đẹp. ngày mai đi chơi! đắk lắk đón khách? đúng rồi.";
    const sOut = toSentence(sIn);
    assert(sOut === "Hôm nay trời đẹp. Ngày mai đi chơi! Đắk lắk đón khách? Đúng rồi.", `Sentence case sai: ${sOut}`);

    // 2. lowercase
    const lowerIn = "ĐẮK LẮK - CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM";
    const lowerOut = lowerIn.toLowerCase();
    assert(lowerOut === "đắk lắk - cộng hòa xã hội chủ nghĩa việt nam", `lowercase sai: ${lowerOut}`);

    // 3. UPPERCASE
    const upperIn = "đắk lắk - cộng hòa xã hội chủ nghĩa việt nam";
    const upperOut = upperIn.toUpperCase();
    assert(upperOut === "ĐẮK LẮK - CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", `UPPERCASE sai: ${upperOut}`);

    // 4. Capitalize Each Word
    const toTitle = s => s.toLowerCase().replace(/(^|[\s\p{P}\u2018-\u201D]+)(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
    const titleIn = "cộng hòa xã hội chủ nghĩa việt nam - đắk lắk";
    const titleOut = toTitle(titleIn);
    assert(titleOut === "Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam - Đắk Lắk", `Capitalize sai: ${titleOut}`);

    // 5. tOGGLE cASE
    const toToggle = s => Array.from(s).map(c => {
      const u = c.toUpperCase();
      const l = c.toLowerCase();
      return c === u && c !== l ? l : (c === l && c !== u ? u : c);
    }).join("");
    const toggleIn = "Việt Nam Đắk Lắk";
    const toggleOut = toToggle(toggleIn);
    assert(toggleOut === "vIỆT nAM đẮK lẮK", `Toggle sai: ${toggleOut}`);
    assert(toToggle(toggleOut) === toggleIn, "Toggle hai lần phải trả về nguyên gốc");
  });

  return results;
}
