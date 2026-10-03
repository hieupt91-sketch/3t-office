import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../..");
const codeExtensions = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".py", ".ps1", ".psm1", ".cs", ".cmd", ".bat"]);
const skippedDirectories = new Set([".git", "node_modules", "__pycache__", "dist", "build", "out", "obj"]);
const forbidden = [
  { label: "SendKeys", source: "Send" + "Keys", call: true },
  { label: "SendInput", source: "Send" + "Input", call: true },
  { label: "keybd_event", source: "keybd" + "_event", call: true },
  { label: "mouse_event", source: "mouse" + "_event", call: true },
  { label: "pyauto" + "gui", source: "pyauto" + "gui", call: false },
];

const killByNameRoots = ["tests", "scripts"];
const killByNameTargets = new Set([
  "python",
  "pythonw",
  "msedgewebview2",
  "msedge",
  "soffice",
  "soffice.bin",
  "node",
  "excel",
  "winword",
  "powerpnt",
]);
const killCommand = "task" + "kill";
const safePipelineFilters = new Set(["Id", "Path", "StartTime"]);

function removeComments(source, extension) {
  if ([".py", ".ps1", ".psm1", ".cmd", ".bat"].includes(extension)) {
    return source
      .replace(/<#[\s\S]*?#>/g, block => block.replace(/[^\n]/g, " "))
      .replace(/^[ \t]*#.*$/gm, "");
  }
  return source
    .replace(/\/\*[\s\S]*?\*\//g, block => block.replace(/[^\n]/g, " "))
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

function findForbiddenUsage(source, extension) {
  const executable = removeComments(source, extension);
  const matches = [];
  for (const item of forbidden) {
    const expression = item.call
      ? new RegExp("\\b" + item.source + "\\s*\\(", "gi")
      : new RegExp("\\b" + item.source + "\\b", "gi");
    for (const match of executable.matchAll(expression)) {
      const line = executable.slice(0, match.index).split("\n").length;
      matches.push({ name: item.label, line });
    }
  }
  return matches;
}

function normalizeKillTarget(token) {
  let value = String(token || "").trim().replace(/^["']+|["']+$/g, "").toLowerCase();
  value = value.replace(/\*+$/, "");
  if (value.endsWith(".exe")) value = value.slice(0, -4);
  return value;
}

function statementWindow(source, startIndex) {
  const continuations = new Set(["|", "`", ",", "[", "(", "{", "+", "\\"]);
  let window = "";
  for (let index = startIndex; index < source.length; index++) {
    const character = source[index];
    if (character === ";") break;
    if (character === "\n") {
      let previous = index - 1;
      while (previous >= startIndex && (source[previous] === " " || source[previous] === "\t" || source[previous] === "\r")) previous--;
      if (!continuations.has(source[previous])) break;
    }
    window += character;
  }
  return window;
}

function hasOwnedTargetFilter(window) {
  if (/Stop-Process\s+-Id\b/i.test(window)) return true;
  if (!/\bWhere(?:-Object)?\b/i.test(window)) return false;
  for (const filter of safePipelineFilters) {
    if (new RegExp("\\b" + filter + "\\b", "i").test(window)) return true;
  }
  return false;
}

function findByNameKillUsage(source, extension) {
  const executable = removeComments(source, extension);
  const matches = [];
  const seen = new Set();
  const record = (offset, label) => {
    const line = executable.slice(0, offset).split("\n").length;
    const key = line + "|" + label;
    if (seen.has(key)) return;
    seen.add(key);
    matches.push({ line, label });
  };

  for (const match of executable.matchAll(/\bStop-Process\s+-(?:Name|N)\s+(?:"([^"]+)"|([A-Za-z0-9_.\-*]+))/gi)) {
    const target = normalizeKillTarget(match[1] || match[2]);
    if (killByNameTargets.has(target)) record(match.index, "kill-by-name:stop-process-name:" + target);
  }

  for (const match of executable.matchAll(/\bGet-Process\s+(?:(?:-Name|-N)\s+)?(?:"([^"]+)"|([A-Za-z0-9_.\-*]+))/gi)) {
    const target = normalizeKillTarget(match[1] || match[2]);
    if (!killByNameTargets.has(target)) continue;
    const window = statementWindow(executable, match.index + match[0].length);
    if (!/\bStop-Process\b/i.test(window)) continue;
    if (hasOwnedTargetFilter(window)) continue;
    record(match.index, "kill-by-name:get-process-then-stop:" + target);
  }

  for (const match of executable.matchAll(new RegExp("\\b" + killCommand + "\\b", "gi"))) {
    const window = statementWindow(executable, match.index);
    const flagIndex = window.search(/\/i[mM]/i);
    if (flagIndex < 0) continue;
    const token = window.slice(flagIndex + 3).match(/^[^A-Za-z0-9]*([A-Za-z0-9_.\-]+)/);
    if (!token) continue;
    const target = normalizeKillTarget(token[1]);
    if (killByNameTargets.has(target)) record(match.index, "kill-by-name:" + killCommand + "-image-name:" + target);
  }

  return matches;
}

async function collectCodeFiles(directory) {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectCodeFiles(absolute));
    else if (codeExtensions.has(path.extname(entry.name).toLowerCase())) files.push(absolute);
  }
  return files;
}

async function scanRepository() {
  const roots = ["apps", "platform", "adapters", "scripts", "tests"];
  const files = [path.join(repoRoot, "main.py")];
  for (const relative of roots) {
    const absolute = path.join(repoRoot, relative);
    try { files.push(...await collectCodeFiles(absolute)); } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const violations = [];
  for (const file of files) {
    const contents = await fs.readFile(file, "utf8");
    for (const match of findForbiddenUsage(contents, path.extname(file).toLowerCase())) {
      violations.push(path.relative(repoRoot, file).replace(/\\/g, "/") + ":" + match.line + " " + match.name);
    }
  }
  return violations;
}

async function scanByNameKillRepository() {
  const files = [];
  for (const relative of killByNameRoots) {
    const absolute = path.join(repoRoot, relative);
    try { files.push(...await collectCodeFiles(absolute)); } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const violations = [];
  const seen = new Set();
  for (const file of files) {
    const contents = await fs.readFile(file, "utf8");
    for (const match of findByNameKillUsage(contents, path.extname(file).toLowerCase())) {
      const violation = path.relative(repoRoot, file).replace(/\\/g, "/") + ":" + match.line + " " + match.label;
      if (seen.has(violation)) continue;
      seen.add(violation);
      violations.push(violation);
    }
  }
  return violations;
}

export async function runOsInputGuardTests() {
  const results = [];
  try {
    const examples = [
      ["Send" + "Keys", "("],
      ["Send" + "Input", "("],
      ["keybd" + "_event", "("],
      ["mouse" + "_event", "("],
      ["pyauto" + "gui", ".", "click"],
    ];
    const detected = examples.map(parts => findForbiddenUsage(parts.join(""), ".js").length > 0);
    const violations = await scanRepository();
    results.push({
      name: "Source and tests reject OS-level input calls",
      pass: detected.every(Boolean) && violations.length === 0,
      error: violations.length ? violations.join("\n") : (!detected.every(Boolean) ? "Detector missed a guard example." : ""),
    });
  } catch (error) {
    results.push({ name: "Source and tests reject OS-level input calls", pass: false, error: error.stack || String(error) });
  }
  const killCheckName = "Source and tests never kill processes by name (PID or owned path only)";
  try {
    const forbiddenExamples = [
      ["Get" + "-Process -Name python | Stop-Process -Force"],
      ["Get" + "-Process EXCEL -ErrorAction SilentlyContinue | Stop-Process -Force"],
      ["Stop" + "-Process -Name soffice -Force"],
      ["task" + "kill /IM python.exe"],
      ["task" + "kill /im msedgewebview2.exe /T /F"],
    ];
    const allowedExamples = [
      ["task" + "kill /PID 1234 /T /F"],
      ["Stop" + "-Process -Id 1234 -Force"],
      ["Get" + "-Process pythonw -ErrorAction SilentlyContinue | Where-Object { $_.Path -like 'C:\\inst\\*' } | Stop-Process -Force"],
      ["Get" + "-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id }"],
      ["$owned = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue; if ($owned) { Stop-Process -Id $ownedPid -Force }"],
    ];
    const detected = forbiddenExamples.map(parts => findByNameKillUsage(parts.join(""), ".js").length > 0);
    const wronglyFlagged = allowedExamples.filter(parts => findByNameKillUsage(parts.join(""), ".js").length > 0);
    const violations = await scanByNameKillRepository();
    results.push({
      name: killCheckName,
      pass: detected.every(Boolean) && wronglyFlagged.length === 0 && violations.length === 0,
      error: violations.length
        ? violations.join("\n")
        : (wronglyFlagged.length
          ? "Detector flagged an allowed pattern: " + wronglyFlagged.map(parts => parts.join("")).join(" | ")
          : (!detected.every(Boolean) ? "Detector missed a kill-by-name guard example." : "")),
    });
  } catch (error) {
    results.push({ name: killCheckName, pass: false, error: error.stack || String(error) });
  }
  return results;
}
