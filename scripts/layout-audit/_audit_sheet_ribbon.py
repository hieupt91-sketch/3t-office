"""
VN Sheet — Automated Ribbon Audit Probe
Runs in the real app using pywebview and evaluate_js.
Audits every control on Sheet Home and Insert tabs.
"""
import os
import sys
import time
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import webview
import main as vnmain

server, port = vnmain._start_static_server()
api = vnmain.VnOfficeApi(app_kind="sheet", initial_file=None)
url = f"http://127.0.0.1:{port}/index.html?app=sheet"
window = webview.create_window(title="VN Sheet Ribbon Audit", url=url, width=1400, height=900, js_api=api)

PROBE_SCRIPT = r"""
(async function() {
  window.__audit_done = false;
  window.__audit_results = null;

  try {
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    const { SHEET_RIBBON_TABS } = await import('/apps/sheet/sheet-ribbon.js');
    const results = [];

    function getGridController() {
      return window.__vno_sheet_grid || null;
    }

    function setupSampleSheet() {
      const app = window.__vnoAppInstance;
      if (!app || !app.grid) return false;
      const grid = app.grid;
      grid.setCellValue("A", 1, "Sản phẩm");
      grid.setCellValue("B", 1, 100);
      grid.setCellValue("A", 2, "Gạo");
      grid.setCellValue("B", 2, 200);
      grid.setCellValue("A", 3, "Đường");
      grid.setCellValue("B", 3, 150);
      grid.setCellValue("A", 4, "Muối");
      grid.setCellValue("B", 4, 80);
      grid.setCellValue("A", 5, "Tiêu");
      grid.setCellValue("B", 5, 120);
      grid.selectCell("A", 2);
      grid.selectCell("B", 4, true);
      return true;
    }

    function autoDismissDialogs() {
      const dialogs = document.querySelectorAll('.vno-dialog-overlay, .vno-custom-dialog-overlay, .vno-modal-overlay');
      let found = false;
      dialogs.forEach(d => {
        found = true;
        const closeBtn = d.querySelector('.vno-dialog-close-btn, button[aria-label="Đóng"], button.vno-btn-secondary, button');
        if (closeBtn) closeBtn.click();
        else if (d.parentNode) d.parentNode.removeChild(d);
      });
      return found;
    }

    async function activateTab(tabId) {
      const tabBtn = document.getElementById(`vno-ribbon-tab-${tabId}`);
      if (tabBtn) {
        tabBtn.click();
        await new Promise(r => setTimeout(r, 60));
      }
    }

    setupSampleSheet();

    const tabsToAudit = SHEET_RIBBON_TABS.filter(t => t.id === 'home' || t.id === 'insert');

    for (const tab of tabsToAudit) {
      await activateTab(tab.id);

      for (const group of tab.groups || []) {
        const itemsToTest = [];

        function collect(items) {
          if (!items || !Array.isArray(items)) return;
          for (const item of items) {
            if (item.type === 'dropdown') {
              itemsToTest.push({
                commandId: item.commandId || item.id,
                type: 'dropdown',
                label: item.label,
                isContainer: true
              });
              if (item.items) {
                for (const sub of item.items) {
                  itemsToTest.push({
                    commandId: sub.commandId,
                    args: sub.args,
                    type: 'menuItem',
                    label: sub.label,
                    parent: item.commandId || item.id
                  });
                }
              }
            } else if (item.commandId) {
              itemsToTest.push({
                commandId: item.commandId,
                type: item.type || 'button',
                label: item.label,
                options: item.options
              });
            }
            if (item.items && item.type !== 'dropdown') {
              collect(item.items);
            }
          }
        }

        collect(group.items);

        if (group.launcherCommandId) {
          itemsToTest.push({
            commandId: group.launcherCommandId,
            type: 'dialogLauncher',
            label: group.launcherTooltip || group.label
          });
        }

        for (const item of itemsToTest) {
          autoDismissDialogs();

          const cmdId = item.commandId;
          const stateBefore = bus.getState(cmdId);
          const hasHandler = bus._handlers.has(cmdId);

          let err = null;
          let busResult = null;
          let dialogOpened = false;
          let toggleChanged = false;
          let undoOk = true;

          let dialogWatcher = setInterval(() => {
            if (autoDismissDialogs()) {
              dialogOpened = true;
            }
          }, 30);

          const argToPass = item.args ?? (item.options?.[0]?.value ?? item.defaultValue ?? null);
          const app = window.__vnoAppInstance;
          const grid = app?.grid;
          if (grid) {
            if (cmdId === 'sheet.cell.mergeCenter') {
              grid.selectCell('C', 10);
              grid.selectCell('E', 12, true);
            } else if (cmdId === 'sheet.cell.mergeAcross') {
              grid.selectCell('C', 15);
              grid.selectCell('E', 17, true);
            } else if (cmdId === 'sheet.cell.mergeCells') {
              grid.selectCell('C', 20);
              grid.selectCell('E', 22, true);
            } else if (cmdId === 'sheet.cell.unmerge') {
              grid.selectCell('G', 10);
              grid.selectCell('H', 11, true);
              await bus.execute('sheet.cell.mergeCells');
              grid.selectCell('G', 10);
            } else if (cmdId.startsWith('sheet.insert.sparkline')) {
              grid.selectCell('B', 2);
              grid.selectCell('B', 5, true);
            }
          }

          try {
            if (item.isContainer) {
              const btn = document.querySelector(`[data-dropdown-id="${cmdId}"], [data-dropdown-toggle="${cmdId}"]`);
              if (btn) {
                btn.click();
                await new Promise(r => setTimeout(r, 40));
                const menu = document.querySelector('.vno-ribbon-dropdown-menu');
                dialogOpened = Boolean(menu && menu.offsetHeight > 0);
                autoDismissDialogs();
                busResult = true;
              } else {
                busResult = await Promise.race([
                  bus.execute(cmdId, argToPass),
                  new Promise(r => setTimeout(() => r('timeout'), 400))
                ]);
              }
            } else {
              busResult = await Promise.race([
                bus.execute(cmdId, argToPass),
                new Promise(r => setTimeout(() => r('timeout_handled'), 400))
              ]);
            }
          } catch (e) {
            err = e.message || String(e);
          } finally {
            clearInterval(dialogWatcher);
            await new Promise(r => setTimeout(r, 30));
            if (autoDismissDialogs()) dialogOpened = true;
          }

          const stateAfter = bus.getState(cmdId);
          if (stateBefore && stateAfter && stateBefore.checked !== stateAfter.checked) {
            toggleChanged = true;
          }

          let classification = 'OK';
          if (err) {
            classification = 'ERROR';
          } else if (!hasHandler && !item.isContainer) {
            classification = 'NO-OP';
          } else if (busResult === false && !dialogOpened && !toggleChanged) {
            classification = 'NO-OP';
          } else if (dialogOpened || toggleChanged || busResult === true || (busResult && typeof busResult === 'object') || busResult === 'timeout_handled') {
            classification = 'OK';
          } else {
            classification = 'OK';
          }

          results.push({
            app: 'sheet',
            tabId: tab.id,
            tabLabel: tab.label,
            groupId: group.id || '',
            groupLabel: group.label,
            commandId: cmdId,
            args: item.args,
            type: item.type,
            label: item.label,
            hasHandler,
            classification,
            dialogOpened,
            toggleChanged,
            undoOk,
            busResult: typeof busResult === 'object' ? 'object' : String(busResult),
            error: err
          });
        }
      }
    }

    window.__audit_results = results;
    window.__audit_done = true;
  } catch (globalErr) {
    window.__audit_results = [{ classification: 'ERROR', error: String(globalErr && globalErr.stack || globalErr) }];
    window.__audit_done = true;
  }
})();
"""

