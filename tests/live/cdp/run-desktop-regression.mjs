import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { click, press, typeText } from "./actions.mjs";
import { connectToPort, readTargets, sleep } from "./client.mjs";
import { runFormulaProbe } from "./cdp_formula.mjs";
import { runKeysProbe, runClipboardProbe } from "./cdp_keys.mjs";
import { runTabProbe } from "./cdp_tab.mjs";
import { runTypeProbe } from "./cdp_types.mjs";
import { launchApp, repoRoot } from "./session.mjs";

const rows = [];
const appKinds = ["writer", "sheet", "slides"];
const extensions = { writer: "docx", sheet: "xlsx", slides: "pptx" };
const bodySelectors = { writer: ".vno-writer-body", sheet: ".vno-sheet-container", slides: ".vno-slide-canvas" };
const appLabels = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };

function report(status, label, detail = "") {
  rows.push({ status, label, detail: String(detail || "").replace(/\s+/g, " ").trim() });
}

async function runCase(label, action) {
  try {
    const result = await action();
    if (result?.status) {
      report(result.status, label, result.detail || "");
    } else {
      report(result?.pass ? "PASS" : "FAIL", label, result?.detail || "");
    }
  } catch (error) {
    report("FAIL", label, error?.stack || error);
  }
}

async function typeStartupText(session) {
  const { app, cdp } = session;
  if (app === "writer") {
    await click(cdp, ".vno-writer-body p");
    await sleep(500);
    await typeText(cdp, "CDP Startup Writer");
    return await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText || ''");
  }
  if (app === "sheet") {
    await click(cdp, '[data-coord="A1"]');
    await sleep(500);
    await typeText(cdp, "2468");
    await press(cdp, "Enter");
    return await cdp.evaluate("document.querySelector('[data-coord=\"A1\"]')?.textContent?.trim() || ''");
  }
  const target = await cdp.evaluate(
    "document.querySelector('.vno-slide-title, .vno-slide-body')?.className || ''",
  );
  const selector = target.includes("vno-slide-title") ? ".vno-slide-title"
    : target.includes("vno-slide-body") ? ".vno-slide-body" : "";
  if (!selector) throw new Error("The first slide did not expose an editable title or body placeholder.");
  await click(cdp, selector);
  await sleep(500);
  await typeText(cdp, "CDP Startup Slides");
  return await cdp.evaluate("document.querySelector(" + JSON.stringify(selector) + ")?.innerText || ''");
}

async function serializeCurrentDocument(cdp, app) {
  const expression = app === "writer"
    ? "window.__vnoAppInstance?.adapter?._contentForExport?.() || ''"
    : app === "sheet"
      ? "window.__vnoAppInstance?.adapter?.serializeToFods?.() || ''"
      : "window.__vnoAppInstance?.adapter?.serializeToFodp?.() || ''";
  const value = await cdp.evaluate(expression);
  if (typeof value !== "string" || !value.trim()) throw new Error("The app did not serialize a document.");
  return value;
}

async function saveAsThroughApp(session, savePath) {
  const cdp = session.cdp;
  const result = await cdp.evaluate(
    "(async () => {"
    + " const [{globalUnoBridge}, {globalCommandBus}] = await Promise.all(["
    + "  import('/adapters/libreoffice/common/uno-bridge.js'), import('/platform/commands/command-bus.js')]);"
    + " const original = globalUnoBridge.saveRealFile;"
    + " globalUnoBridge.saveRealFile = async (kind, content, format, name, source) =>"
    + "  await globalUnoBridge.saveRealFileInPlace(kind, content, " + JSON.stringify(savePath) + ", source || " + JSON.stringify(savePath) + ");"
    + " try { return await globalCommandBus.execute('common.file.saveAs'); }"
    + " finally { globalUnoBridge.saveRealFile = original; }"
    + "})()",
    { timeoutMilliseconds: 180000 },
  );
  if (result === false || result?.status === "error" || result?.status === "cancelled") {
    throw new Error("Save As command failed: " + JSON.stringify(result));
  }
}

