# Agent Handoff — CH-4.2 / CH-4.3

TASK: Real desktop Microsoft Office clipboard interoperability.
AGENT/ROLE: Codex / clipboard integration and QA.
BRANCH: `feat/clipboard-office-interop-agy`.
WORKTREE: `E:\VNOffice-agy-clipboard`.
OBJECTIVE: Excel and Word rich copy → desktop Sheet/Doc, ribbon Paste, Paste Special and one Undo.

FINDINGS:
- Resume started with `git log -3` and `git diff HEAD~1 --stat`: WIP `bd89271c` over `ead89557`; no earlier clipboard handoff/notes exist in this worktree. Existing uncommitted work was preserved.
- Chromium DOES expose Windows CF_HTML as `text/html`, including `<style>` in the real Excel/Word samples. Excel native probe: types `text/plain,text/html,text/rtf,Files`, HTML 2505 characters, CSS present, no `x:num`. Word native event: types `text/plain,text/html,text/rtf`, HTML 45146 characters on the final run, CSS present; the native event is used directly.
- Sheet Ctrl+V on a noneditable grid invokes the platform shortcut command and adapter `_pasteIntoSelectedCell`, rather than a native paste event. Ribbon uses the same command. Those paths read the Python clipboard bridge. The old bridge returned only StartFragment..EndFragment, discarding Office head CSS and sometimes table wrappers.
- Python bridge now retains Office styles plus the copied body/table. Real Excel bridge: HTML 1892 characters with styles, no `x:num`; displayed values therefore need typed parsing.
- vi-VN Excel uses `mso-displayed-*` separators and can emit `#.##000` for the invariant two-decimal format. Date strings without `x:num` must become Sheet date serials using the existing NumberFormatter.
- Word bullet detection scanned decimal CSS values such as `7.0pt` and wrongly selected `<ol>`; marker detection now examines the beginning of visible text.

IMPLEMENTATION SUMMARY:
- Preserve existing clipboard parser, adapters, command bus, desktop bridge and snapshot Undo.
- Keep complete trusted native event HTML; use bridge enrichment only when HTML is absent or Office class CSS is missing. This also avoids replacing an event payload with an unrelated later clipboard read.
- Excel destination: A1 bold/yellow; B2 numeric 1250 → `1,250`; C2 serial 46387 → `31/12/2026`; B3 0.25 → `25%`; C3 1234.56 → `1,234.56`; numeric/date cells right-aligned.
- Writer keeps heading, bold sentence, two unordered bullet items and 2×2 table. Writer Paste Special uses the existing module translation function rather than nonexistent `this.t`.
- Vietnamese help is included in existing Sheet/Writer help entries. No core, framework, dependency, save-path or OOXML zip-patch changes.
- Diagnostic logging is opt-in in JavaScript, safe in Node environments with no window. Python logs clipboard metadata only, never document content.
- CDP acceptance helper creates hidden Office COM documents and identifies the exact Office PID from that instance's own HWND; closes only that PID/COM instance. No OS-level input.
- Audit checks now evaluate the desktop exclusively through WebView2 CDP; Python still owns the embedded server. Audit Excel helper no longer terminates all Excel processes. Fixed external linters are selected with `VNO_AUDIT_LINTER_DIR`.
- `git rm --ignore-unmatch -- 'test_output*.txt' tests/live/clipboard-office.ready.json` run: no tracked test_output files remained at resume; tracked runtime marker removed and runtime markers ignored.

FILES CHANGED:
- Prior WIP: `main.py`, clipboard platform, Sheet/Writer adapters, help entries, Python/parser tests and CDP/hidden COM probes.
- Completion: the same adapters/parser/probes plus `tests/unit/basic-editing-keys.test.js`, `.gitignore`, CDP audit helper and existing batch/Excel/roundtrip audit scripts; this handoff and resume plan.

