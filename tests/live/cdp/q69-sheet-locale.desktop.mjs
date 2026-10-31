import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { click, mouseClick, press, sleep, typeText } from "./actions.mjs";

const screenshotDir = path.join(repoRoot, "docs", "screenshots");
await mkdir(screenshotDir, { recursive: true });
const localAppData = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-q69-${Date.now()}`);
const startupStartedAt = performance.now();
const session = await launchApp("sheet", { localAppData });
console.log(`APP_STARTUP_MS | ${Math.round(performance.now() - startupStartedAt)} | fresh local profile`);
if (process.env.VNO_Q69_STARTUP_ONLY === "1") {
  await session.close();
  process.exit(0);
}
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const cdp = session.cdp;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 30000 });
const capture = async name => {
  const response = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(screenshotDir, name);
  await writeFile(file, Buffer.from(response.result?.data || "", "base64"));
  console.log(`SCREENSHOT | ${file}`);
};
const cellPoint = async coord => ev(`(() => { const el = document.querySelector('[data-coord="${coord}"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`);
const enter = async (coord, value) => {
  const point = await cellPoint(coord);
  if (!point) throw new Error(`Cell ${coord} is not visible.`);
  await mouseClick(cdp, point.x, point.y);
  await typeText(cdp, value, 2);
  await press(cdp, "Enter");
  await sleep(150);
};
const switchLocale = async locale => {
  await ev(`localStorage.setItem("vno-locale", ${JSON.stringify(locale)}); location.reload(); true`);
  await cdp.waitFor(`window.__vnoAppInstance?.grid && window.__vnoAppInstance.grid.options.numberLocale.locale === ${JSON.stringify(locale === "en" ? "en-US" : "vi-VN")} && !document.querySelector('.vno-sheet-quick-view')`, { timeoutMilliseconds: 90000 });
  await sleep(500);
};

try {
  await cdp.waitFor("window.__vnoAppInstance?.grid && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 90000 });
  const servedFormulaEngine = await ev(`fetch("/apps/sheet/formula-engine.js", {cache:"reload"}).then(async r=>({status:r.status,cache:r.headers.get("Cache-Control"),patched:(await r.text()).includes("NumberFormatter.formatGeneralNumber(Number(text), this.numberLocale)"),url:r.url}))`);
  check("WebView2 fetches the current locale-aware formula engine file", servedFormulaEngine.status === 200 && servedFormulaEngine.cache === "no-cache" && servedFormulaEngine.patched, JSON.stringify(servedFormulaEngine));
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(300);
  await capture("q69-sheet-vi-light.png");
  await click(cdp, "#vno-toggle-theme-btn");
  await sleep(250);
  await capture("q69-sheet-vi-dark.png");
  await click(cdp, "#vno-toggle-theme-btn");

  await enter("B1", "=TEXTJOIN(\"|\";TRUE;0.5;1234.5)");
  const viJoinState = await ev(`(() => { const g=window.__vnoAppInstance.grid, c=g.cellsData.get("B1"); return { value:c?.val, formula:c?.formula }; })()`);
  check("VI entered TEXTJOIN formula displays decimal comma", viJoinState.value === "0,5|1234,5", JSON.stringify(viJoinState));
  await enter("A1", "0,5");
  await mouseClick(cdp, ...(Object.values(await cellPoint("A1"))));
  const vi = await ev(`(() => {
    const app=window.__vnoAppInstance, g=app.grid;
    return { value:g.cellsData.get("A1")?.val, formulaBar:document.querySelector("#vno-formula-val")?.value,
      locale:g.options.numberLocale, placeholder:document.querySelector("#vno-formula-val")?.placeholder,
      status:document.querySelector("#vno-status-docinfo")?.innerText||document.querySelector(".vno-status-bar")?.innerText||"",
    };
  })()`);
  check("VI formula bar displays decimal comma", vi.formulaBar === "0,5", vi.formulaBar);
  check("VI formula placeholder is localized", vi.placeholder?.includes("Nhập giá trị"), vi.placeholder);
  check("VI status text is localized", vi.status.includes("SẴN SÀNG") && vi.status.includes("Ô:"), vi.status);

  await switchLocale("en");
  await capture("q69-sheet-en-light.png");
  await click(cdp, "#vno-toggle-theme-btn");
  await sleep(250);
  await capture("q69-sheet-en-dark.png");
  const enUi = await ev(`({placeholder:document.querySelector("#vno-formula-val")?.placeholder,
    status:document.querySelector("#vno-status-docinfo")?.innerText||document.querySelector(".vno-status-bar")?.innerText||""})`);
  check("EN formula placeholder has no Vietnamese text", enUi.placeholder?.includes("Enter a value"), enUi.placeholder);
  check("EN initial status text is localized", !/[À-ỹ]/u.test(enUi.status) && /ready/i.test(enUi.status), enUi.status);

  await enter("A1", "0,5");
  await enter("A2", "1234,5");
  await enter("A3", "1234567,891");
  await enter("A4", "1.234,5");
  await enter("A5", "1,234.5");
  const datePoint = await cellPoint("A6");
  await mouseClick(cdp, datePoint.x, datePoint.y);
  await typeText(cdp, "12/31/2026", 2);
  const typedDateText = await ev(`document.querySelector("#vno-formula-val")?.value`);
  check("EN date text reaches the formula bar unchanged", typedDateText === "12/31/2026", typedDateText);
  await press(cdp, "Enter");
  await sleep(150);
  const datePointAfterEntry = await cellPoint("A6");
  await mouseClick(cdp, datePointAfterEntry.x, datePointAfterEntry.y);
  const dateFormulaBar = await ev(`document.querySelector("#vno-formula-val")?.value`);
  check("EN formula bar keeps month/day date order", dateFormulaBar === "12/31/2026", dateFormulaBar);
  await enter("B1", "=TEXTJOIN(\"\";TRUE;A3)");
  const en = await ev(`(() => {const g=window.__vnoAppInstance.grid; const get=k=>g.cellsData.get(k);
    return {values:["A1","A2","A3","A4","A5","A6","B1"].map(k=>get(k)?.val),
      types:["A1","A2","A3","A4"].map(k=>typeof get(k)?.val), formats:["A5","A6"].map(k=>get(k)?.style?.numberFormat?.category),
      formulaBar:document.querySelector("#vno-formula-val")?.value,
      dateText:document.querySelector('[data-coord="A6"]')?.textContent?.trim(),
      };})()`);
  check("EN invalid comma and mixed separators remain text", en.values.slice(0,4).every((v,i)=>v===["0,5","1234,5","1234567,891","1.234,5"][i]) && en.types.slice(0,4).every(type=>type==="string"), JSON.stringify({values:en.values.slice(0,4),types:en.types}));
  check("EN US grouped decimal is numeric without rounding", en.values[4] === 1234.5 && en.formats[0] === "number", JSON.stringify({value:en.values[4],format:en.formats[0]}));
  check("EN accepts month/day date input without changing its date", en.values[5] === 46387 && en.formats[1] === "date" && en.dateText === "12/31/2026", JSON.stringify({value:en.values[5],format:en.formats[1],dateText:en.dateText}));
  check("EN TEXTJOIN preserves comma-containing text", en.values[6] === "1234567,891", JSON.stringify(en.values[6]));
  const enValueStatus = await ev(`document.querySelector("#vno-status-docinfo")?.innerText || document.querySelector(".vno-status-bar")?.innerText || ""`);
  check("EN selection status has no Vietnamese statistic labels", !/[À-ỹ]/u.test(enValueStatus) && /COUNT/.test(enValueStatus) && /AVERAGE/.test(enValueStatus) && /SUM/.test(enValueStatus), enValueStatus);
  await capture("q69-sheet-en-values.png");

  const grid = await ev(`(() => {const g=window.__vnoAppInstance.grid; g._warnForLegacyFormula("=XLOOKUP(A1;B:B;C:C)"); return document.body.innerText;})()`);
  check("EN one-function warning uses singular grammar", /Function XLOOKUP is/.test(grid), grid.match(/Function XLOOKUP[^\n]*/)?.[0] || "warning missing");
  await capture("q69-sheet-en-warning.png");
} catch (error) {
  check("CDP session completed without exception", false, error.stack || error.message);
} finally {
  await session.close().catch(() => {});
}
if (checks.some(pass => !pass)) process.exit(1);
