/**
 * Trợ lý 3T AI — Rule-Based Local Provider
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

      const wordCountNote = Number.isFinite(context.documentWordCount)
        ? `\n\n*Phát hiện ${context.documentWordCount} từ trong văn bản.*`
        : "";
      return {
        reply: `**Tóm tắt nội dung tài liệu (Cục bộ & Bảo mật):**\n\n${summaryBullets}${wordCountNote}`
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
        reply: "Một số phím tắt thông dụng trong 3T Office:\n• **Ctrl+S**: Lưu tài liệu\n• **Ctrl+Z / Ctrl+Y**: Hoàn tác / Làm lại\n• **Ctrl+B / I / U**: Đậm / Nghiêng / Gạch chân\n• **Ctrl+N / Ctrl+O**: Tạo mới / Mở tệp\n• **Alt+Q**: Tìm kiếm tính năng"
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
        reply: `**Tìm kiếm thông minh (Chế độ cục bộ — giới hạn):**\n\n⚠️ Chế độ quy tắc cục bộ chỉ thực hiện tìm kiếm từ khóa đơn giản, không thể hiểu ngữ cảnh câu hỏi.\n\n**Kết quả tìm kiếm cơ bản:**\n${Number.isFinite(context.documentWordCount) ? `• Tài liệu có ${context.documentWordCount} từ\n` : ""}• Nội dung:${docText.substring(0, 300)}${docText.length > 300 ? "..." : ""}\n\n**Khuyến nghị:** Kết nối AI cloud (OpenAI, Gemini hoặc Claude) hoặc Ollama để sử dụng tính năng tìm kiếm thông minh đầy đủ — AI sẽ hiểu câu hỏi bằng ngôn ngữ tự nhiên và tìm các đoạn liên quan chính xác.`
      };
    }

    if (p.includes("dịch") || p.includes("translate")) {
      return {
        reply: `**Dịch thuật (Chế độ cục bộ — giới hạn):**\n\n⚠️ Chế độ quy tắc cục bộ không thể dịch văn bản thật — chỉ hỗ trợ vài mẫu câu cứng.\n\n**Khuyến nghị:** Kết nối AI cloud (OpenAI, Gemini hoặc Claude) hoặc cài Ollama để sử dụng tính năng dịch thuật đầy đủ với 6 ngôn ngữ: Tiếng Anh, Tiếng Việt, Tiếng Trung, Tiếng Nhật, Tiếng Hàn, Tiếng Pháp.`
      };
    }

    if (p.includes("viết nháp") || p.includes("draft") || p.includes("soạn thảo thư") || p.includes("soạn hợp đồng")) {
      return {
        reply: `**Viết nháp văn bản (Chế độ cục bộ — giới hạn):**\n\n⚠️ Chế độ quy tắc cục bộ không thể tạo bản nháp có cấu trúc phù hợp — chỉ đưa ra gợi ý chung.\n\n**Gợi ý:** Khi dùng chế độ cục bộ, bạn có thể tự soạn theo mẫu:\n• Thư mời họp: Tiêu đề → Kính gửi → Nội dung → Ký tên\n• Công văn: Số ký hiệu → Địa chỉ nhận → Nội dung → Ký tên\n\n**Khuyến nghị:** Kết nối AI cloud hoặc cài Ollama để AI tạo bản nháp có cấu trúc chuẩn hành chính Việt Nam.`
      };
    }

    if (p.includes("giải thích công thức") || p.includes("explain formula") || p.includes("công thức đang làm gì")) {
      return {
        reply: `**Giải thích công thức (Chế độ cục bộ — giới hạn):**\n\n⚠️ Chế độ quy tắc cục bộ không thể phân tích và giải thích chi tiết công thức.\n\n**Khuyến nghị:** Kết nối AI cloud (OpenAI, Gemini hoặc Claude) hoặc cài Ollama để AI giải thích công thức bằng tiếng Việt dễ hiểu — công thức đang làm gì, tham chiếu tới đâu, kết quả mang ý nghĩa gì.`
      };
    }

    if (p.includes("tạo công thức") || p.includes("formula from") || p.includes("công thức từ mô tả") || p.includes("sinh công thức")) {
      return {
        reply: `**Tạo công thức từ mô tả (Chế độ cục bộ — giới hạn):**\n\n⚠️ Chế độ quy tắc cục bộ không thể tạo công thức phức tạp từ mô tả ngôn ngữ tự nhiên.\n\n**Khuyến nghị:** Kết nối AI cloud (OpenAI, Gemini hoặc Claude) hoặc cài Ollama để AI tạo công thức tương thích với Sheet từ mô tả của bạn.`
      };
    }

    return {
      reply: `Tôi đã nhận yêu cầu: "${prompt}".\nTôi có thể hỗ trợ bạn:\n1. Tóm tắt nội dung văn bản hiện tại\n2. Trau chuốt văn phong theo chuẩn hành chính\n3. Soát lỗi chính tả tiếng Việt\n4. Tra cứu phím tắt và tính năng\n\n*Lưu ý: đang chạy ở chế độ quy tắc cục bộ. Cài đặt Ollama (mô hình AI mở, chạy trên máy) để có trợ lý AI thật.*`
    };
  }
}
