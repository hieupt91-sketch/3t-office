// Writer: bật theo dõi thay đổi, thêm chú thích cuối trang và gõ nội dung chú thích → vẫn lưu được DOCX
// (lỗi gốc: "LibreOffice không giữ được dấu neo vno-review-start-..." vì dấu neo nằm trong footnotes.xml).
import { launchApp } from "./session.mjs";
import { sleep, click, typeText } from "./actions.mjs";
const OUT = process.env.VNO_FNTRACK_OUT || "E:\\VNOffice-profiles\\ui-shots\\fn-track.docx";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 240000 });
  await sleep(2500);
  await click(cdp, ".vno-writer-body p");
  await typeText(cdp, "Một đoạn văn có chú thích", 5);
  await sleep(500);
  check("Chữ thân bài đã gõ vào tài liệu", (await ev(`document.querySelector('.vno-writer-body').innerText`)).includes("Một đoạn văn có chú thích"), (await ev(`document.querySelector('.vno-writer-body').innerHTML.slice(0, 160)`)));
  await ev(`window.globalCommandBus.execute("writer.trackChanges.toggle")`); await sleep(400);
  await ev(`window.globalCommandBus.execute("writer.reference.footnoteInsert")`); await sleep(700);
  await typeText(cdp, "Nội dung chú thích.", 5);
  const hasIns = await ev(`!!document.querySelector('.vno-footnote-item ins')`);
  check("Chữ gõ trong chú thích khi theo dõi thay đổi là <ins>", hasIns === true);
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter; const r = await window.pywebview.api.save_document_in_place(a._contentForExport(), 'writer', ${JSON.stringify(OUT)}, null); return JSON.stringify({ status: r.status, message: (r.message || '').slice(0, 140) }); })()`);
  check("Lưu DOCX thành công", /"status":"ok"/.test(saved), saved);
  // Thay đổi theo dõi ở nội dung chính vẫn được giữ
  await ev(`(() => { const p = document.querySelector('.vno-writer-body p'); const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let t = w.nextNode(); while (t && t.textContent.length < 3) t = w.nextNode(); const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 3); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.querySelector('.vno-writer-body').focus(); return 1; })()`);
  await typeText(cdp, "Hai", 5);
  const bodyTrack = await ev(`document.querySelectorAll('.vno-writer-body > p ins, .vno-writer-body > p del').length`);
  const saved2 = await ev(`(async () => { const a = window.__vnoAppInstance.adapter; const r = await window.pywebview.api.save_document_in_place(a._contentForExport(), 'writer', ${JSON.stringify(OUT.replace('.docx', '-2.docx'))}, null); return r.status; })()`);
  check("Sửa nội dung chính có theo dõi + chú thích: lưu thành công", bodyTrack >= 1 && saved2 === "ok", `ins/del=${bodyTrack} save=${saved2}`);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);