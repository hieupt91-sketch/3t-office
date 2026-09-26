/**
 * VN Office Cloud — Quản lý Token OAuth (Access Token + Refresh Token).
 *
 * LƯU Ý BẢO MẬT: Hiện tại token được lưu trong localStorage vì pywebview
 * không có encrypted storage tích hợp sẵn. Đây là hạn chế tạm thời.
 * Nếu cần bảo mật cao hơn, có thể nâng cấp lên Windows Credential Manager
 * qua Python keyring (cần thêm dependency).
 *
 * KHÔNG lưu Client Secret (PKCE không cần secret).
 */

const STORAGE_PREFIX = "vno-cloud-token-";
const memoryFallback = new Map();

function storageKey(providerId) { return `${STORAGE_PREFIX}${providerId}`; }

function readToken(providerId) {
  const key = storageKey(providerId);
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }
  } catch { /* localStorage unavailable */ }
  const raw = memoryFallback.get(key);
  return raw ? JSON.parse(raw) : null;
}

function writeToken(providerId, data) {
  const key = storageKey(providerId);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
      return;
    }
  } catch { /* localStorage unavailable */ }
  memoryFallback.set(key, JSON.stringify(data));
}

function removeToken(providerId) {
  const key = storageKey(providerId);
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
      return;
    }
  } catch { /* localStorage unavailable */ }
  memoryFallback.delete(key);
}

/**
 * Kiểm tra token còn hiệu lực không (dựa trên expires_at timestamp).
 */
function isTokenValid(tokenData) {
  if (!tokenData || !tokenData.accessToken) return false;
  if (!tokenData.expiresAt) return true;
  return Date.now() < tokenData.expiresAt - 30000;
}

export const CloudTokenManager = Object.freeze({
  /**
   * Lưu token mới sau khi đổi code lấy token.
   * @param {string} providerId - "google" hoặc "onedrive"
   * @param {Object} tokenResponse - Response từ token endpoint
   */
  saveToken(providerId, tokenResponse) {
    if (!providerId) throw new Error("Thiếu provider ID.");
    const data = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || null,
      tokenType: tokenResponse.token_type || "Bearer",
      scope: tokenResponse.scope || "",
      expiresAt: tokenResponse.expires_in
        ? Date.now() + tokenResponse.expires_in * 1000
        : null,
      savedAt: Date.now(),
    };
    writeToken(providerId, data);
  },

  /**
   * Lấy access token hiện tại (null nếu chưa có hoặc hết hạn).
   */
  getAccessToken(providerId) {
    const data = readToken(providerId);
    if (!isTokenValid(data)) return null;
    return data.accessToken;
  },

  /**
   * Lấy refresh token.
   */
  getRefreshToken(providerId) {
    const data = readToken(providerId);
    return data?.refreshToken || null;
  },

  /**
   * Lấy toàn bộ token data.
   */
  getTokenData(providerId) {
    return readToken(providerId);
  },

  /**
   * Cập nhật access token sau khi refresh.
   */
  updateAccessToken(providerId, tokenResponse) {
    const existing = readToken(providerId);
    if (!existing) return;
    existing.accessToken = tokenResponse.access_token;
    existing.tokenType = tokenResponse.token_type || existing.tokenType;
    existing.expiresAt = tokenResponse.expires_in
      ? Date.now() + tokenResponse.expires_in * 1000
      : existing.expiresAt;
    existing.savedAt = Date.now();
    writeToken(providerId, existing);
  },

  /**
   * Xóa token (đăng xuất).
   */
  removeToken(providerId) {
    removeToken(providerId);
  },

  /**
   * Kiểm tra đã có token hợp lệ chưa.
   */
  hasValidToken(providerId) {
    return isTokenValid(readToken(providerId));
  },

  /**
   * Kiểm tra đã kết nối (có token, kể cả hết hạn nhưng có refresh token).
   */
  isConnected(providerId) {
    const data = readToken(providerId);
    return !!(data && data.accessToken);
  },
});
