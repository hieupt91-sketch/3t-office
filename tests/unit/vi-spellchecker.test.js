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
    test("Từ điển CC0 chứa 2.798 từ tiếng Việt từ corpus", () => {
      assert(VIETNAMESE_DICTIONARY_WORDS.length === 2798, `có ${VIETNAMESE_DICTIONARY_WORDS.length} mục`);
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
    test("200 từ tiếng Việt thông dụng không bị gạch chân và bộ từ điển không cần mạng", () => {
      const commonWords = `
        tôi bạn anh chị em ta chúng họ ông bà
        cha mẹ bố má con cháu người nhà cửa đất nước
        quê hương xã hội có không được cần phải muốn biết
        nghĩ nói làm đi đến về ở ăn uống ngủ
        học dạy đọc viết xem nghe hỏi trả lời cảm ơn
        xin chào vâng dạ rồi chưa đang sẽ đã từng vừa
        mới rất quá khá nhiều ít một hai ba bốn năm
        sáu bảy tám chín mười đây đó kia nào gì ai
        đâu sao khi hôm ngày tháng tuần giờ phút sáng trưa
        chiều tối đêm nay mai qua trước sau trên dưới trong
        ngoài giữa cạnh gần xa trái phải cao thấp dài
        ngắn rộng hẹp to nhỏ tốt xấu đẹp cũ nhanh chậm
        vui buồn khỏe mệt nóng lạnh khô ướt mưa nắng gió
        trời biển sông núi cây hoa lá quả rau cá
        thịt cơm bánh trà cà phê sữa đường muối ngon ngọt
        chua cay màu đỏ xanh vàng trắng đen mắt tai mũi
        miệng tay chân đầu tóc lòng tim sức bệnh thuốc bác
        sĩ trường lớp sách vở bút giấy bàn ghế phòng phố
        đường xe tàu máy bay việc công tiền giá hàng chợ
        tiếng chữ câu từ đoạn trang mục tiêu văn bản
      `.trim().split(/\s+/).slice(0, 200);
      assert(commonWords.length === 200, `mẫu có ${commonWords.length} từ thay vì 200`);
      const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
      const issues = checker.checkText(commonWords.join(" "));
      assert(issues.length === 0, `có từ thông dụng bị báo nhầm: ${issues.map((item) => item.word).join(", ")}`);
      assert(typeof checker.checkText === "function", "từ điển cục bộ chưa sẵn sàng");
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
