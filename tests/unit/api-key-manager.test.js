import { ApiKeyManager } from "../../platform/ai/api-key-manager.js";

export async function runApiKeyManagerTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name: `${name}: ${error.message}`, pass: false }); }
  };
  for (const id of ApiKeyManager.supportedProviders) ApiKeyManager.removeApiKey(id);
  await test("ApiKeyManager: lưu/đọc/trạng thái/xóa key riêng theo provider", () => {
    ApiKeyManager.setApiKey("openai", "  test-openai-key  ");
    ApiKeyManager.setApiKey("gemini", "test-gemini-key");
    if (ApiKeyManager.getApiKey("openai") !== "test-openai-key") throw new Error("OpenAI key sai");
    if (!ApiKeyManager.hasApiKey("gemini") || ApiKeyManager.hasApiKey("claude")) throw new Error("Trạng thái sai");
    ApiKeyManager.removeApiKey("openai");
    if (ApiKeyManager.hasApiKey("openai")) throw new Error("Không xóa được key");
  });
  await test("ApiKeyManager: từ chối provider lạ và key rỗng", () => {
    let invalidProvider = false, emptyKey = false;
    try { ApiKeyManager.getApiKey("unknown"); } catch { invalidProvider = true; }
    try { ApiKeyManager.setApiKey("claude", "  "); } catch { emptyKey = true; }
    if (!invalidProvider || !emptyKey) throw new Error("Validation chưa đầy đủ");
  });
  for (const id of ApiKeyManager.supportedProviders) ApiKeyManager.removeApiKey(id);
  return results;
}
