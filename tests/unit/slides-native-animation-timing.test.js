/**
 * Test Suite: dựng lại p:timing Nhấn mạnh / Thoát khi xuất PPTX (tests/test_slides_native_animation_timing.py chạy trong npm test).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

export async function runSlidesNativeAnimationTimingTests() {
  const run = spawnSync("python", ["-m", "unittest", "tests.test_slides_native_animation_timing", "-v"], {
    cwd: path.resolve("."), encoding: "utf8", timeout: 120000,
  });
  const output = `${run.stdout || ""}${run.stderr || ""}`;
  const lines = output.split(/\r?\n/).filter(line => /\.\.\. (ok|FAIL|ERROR)$/.test(line));
  if (!lines.length) return [{ name: "Hoạt ảnh Slides (PPTX): chạy được bộ kiểm Python", pass: false, error: output.slice(-400) }];
  return lines.map(line => {
    const match = /^(test_\w+) \((?:[\w.]+\.)?(\w+)\.\w+\)(?:\n.*)? \.\.\. (ok|FAIL|ERROR)$/.exec(line) || /^(test_\w+).*\.\.\. (ok|FAIL|ERROR)$/.exec(line);
    const name = (match ? match[1] : line).replace(/_/g, " ");
    return { name: `Hoạt ảnh Slides (PPTX): ${name}`, pass: /\.\.\. ok$/.test(line), error: /\.\.\. ok$/.test(line) ? undefined : line };
  });
}