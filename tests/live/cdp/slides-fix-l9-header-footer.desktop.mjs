import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";
import { listZipEntries, readZipEntry } from "../../helpers/zip-package.mjs";

const root = process.env.VNO_APP_ROOT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profile) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const workDir = path.join(profile, "fix-l9");
await mkdir(workDir, { recursive: true });
const file = path.join(workDir, "header-footer.pptx");
const session = await launchApp("slides", { root, localAppData: profile });
let sessionClosed = false;
const check = (name, condition, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"} | ${name}${detail ? " | " + JSON.stringify(detail) : ""}`);
  assert.ok(condition, name);
};
const state = () => session.cdp.evaluate(`JSON.stringify((() => {
  const c = window.__vnoAppInstance.adapter.canvas;
  return { count:c.slides.length,current:c.currentSlideIndex,fields:c.slides.map(s=>s.headerFooter||null) };
})())`);
const ensureCheck = async (selector, desired) => {
  const checked = await session.cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.checked`);
  if (checked !== desired) await click(session.cdp, selector);
};
try {
  await click(session.cdp, '[data-command-id="slides.slide.new"]');
  await click(session.cdp, '[data-command-id="slides.slide.new"]');
  await session.cdp.waitFor("window.__vnoAppInstance.adapter.canvas.slides.length === 3", { timeoutMilliseconds: 30000 });
  let current = JSON.parse(await state());
  check("Blank presentation has three slides", current.count === 3, current);

  await click(session.cdp, "#vno-ribbon-tab-insert");
  await click(session.cdp, '[data-command-id="slides.insert.headerFooter"]');
  await session.cdp.waitFor('!!document.querySelector("[data-vno-dialog=header-footer]")', { timeoutMilliseconds: 30000 });
  await ensureCheck("#vno-hf-date", true);
  await ensureCheck("#vno-hf-number", true);
  await ensureCheck("#vno-hf-footer", true);
  await ensureCheck("#vno-hf-all", false);
  await click(session.cdp, "#vno-hf-text");
  await press(session.cdp, "A", { ctrl: true });
  await typeText(session.cdp, "VN Office FIX-L9 footer", 12);
  await click(session.cdp, '[data-vno-dialog="header-footer"] .vno-dialog-ok-btn');
  current = JSON.parse(await state());
  check("Apply current slide sets all three fields", current.fields[2]?.showDate && current.fields[2]?.showSlideNumber && current.fields[2]?.showFooter, current.fields);
  check("Slides 1 and 2 remain unapplied", !current.fields[0] && !current.fields[1], current.fields);

  const fodp = await session.cdp.evaluate("window.__vnoAppInstance.adapter.serializeToFodp()");
  const save = await session.cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("slides", ${JSON.stringify(fodp)}, ${JSON.stringify(file)}, "")`, { awaitPromise: true, timeoutMilliseconds: 600000 });
  check("Save through LibreOffice adapter succeeds", save?.status === "ok", save);
  const bytes = await readFile(file);
  const slideNames = listZipEntries(bytes).map(entry => entry.name).filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  check("PPTX package has three slides", slideNames.length === 3, slideNames);
  const slideXml = slideNames.sort().map(name => readZipEntry(bytes, name).toString("utf8"));
  for (const [index, xml] of slideXml.entries()) {
    const has = /<p:ph\b[^>]*\btype=["'](?:dt|ftr|sldNum)["']/.test(xml);
    check(`Slide ${index + 1} native header/footer placeholders`, index === 2 ? has : !has, { has });
  }
  await writeFile(path.join(workDir, "cdp-result.json"), JSON.stringify({ file, beforeReopen: current, slideNames }, null, 2) + "\n", "utf8");
  await session.close();
  sessionClosed = true;

  const reopenedSession = await launchApp("slides", { root, filePath: file, localAppData: profile });
  try {
    await reopenedSession.cdp.waitFor("window.__vnoAppInstance?.adapter?.canvas?.slides?.length === 3", { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
    const reopened = JSON.parse(await reopenedSession.cdp.evaluate(`JSON.stringify((() => {
      const c=window.__vnoAppInstance.adapter.canvas;
      return {count:c.slides.length,fields:c.slides.map(s=>s.headerFooter||null)};
    })())`));
    check("Reopen preserves three slides and the fields on slide 3", reopened.count === 3 && reopened.fields[2]?.showDate && reopened.fields[2]?.showSlideNumber && reopened.fields[2]?.showFooter && reopened.fields[2]?.footerText === "VN Office FIX-L9 footer", reopened);
    check("Reopen leaves slides 1 and 2 without fields", !reopened.fields[0] && !reopened.fields[1], reopened.fields);
  } finally {
    await reopenedSession.close();
  }
  console.log("SUMMARY 10/10");
} finally {
  if (!sessionClosed && session.child.exitCode === null && session.cdp) await session.close();
}
