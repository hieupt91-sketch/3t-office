// Thử: hình có geomType ooxml-<prst> lưu ra PPTX có đúng prstGeom không (và PowerPoint nhận AutoShapeType nào).
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { sleep } from "../../tests/live/cdp/actions.mjs";
const OUT = process.argv[2] || "E:\\VNOffice-profiles\\claude-slidetrans\\geom_probe.pptx";
const presets = (process.argv[3] || "triangle,rtTriangle,diamond,parallelogram,trapezoid,pentagon,hexagon,star5,roundRect,heart,plus,rightArrow,leftArrow,upArrow,downArrow,wedgeRectCallout").split(",");
const session = await launchApp("slides", {});
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await sleep(1500);
  await ev(`(() => { const c = window.__vnoAppInstance.canvas; const s = c.slides[0]; ${JSON.stringify(presets)}.forEach((p, i) => s.shapes.push({ id: "g" + i, type: "rect", geomType: "ooxml-" + p, x: 20 + (i % 4) * 220, y: 20 + Math.floor(i / 4) * 130, w: 180, h: 100, color: "#3b82f6", text: "" })); c._renderShapesLayer(); })()`);
  console.log(await ev(`(async () => { const a = window.__vnoAppInstance.adapter; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), "slides", ${JSON.stringify(OUT)}, null)).slice(0, 60); })()`));
} finally { await session.close(); }
