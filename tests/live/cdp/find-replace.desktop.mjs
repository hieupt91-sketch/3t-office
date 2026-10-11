import path from "node:path";
import { pathToFileURL } from "node:url";
import { click, press, typeText, insertText } from "./actions.mjs";
import { sleep } from "./client.mjs";
import { launchApp } from "./session.mjs";

const rows = [];
const appKinds = ["writer", "sheet", "slides"];
const appLabels = { writer: "3T Doc", sheet: "3T Sheet", slides: "3T Slide" };

function report(status, label, detail = "") {
  rows.push({ status, label, detail: String(detail || "").replace(/\s+/g, " ").trim() });
}

async function testWriter(session) {
  const { cdp } = session;
  const label = "3T Doc Find/Replace & 1-step Undo";

  // 1. Focus editor body
  await click(cdp, ".vno-writer-body p");
  await sleep(400);

  // 2. Type initial text with Vietnamese diacritics
  const initialText = "Văn phòng Việt Nam hiện đại";
  await insertText(cdp, initialText);
  await sleep(400);

  const textBefore = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText || ''");
  if (!textBefore.includes("Việt Nam")) {
    throw new Error("Initial text not found in Writer: " + textBefore);
  }

  // 3. Press Ctrl+F using trusted CDP key event
  await press(cdp, "f", { ctrl: true });
  await cdp.waitFor("!!document.querySelector('.vno-fr-dialog-overlay')", { timeoutMilliseconds: 10000 });

  const isFindTabActive = await cdp.evaluate("!!document.querySelector('#vno-fr-tab-find.active')");
  if (!isFindTabActive) throw new Error("Find tab is not active on Ctrl+F");

  // 4. Enter word with Vietnamese diacritics to find
  await click(cdp, "#vno-fr-find-input");
  await sleep(100);
  await insertText(cdp, "Việt Nam");
  await sleep(200);

  await click(cdp, "#vno-fr-find-next-btn");
  await sleep(300);

  const findStatus = await cdp.evaluate("document.querySelector('#vno-fr-status')?.textContent || ''");
  if (findStatus.includes("Không tìm thấy")) {
    throw new Error("Find failed for word with diacritics: " + findStatus);
  }

  // 5. Press Ctrl+H using trusted CDP key event
  await press(cdp, "h", { ctrl: true });
  await cdp.waitFor("!!document.querySelector('#vno-fr-tab-replace.active')", { timeoutMilliseconds: 5000 });

  // 6. Enter replacement text and click Replace All
  await click(cdp, "#vno-fr-replace-input");
  await sleep(100);
  await insertText(cdp, "Hà Nội");
  await sleep(200);

  await click(cdp, "#vno-fr-replace-all-btn");
  await sleep(400);

  // 7. Close dialog via Escape
  await press(cdp, "Escape");
  await cdp.waitFor("!document.querySelector('.vno-fr-dialog-overlay')", { timeoutMilliseconds: 5000 });
  await sleep(300);

  // Verify text was replaced
  const textAfterReplace = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText || ''");
  if (!textAfterReplace.includes("Hà Nội") || textAfterReplace.includes("Việt Nam")) {
    throw new Error("Replace all did not replace text in Writer. Text: " + textAfterReplace);
  }

  // 8. Press Ctrl+Z with trusted CDP key event to restore in ONE undo
  await click(cdp, ".vno-writer-body p");
  await sleep(200);
  await press(cdp, "z", { ctrl: true });
  await sleep(400);

  const textRestored = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText || ''");
  if (!textRestored.includes("Việt Nam") || textRestored.includes("Hà Nội")) {
    throw new Error("Ctrl+Z did not restore text in ONE undo in Writer. Text: " + textRestored);
  }

  return { pass: true, detail: "Found 'Việt Nam' -> Replaced with 'Hà Nội' -> Restored via Ctrl+Z in 1 undo" };
}

