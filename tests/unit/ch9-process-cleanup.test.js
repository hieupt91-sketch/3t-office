import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PROCESS_CLEANUP_HELP_ENTRIES } from "../../platform/help/entries-stability.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TRACKER_PATH = path.join(ROOT, "platform/process_lifecycle/process_tracker.py");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function runTrackerProbe() {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "vno-ch9-process-"));
  const script = String.raw`
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location('ch9_tracker_probe', sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
identities = {100: 'owner-a', 201: 'child-a', 300: 'owner-b', 301: 'child-b'}
stopped = []
def identity(pid): return identities.get(pid)
def terminate(pid):
    stopped.append(pid)
    identities.pop(pid, None)
tracker = module.ProcessTracker(sys.argv[2], root_pid=100, root_created_at='owner-a', identity_reader=identity, terminator=terminate)
tracker.register(201, 'helper')
tracker.record_external(301, 'child-b', 'other-helper', 300, 'owner-b')
identities.pop(100)
first = tracker.startup_sweep()
records_after_first = tracker._read_records()
# A reused PID must never be stopped when its creation identity no longer matches.
tracker.record_external(202, 'old-token', 'stale-helper', 400, 'dead-owner')
identities[202] = 'new-user-process'
second = tracker.startup_sweep()
print(json.dumps({'first': first, 'second': second, 'stopped': stopped, 'remaining': records_after_first}))
`;
  try {
    const probe = spawnSync(process.env.PYTHON || "python", ["-c", script, TRACKER_PATH, tempRoot], {
      cwd: ROOT, encoding: "utf8", timeout: 15000
    });
    if (probe.status !== 0) throw new Error((probe.stderr || probe.stdout || "Python tracker probe failed").trim());
    return JSON.parse(probe.stdout.trim());
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export async function runCh9ProcessCleanupTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error?.message || String(error) }); }
  };

  await test("CH-9.4: startup sweep chỉ dừng PID đã ghi khi owner cũ đã chết", () => {
    const result = runTrackerProbe();
    check(result.stopped.length === 1 && result.stopped[0] === 201, `PID bị dừng sai: ${JSON.stringify(result.stopped)}`);
    check(result.first.stopped === 1 && result.first.retained === 1, `Kết quả sweep sai: ${JSON.stringify(result.first)}`);
    check(result.remaining.length === 1 && result.remaining[0].pid === 301, "Bản ghi của owner còn sống phải được giữ.");
    check(result.second.stopped === 0 && result.second.removed === 1, "PID tái sử dụng chỉ được bỏ bản ghi, không được dừng.");
  });

  await test("CH-9.4: Help giải thích dọn theo PID và không đóng Office người dùng", () => {
    check(PROCESS_CLEANUP_HELP_ENTRIES.length === 3, "Phải có Help dọn tiến trình cho cả 3 app.");
    for (const entry of PROCESS_CLEANUP_HELP_ENTRIES) {
      check(entry.steps.length >= 4, `Help ${entry.app} chưa đủ bước.`);
      check(entry.summary.includes("không đóng"), `Help ${entry.app} chưa nêu giới hạn an toàn.`);
      check(entry.steps.some(step => step.includes("PID")), `Help ${entry.app} chưa giải thích sổ PID.`);
    }
  });

  return results;
}
