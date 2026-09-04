import {
  LocalAiService, OpenAiProvider, GeminiProvider, ClaudeProvider, OllamaProvider, ApiKeyManager, AiConsentManager
} from "../../platform/ai/ai-service.js";

const PROVIDERS = [
  { provider: OpenAiProvider, endpoint: "api.openai.com", keyHeader: "Authorization", response: { choices: [{ message: { content: "OpenAI OK" } }] } },
  { provider: GeminiProvider, endpoint: "generativelanguage.googleapis.com", keyHeader: "x-goog-api-key", response: { candidates: [{ content: { parts: [{ text: "Gemini OK" }] } }] } },
  { provider: ClaudeProvider, endpoint: "api.anthropic.com", keyHeader: "x-api-key", response: { content: [{ type: "text", text: "Claude OK" }] } }
];

export async function runCloudProviderTests() {
  const results = [];
  const originalFetch = globalThis.fetch;
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name: `${name}: ${error.message}`, pass: false }); }
  };
  AiConsentManager.revokeLocalModelConsent();

  for (const spec of PROVIDERS) {
    await test(`${spec.provider.label}: gọi đúng endpoint, auth và chuẩn hóa response`, async () => {
      const fakeKey = `mock-${spec.provider.id}-key`;
      ApiKeyManager.setApiKey(spec.provider.id, fakeKey);
      let request;
      globalThis.fetch = async (url, options) => {
        request = { url, options };
        return { ok: true, status: 200, json: async () => spec.response };
      };
      const result = await spec.provider.query("Kiểm thử", { documentText: "Nội dung" });
      if (!request.url.includes(spec.endpoint)) throw new Error("Sai endpoint");
      if (!request.options.headers[spec.keyHeader]?.includes(fakeKey)) throw new Error("Thiếu auth header");
      if (!result.reply || result.providerId !== spec.provider.id) throw new Error("Sai response shape");
      ApiKeyManager.removeApiKey(spec.provider.id);
    });
  }

  await test("Cloud provider: phân loại API key sai rõ ràng", async () => {
    ApiKeyManager.setApiKey("openai", "mock-invalid-key");
    globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: "unauthorized" } }) });
    let message = "";
    try { await OpenAiProvider.query("test"); } catch (error) { message = error.message; }
    if (!message.includes("API key không hợp lệ")) throw new Error(message || "Không throw");
    ApiKeyManager.removeApiKey("openai");
  });

  await test("LocalAiService: cloud lỗi thì báo rõ và fallback rule-based", async () => {
    ApiKeyManager.setApiKey("gemini", "mock-quota-key");
    LocalAiService.setSelectedProviderId("gemini");
    globalThis.fetch = async () => ({ ok: false, status: 429, json: async () => ({ error: { message: "quota" } }) });
    const result = await LocalAiService.query("phím tắt");
    if (result.providerId !== "rule-based" || !result.reply.includes("hạn mức")) throw new Error("Fallback không rõ ràng");
    ApiKeyManager.removeApiKey("gemini");
    LocalAiService.setSelectedProviderId("local");
  });

  await test("Cloud provider: signal hủy request được truyền tới fetch", async () => {
    ApiKeyManager.setApiKey("claude", "mock-cancel-key");
    globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
    });
    const controller = new AbortController();
    const pending = ClaudeProvider.query("test", { signal: controller.signal });
    controller.abort();
    let message = "";
    try { await pending; } catch (error) { message = error.message; }
    if (!message.includes("người dùng hủy")) throw new Error(message || "Không hủy");
    ApiKeyManager.removeApiKey("claude");
  });

  await test("OllamaProvider: nút Dừng cũng hủy request cục bộ", async () => {
    globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })), { once: true });
    });
    const controller = new AbortController();
    const pending = OllamaProvider.query("test", { signal: controller.signal });
    controller.abort();
    let message = "";
    try { await pending; } catch (error) { message = error.message; }
    if (!message.includes("người dùng hủy")) throw new Error(message || "Không hủy");
  });

  globalThis.fetch = originalFetch;
  for (const id of ApiKeyManager.supportedProviders) ApiKeyManager.removeApiKey(id);
  LocalAiService.setSelectedProviderId("local");
  return results;
}
