import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchApp } from "./session.mjs";

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

function countPdfPages(bytes) {
  const latin1 = bytes.toString("latin1");
  return (latin1.match(/\/Type\s*\/Page\b/g) || []).length;
}

async function loadedState(session, inputPath) {
  const expected = (await fs.realpath(inputPath)).replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(
    "(() => { const a = window.__vnoAppInstance?.adapter;"
    + " const source = a?._sourcePath || a?.sourceFilePath || '';"
    + " const norm = value => String(value || '').replace(/\\\\/g, '/').toLowerCase();"
    + " if (norm(source) !== " + JSON.stringify(expected) + ") return false;"
    + " if (" + JSON.stringify(session.app) + " === 'writer') return !!a._contentForExport?.();"
    + " if (" + JSON.stringify(session.app) + " === 'sheet') return !!a.grid?.sheets?.length;"
    + " return !!a.canvas?.slides?.length; })()",
    { timeoutMilliseconds: 900000, intervalMilliseconds: 500 },
  );
}

export async function printPageCount({ app, input, output, useOffice = true }) {
  if (!["writer", "sheet", "slides"].includes(app)) throw new Error("Unknown app kind: " + app);
  const sourcePath = path.resolve(input);
  const pdfPath = path.resolve(output);
  await fs.mkdir(path.dirname(pdfPath), { recursive: true });
  const session = await launchApp(app, { filePath: sourcePath });
  try {
    await loadedState(session, sourcePath);
    const state = await session.cdp.evaluate(
      "(() => { const app = window.__vnoAppInstance; const a = app.adapter;"
      + " const content = " + (app === "writer" ? "a._contentForExport()" : app === "sheet" ? "a.serializeToFods()" : "a.serializeToFodp()") + ";"
      + " return {content, sourcePath:a._sourcePath || a.sourceFilePath || '',"
      + " documentName:a.sourceFileName || app.shell?.documentName || " + JSON.stringify(path.basename(sourcePath)) + ","
      + " canvasPages:" + (app === "writer" ? "Number(a._livePageCount) || 1" : "null") + ","
      + " status:document.querySelector('.vno-statusbar-left')?.textContent?.replace(/\\s+/g,' ').trim() || ''}; })()",
    );
    if (!state?.content) throw new Error("Loaded document serialized to empty content.");
    const useOfficeEnv = process.env.VN_PRINT_USE_OFFICE;
    const useOfficeValue = useOfficeEnv === undefined ? Boolean(useOffice) : useOfficeEnv.trim() !== "0";
    const result = await session.cdp.evaluate(
      "(async () => {"
      + " const prepared = await window.pywebview.api.prepare_print_document("
      + JSON.stringify(app) + ", " + JSON.stringify(state.content) + ", "
      + JSON.stringify(state.documentName) + ", " + JSON.stringify(state.sourcePath) + ", "
      + JSON.stringify(useOfficeValue) + ");"
      + " if (prepared?.status !== 'ok') return {prepared};"
      + " const printed = await window.pywebview.api.print_document(prepared.sessionId, {"
      + " printer:'Microsoft Print to PDF', copies:1, pageRange:'', destinationPath:"
      + JSON.stringify(pdfPath) + "});"
      + " await window.pywebview.api.cancel_print_document(prepared.sessionId);"
      + " return {prepared, printed}; })()",
      { timeoutMilliseconds: 420000 },
    );
    if (result?.prepared?.status !== "ok" || result?.printed?.status !== "ok") {
      throw new Error("Print pipeline failed: " + JSON.stringify(result));
    }
    const bytes = await fs.readFile(pdfPath);
    const pdfPages = countPdfPages(bytes);
    if (bytes.length <= 0 || pdfPages < 1) throw new Error("The Print to PDF output is empty or has no page objects.");
    const summary = {
      app,
      file: path.basename(sourcePath),
      canvas_pages: state.canvasPages,
      print_pages: Number(result.prepared.pageCount),
      export_pages: pdfPages,
      app_print_engine: result.prepared.engine || "LibreOffice",
      office_requested: useOfficeValue,
      pdf_bytes: bytes.length,
      status_text: state.status,
    };
    await fs.writeFile(pdfPath + ".print-pages.json", JSON.stringify(summary, null, 2), "utf8");
    return summary;
  } finally {
    await session.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = parseArguments(process.argv.slice(2));
  if (!args.app || !args.input || !args.output) {
    console.error("Usage: node --experimental-websocket tests/live/cdp/print-page-count.mjs --app <app> --input <file> --output <pdf>");
    process.exitCode = 2;
  } else {
    try {
      console.log("RESULT " + JSON.stringify(await printPageCount({ app: args.app, input: args.input, output: args.output })));
    } catch (error) {
      console.error("FAIL " + (error?.stack || error));
      process.exitCode = 1;
    }
  }
}
