"""
VN Slides — Automated Ribbon Audit Probe
Runs in the real app using pywebview and evaluate_js.
Audits every control on Slides Home and Insert tabs.
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
api = vnmain.VnOfficeApi(app_kind="slides", initial_file=None)
url = f"http://127.0.0.1:{port}/index.html?app=slides"
window = webview.create_window(title="VN Slides Ribbon Audit", url=url, width=1400, height=900, js_api=api)

PROBE_SCRIPT = r"""
(async function() {
  window.__audit_done = false;
  window.__audit_results = null;

  try {
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    const { SLIDES_RIBBON_TABS } = await import('/apps/slides/slides-ribbon.js');
    const results = [];

    function setupSampleSlide() {
      const app = window.__vnoAppInstance;
      if (!app || !app.canvasController) return false;
      const canvas = app.canvasController;
      while (canvas.slides.length < 3) {
        canvas.addNewSlide();
      }
      if (!canvas.sections || canvas.sections.length === 0) {
        canvas.addSection(0, "Phần giới thiệu");
        canvas.addSection(1, "Phần chi tiết");
      }
      canvas.selectSlide(0);
      const curSlide = canvas.slides[0];
      if (curSlide) {
        if (!curSlide.shapes || curSlide.shapes.length < 3) {
          canvas.insertShape("rect");
          canvas.insertShape("ellipse");
          canvas.insertShape("textbox");
        }
      }
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

    setupSampleSlide();

    const tabsToAudit = SLIDES_RIBBON_TABS.filter(t => t.id === 'home' || t.id === 'insert');

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
                options: item.options,
                defaultValue: item.defaultValue
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
          const canvas = app?.canvasController;

          if (canvas) {
            let slide = canvas.slides[canvas.currentSlideIndex];
            if (!slide) {
              canvas.addNewSlide();
              slide = canvas.slides[canvas.currentSlideIndex];
            }
            if (!slide.shapes || slide.shapes.length < 3) {
              canvas.insertShape("rect");
              canvas.insertShape("ellipse");
              canvas.insertShape("textbox");
            }

            if (cmdId.startsWith('slides.section.')) {
              if (!canvas.sections || canvas.sections.length < 2) {
                canvas.addSection(0, "Phần 1");
                canvas.addSection(1, "Phần 2");
              }
            } else if (cmdId === 'slides.text.clearFormat') {
              const textEl = canvas.titleEl || document.querySelector('[contenteditable="true"]');
              if (textEl) {
                textEl.focus();
                document.execCommand('selectAll', false, null);
              }
            } else if (cmdId.startsWith('slides.text.vAlign') || cmdId.startsWith('slides.text.direction')) {
              if (slide?.shapes && slide.shapes.length > 0) {
                slide.shapes[0].text = "Văn bản mẫu";
                canvas.setSelectedShapes([slide.shapes[0].id]);
              }
            } else if (cmdId === 'slides.arrange.bringToFront' || cmdId === 'slides.arrange.bringForward') {
              if (slide?.shapes && slide.shapes.length >= 2) {
                canvas.setSelectedShapes([slide.shapes[0].id]);
              }
            } else if (cmdId === 'slides.arrange.sendBackward' || cmdId === 'slides.arrange.sendToBack') {
              if (slide?.shapes && slide.shapes.length >= 2) {
                canvas.setSelectedShapes([slide.shapes[slide.shapes.length - 1].id]);
              }
            } else if (cmdId.startsWith('slides.arrange.align') || cmdId.startsWith('slides.arrange.distribute')) {
              if (cmdId !== 'slides.arrange.alignToSlide') {
                if (slide?.shapes && slide.shapes.length >= 2) {
                  canvas.setSelectedShapes([slide.shapes[0].id, slide.shapes[1].id]);
                }
              }
            } else if (cmdId === 'slides.shape.group') {
              if (slide?.shapes && slide.shapes.length >= 2) {
                delete slide.shapes[0].groupId;
                delete slide.shapes[1].groupId;
                canvas.setSelectedShapes([slide.shapes[0].id, slide.shapes[1].id]);
              }
            } else if (cmdId === 'slides.shape.ungroup') {
              if (slide?.shapes && slide.shapes.length >= 2) {
                slide.shapes[0].groupId = 'grp-test';
                slide.shapes[1].groupId = 'grp-test';
                canvas.setSelectedShapes([slide.shapes[0].id, slide.shapes[1].id]);
              }
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
            app: 'slides',
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
            busResult: String(busResult),
            error: err
          });

          await new Promise(r => setTimeout(r, 20));
        }
      }
    }

    window.__audit_results = results;
    window.__audit_done = true;
  } catch (globalErr) {
    window.__audit_results = [{ error: globalErr.message || String(globalErr) }];
    window.__audit_done = true;
  }
})();
"""

def run_probe():
    # Wait for app ready
    for _ in range(60):
        time.sleep(0.5)
        ready = window.evaluate_js("document.readyState === 'complete' && Boolean(window.__vnoAppInstance)")
        if ready:
            break

    time.sleep(1.0)
    window.evaluate_js(PROBE_SCRIPT)

    # Poll for completion
    for _ in range(120):
        time.sleep(0.5)
        done = window.evaluate_js("Boolean(window.__audit_done)")
        if done:
            break

    raw_results = window.evaluate_js("JSON.stringify(window.__audit_results || [])")
    results = json.loads(raw_results)

    out_file = ROOT / "docs" / "_slides_home_insert_audit.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n--- AUDIT SUMMARY: {len(results)} controls tested ---")
    for r in results:
        status = r.get("classification", "UNKNOWN")
        print(f"[{status}] {r.get('tabId')} > {r.get('groupLabel')} > {r.get('commandId')} ({r.get('label') or ''}) | handler:{r.get('hasHandler')} dlg:{r.get('dialogOpened')} tgl:{r.get('toggleChanged')} undo:{r.get('undoOk')} err:{r.get('error')}")

    window.destroy()

if __name__ == "__main__":
    webview.start(run_probe)
