import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { launchApp } from "../tests/live/cdp/session.mjs";

const FILES = [
  { app: "sheet", name: "lan03.xlsx", path: "E:\\VN OFice\\file test\\lan\\lan03.xlsx" },
  { app: "sheet", name: "lan26.xlsx", path: "E:\\VN OFice\\file test\\lan\\lan26.xlsx" },
  { app: "slides", name: "sample-3.pptx", path: "E:\\VN OFice\\file test\\sample-3.pptx" },
];

async function measureFile(fileObj, runIndex, verify = false) {
  const profileDir = path.resolve(`E:/VNOffice-profiles/agy-print-${fileObj.name.replace(/[^a-zA-Z0-9]/g, "_")}-run${runIndex}`);
  console.log(`\n==================================================`);
  console.log(`Starting Run ${runIndex} for ${fileObj.app} file: ${fileObj.name}`);
  console.log(`Profile: ${profileDir}`);
  console.log(`Verify: ${verify}`);
  
  process.env.VNO_PERF_DEBUG = "1";
  if (verify) {
    process.env.VNO_PRINT_VERIFY = "1";
  } else {
    delete process.env.VNO_PRINT_VERIFY;
  }

  let stdoutLogs = [];
  const session = await launchApp(fileObj.app, {
    filePath: fileObj.path,
    localAppData: profileDir,
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 120000,
  });

  if (session.child && session.child.stdout) {
    session.child.stdout.on("data", (data) => {
      const text = data.toString();
      stdoutLogs.push(text);
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.includes("[VNO Open Perf]") || line.includes("[VNO Print Verify]")) {
          console.log(`  [APP STDOUT] ${line.trim()}`);
        }
      }
    });
  }

  try {
    console.log(`Waiting for document to finish opening...`);
    const tOpenStart = performance.now();
    if (fileObj.app === "sheet") {
      await session.cdp.waitFor(
        "(() => { const a = window.__vnoAppInstance?.adapter; return !!(a && a.grid && a.grid.sheets && a.grid.sheets.length > 0); })()",
        { timeoutMilliseconds: 300000, intervalMilliseconds: 500 }
      );
    } else if (fileObj.app === "slides") {
      await session.cdp.waitFor(
        "(() => { const a = window.__vnoAppInstance?.adapter; return !!(a && a.canvas && a.canvas.slides && a.canvas.slides.length > 0); })()",
        { timeoutMilliseconds: 300000, intervalMilliseconds: 500 }
      );
    }
    const openElapsed = ((performance.now() - tOpenStart) / 1000).toFixed(2);
    console.log(`Document opened in ${openElapsed}s. Settle 3s...`);
    await new Promise((r) => setTimeout(r, 3000));

    console.log(`Executing common.file.print command...`);
    const t0 = performance.now();
    await session.cdp.evaluate(`
      (() => {
        if (window.globalCommandBus) {
          window.globalCommandBus.execute("common.file.print");
        } else {
          import("/platform/commands/command-bus.js").then(m => m.globalCommandBus.execute("common.file.print"));
        }
      })()
    `);

    console.log(`Waiting for print preview image in DOM (.vno-print-preview-stage img)...`);
    await session.cdp.waitFor(
      "(() => {"
      + "  const img = document.querySelector('.vno-print-preview-stage img.vno-print-preview-image, .vno-print-preview-stage img');"
      + "  return !!(img && img.src && img.complete && img.naturalWidth > 0);"
      + "})()",
      { timeoutMilliseconds: 300000, intervalMilliseconds: 100 }
    );
    const t1 = performance.now();
    const totalMs = t1 - t0;
    console.log(`Print preview image appeared! Total time: ${(totalMs / 1000).toFixed(3)} s (${totalMs.toFixed(1)} ms)`);

    const fullLog = stdoutLogs.join("\n");
    const writeSourceMatch = fullLog.match(/\[VNO Open Perf\] print_write_source:?\s*([0-9.]+)ms/);
    const convertPdfMatch = fullLog.match(/\[VNO Open Perf\] print_convert_pdf:?\s*([0-9.]+)ms/);
    const inspectPdfMatch = fullLog.match(/\[VNO Open Perf\] print_inspect_pdf:?\s*([0-9.]+)ms/);
    const renderPageMatch = fullLog.match(/\[VNO Open Perf\] uno_render_pdf_page:?\s*([0-9.]+)\s*ms/);
    const printVerifyMatch = fullLog.match(/\[VNO Print Verify\] ([^\n]+)/);

    const writeSourceMs = writeSourceMatch ? parseFloat(writeSourceMatch[1]) : null;
    const convertPdfMs = convertPdfMatch ? parseFloat(convertPdfMatch[1]) : null;
    const inspectPdfMs = inspectPdfMatch ? parseFloat(inspectPdfMatch[1]) : null;
    const renderPageMs = renderPageMatch ? parseFloat(renderPageMatch[1]) : null;
    const printVerifyText = printVerifyMatch ? printVerifyMatch[1].trim() : null;

    const result = {
      file: fileObj.name,
      app: fileObj.app,
      runIndex,
      totalMs,
      writeSourceMs,
      convertPdfMs,
      inspectPdfMs,
      renderPageMs,
      printVerifyText,
      fullLog,
    };
    console.log(`Run ${runIndex} Breakdown:`, {
      totalMs: totalMs.toFixed(1),
      writeSourceMs,
      convertPdfMs,
      inspectPdfMs,
      renderPageMs,
      printVerifyText,
    });
    return result;
  } finally {
    console.log(`Closing session...`);
    await session.close();
  }
}

async function main() {
  const targetFileIndex = process.argv[2] !== undefined && process.argv[2] !== "" && !process.argv[2].startsWith("-") ? parseInt(process.argv[2], 10) : null;
  const targetRun = process.argv[3] !== undefined && process.argv[3] !== "" && !process.argv[3].startsWith("-") ? parseInt(process.argv[3], 10) : null;
  const setVerify = process.argv.includes("--verify");

  const results = [];
  const filesToProcess = targetFileIndex !== null ? [FILES[targetFileIndex]] : FILES;

  for (const fileObj of filesToProcess) {
    const runs = targetRun !== null ? [targetRun] : [1, 2];
    for (const runIdx of runs) {
      const isVerify = setVerify || (runIdx === 1);
      const res = await measureFile(fileObj, runIdx, isVerify);
      results.push(res);
    }
  }

  console.log("\n=================== FINAL SUMMARY ===================");
  console.log(JSON.stringify(results.map(r => ({ ...r, fullLog: undefined })), null, 2));

  const jsonPath = path.resolve("docs/perf-measure/print-sheet-slide-agy.raw.json");
  await fs.mkdir(path.dirname(jsonPath), { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), "utf8");
  console.log(`Saved raw JSON to ${jsonPath}`);
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
