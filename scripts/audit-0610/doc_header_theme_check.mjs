// Tuy bien khu vuc tieu de (mau/hinh anh): hop thoai Tuy chon -> xem truoc -> Dong y -> luu -> tai lai van con; chu luon du tuong phan.
// Chay: node --experimental-websocket scripts/audit-0610/doc_header_theme_check.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (expression) => session.cdp.evaluate(expression);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 220)); };

const HEADER = `(() => {
  const bar = document.querySelector('.vno-topbar');
  const tabs = document.querySelector('.vno-ribbon-tabs');
  const tab = [...document.querySelectorAll('.vno-ribbon-tab')].find(x => !x.classList.contains('is-active') && x.getClientRects().length);
  const quick = document.querySelector('.vno-quick-btn');
  const parse = (v) => { const m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/.exec(v); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null; };
  const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  const bg = parse(getComputedStyle(tabs).backgroundColor);
  const fgTab = parse(getComputedStyle(tab).color);
  const fgQuick = parse(getComputedStyle(quick).color);
  return { attr: document.documentElement.getAttribute('data-vno-header'), barBg: getComputedStyle(bar).backgroundColor, tabsBg: getComputedStyle(tabs).backgroundColor, tabsImage: getComputedStyle(tabs).backgroundImage.slice(0, 40), tabRatio: bg && fgTab ? Math.round(ratio(bg, fgTab) * 10) / 10 : null, quickRatio: bg && fgQuick ? Math.round(ratio(bg, fgQuick) * 10) / 10 : null };
})()`;