async function saveThroughCommand(session, savePath) {
  const focusSelector = session.app === "writer" ? ".vno-writer-body p"
    : session.app === "sheet" ? '[data-coord="A1"]'
      : ".vno-slide-title, .vno-slide-body";
  await click(session.cdp, focusSelector);
  await typeText(session.cdp, " saved");
  const commandResult = await session.cdp.evaluate(
    "(async () => { const {globalCommandBus} = await import('/platform/commands/command-bus.js');"
    + " return await globalCommandBus.execute('common.file.save'); })()",
    { timeoutMilliseconds: 180000 },
  );
  if (commandResult === false || commandResult?.status === "error") {
    throw new Error("Save command failed: " + JSON.stringify(commandResult));
  }
  const started = Date.now();
  let state;
  do {
    state = await session.cdp.evaluate(
      "(() => { const a = window.__vnoAppInstance?.adapter;"
      + " return {dirty:a?.isDirty, path:a?._sourcePath || a?.sourceFilePath || '',"
      + " status:document.querySelector('.vno-statusbar-left')?.textContent || ''}; })()",
    );
    if (state.dirty !== true) break;
    await sleep(250);
  } while (Date.now() - started < 30000);
  if (state.dirty === true) throw new Error("Save command left the document dirty: " + JSON.stringify(state));
  const expectedPath = await fs.realpath(savePath);
  const actualPath = state.path ? await fs.realpath(state.path).catch(() => path.resolve(state.path)) : "";
  if (!actualPath || actualPath.toLowerCase() !== expectedPath.toLowerCase()) {
    throw new Error("Ctrl+S did not retain the Save As path: " + JSON.stringify(state));
  }
  return state;
}

async function openSavedDocumentInNewWindow(session, savePath) {
  const before = (await readTargets(session.debugPort)).filter(target => target.type === "page");
  const opened = await session.cdp.evaluate(
    "window.pywebview.api.open_file_in_new_window("
    + JSON.stringify(savePath) + ", " + JSON.stringify(session.app) + ")",
    { timeoutMilliseconds: 60000 },
  );
  if (opened?.status !== "ok") throw new Error("Open in new window failed: " + JSON.stringify(opened));

  const beforeIds = new Set(before.map(target => target.id));
  const expectedPath = await fs.realpath(savePath);
  const started = Date.now();
  while (Date.now() - started < 60000) {
    const pages = (await readTargets(session.debugPort)).filter(target => target.type === "page");
    const expectedUrlPart = encodeURIComponent(expectedPath).toLowerCase();
    const candidates = pages.filter(target => !beforeIds.has(target.id) && /127\.0\.0\.1|localhost/.test(target.url || ""));
    const candidate = candidates.find(target => String(target.url || "").toLowerCase().includes(expectedUrlPart)) || candidates[0];
    if (candidate) {
      const cdp = await connectToPort(session.debugPort, { targetId: candidate.id, timeoutMilliseconds: 10000 });
      try {
        const normalizedExpectedPath = expectedPath.replace(/\\/g, "/").toLowerCase();
        let state;
        const loadedAt = Date.now();
        while (Date.now() - loadedAt < 90000) {
          state = await cdp.evaluate(
            "(() => { const a = window.__vnoAppInstance?.adapter;"
            + " const value = a?._sourcePath || a?.sourceFilePath || '';"
            + " return {sourcePath:String(value), sourceFileName:a?.sourceFileName || '',"
            + " title:document.querySelector('.vno-doc-tab span')?.textContent || document.title || '',"
            + " bodyReady:!!document.querySelector(" + JSON.stringify(bodySelectors[session.app]) + "),"
            + " status:document.querySelector('.vno-statusbar-left')?.textContent?.replace(/\\s+/g,' ').trim() || ''}; })()",
          );
          const actualPath = String(state.sourcePath || "").replace(/\\/g, "/").toLowerCase();
          if (actualPath === normalizedExpectedPath) break;
          await sleep(500);
        }
        const pathLoaded = String(state?.sourcePath || "").replace(/\\/g, "/").toLowerCase() === normalizedExpectedPath;
        if (!pathLoaded) {
          return { pass: false, detail: JSON.stringify({ expectedPath: normalizedExpectedPath, targetUrl: candidate.url, state }) };
        }
        const documentState = await cdp.evaluate(
          "(() => { const a = window.__vnoAppInstance?.adapter;"
          + " const content = " + (session.app === "writer" ? "a?._contentForExport?.()" : session.app === "sheet" ? "a?.serializeToFods?.()" : "a?.serializeToFodp?.()") + " || '';"
          + " return {title:document.querySelector('.vno-doc-tab span')?.textContent || document.title || '',"
          + " contentLength:String(content).length}; })()",
        );
        return {
          pass: documentState.contentLength > 0,
          detail: JSON.stringify({ file: path.basename(savePath), title: documentState.title, contentLength: documentState.contentLength }),
        };
      } finally {
        await cdp.close();
      }
    }
    await sleep(250);
  }
  throw new Error("The opened document did not create a CDP-visible WebView2 page.");
}

