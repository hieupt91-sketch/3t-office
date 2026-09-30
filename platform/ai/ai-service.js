/** 3T Office Platform — AI Service / provider orchestrator. */
import { RuleBasedProvider } from "./providers/rule-based-provider.js";
import { OllamaProvider } from "./providers/ollama-provider.js";
import { OpenAiProvider } from "./providers/openai-provider.js";
import { GeminiProvider } from "./providers/gemini-provider.js";
import { ClaudeProvider } from "./providers/claude-provider.js";
import { AiConsentManager } from "./consent-manager.js";
import { ApiKeyManager } from "./api-key-manager.js";

const ACTIVE_PROVIDER_KEY = "vno-ai-active-provider";
const CLOUD_PROVIDERS = Object.freeze({ openai: OpenAiProvider, gemini: GeminiProvider, claude: ClaudeProvider });
const VALID_SELECTIONS = Object.freeze(["local", ...Object.keys(CLOUD_PROVIDERS)]);
let activeProviderFallback = "local";

function readSelection() {
  try {
    if (typeof localStorage !== "undefined") return localStorage.getItem(ACTIVE_PROVIDER_KEY) || activeProviderFallback;
  } catch { /* localStorage bị chặn: dùng bộ nhớ phiên. */ }
  return activeProviderFallback;
}

function writeSelection(providerId) {
  try {
    if (typeof localStorage !== "undefined") { localStorage.setItem(ACTIVE_PROVIDER_KEY, providerId); return; }
  } catch { /* localStorage bị chặn: dùng bộ nhớ phiên. */ }
  activeProviderFallback = providerId;
}

async function getFallbackProvider() {
  if (AiConsentManager.hasLocalModelConsent() && await OllamaProvider.isAvailable()) return OllamaProvider;
  return RuleBasedProvider;
}

export class LocalAiService {
  static getSelectedProviderId() {
    const selected = readSelection();
    return VALID_SELECTIONS.includes(selected) ? selected : "local";
  }

  static setSelectedProviderId(providerId) {
    if (!VALID_SELECTIONS.includes(providerId)) throw new Error(`AI provider không được hỗ trợ: ${providerId}`);
    writeSelection(providerId);
  }

  static getCloudProviders() {
    return Object.values(CLOUD_PROVIDERS).map(provider => ({ id: provider.id, label: provider.label, configured: ApiKeyManager.hasApiKey(provider.id) }));
  }

  /** Trả về provider sẽ thực sự được dùng, không giả vờ cloud khi thiếu key. */
  static async getActiveProviderInfo() {
    const cloudProvider = CLOUD_PROVIDERS[this.getSelectedProviderId()];
    if (cloudProvider && await cloudProvider.isAvailable()) return { id: cloudProvider.id, label: cloudProvider.label };
    const fallback = await getFallbackProvider();
    return { id: fallback.id, label: fallback.label };
  }

  static async query(prompt, context = {}) {
    const cloudProvider = CLOUD_PROVIDERS[this.getSelectedProviderId()];
    if (cloudProvider && await cloudProvider.isAvailable()) {
      try { return await cloudProvider.query(prompt, context); }
      catch (error) {
        if (context.signal?.aborted) throw error;
        return this._ruleBasedFallback(prompt, context, error);
      }
    }

    const fallbackProvider = await getFallbackProvider();
    if (fallbackProvider === OllamaProvider) {
      try {
        const result = await OllamaProvider.query(prompt, context);
        return { ...result, providerId: OllamaProvider.id };
      } catch (error) {
        if (context.signal?.aborted) throw error;
        return this._ruleBasedFallback(prompt, context, error);
      }
    }
    const result = await RuleBasedProvider.query(prompt, context);
    return { ...result, providerId: RuleBasedProvider.id };
  }

  static async _ruleBasedFallback(prompt, context, error) {
    const fallback = await RuleBasedProvider.query(prompt, context);
    return {
      reply: `⚠️ ${error.message} Đã chuyển tạm sang chế độ quy tắc cục bộ.\n\n${fallback.reply}`,
      providerId: RuleBasedProvider.id,
      providerError: error.message
    };
  }
}

export { RuleBasedProvider, OllamaProvider, OpenAiProvider, GeminiProvider, ClaudeProvider, AiConsentManager, ApiKeyManager };
