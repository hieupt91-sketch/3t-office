// Compare the workbook model SheetAdapter.parseFods builds from two FODS files.
// Usage: node scripts/perf-proto/compare_parsefods_models.mjs <a.fods> <b.fods>
import fs from "node:fs";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const toPlain = (value) => {
  if (value instanceof Map) return Object.fromEntries([...value].map(([k, v]) => [k, toPlain(v)]).sort(([x], [y]) => (x < y ? -1 : 1)));
  if (value instanceof Set) return [...value].sort();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((k) => [k, toPlain(value[k])]));
  return value;
};

const [aPath, bPath] = process.argv.slice(2);
const a = toPlain(new SheetAdapter(null).parseFods(fs.readFileSync(aPath, "utf8")));
const b = toPlain(new SheetAdapter(null).parseFods(fs.readFileSync(bPath, "utf8")));
const diffs = [];
// Recurse instead of stringifying whole subtrees: a lan14 model exceeds V8's max string length.
const walk = (x, y, path) => {
  if (diffs.length >= 20) return;
  if (x && y && typeof x === "object" && typeof y === "object") {
    if (Array.isArray(x) !== Array.isArray(y)) {
      diffs.push(`${path}: array/object mismatch`);
      return;
    }
    for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[key], y[key], `${path}.${key}`);
    return;
  }
  if (x === y || (Number.isNaN(x) && Number.isNaN(y))) return;
  diffs.push(`${path}: A=${JSON.stringify(x)?.slice(0, 160)} B=${JSON.stringify(y)?.slice(0, 160)}`);
};
walk(a, b, "workbook");
console.log(diffs.length === 0 ? "MODEL IDENTICAL" : `MODEL DIFFERS (${diffs.length}${diffs.length >= 20 ? "+" : ""}):\n` + diffs.join("\n"));
