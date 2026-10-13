// Rà soát tĩnh từng nút ribbon: lệnh nào có/không có handler gắn (bindHandler / defaultHandler).
// Chạy: node scripts/audit-0610/ribbon_command_audit.mjs <sheet|writer|slides> [--json]
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const app = process.argv[2] || "sheet";
const root = process.cwd();
const ribbonFile = path.join(root, "apps", app, `${app}-ribbon.js`);
const mod = await import(pathToFileURL(ribbonFile).href);
const tabs = Object.values(mod).find((v) => Array.isArray(v) && v[0]?.groups) || [];

const rows = [];
const walk = (items, ctx) => {
  for (const it of items || []) {
    if (!it || typeof it !== "object") continue;
    if (it.commandId) rows.push({ tab: ctx.tab, group: ctx.group, id: it.commandId, type: it.type || "?" });
    for (const key of ["items", "menuItems", "options", "children", "dropdownItems"]) {
      if (Array.isArray(it[key])) walk(it[key], ctx);
    }
  }
};
for (const t of tabs) for (const g of t.groups || []) {
  if (g.launcherCommandId) rows.push({ tab: t.id, group: g.id, id: g.launcherCommandId, type: "launcher" });
  walk(g.items, { tab: t.id, group: g.id });
}

const files = [];
const scan = (dir) => {
  for (const name of readdirSync(dir)) {
    if (["node_modules", ".git", "file test", "_batch_document_audit"].includes(name)) continue;
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) scan(full);
    else if (/\.(js|mjs)$/.test(name) && !/[\\/]tests[\\/]/.test(full)) files.push(full);
  }
};
for (const d of ["apps", "platform", "adapters"]) scan(path.join(root, d));
const corpus = files.map((f) => readFileSync(f, "utf8")).join("\n");

const bound = (id) => {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(bindHandler\\(\\s*["'\`]${esc}["'\`])|(["'\`]${esc}["'\`]\\s*:\\s*(async\\s*)?(\\(|function|[A-Za-z_$]))|(case\\s+["'\`]${esc}["'\`])`).test(corpus);
};
const seen = new Set();
const missing = [];
let total = 0;
for (const r of rows) {
  if (seen.has(r.id)) continue;
  seen.add(r.id);
  total++;
  if (!bound(r.id)) missing.push(r);
}
if (process.argv.includes("--json")) console.log(JSON.stringify({ total, missing }, null, 1));
else {
  console.log(`${app}: ${total} lệnh ribbon duy nhất, ${missing.length} chưa thấy handler`);
  for (const m of missing) console.log(`  [${m.tab}/${m.group}] ${m.id} (${m.type})`);
}