COMMANDS RUN:
- `node --experimental-websocket tests/live/cdp_paste.mjs 9396 sheet {paste-com,ribbon-com,special-com,probe-com}` (sequential).
- `node --experimental-websocket tests/live/cdp_paste.mjs 9397 writer {paste-com,ribbon-com,special-com}` (sequential).
- `node tests/run-tests.js` — once.
- `python -m unittest discover -s tests` — once.
- `python scripts/layout-audit/_batch_audit.py E:\VNOffice-agy-clipboard lan01.xlsx ... lan26.xlsx`, fixed linter directory `E:\VNOffice-codex-audit-sheet\scripts\layout-audit`.

BUILD RESULT: NOT RUN — no separate packaging build requested; JavaScript/Python gates below.
TEST RESULTS:
- Desktop: all six Ctrl+V/ribbon/Paste Special cases PASS with one-step Undo; Excel Chromium native probe PASS.
- JS full gate: 2283/2288 PASS, 5 FAIL. Three known soffice failures listed below; two clipboard failures were then fixed without altering expected outputs. Targeted Sheet keyboard suite: 5/5 PASS; basic editing suite including new event/bridge regression: 10/10 PASS; clipboard parser suite: 61/61 PASS. Full gate not repeated, as requested.
- Python full gate: 531/532 PASS, 1 FAIL (`test_main_returns_exit_code_when_no_port_available`, got 0 instead of 3). Its launch request was accepted by another still-open Writer window belonging to this session. Closed all remaining pages on this session's CDP port 9397, without OS input; reran unchanged `test_desktop_launch.py`: 6/6 PASS. No Python full rerun.
- 26 LAN gate: PASS. LAN01–LAN07 retained from the previous run; LAN08–LAN26 completed on 02/10 through WebView2 CDP. All 26: TONG 0, Excel hidden COM open OK, fixed external linters clean. Resume batch exit code 0.

KNOWN FAILURES:
1. `Sheet FODS save: LibreOffice giữ CF và validation qua FODS -> XLSX -> FODS` — EBUSY unlink.
2. `Sheet Pivot save: LibreOffice giữ DataPilot qua FODS -> XLSX -> FODS` — soffice XLSX conversion failed.
3. `FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility` — soffice XLSX conversion failed.
- Resolved environmental Python failure: `test_main_returns_exit_code_when_no_port_available`; unchanged targeted desktop launch suite PASS after closing all own Writer windows.
- Resolved after JS full run: `SheetAdapter: Clipboard cache fallback hoạt động khi navigator.clipboard bị chặn` (diagnostic window guard); `Writer paste event uses clipboard HTML/text and the plain-text command selects text only` (complete event HTML precedence). Focused reruns PASS.

RISKS: Web-only clipboard paths depend on browser permissions; local desktop bridge is Windows-specific. No Office sample/document content is sent to cloud.
DEPENDENCIES/BLOCKERS: Installed WebView2 and hidden Excel/Word COM; LAN files are local ignored test data, not committed.
CORE PATCH ID (if any): None.
NEXT ACTION: Completed and committed on this branch; ready for reviewer. Do not merge into main without the owner’s instruction.

Desktop evidence (stdout from the real CDP test, including destination model and Undo):

<details>
<summary>sheet-paste</summary>

