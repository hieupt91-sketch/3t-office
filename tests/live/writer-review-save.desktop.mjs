/**
 * CH-5.6 desktop acceptance through WebView2 remote debugging + CDP only.
 * Creates its own synthetic DOCX, edits/saves/reopens it in VN Writer, then
 * reads the saved package in hidden Word COM. No OS-level input is used.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { pathToFileURL, fileURLToPath } from "node:url";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-ch56-review-cdp-"));
const appDataName = `VNOffice-CH56-${process.pid}`;
const localAppData = path.join(tempRoot, "localappdata");
const seedPath = path.join(tempRoot, "word-created.docx");
const log = (status, label, detail = "") => console.log(`${status}\t${label}${detail ? ` — ${detail}` : ""}`);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const freePort = async () => new Promise((resolve, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const port = server.address().port;
    server.close(error => error ? reject(error) : resolve(port));
  });
});

const seedCode = String.raw`
import sys,zipfile
from pathlib import Path
sys.path.insert(0, str(Path(sys.argv[2]) / "tests"))
from test_writer_review_roundtrip import _source_docx
target=Path(sys.argv[1])
if sys.argv[3]=='new':
    import main,json
    header='<p>HEADER_SOURCE</p>'
    footer='<p><span data-vno-field="PAGE">1</span> / <span data-vno-field="NUMPAGES">1</span> FOOTER_SOURCE</p>'
    section={"id":"section-1","active":True,"type":"nextPage","pageSetup":{"size":"a4","orientation":"portrait","margins":{"top":20,"right":15,"bottom":20,"left":30}},"headerFooter":{"linkToPrevious":False,"header":header,"footer":footer,"headers":{"default":header},"footers":{"default":footer},"differentFirstPage":True,"differentOddEven":False}}
    html='<div title="header">'+header+'</div><p>Base NEW_DOC_BODY</p><div title="footer">'+footer+'</div><!--vno-sections-meta:'+json.dumps([section])+'-->'
    result=main.VnOfficeApi().save_document_in_place(html,'writer',str(target),None)
    assert result.get('status')=='ok',result
else:
    _source_docx(target)
replacement=target.with_suffix('.tmp.docx')
with zipfile.ZipFile(target) as source, zipfile.ZipFile(replacement,'w',zipfile.ZIP_DEFLATED) as output:
    for item in source.infolist():
        data=source.read(item.filename)
        if item.filename=='word/settings.xml':
            data=data.replace(b'<w:trackRevisions/>',b'')
        output.writestr(item,data)
replacement.replace(target)
`;
execFileSync("python", ["-s", "-c", seedCode, seedPath, repoRoot, process.argv.includes("--new") ? "new" : "word"], { cwd: repoRoot, stdio: "inherit" });

async function startWriter(filePath) {
  const debugPort = await freePort();
  let staticPort = await freePort();
  while (staticPort === debugPort) staticPort = await freePort();
  if (await fetch(`http://127.0.0.1:${debugPort}/json/version`).then(response => response.ok).catch(() => false)) {
    throw new Error(`Selected CDP port ${debugPort} was claimed by another process before launch.`);
  }
  log("INFO", "Starting VN Writer WebView2 CDP", `${debugPort} (static ${staticPort})`);
  const bootstrap = "import sys,main; main._DEFAULT_STATIC_PORT=int(sys.argv[3]); main.APP_DATA_DIR_NAME=sys.argv[1]; main.main(['--app=writer',sys.argv[2]])";
  const child = spawn("python", ["-c", bootstrap, appDataName, filePath, String(staticPort)], {
    cwd: repoRoot,
    env: {
      ...process.env,
      LOCALAPPDATA: localAppData,
      WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${debugPort}`
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let childOutput = "";
  child.stdout.on("data", chunk => { childOutput += chunk.toString(); });
  child.stderr.on("data", chunk => { childOutput += chunk.toString(); });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`VN Writer exited (${child.exitCode})\n${childOutput}`);
      try {
        const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
        if (response.ok) { ready = true; break; }
      } catch { /* Wait for WebView2 CDP endpoint. */ }
      await sleep(250);
    }
    if (!ready) throw new Error(`WebView2 remote-debugging endpoint did not start\n${childOutput}`);
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
    const context = browser.contexts()[0];
    let page = null;
    let lastPageState = "no page target";
    for (let attempt = 0; attempt < 80; attempt += 1) {
      let loadedSource = false;
      const pages = context.pages().filter(candidate => /127\.0\.0\.1|localhost/.test(candidate.url()));
      for (const candidate of pages) {
        const state = await candidate.evaluate(() => ({
          url: location.href,
          body: (document.querySelector(".vno-writer-body")?.innerText || "").slice(0, 500),
          header: (document.querySelector(".vno-writer-header")?.innerText || "").slice(0, 200),
          dialogs: [...document.querySelectorAll(".vno-dialog-overlay,[role=alertdialog]")].map(item => item.innerText).join(" | ")
        })).catch(error => ({ url: candidate.url(), body: "", header: "", dialogs: error.message }));
        lastPageState = JSON.stringify(state);
        if (state.body.includes("Base")) { page = candidate; loadedSource = true; break; }
        page = candidate;
      }
      if (loadedSource) break;
      await sleep(250);
    }
    if (!page) throw new Error(`No WebView2 page found\n${childOutput}`);
    try {
      await page.locator(".vno-writer-body").waitFor({ timeout: 30000 });
    } catch (error) {
      const state = await page.evaluate(() => ({
        url: location.href,
        title: document.title,
        root: document.querySelector("#vno-app-root")?.innerText?.slice(0, 1000) || "",
        bodyCount: document.querySelectorAll(".vno-writer-body").length,
        dialogs: [...document.querySelectorAll(".vno-dialog-overlay,[role=alertdialog]")].map(item => item.innerText).join(" | ")
      })).catch(evaluateError => ({ error: evaluateError.message }));
      throw new Error(`Writer body did not become visible: ${JSON.stringify(state)}\n${childOutput}\n${error.message}`);
    }
    const consent = page.locator(".vno-error-reporting-overlay");
    if (await consent.count() && await consent.isVisible().catch(() => false)) {
      await consent.locator('[data-dialog-action="deny"]').click();
      await consent.waitFor({ state: "detached", timeout: 10000 });
    }
    try {
      await page.waitForFunction(() => (document.querySelector(".vno-writer-body")?.innerText || "").includes("Base"), null, { timeout: 30000 });
    } catch {
      const state = await page.evaluate(() => ({
        url: location.href,
        body: (document.querySelector(".vno-writer-body")?.innerText || "").slice(0, 1000),
        header: (document.querySelector(".vno-writer-header")?.innerText || "").slice(0, 300),
        dialogs: [...document.querySelectorAll(".vno-dialog-overlay,[role=alertdialog]")].map(item => item.innerText).join(" | ")
      })).catch(error => ({ error: error.message }));
      throw new Error(`Synthetic DOCX was not loaded by Writer. page=${JSON.stringify(state)}\n${childOutput}\nlast=${lastPageState}`);
    }
    return { child, browser, page, childOutput };
  } catch (error) {
    if (browser) {
      const candidate = browser.contexts()[0]?.pages()[0];
      try { await candidate?.evaluate(() => window.pywebview?.api?.close_current_window?.()); } catch {}
    }
    await browser?.close().catch(() => {});
    if (child.exitCode === null) {
      await Promise.race([new Promise(resolve => child.once("exit", resolve)), sleep(8000)]);
      if (child.exitCode === null) try { child.kill(); } catch { /* Only the app process started above. */ }
    }
    throw error;
  }
}

