import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and dedicated VNO_CDP_LOCALAPPDATA.");
const session = await launchApp("slides", { root, localAppData });
try {
  const cdp = session.cdp;
  await click(cdp, "#vno-ribbon-tab-home");
  const button = await cdp.evaluate(`(() => { const el = document.querySelector('[data-dropdown-id="slides.shape.gallery"]'); if (!el) return null; const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (!button) throw new Error("Shape gallery dropdown was not found.");
  await mouseClick(cdp, button.x, button.y);
  await sleep(200);
  const data = JSON.parse(await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('.vno-ribbon-dropdown-item[data-command-id^="slides.shape.insert"]')].map(el => ({ label: el.getAttribute('aria-label'), svg: el.querySelector('.vno-menu-item-icon svg')?.outerHTML || '' })))`));
  if (data.length < 10) throw new Error(`Expected shape entries, found ${data.length}.`);
  if (data.some((item) => !item.svg)) throw new Error(`At least one menu item lacks its thumbnail: ${JSON.stringify(data.filter(item => !item.svg))}`);
  if (new Set(data.map((item) => item.svg)).size < data.length) throw new Error("Shape menu thumbnails are not unique per shape.");
  console.log(`PASS | slides-shape-menu-thumbs | ${data.length} unique SVG previews`);
} finally {
  await session.close();
}
