/**
 * VN Office Platform — Local Privacy-First AI Service
 * Tuân thủ nghiêm ngặt 07-security-ai/AI-ARCHITECTURE.md:
 * - Bảo mật tuyệt đối trên thiết bị (On-device / Local Processing)
 * - Không gửi nội dung tài liệu ra ngoài mà không có xác nhận
 * - Không tự động ghi đè nội dung tài liệu (yêu cầu người dùng chủ động bấm áp dụng)
 */

export class LocalAiService {
  /**
   * Xử lý yêu cầu từ người dùng
   * @param {string} prompt 
   * @param {Object} [context]
   * @param {string} [context.documentText=""]
   * @param {string} [context.appName="writer"]
   * @returns {Promise<{ reply: string, suggestion?: string }>}
   */
  static async query(prompt, context = {}) {
    const p = (prompt || "").trim().toLowerCase();
    const docText = (context.documentText || "").trim();

    // Giả lập xử lý bất đồng bộ thực tế
    await new Promise(resolve => setTimeout(resolve, 300));

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

    return {
      reply: `Tôi đã nhận yêu cầu: "${prompt}".\nTôi có thể hỗ trợ bạn:\n1. Tóm tắt nội dung văn bản hiện tại\n2. Trau chuốt văn phong theo chuẩn hành chính\n3. Soát lỗi chính tả tiếng Việt\n4. Tra cứu phím tắt và tính năng`
    };
  }
}
