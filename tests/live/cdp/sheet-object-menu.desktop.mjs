// Kiem tra menu chuot phai doi tuong Sheet (hinh anh, hop van ban) va nhom Trang tinh trong Thiet lap trang tren app desktop qua CDP.
// Tuan thu quy tac: khong SendKeys OS, khong kill tien trinh theo ten, chi dung session PID.
import { launchApp } from "./session.mjs";
import { mouseClick, mouseRightClick, press } from "./actions.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("sheet", { localAppData: process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\agy-g5" });
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
  // Cho app khoi dong day du, doi thoat man hinh quick-view neu co
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
  check("App Sheet khoi dong va tai mo hinh day du", loaded);

  // 1. Kiem tra menu chuot phai cho HINH ANH
  const dummyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  await ev(`${grid}.insertImage('${dummyPng}', { c: 'B', r: 2 })`);
  await sleep(500);

  const imgPt = await center(".vno-sheet-image");
  check("Hinh anh duoc chen len sheet", Boolean(imgPt));

  // Click chuot phai vao anh
  await mouseRightClick(cdp, imgPt.x, imgPt.y);
  await sleep(400);
  let labels = await menuLabels();
  check("Chuot phai anh: co muc Cat", labels.some(l => l.startsWith("Cắt")), JSON.stringify(labels));
  check("Chuot phai anh: co muc Sao chep", labels.some(l => l.startsWith("Sao chép")), JSON.stringify(labels));
  check("Chuot phai anh: co muc Dan", labels.some(l => l.startsWith("Dán")), JSON.stringify(labels));
  check("Chuot phai anh: co muc Dua len tren", labels.some(l => l.startsWith("Đưa lên trên")), JSON.stringify(labels));
  check("Chuot phai anh: co muc Dua xuong duoi", labels.some(l => l.startsWith("Đưa xuống dưới")), JSON.stringify(labels));
  check("Chuot phai anh: co muc Xoa", labels.some(l => l.startsWith("Xóa")), JSON.stringify(labels));
  check("Chuot phai anh: co muc Dinh dang doi tuong", labels.some(l => l.startsWith("Định dạng đối tượng")), JSON.stringify(labels));

  // Mo hop thoai Dinh dang doi tuong tu menu
  await clickMenu("Định dạng đối tượng");
  await sleep(400);
  const formatDlgOpen = await ev(`Boolean(document.querySelector('#vno-obj-width'))`);
  check("Dinh dang doi tuong mo hop thoai thanh cong", formatDlgOpen);
  await closeAll();

  // Kiem tra mo menu bang phim ContextMenu tren anh dang chon
  await mouseClick(cdp, imgPt.x, imgPt.y);
  await ev(`document.querySelector('.vno-sheet-image')?.focus()`);
  await sleep(200);
  await press(cdp, "ContextMenu");
  await sleep(400);
  labels = await menuLabels();
  check("Phim ContextMenu mo menu ngu canh anh dang chon", labels.some(l => l.startsWith("Cắt")), JSON.stringify(labels));
  await closeAll();

  // Kiem tra mo menu bang phim Shift+F10 tren anh dang chon
  await mouseClick(cdp, imgPt.x, imgPt.y);
  await ev(`document.querySelector('.vno-sheet-image')?.focus()`);
  await sleep(200);
  await press(cdp, "F10", { shift: true });
  await sleep(400);
  labels = await menuLabels();
  check("Phim Shift+F10 mo menu ngu canh anh dang chon", labels.some(l => l.startsWith("Cắt")), JSON.stringify(labels));
  await closeAll();

  // Kiem tra Cut / Paste anh
  await mouseRightClick(cdp, imgPt.x, imgPt.y);
  await sleep(400);
  await clickMenu("Cắt");
  await sleep(300);
  const imgCountAfterCut = await ev(`${grid}.imagesBySheet[${grid}.activeSheet]?.length || 0`);
  check("Lenh Cat xoa anh khoi trang tinh", imgCountAfterCut === 0, `Con lai ${imgCountAfterCut} anh`);

  // Dan anh tai vi tri moi
  await ev(`${grid}.selectCell('D', 5)`);
  await ev(`${grid}.pasteObject()`);
  await sleep(400);
  const imgCountAfterPaste = await ev(`${grid}.imagesBySheet[${grid}.activeSheet]?.length || 0`);
  check("Lenh Dan tai vi tri moi phuc hoi anh", imgCountAfterPaste === 1, `So anh: ${imgCountAfterPaste}`);

  // Xoa anh bang phim Delete
  const imgPt2 = await center(".vno-sheet-image");
  if (imgPt2) {
    await mouseClick(cdp, imgPt2.x, imgPt2.y);
    await sleep(200);
    await press(cdp, "Delete");
    await sleep(300);
  }
  const imgCountAfterDel = await ev(`${grid}.imagesBySheet[${grid}.activeSheet]?.length || 0`);
  check("Phim Delete xoa anh dang chon", imgCountAfterDel === 0, `Con lai ${imgCountAfterDel} anh`);

  // 2. Kiem tra menu chuot phai cho HOP VAN BAN (TextBox)
  await ev(`${grid}.insertTextBox('Ghi chú mẫu 123', { c: 'C', r: 4 })`);
  await sleep(500);

  const tbPt = await center(".vno-sheet-textbox");
  check("Hop van ban duoc chen len sheet", Boolean(tbPt));

  // Chuot phai vao hop van ban
  await mouseRightClick(cdp, tbPt.x, tbPt.y);
  await sleep(400);
  labels = await menuLabels();
  check("Chuot phai hop van ban: co du muc menu doi tuong",
    labels.some(l => l.startsWith("Cắt")) &&
    labels.some(l => l.startsWith("Sao chép")) &&
    labels.some(l => l.startsWith("Đưa lên trên")) &&
    labels.some(l => l.startsWith("Xóa")) &&
    labels.some(l => l.startsWith("Định dạng đối tượng")),
    JSON.stringify(labels)
  );

  // Mo hop thoai Dinh dang doi tuong cua hop van ban
  await clickMenu("Định dạng đối tượng");
  await sleep(400);
  const tbFormatOpen = await ev(`Boolean(document.querySelector('#vno-obj-text'))`);
  check("Hop thoai Dinh dang doi tuong co o sua van ban cho textbox", tbFormatOpen);
  await closeAll();

  // Xoa textbox qua phim Backspace hoac Delete
  await mouseClick(cdp, tbPt.x, tbPt.y);
  await sleep(200);
  await press(cdp, "Delete");
  await sleep(300);
  const tbCountAfterDel = await ev(`${grid}.textBoxesBySheet[${grid}.activeSheet]?.length || 0`);
  check("Phim Delete xoa hop van ban dang chon", tbCountAfterDel === 0, `Con lai ${tbCountAfterDel} hop van ban`);

  // 3. Kiem tra Hop thoai Thiet lap trang - Nhom Trang tinh (Sheet tab)
  await ev(`${grid}.showPageSetupDialog('sheet')`);
  await sleep(500);

  const hasSheetGroup = await ev(`Boolean(document.querySelector('.vno-sheet-pagesetup-sheet-group'))`);
  const hasGridlinesCb = await ev(`Boolean(document.querySelector('#vno-sheet-print-gridlines'))`);
  const hasHeadingsCb = await ev(`Boolean(document.querySelector('#vno-sheet-print-headings'))`);
  const hasCommentsSel = await ev(`Boolean(document.querySelector('#vno-sheet-print-comments'))`);
  const hasCellErrorsSel = await ev(`Boolean(document.querySelector('#vno-sheet-print-cell-errors'))`);
  const hasPageOrderSel = await ev(`Boolean(document.querySelector('#vno-sheet-print-page-order'))`);

  check("Hop thoai Thiet lap trang co nhom Trang tinh", hasSheetGroup);
  check("Nhom Trang tinh co du 5 dieu khien chuan",
    hasGridlinesCb && hasHeadingsCb && hasCommentsSel && hasCellErrorsSel && hasPageOrderSel,
    `gridlines=${hasGridlinesCb}, headings=${hasHeadingsCb}, comments=${hasCommentsSel}, errors=${hasCellErrorsSel}, order=${hasPageOrderSel}`
  );

  // Chinh sua cac gia tri trong nhom Trang tinh va luu
  await ev(`(() => {
    document.querySelector('#vno-sheet-print-gridlines').checked = true;
    document.querySelector('#vno-sheet-print-headings').checked = true;
    document.querySelector('#vno-sheet-print-comments').value = 'sheetEnd';
    document.querySelector('#vno-sheet-print-cell-errors').value = 'blank';
    document.querySelector('#vno-sheet-print-page-order').value = 'overThenDown';
    document.querySelector('.vno-rule-apply').click();
  })()`);
  await sleep(400);

  const savedOptions = JSON.parse(await ev(`JSON.stringify(${grid}.pageSetupBySheet[${grid}.activeSheet]?.printOptions || {})`));
  check("Luu Thiet lap trang: in duong luoi = true", savedOptions.gridlines === true, JSON.stringify(savedOptions));
  check("Luu Thiet lap trang: in tieu de = true", savedOptions.headings === true, JSON.stringify(savedOptions));
  check("Luu Thiet lap trang: in ghi chu = sheetEnd", savedOptions.comments === "sheetEnd", JSON.stringify(savedOptions));
  check("Luu Thiet lap trang: loi o hien thi = blank", savedOptions.cellErrors === "blank", JSON.stringify(savedOptions));
  check("Luu Thiet lap trang: thu tu trang = overThenDown", savedOptions.pageOrder === "overThenDown", JSON.stringify(savedOptions));

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
