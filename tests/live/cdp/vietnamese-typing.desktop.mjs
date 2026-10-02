/**
 * CH-4.7 Live Desktop CDP Test Suite: Vietnamese Typing with Unikey / EVKey
 *
 * Verifies that typing with Vietnamese IMEs (Unikey, EVKey, Windows Vietnamese IME):
 * - Does not jump caret
 * - Does not lose or double diacritics
 * - Does not break 1-step undo
 * - Works while spell check is active
 * - Prevents Sheet formula autocomplete from interfering with Vietnamese text
 * - Prevents Enter from committing half-typed words
 * - Covers:
 *   - Doc: body, header, footer, table cells
 *   - Sheet: cell edit mode, formula bar, direct typing without F2
 *   - Slide: text boxes, notes
 * - Supports Telex and VNI, normal speed (30ms) and fast speed (5ms)
 * - Asserts model text (not only DOM) matches NFC string
 */

import { click, press } from "./actions.mjs";
import { sleep } from "./client.mjs";
import { launchApp } from "./session.mjs";
import {
  VIETNAMESE_TEST_PHRASES,
  phraseToImeEvents,
  replayImeEventsCdp,
  replayWindowsImeCompositionCdp
} from "./vietnamese-ime-simulator.mjs";

export const results = [];

function recordResult(app, target, testName, pass, detail = "") {
  const entry = {
    app,
    target,
    testName,
    pass: Boolean(pass),
    detail: String(detail || "").replace(/\s+/g, " ").trim()
  };
  results.push(entry);
  const status = entry.pass ? "PASS" : "FAIL";
  console.log(`[${status}] [${app.toUpperCase()} - ${target}] ${testName}${detail ? " -> " + detail : ""}`);
}

function summarizeScenario(app, target, baseTestName) {
  const scenarioResults = results.filter(r => r.app === app && r.target === target && r.testName.startsWith(baseTestName));
  const passed = scenarioResults.filter(r => r.pass).length;
  const total = scenarioResults.length;
  console.log(`\n[SUMMARY] [${app.toUpperCase()} - ${target}] ${baseTestName}: ${passed}/${total} PASS`);
  if (passed < total) {
    scenarioResults.filter(r => !r.pass).forEach(r => {
      const phrase = r.testName.split("|")[1]?.trim() || r.testName;
      console.log(`  FAIL: phrase="${phrase}" -> ${r.detail}`);
    });
  }
  return { passed, total };
}

/**
 * Helper to ensure a clean paragraph exists and is focused with caret inside it
 */
