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

async function writeSentContent(session, sentPath, length) {
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
  const session = await launchApp(app, { filePath: inputPath });
  try {
    await waitForSource(session, inputPath);
    // An untouched XLSX is saved by restoring the source package (by design), which makes a no-edit
    // round trip an identity copy. VNO_AUDIT_MARK_DIRTY=1 forces the real conversion path every user
    // edit takes, so fidelity audits measure what a saved edit really does.
    if (process.env.VNO_AUDIT_MARK_DIRTY === "1" && app === "sheet") {
      await session.cdp.evaluate("(() => { window.__vnoAppInstance.adapter.isDirty = true; return true; })()");
    }
    const before = await serialize(session, largeFile);
    const sentPath = outputPath + (app === "sheet" ? ".sent.fods" : app === "writer" ? ".sent.html" : ".sent.fodp");
    const beforeBytes = edit ? await writeSentContent(session, sentPath, before) : null;
    const editResult = app === "writer" && edit
      ? await editWriterThroughKeyboard(session.cdp)
      : { pass: true, detail: "No edit requested." };
    const length = edit ? await serialize(session, largeFile) : before;
    const contentBytes = await writeSentContent(session, sentPath, length);
    const saved = await session.cdp.evaluate(
      "globalThis.globalUnoBridge.saveRealFileInPlace("
      + JSON.stringify(app) + ", window.__vnoAuditContent, "
      + JSON.stringify(outputPath) + ", " + JSON.stringify(inputPath) + ")",
      { timeoutMilliseconds: largeFile ? LARGE_FILE_EVALUATE_TIMEOUT_MS : 1200000 },
    );
    if (saved?.status !== "ok") throw new Error("App save service failed: " + JSON.stringify(saved));
    const stat = await fs.stat(outputPath);
    if (stat.size <= 0) throw new Error("App save service produced an empty output file.");
    const result = {
      app,
      input: path.basename(inputPath),
      output: path.basename(outputPath),
      loaded: true,
      saved: true,
      edit: editResult,
      inputContentBytes: beforeBytes ?? contentBytes,
      outputBytes: stat.size,
      sourcePath: inputPath,
    };
    await fs.writeFile(outputPath + ".cdp-audit.json", JSON.stringify(result, null, 2), "utf8");
    return result;
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
