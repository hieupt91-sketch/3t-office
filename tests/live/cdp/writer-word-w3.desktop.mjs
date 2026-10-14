import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { readZipEntry } from "../../helpers/zip-package.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated WORD-W3 profile.");
fs.mkdirSync(profile, { recursive: true });
const output = path.join(profile, "word-w3-result.docx");
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });

try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const compared = JSON.parse(await cdp.evaluate(`(async () => {
    const adapter = window.__vnoAppInstance.adapter;
    const bridge = (await import('/adapters/libreoffice/common/uno-bridge.js')).globalUnoBridge;
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    document.querySelector('.vno-writer-body').innerHTML = '<p>Đoạn giữ nguyên</p><p>Nội dung cũ</p>';
    bridge.openWriterReferenceDocument = async () => ({
      status: 'ok', fileName: 'ban-sua.docx', sourcePath: 'C:/local/ban-sua.docx',
      content: '<html><body><p>Đoạn giữ nguyên</p><p>Nội dung mới</p></body></html>'
    });
    const result = await bus.execute('writer.review.compare');
    const body = document.querySelector('.vno-writer-body');
    return JSON.stringify({ result, ins: body.querySelectorAll('ins[data-vno-change="insert"]').length, del: body.querySelectorAll('del[data-vno-change="delete"]').length, sourcePath: adapter._sourcePath });
  })()`, { awaitPromise: true, timeoutMilliseconds: 30000 }));
  assert.equal(compared.result, true);
  assert.equal(compared.ins, 1);
  assert.equal(compared.del, 1);
  assert.equal(compared.sourcePath, null);
  console.log("WORD-W3 CDP: compare PASS");

  const combined = JSON.parse(await cdp.evaluate(`(async () => {
    const adapter = window.__vnoAppInstance.adapter;
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    document.querySelector('.vno-writer-body').innerHTML = '<p>Đoạn giữ nguyên</p><p>Nội dung cũ</p>';
    const result = await bus.execute('writer.review.combine');
    const body = document.querySelector('.vno-writer-body');
    return JSON.stringify({ result, ins: body.querySelectorAll('ins[data-vno-change="insert"]').length, del: body.querySelectorAll('del[data-vno-change="delete"]').length, name: adapter.sourceFileName });
  })()`, { awaitPromise: true, timeoutMilliseconds: 30000 }));
  assert.equal(combined.result, true);
  assert.equal(combined.ins, 1);
  assert.equal(combined.del, 1);
  assert.equal(combined.name, "TaiLieuGop");
  console.log("WORD-W3 CDP: combine PASS");

  const protectedState = JSON.parse(await cdp.evaluate(`(async () => {
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    const promise = bus.execute('writer.review.restrictEditing');
    await new Promise(resolve => setTimeout(resolve, 100));
    const first = document.querySelector('#vno-writer-protect-password');
    const second = document.querySelector('#vno-writer-protect-password-confirm');
    if (!first || !second) throw new Error('Protection dialog did not open');
    first.value = 'w3-local-pass';
    second.value = 'w3-local-pass';
    document.querySelector('.vno-writer-review-dialog .vno-dialog-apply-btn').click();
    const result = await promise;
    const adapter = window.__vnoAppInstance.adapter;
    return JSON.stringify({ result, mode: adapter.documentProtection.mode, tracking: adapter.trackChangesEnabled, dialogOpen: !!document.querySelector('.vno-writer-review-dialog') });
  })()`, { awaitPromise: true, timeoutMilliseconds: 30000 }));
  assert.equal(protectedState.result, true);
  assert.equal(protectedState.mode, "trackedChanges");
  assert.equal(protectedState.tracking, true);
  assert.equal(protectedState.dialogOpen, false);
  console.log("WORD-W3 CDP: protect PASS");

  const blocked = JSON.parse(await cdp.evaluate(`(async () => {
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    const result = await bus.execute('writer.text.bold');
    const dialog = document.querySelector('.vno-dialog-overlay');
    const text = dialog?.innerText || '';
    dialog?.querySelector('.vno-dialog-ok-btn')?.click();
    return JSON.stringify({ result, hasReason: /chỉ cho phép thay đổi văn bản|only allows marked text changes/i.test(text) });
  })()`, { awaitPromise: true, timeoutMilliseconds: 10000 }));
  assert.equal(blocked.result, false);
  assert.equal(blocked.hasReason, true);
  console.log("WORD-W3 CDP: blocked command reason PASS");

  await cdp.evaluate(`(() => {
    setTimeout(() => {
      window.__wordW3UnprotectPromise = window.__vnoAppInstance.adapter.openDocumentProtectionDialog();
      const password = document.querySelector('#vno-writer-unprotect-password');
      if (!password) throw new Error('Unprotect dialog did not open');
      password.value = 'wrong-password';
      document.querySelector('.vno-writer-review-dialog .vno-dialog-apply-btn')?.click();
    }, 1000);
    return true;
  })()`, { awaitPromise: true, timeoutMilliseconds: 10000 });
  await cdp.waitFor("!!window.__wordW3UnprotectPromise && /không đúng|incorrect|not supported/i.test(document.querySelector('.vno-dialog-overlay:not(.vno-writer-review-dialog)')?.innerText || '')", { timeoutMilliseconds: 120000 });
  const wrongPassword = JSON.parse(await cdp.evaluate(`(async () => {
    const alert = document.querySelector('.vno-dialog-overlay:not(.vno-writer-review-dialog)');
    const reason = alert?.innerText || '';
    alert?.querySelector('.vno-dialog-ok-btn')?.click();
    const result = await window.__wordW3UnprotectPromise;
    delete window.__wordW3UnprotectPromise;
    return JSON.stringify({
      result,
      mode: window.__vnoAppInstance.adapter.documentProtection.mode,
      hasReason: /không đúng|incorrect|not supported/i.test(reason)
    });
  })()`, { awaitPromise: true, timeoutMilliseconds: 30000 }));
  assert.equal(wrongPassword.result, false);
  assert.equal(wrongPassword.mode, "trackedChanges");
  assert.equal(wrongPassword.hasReason, true);
  console.log("WORD-W3 CDP: wrong password rejected PASS");

  await cdp.evaluate(`(() => {
    setTimeout(() => {
      window.__wordW3UnprotectPromise = window.__vnoAppInstance.adapter.openDocumentProtectionDialog();
      const password = document.querySelector('#vno-writer-unprotect-password');
      if (!password) throw new Error('Unprotect dialog did not reopen');
      password.value = 'w3-local-pass';
      document.querySelector('.vno-writer-review-dialog .vno-dialog-apply-btn')?.click();
    }, 1000);
    return true;
  })()`, { awaitPromise: true, timeoutMilliseconds: 10000 });
  await cdp.waitFor("window.__vnoAppInstance.adapter.documentProtection.mode === 'none'", { timeoutMilliseconds: 120000 });
  const unprotected = JSON.parse(await cdp.evaluate(`(async () => {
    const result = await window.__wordW3UnprotectPromise;
    delete window.__wordW3UnprotectPromise;
    return JSON.stringify({ result, mode: window.__vnoAppInstance.adapter.documentProtection.mode });
  })()`, { awaitPromise: true, timeoutMilliseconds: 30000 }));
  assert.equal(unprotected.result, true);
  assert.equal(unprotected.mode, "none");
  console.log("WORD-W3 CDP: correct password unprotect PASS");

  const reprotected = JSON.parse(await cdp.evaluate(`(async () => {
    const promise = window.__vnoAppInstance.adapter.openDocumentProtectionDialog();
    const first = document.querySelector('#vno-writer-protect-password');
    const second = document.querySelector('#vno-writer-protect-password-confirm');
    if (!first || !second) throw new Error('Protection dialog did not reopen');
    first.value = 'w3-local-pass';
    second.value = 'w3-local-pass';
    document.querySelector('.vno-writer-review-dialog .vno-dialog-apply-btn').click();
    const result = await promise;
    return JSON.stringify({ result, mode: window.__vnoAppInstance.adapter.documentProtection.mode });
  })()`, { awaitPromise: true, timeoutMilliseconds: 120000 }));
  assert.equal(reprotected.result, true);
  assert.equal(reprotected.mode, "trackedChanges");

  const saved = JSON.parse(await cdp.evaluate(`(async () => {
    const adapter = window.__vnoAppInstance.adapter;
    const bridge = (await import('/adapters/libreoffice/common/uno-bridge.js')).globalUnoBridge;
    return JSON.stringify(await bridge.saveRealFileInPlace('writer', adapter._contentForExport(), ${JSON.stringify(output)}, null));
  })()`, { awaitPromise: true, timeoutMilliseconds: 180000 }));
  assert.equal(saved.status, "ok", JSON.stringify(saved));
  console.log("WORD-W3 CDP: protected DOCX save PASS");
} finally {
  await session.close();
}

