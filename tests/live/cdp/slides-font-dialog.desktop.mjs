// Slides: Ctrl+T mở hộp thoại Phông chữ, đặt phông/cỡ/đậm/màu/gạch chân đôi/chỉ số trên/giãn ký tự; nút Khoảng cách ký tự; lưu PPTX.
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, typeText, sleep } from "./actions.mjs";

const OUT = process.env.VNO_FONTDLG_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\font_dialog.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const titleHtml = () => ev(`document.querySelector('.vno-slide-title').innerHTML`);
const setField = (selector, value) => ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('change', { bubbles: true })); })()`);

try {
  await sleep(1500);
  const target = await ev(`(() => { const r = document.querySelector('.vno-slide-title').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await mouseClick(cdp, target.x, target.y);
  await sleep(300);
  await typeText(cdp, "Chữ thử nghiệm phông");
  await press(cdp, "a", { ctrl: true });
  await press(cdp, "t", { ctrl: true });
  await sleep(500);
  check("Ctrl+T mở hộp thoại Phông chữ", (await ev(`!!document.querySelector('#vno-font-dialog-overlay')`)) === true);
  check("Hộp thoại ẩn mục Ẩn và ô Vị trí (không có trong Slides)", (await ev(`(() => { const o = document.querySelector('#vno-font-dialog-overlay'); return o.querySelector('[data-effect="hidden"]').closest('label').hidden && o.querySelector('[data-position-mode]').closest('label').hidden; })()`)) === true);

  await setField("#vno-font-dialog-overlay [data-family]", "Georgia");
  await setField("#vno-font-dialog-overlay [data-size]", "28");
  await setField("#vno-font-dialog-overlay [data-style]", "bold");
  await setField("#vno-font-dialog-overlay [data-color]", "#ff0000");
  await setField("#vno-font-dialog-overlay [data-underline-style]", "double");
  await ev(`(() => { const box = document.querySelector('#vno-font-dialog-overlay [data-effect="sup"]'); box.checked = true; box.indeterminate = false; box.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await ev(`document.querySelector('#vno-font-dialog-overlay [data-tab="advanced"]').click()`);
  await setField("#vno-font-dialog-overlay [data-spacing-mode]", "expanded");
  await setField("#vno-font-dialog-overlay [data-spacing-by]", "2");
  await click(cdp, "#vno-font-dialog-overlay [data-apply]");
  await sleep(500);
  const html = await titleHtml();
  check("Phông Georgia, cỡ 28, màu đỏ (tiêu đề vốn đã đậm nên Kiểu giữ nguyên)", /Georgia/.test(html) && /28px/.test(html) && /(rgb\(255, 0, 0\)|#ff0000)/i.test(html), html.slice(0, 200));
  check("Gạch chân đôi, chỉ số trên, giãn ký tự 2", /underline double/.test(html) && /<sup\b/.test(html) && /letter-spacing: ?2px/.test(html), html.slice(0, 260));

  await press(cdp, "a", { ctrl: true });
  const opened = await ev(`(() => { const el = document.querySelector('[data-dropdown-id="slides.font.spacing"]'); if (!el) return false; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  check("Có nút Khoảng cách ký tự trên ribbon", !!opened);
  await mouseClick(cdp, opened.x, opened.y);
  await sleep(300);
  const item = await ev(`(() => { const el = [...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length).find(e => (e.getAttribute('title') || e.textContent.trim()) === 'Thưa'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await mouseClick(cdp, item.x, item.y);
  await sleep(400);
  check("Khoảng cách Thưa = 3 pt", /letter-spacing: ?3px/.test(await titleHtml()), (await titleHtml()).slice(0, 220));

  const fodp = await ev(`window.__vnoAppInstance.adapter.serializeToFodp()`);
  const fodpStyles = (String(fodp).match(/<style:style style:name="vnoT\d+"[\s\S]*?<\/style:style>/g) || []).join("\n");
  console.log(fodpStyles.slice(0, 1200));
  check("FODP: cỡ 28pt, màu đỏ, phông Georgia, gạch chân đôi, chỉ số trên, giãn 3pt", /fo:font-size="28pt"/.test(fodpStyles) && /fo:color="#ff0000"/.test(fodpStyles) && /Georgia/.test(fodpStyles) && /underline-type="double"/.test(fodpStyles) && /text-position="super/.test(fodpStyles) && /letter-spacing="3pt"/.test(fodpStyles), fodpStyles.slice(0, 200));
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides font dialog: ${checks.length}/${checks.length} PASS`);
