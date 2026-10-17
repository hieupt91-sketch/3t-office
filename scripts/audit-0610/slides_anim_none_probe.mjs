// Chẩn đoán: gán rồi bỏ hiệu ứng bằng updateSelectedAnimation.
import { launchApp } from "../../tests/live/cdp/session.mjs";
const session = await launchApp("slides", {});
const ev = (expression) => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
try {
  await ev(`${canvas}.insertShape("rect")`);
  await ev(`${canvas}.setSelectedTarget(${canvas}.slides[0].shapes[0].id)`);
  console.log("set zoom", await ev(`${canvas}.updateSelectedAnimation({ type: "zoomIn" }, true)`), await ev(`JSON.stringify(${canvas}.slides[0].shapes[0].animation)`));
  console.log("set none", await ev(`${canvas}.updateSelectedAnimation({ type: "none" }, true)`), await ev(`JSON.stringify(${canvas}.slides[0].shapes[0].animation)`));
  console.log("active?", await ev(`${canvas}._isActiveAnimation(${canvas}.slides[0].shapes[0].animation)`));
} finally { await session.close(); }
