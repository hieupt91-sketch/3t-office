// Sheet: chuột phải thanh trạng thái -> bật/tắt Trung bình, Đếm, Đếm ô, Nhỏ nhất, Lớn nhất, Tổng cộng; giá trị đúng; nhớ lựa chọn.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-sbm-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("sheet", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 3000));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await ev(`(() => { try { localStorage.removeItem("vno.sheet.statusStats"); } catch (e) {} const g = window.__vnoAppInstance.grid; [10, 20, "chu", 30].forEach((v, i) => g.setCellValue("A", i + 1, v)); g.selectCell("A", 1); g.selectCell("A", 4, true); })()`);
  await new Promise(r => setTimeout(r, 300));
  const status = () => ev(`document.getElementById("vno-status-docinfo").textContent`);
  let s = await status();
  check("Mặc định: có ĐẾM, TRUNG BÌNH, TỔNG CỘNG; chưa có NHỎ NHẤT", /ĐẾM: 3/.test(s) && /TRUNG BÌNH: 20/.test(s) && /TỔNG CỘNG: 60/.test(s) && !/NHỎ NHẤT/.test(s), s);
  const openMenu = async () => {
    await ev(`(() => { const el = document.getElementById("vno-status-docinfo"); const r = el.getBoundingClientRect(); el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 10, clientY: r.top + 5 })); })()`);
    await cdp.waitFor("document.querySelector('.vno-status-stat-menu')", { timeoutMilliseconds: 8000 });
  };
  const clickItem = async (label) => {
    await ev(`(() => { const rows = [...document.querySelectorAll('.vno-status-stat-menu [role=menuitem], .vno-status-stat-menu .vno-context-menu-item, .vno-status-stat-menu button, .vno-status-stat-menu li')]; const row = rows.find(r => r.textContent.includes(${JSON.stringify(label)})); if (!row) throw new Error("không thấy mục " + ${JSON.stringify(label)} + " trong " + rows.map(r => r.textContent.trim()).join("|")); row.click(); })()`);
    await new Promise(r => setTimeout(r, 300));
  };
  await openMenu();
  const labels = await ev(`document.querySelector('.vno-status-stat-menu').textContent`);
  check("Trình đơn liệt kê đủ 6 số liệu", ["Đếm số", "Đếm ô có dữ liệu", "Nhỏ nhất", "Lớn nhất", "Trung bình", "Tổng cộng"].every(x => labels.includes(x)), labels.replace(/\s+/g, " ").slice(0, 120));
  await clickItem("Nhỏ nhất");
  await openMenu();
  await clickItem("Lớn nhất");
  await openMenu();
  await clickItem("Đếm ô có dữ liệu");
  s = await status();
  check("Bật Nhỏ nhất/Lớn nhất/Đếm ô: giá trị 10, 30 và 4", /NHỎ NHẤT: 10/.test(s) && /LỚN NHẤT: 30/.test(s) && /ĐẾM Ô: 4/.test(s), s);
  await openMenu();
  await clickItem("Tổng cộng");
  s = await status();
  check("Tắt Tổng cộng: mất khỏi thanh", !/TỔNG CỘNG/.test(s) && /TRUNG BÌNH/.test(s), s);
  const saved = await ev(`localStorage.getItem("vno.sheet.statusStats")`);
  check("Lựa chọn được lưu theo máy", saved && JSON.parse(saved).sum === false && JSON.parse(saved).min === true, String(saved));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
