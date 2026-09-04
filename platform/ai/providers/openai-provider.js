import { ApiKeyManager } from "../api-key-manager.js";
import { SYSTEM_PROMPT, buildUserContent, createRequestCancellation, normalizeRequestError, throwProviderHttpError } from "./cloud-provider-utils.js";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_MODEL = "gpt-4o-mini";

export class OpenAiProvider {
  static get id() { return "openai"; }
  static get label() { return "OpenAI (ChatGPT)"; }
  static async isAvailable() { return ApiKeyManager.hasApiKey(this.id); }

  static async query(prompt, context = {}) {
    const apiKey = ApiKeyManager.getApiKey(this.id);
    if (!apiKey) throw new Error(`${this.label}: chưa cấu hình API key.`);
    const cancellation = createRequestCancellation(context.signal);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: cancellation.signal,
        body: JSON.stringify({
          model: context.model || DEFAULT_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: buildUserContent(prompt, context) }
          ]
        })
      });
      if (!response.ok) await throwProviderHttpError(response, this.label);
      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new Error(`${this.label}: phản hồi không có nội dung hợp lệ.`);
      return { reply, providerId: this.id };
    } catch (error) {
      throw normalizeRequestError(error, this.label, cancellation);
    } finally { cancellation.cleanup(); }
  }
}
