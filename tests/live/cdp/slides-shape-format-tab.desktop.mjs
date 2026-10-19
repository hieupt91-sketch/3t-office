// Tab ngữ cảnh «Định dạng hình» của Slides: hiện khi chọn hình, tô màu / viền / bóng / xoay / lật bằng chuột thật,
// hoàn tác một bước, lưu PPTX (đọc lại bằng PowerPoint ở scripts/audit-0610/ppt_shape_format_readback.ps1).
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_SHAPEFMT_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\shape_format.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 120000 });
const canvas = "window.__vnoAppInstance.canvas";
const shapeState = () => ev(`(() => { const s = ${canvas}.slides[${canvas}.currentSlideIndex].shapes[0]; return { fill: s.fill, stroke: s.stroke, strokeWidth: s.strokeWidth, strokeDash: s.strokeDash, rotation: s.rotation || 0, flipH: !!s.flipH, flipV: !!s.flipV, shadow: s.shadow ? JSON.stringify(s.shadow) : null }; })()`);
const menuItem = async (label) => {
  const box = await ev(`(() => { const items = [...document.querySelectorAll('.vno-ribbon-dropdown-item')]; const el = items.find(e => (e.getAttribute("title") || e.textContent.replace(/[▸\\s]+$/u, "").trim()) === ${JSON.stringify(label)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};
const openDropdown = async (id) => {
  const box = await ev(`(() => { const el = document.querySelector('[data-dropdown-id=${JSON.stringify(id)}]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy nút: " + id);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};

try {
  await sleep(1500);
  const tabHiddenBefore = await ev(`document.querySelector('#vno-ribbon-tab-shapeFormat')?.hidden`);
  check("Chưa chọn hình: tab Định dạng hình ẩn", tabHiddenBefore === true, String(tabHiddenBefore));

  await ev(`${canvas}.insertShape("rect")`);
  await sleep(500);
  const point = await ev(`(() => { const el = document.querySelector('.vno-slide-shape-item'); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await mouseClick(cdp, point.x, point.y);
  await sleep(500);
  check("Chọn hình bằng chuột: tab Định dạng hình hiện", (await ev(`document.querySelector('#vno-ribbon-tab-shapeFormat')?.hidden`)) === false);
  // Thẻ ngữ cảnh nằm cuối thanh thẻ, có thể ngoài vùng nhìn của cửa sổ thử: bấm bằng .click() thay vì theo tọa độ chuột.
  await ev(`document.querySelector("#vno-ribbon-tab-shapeFormat").click()`);
  await sleep(300);

  // Tô màu: chọn «Xanh lá» trong bảng màu
  await openDropdown("slides.shape.fill");
  await menuItem("Xanh lá");
  let state = await shapeState();
  check("Tô màu hình bằng bảng màu", /^#00b050$/i.test(state.fill || ""), JSON.stringify(state));

  // Viền: màu Đỏ, độ dày 3 pt, nét gạch
  await openDropdown("slides.shape.outline");
  await menuItem("Đỏ");
  await openDropdown("slides.shape.outline");
  console.log("before:", await ev(`[...document.querySelectorAll(".vno-ribbon-dropdown-item")].map(e => JSON.stringify(e.textContent.trim())).join("|")`));
  await menuItem("Độ dày");
  console.log("submenu items:", await ev(`[...document.querySelectorAll(".vno-ribbon-dropdown-item")].map(e => e.textContent.trim()).join("|")`));
  await menuItem("3 pt");
  await openDropdown("slides.shape.outline");
  console.log("third open items:", await ev(`document.querySelectorAll(".vno-ribbon-dropdown-item").length`));
  console.log("rects:", await ev(`JSON.stringify([...document.querySelectorAll(".vno-ribbon-dropdown-menu, .vno-ribbon-dropdown-item")].slice(0,1).concat([...document.querySelectorAll(".vno-ribbon-dropdown-item")].slice(-2)).map(e => { const r = e.getBoundingClientRect(); return [e.className.slice(0,28), Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; })) + " win " + innerWidth + "x" + innerHeight`));
  await menuItem("Nét đứt");
  console.log("dash items:", await ev(`[...document.querySelectorAll(".vno-ribbon-dropdown-item")].map(e => e.textContent.replace(/\\s+/g, " ").trim()).join("|")`));
  await menuItem("Gạch");
  state = await shapeState();
  check("Viền: màu đỏ, 3 pt, nét gạch", /^#ff0000$/i.test(state.stroke || "") && Math.abs(state.strokeWidth * (await ev(`${canvas}.ptPerPx || 1`)) - 3) < 0.2 && state.strokeDash === "Long_20_Dash", JSON.stringify(state));

  // Đổ bóng + xoay + lật
  await openDropdown("slides.shape.effects");
  await menuItem("Bóng phía dưới bên phải");
  await openDropdown("slides.arrange.rotate");
  await menuItem("Xoay phải 90°");
  await openDropdown("slides.arrange.rotate");
  await menuItem("Lật ngang");
  state = await shapeState();
  check("Đổ bóng, xoay phải 90°, lật ngang", !!state.shadow && state.rotation === 90 && state.flipH === true && state.flipV === false, JSON.stringify(state));
  const css = await ev(`(() => { const el = document.querySelector('.vno-slide-shape-item'); return el.style.transform + ' | ' + el.style.boxShadow; })()`);
  check("Canvas hiển thị đúng xoay + lật + bóng", /rotate\(90deg\)/.test(css) && /scaleX\(-1\)/.test(css) && /px/.test(css.split("|")[1]), css);

  // Hoàn tác từng thao tác: lật ngang rồi xoay
  await ev(`document.querySelector('.vno-slide-shape-item')?.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z hoàn tác một bước (bỏ lật ngang)", (await shapeState()).flipH === false);

  // Hộp thoại Kích thước và vị trí
  await click(cdp, '[data-command-id="slides.shape.sizeDialog"]');
  await sleep(400);
  const dialog = await ev(`!!document.querySelector('#vno-shape-format-width')`);
  check("Kích thước và vị trí… mở hộp thoại kích thước", dialog === true);
  await ev(`document.querySelector('#vno-shape-format-cancel')?.click()`);

  // Lưu PPTX
  await ev(`${canvas}.setSelectedTarget(null)`);
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; const content = a.serializeToFodp(); return JSON.stringify(await window.pywebview.api.save_document_in_place(content, 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 120); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
} catch (error) {
  check("Shape format tab không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

const failed = checks.filter(item => !item.pass);
if (failed.length) process.exit(1);
console.log(`Slides shape format tab: ${checks.length}/${checks.length} PASS`);
