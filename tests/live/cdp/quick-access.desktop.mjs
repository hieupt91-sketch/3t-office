// Kiem tra CDP tren app desktop: Thanh cong cu truy nhanh tuy bien (dung chung Writer/Sheet/Slides).
// Chay: node --experimental-websocket tests/live/cdp/quick-access.desktop.mjs [sheet|writer|slides]
// Quy tac: khong SendKeys, khong kill theo ten; chi dung session PID cua launchApp.
import { launchApp } from "./session.mjs";
import { mouseClick, mouseRightClick, press } from "./actions.mjs";

const appName = process.argv[2] || "sheet";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const session = await launchApp(appName, { localAppData: process.env.VNO_CDP_LOCALAPPDATA || `E:\\VNOffice-profiles\\claude-qat-${appName}` });
const cdp = session.cdp;
const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} | [${appName}] ${name}${ok ? "" : " | " + detail}`);
  ok ? pass++ : fail++;
};
const qatIds = async () => JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-quick-tools .vno-quick-btn[data-cmd]')].map(b => b.getAttribute('data-cmd')))`));
const stored = async () => ev(`localStorage.getItem('vno.quickAccess.v1.${appName}')`);
const center = async sel => JSON.parse(await ev(`JSON.stringify((() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })())`));
const menuLabels = async () => JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll('.vno-context-menu-item')].filter(e => e.getBoundingClientRect().width > 0).map(e => (e.querySelector('.vno-context-menu-label') || e).textContent.trim().replace(/\\s+/g, ' ')))`));
const clickMenu = async label => {
  const p = JSON.parse(await ev(`JSON.stringify((() => { const e = [...document.querySelectorAll('.vno-context-menu-item')].find(n => n.getBoundingClientRect().width > 0 && n.textContent.trim().includes(${JSON.stringify(label)})); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })())`));
  if (!p) return false;
  await mouseClick(cdp, p.x, p.y);
  await sleep(350);
  return true;
};
const closeAll = async () => { await press(cdp, "Escape"); await sleep(200); };

try {
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) {
    ready = await ev(`document.querySelectorAll('.vno-quick-tools .vno-quick-btn').length > 0 && document.querySelectorAll('[data-command-id]').length > 5`);
    if (!ready) await sleep(500);
  }
  check("App khoi dong, thanh truy nhanh hien", ready);
  await ev(`localStorage.removeItem('vno.quickAccess.v1.${appName}')`);

  const defaults = ["common.file.save", "common.edit.undo", "common.edit.redo", "common.file.print"];
  let ids = await qatIds();
  check("Mac dinh co Luu, Hoan tac, Lam lai, In", JSON.stringify(ids) === JSON.stringify(defaults), JSON.stringify(ids));
  check("Co mui ten tuy bien cuoi thanh", Boolean(await center(".vno-quick-more")));

  // Chon mot nut ribbon chua co tren thanh truy nhanh
  const targetId = await ev(`(() => { const r = [...document.querySelectorAll('[data-command-id]')].filter(b => !b.closest('.vno-quick-tools') && b.getBoundingClientRect().width > 0 && !${JSON.stringify(defaults)}.includes(b.getAttribute('data-command-id'))); return r.length ? r[0].getAttribute('data-command-id') : null; })()`);
  check("Tim thay nut ribbon de them", Boolean(targetId), String(targetId));
  const targetSel = `[data-command-id="${targetId}"]:not(.vno-quick-btn)`;
  const tp = await center(targetSel);
  await mouseRightClick(cdp, tp.x, tp.y);
  await sleep(400);
  let labels = await menuLabels();
  check("Chuot phai nut ribbon: co 'Them vao Thanh cong cu truy nhanh'", labels.some(l => l.startsWith("Thêm vào Thanh công cụ truy nhanh")), JSON.stringify(labels));
  await clickMenu("Thêm vào Thanh công cụ truy nhanh");
  ids = await qatIds();
  check("Lenh duoc them vao cuoi thanh", ids.length === 5 && ids[4] === targetId, JSON.stringify(ids));
  check("Cau hinh duoc luu (localStorage)", String(await stored()).includes(targetId));

  // Mo lai menu tren cung nut: phai la 'Xoa khoi'
  const tp2 = await center(targetSel);
  await mouseRightClick(cdp, tp2.x, tp2.y);
  await sleep(400);
  labels = await menuLabels();
  check("Nut da co tren thanh: menu doi thanh 'Xoa khoi'", labels.some(l => l.startsWith("Xóa khỏi Thanh công cụ truy nhanh")), JSON.stringify(labels));
  await closeAll();

  // Tai lai trang: cau hinh phai con
  await ev(`location.reload()`);
  await sleep(4000);
  for (let i = 0; i < 40; i++) { if (await ev(`document.querySelectorAll('.vno-quick-tools .vno-quick-btn').length > 0`)) break; await sleep(500); }
  ids = await qatIds();
  check("Sau khi tai lai ung dung van con lenh da them", ids.includes(targetId), JSON.stringify(ids));

  // Chuot phai nut tren thanh -> Xoa khoi
  const qp = await center(`.vno-quick-tools .vno-quick-btn[data-cmd="${targetId}"]`);
  await mouseRightClick(cdp, qp.x, qp.y);
  await sleep(400);
  labels = await menuLabels();
  check("Chuot phai nut tren thanh: co Xoa khoi va Dat lai", labels.some(l => l.startsWith("Xóa khỏi")) && labels.some(l => l.startsWith("Đặt lại")), JSON.stringify(labels));
  await clickMenu("Xóa khỏi Thanh công cụ truy nhanh");
  ids = await qatIds();
  check("Xoa khoi thanh truy nhanh", ids.length === 4 && !ids.includes(targetId), JSON.stringify(ids));

  // Menu mui ten: bat/tat Mo tep, roi dat lai
  const mp = await center(".vno-quick-more");
  await mouseClick(cdp, mp.x, mp.y);
  await sleep(400);
  labels = await menuLabels();
  check("Menu mui ten liet ke lenh pho bien, Luu da danh dau", labels.some(l => l.startsWith("✓") && l.includes("Lưu")) && labels.some(l => l.includes("Mở tệp")), JSON.stringify(labels));
  await clickMenu("Mở tệp");
  ids = await qatIds();
  check("Bat 'Mo tep' tu menu mui ten", ids.includes("common.file.open"), JSON.stringify(ids));
  const mp2 = await center(".vno-quick-more");
  await mouseClick(cdp, mp2.x, mp2.y);
  await sleep(400);
  await clickMenu("Đặt lại mặc định");
  ids = await qatIds();
  check("Dat lai mac dinh", JSON.stringify(ids) === JSON.stringify(defaults), JSON.stringify(ids));

  // Nut tren thanh van chay lenh: bam Hoan tac khong loi
  const up = await center(`.vno-quick-btn[data-cmd="common.edit.undo"]`);
  await mouseClick(cdp, up.x, up.y);
  await sleep(300);
  check("Bam nut tren thanh truy nhanh khong gay loi giao dien", await ev(`Boolean(document.querySelector('.vno-quick-tools'))`));
} catch (err) {
  console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err);
  fail++;
} finally {
  console.log(`KET QUA TEST CDP DESKTOP [${appName}]: ${pass}/${pass + fail} PASS | ${fail} FAIL`);
  try { await session.close(); } catch {}
}
process.exitCode = fail ? 1 : 0;