const settingsXml = readZipEntry(output, "word/settings.xml").toString("utf8");
const documentXml = readZipEntry(output, "word/document.xml").toString("utf8");
assert.match(settingsXml, /<w:documentProtection\b[^>]*w:edit="trackedChanges"[^>]*w:enforcement="1"/);
assert.match(settingsXml, /<w:trackRevisions\b/);
assert.equal((documentXml.match(/<w:ins\b/g) || []).length, 1);
assert.equal((documentXml.match(/<w:del\b/g) || []).length, 1);

let com = { skipped: true };
if (process.platform === "win32") {
  const command = `$ErrorActionPreference='Stop';$w=New-Object -ComObject Word.Application;try{$w.Visible=$false;$d=$w.Documents.Open(${JSON.stringify(output)},$false,$true);$before=[int]$d.ProtectionType;$revisions=[int]$d.Revisions.Count;$d.Unprotect('w3-local-pass');[pscustomobject]@{ProtectionType=$before;UnprotectedType=[int]$d.ProtectionType;Revisions=$revisions}|ConvertTo-Json -Compress;$d.Close($false)}finally{$w.Quit()}`;
  com = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8", timeout: 120000 }).trim());
  assert.equal(com.ProtectionType, 0, JSON.stringify(com));
  assert.equal(com.UnprotectedType, -1, JSON.stringify(com));
  assert.equal(com.Revisions, 2, JSON.stringify(com));
}

console.log(JSON.stringify({ status: "PASS", compare: { insertions: 1, deletions: 1 }, protectionType: com.ProtectionType ?? "NOT RUN", unprotectedType: com.UnprotectedType ?? "NOT RUN", revisions: com.Revisions ?? "NOT RUN", output }));
