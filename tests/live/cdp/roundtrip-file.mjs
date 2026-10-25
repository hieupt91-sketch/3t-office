import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { press, typeText } from "./actions.mjs";
import { launchApp } from "./session.mjs";

const extensions = { writer: "docx", sheet: "xlsx", slides: "pptx" };
const LARGE_FILE_EVALUATE_TIMEOUT_MS = 1500000;

function parseArguments(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) continue;
    parsed[key.slice(2)] = args[index + 1] || "";
    index += 1;
  }
  return parsed;
}

async function waitForSource(session, inputPath) {
  const expected = (await fs.realpath(inputPath)).replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(
    "(() => { const a = window.__vnoAppInstance?.adapter;"
    + " const p = a?._sourcePath || a?.sourceFilePath || '';"
    + " const norm = value => String(value || '').replace(/\\\\/g, '/').toLowerCase();"
    + " const loaded = norm(p) === " + JSON.stringify(expected) + ";"
    + " if (!loaded) return false;"
    + " if (" + JSON.stringify(session.app) + " === 'writer') return !!document.querySelector('.vno-writer-body') && !!a._contentForExport?.();"
    + " if (" + JSON.stringify(session.app) + " === 'sheet') return !!a.grid?.sheets?.length;"
    + " return !!a.canvas?.slides?.length; })()",
    { timeoutMilliseconds: 900000, intervalMilliseconds: 500 },
  );
}

async function editWriterThroughKeyboard(cdp) {
  const prepared = await cdp.evaluate(
    "(() => { const body = document.querySelector('.vno-writer-body'); if (!body) return null;"
    + " const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let node;"
    + " while ((node = walker.nextNode())) { if (node.textContent.trim().length > 12) {"
    + " const range = document.createRange(); range.selectNodeContents(node);"
    + " const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);"
    + " const editable = node.parentElement.closest('[contenteditable]'); editable?.focus();"
    + " return {textLength:node.textContent.length, nodeExists:true}; } } return null; })()",
  );
  if (!prepared) return { pass: false, detail: "No sufficiently long Writer text node was available to edit." };
  await press(cdp, "b", { ctrl: true });
  const collapsed = await cdp.evaluate(
    "(() => { const selection = getSelection(); const node = selection?.anchorNode;"
    + " if (!node || node.nodeType !== Node.TEXT_NODE) return false;"
    + " selection.collapse(node, 0); return true; })()",
  );
  if (!collapsed) return { pass: false, detail: "Could not restore the Writer selection after the bold shortcut." };
  await typeText(cdp, "ZZ");
  const verified = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText?.includes('ZZ') || false");
  return { pass: Boolean(verified), detail: "Bold shortcut and ZZ inserted via CDP." };
}

async function editSlidesThroughCdp(session) {
  const cdp = session.cdp;
  const result = await cdp.evaluate(`(() => {
    const cc = window.__vnoAppInstance?.canvasController;
    if (!cc || !cc.slides?.length) return { pass: false, detail: "No canvas controller or slides available." };
    const slide = cc.slides[0];
    const prevTitle = String(slide.title || "");
    const newTitle = (prevTitle ? prevTitle + " ZZ" : "Slide 1 ZZ").normalize("NFC");

    // 1. Update slide model
    slide.title = newTitle;
    delete slide.titleHtml;

    // 2. If titleEl is present in DOM, update it
    const titleEl = cc.titleEl || document.querySelector('.vno-slide-title');
    if (titleEl) {
      titleEl.innerText = newTitle;
      titleEl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // 3. If shapes contain title shape or shapes with prevTitle, update text and remove stale textHtml
    if (slide.shapes?.length) {
      slide.shapes.forEach(s => {
        const isMatch = s.placeholder === "title"
          || (s.name && /tiêu đề|title/i.test(s.name))
          || s.text === prevTitle
          || (s.text && prevTitle && s.text.includes(prevTitle));
        if (isMatch) {
          s.text = s.text === prevTitle ? newTitle : s.text.replace(prevTitle, newTitle);
          delete s.textHtml;
          delete s.formattedText;
          if (typeof cc.updateShapeText === "function") {
            try { cc.updateShapeText(s.id, s.text); } catch (_) {}
            delete s.textHtml;
          }
        }
      });
    }

    if (typeof cc.options?.onDocumentChange === "function") {
      cc.options.onDocumentChange();
    }
    if (typeof cc._renderThumbnails === "function") {
      cc._renderThumbnails();
    }
    if (window.__vnoAppInstance?.adapter) {
      window.__vnoAppInstance.adapter.isDirty = true;
    }

    return {
      pass: true,
      detail: "Slide 1 title updated to: " + newTitle,
      prevTitle,
      newTitle
    };
  })()`);

  return result;
}

