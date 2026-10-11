/**
 * Test Suite: Suite Smoke Test & Vietnamese Unicode Verification
 * Tuân thủ chuẩn 03-ui-ux/VIETNAMESE-I18N.md
 */

import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";

export async function runSuiteSmokeTests() {
  const results = [];

  // 1. Đăng ký toàn bộ commands
  try {
    registerAllStandardCommands(globalCommandBus);
    const count = globalCommandBus._definitions.size;
    if (count >= 40) {
      results.push({ name: `Smoke: Đăng ký thành công ${count} lệnh tiêu chuẩn toàn Suite`, pass: true });
    } else {
      results.push({ name: `Smoke: Thiếu định nghĩa lệnh (chỉ có ${count})`, pass: false });
    }
  } catch (e) {
    results.push({ name: "Smoke: Lỗi đăng ký lệnh: " + e.message, pass: false });
  }

  // 2. Kiểm thử Unicode tiếng Việt: NFC (Dựng sẵn) và NFD (Tổ hợp)
  try {
    const testSampleNFC = "Cộng hòa Xã hội Chủ nghĩa Việt Nam — Độc lập - Tự do - Hạnh phúc";
    const testSampleNFD = testSampleNFC.normalize("NFD");

    // Chuẩn hóa ngược lại và so sánh
    const roundTrip = testSampleNFD.normalize("NFC");
    if (roundTrip === testSampleNFC) {
      results.push({ name: "Vietnamese i18n: Hỗ trợ chuyển đổi trơn tru giữa Unicode tổ hợp (NFD) và dựng sẵn (NFC)", pass: true });
    } else {
      results.push({ name: "Vietnamese i18n: Lỗi chuyển đổi bảng mã Unicode tiếng Việt", pass: false });
    }

    // Kiểm tra các ký tự có dấu phức tạp
    const specialChars = "ă, â, đ, ê, ô, ơ, ư, ả, ã, ạ, ắ, ặ, ẳ, ẵ, ấ, ầ, ẩ, ẫ, ậ, ế, ề, ể, ễ, ệ, ố, ồ, ổ, ỗ, ộ, ớ, ờ, ở, ỡ, ợ, ứ, ừ, ử, ữ, ự, ỳ, ỷ, ỹ, ỵ";
    const upperChars = specialChars.toLocaleUpperCase("vi-VN");
    const lowerChars = upperChars.toLocaleLowerCase("vi-VN");

    if (lowerChars === specialChars) {
      results.push({ name: "Vietnamese i18n: Upper/Lowercase toàn bộ nguyên âm tiếng Việt chuẩn xác (vi-VN)", pass: true });
    } else {
      results.push({ name: "Vietnamese i18n: Lỗi upper/lowercase tiếng Việt", pass: false });
    }
  } catch (e) {
    results.push({ name: "Vietnamese i18n lỗi: " + e.message, pass: false });
  }

  return results;
}
