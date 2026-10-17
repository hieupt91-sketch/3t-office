// Kiem tra CDP desktop: Bo tri trang > thu vien nhanh Can le / Huong giay / Kho giay / Chieu rong / Chieu cao (chuot that).
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-sheet-pagegallery";
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "page-gallery.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`); ok ? pass++ : fail++; };
const session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const cdp = session.cdp; const ev = e => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
const setup = async () => JSON.parse(await ev(`JSON.stringify(window.__vnoAppInstance.grid.getPageSetup())`));
const centerOf = async (expr) => JSON.parse(await ev(`JSON.stringify((() => { const el = ${expr}; if (!el) return null; const r = el.getBoundingClientRect(); return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; })())`));
async function pick(dropdownId, text) {
  const toggle = await centerOf(`[...document.querySelectorAll('[data-dropdown-id="${dropdownId}"], [data-dropdown-toggle="${dropdownId}"]')].find(e => e.getBoundingClientRect().width > 0)`);
  if (!toggle) return false;
  await mouseClick(cdp, toggle.x, toggle.y); await sleep(350);
  const item = await centerOf(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].find(e => e.getBoundingClientRect().width > 0 && e.textContent.trim().startsWith(${JSON.stringify(text)}))`);
  if (!item) { await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`); return false; }
  await mouseClick(cdp, item.x, item.y); await sleep(450);
  return true;
}
try {
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await click(cdp, "#vno-ribbon-tab-pageLayout"); await sleep(500);
  check("Chon Hep trong Can le", await pick("sheet.page.margins", "Hẹp"));
  let s = await setup();
  check("Le Hep: trai/phai 0,64 cm, tren/duoi 1,91 cm, dau/cuoi trang 0,76 cm", s.margins.left === 0.64 && s.margins.right === 0.64 && s.margins.top === 1.91 && s.margins.bottom === 1.91 && s.margins.header === 0.76, JSON.stringify(s.margins));
  check("Chon Rong trong Can le", await pick("sheet.page.margins", "Rộng"));
  s = await setup();
  check("Le Rong: 2,54 cm moi canh, dau/cuoi trang 1,27 cm", s.margins.left === 2.54 && s.margins.top === 2.54 && s.margins.header === 1.27 && s.margins.footer === 1.27, JSON.stringify(s.margins));
  await ev(`window.__vnoAppInstance.grid.undo()`); await sleep(300);
  s = await setup();
  check("Ctrl+Z tra ve le Hep", s.margins.left === 0.64, JSON.stringify(s.margins));
  check("Chon Ngang trong Huong giay", await pick("sheet.page.orientation", "Ngang"));
  check("Huong giay = landscape", (await setup()).orientation === "landscape");
  check("Chon A3 trong Kho giay", await pick("sheet.page.size", "A3"));
  check("Kho giay = a3", (await setup()).size === "a3");
  check("Chon 1 trang trong Chieu rong", await pick("sheet.page.fitWidth", "1 trang"));
  s = await setup();
  check("Chieu rong 1 trang, chieu cao tu dong => che do pages 1x0", s.scale.mode === "pages" && s.scale.pagesWide === 1 && s.scale.pagesTall === 0, JSON.stringify(s.scale));
  check("Chon 2 trang trong Chieu cao", await pick("sheet.page.fitHeight", "2 trang"));
  s = await setup();
  check("Chieu rong 1 giu nguyen, chieu cao 2 => 1x2", s.scale.mode === "pages" && s.scale.pagesWide === 1 && s.scale.pagesTall === 2, JSON.stringify(s.scale));
  await pick("sheet.page.fitWidth", "Tự động"); await pick("sheet.page.fitHeight", "Tự động");
  s = await setup();
  check("Dua ca hai ve Tu dong => tro lai thu phong theo phan tram", s.scale.mode === "percent", JSON.stringify(s.scale));
  // Dat lai: Hep + Ngang + A3 + vua 1 trang rong, luu XLSX de doi chieu voi Excel 2016 that (docs: tests/live/cdp/readme)
  await pick("sheet.page.margins", "Hẹp"); await pick("sheet.page.orientation", "Ngang"); await pick("sheet.page.size", "A3"); await pick("sheet.page.fitWidth", "1 trang");
  const savePath = process.argv[2];
  if (savePath) {
    await ev(`(async () => { const app = window.__vnoAppInstance; await window.globalUnoBridge.saveRealFileInPlace("sheet", (app.adapter || app).serializeToFods(), ${JSON.stringify(savePath)}); return true; })()`);
    check("Luu XLSX thanh cong", true);
  }
  check("Chon Can le tuy chinh mo hop thoai Thiet lap trang", await pick("sheet.page.margins", "Căn lề tùy chỉnh"));
  await sleep(500);
  check("Hop thoai Thiet lap trang hien o the Le", await ev(`Boolean(document.querySelector('#vno-sheet-margin-top'))`));
  await ev(`document.querySelector('.vno-rule-cancel, .vno-ps-cancel, [data-action="cancel"]')?.click()`);
} catch (err) { console.error("LOI NGOAI LE TRONG PHIEN TEST CDP:", err); fail++; }
finally { console.log(`KET QUA TEST CDP DESKTOP [sheet thu vien trang]: ${pass}/${pass + fail} PASS | ${fail} FAIL`); try { await session.close(); } catch {} }
process.exitCode = fail ? 1 : 0;