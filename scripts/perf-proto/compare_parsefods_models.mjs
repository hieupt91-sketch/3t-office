// Compare parseFods with another FODS or with the streaming payload prototype.
// Usage: node scripts/perf-proto/compare_parsefods_models.mjs <source.fods> <other.fods|payload.json>
import fs from "node:fs";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { loadSheetPayload, toPlain } from "./sheet-payload-loader.mjs";

const [sourcePath, candidatePath] = process.argv.slice(2);
if (!sourcePath || !candidatePath) {
  throw new Error("Usage: node scripts/perf-proto/compare_parsefods_models.mjs <source.fods> <other.fods|payload.json>");
}

const adapter = new SheetAdapter(null);
const source = toPlain(adapter.parseFods(fs.readFileSync(sourcePath, "utf8")));
let candidate;
let candidateKind;
if (candidatePath.toLowerCase().endsWith(".json")) {
  const payload = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  candidate = toPlain(await loadSheetPayload(payload, adapter));
  candidateKind = "stream payload";
} else {
  candidate = toPlain(adapter.parseFods(fs.readFileSync(candidatePath, "utf8")));
  candidateKind = "parseFods";
}

const diffs = [];
const describe = value => value === undefined ? "undefined" : value === null ? "null"
  : Array.isArray(value) ? "array(" + value.length + ")"
    : typeof value === "string" ? "string(" + value.length + ")"
      : typeof value;
const walk = (left, right, path) => {
  if (diffs.length >= 40) return;
  if (JSON.stringify(left) === JSON.stringify(right)) return;
  if (left && right && typeof left === "object" && typeof right === "object") {
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) walk(left[key], right[key], `${path}.${key}`);
    return;
  }
  diffs.push(path + ": parseFods=" + describe(left) + " payload=" + describe(right));
};
walk(source, candidate, "workbook");
console.log(diffs.length === 0
  ? `MODEL IDENTICAL (${candidateKind})`
  : `MODEL DIFFERS (${diffs.length}${diffs.length >= 40 ? "+" : ""}, ${candidateKind}):\n${diffs.join("\n")}`);
if (diffs.length) process.exitCode = 1;
