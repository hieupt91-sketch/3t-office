// Lần 2: các lệnh bị gắn NO_VISIBLE_EFFECT được thử lại với vùng chọn hợp lý và so sánh TOÀN BỘ trạng thái lưới (không chỉ DOM).
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "ribbon-state.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const IDS = (process.env.VNO_IDS || "").split(",").filter(Boolean);
const session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const out = [];
  for (const id of IDS) {
    const res = JSON.parse(await cdp.evaluate(`(async () => {
      const { globalCommandBus: bus } = await import('/platform/commands/command-bus.js');
      const g = window.__vnoAppInstance.grid; const id = ${JSON.stringify(id)};
      const dump = () => {
        const seen = new WeakSet();
        const rep = (k, v) => {
          if (typeof v === 'function' || v instanceof Node || v instanceof Window) return undefined;
          if (v instanceof Map) return { __map: [...v.entries()] };
          if (v instanceof Set) return { __set: [...v] };
          if (v && typeof v === 'object') { if (seen.has(v)) return undefined; seen.add(v); }
          return v;
        };
        const parts = {};
        for (const k of Object.keys(g)) { try { const s = JSON.stringify(g[k], rep); if (s && s.length < 3000000) parts[k] = s; } catch (_) {} }
        return parts;
      };
      // dữ liệu mẫu: B2:C5 số, D2 văn bản, nhóm hàng/cột để thử
      const vals = [[12, 5.5], [20, 7], [8, 3], [30, 9]];
      vals.forEach((r, i) => { g.setCellValue('B', i + 2, String(r[0])); g.setCellValue('C', i + 2, String(r[1])); });
      g.setCellValue('D', 2, 'abc'); g.setCellValue('B', 7, '');
      const sel = ${JSON.stringify(id)}.match(/formula\\.(average|countNumbers|max|min)/) ? ['B', 7, 'B', 7] : ['B', 2, 'C', 5];
      g.selectCell(sel[0], sel[1]); g.selectCell(sel[2], sel[3], true);
      const dlgSel = 'dialog[open],[role=dialog],.vno-modal,.vno-dropdown,.vno-notice,.vno-toast,.vno-menu'; const dlg0 = document.querySelectorAll(dlgSel).length; const before = dump(); let threw = ''; let result; const st0 = (document.getElementById('vno-status-docinfo')||{}).textContent;
      try { result = await Promise.race([bus.execute(id, null), new Promise(r => setTimeout(r, 4000))]); } catch (e) { threw = String(e && e.message || e); }
      await new Promise(r => setTimeout(r, 200));
      const after = dump();
      const changed = Object.keys({ ...before, ...after }).filter(k => before[k] !== after[k]);
      const dialog = document.querySelectorAll(dlgSel).length - dlg0; const txt = (document.querySelector('.vno-notice,.vno-toast,[role=dialog] h2,.vno-modal h2')||{}).textContent||'';
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (_) {} });
      return JSON.stringify({ changed: changed.slice(0, 8), dialog, threw, txt: txt.slice(0,80), result: result === undefined ? null : (typeof result === 'object' ? 'obj' : result), status: ((document.getElementById('vno-status-docinfo')||{}).textContent !== st0) ? (document.getElementById('vno-status-docinfo')||{}).textContent : '' });
    })()`, { awaitPromise: true, timeoutMilliseconds: 30000 }).catch((e) => JSON.stringify({ changed: [], dialog: 0, threw: "CDP:" + String(e.message || e) })));
    const verdict = res.threw ? "THREW" : (res.changed.length || res.dialog ? "OK" : (res.status ? "STATUS_ONLY" : (res.result === false ? "SILENT_FALSE" : "NO_EFFECT")));
    out.push({ id, verdict, ...res });
    console.log(`${verdict.padEnd(10)} ${id} | doi: ${res.changed.join(",") || "-"} | hop thoai: ${res.dialog}${res.threw ? " | " + res.threw : ""} | ret=${res.result} | ${res.status || res.txt || ""}`);
  }
  writeFileSync(path.join(profile, "sheet-ribbon-state.json"), JSON.stringify(out, null, 1));
} finally { await session.close(); }
