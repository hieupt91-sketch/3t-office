// FIX-D6-2510 — opening a .xlsx / .docx written with Calibri (body) and Calibri Light (heading) must render
// those runs with the real Calibri when installed, otherwise with the bundled metric-compatible Carlito — never
// with the browser's default serif (macOS has no Calibri; before the fix the WebView fell back to Times).
// The check reads the font the engine actually USED for the text (CSS.getPlatformFontsForNode), not just the
// declared font-family. Optional: VNO_D6_SHOT_DIR=<dir> saves one screenshot per app.
// Provenance: the macOS QtWebEngine disk cache lives outside $HOME and is shared by every checkout, and the
// embedded server always starts on the same port, so a page could be built from ANOTHER checkout's cached
// CSS/JS. Each run therefore proves that the files that matter came over the network this run (resource timing
// transferSize > 0) and that the server returns byte-for-byte the files of the app root under test
// (VNO_APP_ROOT or this repo); if anything was served from cache, the cache is cleared and the app relaunched.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./actions.mjs";

const OK_FAMILIES = new Set(["carlito", "calibri", "calibri light"]);
const fixtureDir = await mkdtemp(path.join(os.tmpdir(), "vno-d6-"));
execFileSync(process.env.VNO_PYTHON || "python3", ["-I", path.join(repoRoot, "tests/live/cdp/fixtures/make_d6_calibri.py"), fixtureDir]);
const shotDir = process.env.VNO_D6_SHOT_DIR || "";
const shotTag = process.env.VNO_D6_SHOT_TAG || "run";
if (shotDir) await mkdir(shotDir, { recursive: true });

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

async function usedFonts(cdp, selector) {
  const doc = await cdp.send("DOM.getDocument", { depth: 0 });
  const found = await cdp.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector });
  const nodeId = found.result?.nodeId;
  if (!nodeId) return null;
  const fonts = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
  const computed = await cdp.evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).fontFamily`);
  return { computed, fonts: (fonts.result?.fonts || []).map(f => ({ family: f.familyName, glyphs: f.glyphCount })) };
}

function verdict(result) {
  if (!result || !result.fonts.length) return { pass: false, main: "(none)" };
  const main = [...result.fonts].sort((a, b) => b.glyphs - a.glyphs)[0];
  return { pass: OK_FAMILIES.has(String(main.family).toLowerCase()), main: main.family };
}

const appRoot = process.env.VNO_APP_ROOT || repoRoot;
const PROVENANCE_FILES = {
  common: ["platform/theme/fonts/fonts.css", "platform/fonts/document/document-fonts.css",
    "platform/fonts/substitutes/substitute-fonts.css", "platform/fonts/font-stack.js"],
  sheet: ["apps/sheet/sheet-grid.js", "apps/sheet/sheet-quick-view.js", "adapters/libreoffice/sheet/sheet-adapter.js"],
  writer: ["adapters/libreoffice/writer/writer-adapter.js"],
};

async function provenance(cdp, app) {
  // Only files that exist in the root under test (the baseline has no font-stack.js / substitutes).
  const files = [...PROVENANCE_FILES.common, ...PROVENANCE_FILES[app]].filter(f => existsSync(path.join(appRoot, f)));
  const served = JSON.parse(await cdp.evaluate(`(async () => {
    const files = ${JSON.stringify(files)};
    const timing = performance.getEntriesByType("resource");
    const out = [];
    for (const file of files) {
      const entry = timing.find(e => new URL(e.name).pathname === "/" + file);
      let text = null;
      try { text = await (await fetch("/" + file, { cache: "no-store" })).text(); } catch {}
      out.push({ file, loaded: !!entry, transfer: entry ? entry.transferSize : -1, text });
    }
    return JSON.stringify(out);
  })()`));
  const sha = value => createHash("sha256").update(value).digest("hex");
  return served.map(item => ({
    file: item.file, loaded: item.loaded, network: item.transfer > 0,
    sameAsRoot: item.text !== null && sha(Buffer.from(item.text, "utf8")) === sha(readFileSync(path.join(appRoot, item.file))),
  }));
}

async function runApp(app, file, ready, targets, attempt = 1) {
  const session = await launchApp(app, { filePath: path.join(fixtureDir, file), readyTimeoutMilliseconds: 90000 });
  try {
    const { cdp } = session;
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await cdp.waitFor(ready, { timeoutMilliseconds: 90000 });
    const files = await provenance(cdp, app);
    const stale = files.filter(f => f.loaded && !f.network);
    if (stale.length && attempt === 1) {
      console.log(`INFO | ${app}: served from the shared disk cache (${stale.map(f => f.file).join(", ")}) — clearing cache, relaunching`);
      await cdp.send("Network.enable");
      await cdp.send("Network.clearBrowserCache");
      await session.close().catch(() => {});
      return runApp(app, file, ready, targets, 2);
    }
    const loaded = files.filter(f => f.loaded);
    check(`${app}: CSS/JS tải từ máy chủ của bản đang kiểm (${appRoot === repoRoot ? "repo" : appRoot}), không từ bộ đệm`,
      loaded.length >= 2 && loaded.every(f => f.network && f.sameAsRoot),
      JSON.stringify(files.map(f => `${f.file}:${f.loaded ? (f.network ? "net" : "CACHE") : "not-loaded"}:${f.sameAsRoot ? "same" : "DIFF"}`)));
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    await cdp.evaluate("document.fonts.ready.then(() => true)");
    await sleep(1500);
    for (const [label, selector] of targets) {
      // Web fonts swap in asynchronously (font-display: swap) and the grid may re-render after the quick view:
      // poll the used font for up to 20 s. Without a substitute it never becomes Calibri/Carlito, so this
      // still fails before the fix.
      let result = null;
      let outcome = { pass: false, main: "(none)" };
      for (const started = Date.now(); Date.now() - started < 20000; await sleep(500)) {
        result = await usedFonts(cdp, selector).catch(() => null);
        outcome = verdict(result);
        if (outcome.pass) break;
      }
      const { pass, main } = outcome;
      check(`${app}: ${label} vẽ bằng Calibri/Carlito`, pass, `used=${main} all=${JSON.stringify(result?.fonts)} computed=${result?.computed}`);
    }
    if (shotDir) {
      const shot = await cdp.send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: 1280, height: 800, scale: 0.6 } });
      await writeFile(path.join(shotDir, `${app}-${shotTag}.png`), Buffer.from(shot.result?.data || "", "base64"));
    }
  } finally {
    await session.close().catch(() => {});
  }
}

try {
  await runApp("sheet", "d6-calibri.xlsx",
    "!document.querySelector('.vno-sheet-quick-view') && /Thiên Long/.test(document.querySelector('[data-coord=\"A3\"]')?.textContent || '')",
    [["ô A3 (Calibri)", '[data-coord="A3"]'], ["ô A1 (Calibri Light)", '[data-coord="A1"]']]);
  await runApp("writer", "d6-calibri.docx",
    "/Calibri Light/.test(document.querySelector('.vno-writer-body')?.textContent || '')",
    [["Tiêu đề 1 (Calibri Light)", ".vno-writer-body h1"], ["đoạn thân (Calibri)", ".vno-writer-body p"]]);
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await rm(fixtureDir, { recursive: true, force: true }).catch(() => {});
}
console.log(`SUMMARY ${checks.filter(Boolean).length}/${checks.length}`);
if (checks.some(pass => !pass)) process.exit(1);
