// Rà soát chạy thật: mỗi lệnh ribbon Slides có handler không, bấm có tác dụng nhìn thấy không (DOM/nội dung/đối tượng đổi).
// Lệnh nguy hiểm (mở/lưu/in/thoát/đóng) bỏ qua. Kết quả: VNO_CDP_LOCALAPPDATA\\slides-ribbon-audit.json
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "ribbon-audit.pptx");
copyFileSync(path.resolve("tests/fixtures/real-office-samples/sample-slides.pptx"), file);

const SKIP = /^(common\.file\.|common\.app\.|.*\.print|.*\.exit|.*\.close|common\.window|common\.macro\.)/;
const session = await launchApp("slides", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });

try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-slide-canvas') && !document.querySelector('.vno-error-reporting-overlay')", { timeoutMilliseconds: 180000 });
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter", { timeoutMilliseconds: 60000 });

  // Stub blocking window methods so automation never hangs
  await cdp.evaluate(`(() => {
    window.confirm = () => false;
    window.alert = () => {};
    window.prompt = () => null;
  })()`);

  const ids = JSON.parse(await cdp.evaluate(`(async () => {
    const m = await import('/apps/slides/slides-ribbon.js');
    const tabs = Object.values(m).find(v => Array.isArray(v) && v[0]?.groups) || [];
    const out = [];
    const walk = (items, tab, group) => {
      for (const it of items || []) {
        if (!it || typeof it !== 'object') continue;
        if (it.commandId) {
          out.push({
            tab,
            group,
            id: it.commandId,
            arg: it.options ? (it.options[0]?.value ?? null) : null
          });
        }
        for (const k of ['items', 'menuItems', 'options', 'children', 'dropdownItems']) {
          if (Array.isArray(it[k])) walk(it[k], tab, group);
        }
      }
    };
    for (const t of tabs) {
      for (const g of t.groups || []) {
        if (g.launcherCommandId) out.push({ tab: t.id, group: g.id, id: g.launcherCommandId });
        walk(g.items, t.id, g.id);
      }
    }
    const seen = new Set();
    return JSON.stringify(out.filter(r => !seen.has(r.id) && seen.add(r.id)));
  })()`, { awaitPromise: true }));

  const results = [];
  for (const r of ids) {
    if (SKIP.test(r.id)) {
      results.push({ ...r, status: "SKIPPED", result: null });
      console.log(`${"SKIPPED".padEnd(18)} ${r.tab}/${r.group} ${r.id}`);
      continue;
    }

    const res = JSON.parse(await cdp.evaluate(`(async () => {
      const { globalCommandBus: bus } = await import('/platform/commands/command-bus.js');
      const id = ${JSON.stringify(r.id)};
      const state = bus.getState(id);
      if (!bus.hasHandler(id)) return JSON.stringify({ status: 'NO_HANDLER', result: null });
      if (state && state.enabled === false) return JSON.stringify({ status: 'DISABLED', result: null });

      const dlgSel = 'dialog[open],[role=dialog],.vno-modal,.vno-menu,.vno-dropdown,.vno-notice,.vno-toast,.vno-dialog-overlay,.vno-notification-bar,.vno-animation-pane:not([hidden]),.vno-slide-sorter-overlay,.vno-slideshow-overlay,.vno-presenter-overlay';
      const snap = () => {
        const canvas = window.__vnoAppInstance?.canvasController;
        const stage = document.querySelector('.vno-slide-stage');
        return JSON.stringify([
          document.body.innerHTML.length,
          document.querySelectorAll(dlgSel).length,
          stage?.innerHTML?.length || 0,
          canvas?.slides?.length || 0,
          canvas?.currentSlideIndex || 0,
          canvas?.selectedShapeIds?.size || 0,
          canvas?.selectedTarget || null,
          canvas?.zoomLevel || 1,
          canvas?.rulerVisible,
          canvas?.gridlinesVisible,
          canvas?.guidesVisible,
          canvas?.isNotesVisible,
          canvas?.isReadingView,
          (document.getElementById('vno-status-docinfo') || {}).textContent || ''
        ]);
      };

      const canvas = window.__vnoAppInstance?.canvasController;
      if (canvas) {
        if (canvas.slides?.length && canvas.currentSlideIndex < 0) {
          canvas.selectSlide(0);
        }
      }

      const dlg0 = document.querySelectorAll(dlgSel).length;
      const st0 = (document.getElementById('vno-status-docinfo') || {}).textContent || '';
      const before = snap();
      let threw = '';
      let ret = null;

      try {
        ret = await Promise.race([
          bus.execute(id, ${JSON.stringify(r.arg ?? null)}),
          new Promise(r => setTimeout(r, 4000))
        ]);
      } catch (e) {
        threw = String(e && e.message || e);
      }

      await new Promise(r => setTimeout(r, 150));
      const after = snap();
      const dlgAfter = document.querySelectorAll(dlgSel).length - dlg0;
      const stAfter = (document.getElementById('vno-status-docinfo') || {}).textContent || '';
      const statusChanged = stAfter !== st0;
      const noticeTxt = (document.querySelector('.vno-notification-bar-message,.vno-notice,.vno-toast,[role=dialog] h2,.vno-modal h2,.vno-dialog-title,.vno-dialog-content,[role=status]') || {}).textContent || '';

      // Đóng slideshow / reading view / sorter / dialogs / notifications nếu có
      try { canvas?.exitSlideShow?.(true); } catch (_) {}
      try { canvas?.exitReadingView?.(); } catch (_) {}
      try { canvas?.closeSlideSorter?.(); } catch (_) {}
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      document.querySelectorAll('dialog[open]').forEach(d => { try { d.close(); } catch (_) {} });
      document.querySelectorAll('.vno-dialog-overlay, .vno-modal, .vno-dropdown, .vno-menu, .vno-slide-sorter-overlay, .vno-slideshow-overlay, .vno-presenter-overlay').forEach(el => {
        try { el.remove(); } catch (_) {}
      });
      window.__vnoAppInstance?.shell?.clearNotification?.();
      window.__vnoAppInstance?.shell?.setStatus?.("Sẵn sàng");
      document.querySelectorAll('.vno-notification-bar').forEach(el => { try { el.remove(); } catch (_) {} });

      let status = 'OK';
      if (threw) {
        status = 'THREW';
      } else if (ret === false && !dlgAfter && !statusChanged && !noticeTxt) {
        status = 'SILENT_FALSE';
      } else if (ret === false && (statusChanged || dlgAfter || noticeTxt)) {
        status = 'STATUS_ONLY';
      } else if (statusChanged && !dlgAfter && before === after) {
        status = 'STATUS_ONLY';
      } else if (before === after && !dlgAfter && !statusChanged) {
        status = 'NO_VISIBLE_EFFECT';
      } else {
        status = 'OK';
      }

      return JSON.stringify({
        status,
        result: ret === undefined ? null : (typeof ret === 'object' ? 'obj' : ret),
        threw,
        dialog: dlgAfter,
        noticeTxt: noticeTxt.slice(0, 80),
        statusMsg: statusChanged ? stAfter : ''
      });
    })()`, { awaitPromise: true, timeoutMilliseconds: 25000 }).catch(e => JSON.stringify({ status: 'CDP_ERROR', threw: String(e.message || e) })));

    results.push({ ...r, ...res });
    const detail = res.threw ? ` | threw: ${res.threw}` : (res.statusMsg ? ` | status: ${res.statusMsg}` : (res.noticeTxt ? ` | notice: ${res.noticeTxt}` : ''));
    console.log(`${res.status.padEnd(18)} ${r.tab}/${r.group} ${r.id}${detail}`);
  }

  const outFile = path.join(profile, "slides-ribbon-audit.json");
  writeFileSync(outFile, JSON.stringify(results, null, 1));
  const count = (s) => results.filter(x => x.status === s).length;
  console.log(`TONG ${results.length} | OK ${count("OK")} | NO_VISIBLE_EFFECT ${count("NO_VISIBLE_EFFECT")} | SILENT_FALSE ${count("SILENT_FALSE")} | STATUS_ONLY ${count("STATUS_ONLY")} | NO_HANDLER ${count("NO_HANDLER")} | DISABLED ${count("DISABLED")} | THREW ${count("THREW")} | SKIPPED ${count("SKIPPED")}`);
  console.log(`FILE ${outFile}`);
} finally {
  await session.close();
}
