// Thử nghiệm sâu các lệnh Writer: đặt trạng thái tài liệu phù hợp (văn bản, bảng, nhận xét, theo dõi thay đổi)
// và so sánh chi tiết trạng thái, ghi giá trị trả về và thông báo.
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "ribbon-state.docx");
copyFileSync(path.resolve("tests/fixtures/real-office-samples/sample-writer.docx"), file);

const IDS = (process.env.VNO_IDS || "").split(",").filter(Boolean);
const session = await launchApp("writer", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });

try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body') && !document.querySelector('.vno-error-reporting-overlay')", { timeoutMilliseconds: 180000 });
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter", { timeoutMilliseconds: 60000 });

  const out = [];
  for (const id of IDS) {
    const res = JSON.parse(await cdp.evaluate(`(async () => {
      const { globalCommandBus: bus } = await import('/platform/commands/command-bus.js');
      const id = ${JSON.stringify(id)};
      const adapter = window.__vnoAppInstance?.adapter;
      const vc = window.__vnoAppInstance?.viewController;

      const dump = () => {
        const body = document.querySelector('.vno-writer-body');
        return {
          bodyHtmlLen: body?.innerHTML?.length || 0,
          textLen: body?.innerText?.length || 0,
          mode: vc?.mode,
          zoom: vc?.zoomLevel,
          ruler: vc?.rulerVisible,
          gridlines: vc?.gridlinesVisible,
          commentsCount: adapter?.comments?.length || 0,
          dirty: adapter?.isDirty
        };
      };

      const dlgSel = 'dialog[open],[role=dialog],.vno-modal,.vno-dropdown,.vno-notice,.vno-toast,.vno-menu,.vno-dialog-overlay,.vno-notification-bar';
      const dlg0 = document.querySelectorAll(dlgSel).length;
      const st0 = (document.getElementById('vno-status-docinfo') || {}).textContent || '';
      const before = dump();
      let threw = '';
      let result = null;

      try {
        result = await Promise.race([
          bus.execute(id, null),
          new Promise(r => setTimeout(r, 4000))
        ]);
      } catch (e) {
        threw = String(e && e.message || e);
      }

      await new Promise(r => setTimeout(r, 200));
      const after = dump();
      const changed = Object.keys(before).filter(k => before[k] !== after[k]);
      const dialog = document.querySelectorAll(dlgSel).length - dlg0;
      const txt = (document.querySelector('.vno-notification-bar-message,.vno-notice,.vno-toast,[role=dialog] h2,.vno-modal h2,.vno-dialog-title,.vno-dialog-content,[role=status]') || {}).textContent || '';
      const stAfter = (document.getElementById('vno-status-docinfo') || {}).textContent || '';
      const statusChanged = stAfter !== st0;

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (_) {} });
      document.querySelectorAll('.vno-dialog-overlay, .vno-modal, .vno-dropdown, .vno-menu').forEach(el => {
        try { el.remove(); } catch (_) {}
      });
      window.__vnoAppInstance?.shell?.clearNotification?.();
      document.querySelectorAll('.vno-notification-bar').forEach(el => { try { el.remove(); } catch (_) {} });

      return JSON.stringify({
        changed,
        dialog,
        threw,
        txt: txt.slice(0, 80),
        result: result === undefined ? null : (typeof result === 'object' ? 'obj' : result),
        status: statusChanged ? stAfter : ''
      });
    })()`, { awaitPromise: true, timeoutMilliseconds: 30000 }).catch(e => JSON.stringify({ changed: [], dialog: 0, threw: "CDP:" + String(e.message || e) })));

    const verdict = res.threw ? "THREW" : (res.changed?.length || res.dialog ? "OK" : (res.status || res.txt ? "STATUS_ONLY" : (res.result === false ? "SILENT_FALSE" : "NO_EFFECT")));
    out.push({ id, verdict, ...res });
    console.log(`${verdict.padEnd(12)} ${id} | đổi: ${res.changed?.join(",") || "-"} | thoại: ${res.dialog}${res.threw ? " | " + res.threw : ""} | ret=${res.result} | ${res.status || res.txt || ""}`);
  }

  writeFileSync(path.join(profile, "writer-ribbon-state.json"), JSON.stringify(out, null, 1));
} finally {
  await session.close();
}
