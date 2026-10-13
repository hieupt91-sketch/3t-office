// Rà soát chạy thật: mỗi lệnh ribbon Sheet có handler không, bấm có tác dụng nhìn thấy không (DOM/ô/đối tượng đổi).
// Lệnh nguy hiểm (mở/lưu/in/thoát/đóng) bỏ qua. Kết quả: VNO_CDP_LOCALAPPDATA\sheet-ribbon-audit.json
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "ribbon-audit.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const SKIP = /^(common\.file\.|common\.app\.|.*\.print|.*\.exit|.*\.close|common\.window|common\.macro\.)/;
const session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ids = JSON.parse(await cdp.evaluate(`(async () => {
    const m = await import('/apps/sheet/sheet-ribbon.js');
    const tabs = Object.values(m).find(v => Array.isArray(v) && v[0]?.groups) || [];
    const out = [];
    const walk = (items, tab, group) => { for (const it of items || []) { if (!it || typeof it !== 'object') continue;
      if (it.commandId) out.push({ tab, group, id: it.commandId, arg: it.options ? (it.options[0]?.value ?? null) : null });
      for (const k of ['items','menuItems','children','dropdownItems']) if (Array.isArray(it[k])) walk(it[k], tab, group); } };
    for (const t of tabs) for (const g of t.groups || []) { if (g.launcherCommandId) out.push({ tab: t.id, group: g.id, id: g.launcherCommandId }); walk(g.items, t.id, g.id); }
    const seen = new Set(); return JSON.stringify(out.filter(r => !seen.has(r.id) && seen.add(r.id)));
  })()`, { awaitPromise: true }));
  const results = [];
  for (const r of ids) {
    if (SKIP.test(r.id)) { results.push({ ...r, status: "SKIPPED" }); continue; }
    const res = JSON.parse(await cdp.evaluate(`(async () => {
      const { globalCommandBus: bus } = await import('/platform/commands/command-bus.js');
      const id = ${JSON.stringify(r.id)};
      const state = bus.getState(id);
      if (!bus.hasHandler(id)) return JSON.stringify({ status: 'NO_HANDLER' });
      if (state && state.enabled === false) return JSON.stringify({ status: 'DISABLED' });
      const g = window.__vnoAppInstance.grid;
      const snap = () => JSON.stringify([document.body.innerHTML.length, document.querySelectorAll('dialog,[role=dialog],.vno-modal,.vno-menu,.vno-dropdown,.vno-notice,.vno-toast').length, g.cellsData.size, g.selection ? JSON.stringify(g.selection) : '', document.activeElement?.tagName]);
      g.setCellValue('B', 2, '12'); g.setCellValue('C', 2, 'abc');
      const before = snap(); let threw = '';
      try { await Promise.race([bus.execute(id, ${JSON.stringify(r.arg ?? null)}), new Promise(r => setTimeout(r, 4000))]); } catch (e) { threw = String(e && e.message || e); }
      await new Promise(r => setTimeout(r, 150));
      const after = snap();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (_) {} });
      return JSON.stringify({ status: threw ? 'THREW' : (before === after ? 'NO_VISIBLE_EFFECT' : 'OK'), threw });
    })()`, { awaitPromise: true, timeoutMilliseconds: 20000 }).catch((e) => JSON.stringify({ status: "CDP_ERROR", threw: String(e.message || e) })));
    results.push({ ...r, ...res });
    console.log(`${res.status.padEnd(18)} ${r.tab}/${r.group} ${r.id}${res.threw ? " | " + res.threw : ""}`);
  }
  const outFile = path.join(profile, "sheet-ribbon-audit.json");
  writeFileSync(outFile, JSON.stringify(results, null, 1));
  const count = (s) => results.filter((x) => x.status === s).length;
  console.log(`TONG ${results.length} | OK ${count("OK")} | NO_VISIBLE_EFFECT ${count("NO_VISIBLE_EFFECT")} | NO_HANDLER ${count("NO_HANDLER")} | DISABLED ${count("DISABLED")} | THREW ${count("THREW")} | SKIPPED ${count("SKIPPED")}`);
  console.log(`FILE ${outFile}`);
} finally { await session.close(); }