```text
OFFICE_COM_READY app=sheet officePid=20964 hidden=true
{
  "app": "sheet",
  "target": "http://localhost:8080/?app=sheet&singleApp=1",
  "diagnostics": [
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"clipboard-bridge-result\",\"status\":\"ok\",\"textLength\":63,\"htmlLength\":1892,\"htmlHasStyle\":true,\"htmlHasXNum\":false,\"message\":\"\"}",
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"sheet-paste-destination\",\"selectedCoord\":{\"c\":\"A\",\"r\":1},\"isInternal\":false,\"cellsBefore\":[]}",
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"sheet-paste-applied\",\"applied\":true,\"cellsAfter\":[{\"coord\":\"A1\",\"val\":\"Tên\",\"style\":{\"fontWeight\":\"bold\",\"backgroundColor\":\"yellow\"}},{\"coord\":\"B2\",\"val\":1250,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"number\",\"decimals\":0,\"useSeparator\":true,\"useThousands\":true}}},{\"coord\":\"C2\",\"val\":46387,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"date\",\"formatPattern\":\"dd/mm/yyyy\"}}},{\"coord\":\"B3\",\"val\":0.25,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"percentage\",\"decimals\":0}}},{\"coord\":\"C3\",\"val\":1234.56,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"number\",\"decimals\":2,\"useSeparator\":true,\"useThousands\":true}}}]}"
  ],
  "output": {
    "cells": [
      {
        "coord": "A1",
        "text": "Tên",
        "style": "font-weight: bold; background-color: yellow; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "B1",
        "text": "Số lượng",
        "style": "font-weight: bold; background-color: yellow; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "C1",
        "text": "Ngày",
        "style": "font-weight: bold; background-color: yellow; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: visible;"
      },
      {
        "coord": "A2",
        "text": "Bút",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "B2",
        "text": "1,250",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "C2",
        "text": "31/12/2026",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "A3",
        "text": "Giấy",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "B3",
        "text": "25%",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "C3",
        "text": "1,234.56",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      }
    ]
  },
  "afterUndo": {
    "cells": [
      {
        "coord": "A1",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "B1",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "C1",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "A2",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "B2",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "C2",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "A3",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "B3",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "C3",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      }
    ]
  }
}
ACCEPTANCE_PASS app=sheet action=paste-com undo=one-step
OFFICE_COM_CLOSED app=sheet officePid=20964
```

</details>

<details>
<summary>sheet-probe</summary>

```text
OFFICE_COM_READY app=sheet officePid=17680 hidden=true
{
  "app": "sheet",
  "target": "http://localhost:8080/?app=sheet&singleApp=1",
  "diagnostics": [
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"chromium-native-paste-probe\",\"types\":[\"text/plain\",\"text/html\",\"text/rtf\",\"Files\"],\"textLength\":63,\"htmlLength\":2505,\"htmlHasStyle\":true,\"htmlHasXNum\":false}",
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"clipboard-bridge-result\",\"status\":\"ok\",\"textLength\":63,\"htmlLength\":1892,\"htmlHasStyle\":true,\"htmlHasXNum\":false,\"message\":\"\"}",
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"sheet-paste-destination\",\"selectedCoord\":{\"c\":\"A\",\"r\":1},\"isInternal\":false,\"cellsBefore\":[]}",
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"sheet-paste-applied\",\"applied\":true,\"cellsAfter\":[{\"coord\":\"A1\",\"val\":\"Tên\",\"style\":{\"fontWeight\":\"bold\",\"backgroundColor\":\"yellow\"}},{\"coord\":\"B2\",\"val\":1250,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"number\",\"decimals\":0,\"useSeparator\":true,\"useThousands\":true}}},{\"coord\":\"C2\",\"val\":46387,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"date\",\"formatPattern\":\"dd/mm/yyyy\"}}},{\"coord\":\"B3\",\"val\":0.25,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"percentage\",\"decimals\":0}}},{\"coord\":\"C3\",\"val\":1234.56,\"style\":{\"textAlign\":\"right\",\"numberFormat\":{\"category\":\"number\",\"decimals\":2,\"useSeparator\":true,\"useThousands\":true}}}]}"
  ],
  "output": {
    "cells": [
      {
        "coord": "A1",
        "text": "Tên",
        "style": "font-weight: bold; background-color: yellow; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "B1",
        "text": "Số lượng",
        "style": "font-weight: bold; background-color: yellow; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "C1",
        "text": "Ngày",
        "style": "font-weight: bold; background-color: yellow; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: visible;"
      },
      {
        "coord": "A2",
        "text": "Bút",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "B2",
        "text": "1,250",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "C2",
        "text": "31/12/2026",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "A3",
        "text": "Giấy",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "B3",
        "text": "25%",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      },
      {
        "coord": "C3",
        "text": "1,234.56",
        "style": "text-align: right; width: 64px; min-width: 64px; max-width: 64px; height: 20px; overflow: hidden; text-overflow: clip;"
      }
    ]
  },
  "afterUndo": {
    "cells": [
      {
        "coord": "A1",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "B1",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "C1",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "A2",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "B2",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "C2",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "A3",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "B3",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      },
      {
        "coord": "C3",
        "text": "",
        "style": "width: 64px; min-width: 64px; max-width: 64px; height: 20px;"
      }
    ]
  }
}
ACCEPTANCE_PASS app=sheet action=probe-com undo=one-step
OFFICE_COM_CLOSED app=sheet officePid=17680
```