async function closeWriter(session) {
  try { await session.page.evaluate(() => window.pywebview?.api?.close_current_window?.()); } catch {}
  await session.browser.close().catch(() => {});
  const exited = session.child.exitCode !== null || await Promise.race([
    new Promise(resolve => session.child.once("exit", () => resolve(true))), sleep(15000).then(() => false)
  ]);
  if (!exited) throw new Error("VN Writer did not exit after close_current_window; process was left running.");
}

function readWordCom(filePath, normalize = false) {
  const scriptPath = path.join(tempRoot, "word-hidden-readback.ps1");
  const script = String.raw`
param([string]$Path, [string]$Normalize)
$ErrorActionPreference='Stop'
function Invoke-Com([scriptblock]$Call) {
  for ($i=0; $i -lt 120; $i++) {
    try { return & $Call }
    catch {
      if ($_.Exception.Message -match '0x80010001|0x8001010A|RPC_E_CALL_REJECTED|RETRYLATER') { Start-Sleep -Milliseconds 500 }
      else { throw }
    }
  }
  throw 'RPC_E_CALL_REJECTED persisted'
}
$audit=@(Get-CimInstance Win32_Process -Filter "name = 'python.exe'" | Where-Object { $_.CommandLine -match '_batch_writer_legacy.py' })
if ($audit.Count) { throw 'Another legacy Word audit owns the machine; run this phase after it exits.' }
$before=@(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object Id)
$word=$null; $doc=$null; $owned=$false; $result=@{}
try {
  $word=New-Object -ComObject Word.Application
  $word.Visible=$false; $word.DisplayAlerts=0
  $after=@(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object Id)
  $owned=@($after | Where-Object { $before -notcontains $_ }).Count -eq 1
  # Word returns $null for Document.TrackRevisions when a DOCX is opened
  # read-only even though w:trackRevisions and revisions are present. Open the
  # synthetic artifact writable and always close with wdDoNotSaveChanges so the
  # COM assertion observes the real document setting without mutating the file.
  $doc=Invoke-Com { $word.Documents.Open((Resolve-Path -LiteralPath $Path).Path,$false,$false,$false) }
  if ($Normalize -eq "normalize") { Invoke-Com { $doc.Save() } | Out-Null }
  Invoke-Com { $doc.Repaginate() } | Out-Null
  $section=Invoke-Com { $doc.Sections.Item(1) }
  $result.header= [string](Invoke-Com { $section.Headers.Item(1).Range.Text })
  $result.footer=[string](Invoke-Com { $section.Footers.Item(1).Range.Text })
  $result.footerFields=[string](Invoke-Com { ($section.Footers.Item(1).Range.Fields | ForEach-Object { $_.Code.Text }) -join ';' })
  $result.equations=[string](Invoke-Com { $doc.OMaths.Count })
  $result.revisions=[string](Invoke-Com { $doc.Revisions.Count })
  $result.comments=[string](Invoke-Com { $doc.Comments.Count })
  $result.trackRevisions=[string](Invoke-Com { $doc.TrackRevisions })
  $result.text=[string](Invoke-Com { $doc.Content.Text })
} catch { $result.error=$_.Exception.Message }
finally {
  if ($doc) { try { Invoke-Com { $doc.Close(0) } | Out-Null } catch {} }
  if ($word -and $owned) { try { Invoke-Com { $word.Quit() } | Out-Null; $result.quit='PASS' } catch { $result.quit='ERROR: '+$_.Exception.Message } }
}
$result | ConvertTo-Json -Compress -Depth 5
`;
  fs.writeFileSync(scriptPath, script, "utf8");
  const output = execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, filePath, normalize ? "normalize" : "read"], {
    cwd: repoRoot, encoding: "utf8", timeout: 120000
  }).trim();
  return JSON.parse(output);
}

