// ORACLE-1: 3-way comparison 3T ↔ Excel for Mac (golden-mac) ↔ Excel 2016 Windows (tests/functions/golden-*.json).
// Usage (repo root): node tests/macos/oracle/compare_functions.mjs [--mac-dir DIR] [--out-json F] [--out-md F]
// Tolerance: relative 1e-9 with absolute floor 1e-9 (per-case `tol` from the cases file wins), same as npm test.
// Read-only on tests/functions/*.json. A batch without golden-mac is reported as "unmeasured", never as a match.
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCase, evaluate3T, summarise, DEFAULT_TOL } from "./compare-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../..");
const argv = process.argv.slice(2);
const opt = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const macDir = path.resolve(opt("--mac-dir", path.join(here, "golden-mac")));
const outJson = opt("--out-json", null);
const outMd = opt("--out-md", null);
const fnDir = path.join(repo, "tests/functions");

const fmt = v => (v === undefined ? "—" : JSON.stringify(v)).replace(/\|/g, "\\|");
const batches = [];
const mismatches = [];
for (const casesFile of readdirSync(fnDir).filter(n => /^cases-.*\.json$/.test(n)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }))) {
  const spec = JSON.parse(readFileSync(path.join(fnDir, casesFile), "utf8"));
  const goldenFile = casesFile.replace(/^cases-/, "golden-");
  const win = existsSync(path.join(fnDir, goldenFile)) ? JSON.parse(readFileSync(path.join(fnDir, goldenFile), "utf8")) : null;
  const macPath = path.join(macDir, goldenFile);
  const mac = existsSync(macPath) ? JSON.parse(readFileSync(macPath, "utf8")) : null;
  const items = (spec.formulas || []).map(item => (typeof item === "string" ? { formula: item } : { formula: item.f, tol: item.tol, array: item.array }));
  const winByFormula = new Map((win?.cases || []).map(c => [c.formula, c]));
  const macByFormula = new Map((mac?.cases || []).map(c => [c.formula, c]));
  const mine = await evaluate3T(spec, items.map(it => ({ ...it, type: winByFormula.get(it.formula)?.type })), repo);
  const rows = items.map((it, i) => {
    const w = winByFormula.get(it.formula);
    const m = macByFormula.get(it.formula);
    const tol = it.tol ?? w?.tol ?? DEFAULT_TOL;
    const c = classifyCase({ win: w ? { type: w.type, value: w.excel } : null, mac: m ? { type: m.type, value: m.excel } : null, mine: mine[i], tol });
    return { formula: it.formula, mine: mine[i], win: w?.excel, winType: w?.type, mac: m?.excel, macType: m?.type, ...c };
  });
  const summary = summarise(rows);
  batches.push({ batch: casesFile.replace(/^cases-|\.json$/g, ""), macGolden: mac ? path.relative(repo, macPath) : null, macSource: mac?.generatedFrom || null, ...summary, rows });
  for (const r of rows) if (r.tEqMac === false) mismatches.push({ batch: casesFile, ...r });
}

const total = batches.reduce((acc, b) => { for (const k of ["cases", "tEqMac", "tNeMac", "macNeWin", "unmeasured", "tEqWin", "tNeWin"]) acc[k] = (acc[k] || 0) + b[k]; return acc; }, {});
for (const b of batches) {
  console.log(`${b.batch.padEnd(24)} cases=${b.cases} 3T=Mac ${b.tEqMac} 3T≠Mac ${b.tNeMac} Mac≠Win ${b.macNeWin} unmeasured ${b.unmeasured} | 3T=Win ${b.tEqWin} 3T≠Win ${b.tNeWin}`);
}
console.log(`TOTAL cases=${total.cases} 3T=Mac ${total.tEqMac} 3T≠Mac ${total.tNeMac} Mac≠Win ${total.macNeWin} unmeasured ${total.unmeasured} | 3T=Win ${total.tEqWin} 3T≠Win ${total.tNeWin}`);

if (outJson) writeFileSync(path.resolve(outJson), JSON.stringify({ tolerance: "relative 1e-9 (floor 1e-9), per-case tol overrides", total, batches, mismatches }, null, 1));
if (outMd) {
  const lines = ["| Lô | Số ca | 3T=ExcelMac | 3T≠ExcelMac | ExcelMac≠ExcelWin | Không đo được (lý do) | 3T=ExcelWin | 3T≠ExcelWin |", "|---|---:|---:|---:|---:|---|---:|---:|"];
  for (const b of batches) {
    const reasons = Object.entries(b.reasons).map(([k, v]) => `${v}: ${k}`).join("; ");
    lines.push(`| ${b.batch} | ${b.cases} | ${b.macGolden ? b.tEqMac : "—"} | ${b.macGolden ? b.tNeMac : "—"} | ${b.macGolden ? b.macNeWin : "—"} | ${b.unmeasured}${reasons ? ` (${reasons})` : ""} | ${b.tEqWin} | ${b.tNeWin} |`);
  }
  lines.push(`| **Tổng** | **${total.cases}** | **${total.tEqMac}** | **${total.tNeMac}** | **${total.macNeWin}** | **${total.unmeasured}** | **${total.tEqWin}** | **${total.tNeWin}** |`);
  lines.push("", "### Mọi ca 3T≠ExcelMac", "");
  if (!mismatches.length) lines.push("_Không có ca nào (hoặc chưa có golden-mac để so)._");
  else {
    lines.push("| Lô | Công thức | 3T | Excel Mac | Excel Win | Nhận xét |", "|---|---|---|---|---|---|");
    for (const m of mismatches) lines.push(`| ${m.batch.replace(/^cases-|\.json$/g, "")} | \`${m.formula.replace(/\|/g, "\\|")}\` | ${fmt(m.mine)} | ${fmt(m.mac)} | ${fmt(m.win)} | ${m.note} |`);
  }
  const winMiss = batches.flatMap(b => b.rows.filter(r => r.tEqWin === false).map(r => ({ batch: b.batch, ...r })));
  lines.push("", "### Ca 3T≠ExcelWin (tham chiếu chéo bộ golden Windows)", "");
  if (!winMiss.length) lines.push("_Không có ca nào._");
  else {
    lines.push("| Lô | Công thức | 3T | Excel Win |", "|---|---|---|---|");
    for (const m of winMiss) lines.push(`| ${m.batch} | \`${m.formula.replace(/\|/g, "\\|")}\` | ${fmt(m.mine)} | ${fmt(m.win)} |`);
  }
  writeFileSync(path.resolve(outMd), lines.join("\n") + "\n");
}
