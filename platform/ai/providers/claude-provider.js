import { ApiKeyManager } from "../api-key-manager.js";
import { SYSTEM_PROMPT, buildUserContent, createRequestCancellation, normalizeRequestError, throwProviderHttpError } from "./cloud-provider-utils.js";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";

export class ClaudeProvider {
  static get id() { return "claude"; }
  static get label() { return "Anthropic Claude"; }
  static async isAvailable() { return ApiKeyManager.hasApiKey(this.id); }

  static async query(prompt, context = {}) {
    const apiKey = ApiKeyManager.getApiKey(this.id);
    if (!apiKey) throw new Error(`${this.label}: chưa cấu hình API key.`);
    const cancellation = createRequestCancellation(context.signal);
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        signal: cancellation.signal,
        body: JSON.stringify({
          model: context.model || DEFAULT_MODEL,
          max_tokens: context.maxTokens || 2048,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: buildUserContent(prompt, context) }]
        })
      });
      if (!response.ok) await throwProviderHttpError(response, this.label);
      const data = await response.json();
      const reply = data?.content?.filter(item => item.type === "text").map(item => item.text).join("").trim();
      if (!reply) throw new Error(`${this.label}: phản hồi không có nội dung hợp lệ.`);
      return { reply, providerId: this.id };
    } catch (error) {
      throw normalizeRequestError(error, this.label, cancellation);
    } finally { cancellation.cleanup(); }
  }
}