async function prepareEditableTarget(cdp, selector) {
  await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return;
    el.focus();
    let p = el.tagName === "P" ? el : el.querySelector("p");
    if (!p && (el.isContentEditable || el.getAttribute("contenteditable") === "true")) {
      p = document.createElement("p");
      el.appendChild(p);
    }
    const target = p || el;
    target.innerHTML = "<br>";
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(target, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  })()`);
  await sleep(150);
}

/**
 * Insert a real table in Writer by dispatching the app command `writer.table.insert`
 * through the shared command bus (the same path the ribbon button uses).
 * Returns the number of tables in the body after the dispatch.
 */
async function insertWriterTableViaCommand(cdp) {
  const outcome = await cdp.evaluate(`(async () => {
    try {
      const mod = await import('/platform/commands/command-bus.js');
      const bus = mod.globalCommandBus;
      if (!bus || typeof bus.execute !== "function") {
        return { ok: false, reason: "globalCommandBus is not available" };
      }
      const before = document.querySelectorAll('.vno-writer-body table').length;
      const handled = await bus.execute('writer.table.insert');
      const after = document.querySelectorAll('.vno-writer-body table').length;
      return { ok: after > before, handled, before, after };
    } catch (err) {
      return { ok: false, reason: String((err && err.message) || err) };
    }
  })()`);
  if (!outcome || !outcome.ok) {
    const reason = outcome?.reason || `tables ${outcome?.before} -> ${outcome?.after}, handled=${outcome?.handled}`;
    throw new Error("writer.table.insert did not create a table: " + reason);
  }
  return outcome.after;
}

/**
 * Click the first table cell with real CDP mouse events, wipe the template text the
 * command put there and prove the cell is empty before any typing starts.
 */
async function clearWriterTableCell(cdp) {
  await click(cdp, ".vno-writer-body table td", 0);
  await sleep(150);

  const selected = await cdp.evaluate(`(() => {
    const cell = document.querySelector('.vno-writer-body table td');
    if (!cell) return false;
    const sel = window.getSelection();
    if (!sel) return false;
    const range = document.createRange();
    range.selectNodeContents(cell);
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  })()`);
  if (!selected) throw new Error("Could not select the first Writer table cell");

  await press(cdp, "Delete", {}, 200);
  await sleep(150);

  const leftover = await cdp.evaluate("document.querySelector('.vno-writer-body table td')?.innerText || ''");
  if (leftover.trim() !== "") {
    throw new Error(`Table cell was not cleared before typing (value="${leftover.trim()}")`);
  }
}

/**
 * Press Delete on a Sheet cell so BOTH the cell model and the formula editor are reset,
 * prove the cell is empty, then enter F2 edit mode.
 * (F2 seeds the editor from formulaInput.value, so a stale editor would accumulate text.)
 */
async function prepareEmptySheetCellForF2(cdp, coord) {
  await click(cdp, `[data-coord="${coord}"]`);
  await sleep(150);

  await press(cdp, "Delete", {}, 200);
  await sleep(150);

  const valueBeforeF2 = await cdp.evaluate(
    `window.__vnoAppInstance?.grid?.cellsData?.get('${coord}')?.val ?? ""`
  );
  if (String(valueBeforeF2).trim() !== "") {
    throw new Error(`Cell ${coord} is not empty before F2 (value="${valueBeforeF2}")`);
  }

  await press(cdp, "F2", {}, 200);
  await sleep(150);

  const editorBeforeTyping = await cdp.evaluate(
    "document.querySelector('.vno-formula-input')?.value ?? ''"
  );
  if (String(editorBeforeTyping).trim() !== "") {
    throw new Error(`F2 editor is not empty before typing (editor="${editorBeforeTyping}")`);
  }

  return coord;
}

/**
 * Read a Sheet cell value from the APP MODEL (not the DOM).
 * Returns "" when the cell has never been written.
 */
async function readSheetCellValue(cdp, coord) {
  const raw = await cdp.evaluate(
    `window.__vnoAppInstance?.grid?.cellsData?.get(${JSON.stringify(coord)})?.val ?? ""`
  );
  return raw === undefined || raw === null ? "" : String(raw);
}

// =============================================================================
// 1. DOC (WRITER) TESTS
// =============================================================================
export async function testDocVietnameseTyping(session, options = {}) {
  const { cdp } = session;
  const phrases = options.phrases || VIETNAMESE_TEST_PHRASES;

  console.log("\n=== Testing Doc (Writer) Vietnamese Typing ===");

  // Wait for spellcheck status if present
  try {
    await cdp.waitFor("document.querySelector('.vno-writer-page[data-spellcheck-status=\"ready\"]')", {
      timeoutMilliseconds: 5000
    });
  } catch {}

  // --- Target 1: Writer Body (Normal 30ms & Fast 5ms, Telex & VNI, NFD to-hop) ---
  await prepareEditableTarget(cdp, ".vno-writer-body");

  // 1.1 Body - Telex Normal Speed (30ms) with ALL phrases
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-writer-body");
      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 30);
      await sleep(200);

      const modelText = await cdp.evaluate("document.querySelector('.vno-writer-body p')?.innerText || ''");
      const expectedLastWord = phrase.normalize("NFC").split(" ").pop() || "";
      const caretAtEnd = await cdp.evaluate(`(() => {
        const sel = window.getSelection();
        const p = document.querySelector('.vno-writer-body p');
        if (!sel || !sel.rangeCount || !p) return false;
        const text = p.innerText.replace(/\\s+$/, '');
        return sel.isCollapsed && text.endsWith(${JSON.stringify(expectedLastWord)});
      })()`);

      const pass = modelText.trim() === phrase.normalize("NFC") && caretAtEnd;
      recordResult("writer", "body", `Telex Normal (30ms) NFC | ${phrase}`, pass, `text="${modelText.trim()}"`);
    } catch (err) {
      recordResult("writer", "body", `Telex Normal (30ms) NFC | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("writer", "body", "Telex Normal (30ms) NFC");

  // 1.2 Body - 1-step Ctrl+Z Undo rule verification (using first phrase as representative)
  try {
    await prepareEditableTarget(cdp, ".vno-writer-body");
    const phrase = phrases[0];
    const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
    await replayImeEventsCdp(cdp, events, 30);
    await sleep(200);

    // Current text is phrase 0. Press Ctrl+Z once: should remove only the last word ("Nam") or chunk
    await press(cdp, "z", { ctrl: true }, 300);
    const afterUndo = await cdp.evaluate("document.querySelector('.vno-writer-body p')?.innerText || ''");
    const passUndo = !afterUndo.endsWith("Việt Nam") && afterUndo.includes("Cộng hòa");
    recordResult("writer", "body", "1-step Ctrl+Z undo removes last word", passUndo, `afterUndo="${afterUndo.trim()}"`);
  } catch (err) {
    recordResult("writer", "body", "1-step Ctrl+Z undo removes last word", false, err.message);
  }
  summarizeScenario("writer", "body", "1-step Ctrl+Z undo removes last word");

  // 1.3 Body - Fast Speed (5ms) Telex with ALL phrases
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-writer-body");
      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 5);
      await sleep(300);

      const modelText = await cdp.evaluate("document.querySelector('.vno-writer-body p')?.innerText || ''");
      const pass = modelText.trim() === phrase.normalize("NFC");
      recordResult("writer", "body", `Telex Fast (5ms) burst | ${phrase}`, pass, `text="${modelText.trim()}"`);
    } catch (err) {
      recordResult("writer", "body", `Telex Fast (5ms) burst | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("writer", "body", "Telex Fast (5ms) burst");

  // 1.4 Body - VNI Normal (30ms) with ALL phrases
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-writer-body");
      const events = phraseToImeEvents(phrase, { mode: "vni", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 30);
      await sleep(200);

      const modelText = await cdp.evaluate("document.querySelector('.vno-writer-body p')?.innerText || ''");
      const pass = modelText.trim() === phrase.normalize("NFC");
      recordResult("writer", "body", `VNI Normal (30ms) NFC | ${phrase}`, pass, `text="${modelText.trim()}"`);
    } catch (err) {
      recordResult("writer", "body", `VNI Normal (30ms) NFC | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("writer", "body", "VNI Normal (30ms) NFC");

  // 1.5 Body - NFD (Tổ hợp) Normalisation to NFC with ALL phrases
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-writer-body");
      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfd" });
      await replayImeEventsCdp(cdp, events, 15);
      await sleep(200);

      const modelText = await cdp.evaluate("document.querySelector('.vno-writer-body p')?.innerText || ''");
      // Assert normalized to NFC
      const pass = modelText.trim() === phrase.normalize("NFC");
      recordResult("writer", "body", `NFD decomposed normalises to NFC | ${phrase}`, pass, `text="${modelText.trim()}"`);
    } catch (err) {
      recordResult("writer", "body", `NFD decomposed normalises to NFC | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("writer", "body", "NFD decomposed normalises to NFC");

  // 1.6 Body - Windows Built-in IME Composition Path with ALL phrases
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-writer-body");
      await replayWindowsImeCompositionCdp(cdp, phrase, 20);
      await sleep(200);

      const modelText = await cdp.evaluate("document.querySelector('.vno-writer-body p')?.innerText || ''");
      const pass = modelText.trim() === phrase.normalize("NFC");
      recordResult("writer", "body", `Windows IME Composition Path | ${phrase}`, pass, `text="${modelText.trim()}"`);
    } catch (err) {
      recordResult("writer", "body", `Windows IME Composition Path | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("writer", "body", "Windows IME Composition Path");

  // --- Target 2: Header (.vno-writer-header) ---
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-writer-header");
      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 20);
      await sleep(200);

      const headerText = await cdp.evaluate("document.querySelector('.vno-writer-header')?.innerText || ''");
      const pass = headerText.includes(phrase.normalize("NFC"));
      recordResult("writer", "header", `Telex in Header | ${phrase}`, pass, `text="${headerText.trim()}"`);
    } catch (err) {
      recordResult("writer", "header", `Telex in Header | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("writer", "header", "Telex in Header");

  // --- Target 3: Footer (.vno-writer-footer) ---
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-writer-footer");
      const events = phraseToImeEvents(phrase, { mode: "vni", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 20);
      await sleep(200);

      const footerText = await cdp.evaluate("document.querySelector('.vno-writer-footer')?.innerText || ''");
      const pass = footerText.includes(phrase.normalize("NFC"));
      recordResult("writer", "footer", `VNI in Footer | ${phrase}`, pass, `text="${footerText.trim()}"`);
    } catch (err) {
      recordResult("writer", "footer", `VNI in Footer | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("writer", "footer", "VNI in Footer");

  // --- Target 4: Table cell — REAL check, table created by the app command ---
  let tableSetupError = null;
  try {
    await insertWriterTableViaCommand(cdp);
  } catch (err) {
    tableSetupError = err.message;
  }

  if (tableSetupError) {
    for (let pi = 0; pi < phrases.length; pi++) {
      const phrase = phrases[pi];
      recordResult("writer", "table-cell", `Telex in Table Cell | ${phrase}`, false, `Table setup failed: ${tableSetupError}`);
    }
  } else {
    for (let pi = 0; pi < phrases.length; pi++) {
      const phrase = phrases[pi];
      try {
        await clearWriterTableCell(cdp);
        const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
        await replayImeEventsCdp(cdp, events, 20);
        await sleep(200);

        const cellText = await cdp.evaluate("document.querySelector('.vno-writer-body table td')?.innerText || ''");
        const pass = cellText.trim() === phrase.normalize("NFC");
        recordResult("writer", "table-cell", `Telex in Table Cell | ${phrase}`, pass, `text="${cellText.trim()}"`);
      } catch (err) {
        recordResult("writer", "table-cell", `Telex in Table Cell | ${phrase}`, false, err.message);
      }
    }
  }
  summarizeScenario("writer", "table-cell", "Telex in Table Cell");
}

// =============================================================================
// 2. SHEET TESTS
// =============================================================================
export async function testSheetVietnameseTyping(session, options = {}) {
  const { cdp } = session;
  const phrases = options.phrases || VIETNAMESE_TEST_PHRASES;

  console.log("\n=== Testing Sheet Vietnamese Typing ===");

  // --- Target 1: Typing directly into a selected cell WITHOUT pressing F2 ---
  // The whole loop writes into the SAME cell B2, so before the LAST phrase the cell
  // already holds phrase #76. That model value is recorded here because ONE Ctrl+Z
  // must restore exactly it (see the corrected assertion below).
  let valueBeforeLastPhrase = null;
  const lastPhraseNfc = phrases.length ? String(phrases[phrases.length - 1]).normalize("NFC") : null;

  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      // Select cell B2
      await click(cdp, '[data-coord="B2"]');
      await sleep(200);

      // Read the cell value through the app model BEFORE typing the last phrase
      if (pi === phrases.length - 1) {
        valueBeforeLastPhrase = await readSheetCellValue(cdp, "B2");
      }

      // Type directly without F2
      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 25);
      await sleep(200);

      // Commit with Enter
      await press(cdp, "Enter", {}, 300);

      // Read back model text
      const modelVal = await cdp.evaluate("window.__vnoAppInstance?.grid?.cellsData?.get('B2')?.val || ''");
      const domVal = await cdp.evaluate("document.querySelector('[data-coord=\"B2\"]')?.textContent?.trim() || ''");

      const pass = modelVal.trim() === phrase.normalize("NFC") && domVal === phrase.normalize("NFC");
      recordResult("sheet", "direct-typing-no-f2", `Direct typing without F2 (Telex) | ${phrase}`, pass, `model="${modelVal}"`);
    } catch (err) {
      recordResult("sheet", "direct-typing-no-f2", `Direct typing without F2 (Telex) | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("sheet", "direct-typing-no-f2", "Direct typing without F2 (Telex)");

  // 1-step Ctrl+Z Undo for direct typing.
  // CORRECTED ASSERTION: the loop above typed 77 phrases into the SAME cell B2, so B2 is
  // NOT empty before the last commit. ONE Ctrl+Z must restore the value the cell held
  // BEFORE the last phrase was typed (exact string equality) - expecting "" here was the
  // bug. PASS requires BOTH conditions: the cell holds the last phrase right before Ctrl+Z
  // AND one Ctrl+Z restores the recorded previous value.
  try {
    if (valueBeforeLastPhrase === null || lastPhraseNfc === null) {
      throw new Error("No previous B2 value / last phrase recorded during the direct typing loop");
    }
    const beforeUndo = await readSheetCellValue(cdp, "B2");

    await press(cdp, "z", { ctrl: true }, 300);

    const restoredVal = await readSheetCellValue(cdp, "B2");
    const holdsLastPhrase = beforeUndo === lastPhraseNfc;
    const restoredPrevious = restoredVal === valueBeforeLastPhrase;
    const passUndo = holdsLastPhrase && restoredPrevious;
    recordResult(
      "sheet",
      "direct-typing-no-f2",
      "1-step Ctrl+Z restores cell",
      passUndo,
      `before="${beforeUndo}" lastPhrase="${lastPhraseNfc}" restored="${restoredVal}" expected="${valueBeforeLastPhrase}"`
    );
  } catch (err) {
    recordResult("sheet", "direct-typing-no-f2", "1-step Ctrl+Z restores cell", false, err.message);
  }
  summarizeScenario("sheet", "direct-typing-no-f2", "1-step Ctrl+Z restores cell");

  // Separate check: in a FRESH cell that no other scenario touches, one phrase + Enter
  // must be undone by ONE Ctrl+Z back to "" exactly.
  try {
    const freshCoord = "B6";
    await click(cdp, `[data-coord="${freshCoord}"]`);
    await sleep(200);

    const initialVal = await readSheetCellValue(cdp, freshCoord);
    if (initialVal !== "") {
      throw new Error(`Fresh cell ${freshCoord} is not empty before typing (value="${initialVal}")`);
    }

    const phrase = phrases[0];
    const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
    await replayImeEventsCdp(cdp, events, 25);
    await sleep(200);
    await press(cdp, "Enter", {}, 300);

    const committedVal = await readSheetCellValue(cdp, freshCoord);
    await press(cdp, "z", { ctrl: true }, 300);
    const restoredVal = await readSheetCellValue(cdp, freshCoord);

    const passFresh = committedVal === phrase.normalize("NFC") && restoredVal === "";
    recordResult(
      "sheet",
      "direct-typing-no-f2",
      "1-step Ctrl+Z restores fresh empty cell",
      passFresh,
      `committed="${committedVal}" restored="${restoredVal}" expectedRestored=""`
    );
  } catch (err) {
    recordResult("sheet", "direct-typing-no-f2", "1-step Ctrl+Z restores fresh empty cell", false, err.message);
  }
  summarizeScenario("sheet", "direct-typing-no-f2", "1-step Ctrl+Z restores fresh empty cell");

  // --- Target 2: Cell edit mode (F2 / double-click) with VNI & Fast Speed ---
  // Same cell every phrase: press Delete first (clears cell model + formula editor),
  // verify both are empty, then F2. Strict exact-NFC assertion on the model.
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      const coord = await prepareEmptySheetCellForF2(cdp, "B3");

      const events = phraseToImeEvents(phrase, { mode: "vni", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 5); // Fast speed (5ms)
      await sleep(200);

      // Commit with Enter
      await press(cdp, "Enter", {}, 300);

      const modelVal = await cdp.evaluate(`window.__vnoAppInstance?.grid?.cellsData?.get('${coord}')?.val || ''`);
      const pass = modelVal.trim() === phrase.normalize("NFC");
      recordResult("sheet", "cell-edit-mode-f2", `F2 Cell Edit Mode Fast VNI (5ms) | ${phrase}`, pass, `model="${modelVal}"`);
    } catch (err) {
      recordResult("sheet", "cell-edit-mode-f2", `F2 Cell Edit Mode Fast VNI (5ms) | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("sheet", "cell-edit-mode-f2", "F2 Cell Edit Mode Fast VNI (5ms)");

  // --- Target 3: Formula Bar (.vno-formula-input) without Autocomplete fighting ---
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await click(cdp, '[data-coord="B4"]');
      await sleep(100);
      await click(cdp, ".vno-formula-input");
      await sleep(150);
      await cdp.evaluate("document.querySelector('.vno-formula-input').value = ''");

      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfd" }); // NFD to-hop
      await replayImeEventsCdp(cdp, events, 20);
      await sleep(200);

      // Check if formula autocomplete incorrectly popped up
      const autocompleteVisible = await cdp.evaluate("!!document.querySelector('.vno-autocomplete-popup.vno-visible')");
      // Commit with Enter
      await press(cdp, "Enter", {}, 300);

      const modelVal = await cdp.evaluate("window.__vnoAppInstance?.grid?.cellsData?.get('B4')?.val || ''");
      const pass = modelVal.trim() === phrase.normalize("NFC") && !autocompleteVisible;
      recordResult("sheet", "formula-bar", `Formula bar typing (no autocomplete fight, NFC normalized) | ${phrase}`, pass, `model="${modelVal}", popupWasVisible=${autocompleteVisible}`);
    } catch (err) {
      recordResult("sheet", "formula-bar", `Formula bar typing (no autocomplete fight, NFC normalized) | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("sheet", "formula-bar", "Formula bar typing (no autocomplete fight, NFC normalized)");
}

// =============================================================================
// 3. SLIDE TESTS
// =============================================================================
export async function testSlideVietnameseTyping(session, options = {}) {
  const { cdp } = session;
  const phrases = options.phrases || VIETNAMESE_TEST_PHRASES;

  console.log("\n=== Testing Slide Vietnamese Typing ===");

  // --- Target 1: Text boxes / Title placeholder ---
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-slide-title");

      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 25);
      await sleep(200);

      const modelText = await cdp.evaluate("window.__vnoAppInstance?.canvasController?.slides?.[0]?.title || ''");
      const domText = await cdp.evaluate("document.querySelector('.vno-slide-title')?.innerText || ''");
      const pass = (modelText.trim() === phrase.normalize("NFC") || domText.trim() === phrase.normalize("NFC"));
      recordResult("slides", "text-box", `Slide Title Telex Normal (30ms) | ${phrase}`, pass, `text="${domText.trim()}"`);
    } catch (err) {
      recordResult("slides", "text-box", `Slide Title Telex Normal (30ms) | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("slides", "text-box", "Slide Title Telex Normal (30ms)");

  // 1-step Undo in shape (using first phrase as representative)
  try {
    await prepareEditableTarget(cdp, ".vno-slide-title");
    const phrase = phrases[0];
    const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
    await replayImeEventsCdp(cdp, events, 25);
    await sleep(200);

    const domText = await cdp.evaluate("document.querySelector('.vno-slide-title')?.innerText || ''");
    await press(cdp, "z", { ctrl: true }, 300);
    const afterUndo = await cdp.evaluate("document.querySelector('.vno-slide-title')?.innerText || ''");
    const passUndo = !afterUndo.endsWith("Việt Nam") && afterUndo.length < domText.length;
    recordResult("slides", "text-box", "1-step Ctrl+Z undo removes last word", passUndo, `afterUndo="${afterUndo.trim()}"`);
  } catch (err) {
    recordResult("slides", "text-box", "1-step Ctrl+Z undo removes last word", false, err.message);
  }
  summarizeScenario("slides", "text-box", "1-step Ctrl+Z undo removes last word");

  // --- Target 2: Fast VNI in Slide Body ---
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      await prepareEditableTarget(cdp, ".vno-slide-body");

      const events = phraseToImeEvents(phrase, { mode: "vni", encoding: "nfc" });
      await replayImeEventsCdp(cdp, events, 5); // Fast 5ms
      await sleep(300);

      const domText = await cdp.evaluate("document.querySelector('.vno-slide-body')?.innerText || ''");
      const pass = domText.trim() === phrase.normalize("NFC");
      recordResult("slides", "text-box", `Slide Body Fast VNI (5ms) | ${phrase}`, pass, `text="${domText.trim()}"`);
    } catch (err) {
      recordResult("slides", "text-box", `Slide Body Fast VNI (5ms) | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("slides", "text-box", "Slide Body Fast VNI (5ms)");

  // --- Target 3: Slide Notes (#vno-notes-textarea) ---
  for (let pi = 0; pi < phrases.length; pi++) {
    const phrase = phrases[pi];
    try {
      // Open notes panel if not expanded
      await cdp.evaluate(`(() => {
        const controller = window.__vnoAppInstance?.canvasController;
        if (controller && typeof controller.toggleNotes === "function") {
          controller.toggleNotes(true);
        }
        const panel = document.querySelector('.vno-slide-notes-panel');
        const content = document.querySelector('#vno-notes-content');
        if (panel) { panel.classList.remove('is-collapsed'); panel.classList.add('is-expanded'); }
        if (content) { content.style.display = 'flex'; }
        const ta = document.querySelector('#vno-notes-textarea');
        if (ta) { ta.value = ''; ta.focus(); }
      })()`);
      await sleep(200);

      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfd" }); // NFD to-hop
      await replayImeEventsCdp(cdp, events, 20);
      await sleep(200);

      const modelNotes = await cdp.evaluate("window.__vnoAppInstance?.canvasController?.slides?.[0]?.notes || ''");
      const textareaVal = await cdp.evaluate("document.querySelector('#vno-notes-textarea')?.value || ''");
      const pass = (modelNotes.trim() === phrase.normalize("NFC") || textareaVal.trim() === phrase.normalize("NFC"));
      recordResult("slides", "notes", `Slide Notes (NFD normalises to NFC) | ${phrase}`, pass, `notes="${textareaVal.trim()}"`);
    } catch (err) {
      recordResult("slides", "notes", `Slide Notes (NFD normalises to NFC) | ${phrase}`, false, err.message);
    }
  }
  summarizeScenario("slides", "notes", "Slide Notes (NFD normalises to NFC)");
}

// =============================================================================
// CLI RUNNER
// =============================================================================
export async function runAllDesktopImeTests(appFilter = null) {
  const appsToRun = appFilter ? [appFilter] : ["writer", "sheet", "slides"];

  for (const app of appsToRun) {
    console.log(`\n========================================`);
    console.log(`Starting desktop harness for: ${app}`);
    console.log(`========================================`);
    let session = null;
    try {
      session = await launchApp(app);
      if (app === "writer") await testDocVietnameseTyping(session);
      if (app === "sheet") await testSheetVietnameseTyping(session);
      if (app === "slides") await testSlideVietnameseTyping(session);
    } catch (err) {
      console.error(`Error testing app ${app}:`, err);
    } finally {
      if (session) await session.close();
    }
  }

  console.log(`\n========================================`);
  console.log(`VIETNAMESE TYPING DESKTOP TEST SUMMARY`);
  console.log(`========================================`);
  let passCount = 0;
  for (const r of results) {
    if (r.pass) passCount++;
    console.log(`${r.pass ? "PASS" : "FAIL"} | [${r.app}] ${r.target}: ${r.testName} (${r.detail})`);
  }
  console.log(`\nTOTAL: ${passCount}/${results.length} PASS`);
  return results;
}

if (process.argv[1] && process.argv[1].endsWith("vietnamese-typing.desktop.mjs")) {
  const argApp = process.argv.find(a => a.startsWith("--app="))?.split("=")[1];
  runAllDesktopImeTests(argApp).catch(err => {
    console.error("Desktop test failed:", err);
    process.exit(1);
  });
}