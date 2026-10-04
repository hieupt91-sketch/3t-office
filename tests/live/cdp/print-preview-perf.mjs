import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchApp } from "./session.mjs";

function parseArguments(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    if (!args[index].startsWith("--")) continue;
    parsed[args[index].slice(2)] = args[index + 1] || "";
    index += 1;
  }
  return parsed;
}

async function waitUntilLoaded(session, inputPath) {
  const expected = (await fs.realpath(inputPath)).replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(
    "(() => { const a = window.__vnoAppInstance?.adapter;"
      + " const source = a?._sourcePath || a?.sourceFilePath || '';"
      + " const norm = value => String(value || '').replace(/\\\\/g, '/').toLowerCase();"
      + " if (norm(source) !== " + JSON.stringify(expected) + ") return false;"
      + " return " + (session.app === "sheet" ? "!!a.grid?.sheets?.length" : "!!a.canvas?.slides?.length") + "; })()",
    { timeoutMilliseconds: 900000, intervalMilliseconds: 500 },
  );
}

function stageMilliseconds(output, stage) {
  const lines = String(output || "").split(/\r?\n/).filter(line => line.includes(stage));
  const line = lines.at(-1) || "";
  const match = line.match(new RegExp(stage + "(?::)?(?:\\s+([0-9.]+)\\s*ms|.*?\\bms=([0-9.]+))"));
  return match ? Number(match[1] || match[2]) : null;
}

export async function measurePrintPreview({ app, input, localAppData, sheetScope = "active" }) {
  if (!["sheet", "slides"].includes(app)) throw new Error("Expected --app sheet or slides.");
  const sourcePath = path.resolve(input);
  const session = await launchApp(app, { filePath: sourcePath, localAppData: path.resolve(localAppData) });
  try {
    await waitUntilLoaded(session, sourcePath);
    await session.cdp.evaluate("localStorage.setItem('vno.print.useInstalledOffice', '0')");
    const started = Date.now();
    await session.cdp.evaluate(
      "(async () => { const {globalCommandBus} = await import('/platform/commands/command-bus.js');"
        + " globalThis.__vnoPrintPerfPromise = globalCommandBus.execute('common.file.print'); return true; })()",
    );
    if (app === "sheet" && sheetScope !== "active") {
      await session.cdp.waitFor(
        "!!document.querySelector('.vno-print-preview-stage img, .vno-print-preview-stage canvas')",
        { timeoutMilliseconds: 420000, intervalMilliseconds: 100 },
      );
      await session.cdp.evaluate(
        "(() => { const radio = document.querySelector('input[name=\"sheetScope\"][value="
          + JSON.stringify(sheetScope) + "]'); if (!radio) throw new Error('Missing sheet scope');"
          + " radio.click(); return true; })()",
      );
    }
    await session.cdp.waitFor(
      "!!document.querySelector('.vno-print-preview-stage img, .vno-print-preview-stage canvas')"
        + (app === "sheet" ? " && document.querySelector('input[name=\"sheetScope\"]:checked')?.value === " + JSON.stringify(sheetScope) : ""),
      { timeoutMilliseconds: 420000, intervalMilliseconds: 100 },
    );
    const totalMs = Date.now() - started;
    await new Promise(resolve => setTimeout(resolve, 150));
    const output = session.output;
    return {
      app,
      file: path.basename(sourcePath),
      sheetScope: app === "sheet" ? sheetScope : null,
      totalMs,
      print_write_interchange: stageMilliseconds(output, "print_write_interchange"),
      print_convert_native: stageMilliseconds(output, "print_convert_native"),
      print_convert_pdf: stageMilliseconds(output, "print_convert_pdf"),
      print_inspect_pdf: stageMilliseconds(output, "print_inspect_pdf"),
      uno_render_pdf_page: stageMilliseconds(output, "uno_render_pdf_page"),
      perfLines: output.split(/\r?\n/).filter(line => /print_|uno_render_pdf_page|uno_load_and_store|worker_start|VNO Print Verify/.test(line)),
    };
  } finally {
    await session.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = parseArguments(process.argv.slice(2));
  try {
    const result = await measurePrintPreview({
      app: args.app,
      input: args.input,
      localAppData: args.profile,
      sheetScope: args.scope || "active",
    });
    console.log("RESULT " + JSON.stringify(result));
  } catch (error) {
    console.error("FAIL " + (error?.stack || error));
    process.exitCode = 1;
  }
}
