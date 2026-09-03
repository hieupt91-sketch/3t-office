/**
 * VN Office AI — Ollama Local Model Provider
 * Gọi thật tới một tiến trình Ollama (https://ollama.com) chạy cục bộ trên máy người dùng
 * (mã nguồn mở, model chạy hoàn toàn trên thiết bị — không có dữ liệu tài liệu rời khỏi máy).
 * Tuân thủ 07-security-ai/AI-ARCHITECTURE.md: chỉ dùng khi có sự đồng ý (consent) rõ ràng
 * từ người dùng, xem platform/ai/consent-manager.js.
 */

const OLLAMA_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2";
const AVAILABILITY_CHECK_TIMEOUT_MS = 1500;
const QUERY_TIMEOUT_MS = 30000;

export class OllamaProvider {
  static get id() {
    return "ollama";
  }

  static get label() {
    return "Ollama (mô hình AI cục bộ, mã nguồn mở)";
  }

  /**
   * Kiểm tra thật xem có tiến trình Ollama đang chạy trên máy không (không giả định).
   * @returns {Promise<boolean>}
   */
  static async isAvailable() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AVAILABILITY_CHECK_TIMEOUT_MS);
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: controller.signal });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Lấy danh sách model thật đã cài trên Ollama cục bộ (rỗng nếu Ollama không chạy).
   * @returns {Promise<string[]>}
   */
  static async listModels() {
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.models || []).map(m => m.name);
    } catch {
      return [];
    }
  }

  /**
   * @param {string} prompt
   * @param {Object} [context]
   * @param {string} [context.documentText=""]
   * @param {string} [context.appName="writer"]
   * @param {string} [context.model]
   * @returns {Promise<{ reply: string, suggestion?: string }>}
   */
  static async query(prompt, context = {}) {
    const model = context.model || DEFAULT_MODEL;
    const docText = (context.documentText || "").slice(0, 6000); // giới hạn để tránh prompt quá lớn

    const systemPrompt =
      "Bạn là Trợ lý VN AI, tích hợp trong bộ phần mềm văn phòng VN Office. " +
      "Trả lời ngắn gọn, chính xác, bằng tiếng Việt, theo phong cách hành chính khi phù hợp. " +
      "Không tự ý bịa nội dung tài liệu không có trong ngữ cảnh được cung cấp.";

    const userContent = docText
      ? `Ngữ cảnh tài liệu hiện tại (ứng dụng: ${context.appName || "writer"}):\n"""\n${docText}\n"""\n\nYêu cầu của người dùng: ${prompt}`
      : prompt;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ]
        })
      });

      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`Ollama trả về lỗi HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data?.message?.content?.trim();

      if (!reply) {
        throw new Error("Ollama không trả về nội dung hợp lệ.");
      }

      return { reply };
    } catch (err) {
      clearTimeout(timer);
      const reason = err && err.name === "AbortError" ? "hết thời gian chờ phản hồi" : err.message;
      throw new Error(`Không thể truy vấn Ollama cục bộ (${reason}).`);
    }
  }
}