async function serialize(session, largeFile = false) {
  const expression = session.app === "writer"
    ? "window.__vnoAppInstance.adapter._contentForExport()"
    : session.app === "sheet"
      ? "window.__vnoAppInstance.adapter.serializeToFods()"
      : "window.__vnoAppInstance.adapter.serializeToFodp()";
  const length = await session.cdp.evaluate(
    "(() => { window.__vnoAuditContent = " + expression + ";"
    + " if (typeof window.__vnoAuditContent !== 'string' || !window.__vnoAuditContent.trim()) throw new Error('Loaded document content was empty.');"
    + " return window.__vnoAuditContent.length; })()",
    largeFile ? { timeoutMilliseconds: LARGE_FILE_EVALUATE_TIMEOUT_MS } : {},
  );
  return length;
}

async function writeSentContent(session, sentPath, length, largeFile = false) {
  const file = await fs.open(sentPath, "w");
  let bytes = 0;
  try {
    // Keep CDP messages bounded and retain the original string in the page for
    // the app's save bridge, rather than embedding it in another huge request.
    let offset = 0;
    while (offset < length) {
      const chunk = await session.cdp.evaluate(
        "(() => { const content = window.__vnoAuditContent; let end = Math.min(content.length, " + (offset + 262144) + ");"
        + " const code = content.charCodeAt(end - 1); if (end < content.length && code >= 0xd800 && code <= 0xdbff) end--;"
        + " return content.slice(" + offset + ", end); })()",
        largeFile ? { timeoutMilliseconds: 120000 } : {},
      );
      await file.write(chunk, null, "utf8");
      bytes += Buffer.byteLength(chunk, "utf8");
      offset += chunk.length;
    }
  } finally {
    await file.close();
  }
  return bytes;
}