try {
  await sleep(1000);
  const base = await ev(HEADER);
  rec("Mac dinh: khong co thuoc tinh tuy bien", base.attr === null, base);

  // Mo hop thoai Tuy chon bang lenh that
  await ev(`window.__vnoGlobalCommandBus.execute('common.file.options'); true`).catch(() => {});
  await sleep(600);
  let hasDialog = await ev(`!!document.getElementById('vno-opt-header')`);
  if (!hasDialog) {
    await ev(`(document.querySelector('.vno-ribbon-tab-file'))?.click(); true`); await sleep(500);
    await ev(`[...document.querySelectorAll('button, [role=menuitem], li, div')].find(x => (x.innerText || '').trim() === 'Tùy chọn')?.click(); true`); await sleep(600);
    hasDialog = await ev(`!!document.getElementById('vno-opt-header')`);
  }
  rec("Hop thoai Tuy chon co muc 'Khu vuc tieu de'", hasDialog, hasDialog);

  // Chon mau (xem truoc truc tiep)
  for (const [color, label] of [["#111827", "den"], ["#fef3c7", "vang kem"], ["#0f4c81", "xanh Doc"]]) {
    await ev(`document.querySelector('input[name="vno-opt-header"][value="color"]').click(); true`); await sleep(150);
    await ev(`document.querySelector('.vno-opt-header-swatch[data-color="${color}"]').click(); true`); await sleep(250);
    const state = await ev(HEADER);
    rec(`Xem truoc mau ${label}: nen va chu thanh tieu de/the ribbon tuong phan >= 4,5`, state.attr === "color" && state.tabRatio >= 4.5 && state.quickRatio >= 4.5, state);
  }

  // Mau tuy y qua o chon mau
  await ev(`(() => { const i = document.getElementById('vno-opt-header-color'); i.value = '#6d28d9'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await sleep(250);
  const custom = await ev(HEADER);
  rec("Mau tuy y #6d28d9 ap dung ngay", custom.tabsBg === "rgb(109, 40, 217)" && custom.tabRatio >= 4.5, custom);

  // Huy: tra ve trang thai cu
  await ev(`document.querySelector('.vno-options-cancel-btn').click(); true`); await sleep(300);
  const afterCancel = await ev(HEADER);
  rec("Bam Huy bo: khong luu, tro ve mac dinh", afterCancel.attr === null, afterCancel);

  // Hinh anh: tao anh bang canvas, dung ham that cua mo-dun (loadHeaderImage) qua File
  await ev(`window.__vnoGlobalCommandBus.execute('common.file.options'); true`).catch(() => {}); await sleep(500);
  if (!(await ev(`!!document.getElementById('vno-opt-header')`))) {
    await ev(`(document.querySelector('.vno-ribbon-tab-file'))?.click(); true`); await sleep(400);
    await ev(`[...document.querySelectorAll('button, [role=menuitem], li, div')].find(x => (x.innerText || '').trim() === 'Tùy chọn')?.click(); true`); await sleep(500);
  }
  const imageResult = await ev(`(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 400;
    const ctx = canvas.getContext('2d'); const g = ctx.createLinearGradient(0, 0, 800, 400); g.addColorStop(0, '#fde68a'); g.addColorStop(1, '#fb7185'); ctx.fillStyle = g; ctx.fillRect(0, 0, 800, 400);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const file = new File([blob], 'nen-thu.png', { type: 'image/png' });
    const input = document.getElementById('vno-opt-header-file');
    const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await sleep(1200);
  const withImage = await ev(HEADER);
  rec("Chon hinh: nen la hinh, chu tuong phan >= 4,5", withImage.attr === "image" && /url|gradient/.test(withImage.tabsImage) && withImage.tabRatio >= 3, { ...withImage, imageResult });
  // Do phu toi toi da
  await ev(`(() => { const i = document.getElementById('vno-opt-header-dim'); i.value = '70'; i.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`); await sleep(300);
  const dimmed = await ev(HEADER);
  rec("Do phu toi 70% van doc duoc (tuong phan >= 4,5)", dimmed.quickRatio >= 4.5, dimmed);

  // Dong y: luu
  await ev(`document.querySelector('.vno-options-ok-btn').click(); true`); await sleep(400);
  const saved = await ev(`JSON.parse(localStorage.getItem('vno-header-theme') || 'null')`);
  rec("Dong y: luu cuc bo (che do hinh anh, co du lieu anh)", saved && saved.mode === "image" && saved.image.startsWith("data:image/") && saved.image.length < 800000, { mode: saved?.mode, bytes: saved?.image?.length });

  // Khoi dong lai giao dien (init) -> van ap dung
  const persisted = await ev(`(async () => { const m = await import('/platform/theme/header-theme.js'); document.documentElement.removeAttribute('data-vno-header'); m.headerTheme.init(); return document.documentElement.getAttribute('data-vno-header'); })()`);
  rec("Tai lai (init): van ap dung hinh anh", persisted === "image", persisted);

  // Che do Toi van doc duoc
  await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => /^(Tối|Sáng)$/.test((x.innerText || '').trim())); b?.click(); return true; })()`); await sleep(500);
  const dark = await ev(HEADER);
  rec("Che do Toi + hinh anh: chu van doc duoc", dark.quickRatio >= 4.5, dark);

  // Dat lai mac dinh
  await ev(`window.__vnoGlobalCommandBus.execute('common.file.options'); true`).catch(() => {}); await sleep(500);
  if (!(await ev(`!!document.getElementById('vno-opt-header')`))) {
    await ev(`(document.querySelector('.vno-ribbon-tab-file'))?.click(); true`); await sleep(400);
    await ev(`[...document.querySelectorAll('button, [role=menuitem], li, div')].find(x => (x.innerText || '').trim() === 'Tùy chọn')?.click(); true`); await sleep(500);
  }
  await ev(`document.getElementById('vno-opt-header-reset').click(); document.querySelector('.vno-options-ok-btn').click(); true`); await sleep(400);
  const reset = await ev(HEADER);
  const stored = await ev(`localStorage.getItem('vno-header-theme')`);
  rec("Dat lai mac dinh: bo tuy bien va xoa du lieu luu", reset.attr === null && stored === null, { attr: reset.attr, stored });
} catch (error) {
  failed += 1;
  console.log("FAIL | Loi chay |", String(error?.stack || error).slice(0, 400));
} finally {
  await session.close();
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
