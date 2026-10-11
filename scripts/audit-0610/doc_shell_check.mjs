// D19 (phan kiem tu dong): khung chinh Writer - khoa i18n tho, nut khong ten, chu bi cat, tran ngang, o 4 to hop man hinh/zoom,
// o ca che do Sang va Toi, o man hinh Tep (backstage) va moi tab ribbon.
// Chay: node --experimental-websocket scripts/audit-0610/doc_shell_check.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (expression) => session.cdp.evaluate(expression);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let failed = 0;
const findings = [];

const SCAN = `(() => {
  const visible = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const text = (el) => (el.innerText || "").trim();
  const all = [...document.querySelectorAll("body *")].filter(visible);
  const rawKeys = [];
  for (const el of all) {
    if (el.children.length) continue;
    const t = text(el);
    if (t && /^(?:writer|common|sheet|slides|platform|writerDialogs|writerRibbon|backstage)\\.[A-Za-z0-9_.]{3,}$/.test(t)) rawKeys.push(t.slice(0, 60));
  }
  const buttons = all.filter((el) => el.matches("button, [role=button], input[type=button]"));
  const unnamed = buttons.filter((b) => !(b.getAttribute("aria-label") || b.getAttribute("title") || text(b) || b.querySelector("img[alt]")?.alt)).map((b) => (b.id || b.className || b.tagName).toString().slice(0, 50));
  const clipped = all.filter((el) => {
    if (!el.children.length && text(el) && el.scrollWidth > el.clientWidth + 2) {
      const o = getComputedStyle(el);
      return o.overflow !== "visible" || o.textOverflow === "ellipsis";
    }
    return false;
  }).map((el) => text(el).slice(0, 40) + " (" + el.scrollWidth + ">" + el.clientWidth + ")");
  const hScroll = document.documentElement.scrollWidth > window.innerWidth + 1;
  const lowContrast = all.filter((el) => {
    if (el.children.length || !text(el)) return false;
    const c = getComputedStyle(el);
    const parse = (v) => { const m = /rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?/.exec(v); return m ? [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])] : null; };
    const fg = parse(c.color);
    let bgEl = el, bg = null;
    let gradient = false;
    while (bgEl && !bg) { const cs = getComputedStyle(bgEl); if (cs.backgroundImage !== "none") gradient = true; const p = parse(cs.backgroundColor); if (p && p[3] > 0.5) bg = p; bgEl = bgEl.parentElement; }
    if (!fg || !bg || gradient) return false; // nen gradient: khong do duoc bang mot mau
    const lum = ([r, g, b]) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const l1 = lum(fg), l2 = lum(bg);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) < 3;
  }).map((el) => text(el).slice(0, 30));
  return { rawKeys, unnamed: unnamed.slice(0, 8), unnamedCount: unnamed.length, clipped: clipped.slice(0, 8), clippedCount: clipped.length, hScroll, lowContrast: lowContrast.slice(0, 6), lowContrastCount: lowContrast.length };
})()`;

async function scan(label) {
  const result = await ev(SCAN);
  const problems = [];
  if (result.rawKeys.length) problems.push(`khoa i18n tho: ${result.rawKeys.join(" | ")}`);
  if (result.unnamedCount) problems.push(`${result.unnamedCount} nut khong ten: ${result.unnamed.join(" | ")}`);
  if (result.hScroll) problems.push("tran ngang trang");
  if (result.clippedCount) problems.push(`${result.clippedCount} chu bi cat: ${result.clipped.join(" | ")}`);
  if (result.lowContrastCount) problems.push(`${result.lowContrastCount} chu tuong phan < 3:1: ${result.lowContrast.join(" | ")}`);
  if (problems.length) { failed += 1; findings.push({ label, problems }); }
  console.log(problems.length ? "FAIL" : "PASS", "|", label, "|", problems.join(" ; ").slice(0, 400));
}

try {
  const tabs = await ev(`[...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].filter(x => !x.hidden).map(x => x.id)`);
  for (const theme of ["light", "dark"]) {
    // Dung nut chuyen giao dien that cua app (Sang <-> Toi), khong tu gan thuoc tinh.
    const current = await ev(`document.documentElement.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')`);
    if (current !== theme) {
      await ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => /^(Tối|Sáng)$/.test((x.innerText || '').trim())); b?.click(); return !!b; })()`);
      await sleep(600);
    }
    console.log("Giao dien hien tai:", await ev(`document.documentElement.getAttribute('data-theme') || 'mac dinh'`), "(muon:", theme + ")");
    for (const [w, h, scale] of [[1366, 768, 1], [1920, 1080, 1], [1366, 768, 1.25]]) {
      await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: Math.round(w / scale), height: Math.round(h / scale), deviceScaleFactor: scale, mobile: false });
      await sleep(500);
      for (const id of tabs) {
        await ev(`document.getElementById(${JSON.stringify(id)}).click(); true`);
        await sleep(250);
        await scan(`${theme} ${w}x${h}@${scale * 100} tab ${id.replace("vno-ribbon-tab-", "")}`);
      }
      // Man hinh Tep (backstage)
      await ev(`(document.querySelector('.vno-ribbon-tab-file') || document.querySelector('[id*=file-tab]'))?.click(); true`);
      await sleep(500);
      await scan(`${theme} ${w}x${h}@${scale * 100} backstage Tep`);
      await ev(`(() => { const e = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }); document.dispatchEvent(e); document.querySelector('.vno-backstage-close, [data-backstage-close]')?.click(); return true; })()`);
      await sleep(300);
    }
  }
  await session.cdp.send("Emulation.clearDeviceMetricsOverride", {});
} catch (error) {
  failed += 1;
  console.log("FAIL | Loi chay |", String(error?.stack || error).slice(0, 300));
} finally {
  await session.close();
}
console.log(failed ? `TONG: ${failed} muc co van de` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
