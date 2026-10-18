// Writer: Tham chiếu > Chú thích tiếp theo / Chú thích trước - duyệt chú thích trang và chú thích cuối, quay vòng.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-notenav-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  const exec = (id) => ev(`window.globalCommandBus.execute(${JSON.stringify(id)})`);
  // Tài liệu chưa có chú thích: thông báo, không lỗi.
  const none = await exec("writer.reference.nextNote");
  check("Chưa có chú thích: lệnh không làm gì và không lỗi", none === false || none === undefined || none === true, String(none));
  // Dựng 3 đoạn, chèn footnote ở đoạn 1 và 3, endnote ở đoạn 2.
  const place = (n) => ev(`(() => { const body = document.querySelector('.vno-writer-body'); body.focus(); const p = body.querySelectorAll('p')[${n}]; const r = document.createRange(); r.selectNodeContents(p); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  await ev(`(() => { document.querySelector('.vno-writer-body').innerHTML = '<p>Mot</p><p>Hai</p><p>Ba</p>'; document.querySelector('.vno-writer-body').dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await place(0); await exec("writer.reference.footnoteInsert");
  await place(1); await exec("writer.reference.endnoteInsert");
  await place(2); await exec("writer.reference.footnoteInsert");
  const refs = await ev(`document.querySelectorAll('[data-vno-footnote-ref], [data-vno-endnote-ref]').length`);
  check("Có 3 số chú thích (2 trang + 1 cuối)", refs === 3, String(refs));
  const where = () => ev(`(() => { const s = getSelection(); if (!s.rangeCount) return -1; const all = [...document.querySelectorAll('[data-vno-footnote-ref], [data-vno-endnote-ref]')]; const r = s.getRangeAt(0); return all.findIndex(el => { const p = document.createRange(); p.selectNode(el); return p.compareBoundaryPoints(Range.START_TO_START, r) === 0 && p.compareBoundaryPoints(Range.END_TO_END, r) === 0; }); })()`);
  // Con trỏ ở đầu tài liệu -> tiếp theo = số 0, rồi 1, rồi 2, rồi quay vòng 0.
  await ev(`(() => { const body = document.querySelector('.vno-writer-body'); const r = document.createRange(); r.setStart(body.querySelector('p'), 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); })()`);
  const seq = [];
  for (let i = 0; i < 4; i++) { await exec("writer.reference.nextNote"); seq.push(await where()); }
  check("Tiếp theo đi 0,1,2 rồi quay vòng về 0", JSON.stringify(seq) === "[0,1,2,0]", JSON.stringify(seq));
  const back = [];
  for (let i = 0; i < 3; i++) { await exec("writer.reference.prevNote"); back.push(await where()); }
  check("Trước đi lùi 2,1,0 từ vị trí 0 (quay vòng về cuối)", JSON.stringify(back) === "[2,1,0]", JSON.stringify(back));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