</details>

<details>
<summary>writer-paste (final event HTML precedence and own HWND cleanup)</summary>

```text
OFFICE_COM_READY app=writer officePid=31000 hidden=true
{
  "app": "writer",
  "target": "http://localhost:8081/?app=writer&singleApp=1&documentName=T%C3%A0i+li%E1%BB%87u+3.docx",
  "diagnostics": [
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"writer-paste-event\",\"types\":[\"text/plain\",\"text/html\",\"text/rtf\"],\"textLength\":119,\"htmlLength\":45146,\"htmlHasStyle\":true}",
    "__VNO_CLIPBOARD_DIAG__{\"phase\":\"writer-paste-source\",\"status\":\"event\",\"textLength\":119,\"htmlLength\":45146,\"htmlHasStyle\":true}"
  ],
  "output": {
    "html": "<p>\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n<!--StartFragment-->\n\n</p><h1>Heading <span class=\"vno-spelling-uncertain\" data-vno-spelling-uncertain=\"clipboard\" aria-label=\"clipboard: từ chưa chắc chắn\">clipboard</span> <span class=\"vno-spelling-uncertain\" data-vno-spelling-uncertain=\"test\" aria-label=\"test: từ chưa chắc chắn\">test</span></h1><p>\n\n</p><p class=\"MsoNormal\"><b>Bold <span class=\"vno-spelling-uncertain\" data-vno-spelling-uncertain=\"sentence\" aria-label=\"sentence: từ chưa chắc chắn\">sentence</span></b></p><p>\n\n</p><ul data-vno-mso-list=\"1\"><li><!--[if !supportLists]--><!--[endif]-->Bullet <span class=\"vno-spelling-uncertain\" data-vno-spelling-uncertain=\"item\" aria-label=\"item: từ chưa chắc chắn\">item</span> <span class=\"vno-spelling-uncertain\" data-vno-spelling-uncertain=\"one\" aria-label=\"one: từ chưa chắc chắn\">one</span></li>\n<li><!--[if !supportLists]--><!--[endif]-->Bullet <span class=\"vno-spelling-uncertain\" data-vno-spelling-uncertain=\"item\" aria-label=\"item: từ chưa chắc chắn\">item</span> <span class=\"vno-spelling-uncertain\" data-vno-spelling-uncertain=\"two\" aria-label=\"two: từ chưa chắc chắn\">two</span></li></ul><p>\n\n</p><div class=\"vno-page-auto-gap\" contenteditable=\"false\" data-vno-auto-page-gap=\"true\" data-vno-soft-break=\"true\"></div><table class=\"MsoNormalTable\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\">\n <tbody><tr>\n  <td width=\"301\" valign=\"top\" style=\"width:225.65pt;padding:0cm 5.4pt 0cm 5.4pt\">\n  <p class=\"MsoNormal\">Table 1,1</p>\n  </td>\n  <td width=\"301\" valign=\"top\" style=\"width:225.65pt;padding:0cm 5.4pt 0cm 5.4pt\">\n  <p class=\"MsoNormal\">Table 1,2</p>\n  </td>\n </tr>\n <tr>\n  <td width=\"301\" valign=\"top\" style=\"width:225.65pt;padding:0cm 5.4pt 0cm 5.4pt\">\n  <p class=\"MsoNormal\">Table 2,1</p>\n  </td>\n  <td width=\"301\" valign=\"top\" style=\"width:225.65pt;padding:0cm 5.4pt 0cm 5.4pt\">\n  <p class=\"MsoNormal\">Table 2,2</p>\n  </td>\n </tr>\n</tbody></table><p>\n\n<!--EndFragment-->\n\n\n</p>",
    "text": "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nHEADING CLIPBOARD TEST\n\n\n\n\n\nBold sentence\n\n\n\n\n\nBullet item one\n\n\nBullet item two\n\n\n\n\n\n\n  \n\nTable 1,1\n\n\n  \t\n  \n\nTable 1,2\n\n\n  \n\n  \n\nTable 2,1\n\n\n  \t\n  \n\nTable 2,2\n\n\n  \n\n\n\n\n\n\n"
  },
  "afterUndo": {
    "html": "<p><br></p>",
    "text": "\n"
  }
}
ACCEPTANCE_PASS app=writer action=paste-com undo=one-step
OFFICE_COM_CLOSED app=writer officePid=31000
```