export async function roundtripFile({ app, input, output, edit = false, largeFile = false }) {
  if (!extensions[app]) throw new Error("Expected app to be writer, sheet, or slides.");
  const inputPath = path.resolve(input);
  const outputPath = path.resolve(output);
  await fs.rm(outputPath + ".save-timings.json", { force: true }).catch(() => {});
  const session = await launchApp(app, { filePath: inputPath });
  const timings = {};
  let phase = "load";
  let phaseStarted = 0;
  try {
    phaseStarted = performance.now();
    await waitForSource(session, inputPath);
    timings.loadMs = Math.round(performance.now() - phaseStarted);
    const sheetStateAfterLoad = app === "sheet"
      ? await session.cdp.evaluate("(() => ({activeSheet: window.__vnoAppInstance?.adapter?.grid?.activeSheet || null, sheetCount: window.__vnoAppInstance?.adapter?.grid?.sheets?.length || 0}))()")
      : null;
    // An untouched XLSX is saved by restoring the source package (by design), which makes a no-edit
    // round trip an identity copy. VNO_AUDIT_MARK_DIRTY=1 forces the real conversion path every user
    // edit takes, so fidelity audits measure what a saved edit really does.
    if (process.env.VNO_AUDIT_MARK_DIRTY === "1" && (app === "sheet" || app === "slides")) {
      await session.cdp.evaluate("(() => { if (window.__vnoAppInstance?.adapter) window.__vnoAppInstance.adapter.isDirty = true; return true; })()");
    }
    phase = "serialize";
    phaseStarted = performance.now();
    const before = await serialize(session, largeFile);
    timings.serializeMs = Math.round(performance.now() - phaseStarted);
    const sheetStateBeforeSave = app === "sheet"
      ? await session.cdp.evaluate("(() => ({activeSheet: window.__vnoAppInstance?.adapter?.grid?.activeSheet || null, sheetCount: window.__vnoAppInstance?.adapter?.grid?.sheets?.length || 0}))()")
      : null;
    const sentPath = outputPath + (app === "sheet" ? ".sent.fods" : app === "writer" ? ".sent.html" : ".sent.fodp");
    phase = "sentContentWrite";
    phaseStarted = performance.now();
    const beforeBytes = edit ? await writeSentContent(session, sentPath, before, largeFile) : null;
    const editResult = app === "writer" && edit
      ? await editWriterThroughKeyboard(session.cdp)
      : app === "slides" && edit
        ? await editSlidesThroughCdp(session)
        : { pass: true, detail: "No edit requested." };
    const length = edit ? await serialize(session, largeFile) : before;
    const contentBytes = await writeSentContent(session, sentPath, length, largeFile);
    timings.sentContentWriteMs = Math.round(performance.now() - phaseStarted);
    if (edit) timings.editSerializeAndWriteMs = timings.sentContentWriteMs;
    phase = "savePipeline";
    phaseStarted = performance.now();
    const saved = await session.cdp.evaluate(
      "globalThis.globalUnoBridge.saveRealFileInPlace("
      + JSON.stringify(app) + ", window.__vnoAuditContent, "
      + JSON.stringify(outputPath) + ", " + JSON.stringify(inputPath) + ")",
      { timeoutMilliseconds: largeFile ? LARGE_FILE_EVALUATE_TIMEOUT_MS : 1200000 },
    );
    timings.saveMs = Math.round(performance.now() - phaseStarted);
    if (saved?.status !== "ok") throw new Error("App save service failed: " + JSON.stringify(saved));
    if (saved?.timings && typeof saved.timings === "object") timings.savePipeline = saved.timings;
    const stat = await fs.stat(outputPath);
    if (stat.size <= 0) throw new Error("App save service produced an empty output file.");
    const result = {
      app,
      input: path.basename(inputPath),
      output: path.basename(outputPath),
      loaded: true,
      saved: true,
      cdpPort: session.debugPort,
      profilePath: session.localAppData,
      timings,
      sheetStateAfterLoad,
      sheetStateBeforeSave,
      edit: editResult,
      inputContentBytes: beforeBytes ?? contentBytes,
      outputBytes: stat.size,
      sourcePath: inputPath,
    };
    await fs.writeFile(outputPath + ".cdp-audit.json", JSON.stringify(result, null, 2), "utf8");
    return result;
  } catch (error) {
    if (phase === "savePipeline" && timings.saveMs === undefined) {
      timings.saveMs = Math.round(performance.now() - phaseStarted);
    }
    const sentPath = outputPath + (app === "sheet" ? ".sent.fods" : app === "writer" ? ".sent.html" : ".sent.fodp");
    let sentBytes = null;
    try { sentBytes = (await fs.stat(sentPath)).size; } catch {}
    const failed = {
      app,
      input: path.basename(inputPath),
      output: path.basename(outputPath),
      status: "FAIL",
      phase,
      error: String(error?.stack || error),
      cdpPort: session.debugPort,
      profilePath: session.localAppData,
      timings,
      sentContentBytes: sentBytes,
      sourcePath: inputPath,
    };
    try {
      const pipeline = JSON.parse(await fs.readFile(outputPath + ".save-timings.json", "utf8"));
      failed.timings.savePipeline = pipeline.timings;
      failed.savePipelineStatus = pipeline.status;
    } catch {}
    await fs.writeFile(outputPath + ".cdp-audit.json", JSON.stringify(failed, null, 2), "utf8").catch(() => {});
    throw error;
  } finally {
    await session.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = parseArguments(process.argv.slice(2));
  if (!args.app || !args.input || !args.output) {
    console.error("Usage: node --experimental-websocket tests/live/cdp/roundtrip-file.mjs --app <app> --input <file> --output <file> [--edit true] [--large-file true]");
    process.exitCode = 2;
  } else {
    try {
      const result = await roundtripFile({
        app: args.app,
        input: args.input,
        output: args.output,
        edit: args.edit === "true",
        largeFile: args["large-file"] === "true",
      });
      console.log("RESULT " + JSON.stringify(result));
    } catch (error) {
      console.error("FAIL " + (error?.stack || error));
      process.exitCode = 1;
    }
  }
}
