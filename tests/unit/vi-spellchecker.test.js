import { VietnameseSpellChecker, levenshteinDistance, tokenizeVietnamese } from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";

function test(name, fn) {
  try { fn(); return { name, pass: true }; }
  catch (error) { return { name, pass: false, error: error.message }; }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runVietnameseSpellcheckerTests() {
  return [
    test("Từ điển CC0 gồm 2.798 từ corpus và hai mục bổ sung do VN Office tự biên soạn", () => {
      assert(VIETNAMESE_DICTIONARY_WORDS.length === 2800, `có ${VIETNAMESE_DICTIONARY_WORDS.length} mục`);
      assert(VIETNAMESE_DICTIONARY_WORDS.includes("đạt") && VIETNAMESE_DICTIONARY_WORDS.includes("tỷ"), "thiếu hai từ đạt/tỷ");
    }),
    test("Không gạch nhầm từ phổ biến đạt và tỷ, vẫn phát hiện dạng thiếu dấu", () => {
      const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
      assert(checker.checkText("đạt tỷ").length === 0, "từ đúng bị báo lỗi");
      const issues = checker.checkText("tỷi").map(item => item.word);
      assert(issues.includes("tỷi"), `không phát hiện từ gõ sai: ${issues.join(", ")}`);
    }),
    test("Không báo sai câu tiếng Việt có dấu thực tế", () => {
      const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
      const text = "Giáo viên hướng dẫn học sinh đọc sách và viết bài trong lớp học. " +
        "Nhà trường tổ chức hoạt động trải nghiệm để phát triển kỹ năng giao tiếp. " +
        "Người dùng soạn thảo văn bản hành chính, báo cáo công việc và kế hoạch giảng dạy. " +
        "Tiếng Việt có hệ thống dấu thanh phong phú với nhiều nguyên âm. " +
        "Phần mềm văn phòng cần hoạt động nhanh, ổn định, dễ dùng và bảo vệ dữ liệu cá nhân.";
      const issues = checker.checkText(text);
      assert(issues.length === 0, `báo nhầm: ${issues.map(item => item.word).join(", ")}`);
    }),
    test("Phát hiện lỗi rõ ràng và đưa ra gợi ý gần", () => {
      const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
      assert(checker.checkText("Em viết chínnh tả.").some(item => item.word === "chínnh"), "không phát hiện chínnh");
      assert(checker.suggest("chínnh").includes("chính"), "không gợi ý chính");
      assert(levenshteinDistance("chínnh", "chính", 2) === 1, "khoảng cách sai");
    }),
    test("Tokenizer giữ âm tiết có dấu và offset qua dấu câu", () => {
      const text = "À, quả bưởi; những người ở xã Mỹ Đức vẫn khỏe mạnh!";
      const tokens = tokenizeVietnamese(text);
      assert(tokens.map(token => token.word).join("|") === "À|quả|bưởi|những|người|ở|xã|Mỹ|Đức|vẫn|khỏe|mạnh", "tách sai âm tiết có dấu");
      for (const token of tokens) assert(text.slice(token.start, token.end) === token.word, `offset sai: ${token.word}`);
    }),
    test("Từ cá nhân được lưu và lần khởi tạo sau không còn báo", () => {
      const values = new Map();
      const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
      new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage }).addToPersonalDictionary("codexx");
      assert(new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage }).checkText("codexx").length === 0, "không khôi phục từ cá nhân");
    })
  ];
}
