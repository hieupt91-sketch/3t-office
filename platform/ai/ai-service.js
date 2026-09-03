/**
 * VN Office Platform — AI Service (Provider Orchestrator)
 * Tuân thủ nghiêm ngặt 07-security-ai/AI-ARCHITECTURE.md:
 *   AI UI -> VN AI Service (file này) -> Context/Permission Layer -> Provider Interface
 *     -> Local Model (Ollama, nếu có consent + đang chạy) hoặc Rule-Based fallback.
 * KHÔNG có Cloud Provider nào được cấu hình sẵn — thêm provider trả phí/bên ngoài
 * cần quyết định rõ ràng từ chủ dự án (xem AGENTS.md mục 10 "Stop and ask").
 *
 * Giữ nguyên interface tĩnh `LocalAiService.query()` để tương thích ngược với
 * platform/shell/app-shell.js — không đổi chữ ký hàm.
 */

import { RuleBasedProvider } from "./providers/rule-based-provider.js";
import { OllamaProvider } from "./providers/ollama-provider.js";
import { AiConsentManager } from "./consent-manager.js";

export class LocalAiService {
  /**
   * Cho UI biết provider nào đang thực sự được dùng (không giả vờ) — hữu ích để
   * hiển thị trạng thái thật trong AI Sidebar.
   * @returns {Promise<{ id: string, label: string }>}
   */
  static async getActiveProviderInfo() {
    if (AiConsentManager.hasLocalModelConsent() && (await OllamaProvider.isAvailable())) {
      return { id: OllamaProvider.id, label: OllamaProvider.label };
    }
    return { id: RuleBasedProvider.id, label: RuleBasedProvider.label };
  }

  /**
   * @param {string} prompt
   * @param {Object} [context]
   * @param {string} [context.documentText=""]
   * @param {string} [context.appName="writer"]
   * @returns {Promise<{ reply: string, suggestion?: string, providerId?: string }>}
   */
  static async query(prompt, context = {}) {
    const wantsLocalModel = AiConsentManager.hasLocalModelConsent();

    if (wantsLocalModel) {
      const available = await OllamaProvider.isAvailable();
      if (available) {
        try {
          const result = await OllamaProvider.query(prompt, context);
          return { ...result, providerId: OllamaProvider.id };
        } catch (err) {
          // Không âm thầm nuốt lỗi bảo mật/kết nối — báo rõ cho người dùng và
          // rơi về rule-based fallback để trợ lý vẫn phản hồi được điều gì đó.
          const fallback = await RuleBasedProvider.query(prompt, context);
          return {
            reply: `⚠️ ${err.message} Đã chuyển tạm sang chế độ quy tắc cục bộ.\n\n${fallback.reply}`,
            providerId: RuleBasedProvider.id
          };
        }
      }
    }

    const result = await RuleBasedProvider.query(prompt, context);
    return { ...result, providerId: RuleBasedProvider.id };
  }
}

export { RuleBasedProvider, OllamaProvider, AiConsentManager };
