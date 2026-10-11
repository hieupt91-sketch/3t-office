import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, typeText } from "./actions.mjs";

const outputDir = process.env.VNO_MAC_SMOKE_DIR
  || await fs.mkdtemp(path.join(os.tmpdir(), "vno-mac-printer-smoke-"));
await fs.mkdir(outputDir, { recursive: true });
const pdfPath = path.join(outputDir, "writer-save-as-pdf.pdf");
const screenshotPath = path.join(outputDir, "writer-save-as-pdf.png");
const session = await launchApp("writer");
try {
  const cdp = session.cdp;
  if (await cdp.evaluate("!!document.querySelector('.vno-recovery-overlay')")) {
    await click(cdp, ".vno-recovery-later");
  }
  await click(cdp, ".vno-writer-body p");
  await typeText(cdp, "Mac CUPS Save as PDF smoke test");
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(screenshotPath, Buffer.from(screenshot.result.data, "base64"));
  const result = await cdp.evaluate(
    "(async () => {"
    + " const {globalUnoBridge} = await import('/adapters/libreoffice/common/uno-bridge.js');"
    + " const printers = await globalUnoBridge.getInstalledPrinters();"
    + " const content = window.__vnoAppInstance?.adapter?._contentForExport?.() || '';"
    + " const prepared = await globalUnoBridge.preparePrintDocument('writer', content, 'CUPS Smoke', null, true);"
    + " if (prepared?.status !== 'ok') return {printers, prepared};"
    + " try { const printed = await globalUnoBridge.printDocument(prepared.sessionId, {"
    + "  printer:'Save as PDF', copies:1, pageRange:'', destinationPath:" + JSON.stringify(pdfPath) + "});"
    + " return {printers, prepared, printed}; }"
    + " finally { await globalUnoBridge.cancelPrintDocument(prepared.sessionId); }"
    + "})()",
    { timeoutMilliseconds: 420000 },
  );
  if (result?.printers?.status !== "ok") throw new Error("Printer list failed: " + JSON.stringify(result));
  const pdfInfo = result.printers.printers?.find(item => item.name === "Save as PDF");
  if (!pdfInfo || !pdfInfo.isDefault) throw new Error("Save as PDF is not available/default: " + JSON.stringify(result.printers));
  if (result?.printed?.status !== "ok") throw new Error("Save as PDF failed: " + JSON.stringify(result));
  const bytes = await fs.readFile(pdfPath);
  if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("Output does not have a PDF signature.");
  console.log(JSON.stringify({
    pass: true,
    printer: pdfInfo,
    pageCount: result.prepared.pageCount,
    bytes: bytes.length,
    pdfPath,
    screenshotPath,
  }, null, 2));
} finally {
  await session.close().catch(() => {});
}