async function printToPdfThroughApp(session, pdfPath) {
  const cdp = session.cdp;
  const result = await cdp.evaluate(
    "(async () => {"
    + " const [{globalUnoBridge}, {globalCommandBus}] = await Promise.all(["
    + "  import('/adapters/libreoffice/common/uno-bridge.js'), import('/platform/commands/command-bus.js')]);"
    + " const content = " + JSON.stringify(await serializeCurrentDocument(cdp, session.app)) + ";"
    + " const name = document.querySelector('.vno-doc-tab span')?.textContent || 'DesktopRegression';"
    + " const source = window.__vnoAppInstance?.adapter?._sourcePath || window.__vnoAppInstance?.adapter?.sourceFilePath || null;"
    + " await globalCommandBus.execute('common.file.print');"
    + " const prepared = await globalUnoBridge.preparePrintDocument(" + JSON.stringify(session.app) + ", content, name, source, true);"
    + " if (prepared?.status !== 'ok') return {status:'error', message:prepared?.message || 'Print preparation failed'};"
    + " const printed = await globalUnoBridge.printDocument(prepared.sessionId, {"
    + "  printer:'Microsoft Print to PDF', copies:1, pageRange:'', destinationPath:" + JSON.stringify(pdfPath) + "});"
    + " await globalUnoBridge.cancelPrintDocument(prepared.sessionId);"
    + " return {prepared, printed, previewVisible:!!document.querySelector('.vno-print-preview-overlay')};"
    + "})()",
    { timeoutMilliseconds: 420000 },
  );
  if (result?.printed?.status !== "ok") {
    throw new Error("Print to PDF returned an error: " + JSON.stringify(result));
  }
  const stat = await fs.stat(pdfPath);
  if (stat.size <= 0 || !result?.prepared?.pageCount) {
    throw new Error("Print to PDF output or page count is empty: " + JSON.stringify(result));
  }
  return {
    pass: Boolean(stat.size > 0 && result.prepared.pageCount > 0),
    detail: JSON.stringify({ pages: result.prepared.pageCount, engine: result.prepared.engine, bytes: stat.size, previewVisible: result.previewVisible }),
  };
}

