// Slides: Thiết kế > Biến thể (Màu chủ đề / Phông chủ đề): áp dụng, hoàn tác, lưu PPTX (đọc lại bằng PowerPoint).
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_VARIANTS_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\variants.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const theme = () => ev(`JSON.stringify((({accentColor, bgColor, titleColor, fontFamily}) => ({accentColor, bgColor, titleColor, fontFamily}))(${canvas}.masterTheme))`);
const menuItem = async (label) => {
  const box = await ev(`(() => { const el = [...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length > 0).find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(300);
};
const openDropdown = async (id) => {
  const box = await ev(`(() => { const el = document.querySelector('[data-dropdown-id="${id}"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy nút: " + id);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};

try {
  await sleep(1500);
  await click(cdp, "#vno-ribbon-tab-design");
  await sleep(300);
  const before = JSON.parse(await theme());
  await openDropdown("slides.design.themeColors");
  await menuItem("Xanh lá");
  let t = JSON.parse(await theme());
  check("Màu chủ đề Xanh lá: màu nhấn #16a34a, nền #f0fdf4", t.accentColor === "#16a34a" && t.bgColor === "#f0fdf4", JSON.stringify(t));
  check("Màu mới khác màu cũ", t.accentColor !== before.accentColor);

  await openDropdown("slides.design.themeFonts");
  await menuItem("Georgia");
  t = JSON.parse(await theme());
  check("Phông chủ đề Georgia", /Georgia/.test(t.fontFamily), t.fontFamily);

  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  t = JSON.parse(await theme());
  check("Ctrl+Z hoàn tác bộ phông (về phông cũ)", !/Georgia/.test(t.fontFamily), t.fontFamily);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  t = JSON.parse(await theme());
  check("Ctrl+Z lần 2 hoàn tác bảng màu", t.accentColor === before.accentColor, JSON.stringify(t));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides theme variants: ${checks.length}/${checks.length} PASS`);