let session;
let secondSession;
try {
  // Serialize Word-authored packages with Word itself before testing the app.
  // New-document mode keeps the package produced by the production app pipeline.
  if (!process.argv.includes("--new") && !process.argv.includes("--cdp-only")) {
    const before = readWordCom(seedPath, true);
    assert.ok(!before.error, JSON.stringify(before));
    const unchangedPath = path.join(tempRoot, "word-unchanged.docx");
    const bodyEditedPath = path.join(tempRoot, "word-body-edited.docx");
    const pipeline = String.raw`
import sys
from pathlib import Path
sys.path.insert(0,str(Path(sys.argv[4])/'tests'))
from test_writer_review_roundtrip import _open_docx,_review_html_for_edited_source
import main
source=Path(sys.argv[1]);opened=_open_docx(source)
r=main.VnOfficeApi().save_document_in_place('<a name="vno-pristine-document"></a>'+opened['content'],'writer',sys.argv[2],str(source))
assert r.get('status')=='ok',r
assert Path(sys.argv[2]).read_bytes()==source.read_bytes()
r=main.VnOfficeApi().save_document_in_place(_review_html_for_edited_source(opened),'writer',sys.argv[3],str(source))
assert r.get('status')=='ok',r
`;
    execFileSync("python", ["-s", "-c", pipeline, seedPath, unchangedPath, bodyEditedPath, repoRoot], { cwd: repoRoot, stdio: "inherit" });
    for (const file of [unchangedPath, bodyEditedPath]) {
      const after = readWordCom(file);
      assert.ok(!after.error, JSON.stringify(after));
      for (const key of ["header", "footerFields", "revisions", "comments", "equations"]) assert.equal(after[key], before[key], `Word body-only/pristine roundtrip changed ${key}`);
    }
    log("PASS", "Word-authored unchanged and body-only edit preserve header, fields, revisions and comments");
  }
  session = await startWriter(seedPath);
  const { page } = session;
  const header = page.locator(".vno-writer-header");
  await header.waitFor({ state: "visible", timeout: 10000 });
  assert.ok((await header.innerText()).includes("HEADER_SOURCE"), "Word-created header did not load into Writer.");
  await header.click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" CDP_HEADER_SAVED");
  assert.ok((await header.innerText()).includes("CDP_HEADER_SAVED"), "CDP did not type into Writer's header zone.");
  log("PASS", "CDP typed header text in WebView2");

  await page.locator("#vno-ribbon-tab-review").click();
  const trackingButton = page.locator('[data-command-id="writer.trackChanges.toggle"]').first();
  const wasTracking = await trackingButton.evaluate(el => el.classList.contains("is-checked") || el.getAttribute("aria-pressed") === "true");
  if (!wasTracking) await trackingButton.click();
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-command-id="writer.trackChanges.toggle"]');
    return Boolean(button?.classList.contains("is-checked") || button?.getAttribute("aria-pressed") === "true");
  });
  const body = page.locator(".vno-writer-body");
  await body.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(" CDP_TRACKED_INSERT");
  const trackedInsert = page.locator('.vno-writer-body ins[data-vno-change="insert"]', { hasText: "CDP_TRACKED_INSERT" });
  await trackedInsert.waitFor({ timeout: 10000 });
  log("PASS", "Review tab tracking button recorded CDP typed text");

  await page.evaluate(() => {
    const target = "CDP_TRACKED_INSERT";
    const bodyNode = document.querySelector(".vno-writer-body");
    const walker = document.createTreeWalker(bodyNode, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const offset = node.textContent.indexOf(target);
      if (offset < 0) continue;
      const range = document.createRange();
      range.setStart(node, offset); range.setEnd(node, offset + target.length);
      const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      return;
    }
    throw new Error("Could not select the new tracked insertion for a comment.");
  });
  await page.locator('[data-command-id="writer.comment.insert"]').first().click();
  const dialog = page.locator(".vno-dialog-overlay");
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await dialog.locator(".vno-dialog-input").fill("CDP_COMMENT_SAVED");
  await dialog.locator(".vno-dialog-ok-btn").click();
  await dialog.waitFor({ state: "detached", timeout: 10000 });
  await page.locator(".vno-comment-card", { hasText: "CDP_COMMENT_SAVED" }).waitFor({ timeout: 10000 });
  log("PASS", "Review tab comment is anchored to selected tracked text");

  const exportSnapshot = await page.evaluate(() => {
    const adapter = window.__vnoAppInstance?.adapter;
    return {
      html: adapter?._contentForExport?.() || "",
      activeSectionId: adapter?.activeSectionId || "",
      getActiveSectionId: adapter?.getActiveSectionId?.() || "",
      headerHtml: adapter?.headerDom?.innerHTML || ""
    };
  });
  fs.writeFileSync(path.join(tempRoot, "export-snapshot.json"), JSON.stringify(exportSnapshot, null, 2));
  const sectionSnapshot = exportSnapshot.html.match(/<!--vno-sections-meta:\s*(\[.*?\])\s*-->/s);
  assert.ok(sectionSnapshot, "Writer export is missing section metadata.");
  const exportedSections = JSON.parse(sectionSnapshot[1]);
  const editedHeaderSection = exportedSections.find(section => section.headerFooter?.header?.includes("CDP_HEADER_SAVED"));
  assert.ok(editedHeaderSection, `Live header edit did not reach section export metadata: ${JSON.stringify({ activeSectionId: exportSnapshot.activeSectionId, getActiveSectionId: exportSnapshot.getActiveSectionId, headerHtml: exportSnapshot.headerHtml, sections: exportedSections })}`);
  log("PASS", "Export metadata includes the edited section header");

  const beforeSave = fs.statSync(seedPath).mtimeMs;
  await page.keyboard.press("Control+s");
  let saved = false;
  for (let attempt = 0; attempt < 480; attempt += 1) {
    if (fs.statSync(seedPath).mtimeMs !== beforeSave) { saved = true; break; }
    const errorDialog = page.locator(".vno-dialog-overlay");
    if (await errorDialog.count()) {
      const message = await errorDialog.innerText().catch(() => "");
      if (/không thể lưu|không khôi phục được/i.test(message)) throw new Error(`Save dialog reported failure: ${message}`);
    }
    await sleep(250);
  }
  assert.ok(saved, "Ctrl+S did not update the opened DOCX within 120 seconds.");
  const outputEntries = listZipEntries(seedPath).map(entry => entry.name);
  const outputHeaders = outputEntries.filter(name => /^word\/header\d+\.xml$/.test(name));
  const outputFooters = outputEntries.filter(name => /^word\/footer\d+\.xml$/.test(name));
  const outputDocumentXml = readZipEntry(seedPath, "word/document.xml").toString("utf8");
  const outputCommentsXml = readZipEntry(seedPath, "word/comments.xml").toString("utf8");
  const outputRelsXml = readZipEntry(seedPath, "word/_rels/document.xml.rels").toString("utf8");
  const outputSettingsXml = readZipEntry(seedPath, "word/settings.xml").toString("utf8");
  assert.ok(outputHeaders.some(name => readZipEntry(seedPath, name).toString("utf8").includes("CDP_HEADER_SAVED")), "Saved DOCX lost edited header content.");
  assert.ok(outputFooters.some(name => readZipEntry(seedPath, name).toString("utf8").includes("PAGE")), "Saved DOCX lost its PAGE footer field.");
  assert.match(outputDocumentXml, /<w:headerReference\b/, "Saved DOCX section lost its header relationship.");
  assert.match(outputDocumentXml, /<w:footerReference\b/, "Saved DOCX section lost its footer relationship.");
  assert.match(outputDocumentXml, /<w:titlePg\b/, "Saved DOCX lost different-first-page section state.");
  assert.match(outputDocumentXml, /<w:ins\b[\s\S]*CDP_TRACKED_INSERT/, "Saved DOCX lacks the native insertion revision.");
  assert.match(outputDocumentXml, /<w:commentRangeStart\b[\s\S]*CDP_TRACKED_INSERT[\s\S]*<w:commentRangeEnd\b/, "Saved DOCX comment lost its anchor range.");
  assert.ok(outputCommentsXml.includes("CDP_COMMENT_SAVED"), "Saved DOCX lacks the new comment body.");
  assert.match(outputRelsXml, /relationships\/comments/, "Saved DOCX comment relationship is missing.");
  assert.match(outputSettingsXml, /<w:trackRevisions\b/, "Saved DOCX tracking setting is missing.");
  log("PASS", "Ctrl+S wrote header, w:ins, comment range, and comments.xml");
  await closeWriter(session); session = null;

  secondSession = await startWriter(seedPath);
  const reopened = secondSession.page;
  try {
    await reopened.waitForFunction(() => {
      const bodyText = document.querySelector(".vno-writer-body")?.innerText || "";
      return bodyText.includes("CDP_TRACKED_INSERT");
    }, null, { timeout: 30000 });
  } catch (error) {
    const state = await reopened.evaluate(() => ({
      body: document.querySelector(".vno-writer-body")?.innerText?.slice(0, 500) || "",
      header: document.querySelector(".vno-writer-header")?.innerText || "",
      activeSectionId: window.__vnoAppInstance?.adapter?.activeSectionId || "",
      sections: window.__vnoAppInstance?.adapter?.sectionHeadersFooters || {}
    })).catch(evaluateError => ({ error: evaluateError.message }));
    throw new Error(`Reopened Writer did not restore tracked body text: ${JSON.stringify(state)}\n${error.message}`);
  }
  const reopenedHeader = await reopened.locator(".vno-writer-header").innerText();
  assert.ok(reopenedHeader.includes("CDP_HEADER_SAVED"), `Reopened Writer header mismatch: ${JSON.stringify({ header: reopenedHeader, activeSectionId: await reopened.evaluate(() => window.__vnoAppInstance?.adapter?.activeSectionId), sections: await reopened.evaluate(() => window.__vnoAppInstance?.adapter?.sectionHeadersFooters) })}`);
  await reopened.locator(".vno-comment-card", { hasText: "CDP_COMMENT_SAVED" }).waitFor({ timeout: 15000 });
  assert.ok(await reopened.locator('.vno-writer-body ins[data-vno-change="insert"]', { hasText: "CDP_TRACKED_INSERT" }).count());
  log("PASS", "Reopened Writer displays saved header, tracked insertion, and comment");
  await closeWriter(secondSession); secondSession = null;

  if (process.argv.includes("--cdp-only")) {
    log("NOT RUN", "Hidden Word COM phase deferred while a layout audit owns Word");
  } else {
  const word = readWordCom(seedPath);
  assert.ok(!word.error, `Hidden Word COM could not read the saved DOCX: ${word.error || ""}`);
  assert.ok(word.header.includes("CDP_HEADER_SAVED"), `Word header readback mismatch: ${word.header}`);
  assert.ok(Number(word.revisions) >= 1, `Word Revisions.Count=${word.revisions}`);
  assert.ok(Number(word.comments) >= 1, `Word Comments.Count=${word.comments}`);
  assert.match(word.footerFields, /PAGE/i, `Word footer PAGE field missing: ${word.footerFields}`);
  assert.match(word.footerFields, /NUMPAGES/i, `Word footer NUMPAGES field missing: ${word.footerFields}`);
  assert.match(word.trackRevisions, /True/i, `Word TrackRevisions setting is false: ${word.trackRevisions}`);
  if (!process.argv.includes("--new")) assert.ok(Number(word.equations) >= 1, "Body/header/review edits lost the source equation.");
  log("PASS", "Hidden Word COM readback", JSON.stringify({ revisions: word.revisions, comments: word.comments, trackRevisions: word.trackRevisions, header: word.header.trim(), footerFields: word.footerFields }));
  }
} catch (error) {
  log("FAIL", "CH-5.6 WebView2 CDP / hidden Word verification", error?.stack || String(error));
  process.exitCode = 1;
} finally {
  if (session) await closeWriter(session).catch(error => log("BLOCKED", "Could not close first Writer instance", error.message));
  if (secondSession) await closeWriter(secondSession).catch(error => log("BLOCKED", "Could not close reopened Writer instance", error.message));
  if (process.env.VNO_KEEP_CDP) {
    log("INFO", "Preserved synthetic CDP artifacts", tempRoot);
  } else {
    try { fs.rmSync(tempRoot, { recursive: true, force: true }); }
    catch (error) { log("BLOCKED", "Temporary WebView2 profile cleanup", error.message); }
  }
}