async function testSheet(session) {
  const { cdp } = session;
  const label = "3T Sheet Find/Replace & 1-step Undo";

  // 1. Focus cell A1
  await click(cdp, '[data-coord="A1"]');
  await sleep(400);

  // 2. Type initial text with Vietnamese diacritics via formula input
  await click(cdp, ".vno-formula-input, #vno-formula-val");
  await sleep(100);
  await insertText(cdp, "Thủ đô Hà Nội");
  await press(cdp, "Enter");
  await sleep(400);

  const cellBefore = await cdp.evaluate("document.querySelector('[data-coord=\"A1\"]')?.textContent?.trim() || ''");
  if (!cellBefore.includes("Hà Nội")) {
    throw new Error("Initial text not found in Sheet cell A1: " + cellBefore);
  }

  // 3. Press Ctrl+F using trusted CDP key event
  await click(cdp, '[data-coord="A1"]');
  await sleep(200);
  await press(cdp, "f", { ctrl: true });
  await cdp.waitFor("!!document.querySelector('.vno-fr-dialog-overlay')", { timeoutMilliseconds: 10000 });

  const isFindTabActive = await cdp.evaluate("!!document.querySelector('#vno-fr-tab-find.active')");
  if (!isFindTabActive) throw new Error("Find tab is not active on Ctrl+F in Sheet");

  // 4. Enter word with Vietnamese diacritics to find
  await click(cdp, "#vno-fr-find-input");
  await sleep(100);
  await insertText(cdp, "Hà Nội");
  await sleep(200);

  await click(cdp, "#vno-fr-find-next-btn");
  await sleep(300);

  // 5. Press Ctrl+H using trusted CDP key event
  await press(cdp, "h", { ctrl: true });
  await cdp.waitFor("!!document.querySelector('#vno-fr-tab-replace.active')", { timeoutMilliseconds: 5000 });

  // 6. Enter replacement text and click Replace All
  await click(cdp, "#vno-fr-replace-input");
  await sleep(100);
  await insertText(cdp, "Đà Nẵng");
  await sleep(200);

  await click(cdp, "#vno-fr-replace-all-btn");
  await sleep(400);

  // 7. Close dialog via Escape
  await press(cdp, "Escape");
  await cdp.waitFor("!document.querySelector('.vno-fr-dialog-overlay')", { timeoutMilliseconds: 5000 });
  await sleep(300);

  // Verify cell was replaced
  const cellAfterReplace = await cdp.evaluate("document.querySelector('[data-coord=\"A1\"]')?.textContent?.trim() || ''");
  if (!cellAfterReplace.includes("Đà Nẵng") || cellAfterReplace.includes("Hà Nội")) {
    throw new Error("Replace all did not replace cell text in Sheet. Cell: " + cellAfterReplace);
  }

  // 8. Press Ctrl+Z with trusted CDP key event to restore in ONE undo
  await click(cdp, '[data-coord="A1"]');
  await sleep(200);
  await press(cdp, "z", { ctrl: true });
  await sleep(400);

  const cellRestored = await cdp.evaluate("document.querySelector('[data-coord=\"A1\"]')?.textContent?.trim() || ''");
  if (!cellRestored.includes("Hà Nội") || cellRestored.includes("Đà Nẵng")) {
    throw new Error("Ctrl+Z did not restore cell text in ONE undo in Sheet. Cell: " + cellRestored);
  }

  return { pass: true, detail: "Found 'Hà Nội' -> Replaced with 'Đà Nẵng' -> Restored via Ctrl+Z in 1 undo" };
}

