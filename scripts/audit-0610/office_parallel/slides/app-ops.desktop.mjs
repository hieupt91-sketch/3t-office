import fs from 'node:fs/promises';
import path from 'node:path';
import { launchApp } from '../../../../tests/live/cdp/session.mjs';

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root) throw new Error('Set VNO_APP_ROOT to this worktree.');
if (!localAppData) throw new Error('Set VNO_CDP_LOCALAPPDATA to the dedicated test profile.');
const input = path.join(localAppData, 'template.pptx');
const output = path.join(localAppData, 'app-result.pptx');
const session = await launchApp('slides', { root, filePath: input, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const record = async (name, action) => {
  const result = await action();
  console.log(JSON.stringify({ phase: name, result }));
  return result;
};
try {
  await session.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(input)}`, { timeoutMilliseconds: 180000 });
  await session.cdp.waitFor('window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0', { timeoutMilliseconds: 180000 });
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData} | ROOT ${root}`);

  await record('insert-textbox', () => session.cdp.evaluate(`(async()=>{
    const c=window.__vnoAppInstance.adapter.canvas;
    const bus=window.globalCommandBus||window.__vnoGlobalCommandBus;
    const result=await bus.execute('slides.text.insert');
    const shape=c.slides[c.currentSlideIndex].shapes.at(-1);
    const editor=document.querySelector('[data-shape-text-id="'+CSS.escape(String(shape.id))+'"][contenteditable="true"]');
    if(!editor) throw new Error('Inserted textbox is not in text edit mode.');
    editor.focus(); document.execCommand('insertText',false,'FIX-L4 font audit');
    const selection=getSelection(),range=document.createRange();range.selectNodeContents(editor);selection.removeAllRanges();selection.addRange(range);
    return {result,id:shape.id,editable:editor.isContentEditable,text:editor.innerText};
  })()`, { awaitPromise: true }));

  const selectedFont = async (id, args) => session.cdp.evaluate(`(async()=>{
    const bus=window.globalCommandBus||window.__vnoGlobalCommandBus;
    const result=await bus.execute(${JSON.stringify(id)},${JSON.stringify(args)});
    const el=document.querySelector('[data-shape-text-id="'+CSS.escape(String(window.__vnoAppInstance.adapter.canvas.selectedTarget))+'"]');
    return {result,cssFontSize:el&&getComputedStyle(el).fontSize,html:el&&el.innerHTML};
  })()`, { awaitPromise: true });
  await record('font-18', () => selectedFont('slides.font.size', '18'));
  await record('font-grow-1', () => selectedFont('slides.font.grow', null));
  await record('font-grow-2', () => selectedFont('slides.font.grow', null));
  await record('font-shrink-1', () => selectedFont('slides.font.shrink', null));
  await record('bold', () => selectedFont('slides.text.bold', null));
  await record('align-center', () => selectedFont('slides.para.alignCenter', null));
  await record('insert-shape', () => session.cdp.evaluate(`(async()=>{
    const c=window.__vnoAppInstance.adapter.canvas,bus=window.globalCommandBus||window.__vnoGlobalCommandBus;
    const before=c.slides[c.currentSlideIndex].shapes.length;
    const result=await bus.execute('slides.shape.insert');
    return {result,before,after:c.slides[c.currentSlideIndex].shapes.length};
  })()`, { awaitPromise: true }));
  const state = await session.cdp.evaluate(`JSON.stringify((()=>{const a=window.__vnoAppInstance.adapter,c=a.canvas,s=c.slides[c.currentSlideIndex];return {source:a.sourceFilePath,slideCount:c.slides.length,shapeCount:s.shapes.length,shapes:s.shapes.map(x=>({id:x.id,type:x.type,text:x.text||'',textHtml:x.textHtml||'',fontSize:x.fontSize||null,fontFamily:x.fontFamily||null,bold:x.bold||false,textAlign:x.textAlign||null,x:x.x,y:x.y,w:x.w,h:x.h,fill:x.fill||x.color,stroke:x.stroke||null,rotation:x.rotation||0})),notes:s.notes||'',hidden:!!s.hidden,transition:s.transition||null,groups:s.groups||[]};})())`);
  console.log(`MODEL ${state}`);
  const saved = await session.cdp.evaluate('window.__vnoAppInstance.adapter.save()', { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error('SlidesAdapter.save() returned false.');
  await session.cdp.waitFor('window.__vnoAppInstance.adapter.isDirty === false', { timeoutMilliseconds: 120000, intervalMilliseconds: 250 });
  await fs.copyFile(input, output);
  await fs.writeFile(path.join(localAppData, 'app-ops.json'), state, 'utf8');
  console.log(JSON.stringify({ phase: 'save', result: saved, source: input, appResult: output }));
} finally {
  await session.close();
}
