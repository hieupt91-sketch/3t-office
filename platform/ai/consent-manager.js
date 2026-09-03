/**
 * VN Office AI — Consent Manager
 * Quản lý sự đồng ý của người dùng trước khi nội dung tài liệu được gửi cho một
 * AI Provider chạy ngoài tiến trình trình duyệt (vd: Ollama cục bộ qua HTTP).
 * Mặc định TẮT — không có nội dung nào rời khỏi luồng xử lý JS nếu người dùng
 * chưa chủ động đồng ý. Tuân thủ 07-security-ai/AI-ARCHITECTURE.md ("consent requirement").
 */

const STORAGE_KEY = "vno.ai.consent.localModel";

// Fallback bộ nhớ tạm khi localStorage không khả dụng (vd: chạy test trong Node) —
// đảm bảo hành vi grant/revoke nhất quán ở mọi môi trường, không chỉ im lặng bỏ qua.
let memoryFallback = null;

function readStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage.getItem(STORAGE_KEY);
  } catch {
    // rơi xuống fallback bên dưới
  }
  return memoryFallback;
}

function writeStorage(value) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);
      return;
    }
  } catch {
    // rơi xuống fallback bên dưới
  }
  memoryFallback = value;
}

export const AiConsentManager = {
  /** Người dùng đã đồng ý cho phép gửi nội dung tài liệu tới AI Provider cục bộ (Ollama) chưa. */
  hasLocalModelConsent() {
    return readStorage() === "granted";
  },

  grantLocalModelConsent() {
    writeStorage("granted");
  },

  revokeLocalModelConsent() {
    writeStorage("revoked");
  }
};
