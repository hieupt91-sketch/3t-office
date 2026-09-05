import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const port = 8817;
const pw = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools/node_modules/playwright-core/index.mjs";
const { chromium } = await import(pathToFileURL(pw));
const server = http.createServer((req,res)=>{ const file=path.join(root,path.normalize(decodeURIComponent(req.url.split("?")[0]||"/")).replace(/^[/\\]+/,"")||"index.html"); if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404).end();return;} res.writeHead(200,{"Content-Type":file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":"text/html"}); fs.createReadStream(file).pipe(res); });
await new Promise(r=>server.listen(port,"127.0.0.1",r));
const browser=await chromium.launch({executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",headless:true});
const page=await browser.newPage({viewport:{width:1440,height:950}}); const failures=[];
const check=(ok,label)=>{console.log(`${ok?"PASS":"FAIL"}\t${label}`);if(!ok)failures.push(label);};
try {
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:"domcontentloaded"}); await page.waitForSelector(".vno-writer-page");
  for (const app of ["writer","sheet","slides"]) {
    if(app!=="writer"){await page.locator("#vno-switcher-toggle").click();await page.locator(`[data-switch="${app}"]`).click();}
    await page.locator(`.vno-shell[data-app="${app}"]`).waitFor({state:"visible"});
    await page.locator(`#vno-ribbon-tab-review`).click();
    const buttons=page.locator(`[data-command-id$="review.commentNext"], [data-command-id="writer.review.commentNext"]`);
    check(await buttons.count()>0,`${app}: ribbon có Next`); await buttons.first().click();
    for(const suffix of ["commentPrevious","commentDelete","commentResolve"]){check(await page.locator(`[data-command-id$="${suffix}"]`).count()>0,`${app}: ribbon có ${suffix}`);}
  }
} finally { await browser.close(); await new Promise(r=>server.close(r)); }
if(failures.length) throw new Error(failures.join(", "));
