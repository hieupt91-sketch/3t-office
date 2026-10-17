// Tab Chuyển tiếp của Slides: thư viện hiệu ứng, thời lượng, tự chuyển trang, áp dụng tất cả, xem trước, hoàn tác.
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const trans = (i) => ev(`JSON.stringify(${canvas}.slides[${i}]?.transition || null)`);
const menuItem = async (label) => {
  const box = await ev(`(() => { const el = [...document.querySelectorAll('.vno-ribbon-dropdown-item')].find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
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
  await ev(`window.__vnoCommandBus ? 0 : 0`);
  await click(cdp, "#vno-ribbon-tab-home");
  await ev(`${canvas}.insertShape("rect")`);
  await sleep(250);
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="slides.insert.action"]');
  await ev(`(() => { const select = document.querySelector("#vno-action-type"); select.value = "next"; select.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await click(cdp, "#vno-action-apply");
  const action = await ev(`JSON.stringify(${canvas}.slides[0].shapes.find(s => String(s.id) === String(${canvas}.selectedTarget))?.action || null)`);
  check("Gán tác vụ sang trang kế tiếp cho hình đang chọn", action === '"next-page"', action);
  await click(cdp, "#vno-ribbon-tab-home");
  await sleep(300);
  await click(cdp, '[data-command-id="slides.slide.new"]');
  await sleep(400);
  await ev(`${canvas}.selectSlide(0)`);
  await click(cdp, "#vno-ribbon-tab-transitions");
  await sleep(300);

  await openDropdown("slides.transition.durationMenu");
  await menuItem("1 giây");
  check("Chưa có hiệu ứng: đặt thời lượng không làm gì", (await trans(0)) === "null");

  await openDropdown("slides.transition.gallery");
  await menuItem("Thu phóng");
  let t = JSON.parse(await trans(0));
  check("Chọn hiệu ứng Thu phóng chỉ cho trang đang chọn", t?.type === "zoom" && (await trans(1)) === "null", JSON.stringify(t));

  await openDropdown("slides.transition.durationMenu");
  await menuItem("2 giây");
  t = JSON.parse(await trans(0));
  check("Thời lượng 2 giây", t?.duration === 2000, JSON.stringify(t));

  await openDropdown("slides.transition.afterMenu");
  await menuItem("5 giây");
  await openDropdown("slides.transition.advanceMenu");
  await menuItem("Khi nhấp chuột: tắt");
  t = JSON.parse(await trans(0));
  check("Tự chuyển sau 5 giây và tắt nhấp chuột", t?.advanceAfter === 5000 && t?.advanceOnClick === false, JSON.stringify(t));

  const OUT = process.env.VNO_TRANSTAB_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\trans_tab_saved.pptx";
  const savedTab = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX có hiệu ứng từ tab Chuyển tiếp", /"status":\s*"ok"/.test(savedTab), savedTab);
  await click(cdp, '[data-command-id="slides.transition.preview"]');
  await sleep(200);
  const anim = await ev(`${canvas}.stageEl.style.animation`);
  check("Xem trước chạy hiệu ứng trên khung soạn", /vnoTransitionZoom/.test(anim), anim);

  await click(cdp, '[data-command-id="slides.transition.applyAll"]');
  await sleep(300);
  check("Áp dụng cho tất cả", (await trans(1)) === (await trans(0)) && (await trans(1)) !== "null", await trans(1));

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z hoàn tác Áp dụng cho tất cả", (await trans(1)) === "null");

  await openDropdown("slides.transition.gallery");
  await menuItem("Không");
  check("Chọn Không bỏ hiệu ứng", (await trans(0)) === "null");
  await click(cdp, '[data-command-id="slides.transition.apply"]');
  await ev(`(() => { const type = document.querySelector("#vno-trans-type-select"); type.value = "push"; type.dispatchEvent(new Event("change", { bubbles: true })); const direction = document.querySelector("#vno-trans-direction-select"); direction.value = "left"; direction.dispatchEvent(new Event("change", { bubbles: true })); })()`);
  await click(cdp, "#vno-trans-apply-current");
  t = JSON.parse(await trans(0));
  check("Tùy chọn chuyển tiếp Đẩy đặt hướng từ trái", t?.type === "push" && t?.direction === "left", JSON.stringify(t));
  const savedPush = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX sau khi đặt hướng chuyển tiếp", /"status":\s*"ok"/.test(savedPush), savedPush);
} catch (error) {
  check("Tab Chuyển tiếp không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides transition tab: ${checks.length}/${checks.length} PASS`);