async function testSlides(session) {
  const { cdp } = session;
  const label = "3T Slide Find/Replace & 1-step Undo";

  // 1. Focus editable slide text placeholder
  const selector = await cdp.evaluate(
    "document.querySelector('.vno-slide-title, .vno-slide-body')?.className?.includes('vno-slide-title') ? '.vno-slide-title' : '.vno-slide-body'"
  );
  if (!selector) throw new Error("No editable slide placeholder found");

  await click(cdp, selector);
  await sleep(400);

  // 2. Type initial text with Vietnamese diacritics
  const initialText = "Bài giảng tiếng Việt";
  await insertText(cdp, initialText);
  await sleep(400);

  const textBefore = await cdp.evaluate("document.querySelector(" + JSON.stringify(selector) + ")?.innerText || ''");
  if (!textBefore.includes("tiếng Việt")) {
    throw new Error("Initial text not found in Slide placeholder: " + textBefore);
  }

  // 3. Press Ctrl+F using trusted CDP key event
  await press(cdp, "f", { ctrl: true });
  await cdp.waitFor("!!document.querySelector('.vno-fr-dialog-overlay')", { timeoutMilliseconds: 10000 });

  const isFindTabActive = await cdp.evaluate("!!document.querySelector('#vno-fr-tab-find.active')");
  if (!isFindTabActive) throw new Error("Find tab is not active on Ctrl+F in Slide");

  // 4. Enter word with Vietnamese diacritics to find
  await click(cdp, "#vno-fr-find-input");
  await sleep(100);
  await insertText(cdp, "tiếng Việt");
  await sleep(200);

  await click(cdp, "#vno-fr-find-next-btn");
  await sleep(300);

  // 5. Press Ctrl+H using trusted CDP key event
  await press(cdp, "h", { ctrl: true });
  await cdp.waitFor("!!document.querySelector('#vno-fr-tab-replace.active')", { timeoutMilliseconds: 5000 });

  // 6. Enter replacement text and click Replace All
  await click(cdp, "#vno-fr-replace-input");
  await sleep(100);
  await insertText(cdp, "toàn cầu");
  await sleep(200);

  await click(cdp, "#vno-fr-replace-all-btn");
  await sleep(400);

  // 7. Close dialog via Escape
  await press(cdp, "Escape");
  await cdp.waitFor("!document.querySelector('.vno-fr-dialog-overlay')", { timeoutMilliseconds: 5000 });
  await sleep(300);

  // Verify slide text was replaced
  const textAfterReplace = await cdp.evaluate("document.querySelector(" + JSON.stringify(selector) + ")?.innerText || ''");
  if (!textAfterReplace.includes("toàn cầu") || textAfterReplace.includes("tiếng Việt")) {
    throw new Error("Replace all did not replace text in Slide. Text: " + textAfterReplace);
  }

  // 8. Press Ctrl+Z with trusted CDP key event to restore in ONE undo
  await click(cdp, ".vno-slide-canvas");
  await sleep(200);
  await press(cdp, "z", { ctrl: true });
  await sleep(400);

  const textRestored = await cdp.evaluate("document.querySelector(" + JSON.stringify(selector) + ")?.innerText || ''");
  if (!textRestored.includes("tiếng Việt") || textRestored.includes("toàn cầu")) {
    throw new Error("Ctrl+Z did not restore text in ONE undo in Slide. Text: " + textRestored);
  }

  return { pass: true, detail: "Found 'tiếng Việt' -> Replaced with 'toàn cầu' -> Restored via Ctrl+Z in 1 undo" };
}

async function runTest(app) {
  const prefix = appLabels[app];
  console.log(`\n▶ Starting desktop CDP proof for ${prefix}...`);
  const session = await launchApp(app);
  try {
    let result;
    if (app === "writer") result = await testWriter(session);
    else if (app === "sheet") result = await testSheet(session);
    else if (app === "slides") result = await testSlides(session);
    report("PASS", prefix + " Find/Replace & 1-step Undo", result.detail);
    console.log(`  [PASS] ${prefix}: ${result.detail}`);
  } catch (error) {
    report("FAIL", prefix + " Find/Replace & 1-step Undo", error?.stack || error?.message || String(error));
    console.error(`  [FAIL] ${prefix}:`, error?.message || error);
  } finally {
    await session.close().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const selected = process.argv[2] ? [process.argv[2]] : appKinds;
  for (const app of selected) {
    await runTest(app);
  }

  const widths = {
    status: Math.max(6, ...rows.map(row => row.status.length)),
    label: Math.max(5, ...rows.map(row => row.label.length)),
  };
  console.log("");
  console.log("STATUS".padEnd(widths.status) + " | " + "CHECK".padEnd(widths.label) + " | DETAIL");
  console.log("-".repeat(widths.status) + "-+-" + "-".repeat(widths.label) + "-+-" + "-".repeat(72));
  for (const row of rows) {
    console.log(row.status.padEnd(widths.status) + " | " + row.label.padEnd(widths.label) + " | " + row.detail);
  }
  const passCount = rows.filter(row => row.status === "PASS").length;
  const failCount = rows.filter(row => row.status === "FAIL").length;
  console.log("");
  console.log("TOTAL: " + passCount + " PASS, " + failCount + " FAIL");
  if (failCount > 0) process.exitCode = 1;
}
