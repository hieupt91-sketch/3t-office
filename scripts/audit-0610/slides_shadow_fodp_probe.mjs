// Kiểm tra bóng đổ hình có đi vào FODP khi Slides tuần tự hóa (chẩn đoán lỗi bóng không ra PPTX).
import { launchApp } from "../../tests/live/cdp/session.mjs";

const session = await launchApp("slides", {});
const ev = (expression) => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await ev(`window.__vnoAppInstance.canvas.insertShape("rect")`);
  await ev(`(() => { const c = window.__vnoAppInstance.canvas; const s = c.slides[c.currentSlideIndex].shapes[0]; s.shadow = { visible: true, offsetX: "0.2cm", offsetY: "0.2cm", color: "#000000" }; })()`);
  const xml = await ev(`(() => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return a.serializeToFodp(); })()`);
  const lines = String(xml).split("\n").filter(l => /shadow/.test(l));
  console.log(lines.length ? lines.join("\n") : "KHÔNG có draw:shadow trong FODP");
  (await import("node:fs")).writeFileSync("E:\\VNOffice-profiles\\claude-slidetrans\\shadow\\app.fodp", String(xml));
  const out = "E:\\VNOffice-profiles\\claude-slidetrans\\shadow_only.pptx";
  const saved = await ev(`(async () => { const a = window.__vnoAppInstance.adapter || window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), "slides", ${JSON.stringify(out)}, null)).slice(0, 100); })()`);
  console.log(saved);
} finally {
  await session.close();
}
