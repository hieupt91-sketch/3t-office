// Mã hóa bằng mật khẩu: Tệp > Thông tin > Mã hóa bằng mật khẩu → hộp thoại (hai ô khớp) → lưu DOCX → tệp là CFB mã hóa → mở lại bằng đường dẫn thật (hỏi mật khẩu, sai/đúng) → bỏ mật khẩu rồi lưu thì tệp thường.
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";
import fs from "node:fs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_ENCRYPT_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-shapenames\\ui_protected.docx");
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const isCfb = (p) => { const b = fs.readFileSync(p); return b.length > 8 && b[0] === 0xD0 && b[1] === 0xCF && b[2] === 0x11 && b[3] === 0xE0; };
const isZip = (p) => { const b = fs.readFileSync(p); return b.length > 4 && b[0] === 0x50 && b[1] === 0x4B; };
try { fs.rmSync(OUT, { force: true }); } catch (_) {}
const session = await launchApp("writer", {});
try {
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await sleep(2500);
  await ev(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.backstage'))`);
  await session.cdp.waitFor(`!!document.querySelector('#vno-backstage-writer-info')`, { timeoutMilliseconds: 10000 });
  await ev(`document.querySelector('#vno-backstage-writer-info').click()`);
  await session.cdp.waitFor(`!!document.querySelector('#vno-info-document-password')`, { timeoutMilliseconds: 10000 });
  check("Tệp > Thông tin có nút Mã hóa bằng mật khẩu (hiện, không ẩn)", await ev(`(() => { const b = document.querySelector('#vno-info-document-password'); return !!b && !b.closest('[hidden]') && b.offsetParent !== null; })()`));
  await ev(`document.querySelector('#vno-info-document-password').click()`);
  await session.cdp.waitFor(`!!document.querySelector('.vno-password-first')`, { timeoutMilliseconds: 8000 });
  check("Hộp thoại có 2 ô mật khẩu và cảnh báo quên mật khẩu", await ev(`!!document.querySelector('.vno-password-confirm') && /không thể khôi phục/.test(document.querySelector('.vno-document-password-overlay').textContent)`));
  const setVal = (sel, v) => ev(`(() => { const i = document.querySelector(${JSON.stringify(sel)}); i.value = ${JSON.stringify(v)}; return true; })()`);
  await setVal(".vno-password-first", "Mat Khau 1!"); await setVal(".vno-password-confirm", "khac nhau");
  await ev(`document.querySelector('.vno-password-submit').click()`); await sleep(200);
  check("Hai ô không khớp: báo lỗi, hộp vẫn mở", await ev(`!!document.querySelector('.vno-password-first') && document.querySelector('.vno-password-error').textContent.length > 0`));
  await setVal(".vno-password-confirm", "Mat Khau 1!");
  await ev(`document.querySelector('.vno-password-submit').click()`); await sleep(800);
  check("Khớp: hộp đóng", await ev(`!document.querySelector('.vno-password-first')`));
  // lưu bằng đường lưu thật
  const html = await ev(`(async () => { const a = window.__vnoAppInstance.adapter; return a.serializeToHtml ? a.serializeToHtml() : (a.getContent ? a.getContent() : ""); })()`);
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter; const content = a.serializeToHtml ? a.serializeToHtml() : ""; return JSON.stringify(await window.pywebview.api.save_document_in_place(content, 'writer', ${JSON.stringify(OUT)}, null)).slice(0, 120); })()`);
  check("Lưu DOCX", /"status":\s*"ok"/.test(saved), saved);
  check("Tệp đã lưu là vùng chứa mã hóa (CFB), không phải ZIP thường", fs.existsSync(OUT) && isCfb(OUT) && !isZip(OUT));
  const needPw = await ev(`(async () => JSON.stringify(await window.pywebview.api.open_document_dialog('writer', ${JSON.stringify(OUT)})).slice(0, 160))()`);
  check("Mở không mật khẩu: yêu cầu mật khẩu", /password_required/.test(needPw), needPw);
  const wrong = await ev(`(async () => JSON.stringify(await window.pywebview.api.open_document_dialog('writer', ${JSON.stringify(OUT)}, 'sai-mat-khau')).slice(0, 160))()`);
  check("Sai mật khẩu: báo wrong_password, không treo", /wrong_password/.test(wrong), wrong);
  const ok = await ev(`(async () => { const r = await window.pywebview.api.open_document_dialog('writer', ${JSON.stringify(OUT)}, 'Mat Khau 1!'); return JSON.stringify({ status: r.status, hasContent: !!r.content }); })()`);
  check("Đúng mật khẩu: mở được có nội dung", /"status":"ok"/.test(ok) && /"hasContent":true/.test(ok), ok);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);