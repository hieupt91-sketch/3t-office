// Slides: Định dạng hình > Kích thước và vị trí… đặt rộng/cao/xoay chính xác -> lưu PPTX -> PowerPoint COM đọc lại (scripts/audit-0610/ppt_shape_size_readback.ps1).
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const OUT = process.env.VNO_SHAPESIZE_OUT || platformOutputPath("E:\\VNOffice-profiles\\claude-slidetrans\\shape_size.pptx");
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 120000 });
const canvas = "window.__vnoAppInstance.adapter.canvas";
try {
  await sleep(2500);
  await ev(`(() => { const c = ${canvas}; c.slides[0].shapes.length = 0; c.slides[0].shapes.push({ id: "box1", type: "rect", x: 100, y: 100, w: 200, h: 100, color: "#3b82f6", fill: "#3b82f6" }); c._renderShapesLayer(); c.setSelectedTarget("box1"); })()`);
  await sleep(500);
  // Tab Định dạng hình hiện khi chọn hình; mở hộp Kích thước và vị trí bằng lệnh
  ev(`window.globalCommandBus.execute("slides.shape.sizeDialog")`).catch(() => {});
  await cdp.waitFor("document.querySelector('#vno-shape-format-width')", { timeoutMilliseconds: 10000 });
  await ev(`(() => { document.querySelector('#vno-shape-format-width').value = '320'; document.querySelector('#vno-shape-format-height').value = '120'; document.querySelector('#vno-shape-format-rotation').value = '30'; })()`);
  await ev(`document.querySelector('#vno-shape-format-apply').click()`);
  await sleep(500);
  const shape = JSON.parse(await ev(`JSON.stringify((() => { const s = ${canvas}.slides[0].shapes.find(x => x.id === "box1"); return { w: s.w, h: s.h, rotation: s.rotation }; })())`));
  check("Mô hình: rộng 320, cao 120, xoay 30°", shape.w === 320 && shape.h === 120 && shape.rotation === 30, JSON.stringify(shape));
  await ev(`document.body.focus()`);
  await ev(`${canvas}.undo ? ${canvas}.undo() : window.globalCommandBus.execute("common.edit.undo")`);
  await sleep(400);
  const undone = JSON.parse(await ev(`JSON.stringify((() => { const s = ${canvas}.slides[0].shapes.find(x => x.id === "box1"); return { w: s.w, h: s.h, rotation: s.rotation || 0 }; })())`));
  check("Hoàn tác trả về 200×100, không xoay", undone.w === 200 && undone.h === 100 && !undone.rotation, JSON.stringify(undone));
  await ev(`window.globalCommandBus.execute("common.edit.redo")`);
  await sleep(400);
  const redone = await ev(`${canvas}.slides[0].shapes.find(x => x.id === "box1").w`);
  check("Làm lại: rộng 320", redone === 320, String(redone));
  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);
  console.log("OUT " + OUT);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);
