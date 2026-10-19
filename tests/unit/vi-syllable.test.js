import { isValidVietnameseSyllable } from "../../platform/text/vi-syllable.js";
import { VietnameseSpellChecker } from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";

function test(name, fn) {
  try { fn(); return { name, pass: true }; }
  catch (error) { return { name, pass: false, error: error.message }; }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

const VALID = "mại nhuận thuế kênh trực tuyến thương doanh nghiệp khách hàng quý đồng tăng trưởng lợi thanh toán cổng tích hợp đào tạo đội ngũ kho vận miền trung bắc nam hoàn thiện mở rộng chú thích tiêu đề quyết định xuất khẩu nhập khẩu tuần tháng năm ngày giờ phút giây quá khứ hiện tại tương lai nguyễn trần lê phạm huỳnh hoàng phan vũ võ đặng bùi đỗ hồ ngô dương lý quỳnh khuya xoong thuở quýt huýt tuýt nghiêng nghỉ gì gìn giữ giá gia kiên kỳ kí ký cơ chế chính phủ ngoài khoẻ khỏe hoặc quốc quyết quả quên uỷ ủy y ý ê ơ ờ ừ ôi ối".split(" ");
const INVALID = "tuiến kênhh trựcc xyz hoc viet tieng thue chaof qwer ngưoi nghư kua cê gê ngi nghă quo quuê aaa khôông bk fax".split(" ");

export async function runViSyllableTests() {
  return [
    test("Chấp nhận các âm tiết tiếng Việt thông dụng (kể cả thuế, kênh, trực, mại, nhuận từng bị gạch nhầm)", () => {
      const rejected = VALID.filter(word => !isValidVietnameseSyllable(word));
      assert(rejected.length === 0, `bị từ chối: ${rejected.join(", ")}`);
    }),
    test("Từ chối chuỗi không phải âm tiết tiếng Việt (sai vần, thiếu thanh ở vần kín, c/k, g/gh, chữ ngoại)", () => {
      const accepted = INVALID.filter(word => isValidVietnameseSyllable(word));
      assert(accepted.length === 0, `được chấp nhận: ${accepted.join(", ")}`);
    }),
    test("Mọi mục tiếng Việt thật trong từ điển CC0 đều hợp lệ (chỉ chữ ngoại và rác kho dữ liệu bị từ chối)", () => {
      const latin = /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]+$/;
      const entries = VIETNAMESE_DICTIONARY_WORDS.filter(word => latin.test(String(word).toLowerCase()));
      const rejected = entries.filter(word => !isValidVietnameseSyllable(String(word).normalize("NFC").toLowerCase()));
      assert(rejected.length <= 60, `${rejected.length} mục bị từ chối: ${rejected.slice(0, 30).join(" ")}`);
      assert(entries.length - rejected.length >= 2740, `chỉ ${entries.length - rejected.length} mục hợp lệ`);
    }),
    test("Bộ kiểm tra chính tả không còn đánh dấu nhầm câu báo cáo kinh doanh", () => {
      const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
      const text = "Công ty Cổ phần Thương mại Việt Tín. Lợi nhuận sau thuế đạt 9,7 tỷ đồng. Tập trung mở rộng kênh trực tuyến, tích hợp cổng thanh toán mới.";
      const issues = checker.checkText(text).map(item => item.word);
      assert(issues.length === 0, `báo nhầm: ${issues.join(", ")}`);
      assert(checker.checkText("kênhh trựcc tuiến").length === 3, "không còn phát hiện chữ sai");
    })
  ];
}