</details>

Other desktop acceptance outputs:

```text
ACCEPTANCE_PASS app=sheet action=ribbon-com undo=one-step
OFFICE_COM_CLOSED app=sheet officePid=13168
ACCEPTANCE_PASS app=sheet action=special-com undo=one-step
OFFICE_COM_CLOSED app=sheet officePid=26692
ACCEPTANCE_PASS app=writer action=ribbon-com undo=one-step
OFFICE_COM_CLOSED app=writer officePid=34248
ACCEPTANCE_PASS app=writer action=special-com undo=one-step
OFFICE_COM_CLOSED app=writer officePid=21072
```


## Resume completion — 02/10/2026

- Started with `git log -3` and `git diff main --stat`; read this handoff and the resume plan. No NEW EVIDENCE section was present. Preserved WIP commits `54e2993f` and `bd89271c` and the completed desktop evidence above.
- `git rm --ignore-unmatch -- 'test_output*.txt'`: no tracked stray files remained.
- Completed the existing `_batch_audit.py` gate only for the unfinished LAN08–LAN26 using `VNO_AUDIT_LINTER_DIR=E:\VNOffice-codex-audit-sheet\scripts\layout-audit`. No edits to save paths or `ooxml_zip_patch.py`.
- Final full JavaScript gate, run once: **2289/2290 PASS, 1 FAIL**. The sole failure was `Help Shortcut Consistency: mọi shortcut nhắc trong Help sheet khớp shortcut thật (command-definitions + app binds)`: the clipboard help step put Ctrl+Y next to the later search label “Dán”. Separated Undo/Redo instructions from the F1 search step without changing a test or expected output. Unchanged focused Help shortcut suite then **3/3 PASS** (Writer, Sheet, Slides). Full suite was not repeated. All three known soffice tests listed above passed in this final full run.
- Final full Python gate, run once: **532/532 PASS**, `Ran 532 tests in 460.506s`, `OK`, no FAIL/ERROR. Used process-local `LOCALAPPDATA=E:\VNOffice-agy-clipboard\_clipboard_test_profile` to avoid forwarding a launch-test request to another active desktop instance. PowerShell’s combined stderr redirection produced `NativeCommandError` and wrapper status 1 for unittest progress on stderr; the unittest report itself is OK. No full rerun.
- `git diff --check`: PASS. Packaging build: NOT RUN, not requested.
- Final change after the WIP: the concrete help wording correction and this completed handoff. Desktop acceptance code and its six existing PASS proofs were not redone.
- Logs (ignored local artifacts): `clipboard-js-final-gate.log`, `clipboard-help-final-gate.log`, `clipboard-python-final-gate.log`, `clipboard-lan-gate.log`, `clipboard-lan-resume-gate.log`. All real LAN source/roundtrip documents remain ignored.

26-file LAN gate output (first seven retained from the completed run; remaining nineteen from the resume):

