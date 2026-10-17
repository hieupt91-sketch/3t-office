// Slides: Hoạt hình > Sao chép hoạt ảnh (hai lần nhấn), hoàn tác, lưu PPTX (PowerPoint đọc lại cả hai hiệu ứng).
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const OUT = process.env.VNO_ANIMPAINT_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\anim_painter.pptx";
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
const animOf = (index) => ev(`JSON.stringify(${canvas}.slides[0].shapes[${index}]?.animation || null)`);

try {
  await sleep(1500);
  await ev(`${canvas}.insertShape("rect")`);
  await ev(`${canvas}.insertShape("ellipse")`);
  await sleep(300);
  await ev(`${canvas}.setSelectedTarget(${canvas}.slides[0].shapes[0].id)`);
  await ev(`${canvas}.updateSelectedAnimation({ type: "flyIn", duration: 1500, delay: 500, start: "afterPrevious", direction: "left" }, true)`);
  await click(cdp, "#vno-ribbon-tab-animations");
  await sleep(300);

  await click(cdp, '[data-command-id="slides.animation.painter"]');
  check("Lần 1 lấy hiệu ứng (chưa đổi hình thứ hai)", (await animOf(1)) === "null" || JSON.parse(await animOf(1)).type === "none");
  await ev(`${canvas}.setSelectedTarget(${canvas}.slides[0].shapes[1].id)`);
  await click(cdp, '[data-command-id="slides.animation.painter"]');
  await sleep(300);
  const a = JSON.parse(await animOf(1));
  check("Lần 2 dán: hình thứ hai có cùng kiểu, thời lượng, độ trễ, cách bắt đầu", a?.type === "flyIn" && a?.duration === 1500 && a?.delay === 500 && a?.start === "afterPrevious", JSON.stringify(a));
  check("Hướng được sao chép", a?.direction === "left", JSON.stringify(a));

  const saved = await ev(`(async () => { const x = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(x.serializeToFodp(), 'slides', ${JSON.stringify(OUT)}, null)).slice(0, 80); })()`);
  check("Lưu PPTX", /"status":\s*"ok"/.test(saved), saved);

  await ev(`document.body.focus()`);
  await press(cdp, "z", { ctrl: true });
  await sleep(300);
  const undone = await animOf(1);
  check("Ctrl+Z hoàn tác việc dán", undone === "null" || JSON.parse(undone).type === "none", undone);

  await ev(`${canvas}.setSelectedTarget(${canvas}.slides[0].shapes[1].id)`);
  await ev(`${canvas}.updateSelectedAnimation({ type: "none" }, true)`);
  await click(cdp, '[data-command-id="slides.animation.painter"]');
  check("Lấy hiệu ứng từ đối tượng chưa có hiệu ứng không làm gì", (await ev(`!!${canvas}._animationPainterSource`)) === false);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides animation painter: ${checks.length}/${checks.length} PASS`);
