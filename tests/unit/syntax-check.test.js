/**
 * Test Suite: JavaScript Syntax & Codebase Integrity Tests
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 * Sử dụng `node --check` qua scripts/check-syntax.js để bảo đảm 100% tệp không bị SyntaxError.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { collectJsFiles, checkFileSyntax, runSyntaxCheck, DEFAULT_DIRS } from "../../scripts/check-syntax.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");

export async function runSyntaxCheckTests() {
  const results = [];

  // 1. Kiểm tra toàn bộ mã nguồn JS trong apps/, platform/, adapters/, scripts/
  const syntaxResults = await runSyntaxCheck({ rootDir: ROOT_DIR, dirs: DEFAULT_DIRS });
  for (const item of syntaxResults) {
    results.push(item);
  }

  // 2. Kiểm tra bộ tệp cốt lõi bắt buộc phải tồn tại trong danh sách kiểm tra
  const scannedFiles = new Set(syntaxResults.map(r => r.file));
  const mandatoryEntrypoints = [
    "apps/writer/writer-app.js",
    "apps/sheet/sheet-app.js",
    "apps/slides/slides-app.js",
    "platform/bootstrap.js",
    "platform/shell/app-shell.js",
    "adapters/libreoffice/writer/writer-adapter.js",
    "adapters/libreoffice/sheet/sheet-adapter.js",
    "adapters/libreoffice/slides/slides-adapter.js"
  ];

  for (const entry of mandatoryEntrypoints) {
    if (scannedFiles.has(entry)) {
      results.push({ name: `Syntax Scope: Tệp trọng yếu ${entry} đã được quét`, pass: true });
    } else {
      results.push({ name: `Syntax Scope: Bỏ sót tệp trọng yếu ${entry}`, pass: false });
    }
  }

  // 3. Kiểm thử âm bản (Negative Test): checkFileSyntax phải phát hiện và chặn đúng cú pháp lỗi (thiếu ngoặc)
  const tempDir = path.join(ROOT_DIR, "tests", ".temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const badTempFile = path.join(tempDir, `test_syntax_bad_${Date.now()}.js`);
  try {
    fs.writeFileSync(badTempFile, `
      export class BrokenApp {
        init() {
          if (true) {
            console.log("ok");
          } else {
            console.log("missing closing brace");
        }
      }
    `, "utf8");

    const badCheck = checkFileSyntax(badTempFile);
    if (!badCheck.pass && badCheck.error && badCheck.error.includes("SyntaxError")) {
      results.push({
        name: "Syntax Checker: Bắt lỗi cú pháp chính xác khi thiếu dấu ngoặc nhọn (SyntaxError detection)",
        pass: true
      });
    } else {
      results.push({
        name: "Syntax Checker: Không phát hiện được lỗi cú pháp trong mã lỗi",
        pass: false
      });
    }
  } finally {
    if (fs.existsSync(badTempFile)) {
      try { fs.unlinkSync(badTempFile); } catch (_) {}
    }
  }

  // 4. Kiểm thử dương bản (Positive Test): checkFileSyntax chấp nhận mã hợp lệ
  const goodTempFile = path.join(tempDir, `test_syntax_good_${Date.now()}.js`);
  try {
    fs.writeFileSync(goodTempFile, `
      export function validFunction() {
        return { status: "ok", code: 200 };
      }
    `, "utf8");

    const goodCheck = checkFileSyntax(goodTempFile);
    if (goodCheck.pass && goodCheck.error === null) {
      results.push({
        name: "Syntax Checker: Xác nhận thành công tệp JavaScript hợp lệ không có lỗi cú pháp",
        pass: true
      });
    } else {
      results.push({
        name: "Syntax Checker: Báo lỗi giả trên tệp hợp lệ: " + (goodCheck.error || ""),
        pass: false
      });
    }
  } finally {
    if (fs.existsSync(goodTempFile)) {
      try { fs.unlinkSync(goodTempFile); } catch (_) {}
    }
    if (fs.existsSync(tempDir)) {
      try { fs.rmdirSync(tempDir); } catch (_) {}
    }
  }

  return results;
}
