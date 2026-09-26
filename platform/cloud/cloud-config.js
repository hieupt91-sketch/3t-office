/**
 * VN Office Cloud — Cấu hình OAuth Client ID cho Google Drive & OneDrive.
 * Client ID là giá trị do chủ dự án tự đăng ký và điền vào (miễn phí).
 * KHÔNG lưu Client Secret (PKCE không cần secret).
 */

const PROVIDERS = Object.freeze({
  google: {
    id: "google",
    label: "Google Drive",
    authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    revokeEndpoint: "https://oauth2.googleapis.com/revoke",
    scopes: ["https://www.googleapis.com/auth/drive.file"],
    uploadEndpoint: "https://www.googleapis.com/upload/drive/v3/files",
    listEndpoint: "https://www.googleapis.com/drive/v3/files",
  },
  onedrive: {
    id: "onedrive",
    label: "OneDrive",
    authEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenEndpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    revokeEndpoint: null,
    scopes: ["Files.ReadWrite"],
    uploadEndpoint: "https://graph.microsoft.com/v1.0/me/drive/root:/VNOffice/:/content",
    listEndpoint: "https://graph.microsoft.com/v1.0/me/drive/recent",
  },
});

const CONFIG_KEY_PREFIX = "vno-cloud-clientid-";

function readClientId(providerId) {
  const key = `${CONFIG_KEY_PREFIX}${providerId}`;
  try {
    if (typeof localStorage !== "undefined") return localStorage.getItem(key) || "";
  } catch { /* localStorage unavailable */ }
  return "";
}

function writeClientId(providerId, clientId) {
  const key = `${CONFIG_KEY_PREFIX}${providerId}`;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, clientId);
      return;
    }
  } catch { /* localStorage unavailable */ }
}

export const CloudConfig = Object.freeze({
  providers: PROVIDERS,

  getClientId(providerId) {
    if (!PROVIDERS[providerId]) throw new Error(`Nhà cung cấp không hỗ trợ: ${providerId}`);
    return readClientId(providerId);
  },

  setClientId(providerId, clientId) {
    if (!PROVIDERS[providerId]) throw new Error(`Nhà cung cấp không hỗ trợ: ${providerId}`);
    const normalized = typeof clientId === "string" ? clientId.trim() : "";
    if (!normalized) throw new Error("Client ID không được để trống.");
    writeClientId(providerId, normalized);
  },

  hasClientId(providerId) {
    if (!PROVIDERS[providerId]) return false;
    return readClientId(providerId).length > 0;
  },

  getRedirectUri() {
    return "http://127.0.0.1";
  },

  validateClientId(providerId) {
    const clientId = this.getClientId(providerId);
    if (!clientId) {
      const label = PROVIDERS[providerId]?.label || providerId;
      return {
        valid: false,
        message: `Chưa cấu hình Client ID cho ${label}. Vui lòng đăng ký OAuth Client ID tại ${providerId === "google" ? "Google Cloud Console" : "Azure Portal"} và nhập vào phần Cài đặt.`,
      };
    }
    return { valid: true, message: "" };
  },
});
