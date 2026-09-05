import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VietnameseSpellChecker, levenshteinDistance, tokenizeVietnamese } from "../../platform/text/vi-spellchecker.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dictionaryPath = path.resolve(here, "../../platform/text/dictionaries/vi_VN.dic");
const dictionaryLines = fs.readFileSync(dictionaryPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).slice(1);

function test(name, fn) {
  try { fn(); return { name, pass: true }; }
  catch (error) { return { name, pass: false, error: error.message }; }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runVietnameseSpellcheckerTests() {
  return [
    test("Từ điển LibreOffice chứa hơn 6.000 âm tiết tiếng Việt", () => {
      assert(dictionaryLines.length >= 6000, `chỉ có ${dictionaryLines.length} mục`);
    }),
    test("Không báo sai câu tiếng Việt có dấu thực tế", () => {
      const checker = new VietnameseSpellChecker(dictionaryLines);
      const text = "Giáo viên hướng dẫn học sinh đọc sách và viết bài trong lớp học. " +
        "Nhà trường tổ chức hoạt động trải nghiệm nhằm phát triển kỹ năng giao tiếp. " +
        "Người dùng soạn thảo văn bản hành chính, báo cáo công việc và kế hoạch giảng dạy. " +
        "Tiếng Việt có hệ thống dấu thanh phong phú với nhiều nguyên âm như ă, â, ê, ô, ơ và ư. " +
        "Phần mềm văn phòng cần hoạt động nhanh, ổn định, trực quan và bảo vệ dữ liệu cá nhân.";
      const issues = checker.checkText(text);
      assert(issues.length === 0, `báo nhầm: ${issues.map(item => item.word).join(", ")}`);
    }),
    test("Phát hiện lỗi rõ ràng và đưa ra gợi ý gần", () => {
      const checker = new VietnameseSpellChecker(dictionaryLines);
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
      new VietnameseSpellChecker(dictionaryLines, { storage }).addToPersonalDictionary("codexx");
      assert(new VietnameseSpellChecker(dictionaryLines, { storage }).checkText("codexx").length === 0, "không khôi phục từ cá nhân");
    })
  ];
}
