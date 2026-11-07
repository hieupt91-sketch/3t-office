import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const mode = process.argv[2] || process.env.VNO_Q73_MODE || "";
const cases = {
  dark: { file: "E:/VN OFice/file test/lan-legacy/legacy07.doc", name: "legacy07" },
  legacy: { file: "E:/VN OFice/file test/lan-legacy/legacy07.doc", name: "legacy07" },
  d03: { file: "E:/VN OFice/file test/landocx/d03.docx", name: "d03" },
  d24: { file: "E:/VN OFice/file test/landocx/d24.docx", name: "d24" },
};
const target = cases[mode];
const profile = process.env.VNO_CDP_LOCALAPPDATA;
const artifactDir = process.env.VNO_Q73_ARTIFACTS || "E:/VNOffice-briefs/runs/Q73/ui-shots";
if (!target || !profile) throw new Error("Pass mode dark|legacy|d03|d24 and a unique VNO_CDP_LOCALAPPDATA.");

await fs.mkdir(artifactDir, { recursive: true });
const session = await launchApp("writer", { filePath: target.file, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const { cdp } = session;
const result = { mode, screenshots: [] };

try {
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await cdp.waitFor(`String(window.__vnoAppInstance?.adapter?._sourcePath || window.__vnoAppInstance?.adapter?.sourceFilePath || '').toLowerCase().endsWith(${JSON.stringify(path.basename(target.file).toLowerCase())})`, { timeoutMilliseconds: 240000, intervalMilliseconds: 250 });
  await sleep(1400);
  const screenshot = async (theme) => {
    await cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
    await sleep(120);
    const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30000);
    const file = path.join(artifactDir, `q73-${target.name}-${theme}-1366x768-${mode}.png`);
    await fs.writeFile(file, Buffer.from((shot.result || shot).data, "base64"));
    result.screenshots.push(file);
  };
  await screenshot("light");
  await screenshot("dark");

  result.metrics = await cdp.evaluate(`(() => {
    const page=document.querySelector('.vno-writer-page');
    if (!page) return { error:'page not found' };
    const color=(s)=>{const m=String(s).match(/[\\d.]+/g)||[];return m.slice(0,3).map(Number)};
    const lum=(s)=>{const c=color(s).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
    const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
    const effectiveBg=(e)=>{for(let n=e;n&&n!==page.parentElement;n=n.parentElement){const bg=getComputedStyle(n).backgroundColor;if(bg!=='rgba(0, 0, 0, 0)'&&bg!=='transparent')return bg}return getComputedStyle(page).backgroundColor};
    const textNodes=[...page.querySelectorAll('p,li,td,th,span,font')].filter(e=>e.textContent.trim());
    const textContrast=textNodes.map(e=>({text:e.textContent.trim().slice(0,40),fg:getComputedStyle(e).color,bg:effectiveBg(e),value:+contrast(getComputedStyle(e).color,effectiveBg(e)).toFixed(2)}));
    const coverTitles=[...page.querySelectorAll('p')].filter(p=>[...p.querySelectorAll('font')].some(f=>{const rgb=getComputedStyle(f).color.match(/[\\d.]+/g)?.slice(0,3).map(Number)||[];return rgb.length===3&&Math.min(...rgb)>245&&parseFloat(getComputedStyle(f).fontSize)>=30})).map(p=>{const r=p.getBoundingClientRect(),pr=page.getBoundingClientRect();return{text:p.innerText.trim(),x:r.x-pr.x,y:r.y-pr.y,width:r.width,height:r.height}});
    const pairs=[]; if (${JSON.stringify(mode)}==='d03') {
      const nodes=[...page.querySelectorAll('p,td,th')].filter(e=>e.textContent.trim());
      const ranges=nodes.flatMap((e,i)=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()].map(x=>({i,text:e.textContent.trim().slice(0,48),x:x.x,y:x.y,right:x.right,bottom:x.bottom,el:e}))});
      for(let i=0;i<ranges.length;i++)for(let j=i+1;j<ranges.length;j++){const a=ranges[i],b=ranges[j];if(a.el.contains(b.el)||b.el.contains(a.el))continue;const w=Math.min(a.right,b.right)-Math.max(a.x,b.x),h=Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y);if(w>3&&h>3)pairs.push({a:a.text,b:b.text,overlap:[+w.toFixed(1),+h.toFixed(1)]})}
    }
    return {theme:document.documentElement.dataset.theme,viewport:[innerWidth,innerHeight],page:{width:page.clientWidth,scrollWidth:page.scrollWidth,background:getComputedStyle(page).backgroundColor},body:{scrollWidth:page.querySelector('.vno-writer-body')?.scrollWidth||0,clientWidth:page.querySelector('.vno-writer-body')?.clientWidth||0},minTextContrast:Math.min(...textContrast.map(x=>x.value)),lowContrastSamples:textContrast.filter(x=>x.value<4.5).slice(0,8),coverTitles,overlappingTextPairs:pairs.slice(0,12)};
  })()`);

  if (mode === "dark") result.pass = result.metrics.page.background === "rgb(255, 255, 255)" && result.metrics.minTextContrast >= 4.5;
  else if (mode === "legacy") result.pass = result.metrics.page.scrollWidth <= result.metrics.page.width + 2;
  else if (mode === "d24") result.pass = result.metrics.coverTitles.length > 0 && result.metrics.coverTitles.every(t => t.y + t.height < 0.25 * 805 || t.y > 0.45 * 805);
  else result.pass = result.metrics.overlappingTextPairs.length === 0;
  console.log(JSON.stringify(result, null, 2));
} finally {
  await session.close();
}

if (!result.pass) process.exitCode = 1;
