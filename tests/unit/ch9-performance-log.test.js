import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { PERFORMANCE_HELP_ENTRIES } from "../../platform/help/entries-stability.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LOGGER_PATH = path.join(ROOT, "platform/performance/performance_log.py");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function runLoggerProbe() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "vno-ch9-performance-"));
  const script = String.raw`
import importlib.util, json, pathlib, sys
spec = importlib.util.spec_from_file_location('ch9_performance_probe', sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
log = module.PerformanceLog(sys.argv[2], max_file_bytes=1024, max_files=3, memory_reader=lambda: 456789)
before = log.record('open', app='sheet', duration_ms=12.34)
settings = log.set_settings({'enabled': True})
for index in range(80):
    log.record(['open', 'save', 'print', 'soffice_start'][index % 4], app='sheet', duration_ms=index + 0.25)
files = sorted(log.directory.glob('performance*.jsonl'))
lines = [json.loads(line) for file in files for line in file.read_text(encoding='utf-8').splitlines() if line]
print(json.dumps({'default': module.DEFAULT_SETTINGS, 'before': before, 'settings': settings, 'files': [{'name': f.name, 'size': f.stat().st_size} for f in files], 'sample': lines[-1]}))
`;
  try {
    const probe = spawnSync(process.env.PYTHON || "python", ["-c", script, LOGGER_PATH, tempRoot], {
      cwd: ROOT, encoding: "utf8", timeout: 15000
    });
    if (probe.status !== 0) throw new Error((probe.stderr || probe.stdout || "Python performance probe failed").trim());
    return JSON.parse(probe.stdout.trim());
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export async function runCh9PerformanceLogTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error?.message || String(error) }); }
  };

  await test("CH-9.5: JSONL mặc định tắt, ghi memory và xoay tối đa 3 tệp", () => {
    const result = runLoggerProbe();
    check(result.default.enabled === false && result.before === false, "Logger phải mặc định tắt và không tạo bản ghi.");
    check(result.settings.enabled === true, "Không bật được logger.");
    check(result.files.length === 3, `Phải giữ đúng 3 tệp sau rotation, nhận ${result.files.length}.`);
    check(result.files.every(file => file.size <= 1024), `Có tệp vượt giới hạn test: ${JSON.stringify(result.files)}`);
    check(result.sample.memory_bytes === 456789 && typeof result.sample.duration_ms === "number", "Bản ghi thiếu memory/duration.");
    check(!("path" in result.sample) && !("content" in result.sample), "Nhật ký không được chứa đường dẫn hoặc nội dung tài liệu.");
  });

  await test("CH-9.5: UnoBridge chuyển tiếp tùy chọn và nút mở thư mục", async () => {
    const calls = [];
    const bridge = new UnoBridge();
    bridge.desktopApi = {
      async get_performance_log_settings() { calls.push("get"); return { enabled: false }; },
      async set_performance_log_settings(value) { calls.push(["set", value]); return value; },
      async open_performance_log_folder() { calls.push("open"); return { status: "ok", path: "C:/local" }; }
    };
    check((await bridge.getPerformanceLogSettings()).enabled === false, "Sai trạng thái mặc định qua bridge.");
    check((await bridge.setPerformanceLogSettings({ enabled: true })).enabled === true, "Bridge không lưu trạng thái bật.");
    check((await bridge.openPerformanceLogFolder()).status === "ok", "Bridge không mở thư mục log.");
    check(calls.length === 3, `Sai số lời gọi bridge: ${JSON.stringify(calls)}`);
  });

  await test("CH-9.5: i18n và Help có đúng nhãn, quyền riêng tư và bước dùng cho 3 app", () => {
    check(viStrings.performance.logToggle === "Ghi nhật ký hiệu năng (không gửi đi)", "Sai nhãn checkbox hiệu năng.");
    check(viStrings.performance.openFolder === "Mở thư mục nhật ký", "Sai nhãn nút mở thư mục.");
    check(PERFORMANCE_HELP_ENTRIES.length === 3, "Phải có Help hiệu năng cho cả 3 app.");
    for (const entry of PERFORMANCE_HELP_ENTRIES) {
      check(entry.steps.some(step => step.includes("5 MB")), `Help ${entry.app} thiếu giới hạn rotation.`);
      check(entry.steps.some(step => step.includes("không tự tải")), `Help ${entry.app} thiếu cam kết không gửi.`);
    }
  });

  return results;
}
