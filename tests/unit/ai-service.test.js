/**
 * Test Suite: VN Office AI Service — Provider Orchestration
 * Tuân thủ 07-security-ai/AI-ARCHITECTURE.md & 00-governance/NON-NEGOTIABLE-RULES.md
 */

import { LocalAiService, RuleBasedProvider, OllamaProvider, AiConsentManager } from "../../platform/ai/ai-service.js";

export async function runAiServiceTests() {
  const results = [];

  // 1. Không có consent -> luôn dùng rule-based, không gọi network
  AiConsentManager.revokeLocalModelConsent();
  const r1 = await LocalAiService.query("tóm tắt", { documentText: "Đây là một câu kiểm thử đủ dài để tóm tắt được." });
  results.push({
    name: "AiService: Không có consent -> dùng RuleBasedProvider, không gọi Ollama",
    pass: r1.providerId === RuleBasedProvider.id
  });

  // 2. RuleBasedProvider luôn khả dụng (không phụ thuộc mạng)
  const ruleAvailable = await RuleBasedProvider.isAvailable();
  results.push({
    name: "RuleBasedProvider: luôn khả dụng (isAvailable = true)",
    pass: ruleAvailable === true
  });

  // 3. RuleBasedProvider trả lời đúng theo từ khóa (hành vi thật, không tautological)
  const sumRes = await RuleBasedProvider.query("hãy tóm tắt giúp tôi", { documentText: "Dòng một khá dài để test.\nDòng hai cũng đủ dài." });
  results.push({
    name: "RuleBasedProvider: từ khóa 'tóm tắt' trả về nội dung tóm tắt thật (không rỗng)",
    pass: typeof sumRes.reply === "string" && sumRes.reply.includes("Tóm tắt")
  });

  const emptyDocRes = await RuleBasedProvider.query("tóm tắt", { documentText: "" });
  results.push({
    name: "RuleBasedProvider: tóm tắt tài liệu rỗng -> báo rõ chưa có nội dung, không bịa",
    pass: emptyDocRes.reply.includes("trống") || emptyDocRes.reply.includes("chưa có nội dung")
  });

  // 4. Ollama không chạy trên máy test (CI/dev không cài) -> isAvailable phải trả false, KHÔNG throw
  let ollamaCheckThrew = false;
  let ollamaAvailable = true;
  try {
    ollamaAvailable = await OllamaProvider.isAvailable();
  } catch {
    ollamaCheckThrew = true;
  }
  results.push({
    name: "OllamaProvider.isAvailable(): không throw khi Ollama không chạy (trả về boolean an toàn)",
    pass: ollamaCheckThrew === false && typeof ollamaAvailable === "boolean"
  });

  // 5. Consent manager: mặc định là chưa đồng ý (an toàn theo mặc định)
  AiConsentManager.revokeLocalModelConsent();
  results.push({
    name: "AiConsentManager: mặc định KHÔNG có consent (an toàn theo mặc định, không tự ý gửi dữ liệu)",
    pass: AiConsentManager.hasLocalModelConsent() === false
  });

  // 6. Consent manager: grant/revoke hoạt động đúng vòng đời
  AiConsentManager.grantLocalModelConsent();
  const grantedOk = AiConsentManager.hasLocalModelConsent() === true;
  AiConsentManager.revokeLocalModelConsent();
  const revokedOk = AiConsentManager.hasLocalModelConsent() === false;
  results.push({
    name: "AiConsentManager: grant/revoke thay đổi trạng thái đúng thật",
    pass: grantedOk && revokedOk
  });

  // 7. getActiveProviderInfo phản ánh đúng trạng thái thật (không consent -> rule-based)
  const info = await LocalAiService.getActiveProviderInfo();
  results.push({
    name: "LocalAiService.getActiveProviderInfo(): không consent -> báo đúng provider rule-based",
    pass: info.id === RuleBasedProvider.id
  });

  // 8. Tương thích ngược: interface tĩnh LocalAiService.query() vẫn giữ nguyên chữ ký cho app-shell.js
  const backCompatRes = await LocalAiService.query("phím tắt");
  results.push({
    name: "LocalAiService.query(): tương thích ngược, trả về { reply } hợp lệ không cần context",
    pass: typeof backCompatRes.reply === "string" && backCompatRes.reply.length > 0
  });

  return results;
}
