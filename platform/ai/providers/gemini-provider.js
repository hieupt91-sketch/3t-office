import { ApiKeyManager } from "../api-key-manager.js";
import { SYSTEM_PROMPT, buildUserContent, createRequestCancellation, normalizeRequestError, throwProviderHttpError } from "./cloud-provider-utils.js";

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.0-flash";

export class GeminiProvider {
  static get id() { return "gemini"; }
  static get label() { return "Google Gemini"; }
  static async isAvailable() { return ApiKeyManager.hasApiKey(this.id); }

  static async query(prompt, context = {}) {
    const apiKey = ApiKeyManager.getApiKey(this.id);
    if (!apiKey) throw new Error(`${this.label}: chưa cấu hình API key.`);
    const model = encodeURIComponent(context.model || DEFAULT_MODEL);
    const cancellation = createRequestCancellation(context.signal);
    try {
      const response = await fetch(`${API_ROOT}/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: cancellation.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: buildUserContent(prompt, context) }] }]
        })
      });
      if (!response.ok) await throwProviderHttpError(response, this.label);
      const data = await response.json();
      const reply = data?.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("").trim();
      if (!reply) throw new Error(`${this.label}: phản hồi không có nội dung hợp lệ.`);
      return { reply, providerId: this.id };
    } catch (error) {
      throw normalizeRequestError(error, this.label, cancellation);
    } finally { cancellation.cleanup(); }
  }
}
