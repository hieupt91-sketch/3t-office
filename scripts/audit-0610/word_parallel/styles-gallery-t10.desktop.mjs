import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { click, mouseDrag, press, typeText } from "../../../tests/live/cdp/actions.mjs";
import { mkdirSync, writeFileSync } from "node:fs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
if (!dir || !process.env.VNO_APP_ROOT) throw new Error("Set VNO_CDP_LOCALAPPDATA and VNO_APP_ROOT.");
mkdirSync(dir, { recursive: true });
const output = `${dir}\\styles-gallery-t10.docx`;
const session = await launchApp("writer", { localAppData: dir, root: process.env.VNO_APP_ROOT, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await click(cdp, ".vno-writer-body p", 0);
  const lines = ["Title sample", "Subtitle sample", "Quote sample", "List paragraph sample"];
  await typeText(cdp, lines[0], 18);
  await cdp.waitFor("document.querySelector('.vno-writer-body')?.textContent.includes('Title sample')", { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
  for (const line of lines.slice(1)) {
    await press(cdp, "Enter", {}, 100);
    await typeText(cdp, line, 18);
    await cdp.waitFor(`document.querySelector('.vno-writer-body')?.textContent.includes(${JSON.stringify(line)})`, { timeoutMilliseconds: 5000, intervalMilliseconds: 100 });
  }
  const select = async text => {
    const bounds = await cdp.evaluate(`(()=>{const p=[...document.querySelectorAll('.vno-writer-body p')].find(x=>x.textContent.includes(${JSON.stringify(text)}));if(!p)return null;const r=document.createRange();r.selectNodeContents(p);const b=[...r.getClientRects()].filter(x=>x.width&&x.height);return b.length?{x1:b[0].left+1,y1:b[0].top+b[0].height/2,x2:b.at(-1).right-1,y2:b.at(-1).top+b.at(-1).height/2}:null})()`);
    if (!bounds) throw new Error(`Paragraph not found: ${text}; editor=${await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML")}`);
    await mouseDrag(cdp, bounds.x1, bounds.y1, bounds.x2, bounds.y2, { steps: 7 });
    if (!(await cdp.evaluate("String(getSelection())")).includes(text)) throw new Error(`Selection failed: ${text}`);
  };
  const apply = async (text, style) => {
    await select(text);
    await click(cdp, 'button[data-command-id="writer.style.gallery"]');
    await click(cdp, `.vno-style-gallery-dropdown .vno-style-card[data-style-id="${style}"]`);
  };
  for (const [text, style] of [[lines[0], "title"], [lines[1], "subtitle"], [lines[2], "quote"], [lines[3], "listparagraph"]]) await apply(text, style);
  const cards = await cdp.evaluate(`(()=>[...document.querySelectorAll('.vno-style-gallery-dropdown')].length===0&&['title','subtitle','quote','listparagraph'].every(id=>window.__vnoAppInstance.adapter.bodyDom.innerHTML.includes('vno-style-'+({title:'title',subtitle:'subtitle',quote:'quote',listparagraph:'list-paragraph'}[id]))) )()`);
  if (!cards) throw new Error("A selected gallery style is missing from the editor DOM");
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(`${dir}\\styles-gallery-t10.png`, Buffer.from(shot.result.data, "base64"));
  const saved = await cdp.evaluate(`(()=>{const a=window.__vnoAppInstance.adapter;return globalThis.globalUnoBridge.saveRealFileInPlace("writer",a._contentForExport(),${JSON.stringify(output)},${JSON.stringify(output)});})()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  console.log(JSON.stringify({ saved, output, screenshot: `${dir}\\styles-gallery-t10.png`, appPid: session.child?.pid ?? null }));
} finally {
  await session.close();
  if (session.child?.pid && session.child.exitCode === null && session.child.signalCode === null) {
    session.child.kill("SIGTERM");
    await Promise.race([session.exited, new Promise(resolve => setTimeout(resolve, 5000))]);
  }
}
