// Slides: thư viện hình dựng sẵn (Trang đầu > Hình), Đổi hình dạng, hoàn tác, lưu PPTX (PowerPoint đọc lại AutoShapeType).
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_SHAPEGAL_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\shape_gallery.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const shapes = () => ev(`JSON.stringify(${canvas}.slides[0].shapes.map(s => ({ type: s.type, geomType: s.geomType || null })))`);
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
  await click(cdp, "#vno-ribbon-tab-home");
  await sleep(300);
  for (const label of ["Tam giác cân", "Sao 5 cánh", "Mũi tên phải", "Hình trái tim"]) {
    await openDropdown("slides.shape.gallery");
    await menuItem(label);
  }
  const list = JSON.parse(await shapes());
  check("Chèn 4 hình dựng sẵn từ thư viện", list.map((s) => s.geomType).join(",") === "ooxml-triangle,ooxml-star5,ooxml-rightArrow,ooxml-heart", JSON.stringify(list));
  const svgCount = await ev(`document.querySelectorAll('.vno-slide-shape-item svg.vno-shape-geometry').length`);
  check("Trình soạn thảo vẽ đúng hình bằng SVG (4 hình)", svgCount === 4, String(svgCount));

  // Đổi hình dạng: chọn tam giác -> hình thoi
  await ev(`${canvas}.setSelectedTarget(${canvas}.slides[0].shapes[0].id)`);
  await click(cdp, "#vno-ribbon-tab-shapeFormat");
  await sleep(300);
  await openDropdown("slides.shape.changeType");
  await menuItem("Hình thoi");
  check("Đổi hình dạng: tam giác thành hình thoi", JSON.parse(await shapes())[0].geomType === "ooxml-diamond");
  await openDropdown("slides.shape.changeType");
  await menuItem("Hình elip");
  const afterEllipse = JSON.parse(await shapes())[0];
  check("Đổi sang elip: bỏ geomType, type = ellipse", afterEllipse.type === "ellipse" && afterEllipse.geomType === null, JSON.stringify(afterEllipse));

  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  check("Ctrl+Z hoàn tác một bước đổi hình dạng", JSON.parse(await shapes())[0].geomType === "ooxml-diamond");
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides shape gallery: ${checks.length}/${checks.length} PASS`);
