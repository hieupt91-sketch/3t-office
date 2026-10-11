import fs from 'node:fs/promises';
import path from 'node:path';
import { launchApp } from '../../../../tests/live/cdp/session.mjs';

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
if (!root) throw new Error('Set VNO_APP_ROOT to this worktree.');
if (!localAppData) throw new Error('Set VNO_CDP_LOCALAPPDATA to the dedicated test profile.');
const input = path.join(localAppData, 'template.pptx');
const output = path.join(localAppData, 'features-result.pptx');
const session = await launchApp('slides', { root, filePath: input, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath === ${JSON.stringify(input)}`, { timeoutMilliseconds: 180000 });
  await session.cdp.waitFor('window.__vnoAppInstance?.adapter?.canvas?.slides?.length > 0', { timeoutMilliseconds: 180000 });
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${localAppData} | ROOT ${root}`);

  const addShape = await session.cdp.evaluate(`(async()=>{
    const c=window.__vnoAppInstance.adapter.canvas,b=window.globalCommandBus||window.__vnoGlobalCommandBus;
    const before=c.slides[c.currentSlideIndex].shapes.length;
    const result=await b.execute('slides.shape.insert');
    const shape=c.slides[c.currentSlideIndex].shapes.at(-1);
    return {result,before,after:c.slides[c.currentSlideIndex].shapes.length,id:shape.id};
  })()`, { awaitPromise: true });
  console.log('SHAPE ' + JSON.stringify(addShape));

  const notes = await session.cdp.evaluate(`(async()=>{
    const b=window.globalCommandBus||window.__vnoGlobalCommandBus;
    await b.execute('slides.notes.toggle');
    const area=document.querySelector('#vno-notes-textarea');
    if(!area) throw new Error('Speaker notes editor is missing.');
    area.value='FIX-L4 speaker notes'; area.dispatchEvent(new Event('input',{bubbles:true}));
    return {value:area.value};
  })()`, { awaitPromise: true });
  console.log('NOTES ' + JSON.stringify(notes));

  await session.cdp.evaluate(`(()=>{const b=window.globalCommandBus||window.__vnoGlobalCommandBus;void b.execute('slides.transition.apply')})()`);
  await session.cdp.waitFor("!!document.querySelector('#vno-trans-type-select')", { timeoutMilliseconds: 10000 });
  const transition = await session.cdp.evaluate(`(()=>{
    const type=document.querySelector('#vno-trans-type-select'), duration=document.querySelector('#vno-trans-duration-select');
    type.value='slide'; type.dispatchEvent(new Event('change',{bubbles:true}));
    duration.value='800'; duration.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#vno-trans-apply-current').click();
    const s=window.__vnoAppInstance.adapter.canvas.slides[window.__vnoAppInstance.adapter.canvas.currentSlideIndex];
    return s.transition;
  })()`);
  console.log('TRANSITION ' + JSON.stringify(transition));

  await session.cdp.evaluate(`(()=>{const b=window.globalCommandBus||window.__vnoGlobalCommandBus;void b.execute('slides.animation.apply')})()`);
  await session.cdp.waitFor("!!document.querySelector('#vno-anim-type-select')", { timeoutMilliseconds: 10000 });
  const animation = await session.cdp.evaluate(`(()=>{
    const c=window.__vnoAppInstance.adapter.canvas, shape=c.slides[c.currentSlideIndex].shapes.find(s=>String(s.id)===${JSON.stringify(String(addShape.id))});
    const target=document.querySelector('#vno-anim-target-select'), type=document.querySelector('#vno-anim-type-select');
    target.value=${JSON.stringify(String(addShape.id))}; target.dispatchEvent(new Event('change',{bubbles:true}));
    type.value='fadeIn'; type.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('#vno-anim-duration-select').value='800';
    document.querySelector('#vno-anim-delay-select').value='200';
    document.querySelector('#vno-anim-apply').click();
    return shape.animation;
  })()`);
  console.log('ANIMATION ' + JSON.stringify(animation));

  const hidden = await session.cdp.evaluate(`(async()=>{const b=window.globalCommandBus||window.__vnoGlobalCommandBus;await b.execute('slides.slide.toggleHidden');return !!window.__vnoAppInstance.adapter.canvas.slides[window.__vnoAppInstance.adapter.canvas.currentSlideIndex].hidden})()`, { awaitPromise: true });
  console.log('HIDDEN ' + JSON.stringify(hidden));
  const saved = await session.cdp.evaluate('window.__vnoAppInstance.adapter.save()', { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!saved) throw new Error('SlidesAdapter.save() returned false.');
  await session.cdp.waitFor('window.__vnoAppInstance.adapter.isDirty === false', { timeoutMilliseconds: 120000, intervalMilliseconds: 250 });
  await fs.copyFile(input, output);
  console.log(JSON.stringify({ phase: 'save', result: saved, file: output }));
} finally {
  await session.close();
}
