import assert from "node:assert/strict";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { platformShortcut } from "./actions.mjs";
import { canonicalPath, platformOutputPath, samePath } from "./output-path.mjs";

test("platformShortcut: Windows giữ Ctrl, macOS dùng Cmd theo bảng phím dùng chung", () => {
  assert.deepEqual(platformShortcut("Ctrl+Shift+L", { commandId: "writer.list.bullet", platform: "win32" }),
    { key: "l", modifiers: { ctrl: true, shift: true }, combo: "CTRL+SHIFT+L" });
  assert.deepEqual(platformShortcut("Ctrl+Shift+L", { commandId: "writer.list.bullet", platform: "darwin" }),
    { key: "l", modifiers: { meta: true, shift: true }, combo: "CMD+SHIFT+L" });
  assert.deepEqual(platformShortcut("Ctrl+Enter", { commandId: "writer.page.break", platform: "darwin" }).modifiers, { meta: true });
  assert.equal(platformShortcut("Ctrl+Enter", { commandId: "writer.page.break", platform: "darwin" }).key, "Enter");
  assert.deepEqual(platformShortcut("Ctrl+End", { commandId: "writer.nav.docEnd", platform: "darwin" }),
    { key: "End", modifiers: { meta: true }, combo: "CMD+END" });
  assert.deepEqual(platformShortcut("Ctrl+End", { platform: "linux" }), { key: "End", modifiers: { ctrl: true }, combo: "CTRL+END" });
  // Dòng riêng của bảng (không chỉ đổi Ctrl→Cmd): Tăng thụt lề là Control+Shift+M vì Cmd+M là phím hệ thống.
  assert.deepEqual(platformShortcut("Ctrl+M", { commandId: "writer.para.indentInc", platform: "darwin" }).modifiers, { ctrl: true, shift: true });
});

test("platformOutputPath: Windows giữ đường E:\\ cũ; macOS/Linux ánh xạ vào thư mục tạm và tạo thư mục cha", () => {
  const winPath = "E:\\VNOffice-profiles\\ui-shots\\fn-track.docx";
  assert.equal(platformOutputPath(winPath, { platform: "win32" }), winPath);
  const tmp = mkdtempSync(path.join(os.tmpdir(), "vno-outpath-"));
  try {
    const mapped = platformOutputPath(winPath, { platform: "darwin", tmpdir: tmp });
    assert.equal(mapped, path.join(tmp, "vno-cdp-output", "VNOffice-profiles", "ui-shots", "fn-track.docx"));
    assert.ok(!mapped.includes("\\"));
    assert.ok(existsSync(path.dirname(mapped)));
    const dir = platformOutputPath("E:\\VNOffice-temp\\word-w2", { platform: "linux", tmpdir: tmp, directory: true });
    assert.equal(dir, path.join(tmp, "vno-cdp-output", "VNOffice-temp", "word-w2"));
    assert.ok(existsSync(dir));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

test("samePath: Windows tên rút gọn 8.3 (3TCOMP~1) và tên dài, khác hoa thường/dấu gạch, là cùng tệp", () => {
  // Giả lập GetFinalPathNameByHandle: realpath mở rộng tên 8.3 về tên dài (tệp có thật trên đĩa).
  const longDir = "C:\\Users\\3T Computer\\AppData\\Local\\Temp\\vno-fix2510-ab";
  const realpath = (value) => value.replace(/^C:\\Users\\3TCOMP~1\\/i, "C:\\Users\\3T Computer\\");
  const shortPath = "C:\\Users\\3TCOMP~1\\AppData\\Local\\Temp\\vno-fix2510-ab\\fix2510-roundtrip.pptx";
  const appPath = `${longDir}\\fix2510-roundtrip.pptx`.toUpperCase().replace(/\\/g, "/");
  assert.equal(samePath(shortPath, appPath, { platform: "win32", realpath }), true);
  assert.equal(canonicalPath(shortPath, { platform: "win32", realpath }), "c:/users/3t computer/appdata/local/temp/vno-fix2510-ab/fix2510-roundtrip.pptx");
  assert.equal(samePath(shortPath, `${longDir}\\other.pptx`, { platform: "win32", realpath }), false);
  assert.equal(samePath("", "", { platform: "win32", realpath }), false);
});

test("samePath: macOS gỡ symlink /var → /private/var, vẫn phân biệt hoa thường như hệ tệp POSIX", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "vno-samepath-"));
  try {
    const file = path.join(dir, "a.pptx");
    writeFileSync(file, "x");
    assert.equal(samePath(file, realpathSync(file)), true);
    const fake = (value) => value.replace(/^\/var\//, "/private/var/");
    assert.equal(samePath("/var/folders/x/a.pptx", "/private/var/folders/x/a.pptx", { platform: "darwin", realpath: fake }), true);
    assert.equal(samePath("/tmp/A.pptx", "/tmp/a.pptx", { platform: "darwin", realpath: (v) => v }), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
