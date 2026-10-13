// Kiem tra menu chuot phai Sheet (o / tieu de hang / tieu de cot / tab trang tinh) tren app desktop qua CDP.
// So voi Excel 2016: thu tu, muc bat buoc; thuc thi Chen.../Loc theo gia tri/Chen ghi chu/Sieu lien ket.
import { launchApp } from "./session.mjs";
import { mouseClick, mouseRightClick, press } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("sheet", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const center = async (sel) => JSON.parse(await ev(`JSON.stringify((() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })())`));
const menuLabels = async () => JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-context-menu-item, .vno-sheet-context-item')].filter(e => e.getBoundingClientRect().width > 0).map(e => (e.querySelector('.vno-context-menu-label') || e).textContent.trim().replace(/\\s+/g, ' ')))`));
const clickMenu = async (label) => {
  const p = JSON.parse(await ev(`JSON.stringify((() => { const e = [...document.querySelectorAll('.vno-context-menu-item, .vno-sheet-context-item')].find(n => n.getBoundingClientRect().width > 0 && n.textContent.trim().startsWith(${JSON.stringify(label)})); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })())`));
  if (!p) return false; await mouseClick(cdp, p.x, p.y); await sleep(400); return true;
};
const closeAll = async () => { await press(cdp, "Escape"); await press(cdp, "Escape"); await sleep(200); };
const grid = "window.__vnoAppInstance.grid";
try {
  await sleep(3000);
  await ev(`(() => { const g = ${grid}; g.setCellValue('A', 1, 'Tên'); g.setCellValue('B', 1, 'SL'); g.setCellValue('A', 2, 'x'); g.setCellValue('B', 2, 1); g.setCellValue('A', 3, 'y'); g.setCellValue('B', 3, 2); g.setCellValue('A', 4, 'x'); g.setCellValue('B', 4, 3); return true; })()`);
  await sleep(500);

  // --- Menu o ---
  await mouseClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="A2"]')));
  await mouseRightClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="A2"]')));
  await sleep(500);
  let labels = await menuLabels();
  const order = ["Cắt", "Sao chép", "Dán", "Dán đặc biệt", "Chèn...", "Xóa...", "Xóa nội dung", "Lọc", "Sắp xếp", "Chèn ghi chú", "Định dạng ô...", "Xác định tên...", "Siêu liên kết..."];
  const idx = order.map((o) => labels.findIndex((l) => l.startsWith(o)));
  check("Menu ô có đủ mục theo Excel", idx.every((i) => i >= 0), JSON.stringify(labels));
  check("Menu ô đúng thứ tự Excel", idx.every((i, k) => k === 0 || i > idx[k - 1]), JSON.stringify(idx));

  // Chèn... mở hộp thoại
  await clickMenu("Chèn...");
  const insDlg = await ev(`!!document.querySelector('[role="dialog"], .vno-dialog, .vno-modal')`);
  check("Chèn... mở hộp thoại chèn ô", insDlg === true);
  await closeAll();

  // Lọc theo giá trị của ô đã chọn: A2='x' -> ẩn hàng 3 (y)
  await mouseRightClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="A2"]')));
  await sleep(400);
  await clickMenu("Lọc");
  await sleep(300);
  await clickMenu("Lọc theo giá trị của ô đã chọn");
  const hidden = JSON.parse(await ev(`JSON.stringify([...${grid}.hiddenRows])`));
  check("Lọc theo giá trị ô ẩn đúng hàng (hàng 3)", hidden.includes(3) && !hidden.includes(2) && !hidden.includes(4), JSON.stringify(hidden));
  await mouseRightClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="A2"]')));
  await sleep(400); await clickMenu("Lọc"); await sleep(300); await clickMenu("Xóa bộ lọc");
  const hidden2 = JSON.parse(await ev(`JSON.stringify([...${grid}.hiddenRows])`));
  check("Xóa bộ lọc hiện lại mọi hàng", hidden2.length === 0, JSON.stringify(hidden2));

  // Ghi chú: Chèn ghi chú -> hộp thoại; đặt qua API rồi menu đổi thành Sửa/Xóa
  await ev(`${grid}.saveComment({ coord: 'A2', text: 'ghi chu thu' })`);
  await mouseRightClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="A2"]')));
  await sleep(400);
  labels = await menuLabels();
  check("Ô có ghi chú: menu hiện Sửa/Xóa ghi chú", labels.some((l) => l.startsWith("Sửa ghi chú")) && labels.some((l) => l.startsWith("Xóa ghi chú")), JSON.stringify(labels));
  await clickMenu("Xóa ghi chú");
  const gone = await ev(`!${grid}.commentsBySheet[${grid}.activeSheet]?.A2`);
  check("Xóa ghi chú gỡ ghi chú khỏi ô", gone === true);

  // Siêu liên kết: chèn qua API, menu hiện Mở/Xóa
  await ev(`(() => { ${grid}.selectedCoord = { c: 'A', r: 4 }; return ${grid}.insertHyperlink('https://example.com', 'lk'); })()`);
  await mouseClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="A4"]')));
  await mouseRightClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="A4"]')));
  await sleep(400);
  labels = await menuLabels();
  check("Ô có liên kết: menu hiện Mở/Xóa siêu liên kết", labels.some((l) => l.startsWith("Mở siêu liên kết")) && labels.some((l) => l.startsWith("Xóa siêu liên kết")), JSON.stringify(labels));
  await clickMenu("Xóa siêu liên kết");
  check("Xóa siêu liên kết gỡ liên kết", (await ev(`!${grid}.cellsData.get('A4')?.hyperlink`)) === true);

  // --- Menu tiêu đề hàng ---
  await mouseRightClick(cdp, ...Object.values(await center('th[data-row="3"], .vno-row-header[data-row="3"], tr[data-row="3"] th')));
  await sleep(400);
  labels = await menuLabels();
  const rowNeeds = ["Cắt", "Sao chép", "Dán", "Dán đặc biệt...", "Chèn", "Xóa", "Xóa nội dung", "Định dạng ô...", "Chiều cao hàng...", "Ẩn", "Hiện"];
  check("Menu hàng có đủ mục như Excel", rowNeeds.every((n) => labels.some((l) => l.startsWith(n))), JSON.stringify(labels));
  await clickMenu("Chiều cao hàng...");
  check("Chiều cao hàng... mở hộp thoại", (await ev(`!!document.querySelector('[role="dialog"], .vno-dialog, .vno-modal')`)) === true);
  await closeAll();

  // --- Menu tiêu đề cột ---
  await mouseRightClick(cdp, ...Object.values(await center('th[data-col="B"], .vno-col-header[data-col="B"]')));
  await sleep(400);
  labels = await menuLabels();
  const colNeeds = ["Cắt", "Sao chép", "Dán", "Dán đặc biệt...", "Chèn", "Xóa", "Xóa nội dung", "Định dạng ô...", "Độ rộng cột...", "Ẩn", "Hiện"];
  check("Menu cột có đủ mục như Excel", colNeeds.every((n) => labels.some((l) => l.startsWith(n))), JSON.stringify(labels));
  await clickMenu("Độ rộng cột...");
  check("Độ rộng cột... mở hộp thoại", (await ev(`!!document.querySelector('[role="dialog"], .vno-dialog, .vno-modal')`)) === true);
  await closeAll();

  // --- Menu o trong bang (Table) ---
  await ev(`(() => { const g = ${grid}; g.selectCell('A', 1); g.selectCell('B', 4, true); g.formatAsTable('tableBlue'); return true; })()`);
  await sleep(500);
  await mouseClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="B3"]')));
  await mouseRightClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="B3"]')));
  await sleep(400);
  labels = await menuLabels();
  check("Ô trong bảng: menu có Chọn và Bảng", labels.some((l) => l.startsWith("Chọn")) && labels.some((l) => l.startsWith("Bảng")), JSON.stringify(labels));
  await clickMenu("Chọn"); await sleep(300); await clickMenu("Dữ liệu cột của bảng");
  const rng = await ev(`JSON.stringify(${grid}._rangeLabel(${grid}.selectionRange))`);
  check("Chọn dữ liệu cột bảng = B2:B4", JSON.parse(rng) === "B2:B4", rng);
  await mouseRightClick(cdp, ...Object.values(await center('.vno-grid-cell[data-coord="B3"]')));
  await sleep(400); await clickMenu("Bảng"); await sleep(300); await clickMenu("Chuyển thành phạm vi");
  const tcount = await ev(`(${grid}.tablesBySheet[${grid}.activeSheet] || []).length`);
  check("Chuyển thành phạm vi gỡ bảng", tcount === 0, String(tcount));
  // --- Menu tab trang tính ---
  await mouseRightClick(cdp, ...Object.values(await center('.vno-sheet-tab-item')));
  await sleep(400);
  labels = await menuLabels();
  const tabOrder = ["Chèn trang tính", "Xóa trang tính", "Đổi tên", "Di chuyển", "Bảo vệ trang tính", "Màu tab", "Ẩn trang tính"];
  const ti = tabOrder.map((o) => labels.findIndex((l) => l.startsWith(o)));
  check("Menu tab trang tính đúng mục và thứ tự Excel", ti.every((i, k) => i >= 0 && (k === 0 || i > ti[k - 1])), JSON.stringify(labels));
  const before = (await ev(`${grid}.sheets.length`));
  await clickMenu("Chèn trang tính");
  const after = (await ev(`${grid}.sheets.length`));
  check("Chèn trang tính thêm một trang", after === before + 1, `${before} -> ${after}`);
} finally {
  console.log(`SUMMARY ${pass}/${pass + fail} PASS, ${fail} FAIL`);
  try { await session.close(); } catch {}
}