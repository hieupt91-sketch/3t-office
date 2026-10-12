import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = path.resolve(process.argv[2] || path.join(repoRoot, "_batch_document_audit"));
const names = process.argv.slice(3);
const selected = names.length ? names : Array.from({ length: 28 }, (_, i) => `lan${String(i + 1).padStart(2, "0")}`);
const results = [];

for (const name of selected) {
  const leaf = name.toLowerCase().endsWith(".xlsx") ? name : `${name}.xlsx`;
  const filePath = path.join(outputDir, leaf.replace(/\.xlsx$/i, ".roundtrip.xlsx"));
  const expectedPath = (await fs.realpath(filePath)).replace(/\\/g, "/").toLowerCase();
  const started = Date.now();
  const session = await launchApp("sheet", {
    filePath,
    startTimeoutMilliseconds: 300000,
    readyTimeoutMilliseconds: 300000,
  });
  try {
    await session.cdp.waitFor(
      "(() => { const a=window.__vnoAppInstance?.adapter;"
      + " const p=String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase();"
      + " const grid=a?.grid; return p===" + JSON.stringify(expectedPath)
      + " && !!grid?.sheets?.length && !document.querySelector('.vno-sheet-quick-view'); })()",
      { timeoutMilliseconds: 900000, intervalMilliseconds: 500 },
    );
    const state = await session.cdp.evaluate(
      "(() => { const a=window.__vnoAppInstance?.adapter, g=a?.grid;"
      + " return {sourcePath:a?._sourcePath||a?.sourceFilePath||null,"
      + "sheets:g?.sheets?.length||0,cells:g?.cellsData?.size||0,"
      + "quickView:!!document.querySelector('.vno-sheet-quick-view')}; })()",
    );
    results.push({ file: leaf, status: "PASS", elapsedMs: Date.now() - started, ...state });
  } catch (error) {
    results.push({ file: leaf, status: "FAIL", elapsedMs: Date.now() - started, error: String(error?.stack || error).slice(-2400) });
  } finally {
    await session.close();
  }
  console.log(JSON.stringify(results.at(-1)));
}

const reportPath = path.join(outputDir, "reopen_roundtrip_results.json");
await fs.writeFile(reportPath, JSON.stringify({ results }, null, 2), "utf8");
if (results.some(result => result.status !== "PASS")) process.exitCode = 1;
console.log(`REPORT ${reportPath}`);
