import { mkdirSync, realpathSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Đường ra mặc định cho bài CDP (D14). Các bài cũ viết sẵn đường Windows (`E:\VNOffice-profiles\…`);
 * trên macOS/Linux chuỗi đó thành MỘT tên tệp tương đối (có dấu «\») trong thư mục làm việc của
 * main.py → rơi tệp rác vào gốc repo. Ở đây:
 * - Windows: giữ nguyên đường cũ (không đổi thói quen/thư mục bằng chứng của máy Windows);
 * - nơi khác: ánh xạ cùng cấu trúc thư mục vào `os.tmpdir()/vno-cdp-output/…` và tạo sẵn thư mục
 *   cha (hoặc chính thư mục khi `directory: true`).
 * Biến môi trường ghi đè của từng bài đặt TRƯỚC hàm này (`process.env.X || platformOutputPath(…)`)
 * nên vẫn được ưu tiên như cũ.
 */
export function platformOutputPath(windowsDefault, { directory = false, platform = process.platform, tmpdir = os.tmpdir() } = {}) {
  const value = String(windowsDefault || "");
  if (platform === "win32") return value;
  const segments = value.replace(/^[A-Za-z]:/, "").split(/[\\/]+/).filter(Boolean);
  const mapped = path.join(tmpdir, "vno-cdp-output", ...segments);
  try {
    mkdirSync(directory ? mapped : path.dirname(mapped), { recursive: true });
  } catch (error) {
    throw new Error(`Không tạo được thư mục ra cho bài CDP: ${mapped} (${error.message})`);
  }
  return mapped;
}

/**
 * Dạng chuẩn để SO SÁNH đường dẫn tệp giữa Node và app (Python/WebView trả về). Windows: `os.tmpdir()` hay trả tên
 * rút gọn 8.3 (vd. `C:\\Users\\3TCOMP~1\\…`) trong khi app trả tên dài (hoặc ngược lại) → so chuỗi thẳng không bao giờ
 * khớp. Ở đây: path.resolve → realpathSync.native (Windows: GetFinalPathNameByHandle mở rộng tên 8.3; macOS: gỡ
 * symlink /var → /private/var) → «/» thống nhất → chữ thường trên win32 (NTFS không phân biệt hoa thường).
 * Tệp chưa tồn tại: giữ dạng path.resolve.
 */
export function canonicalPath(value, { platform = process.platform, realpath = realpathSync.native } = {}) {
  const raw = String(value || "");
  if (!raw) return "";
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  let resolved = pathApi.resolve(raw);
  try { resolved = realpath(resolved); } catch { /* tệp chưa có: giữ dạng resolve */ }
  const slashed = resolved.replace(/\\/g, "/");
  return platform === "win32" ? slashed.toLowerCase() : slashed;
}

/** Hai đường dẫn chỉ cùng một tệp (sau canonicalPath); chuỗi rỗng không bao giờ khớp. */
export function samePath(left, right, options = {}) {
  const a = canonicalPath(left, options);
  return a !== "" && a === canonicalPath(right, options);
}