```text
lan01.xlsx saved total 0 excel _rt_lan01.xlsx OK sheets=3 lint clean seconds 282.4
lan02.xlsx saved total 0 excel _rt_lan02.xlsx OK sheets=2 lint clean seconds 50.1
lan03.xlsx saved total 0 excel _rt_lan03.xlsx OK sheets=12 lint clean seconds 73.6
lan04.xlsx saved total 0 excel _rt_lan04.xlsx OK sheets=2 lint clean seconds 45.2
lan05.xlsx saved total 0 excel _rt_lan05.xlsx OK sheets=1 lint clean seconds 44.4
lan06.xlsx saved total 0 excel _rt_lan06.xlsx OK sheets=4 lint clean seconds 311.1
lan07.xlsx saved total 0 excel _rt_lan07.xlsx OK sheets=10 lint clean seconds 44.8
lan08.xlsx saved total 0 excel _rt_lan08.xlsx OK sheets=7 lint clean seconds 57.6
lan09.xlsx saved total 0 excel _rt_lan09.xlsx OK sheets=15 lint clean seconds 149.7
lan10.xlsx saved total 0 excel _rt_lan10.xlsx OK sheets=9 lint clean seconds 88.3
lan11.xlsx saved total 0 excel _rt_lan11.xlsx OK sheets=3 lint clean seconds 58.4
lan12.xlsx saved total 0 excel _rt_lan12.xlsx OK sheets=11 lint clean seconds 74.7
lan13.xlsx saved total 0 excel _rt_lan13.xlsx OK sheets=12 lint clean seconds 44.8
lan14.xlsx saved total 0 excel _rt_lan14.xlsx OK sheets=4 lint clean seconds 547.9
lan15.xlsx saved total 0 excel _rt_lan15.xlsx OK sheets=5 lint clean seconds 48.5
lan16.xlsx saved total 0 excel _rt_lan16.xlsx OK sheets=14 lint clean seconds 85.6
lan17.xlsx saved total 0 excel _rt_lan17.xlsx OK sheets=23 lint clean seconds 45.3
lan18.xlsx saved total 0 excel _rt_lan18.xlsx OK sheets=1 lint clean seconds 44.8
lan19.xlsx saved total 0 excel _rt_lan19.xlsx OK sheets=1 lint clean seconds 44.8
lan20.xlsx saved total 0 excel _rt_lan20.xlsx OK sheets=1 lint clean seconds 45.2
lan21.xlsx saved total 0 excel _rt_lan21.xlsx OK sheets=18 lint clean seconds 45.0
lan22.xlsx saved total 0 excel _rt_lan22.xlsx OK sheets=2 lint clean seconds 61.5
lan23.xlsx saved total 0 excel _rt_lan23.xlsx OK sheets=1 lint clean seconds 44.8
lan24.xlsx saved total 0 excel _rt_lan24.xlsx OK sheets=4 lint clean seconds 44.7
lan25.xlsx saved total 0 excel _rt_lan25.xlsx OK sheets=1 lint clean seconds 41.8
lan26.xlsx saved total 0 excel _rt_lan26.xlsx OK sheets=6 lint clean seconds 62.9
```

---

# Agent Handoff — sửa hồi quy cấu trúc đoạn văn Cut/Paste

