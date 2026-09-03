/**
 * VN Office — JavaScript Syntax & Integrity Checker
 * Kiểm tra toàn bộ mã nguồn JS bằng Node.js V8 parser (`node --check`).
 * Phát hiện ngay lập tức bất kỳ lỗi cú pháp nào (SyntaxError, thiếu ngoặc, token lạ)
 * trước khi mã nguồn được nạp vào trình duyệt hoặc pywebview.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

export const DEFAULT_DIRS = ["apps", "platform", "adapters", "scripts"];
export const EXCLUDE_DIRS = new Set(["core-master", "node_modules", ".git", ".claude", "__pycache__"]);

/**
 * Thu thập đệ quy toàn bộ danh sách tệp .js trong các thư mục mục tiêu.
 * @param {string[]} dirs 
 * @param {string} rootDir 
 * @returns {string[]} Danh sách đường dẫn tuyệt đối
 */
export function collectJsFiles(dirs = DEFAULT_DIRS, rootDir = ROOT_DIR) {
  const jsFiles = [];

  function scan(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name) || entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        jsFiles.push(fullPath);
      }
    }
  }

  for (const dir of dirs) {
    scan(path.resolve(rootDir, dir));
  }

  return jsFiles.sort();
}

/**
 * Kiểm tra cú pháp của một tệp JavaScript bằng `node --check`.
 * @param {string} filePath Đường dẫn tệp cần kiểm tra
 * @returns {{ pass: boolean, error: string | null }}
 */
export function checkFileSyntax(filePath) {
  try {
    const result = spawnSync(process.execPath, ["--check", filePath], {
      encoding: "utf8",
      timeout: 10000,
      windowsHide: true,
    });

    if (result.status === 0) {
      return { pass: true, error: null };
    }

    const stderr = (result.stderr || "").trim();
    const stdout = (result.stdout || "").trim();
    const errorMsg = stderr || stdout || `Process exited with code ${result.status}`;
    return { pass: false, error: errorMsg };
  } catch (err) {
    return { pass: false, error: err.message };
  }
}

/**
 * Thực hiện kiểm tra cú pháp trên toàn bộ tệp mục tiêu.
 * @param {{ rootDir?: string, dirs?: string[] }} options 
 * @returns {Promise<Array<{ name: string, pass: boolean, file: string, error?: string }>>}
 */
export async function runSyntaxCheck(options = {}) {
  const rootDir = options.rootDir || ROOT_DIR;
  const dirs = options.dirs || DEFAULT_DIRS;
  const files = collectJsFiles(dirs, rootDir);

  const results = [];
  for (const filePath of files) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, "/");
    const check = checkFileSyntax(filePath);

    if (check.pass) {
      results.push({
        name: `Syntax Check: ${relPath}`,
        pass: true,
        file: relPath,
      });
    } else {
      const firstErrorLine = check.error.split("\n").find(l => l.includes("SyntaxError")) || check.error.split("\n")[0];
      results.push({
        name: `Syntax Check: ${relPath} — ${firstErrorLine.trim()}`,
        pass: false,
        file: relPath,
        error: check.error,
      });
    }
  }

  return results;
}

// Chạy trực tiếp từ CLI: node scripts/check-syntax.js
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  console.log("==================================================");
  console.log("       VN OFFICE JAVASCRIPT SYNTAX CHECKER        ");
  console.log("==================================================");

  const results = await runSyntaxCheck();
  let passed = 0;
  let failed = 0;

  for (const res of results) {
    if (res.pass) {
      passed++;
      console.log(`  [PASS] ${res.name}`);
    } else {
      failed++;
      console.error(`  [FAIL] ${res.name}`);
      if (res.error) {
        console.error(`    ↳ Chi tiết lỗi:\n${res.error.split("\n").map(l => "      " + l).join("\n")}`);
      }
    }
  }

  console.log("\n==================================================");
  console.log(`KẾT QUẢ: ${passed}/${results.length} files hợp lệ | ${failed} lỗi cú pháp`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Toàn bộ các tệp JavaScript đều vượt qua kiểm tra cú pháp.");
    process.exit(0);
  }
}
