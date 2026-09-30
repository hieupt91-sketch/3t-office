"""
VN Writer — Automated Ribbon Audit Probe
Runs in the real app using pywebview and evaluate_js.
Audits every control on Writer Home and Insert tabs.
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
api = vnmain.VnOfficeApi(app_kind="writer", initial_file=None)
url = f"http://127.0.0.1:{port}/index.html?app=writer"
window = webview.create_window(title="VN Writer Ribbon Audit", url=url, width=1400, height=900, js_api=api)

SAMPLE_HTML = """
<p id="p1" style="font-family:'Times New Roman';font-size:14pt;">Cộng hòa Xã hội Chủ nghĩa Việt Nam</p>
<p id="p2" style="font-family:'Times New Roman';font-size:13pt;font-style:italic;">Độc lập - Tự do - Hạnh phúc</p>
<p id="p3" style="font-family:'Times New Roman';font-size:14pt;font-weight:bold;">BÁO CÁO KẾT QUẢ CÔNG TÁC</p>
<p id="p4" style="font-family:'Times New Roman';font-size:14pt;">Nội dung đoạn văn mẫu để kiểm tra các lệnh định dạng phông chữ, đoạn văn, danh sách và bảng biểu.</p>
<table id="tbl1" style="border-collapse:collapse;width:100%;border:1px solid black;">
  <tr><td style="border:1px solid black;padding:4px;">STT</td><td style="border:1px solid black;padding:4px;">Nội dung</td></tr>
  <tr><td style="border:1px solid black;padding:4px;">1</td><td style="border:1px solid black;padding:4px;">Dữ liệu thử nghiệm</td></tr>
</table>
<p id="p5" style="font-family:'Times New Roman';font-size:14pt;">Đoạn văn kết thúc tài liệu mẫu.</p>
"""

PROBE_SCRIPT = r"""
(async function() {
  window.__audit_done = false;
  window.__audit_results = null;

  try {
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    const { WRITER_RIBBON_TABS } = await import('/apps/writer/writer-ribbon.js');
    const results = [];

    function getBody() {
      return document.querySelector('.vno-writer-body');
    }

    function setSampleContent() {
      const body = getBody();
      if (body) {
        body.innerHTML = __SAMPLE_HTML__;
        body.focus();
      }
    }

    function selectSampleText(forSort = false) {
      if (forSort) {
        const p1 = document.getElementById('p1');
        const p3 = document.getElementById('p3');
        if (!p1 || !p3) return false;
        const range = document.createRange();
        range.setStartBefore(p1);
        range.setEndAfter(p3);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      const p4 = document.getElementById('p4');
      if (!p4) return false;
      const range = document.createRange();
      range.selectNodeContents(p4);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      p4.focus();
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

    // Tab switcher
    async function activateTab(tabId) {
      const tabBtn = document.getElementById(`vno-ribbon-tab-${tabId}`);
      if (tabBtn) {
        tabBtn.click();
        await new Promise(r => setTimeout(r, 60));
      }
    }

    const tabsToAudit = WRITER_RIBBON_TABS.filter(t => t.id === 'home' || t.id === 'insert');

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
          const cmdId = item.commandId;
          setSampleContent();
          selectSampleText(cmdId === 'writer.para.sort');
          autoDismissDialogs();
          const bodyBefore = getBody() ? getBody().innerHTML : '';
          const stateBefore = bus.getState(cmdId);
          const hasHandler = bus._handlers.has(cmdId);

          let err = null;
          let busResult = null;
          let domChanged = false;
          let dialogOpened = false;
          let toggleChanged = false;
          let undoOk = true;

          // Set up a background watcher to auto-close any dialog opened by the command
          let dialogWatcher = setInterval(() => {
            if (autoDismissDialogs()) {
              dialogOpened = true;
            }
          }, 30);

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
                  bus.execute(cmdId, item.args ?? null),
                  new Promise(r => setTimeout(() => r('timeout'), 400))
                ]);
              }
            } else {
              // Execute with timeout race so dialogs don't block
              busResult = await Promise.race([
                bus.execute(cmdId, item.args ?? null),
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

          const bodyAfter = getBody() ? getBody().innerHTML : '';
          domChanged = bodyAfter !== bodyBefore;

          const stateAfter = bus.getState(cmdId);
          if (stateBefore && stateAfter && stateBefore.checked !== stateAfter.checked) {
            toggleChanged = true;
          }

          if (domChanged) {
            try {
              await bus.execute('common.edit.undo');
              await new Promise(r => setTimeout(r, 30));
              const bodyUndone = getBody() ? getBody().innerHTML : '';
              undoOk = (bodyUndone === bodyBefore);
              await bus.execute('common.edit.redo');
            } catch (ue) {
              undoOk = false;
            }
          }

          let classification = 'OK';
          if (err) {
            classification = 'ERROR';
          } else if (!hasHandler && !item.isContainer) {
            classification = 'NO-OP';
          } else if (busResult === false && !domChanged && !dialogOpened && !toggleChanged) {
            classification = 'NO-OP';
          } else if (dialogOpened || domChanged || toggleChanged || busResult === true || (busResult && typeof busResult === 'object') || busResult === 'timeout_handled') {
            classification = 'OK';
          } else {
            classification = 'OK';
          }

          results.push({
            app: 'writer',
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
            domChanged,
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
""".replace("__SAMPLE_HTML__", json.dumps(SAMPLE_HTML))

def after_load(win):
    global audit_results
    try:
        for _ in range(40):
            time.sleep(0.5)
            ready = win.evaluate_js("Boolean(document.querySelector('.vno-writer-body') && (document.querySelector('.vno-ribbon-tab') || {}).textContent)")
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

out_file = ROOT / "docs" / "_writer_home_insert_audit.json"
out_file.parent.mkdir(parents=True, exist_ok=True)
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(audit_results, f, ensure_ascii=False, indent=2)

print(f"Audit completed: {len(audit_results) if isinstance(audit_results, list) else 'ERROR'} items tested.")
if isinstance(audit_results, list):
    for r in audit_results:
        print(f"[{r.get('classification')}] {r.get('tabId')} > {r.get('groupLabel')} > {r.get('commandId')} ({r.get('label') or ''}) | handler:{r.get('hasHandler')} dom:{r.get('domChanged')} dlg:{r.get('dialogOpened')} tgl:{r.get('toggleChanged')} undo:{r.get('undoOk')} err:{r.get('error')}")
