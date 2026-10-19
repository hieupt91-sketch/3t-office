// Slides: Ngăn chọn đổi tên (nhấp đúp / F2), ẩn/hiện, hoàn tác; lưu PPTX; mở lại. PowerPoint COM: scripts/audit-0610/ppt_shape_names_readback.ps1
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const OUT = process.env.VNO_SHAPENAMES_OUT || "E:\\VNOffice-profiles\\claude-shapenames\\shape_names.pptx";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const canvas = "window.__vnoAppInstance.adapter.canvas";
let session = await launchApp("slides", {});
try {
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await sleep(2500);
  await ev(`(() => { const c = ${canvas}; c.slides[0].shapes.length = 0; c.slides[0].shapes.push(
    { id: "box1", type: "rect", x: 60, y: 80, w: 200, h: 100, color: "#3b82f6", fill: "#3b82f6" },
    { id: "oval1", type: "ellipse", x: 320, y: 80, w: 160, h: 100, color: "#ef4444", fill: "#ef4444" },
    { id: "box2", type: "rect", x: 60, y: 240, w: 200, h: 100, color: "#22c55e", fill: "#22c55e" }); c._renderShapesLayer(); })()`);
  await ev(`${canvas}.toggleSelectionPane(true)`);
  await sleep(400);
  const labels = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-selection-pane-label')].map(n => n.textContent))`));
  check("Ngăn chọn liệt kê 3 hình (trên cùng trước)", labels.length === 3, JSON.stringify(labels));
  // Đổi tên bằng nhấp đúp
  await ev(`(() => { const row = document.querySelector('.vno-selection-pane-item[data-sel-id="box1"]'); row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); })()`);
  await sleep(200);
  const hasInput = await ev(`!!document.querySelector('.vno-selection-pane-rename')`);
  check("Nhấp đúp mở ô đổi tên", hasInput === true);
  await ev(`(() => { const i = document.querySelector('.vno-selection-pane-rename'); i.value = 'Nút "Gửi" <b>1</b>'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
  await sleep(300);
  let names = JSON.parse(await ev(`JSON.stringify(${canvas}.slides[0].shapes.map(s => s.name || null))`));
  check("Tên mới vào mô hình (nguyên văn, có dấu nháy và thẻ)", names[0] === 'Nút "Gửi" <b>1</b>', JSON.stringify(names));
  const safe = await ev(`!document.querySelector('.vno-selection-pane-label b')`);
  check("Ngăn chọn không hiểu tên là HTML", safe === true);
  // F2 đổi tên hình thứ hai, Esc hủy
  await ev(`(() => { const row = document.querySelector('.vno-selection-pane-item[data-sel-id="oval1"]'); row.focus(); row.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true })); })()`);
  await sleep(200);
  await ev(`(() => { const i = document.querySelector('.vno-selection-pane-rename'); i.value = 'Bỏ'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); })()`);
  await sleep(200);
  names = JSON.parse(await ev(`JSON.stringify(${canvas}.slides[0].shapes.map(s => s.name || null))`));
  check("F2 rồi Esc: hủy, không đổi tên", names[1] === null, JSON.stringify(names));
  await ev(`(() => { const row = document.querySelector('.vno-selection-pane-item[data-sel-id="oval1"]'); row.focus(); row.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true })); })()`);
  await sleep(200);
  await ev(`(() => { const i = document.querySelector('.vno-selection-pane-rename'); i.value = 'Elip Đỏ'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);
  await sleep(300);
  // Ẩn hình thứ ba bằng nút con mắt
  await ev(`document.querySelector('.vno-selection-pane-item[data-sel-id="box2"] [data-sel-hidden]').click()`);
  await sleep(300);
  const hid = await ev(`(() => { const s = ${canvas}.slides[0].shapes[2]; const el = document.querySelector('.vno-slide-shape-item[data-shape-id="box2"]'); return JSON.stringify({ hidden: !!s.hidden, display: el && el.style.display }); })()`);
  check("Nút con mắt ẩn hình (mô hình + canvas)", JSON.parse(hid).hidden === true && JSON.parse(hid).display === "none", hid);
  // Hoàn tác: hiện lại, rồi tên Elip Đỏ
  await ev(`${canvas}.undo()`); await sleep(300);
  const afterUndo1 = await ev(`!!${canvas}.slides[0].shapes[2].hidden`);
  check("Hoàn tác: hình hiện lại", afterUndo1 === false);
  await ev(`${canvas}.undo()`); await sleep(300);
  const afterUndo2 = await ev(`${canvas}.slides[0].shapes[1].name || null`);
  check("Hoàn tác tiếp: bỏ tên Elip Đỏ", afterUndo2 === null, String(afterUndo2));
  await ev(`${canvas}.redo()`); await ev(`${canvas}.redo()`); await sleep(300);
  const redo = JSON.parse(await ev(`JSON.stringify(${canvas}.slides[0].shapes.map(s => ({ n: s.name || null, h: !!s.hidden })))`));
  check("Làm lại 2 bước khôi phục tên và trạng thái ẩn", redo[1].n === "Elip Đỏ" && redo[2].h === true, JSON.stringify(redo));
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
session = await launchApp("slides", { filePath: OUT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await session.cdp.waitFor(`${canvas}.imported === true`, { timeoutMilliseconds: 120000 });
  await sleep(1500);
  const got = JSON.parse(await ev(`JSON.stringify(${canvas}.slides[0].shapes.map(s => ({ id: String(s.id), n: s.name || null, h: !!s.hidden })))`));
  const byName = new Map(got.map((g) => [g.n, g]));
  const named = got.filter((g) => g.n);
  check("Mở lại: 3 hình có tên (hai khung mẫu không tên bỏ qua)", named.length === 3, JSON.stringify(got));
  check("Mở lại: tên 'Nút \"Gửi\" <b>1</b>' còn nguyên", byName.has('Nút "Gửi" <b>1</b>'), JSON.stringify(got.map((g) => g.n)));
  check("Mở lại: tên 'Elip Đỏ' còn", byName.has("Elip Đỏ"));
  check("Mở lại: đúng một hình ẩn và là hình thứ ba", got.filter((g) => g.h).length === 1 && got.find((g) => g.h)?.n === "Hình chữ nhật 1", JSON.stringify(got));
} catch (error) {
  check("Mở lại không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);