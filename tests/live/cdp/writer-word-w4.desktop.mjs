// WORD-W4 nghiem thu tren desktop: Quy tac tron thu, Danh dau/Chen chi muc, Quick Parts, Ngat tu tu dong -> DOCX -> Word COM.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { readZipEntry } from "../../helpers/zip-package.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated WORD-W4 profile.");
fs.mkdirSync(profile, { recursive: true });
const output = path.join(profile, "word-w4-result.docx");
try { fs.unlinkSync(output); } catch {}
const checks = [];
const check = (id, pass, detail = "") => { checks.push({ id, pass: Boolean(pass), detail }); console.log(`${pass ? "PASS" : "FAIL"} | ${id}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const run = async script => JSON.parse(await cdp.evaluate(`(async () => { const adapter = window.__vnoAppInstance.adapter; const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus; const body = document.querySelector('.vno-writer-body'); ${script} })()`, { awaitPromise: true, timeoutMilliseconds: 60000 }));

  await run(`body.innerHTML = '<p>Bao cao thuong nien cua cong ty Alpha va Beta.</p><p>Chi muc can danh dau: Gamma Delta.</p><p>Doan ket thuc.</p>'; return JSON.stringify(true);`);

  const marks = await run(`
    const mark = (text) => { const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT); let node; while ((node = walker.nextNode())) { const i = node.data.indexOf(text); if (i >= 0) { const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + text.length); return r; } } return null; };
    const out = [];
    for (const term of ['Alpha', 'Beta', 'Gamma Delta']) { const r = mark(term); out.push(adapter.markIndexEntry({ range: r, term })); }
    return JSON.stringify({ out, entries: body.querySelectorAll('[data-index-entry]').length });`);
  check("W4-I01 danh dau 3 muc", marks.entries === 3 && marks.out.every(Boolean), JSON.stringify(marks.out));

  const idx = await run(`const ok = adapter.insertAlphabeticalIndex(); return JSON.stringify({ ok, block: !!body.querySelector('[data-index-block="true"]'), text: (body.querySelector('[data-index-block="true"]')||{}).innerText || '' });`);
  check("W4-I02 chen chi muc chu cai", idx.ok === true && idx.block, idx.text.replace(/\s+/g, " ").slice(0, 80));

  const qp = await run(`
    const store = (await import('/apps/writer/writer-w4.js')).WriterBuildingBlockStore;
    const saved = await adapter.openQuickPartsDialog({ action: 'save', name: 'Chu ky W4', html: '<p>Tran trong,<br>Nguyen Van A</p>' });
    const list = new store().list();
    const block = list.find(x => x.name === 'Chu ky W4');
    const inserted = block ? await adapter.openQuickPartsDialog({ action: 'insert', id: block.id }) : false;
    const found = /Nguyen Van A/.test(body.innerText);
    const removed = block ? await adapter.openQuickPartsDialog({ action: 'delete', id: block.id }) : false;
    const after = new store().list().some(x => x.name === 'Chu ky W4');
    return JSON.stringify({ saved, hasBlock: !!block, inserted, found, removed, after });`);
  check("W4-Q01 luu khoi dung san", qp.saved === true && qp.hasBlock);
  check("W4-Q02 chen khoi dung san", qp.inserted === true && qp.found);
  check("W4-Q03 xoa khoi dung san", qp.removed === true && qp.after === false);

  const rules = await run(`
    const r1 = await adapter.insertMailMergeRule({ type: 'skipIf', field: 'Ten', op: 'equals', value: 'X' });
    const r2 = await adapter.insertMailMergeRule({ type: 'nextIf', field: 'Ten', op: 'notEquals', value: 'Y' });
    const r3 = await adapter.insertMailMergeRule({ type: 'ifThenElse', field: 'Ten', op: 'equals', value: 'An', then: 'Chao anh', otherwise: 'Chao chi' });
    const r4 = await adapter.insertMailMergeRule({ type: 'fillIn', prompt: 'Nhap dia chi', defaultText: 'Ha Noi' });
    return JSON.stringify({ r1, r2, r3, r4, skip: body.querySelectorAll('[data-merge-rule="skipIf"]').length, next: body.querySelectorAll('[data-merge-rule="nextIf"]').length, ifs: body.querySelectorAll('[data-merge-if]').length, fill: body.querySelectorAll('[data-merge-rule="fillIn"]').length });`);
  check("W4-R01 Bo qua ban ghi neu", rules.r1 === true && rules.skip === 1);
  check("W4-R02 Ban ghi ke neu", rules.r2 === true && rules.next === 1);
  check("W4-R03 Neu...Thi...Khac", rules.r3 === true && rules.ifs === 1);
  check("W4-R04 Dien vao", rules.r4 === true && rules.fill === 1);

  const hy = await run(`const on = adapter.setAutomaticHyphenation('auto'); const marker = !!body.querySelector('[data-hyphenation="auto"]'); return JSON.stringify({ on, marker });`);
  check("W4-H01 bat ngat tu", hy.on === true && hy.marker);

  const saved = await run(`const bridge = (await import('/adapters/libreoffice/common/uno-bridge.js')).globalUnoBridge; return JSON.stringify(await bridge.saveRealFileInPlace('writer', adapter._contentForExport(), ${JSON.stringify(output)}, null));`);
  check("W4-save DOCX", saved.status === "ok", JSON.stringify(saved).slice(0, 200));
} finally { await session.close(); }

let docXml = "", settingsXml = "";
try { docXml = readZipEntry(output, "word/document.xml").toString("utf8"); settingsXml = readZipEntry(output, "word/settings.xml").toString("utf8"); } catch (e) { check("W4-docx doc", false, String(e)); }
const instr = [...docXml.matchAll(/<w:instrText[^>]*>([^<]*)<\/w:instrText>/g)].map(m => m[1].trim());
const simple = [...docXml.matchAll(/<w:fldSimple[^>]*w:instr="([^"]*)"/g)].map(m => m[1].trim());
const codes = [...instr, ...simple];
console.log("FIELD CODES:", JSON.stringify(codes));
check("W4-X01 XE trong DOCX", codes.filter(c => /^XE\b/.test(c)).length === 3, `XE=${codes.filter(c => /^XE\b/.test(c)).length}`);
check("W4-X02 INDEX trong DOCX", codes.some(c => /^INDEX\b/.test(c)));
check("W4-X03 SKIPIF", codes.some(c => /^SKIPIF\b/.test(c)));
check("W4-X04 NEXTIF", codes.some(c => /^NEXTIF\b/.test(c)));
check("W4-X05 IF", codes.some(c => /^IF\b/.test(c)));
check("W4-X06 FILLIN", codes.some(c => /^FILLIN\b/.test(c)));
check("W4-X07 autoHyphenation", /<w:autoHyphenation\b(?![^>]*w:val="(0|false)")/.test(settingsXml));

if (process.platform === "win32") {
  const command = `$ErrorActionPreference='Stop';$w=New-Object -ComObject Word.Application;try{$w.Visible=$false;$d=$w.Documents.Open(${JSON.stringify(output)},$false,$true);$types=@();foreach($f in $d.Fields){$types+=[int]$f.Type};[pscustomobject]@{Auto=[bool]$d.AutoHyphenation;Types=$types;Fields=[int]$d.Fields.Count;Indexes=[int]$d.Indexes.Count}|ConvertTo-Json -Compress;$d.Close($false)}finally{$w.Quit()}`;
  try {
    const com = JSON.parse(execFileSync("powershell.exe", ["-NoProfile", "-Command", command], { encoding: "utf8", timeout: 180000 }).trim());
    console.log("COM:", JSON.stringify(com));
    check("W4-C01 Word thay chi muc", com.Indexes >= 1, `Indexes=${com.Indexes}`);
    check("W4-C02 Word thay XE", com.Types.filter(x => x === 4).length === 3, `XE=${com.Types.filter(x => x === 4).length}`);
    check("W4-C03 Word thay IF", com.Types.includes(7));
    check("W4-C04 Word thay FILLIN", com.Types.includes(39));
    check("W4-C05 Word thay SKIPIF", com.Types.includes(43));
    check("W4-C06 Word thay NEXTIF", com.Types.includes(42));
    check("W4-C07 Word AutoHyphenation", com.Auto === true);
  } catch (e) { check("W4-COM", false, String(e).slice(0, 200)); }
}
const failed = checks.filter(c => !c.pass);
console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exitCode = 1;