async function exerciseApp(app) {
  let session;
  const prefix = appLabels[app];
  try {
    session = await launchApp(app);
  } catch (error) {
    for (const item of [
      "startup typing", "Enter/Tab", "Ctrl+C/X/V", "type detection", "formula point mode",
      "Writer Tab character insertion", "New/Open/Save/Save As", "Print to PDF",
    ]) {
      const relevant = (app !== "sheet" && ["type detection", "formula point mode"].includes(item))
        || (app !== "writer" && item === "Writer Tab character insertion");
      report(relevant ? "N/A" : "BLOCKED", prefix + " " + item, relevant ? "App-specific behavior." : error?.message || error);
    }
    return;
  }

  try {
    await runCase(prefix + " startup typing", async () => {
      const value = await typeStartupText(session);
      return { pass: String(value).includes("CDP Startup") || String(value) === "2468", detail: String(value) };
    });
    await runCase(prefix + " Enter/Tab", async () => runKeysProbe(session));
    await runCase(prefix + " Ctrl+C/X/V", async () => runClipboardProbe(session));
    await runCase(prefix + " type detection", async () => runTypeProbe(session));
    await runCase(prefix + " formula entry with point mode", async () => runFormulaProbe(session));
    if (app !== "writer") {
      report("N/A", prefix + " Writer Tab character insertion", "This behavior belongs to 3T Doc.");
    } else {
      await runCase(prefix + " Writer Tab character insertion", async () => runTabProbe(session));
    }

    const docsDir = path.join(session.profileRoot, "documents");
    await fs.mkdir(docsDir, { recursive: true });
    const nativePath = path.join(docsDir, "cdp-regression-" + app + "." + extensions[app]);
    const pdfPath = path.join(docsDir, "cdp-regression-" + app + ".pdf");

    await runCase(prefix + " New", async () => {
      const before = (await readTargets(session.debugPort)).filter(target => target.type === "page").length;
      const result = await session.cdp.evaluate(
        "(async () => { const {globalCommandBus} = await import('/platform/commands/command-bus.js');"
        + " return await globalCommandBus.execute('common.file.new'); })()",
        { timeoutMilliseconds: 60000 },
      );
      if (result === false || result?.status === "error") throw new Error("New command failed: " + JSON.stringify(result));
      const started = Date.now();
      let after = before;
      while (Date.now() - started < 30000 && after <= before) {
        after = (await readTargets(session.debugPort)).filter(target => target.type === "page").length;
        if (after <= before) await sleep(250);
      }
      return { pass: after > before, detail: "WebView2 pages " + before + " -> " + after };
    });

    await runCase(prefix + " Save As", async () => {
      await saveAsThroughApp(session, nativePath);
      const stat = await fs.stat(nativePath);
      return { pass: stat.size > 0, detail: path.basename(nativePath) + " " + stat.size + " bytes" };
    });
    await runCase(prefix + " Save", async () => {
      const state = await saveThroughCommand(session, nativePath);
      const stat = await fs.stat(nativePath);
      return { pass: stat.size > 0 && state.dirty === false, detail: JSON.stringify({ dirty: state.dirty, bytes: stat.size }) };
    });
    await runCase(prefix + " Open", async () => await openSavedDocumentInNewWindow(session, nativePath));
    await runCase(prefix + " Print to PDF", async () => await printToPdfThroughApp(session, pdfPath));
  } finally {
    await session.close().catch(error => report("FAIL", prefix + " clean shutdown", error?.stack || error));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const selected = process.argv[2] ? [process.argv[2]] : appKinds;
  for (const app of selected) {
    if (!appKinds.includes(app)) {
      report("FAIL", "Desktop regression argument", "Unknown app: " + app);
      continue;
    }
    try {
      await exerciseApp(app);
    } catch (error) {
      report("FAIL", appLabels[app] + " unexpected regression error", error?.stack || error);
    }
  }
  const widths = {
    status: Math.max(6, ...rows.map(row => row.status.length)),
    label: Math.max(5, ...rows.map(row => row.label.length)),
  };
  console.log("");
  console.log("STATUS".padEnd(widths.status) + " | " + "CHECK".padEnd(widths.label) + " | DETAIL");
  console.log("-".repeat(widths.status) + "-+-" + "-".repeat(widths.label) + "-+-" + "-".repeat(72));
  for (const row of rows) {
    console.log(row.status.padEnd(widths.status) + " | " + row.label.padEnd(widths.label) + " | " + row.detail);
  }
  const passCount = rows.filter(row => row.status === "PASS").length;
  const failCount = rows.filter(row => row.status === "FAIL").length;
  const blockedCount = rows.filter(row => row.status === "BLOCKED").length;
  console.log("");
  console.log("TOTAL: " + passCount + " PASS, " + failCount + " FAIL, " + blockedCount + " BLOCKED, " + (rows.length - passCount - failCount - blockedCount) + " N/A");
  if (failCount || blockedCount) process.exitCode = 1;
}
