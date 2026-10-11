/** Quản lý API key BYOK trên thiết bị cho từng cloud provider. */
const PROVIDERS = Object.freeze(["openai", "gemini", "claude"]);
const STORAGE_PREFIX = "vno-ai-apikey-";
const memoryFallback = new Map();

function assertProvider(providerId) {
  if (!PROVIDERS.includes(providerId)) throw new Error(`Cloud provider không được hỗ trợ: ${providerId}`);
}

function storageKey(providerId) { return `${STORAGE_PREFIX}${providerId}`; }

function read(providerId) {
  const key = storageKey(providerId);
  try {
    if (typeof localStorage !== "undefined") return localStorage.getItem(key) || "";
  } catch { /* localStorage bị chặn: dùng bộ nhớ phiên. */ }
  return memoryFallback.get(key) || "";
}

function write(providerId, value) {
  const key = storageKey(providerId);
  try {
    if (typeof localStorage !== "undefined") { localStorage.setItem(key, value); return; }
  } catch { /* localStorage bị chặn: dùng bộ nhớ phiên. */ }
  memoryFallback.set(key, value);
}

function remove(providerId) {
  const key = storageKey(providerId);
  try {
    if (typeof localStorage !== "undefined") { localStorage.removeItem(key); return; }
  } catch { /* localStorage bị chặn: dùng bộ nhớ phiên. */ }
  memoryFallback.delete(key);
}

export const ApiKeyManager = Object.freeze({
  supportedProviders: PROVIDERS,
  getApiKey(providerId) { assertProvider(providerId); return read(providerId); },
  setApiKey(providerId, apiKey) {
    assertProvider(providerId);
    const normalized = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!normalized) throw new Error("API key không được để trống.");
    write(providerId, normalized);
  },
  removeApiKey(providerId) { assertProvider(providerId); remove(providerId); },
  hasApiKey(providerId) { assertProvider(providerId); return read(providerId).length > 0; }
});
