// Slides: vẽ bút khi trình chiếu rồi thoát và «Giữ chú thích» -> nét thành hình trên trang -> lưu PPTX.
// PowerPoint COM đọc hình bằng scripts/audit-0610/ppt_ink_readback.ps1.
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_INK_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\ink_keep.pptx");
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 120000 });
const mouse = (type, x, y, extra = {}) => cdp.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1, ...extra });
const canvas = "window.__vnoAppInstance.adapter.canvas";
try {
  await sleep(2500);
  const before = await ev(`${canvas}.slides[0].shapes.length`);
  await ev(`window.__show = ${canvas}.startSlideShow(0)`);
  await sleep(700);
  const box = JSON.parse(await ev(`JSON.stringify((() => { const r = document.querySelector('.vno-slideshow-overlay').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })())`));
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
  await press(cdp, "p", { ctrl: true });
  await mouse("mouseMoved", cx - 120, cy - 40, { buttons: 0 });
  await mouse("mousePressed", cx - 120, cy - 40);
  for (let i = 1; i <= 10; i++) await mouse("mouseMoved", cx - 120 + i * 24, cy - 40 + Math.round(Math.sin(i / 2) * 40));
  await mouse("mouseReleased", cx + 120, cy - 40);
  await sleep(200);
  check("Có 1 nét vẽ trong phiên chiếu", (await ev(`window.__show.getStrokes().length`)) === 1);
  await ev(`window.__show.close(true)`);
  await sleep(500);
  const after = JSON.parse(await ev(`JSON.stringify(${canvas}.slides[0].shapes.map(s => ({ type: s.type, w: s.w, h: s.h })).slice(-2))`));
  const count = await ev(`${canvas}.slides[0].shapes.length`);
  check("Giữ chú thích: thêm đúng 1 hình nét vẽ vào trang", count === before + 1 && after[after.length - 1].type === "ink", JSON.stringify({ before, count, after }));
  check("Hình nét vẽ có kích thước tương ứng (rộng ≈ 240)", after[after.length - 1].w > 150, JSON.stringify(after[after.length - 1]));
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);
