const QUERY_TIMEOUT_MS = 30000;

export const SYSTEM_PROMPT =
  "Bạn là Trợ lý VN AI trong VN Office. Trả lời ngắn gọn, chính xác bằng tiếng Việt; " +
  "không bịa nội dung không có trong ngữ cảnh tài liệu.";

export function buildUserContent(prompt, context = {}) {
  const documentText = (context.documentText || "").slice(0, 12000);
  return documentText
    ? `Ngữ cảnh tài liệu hiện tại (ứng dụng: ${context.appName || "writer"}):\n\"\"\"\n${documentText}\n\"\"\"\n\nYêu cầu: ${prompt}`
    : prompt;
}

export function createRequestCancellation(externalSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromCaller();
  else externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, QUERY_TIMEOUT_MS);
  return {
    signal: controller.signal,
    wasTimedOut: () => timedOut,
    cleanup() {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", abortFromCaller);
    }
  };
}

export async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return data?.error?.message || data?.error?.status || data?.message || "";
  } catch { return ""; }
}

export async function throwProviderHttpError(response, providerLabel) {
  const detail = await readErrorMessage(response);
  if (response.status === 401 || response.status === 403) throw new Error(`${providerLabel}: API key không hợp lệ hoặc không có quyền truy cập.`);
  if (response.status === 429) throw new Error(`${providerLabel}: đã vượt hạn mức hoặc bị giới hạn tốc độ. Vui lòng kiểm tra quota.`);
  const safeDetail = detail ? ` (${detail.slice(0, 240)})` : "";
  throw new Error(`${providerLabel}: máy chủ trả về lỗi HTTP ${response.status}${safeDetail}.`);
}

export function normalizeRequestError(error, providerLabel, cancellation) {
  if (error?.name === "AbortError") {
    if (cancellation.wasTimedOut()) return new Error(`${providerLabel}: hết thời gian chờ phản hồi (30 giây).`);
    return new Error(`${providerLabel}: yêu cầu đã được người dùng hủy.`);
  }
  if (error instanceof TypeError) return new Error(`${providerLabel}: không thể kết nối mạng tới máy chủ chính hãng.`);
  return error instanceof Error ? error : new Error(`${providerLabel}: yêu cầu thất bại.`);
}
