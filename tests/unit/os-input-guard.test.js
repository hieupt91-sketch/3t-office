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
  return results;
}
