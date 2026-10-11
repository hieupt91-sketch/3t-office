import fs from 'node:fs/promises'; import path from 'node:path'; import {fileURLToPath} from 'node:url'; import {launchApp} from './session.mjs'; import {click,press,typeText,mouseClick} from './actions.mjs';
const root=process.env.VNO_APP_ROOT, localAppData=process.env.VNO_CDP_LOCALAPPDATA; const output=path.join(localAppData,'fix-l6-show.pptx');
const ev=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../docs/tickets-0710/evidence/fix-l6'); await fs.copyFile(path.join(localAppData,'template.pptx'),output);
const s=await launchApp('slides',{root,filePath:output,localAppData,startTimeoutMilliseconds:180000,readyTimeoutMilliseconds:180000});
try {
 await s.cdp.waitFor(`window.__vnoAppInstance?.adapter?.sourceFilePath===${JSON.stringify(output)}`,{timeoutMilliseconds:180000});
 await click(s.cdp,'#vno-ribbon-tab-home'); await click(s.cdp,'[data-command-id="slides.slide.new"]');
 const before=await s.cdp.evaluate(`JSON.stringify({n:window.__vnoAppInstance.adapter.canvas.slides.length,i:window.__vnoAppInstance.adapter.canvas.currentSlideIndex})`); console.log('AFTER_NEW '+before);
 await click(s.cdp,'.vno-slide-title'); await typeText(s.cdp,'START CURRENT CHECK',15);
 const selected=await s.cdp.evaluate(`JSON.stringify({n:window.__vnoAppInstance.adapter.canvas.slides.length,i:window.__vnoAppInstance.adapter.canvas.currentSlideIndex,title:window.__vnoAppInstance.adapter.canvas.slides[window.__vnoAppInstance.adapter.canvas.currentSlideIndex].title})`); console.log('SELECTED '+selected);
 await click(s.cdp,'#vno-ribbon-tab-slideshow'); await click(s.cdp,'[data-command-id="slides.show.startFromCurrent"]');
 await s.cdp.waitFor('document.querySelector(".vno-slideshow-overlay")',{timeoutMilliseconds:30000});
 const showing=await s.cdp.evaluate(`JSON.stringify({text:document.querySelector('.vno-slideshow-content')?.innerText,overlay:!!document.querySelector('.vno-slideshow-overlay')})`); console.log('SHOWING '+showing);
 await fs.mkdir(ev,{recursive:true}); const shot=await s.cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}); await fs.writeFile(path.join(ev,'slideshow-current.png'),Buffer.from(shot.result.data,'base64'));
 await press(s.cdp,'p',{ctrl:true},200); const pen=await s.cdp.evaluate(`JSON.stringify({mode:!!document.querySelector('.vno-slideshow-ink-overlay'),laser:document.querySelector('.vno-slideshow-laser-dot')?.style.display})`); console.log('PEN '+pen);
 const r=await s.cdp.evaluate(`(()=>{const e=document.querySelector('.vno-slideshow-content').getBoundingClientRect();return{x:e.left+e.width*.4,y:e.top+e.height*.4}})()`); await mouseClick(s.cdp,r.x,r.y); const mouse=await s.cdp.evaluate(`({mode:document.querySelector('.vno-slideshow-ink-overlay')?.querySelectorAll('path').length||0})`); console.log('INK '+JSON.stringify(mouse));
 await press(s.cdp,'l',{ctrl:true},200); const laser=await s.cdp.evaluate(`({display:document.querySelector('.vno-slideshow-laser-dot')?.style.display})`); console.log('LASER '+JSON.stringify(laser));
 await press(s.cdp,'Escape',{},300);
} finally {await s.close()}
