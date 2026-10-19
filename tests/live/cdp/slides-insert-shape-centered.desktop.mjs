import { launchApp } from "./session.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and dedicated VNO_CDP_LOCALAPPDATA.");
const session = await launchApp("slides", { root, localAppData });
try {
  const cdp = session.cdp;
  const result = JSON.parse(await cdp.evaluate(`JSON.stringify((() => {
    const canvas = window.__vnoAppInstance.canvas;
    const slide = canvas.slides[canvas.currentSlideIndex];
    slide.shapes = [];
    canvas.insertShape("rect");
    const first = { ...slide.shapes.at(-1) };
    canvas.insertShape("rect");
    const second = { ...slide.shapes.at(-1) };
    const center = { x: Math.round((canvas.slideSize.width - first.w) / 2), y: Math.round((canvas.slideSize.height - first.h) / 2) };
    const overlaps = first.x < second.x + second.w && first.x + first.w > second.x && first.y < second.y + second.h && first.y + first.h > second.y;
    return { first, second, center, overlaps, diagonal: second.x > first.x && second.y > first.y };
  })())`));
  if (result.first.x !== result.center.x || result.first.y !== result.center.y) throw new Error(`First shape is not centered: ${JSON.stringify(result)}`);
  if (result.overlaps) throw new Error(`Second shape covers the first: ${JSON.stringify(result)}`);
  if (!result.diagonal) throw new Error(`Second shape was not offset diagonally: ${JSON.stringify(result)}`);
  console.log(`PASS | slides-insert-shape-centered | center=${result.center.x},${result.center.y} second=${result.second.x},${result.second.y} overlap=${result.overlaps}`);
} finally {
  await session.close();
}