TASK: Sửa hồi quy Clipboard làm 3T Doc mất cấu trúc đoạn văn sau Ctrl+X/Ctrl+V.
AGENT/ROLE: Codex / Writer Adapter và QA desktop.
BRANCH: `merge/clipboard-into-main-claude`.
WORKTREE: `E:\VNOffice-claude-clipmerge`.
OBJECTIVE: Giữ thẻ đoạn văn khi cắt/dán, gộp phần còn lại khi cắt xuyên nhiều đoạn, dán đúng caret và hoàn tác Paste bằng một bước mà không làm mất khả năng dán Word/Excel thật.
FINDINGS:
- CDP trước sửa: cắt giữa đoạn còn `<p>`, nhưng dán nội dung nội tuyến tạo một `<div>` cấp block giữa hai `<p>`; cắt xuyên hai đoạn bằng `Range.deleteContents()` để lại hai đoạn rời.
- Thuật toán `document.execCommand("delete")` của contenteditable giữ `<p><br></p>` khi cắt hết đoạn và gộp hai phần còn lại thành một `<p>` khi cắt xuyên đoạn.
- HTML clipboard nội bộ được serializer bọc bằng `<div>` để mang style. Khi fragment chỉ có nội dung inline và caret ở trong đoạn, wrapper block này phải đổi thành `<span>`; fragment Word có `p`/heading/list/table vẫn giữ đường chèn block.
IMPLEMENTATION SUMMARY:
- Cut ưu tiên lệnh delete native của contenteditable; fallback về `Range.deleteContents()` khi môi trường không hỗ trợ.
- Paste chỉ đổi một wrapper `div` thuần inline thành `span` khi selection nằm trong `p`/heading/list item/blockquote/pre; không thay đổi parser, bridge hay HTML block của Word.
- Thêm hai unit regression cho Cut xuyên đoạn và Paste inline giữ thẻ `p`.
FILES CHANGED:
- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/unit/basic-editing-keys.test.js`
- `docs/HANDOFF-CLIPBOARD.md`
COMMANDS RUN:
- CDP Writer cô lập qua `python -s main.py --app=writer`, `LOCALAPPDATA=E:\VNOffice-profiles\codex-clipfix-{1,2,3}`, cổng 9461–9463; thao tác bàn phím chỉ qua `Input.dispatchKeyEvent`.
- `node --input-type=module -e "...runBasicEditingKeysTests..."`
- `node tests/run-tests.js` (hai lần; lần hai lọc stdout chỉ để định danh FAIL).
- `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`
- `node --experimental-websocket tests/live/cdp_paste.mjs 9464 writer paste-com`
- Chạy riêng `runSheetFormatDropdownTests()` để xác nhận FAIL soffice còn lại.
BUILD RESULT: NOT RUN — không có build đóng gói riêng trong yêu cầu; đã chạy gate JavaScript và desktop.
TEST RESULTS:
- Targeted basic editing: 14/14 PASS, gồm hai regression mới.
- CDP cấu trúc thật: cắt/dán giữa đoạn giữ đúng 1 `<p>`; Ctrl+Z trở về trạng thái sau Cut và Ctrl+Y phục hồi Paste; cắt hết đoạn còn `<p><br></p>`; cắt xuyên hai đoạn gộp thành 1 `<p>`.
- Node full lần 1: `KẾT QUẢ KIỂM THỬ: 2505/2510 PASS | 5 FAIL`; các lỗi là chuyển đổi soffice không ổn định.
- Node full lần 2: `KẾT QUẢ KIỂM THỬ: 2509/2510 PASS | 1 FAIL`; hai test mới PASS. FAIL còn lại được chạy riêng và tái hiện đúng ở `FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility` do `soffice --convert-to xlsx:Calc MS Excel 2007 XML failed`.
- Desktop regression: `TOTAL: 26 PASS, 1 FAIL, 0 BLOCKED, 6 N/A`. FAIL duy nhất: `3T Sheet type detection` không nhận `13:45`; 3T Doc Ctrl+C/X/V, Tab và Save đều PASS.
- Word thật COM ẩn: `ACCEPTANCE_PASS app=writer action=paste-com undo=one-step`; heading, bold, bullet, bảng 2×2 còn nguyên. Helper đóng đúng Word PID 22684; app test đóng đúng PID 27228.
KNOWN FAILURES:
- `FODS thật qua soffice: FODS → XLSX → FODS giữ height/width/visibility` — lỗi convert ngoài phạm vi Clipboard.
- Desktop `3T Sheet type detection` với `13:45` — FAIL duy nhất được phép theo gate.
RISKS: `execCommand` là API cũ nhưng đây là chính thuật toán biên tập contenteditable đang được app và WebView2 sử dụng; fallback Range vẫn còn cho môi trường không hỗ trợ. Việc đổi `div` sang `span` được giới hạn ở fragment thuần inline bên trong block văn bản.
DEPENDENCIES/BLOCKERS: Không có blocker Clipboard. Gate Node toàn bộ còn một FAIL soffice ngoài scope.
CORE PATCH ID (if any): None.
NEXT ACTION: Reviewer kiểm tra commit trên branch này và tự gộp; không merge main, không push.
