import { mkdirSync } from "node:fs";
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
