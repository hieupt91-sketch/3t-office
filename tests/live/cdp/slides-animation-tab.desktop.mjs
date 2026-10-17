// Slides: tab Hoạt hình — Hiệu ứng nhanh, Bắt đầu / Thời lượng / Trễ, Xem trước, hoàn tác, lưu PPTX.
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_ANIMTAB_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\anim_tab.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const anim = () => ev(`JSON.stringify(${canvas}.slides[0].shapes[0].animation || null)`);
const menuItem = async (label) => {
  const box = await ev(`(() => { const el = [...document.querySelectorAll('.vno-ribbon-dropdown-item')].filter(e => e.getClientRects().length > 0).find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};
const openDropdown = async (id) => {
  const box = await ev(`(() => { const el = document.querySelector('[data-dropdown-id="${id}"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy nút: " + id);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};

try {
  await sleep(1500);
  await ev(`${canvas}.insertShape("rect")`);
  await sleep(300);
  await click(cdp, "#vno-ribbon-tab-animations");
  await sleep(300);

  await openDropdown("slides.animation.durationMenu");
  await menuItem("2 giây");
  check("Chưa có hiệu ứng: đặt thời lượng không tạo hiệu ứng", ["null", '{"type":"none","duration":500,"delay":0}'].includes(await anim()), await anim());

  await ev(`${canvas}.setSelectedTarget(${canvas}.slides[0].shapes[0].id)`);
  await openDropdown("slides.animation.gallery");
  await menuItem("Thu phóng vào");
  let a = JSON.parse(await anim());
  check("Gán hiệu ứng Thu phóng vào cho hình đang chọn", a?.type === "zoomIn", JSON.stringify(a));

  await openDropdown("slides.animation.startMenu");
  await menuItem("Sau hiệu ứng trước");
  await openDropdown("slides.animation.durationMenu");
  await menuItem("2 giây");
  await openDropdown("slides.animation.delayMenu");
  await menuItem("1 giây");
  a = JSON.parse(await anim());
  check("Bắt đầu: sau hiệu ứng trước; thời lượng 2 giây; trễ 1 giây", a?.start === "afterPrevious" && a?.duration === 2000 && a?.delay === 1000, JSON.stringify(a));

  await click(cdp, '[data-command-id="slides.animation.preview"]');
  await sleep(300);
  const styled = await ev(`(() => { const el = document.querySelector('.vno-slide-shape-item'); return el.getAttribute('style') || ''; })()`);
  check("Xem trước chạy animation trên hình", /vnoAnimZoomIn/.test(styled), styled.slice(-120));
  await sleep(3600);
  const restored = await ev(`(() => { const el = document.querySelector('.vno-slide-shape-item'); return !/vnoAnimZoomIn/.test(el.getAttribute('style') || ''); })()`);
  check("Xong xem trước: hình trở về nguyên trạng", restored);

  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  a = JSON.parse(await anim());
  check("Ctrl+Z hoàn tác một bước (bỏ trễ)", a?.delay === 0, JSON.stringify(a));

  check("Ctrl+Z giữ nguyên đối tượng đang chọn", (await ev(`String(${canvas}.selectedTarget) === String(${canvas}.slides[0].shapes[0].id)`)) === true);
  await openDropdown("slides.animation.gallery");
  await menuItem("Không có");
  check("Chọn Không có bỏ hiệu ứng", (JSON.parse(await anim())?.type ?? "none") === "none", await anim());
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides animation tab: ${checks.length}/${checks.length} PASS`);
