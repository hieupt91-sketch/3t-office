import {launchApp} from './tests/live/cdp/session.mjs';
import {click, press, typeText, drag} from './tests/live/cdp/actions.mjs';
import {readFile, writeFile, unlink} from 'node:fs/promises';
import {sleep} from './tests/live/cdp/client.mjs';
let session = await launchApp('sheet');
let cdp = session.cdp;
const g = 'window.__vnoAppInstance.adapter.grid';
await writeFile('.sheet-cdp-ready.json', JSON.stringify({pid:session.child.pid,port:session.debugPort,url:cdp.target.url}));
console.log('READY',session.debugPort);
while (true) {
  let code;
  try { code = await readFile('.sheet-cdp-command.js','utf8'); } catch {await sleep(200);continue;}
  await unlink('.sheet-cdp-command.js');
  if(code.trim()==='EXIT'){await session.close();break;}
  try { const result = await eval('(async()=>{'+code+'})()'); await writeFile('.sheet-cdp-result.json',JSON.stringify({ok:true,result},null,2));console.log('DONE');}
  catch(e){await writeFile('.sheet-cdp-result.json',JSON.stringify({ok:false,error:e.stack},null,2));console.log('ERROR',e.message);}
}
