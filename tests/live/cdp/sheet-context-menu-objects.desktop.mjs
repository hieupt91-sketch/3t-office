// Kiem tra CDP desktop cho menu chuot phai doi tuong (Shape, Picture, TextBox) va o thuong tren VN Sheet.
// Tuan thu quy tac: khong SendKeys, khong kill theo ten, chi dung session PID.

import { launchApp } from "./session.mjs";
import { mouseClick, mouseRightClick, press } from "./actions.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("sheet", { localAppData: process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\agy-ctxmenu" });
const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`);
  ok ? pass++ : fail++;
};

const center = async (sel) => JSON.parse(await ev(`JSON.stringify((() => {
  const e = document.querySelector(${JSON.stringify(sel)});
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})())`));

const menuLabels = async () => JSON.parse(await ev(`JSON.stringify(
  [...document.querySelectorAll('.vno-context-menu-item, .vno-sheet-context-item')]
    .filter(e => e.getBoundingClientRect().width > 0)
    .map(e => (e.querySelector('.vno-context-menu-label') || e).textContent.trim().replace(/\\s+/g, ' '))
)`));

const clickMenu = async (label) => {
  const p = JSON.parse(await ev(`JSON.stringify((() => {
    const e = [...document.querySelectorAll('.vno-context-menu-item, .vno-sheet-context-item')]
      .find(n => n.getBoundingClientRect().width > 0 && n.textContent.trim().startsWith(${JSON.stringify(label)}));
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })())`));
  if (!p) return false;
  await mouseClick(cdp, p.x, p.y);
  await sleep(400);
  return true;
};

const closeAll = async () => {
  await press(cdp, "Escape");
  await sleep(150);
  await press(cdp, "Escape");
  await sleep(200);
};

const grid = "window.__vnoAppInstance.grid";

try {
  // 1. Cho app Sheet khoi dong va mount luoi
  let loaded = false;
  for (let i = 0; i < 30; i++) {
    const isQuick = await ev(`Boolean(document.querySelector('.vno-sheet-quick-view'))`);
    const hasGrid = await ev(`Boolean(window.__vnoAppInstance && window.__vnoAppInstance.grid)`);
    if (!isQuick && hasGrid) {
      loaded = true;
      break;
    }
    await sleep(500);
  }
  check("App Sheet khoi dong va san sang", loaded);

  // 2. Kiem tra menu chuot phai cho HINH DANG (Shape)
  await ev(`${grid}.insertShape({ shapeType: 'rectangle', text: 'HCN Test' }, { c: 'B', r: 3 })`);
  await sleep(500);

  const shapePt = await center(".vno-sheet-shape");
  check("Hinh dang duoc chen len sheet", Boolean(shapePt));

  if (shapePt) {
    // Chuot phai vao shape
    await mouseRightClick(cdp, shapePt.x, shapePt.y);
    await sleep(400);
    let labels = await menuLabels();
    check("Chuot phai Shape: co muc Cat, Sao chep, Dan",
      labels.some(l => l.startsWith("Cắt")) &&
      labels.some(l => l.startsWith("Sao chép")) &&
      labels.some(l => l.startsWith("Dán")),
      JSON.stringify(labels)
    );
    check("Chuot phai Shape: co muc Chinh sua van ban", labels.some(l => l.startsWith("Chỉnh sửa văn bản")), JSON.stringify(labels));
    check("Chuot phai Shape: co muc Nhom, Dua len tren, Dua xuong duoi",
      labels.some(l => l.startsWith("Nhóm")) &&
      labels.some(l => l.startsWith("Đưa lên trên")) &&
      labels.some(l => l.startsWith("Đưa xuống dưới")),
      JSON.stringify(labels)
    );
    check("Chuot phai Shape: co muc Can chinh, Xoay",
      labels.some(l => l.startsWith("Căn chỉnh")) &&
      labels.some(l => l.startsWith("Xoay")),
      JSON.stringify(labels)
    );
    check("Chuot phai Shape: co Gan macro va Dat lam mac dinh",
      labels.some(l => l.startsWith("Gán macro")) &&
      labels.some(l => l.startsWith("Đặt làm hình dạng mặc định")),
      JSON.stringify(labels)
    );
    check("Chuot phai Shape: co Dinh dang hinh dang va Xoa",
      labels.some(l => l.startsWith("Định dạng hình dạng")) &&
      labels.some(l => l.startsWith("Xóa")),
      JSON.stringify(labels)
    );

    // Thu mo hop thoai Dinh dang hinh dang
    await clickMenu("Định dạng hình dạng");
    await sleep(400);
    const shapeDlgOpen = await ev(`Boolean(document.querySelector('#vno-obj-width'))`);
    check("Mo hop thoai Dinh dang hinh dang thanh cong", shapeDlgOpen);
    await closeAll();

    // Kiem tra mo menu bang phim Shift+F10 tren shape
    await mouseClick(cdp, shapePt.x, shapePt.y);
    await ev(`document.querySelector('.vno-sheet-shape')?.focus?.()`);
    await sleep(200);
    await press(cdp, "F10", { shift: true });
    await sleep(400);
    labels = await menuLabels();
    check("Shift+F10 tren Shape mo menu ngu canh", labels.some(l => l.startsWith("Cắt")), JSON.stringify(labels));
    await closeAll();
  }

  // 3. Kiem tra menu chuot phai cho HINH ANH (Picture)
  const dummyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  await ev(`${grid}.insertImage('${dummyPng}', { c: 'D', r: 3 })`);
  await sleep(500);

  const imgPt = await center(".vno-sheet-image");
  check("Hinh anh duoc chen len sheet", Boolean(imgPt));

  if (imgPt) {
    await mouseRightClick(cdp, imgPt.x, imgPt.y);
    await sleep(400);
    let labels = await menuLabels();
    check("Chuot phai Anh: co Thay doi hinh anh", labels.some(l => l.startsWith("Thay đổi hình ảnh")), JSON.stringify(labels));
    check("Chuot phai Anh: co Dinh dang doi tuong", labels.some(l => l.startsWith("Định dạng đối tượng")), JSON.stringify(labels));
    check("Chuot phai Anh: co Chu thay the va Gan macro",
      labels.some(l => l.startsWith("Chữ thay thế")) &&
      labels.some(l => l.startsWith("Gán macro")),
      JSON.stringify(labels)
    );
    await closeAll();
  }

  // 4. Kiem tra menu chuot phai cho HOP VAN BAN (TextBox)
  await ev(`${grid}.insertTextBox({ text: 'Ghi chu TextBox', anchor: { c: 'F', r: 3 } })`);
  await sleep(500);

  const tbPt = await center(".vno-sheet-textbox");
  check("Hop van ban duoc chen len sheet", Boolean(tbPt));

  if (tbPt) {
    await mouseRightClick(cdp, tbPt.x, tbPt.y);
    await sleep(400);
    let labels = await menuLabels();
    check("Chuot phai TextBox: co Chinh sua van ban va Dat lam mac dinh",
      labels.some(l => l.startsWith("Chỉnh sửa văn bản")) &&
      labels.some(l => l.startsWith("Đặt làm hộp văn bản mặc định")),
      JSON.stringify(labels)
    );
    check("Chuot phai TextBox: co Dinh dang hop van ban", labels.some(l => l.startsWith("Định dạng hộp văn bản")), JSON.stringify(labels));
    await closeAll();
  }

  // 5. Kiem tra chuot phai o thuong van ra menu ngu canh o chuan
  // Bo chon tat ca doi tuong
  await ev(`${grid}.selectedObjectIds.clear()`);
  await ev(`${grid}.selectedShapeId = null`);
  await ev(`${grid}.selectedImageId = null`);
  await ev(`${grid}.selectedTextBoxId = null`);
  await ev(`${grid}.selectCell('B', 10)`);
  await sleep(200);

  const cellPt = await center("td[data-col='B'][data-row='10'], td[data-col='B']");
  if (cellPt) {
    await mouseRightClick(cdp, cellPt.x, cellPt.y);
    await sleep(400);
    const cellLabels = await menuLabels();
    check("Chuot phai o thuong: co Chen, Xoa, Dinh dang o, Dan dac biet",
      cellLabels.some(l => l.startsWith("Cắt")) &&
      cellLabels.some(l => l.startsWith("Sao chép")) &&
      cellLabels.some(l => l.startsWith("Dán đặc biệt")) &&
      cellLabels.some(l => l.startsWith("Chèn")) &&
      cellLabels.some(l => l.startsWith("Xóa")) &&
      cellLabels.some(l => l.startsWith("Định dạng ô")),
      JSON.stringify(cellLabels)
    );
    await closeAll();
  } else {
    // Neu query td khong ra, goi showContextMenu truc tiep qua grid de test
    await ev(`${grid}.showContextMenu({ clientX: 200, clientY: 200, preventDefault() {} }, 'cell', 'B10')`);
    await sleep(400);
    const cellLabels = await menuLabels();
    check("Menu o thuong truc tiep: co Chen, Xoa, Dinh dang o",
      cellLabels.some(l => l.startsWith("Cắt")) &&
      cellLabels.some(l => l.startsWith("Chèn")) &&
      cellLabels.some(l => l.startsWith("Định dạng ô")),
      JSON.stringify(cellLabels)
    );
    await closeAll();
  }

} catch (err) {
  console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err);
  fail++;
} finally {
  console.log(`==================================================`);
  console.log(`KET QUA TEST CDP DESKTOP: ${pass}/${pass + fail} PASS | ${fail} FAIL`);
  console.log(`==================================================`);
  try {
    await session.close();
  } catch {}
}