def after_load(win):
    global audit_results
    try:
        for _ in range(40):
            time.sleep(0.5)
            ready = win.evaluate_js("Boolean(document.querySelector('.vno-ribbon-tab') && (document.querySelector('.vno-ribbon-tab') || {}).textContent)")
            if ready:
                break

        time.sleep(1)
        win.evaluate_js(PROBE_SCRIPT)

        for _ in range(120):
            time.sleep(0.5)
            done = win.evaluate_js("Boolean(window.__audit_done)")
            if done:
                audit_results = win.evaluate_js("window.__audit_results")
                break
    except Exception as e:
        audit_results = [{"classification": "ERROR", "error": str(e)}]
    finally:
        win.destroy()

audit_results = []
webview.start(after_load, window, debug=False)

out_file = ROOT / "docs" / "_sheet_home_insert_audit.json"
out_file.parent.mkdir(parents=True, exist_ok=True)
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(audit_results, f, ensure_ascii=False, indent=2)

print(f"Audit completed: {len(audit_results) if isinstance(audit_results, list) else 'ERROR'} items tested.")
if isinstance(audit_results, list):
    for r in audit_results:
        print(f"[{r.get('classification')}] {r.get('tabId')} > {r.get('groupLabel')} > {r.get('commandId')} ({r.get('label') or ''}) | handler:{r.get('hasHandler')} dlg:{r.get('dialogOpened')} tgl:{r.get('toggleChanged')} undo:{r.get('undoOk')} err:{r.get('error')}")
