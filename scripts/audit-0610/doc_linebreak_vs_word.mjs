// D26 read-only audit: compare the starting page of each top-level paragraph
// in the real desktop app with Microsoft Word COM.
//
// Full corpus (43 files; d10.docx is the established unusable Word fixture):
//   node --experimental-websocket scripts/audit-0610/doc_linebreak_vs_word.mjs
// Focused/resumable run:
//   node --experimental-websocket scripts/audit-0610/doc_linebreak_vs_word.mjs --files d03.docx,d24.docx --reuse-word
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp, repoRoot } from "../../tests/live/cdp/session.mjs";

const DEFAULT_RAW_ROOT = "E:\\VNOffice-profiles\\d26";
const CORPUS_ROOTS = [
  "E:\\VN OFice\\file test\\landocx",
  "E:\\VN OFice\\file test\\lan-legacy",
];
const EXCLUDED = new Map([
  ["d10.docx", "Excluded by the established 43-file corpus: Word COM cannot open/measure this fixture."],
]);

function parseArgs(argv) {
  const options = { rawRoot: DEFAULT_RAW_ROOT, files: null, reuseWord: false, wordOnly: false, appOnly: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--raw-root") options.rawRoot = path.resolve(argv[++index]);
    else if (arg === "--files") options.files = new Set(String(argv[++index] || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean));
    else if (arg === "--reuse-word") options.reuseWord = true;
    else if (arg === "--word-only") options.wordOnly = true;
    else if (arg === "--app-only") options.appOnly = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.wordOnly && options.appOnly) throw new Error("--word-only and --app-only are mutually exclusive");
  return options;
}

function safeStem(file) {
  return path.basename(file).replace(/[^a-z0-9_.-]+/gi, "_");
}

async function collectCorpus(selectedNames) {
  const files = [];
  for (const root of CORPUS_ROOTS) {
    for (const entry of await fs.readdir(root, { withFileTypes: true })) {
      if (!entry.isFile() || !/\.docx?$/i.test(entry.name)) continue;
      const lower = entry.name.toLowerCase();
      if (EXCLUDED.has(lower)) continue;
      if (selectedNames && !selectedNames.has(lower)) continue;
      files.push(path.join(root, entry.name));
    }
  }
  files.sort((a, b) => path.basename(a).localeCompare(path.basename(b), "en", { numeric: true }));
  if (selectedNames) {
    const found = new Set(files.map(file => path.basename(file).toLowerCase()));
    const missing = [...selectedNames].filter(name => !found.has(name));
    if (missing.length) throw new Error(`Requested files not found or excluded: ${missing.join(", ")}`);
  }
  return files;
}

function runProcess(command, args, { timeoutMilliseconds = 180000, onTimeout = null, capture = true } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repoRoot, windowsHide: true, stdio: capture ? ["ignore", "pipe", "pipe"] : "ignore" });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout = (stdout + chunk).slice(-30000); });
    child.stderr?.on("data", chunk => { stderr = (stderr + chunk).slice(-30000); });
    let timedOut = false;
    const timer = setTimeout(async () => {
      timedOut = true;
      try { await onTimeout?.(); } catch {}
      try { child.kill(); } catch {}
    }, timeoutMilliseconds);
    child.once("error", error => { clearTimeout(timer); reject(error); });
    child.once("exit", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) return reject(new Error(`${command} timed out after ${timeoutMilliseconds} ms`));
      if (code !== 0) return reject(new Error(`${command} exited ${code ?? signal}: ${(stderr || stdout).trim()}`));
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });
  });
}

async function terminateOwnedWord(pidFile) {
  const raw = await fs.readFile(pidFile, "utf8").catch(() => "");
  const pid = Number(raw.trim());
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  // The PID file is written from the HWND of the Word.Application created by
  // word_paragraph_pages.ps1. Never terminate by image/process name.
  await runProcess("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { timeoutMilliseconds: 15000 }).catch(() => {});
}

async function measureWord(file, rawRoot, reuseWord) {
  const stem = safeStem(file);
  const out = path.join(rawRoot, "word", `${stem}.json`);
  const pidFile = path.join(rawRoot, "word-pids", `${stem}.pid`);
  if (reuseWord) {
    try { return JSON.parse(await fs.readFile(out, "utf8")); } catch {}
  }
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.mkdir(path.dirname(pidFile), { recursive: true });
  await fs.rm(pidFile, { force: true });
  const script = path.join(repoRoot, "scripts", "audit-0610", "word_paragraph_pages.ps1");
  const run = await runProcess("powershell.exe", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
    "-File", file, "-Out", out, "-PidFile", pidFile,
  ], { timeoutMilliseconds: 600000, onTimeout: () => terminateOwnedWord(pidFile) });
  console.log(`WORD\t${path.basename(file)}\t${run.stdout}`);
  return JSON.parse(await fs.readFile(out, "utf8"));
}

