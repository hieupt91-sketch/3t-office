// Writer: Trộn thư > Khối địa chỉ / Lời chào - chèn trường theo hộp thoại, một bước hoàn tác, xem trước thay dữ liệu thật.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-abg-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  const exec = (id) => ev(`window.globalCommandBus.execute(${JSON.stringify(id)})`);
  const caret = () => ev(`(() => { const b = document.querySelector('.vno-writer-body'); b.innerHTML = '<p>Dau</p><p>Than</p>'; b.dispatchEvent(new Event('input', { bubbles: true })); const r = document.createRange(); r.selectNodeContents(b.querySelectorAll('p')[1]); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.focus(); })()`);
  await caret();
  // Chưa có nguồn dữ liệu: không mở hộp, không lỗi.
  const none = await exec("writer.mailMerge.addressBlock");
  check("Chưa có nguồn dữ liệu: lệnh không chèn gì", (none === false || none === undefined) && (await ev(`document.querySelectorAll('.vno-merge-field').length`)) === 0, String(none));
  await ev(`window.__vnoAppInstance.adapter.mailMergeData = { fields: ["HoTen", "DiaChi", "ThanhPho"], records: [{ HoTen: "Tran Binh", DiaChi: "1 Le Loi", ThanhPho: "Da Lat" }], sheets: [], activeSheetName: "", rawCsv: "", rawFods: "", sourceFileName: "" }`);
  // Khối địa chỉ: mặc định tích 3 trường đầu; bỏ trường thứ 3.
  exec("writer.mailMerge.addressBlock").catch(() => {});
  await cdp.waitFor("document.querySelector('.vno-ab-field')", { timeoutMilliseconds: 15000 });
  await ev(`document.querySelectorAll('.vno-ab-field')[2].click()`);
  await click(cdp, ".vno-dialog-insert-btn");
  await new Promise(r => setTimeout(r, 400));
  const addr = JSON.parse(await ev(`JSON.stringify({ fields: [...document.querySelectorAll('.vno-merge-field')].map(e => e.dataset.field), br: document.querySelectorAll('.vno-writer-body br').length })`));
  check("Khối địa chỉ: 2 trường HoTen, DiaChi, cách nhau một dòng", addr.fields.join(",") === "HoTen,DiaChi" && addr.br === 1, JSON.stringify(addr));
  await ev(`window.__vnoAppInstance.adapter.undo ? window.__vnoAppInstance.adapter.undo() : window.globalCommandBus.execute("common.edit.undo")`);
  const afterUndo = await ev(`document.querySelectorAll('.vno-merge-field').length`);
  check("Hoàn tác gỡ cả khối trong một bước", afterUndo === 0, String(afterUndo));
  // Lời chào
  await caret();
  exec("writer.mailMerge.greetingLine").catch(() => {});
  await cdp.waitFor("document.querySelector('.vno-ab-prefix')", { timeoutMilliseconds: 15000 });
  await click(cdp, ".vno-dialog-insert-btn");
  await new Promise(r => setTimeout(r, 400));
  console.log("DBG", await ev(`document.querySelector(".vno-writer-body").innerHTML + " | dlg=" + !!document.querySelector(".vno-ab-prefix")`));
  const greet = await ev(`document.querySelectorAll('.vno-writer-body p')[1].textContent`);
  check("Lời chào: «Kính gửi «HoTen»,»", greet === "Kính gửi «HoTen»,Than", greet);
  // Xem trước thay dữ liệu thật
  const hasData = await ev(`window.__vnoAppInstance.adapter._getActiveMailMergeRecords().length`);
  check("Dữ liệu nguồn vẫn còn sau khi chèn", hasData === 1, String(hasData));
  await ev(`window.__vnoAppInstance.adapter.toggleMailMergePreview({ force: true })`);
  await new Promise(r => setTimeout(r, 400));
  const pv = await ev(`document.querySelectorAll('.vno-writer-body p')[1].textContent`);
  check("Xem trước: lời chào có tên thật", pv === "Kính gửi Tran Binh,Than", pv);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
