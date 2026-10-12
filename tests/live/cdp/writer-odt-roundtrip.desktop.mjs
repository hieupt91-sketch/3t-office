// Real Writer desktop regression: standard ODT → edit with CDP input → save → reopen.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, typeText } from "./actions.mjs";
import { sleep } from "./client.mjs";

const run = promisify(execFile);
const root = path.resolve(new URL("../../..", import.meta.url).pathname);
const temp = await mkdtemp(path.join(os.tmpdir(), "3t-writer-odt-live-"));
const sourceDir = path.join(temp, "source");
const profile = path.join(temp, "lo-profile");
await mkdir(sourceDir, { recursive: true });
await mkdir(profile, { recursive: true });
const fixture = path.join(root, "tests/fixtures/real-office-samples/sample-writer-tables.docx");
const soffice = process.env.VNOFFICE_SOFFICE_PATH || "soffice";
await run(soffice, ["--headless", `-env:UserInstallation=${new URL(`file://${profile}`).href}`, "--convert-to", "odt:writer8", "--outdir", sourceDir, fixture]);
const sourceOdt = path.join(sourceDir, "sample-writer-tables.odt");
const marker = "ODT round-trip — 3T";
const screenshot = path.join(temp, "odt-reopened.png");
const python = process.env.VNO_PYTHON || "python";

const session = await launchApp("writer", {
  root, python, filePath: sourceOdt, home: path.join(temp, "home-open"),
  startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000,
});
try {
  const { cdp } = session;
  await sleep(1500);
  const initial = await cdp.evaluate(`(() => ({
    text: document.querySelector('.vno-writer-body')?.innerText || '',
    tables: document.querySelectorAll('.vno-writer-body table').length,
    overlays: document.querySelectorAll('.vno-dialog-overlay').length
  }))()`);
  assert.equal(initial.tables, 1, `expected one imported table: ${JSON.stringify(initial)}`);
  assert.equal(initial.overlays, 0, `unexpected modal overlay: ${JSON.stringify(initial)}`);
  assert.ok(initial.text.trim().length > 0, "opened document body is empty");

  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.insertAdjacentHTML('beforeend', '<p><br></p>');
    const range = document.createRange();
    range.selectNodeContents(body.lastElementChild); range.collapse(false);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    body.focus();
  })()`);
  await typeText(cdp, `\n${marker}`, 25);
  assert.ok((await cdp.evaluate("document.querySelector('.vno-writer-body').innerText")).includes(marker), "real CDP keystrokes did not insert marker");

  const saveButton = await cdp.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-command-id="common.file.save"]')].find(node => {
      const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  if (saveButton) {
    await cdp.send("Input.dispatchMouseEvent", {type:"mousePressed",x:saveButton.x,y:saveButton.y,button:"left",buttons:1,clickCount:1});
    await cdp.send("Input.dispatchMouseEvent", {type:"mouseReleased",x:saveButton.x,y:saveButton.y,button:"left",buttons:0,clickCount:1});
  } else {
    const modifier = process.platform === "darwin" ? "meta" : "ctrl";
    await press(cdp, "s", { [modifier]: true }, 500);
  }
  await sleep(2000);
  await session.close();

  const { stdout } = await run("unzip", ["-p", sourceOdt, "mimetype"]);
  assert.equal(stdout.trim(), "application/vnd.oasis.opendocument.text");
  const reopened = await launchApp("writer", {
    root, python, filePath: sourceOdt, home: path.join(temp, "home-reopen"),
    startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000,
  });
  try {
    await sleep(1500);
    const result = await reopened.cdp.evaluate(`(() => ({
      text: document.querySelector('.vno-writer-body')?.innerText || '',
      tables: document.querySelectorAll('.vno-writer-body table').length,
      overlays: document.querySelectorAll('.vno-dialog-overlay').length
    }))()`);
    assert.equal(result.overlays, 0, `unexpected modal overlay after reopen: ${JSON.stringify(result)}`);
    assert.equal(result.tables, 1, `table lost after ODT save/reopen: ${JSON.stringify(result)}`);
    assert.ok(result.text.includes(marker), `saved ODT lost typed marker: ${JSON.stringify(result)}`);
    const png = await reopened.cdp.send("Page.captureScreenshot", {format:"png",captureBeyondViewport:false});
    await writeFile(screenshot, Buffer.from(png.result.data, "base64"));
    console.log(`PASS | Desktop CDP ODT open/edit/save/reopen | ${screenshot}`);
  } finally {
    await reopened.close();
  }
} finally {
  await session.close();
}

// ODT annotations must survive the same real desktop open/save/reopen route.
const commentsSourceDir = path.join(temp, "comments-source");
const commentsProfile = path.join(temp, "lo-comments-profile");
await mkdir(commentsSourceDir, { recursive: true });
await mkdir(commentsProfile, { recursive: true });
const commentsFodt = path.join(root, "tests/fixtures/real-office-samples/src/sample-writer-comments.fodt");
await run(soffice, ["--headless", `-env:UserInstallation=${new URL(`file://${commentsProfile}`).href}`, "--convert-to", "odt:writer8", "--outdir", commentsSourceDir, commentsFodt]);
const commentsOdt = path.join(commentsSourceDir, "sample-writer-comments.odt");
const commentsSession = await launchApp("writer", {
  root, python, filePath: commentsOdt, home: path.join(temp, "home-comments-open"),
  startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000,
});
try {
  await sleep(1600);
  const importedComments = await commentsSession.cdp.evaluate(`(() => ({
    marks: document.querySelectorAll('.vno-writer-body mark.vno-comment-anchor').length,
    cards: document.querySelectorAll('.vno-writer-comments-panel [data-comment-card]').length,
    bodies: [...document.querySelectorAll('.vno-writer-comments-panel .vno-comment-content')].map(el => el.textContent)
  }))()`);
  assert.equal(importedComments.marks, 2, `ODT comments did not become anchors: ${JSON.stringify(importedComments)}`);
  assert.equal(importedComments.cards, 2, `ODT comments missing from review panel: ${JSON.stringify(importedComments)}`);
  assert.ok(importedComments.bodies.some(text => text.includes("Cần đối chiếu số liệu quý II")), "first ODT comment body missing");
  assert.ok(importedComments.bodies.some(text => text.includes("Xác nhận chữ ký người soạn")), "second ODT comment body missing");

  const save = await commentsSession.cdp.evaluate(`(() => {
    const el = [...document.querySelectorAll('[data-command-id="common.file.save"]')].find(node => {
      const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
    if (!el) return null;
    const r = el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  assert.ok(save, "visible Save command not found for ODT comment round-trip");
  await commentsSession.cdp.send("Input.dispatchMouseEvent", {type:"mousePressed",x:save.x,y:save.y,button:"left",buttons:1,clickCount:1});
  await commentsSession.cdp.send("Input.dispatchMouseEvent", {type:"mouseReleased",x:save.x,y:save.y,button:"left",buttons:0,clickCount:1});
  await sleep(2500);
  await commentsSession.close();

  const { stdout: odtXml } = await run("unzip", ["-p", commentsOdt, "content.xml"]);
  assert.equal((odtXml.match(/<office:annotation\b/g) || []).length, 2, "saved ODT lost native annotations");
  assert.ok(odtXml.includes("Cần đối chiếu số liệu quý II trước khi trình."), "saved ODT lost comment body 1");
  assert.ok(odtXml.includes("Xác nhận chữ ký người soạn."), "saved ODT lost comment body 2");

  const commentsReopened = await launchApp("writer", {
    root, python, filePath: commentsOdt, home: path.join(temp, "home-comments-reopen"),
    startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000,
  });
  try {
    await sleep(1600);
    const result = await commentsReopened.cdp.evaluate(`(() => ({
      marks: document.querySelectorAll('.vno-writer-body mark.vno-comment-anchor').length,
      cards: document.querySelectorAll('.vno-writer-comments-panel [data-comment-card]').length
    }))()`);
    assert.equal(result.marks, 2, `saved ODT comment anchors did not reopen: ${JSON.stringify(result)}`);
    assert.equal(result.cards, 2, `saved ODT comment cards did not reopen: ${JSON.stringify(result)}`);
    const png = await commentsReopened.cdp.send("Page.captureScreenshot", {format:"png",captureBeyondViewport:false});
    await writeFile(path.join(temp, "odt-comments-reopened.png"), Buffer.from(png.result.data, "base64"));
    console.log(`PASS | Desktop CDP ODT comment open/save/reopen | ${path.join(temp, "odt-comments-reopened.png")}`);
  } finally {
    await commentsReopened.close();
  }
} finally {
  await commentsSession.close();
}