async function measureApp(file, rawRoot) {
  let session;
  try {
    // launchApp creates a fresh, disposable LOCALAPPDATA when none is supplied.
    session = await launchApp("writer", { filePath: file });
    await session.cdp.waitFor(`(() => {
      const adapter = window.__vnoAppInstance?.adapter;
      const body = document.querySelector('.vno-writer-body');
      return !!adapter?._sourcePath && !!body && body.children.length > 0 &&
        Number.isFinite(adapter._livePageCount) && adapter._livePageCount > 0 && !adapter._paginating;
    })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 1000 });
    await new Promise(resolve => setTimeout(resolve, 5000));
    await session.cdp.waitFor("!window.__vnoAppInstance?.adapter?._paginating", { timeoutMilliseconds: 30000 });
    const result = await session.cdp.evaluate(`(() => {
      const adapter = window.__vnoAppInstance?.adapter;
      const body = document.querySelector('.vno-writer-body');
      const paragraphTags = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
      const rows = [];
      let page = 1;
      for (const element of body.querySelectorAll('*')) {
        if (element.getAttribute?.('data-vno-auto-page-gap') === 'true') {
          page++;
          continue;
        }
        if (!paragraphTags.has(element.tagName)) continue;
        if (element.classList.contains('vno-section-break') || element.hasAttribute('data-vno-section-break')) continue;
        if (element.closest('table, [data-vno-float], [data-vno-footnotes], [data-vno-endnotes], header, footer')) continue;
        if (element.parentElement?.closest('p, h1, h2, h3, h4, h5, h6')) continue;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        rows.push({
          index: rows.length + 1,
          childIndex: Array.prototype.indexOf.call(body.children, element),
          parentTag: element.parentElement?.tagName || '',
          pageStart: page,
          tag: element.tagName,
          text: (element.innerText || element.textContent || '').replace(/[\\r\\n\\t\\u0007]+/g, ' ').replace(/\\s+/g, ' ').trim().slice(0, 240),
          className: element.className || '',
          heightPx: Math.round(rect.height * 100) / 100,
          fontFamily: style.fontFamily,
          fontSizePx: style.fontSize,
          lineHeightPx: style.lineHeight,
          marginTopPx: style.marginTop,
          marginBottomPx: style.marginBottom,
          breakBefore: style.breakBefore || style.pageBreakBefore || '',
          breakAfter: style.breakAfter || style.pageBreakAfter || '',
          keepNext: element.getAttribute('data-vno-keep-next'),
          imageCount: element.querySelectorAll('img').length,
          floatCount: element.querySelectorAll('[data-vno-float]').length,
          tableCount: element.querySelectorAll('table').length,
          htmlStart: element.outerHTML.slice(0, 600),
        });
      }
      return {
        source: adapter?._sourcePath || null,
        measuredAt: new Date().toISOString(),
        pages: adapter?._livePageCount,
        gapCount: body.querySelectorAll('[data-vno-auto-page-gap="true"]').length,
        directChildCount: body.children.length,
        paragraphs: rows,
      };
    })()`);
    result.localAppData = session.localAppData;
    const out = path.join(rawRoot, "app", `${safeStem(file)}.json`);
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.writeFile(out, JSON.stringify(result, null, 2) + "\n", "utf8");
    console.log(`APP\t${path.basename(file)}\tpages=${result.pages} paragraphs=${result.paragraphs.length} gaps=${result.gapCount}`);
    return result;
  } finally {
    await session?.close().catch(() => {});
  }
}

function normalizedText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f\u00ad\ufffc]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("vi");
}

function textQuality(a, b) {
  const left = normalizedText(a);
  const right = normalizedText(b);
  if (!left && !right) return { label: "empty", score: 2, reliable: true };
  if (left === right) return { label: "exact", score: 10, reliable: true };
  if (!left || !right) return { label: "different", score: -8, reliable: false };
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  if (shorter.length >= 8 && (longer.startsWith(shorter) || longer.includes(shorter))) {
    return { label: "contained", score: 7, reliable: true };
  }
  let prefix = 0;
  const limit = Math.min(left.length, right.length, 80);
  while (prefix < limit && left[prefix] === right[prefix]) prefix++;
  if (prefix >= Math.min(12, limit)) return { label: "prefix", score: 5, reliable: true };
  return { label: "different", score: -8, reliable: false };
}

function alignParagraphs(wordParagraphs, appParagraphs) {
  const word = wordParagraphs.filter(row => !row.inTable);
  const app = appParagraphs;
  const width = app.length + 1;
  const directions = new Uint8Array((word.length + 1) * width); // 1 diag, 2 up, 3 left
  let previous = new Float64Array(width);
  let current = new Float64Array(width);
  const gap = -5;
  for (let j = 1; j <= app.length; j++) { previous[j] = previous[j - 1] + gap; directions[j] = 3; }
  for (let i = 1; i <= word.length; i++) {
    current[0] = previous[0] + gap;
    directions[i * width] = 2;
    for (let j = 1; j <= app.length; j++) {
      const diagonal = previous[j - 1] + textQuality(word[i - 1].text, app[j - 1].text).score;
      const up = previous[j] + gap;
      const left = current[j - 1] + gap;
      if (diagonal >= up && diagonal >= left) { current[j] = diagonal; directions[i * width + j] = 1; }
      else if (up >= left) { current[j] = up; directions[i * width + j] = 2; }
      else { current[j] = left; directions[i * width + j] = 3; }
    }
    [previous, current] = [current, previous];
  }

  const pairs = [];
  const unalignedWord = [];
  const unalignedApp = [];
  let i = word.length;
  let j = app.length;
  while (i > 0 || j > 0) {
    const direction = directions[i * width + j];
    if (i > 0 && j > 0 && direction === 1) {
      const quality = textQuality(word[i - 1].text, app[j - 1].text);
      pairs.push({ word: word[i - 1], app: app[j - 1], quality: quality.label, reliable: quality.reliable });
      i--; j--;
    } else if (i > 0 && (direction === 2 || j === 0)) {
      unalignedWord.push(word[--i]);
    } else {
      unalignedApp.push(app[--j]);
    }
  }
  pairs.reverse();
  unalignedWord.reverse();
  unalignedApp.reverse();
  return { word, app, pairs, unalignedWord, unalignedApp };
}

function compare(file, wordResult, appResult) {
  const alignment = alignParagraphs(wordResult.paragraphs || [], appResult.paragraphs || []);
  const comparable = alignment.pairs.filter(pair => pair.reliable);
  const mismatches = comparable
    .filter(pair => Number(pair.word.pageStart) !== Number(pair.app.pageStart))
    .map(pair => ({
      wordIndex: pair.word.index,
      appIndex: pair.app.index,
      text: pair.word.text || pair.app.text || "",
      wordPage: Number(pair.word.pageStart),
      appPage: Number(pair.app.pageStart),
      delta: Number(pair.app.pageStart) - Number(pair.word.pageStart),
      quality: pair.quality,
      word: pair.word,
      app: pair.app,
    }));
  return {
    name: path.basename(file),
    source: file,
    wordPages: Number(wordResult.pages),
    appPages: Number(appResult.pages),
    totalPagesMatch: Number(wordResult.pages) === Number(appResult.pages),
    wordTopLevelParagraphs: alignment.word.length,
    appTopLevelParagraphs: alignment.app.length,
    comparableParagraphs: comparable.length,
    unalignedWordParagraphs: alignment.unalignedWord.length + alignment.pairs.filter(pair => !pair.reliable).length,
    unalignedAppParagraphs: alignment.unalignedApp.length + alignment.pairs.filter(pair => !pair.reliable).length,
    mismatchCount: mismatches.length,
    firstMismatch: mismatches[0] || null,
    mismatches,
    unalignedWord: alignment.unalignedWord,
    unalignedApp: alignment.unalignedApp,
  };
}

const options = parseArgs(process.argv.slice(2));
await fs.mkdir(options.rawRoot, { recursive: true });
const files = await collectCorpus(options.files);
if (!options.files && files.length !== 43) throw new Error(`Expected the established 43-file corpus, found ${files.length}`);
const dismisserScript = path.join(repoRoot, "scripts", "audit-0610", "word_dialog_dismisser.ps1");
const dismisser = options.appOnly ? null : spawn("powershell.exe", [
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", dismisserScript, "-Seconds", "21600",
], { cwd: repoRoot, windowsHide: true, stdio: "ignore" });
const rows = [];
try {
  for (const file of files) {
    try {
      const wordResult = options.appOnly ? JSON.parse(await fs.readFile(path.join(options.rawRoot, "word", `${safeStem(file)}.json`), "utf8")) : await measureWord(file, options.rawRoot, options.reuseWord);
      if (options.wordOnly) continue;
      const appResult = await measureApp(file, options.rawRoot);
      const row = compare(file, wordResult, appResult);
      rows.push(row);
      console.log(`COMPARE\t${row.name}\tpages=${row.wordPages}/${row.appPages}\tparagraphs=${row.comparableParagraphs}\tmismatches=${row.mismatchCount}\tunaligned=${row.unalignedWordParagraphs}/${row.unalignedAppParagraphs}`);
    } catch (error) {
      rows.push({ name: path.basename(file), source: file, error: String(error?.stack || error) });
      console.error(`ERROR\t${path.basename(file)}\t${String(error?.message || error).replace(/\s+/g, " ")}`);
    }
  }
} finally {
  if (dismisser && dismisser.exitCode === null) dismisser.kill();
}

if (!options.wordOnly) {
  const result = {
    measuredAt: new Date().toISOString(),
    corpusRoots: CORPUS_ROOTS,
    excluded: Object.fromEntries(EXCLUDED),
    filesRequested: files.length,
    filesMeasured: rows.filter(row => !row.error).length,
    rows,
  };
  const out = path.join(options.rawRoot, "doc-linebreak-vs-word.json");
  await fs.writeFile(out, JSON.stringify(result, null, 2) + "\n", "utf8");
  const mismatched = rows.filter(row => !row.error && row.totalPagesMatch && row.mismatchCount > 0);
  console.log(`RESULT\tmeasured=${result.filesMeasured}/${files.length}\ttotal-page-match=${rows.filter(row => row.totalPagesMatch).length}\tlinebreak-mismatch=${mismatched.length}\tout=${out}`);
}
