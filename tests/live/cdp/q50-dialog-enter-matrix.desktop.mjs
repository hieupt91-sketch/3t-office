import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir, { recursive: true });
const targets = {
  writer: [
    "writer.insert.equation", "writer.insert.symbol", "writer.insert.crossReference",
    "writer.reference.captionInsert", "writer.review.wordCount", "writer.mailMerge.open",
  ],
  sheet: [
    "sheet.data.validation", "sheet.data.goalSeek", "sheet.data.dataTable",
    "sheet.data.scenarioManager", "sheet.data.pivotTable", "sheet.format.conditional",
    "sheet.style.formatAsTable", "sheet.row.height", "sheet.page.margins", "sheet.page.size",
  ],
  slides: [
    "slides.insert.table", "slides.diagram.insert", "slides.insert.headerFooter",
    "slides.insert.dateTime", "slides.insert.symbol", "slides.insert.wordart",
    "slides.review.spellCheck",
  ],
};

let failures = 0;
for (const [app, commands] of Object.entries(targets)) {
  const session = await launchApp(app, { localAppData: path.join(profileRoot, app) });
  try {
    const win = await session.cdp.send("Browser.getWindowForTarget", {});
    await session.cdp.send("Browser.setWindowBounds", {
      windowId: (win.result || win).windowId,
      bounds: { windowState: "normal", width: 1366, height: 768 },
    });
    for (const command of commands) {
      await session.cdp.evaluate(`void window.globalCommandBus.execute(${JSON.stringify(command)})`);
      await sleep(250);
      if (app === "writer" && command === "writer.mailMerge.open") {
        await session.cdp.evaluate(`(() => [...document.querySelectorAll('[role="dialog"] button,.vno-dialog-box button')].find(b=>(b.innerText||'').includes('Dán dữ liệu mẫu'))?.click())()`);
        await sleep(250);
      }
      const before = await session.cdp.evaluate(`(() => {
        const visible=e=>!!(e&&e.getClientRects().length&&getComputedStyle(e).display!=='none');
        const dialogs=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].filter(visible);
        const d=dialogs.at(-1), root=d?.classList.contains('vno-dialog-box')?d:(d?.querySelector('.vno-dialog-box')||d);
        const buttons=[...(root?.querySelectorAll('button')||[])].filter(visible);
        const mailMergeSave=buttons.find(b=>(b.innerText||'').includes('Lưu nguồn dữ liệu'));
        const primary=mailMergeSave||buttons.find(b=>/(primary|submit|apply|insert|confirm|ok)/i.test(String(b.className))&&!/(cancel|close)/i.test(String(b.className)))||buttons.filter(b=>!/(cancel|close|hủy|đóng)/i.test((b.innerText||'').trim())).at(-1);
        const r=root?.getBoundingClientRect();
        primary?.focus();
        return {open:!!root,title:(root?.querySelector('h1,h2,h3,[class*=title]')?.innerText||'').trim(),primaryText:(primary?.innerText||'').trim(),primaryDisabled:primary?.disabled||primary?.getAttribute('aria-disabled')==='true',content:(root?.innerText||'').trim(),rect:r?.toJSON()};
      })()`);
      if (!before.open) {
        console.log(`FAIL | ${app} | ${command} | dialog did not open | ${JSON.stringify(before)}`);
        failures++;
        continue;
      }
      const beforeShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const stem = `enter-${app}-${command.split(".").at(-1)}`;
      writeFileSync(path.join(outputDir, `${stem}-before-1366x768.png`), Buffer.from((beforeShot.result || beforeShot).data, "base64"));
      await press(session.cdp, "Enter", {}, 250);
      const after = await session.cdp.evaluate(`(() => { const visible=e=>e.getClientRects().length&&getComputedStyle(e).display!=='none'; const dialogs=[...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].filter(visible); const d=dialogs.at(-1),root=d?.classList.contains('vno-dialog-box')?d:(d?.querySelector('.vno-dialog-box')||d); return {open:!!root,content:(root?.innerText||'').trim(),alerts:[...document.querySelectorAll('[role="alert"],.vno-dialog-error,.vno-rule-error')].filter(visible).map(e=>(e.innerText||e.textContent||'').trim()).filter(Boolean)}; })()`);
      const afterShot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(path.join(outputDir, `${stem}-after-1366x768.png`), Buffer.from((afterShot.result || afterShot).data, "base64"));
      const expectedStay = before.primaryDisabled;
      const contentChanged = before.content !== after.content;
      const pass = expectedStay ? after.open : (!after.open || after.alerts.length > 0 || contentChanged);
      if (!pass) failures++;
      console.log(`${pass ? "PASS" : "FAIL"} | ${app} | ${command} | Enter ${expectedStay ? "keeps disabled dialog open" : "activates enabled primary or reports validation error"} | ${JSON.stringify({before, after})}`);
      if (after.open) await press(session.cdp, "Escape", {}, 100);
    }
  } finally {
    await session.close();
  }
}
console.log(`SUMMARY ${23 - failures}/23 expected Enter outcomes; failures=${failures}`);
if (failures) process.exitCode = 1;
