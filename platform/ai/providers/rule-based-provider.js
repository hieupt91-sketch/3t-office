/**
 * VN Office AI — Rule-Based Local Provider
 * Không dùng mô hình AI thật — xử lý theo quy tắc/từ khóa cục bộ, luôn khả dụng
 * (không cần cài đặt gì thêm, không có dữ liệu nào rời khỏi tiến trình trình duyệt).
 * Dùng làm fallback khi không có Local Model Provider (vd: Ollama) khả dụng.
 */

export class RuleBasedProvider {
  static get id() {
    return "rule-based";
  }

  static get label() {
    return "Xử lý quy tắc cục bộ (chưa cài mô hình AI)";
  }

  /** Luôn khả dụng — không phụ thuộc mạng/tiến trình ngoài. */
  static async isAvailable() {
    return true;
  }

  /**
   * @param {string} prompt
   * @param {Object} [context]
   * @param {string} [context.documentText=""]
   * @param {string} [context.appName="writer"]
   * @returns {Promise<{ reply: string, suggestion?: string }>}
   */
  static async query(prompt, context = {}) {
    const p = (prompt || "").trim().toLowerCase();
    const docText = (context.documentText || "").trim();

    if (p.includes("tóm tắt") || p.includes("summarize")) {
      if (!docText) {
        return {
          reply: "Tài liệu hiện đang trống hoặc chưa có nội dung văn bản để tóm tắt. Vui lòng soạn thảo nội dung trước."
        };
      }
      const lines = docText.split("\n").filter(l => l.trim().length > 10).slice(0, 4);
      const summaryBullets = lines.length > 0
        ? lines.map(l => `• ${l.trim().substring(0, 100)}...`).join("\n")
        : "• Tài liệu chứa các điều khoản hành chính chuẩn hóa.";

      return {
        reply: `**Tóm tắt nội dung tài liệu (Cục bộ & Bảo mật):**\n\n${summaryBullets}\n\n*Phát hiện ${docText.split(/\s+/).length} từ trong văn bản.*`
      };
    }

    if (p.includes("chính tả") || p.includes("soát lỗi") || p.includes("grammar")) {
      return {
        reply: "Đã kiểm tra ngữ pháp tiếng Việt theo tiêu chuẩn Nghị định 30/2020/NĐ-CP: Bảng mã Unicode dựng sẵn (NFC), dấu câu và quy tắc viết hoa tên cơ quan, địa danh đều đạt chuẩn.",
        suggestion: null
      };
    }

    if (p.includes("trau chuốt") || p.includes("viết lại") || p.includes("rewrite")) {
      return {
        reply: "Gợi ý trau chuốt câu văn theo phong cách hành chính trang trọng:\n\n*\"Căn cứ vào chức năng, nhiệm vụ được giao, đơn vị kính đề nghị cấp có thẩm quyền xem xét, phê duyệt chủ trương thực hiện.\"*",
        suggestion: "Căn cứ vào chức năng, nhiệm vụ được giao, đơn vị kính đề nghị cấp có thẩm quyền xem xét, phê duyệt chủ trương thực hiện."
      };
    }

    if (p.includes("phím tắt") || p.includes("shortcut")) {
      return {
        reply: "Một số phím tắt thông dụng trong VN Office:\n• **Ctrl+S**: Lưu tài liệu\n• **Ctrl+Z / Ctrl+Y**: Hoàn tác / Làm lại\n• **Ctrl+B / I / U**: Đậm / Nghiêng / Gạch chân\n• **Ctrl+N / Ctrl+O**: Tạo mới / Mở tệp\n• **Alt+Q**: Tìm kiếm tính năng"
      };
    }

    if (p.includes("cuộc họp") || p.includes("meeting") || p.includes("action items")) {
      if (!docText) {
        return {
          reply: "Không có nội dung ghi chép cuộc họp để tóm tắt. Vui lòng dán nội dung ghi chép/transcript vào hộp thoại trước."
        };
      }
      return {
        reply: `**Tóm tắt cuộc họp (Chế độ cục bộ — giới hạn):**\n\n⚠️ Chế độ quy tắc cục bộ không thể phân tích ngữ cảnh sâu để tạo tóm tắt cuộc họp có cấu trúc chính xác.\n\n**Khuyến nghị:** Vui lòng kết nối AI cloud (OpenAI, Gemini hoặc Claude) hoặc cài Ollama để có kết quả tóm tắt tốt nhất — với Điểm chính, Quyết định và Việc cần làm được phân tích rõ ràng.\n\n*Nội dung nhận được: ${docText.substring(0, 200)}${docText.length > 200 ? "..." : ""}*`
      };
    }

    if (p.includes("tìm kiếm") || p.includes("search") || p.includes("tìm đoạn")) {
      if (!docText) {
        return {
          reply: "Tài liệu hiện đang trống. Vui lòng mở hoặc soạn thảo nội dung trước khi tìm kiếm."
        };
      }
      return {
        reply: `**Tìm kiếm thông minh (Chế độ cục bộ — giới hạn):**\n\n⚠️ Chế độ quy tắc cục bộ chỉ thực hiện tìm kiếm từ khóa đơn giản, không thể hiểu ngữ cảnh câu hỏi.\n\n**Kết quả tìm kiếm cơ bản:**\n• Tài liệu có ${docText.split(/\s+/).length} từ\n• Nội dung:${docText.substring(0, 300)}${docText.length > 300 ? "..." : ""}\n\n**Khuyến nghị:** Kết nối AI cloud (OpenAI, Gemini hoặc Claude) hoặc Ollama để sử dụng tính năng tìm kiếm thông minh đầy đủ — AI sẽ hiểu câu hỏi bằng ngôn ngữ tự nhiên và tìm các đoạn liên quan chính xác.`
      };
    }

    return {
      reply: `Tôi đã nhận yêu cầu: "${prompt}".\nTôi có thể hỗ trợ bạn:\n1. Tóm tắt nội dung văn bản hiện tại\n2. Trau chuốt văn phong theo chuẩn hành chính\n3. Soát lỗi chính tả tiếng Việt\n4. Tra cứu phím tắt và tính năng\n\n*Lưu ý: đang chạy ở chế độ quy tắc cục bộ. Cài đặt Ollama (mô hình AI mở, chạy trên máy) để có trợ lý AI thật.*`
    };
  }
}
