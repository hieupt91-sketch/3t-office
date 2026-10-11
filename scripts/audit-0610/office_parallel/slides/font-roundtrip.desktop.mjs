import fs from 'node:fs/promises';
import path from 'node:path';
import { launchApp } from '../../../../tests/live/cdp/session.mjs';

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L4_FONT_SOURCE || 'E:\\VN OFice\\file test\\lan\\BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx';
if (!root) throw new Error('Set VNO_APP_ROOT to this worktree.');
if (!localAppData) throw new Error('Set VNO_CDP_LOCALAPPDATA to the dedicated test profile.');
const dir = path.join(localAppData, 'fix-l4-font');
const roundtrip = path.join(dir, 'business-roundtrip.pptx');
await fs.mkdir(dir, { recursive: true });
await fs.copyFile(source, roundtrip);
const session = await launchApp('slides', { root, filePath: roundtrip, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(roundtrip)}`, { timeoutMilliseconds: 240000, intervalMilliseconds: 250 });
  await session.cdp.waitFor('window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0', { timeoutMilliseconds: 240000, intervalMilliseconds: 250 });
  const before = await session.cdp.evaluate(`(()=>{const c=window.__vnoAppInstance.adapter.canvas;return {slides:c.slides.length,fonts:c.slides.flatMap(s=>s.shapes||[]).filter(x=>x.text).map(x=>({id:x.id,text:x.text.slice(0,60),textHtml:x.textHtml||''})).slice(0,20)}})()`);
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${localAppData} | ROOT ${root}`);
  console.log('IMPORT ' + JSON.stringify(before));
  const edited = await session.cdp.evaluate(`(()=>{
    const a=window.__vnoAppInstance.adapter,c=a.canvas;
    const shape=c.slides.flatMap(s=>s.shapes||[]).find(x=>x.text && x.textHtml && /font-family/i.test(x.textHtml));
    if(!shape) throw new Error('No formatted text shape with font family was imported.');
    const oldText=shape.text, oldHtml=shape.textHtml;
    const newText=oldText+' FIX-L4';
    const newHtml=oldHtml.replace(/(<\\/(?:span|b|i|u|font)>)/i,' FIX-L4$1');
    c.updateShapeText(shape.id,newText,newHtml);
    a.isDirty=true;
    return {shapeId:shape.id,before:oldText.slice(0,100),after:shape.text.slice(0,110),html:shape.textHtml};
  })()`);
  console.log('EDIT ' + JSON.stringify(edited));
  const saved = await session.cdp.evaluate('window.__vnoAppInstance.adapter.save()', { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error('Save returned false.');
  await session.cdp.waitFor('window.__vnoAppInstance.adapter.isDirty === false', { timeoutMilliseconds: 180000, intervalMilliseconds: 250 });
  console.log(JSON.stringify({ phase: 'save', result: saved, file: roundtrip }));
} finally {
  await session.close();
}
