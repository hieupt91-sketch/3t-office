/**
 * VN Office Cloud — OAuth 2.0 PKCE Flow cho Google Drive & OneDrive.
 *
 * luồng:
 * 1. Sinh code_verifier + code_challenge (Web Crypto API, không cần thư viện ngoài).
 * 2. Mở loopback server qua Python (main.py js_api).
 * 3. Mở cửa sổ đăng nhập tới provider.
 * 4. Provider redirect về loopback với code.
 * 5. JS gọi token endpoint để đổi code lấy token.
 * 6. Đóng loopback server.
 *
 * KHÔNG cần Client Secret (PKCE).
 */

import { CloudConfig } from "./cloud-config.js";
import { CloudTokenManager } from "./cloud-token-manager.js";

const OAUTH_STATE_KEY = "vno-cloud-oauth-state";
const OAUTH_STATE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Tạo code_verifier (43-128 ký tự, RFC 7636).
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Tạo code_challenge từ code_verifier (SHA-256, S256).
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64-url encode (không padding, dùng ký tự URL-safe).
 */
function base64UrlEncode(buffer) {
  let binary = "";
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Tạo state parameter ngẫu nhiên để chống CSRF.
 */
function generateState() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Lưu state để xác thực callback.
 */
function saveState(state) {
  const data = { state, createdAt: Date.now() };
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(OAUTH_STATE_KEY, JSON.stringify(data));
    }
  } catch { /* ignore */ }
}

/**
 * Xác thực và xóa state từ callback.
 */
function consumeState(receivedState) {
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(OAUTH_STATE_KEY);
      if (!raw) return false;
      localStorage.removeItem(OAUTH_STATE_KEY);
      const data = JSON.parse(raw);
      if (data.state !== receivedState) return false;
      if (Date.now() - data.createdAt > OAUTH_STATE_TIMEOUT_MS) return false;
      return true;
    }
  } catch { /* ignore */ }
  return false;
}

/**
 * Xây dựng authorization URL.
 */
function buildAuthUrl(provider, clientId, redirectUri, codeChallenge, state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: provider.scopes.join(" "),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent",
  });

  if (provider.id === "google") {
    params.set("access_type", "offline");
  }

  return `${provider.authEndpoint}?${params.toString()}`;
}

/**
 * Đổi authorization code lấy token.
 */
async function exchangeCodeForToken(provider, code, codeVerifier, redirectUri) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: CloudConfig.getClientId(provider.id),
    code_verifier: codeVerifier,
  });

  const response = await fetch(provider.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error_description || errorData.error || `HTTP ${response.status}`;
    throw new Error(`Đổi code lấy token thất bại: ${errorMessage}`);
  }

  return response.json();
}

/**
 * Refresh access token khi hết hạn.
 */
async function refreshAccessToken(provider, refreshToken) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CloudConfig.getClientId(provider.id),
  });

  const response = await fetch(provider.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error("Refresh token thất bại. Vui lòng kết nối lại.");
  }

  return response.json();
}

/**
 * Kiểm tra pywebview API có sẵn không.
 */
function getPywebviewApi() {
  if (typeof window !== "undefined" && window.pywebview && window.pywebview.api) {
    return window.pywebview.api;
  }
  return null;
}

export const CloudOAuth = Object.freeze({
  /**
   * Bắt đầu luồng OAuth PKCE.
   * @param {string} providerId - "google" hoặc "onedrive"
   * @returns {Promise<{status: string, providerId: string}>}
   */
  async startAuthFlow(providerId) {
    const provider = CloudConfig.providers[providerId];
    if (!provider) throw new Error(`Nhà cung cấp không hỗ trợ: ${providerId}`);

    const validation = CloudConfig.validateClientId(providerId);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const clientId = CloudConfig.getClientId(providerId);

    const pywebviewApi = getPywebviewApi();
    if (!pywebviewApi) {
      throw new Error("Không kết nối được với ứng dụng desktop. Vui lòng khởi động lại VN Office.");
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    saveState(state);

    let loopbackPort;
    try {
      loopbackPort = await pywebviewApi.startOAuthLoopback();
    } catch (err) {
      throw new Error(`Không thể khởi động cổng callback: ${err.message || err}`);
    }

    if (!loopbackPort || loopbackPort < 1) {
      throw new Error("Không tìm thấy cổng trống cho OAuth callback.");
    }

    const redirectUri = `http://127.0.0.1:${loopbackPort}/callback`;
    const authUrl = buildAuthUrl(provider, clientId, redirectUri, codeChallenge, state);

    try {
      await pywebviewApi.openExternalUrl(authUrl);
    } catch (err) {
      await pywebviewApi.stopOAuthLoopback();
      throw new Error(`Không mở được trình duyệt: ${err.message || err}`);
    }

    const pollInterval = 500;
    const maxWaitMs = 5 * 60 * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      let callbackData;
      try {
        callbackData = await pywebviewApi.pollOAuthCallback();
      } catch {
        continue;
      }

      if (!callbackData) continue;

      if (callbackData.error) {
        await pywebviewApi.stopOAuthLoopback();
        throw new Error(`Đăng nhập bị từ chối: ${callbackData.error_description || callbackData.error}`);
      }

      if (callbackData.code) {
        if (!consumeState(callbackData.state)) {
          await pywebviewApi.stopOAuthLoopback();
          throw new Error("Xác thực OAuth thất bại (state không hợp lệ). Vui lòng thử lại.");
        }

        try {
          const tokenResponse = await exchangeCodeForToken(provider, callbackData.code, codeVerifier, redirectUri);
          CloudTokenManager.saveToken(providerId, tokenResponse);
          await pywebviewApi.stopOAuthLoopback();
          return { status: "ok", providerId };
        } catch (err) {
          await pywebviewApi.stopOAuthLoopback();
          throw err;
        }
      }
    }

    await pywebviewApi.stopOAuthLoopback();
    throw new Error("Hết thời gian chờ đăng nhập. Vui lòng thử lại.");
  },

  /**
   * Đăng xuất (xóa token).
   */
  disconnect(providerId) {
    CloudTokenManager.removeToken(providerId);
    return { status: "ok", providerId };
  },

  /**
   * Kiểm tra trạng thái kết nối.
   */
  getConnectionStatus(providerId) {
    const connected = CloudTokenManager.isConnected(providerId);
    const valid = CloudTokenManager.hasValidToken(providerId);
    return { connected, valid, providerId };
  },

  /**
   * Refresh token nếu hết hạn.
   */
  async ensureValidToken(providerId) {
    if (CloudTokenManager.hasValidToken(providerId)) {
      return CloudTokenManager.getAccessToken(providerId);
    }

    const refreshToken = CloudTokenManager.getRefreshToken(providerId);
    if (!refreshToken) return null;

    const provider = CloudConfig.providers[providerId];
    try {
      const tokenResponse = await refreshAccessToken(provider, refreshToken);
      CloudTokenManager.updateAccessToken(providerId, tokenResponse);
      return tokenResponse.access_token;
    } catch {
      CloudTokenManager.removeToken(providerId);
      return null;
    }
  },

  generateCodeVerifier,
  generateCodeChallenge,
  base64UrlEncode,
  generateState,
});
