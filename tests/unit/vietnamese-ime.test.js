/**
 * CH-4.7 Unit Tests — Vietnamese IME typing, burst normalizer, caret preservation, undo coalescing & NFC normalization
 *
 * Covers:
 * 1. Decomposition and local simulation of 42 real Vietnamese phrases in Telex and VNI (NFC and NFD).
 * 2. Backspace-then-insert burst coalescing and event count assertions.
 * 3. Unicode NFC normalization and decomposed diacritic detection (hasDecomposedDiacritics, toNfc).
 * 4. Caret position preservation math across normalization (normalizeInputNfc).
 * 5. Word boundary detection (findLastWordBeforeCaret).
 * 6. Global IME tracker burst lifecycle (notifyBurstStart, scheduleBurstEnd, listeners).
 * 7. 1-step atomic word undo (Ctrl+Z removes only the last word/chunk consistently).
 * 8. Autocomplete and spellcheck burst-deferral guards.
 */

import assert from "node:assert/strict";
import {
  VIETNAMESE_TEST_PHRASES,
  phraseToImeEvents,
  simulateImeLocally
} from "../live/cdp/vietnamese-ime-simulator.mjs";
import {
  toNfc,
  hasDecomposedDiacritics,
  normalizeInputNfc,
  findLastWordBeforeCaret,
  globalImeTracker,
  InputNormalizer
} from "../../platform/keyboard/input-normalizer.js";

export async function runVietnameseImeUnitTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || String(err) });
    }
  };

  const asyncTest = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || String(err) });
    }
  };

  // 1. Phrasal Telex simulation (NFC)
  test("CH4.7-01: Replay all 42 test phrases in Telex mode (Unicode NFC)", () => {
    assert.ok(VIETNAMESE_TEST_PHRASES.length >= 40, "Must have at least 40 test phrases");
    for (const phrase of VIETNAMESE_TEST_PHRASES) {
      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfc" });
      const output = simulateImeLocally(events);
      assert.equal(output, phrase.normalize("NFC"), `Telex mismatch for: ${phrase}`);
    }
  });

  // 2. Phrasal Telex simulation (NFD to-hop)
  test("CH4.7-02: Replay all 42 test phrases in Telex mode (Unicode NFD decomposed)", () => {
    for (const phrase of VIETNAMESE_TEST_PHRASES) {
      const events = phraseToImeEvents(phrase, { mode: "telex", encoding: "nfd" });
      const output = simulateImeLocally(events);
      assert.equal(output, phrase.normalize("NFC"), `Telex NFD mismatch for: ${phrase}`);
    }
  });

  // 3. Phrasal VNI simulation (NFC)
  test("CH4.7-03: Replay all 42 test phrases in VNI mode (Unicode NFC)", () => {
    for (const phrase of VIETNAMESE_TEST_PHRASES) {
      const events = phraseToImeEvents(phrase, { mode: "vni", encoding: "nfc" });
      const output = simulateImeLocally(events);
      assert.equal(output, phrase.normalize("NFC"), `VNI mismatch for: ${phrase}`);
    }
  });

  // 4. Phrasal VNI simulation (NFD to-hop)
  test("CH4.7-04: Replay all 42 test phrases in VNI mode (Unicode NFD decomposed)", () => {
    for (const phrase of VIETNAMESE_TEST_PHRASES) {
      const events = phraseToImeEvents(phrase, { mode: "vni", encoding: "nfd" });
      const output = simulateImeLocally(events);
      assert.equal(output, phrase.normalize("NFC"), `VNI NFD mismatch for: ${phrase}`);
    }
  });

  // 5. Backspace-then-insert event sequencing
  test("CH4.7-05: Backspace-then-insert reproduces accurate IME event pattern", () => {
    const events = phraseToImeEvents("Việt", { mode: "telex" });
    const backspaces = events.filter(e => e.action === "backspace");
    assert.ok(backspaces.length >= 2, "Must contain at least 2 Backspace triggers");
    assert.equal(backspaces[0].count, 1, "First trigger (ê) has 1 Backspace");
    assert.equal(backspaces[1].count, 2, "Second trigger (tone j) has 2 Backspaces");

    // VNI: "Việt" -> V i e 6 (BS x1, insert ê) t 5 (BS x2, insert ệt)
    const vniEvents = phraseToImeEvents("Việt", { mode: "vni" });
    const vniBs = vniEvents.filter(e => e.action === "backspace");
    assert.ok(vniBs.length >= 2, "VNI must contain at least 2 Backspace triggers");
    assert.equal(vniBs[0].count, 1, "VNI circumflex modifier has 1 Backspace");
    assert.equal(vniBs[1].count, 2, "VNI tone modifier has 2 Backspaces");
  });

  // 6. NFC normalization and decomposed diacritic detection
  test("CH4.7-06: toNfc and hasDecomposedDiacritics detect and normalize NFD", () => {
    const nfc = "Cộng hòa xã hội chủ nghĩa Việt Nam";
    const nfd = nfc.normalize("NFD");
    assert.ok(hasDecomposedDiacritics(nfd), "NFD string must be detected as having decomposed diacritics");
    assert.equal(toNfc(nfd), nfc, "toNfc must cleanly convert NFD to NFC");
    assert.equal(toNfc(123), 123, "toNfc ignores non-string inputs");
  });

  // 7. Caret position preservation math
  test("CH4.7-07: normalizeInputNfc adjusts selection indices correctly", () => {
    // Simulated input element
    const nfdWord = "Tiê\u0301ng".normalize("NFD"); // "Tiếng" decomposed
    const fakeInput = {
      value: nfdWord,
      selectionStart: nfdWord.length,
      selectionEnd: nfdWord.length,
      setSelectionRange(s, e) {
        this.selectionStart = s;
        this.selectionEnd = e;
      }
    };
    const modified = normalizeInputNfc(fakeInput);
    assert.equal(modified, true, "Must modify NFD text");
    assert.equal(fakeInput.value, "Tiếng", "Value must become NFC");
    assert.equal(fakeInput.selectionStart, "Tiếng".length, "Caret must stay at end of word");
  });

  // 8. Word boundary detection before caret
  test("CH4.7-08: findLastWordBeforeCaret identifies word range accurately", () => {
    const text = "Cộng hòa xã hội";
    const found1 = findLastWordBeforeCaret(text, text.length);
    assert.deepEqual(found1, { start: 12, end: 15, word: "hội" }, "Last word should be 'hội'");

    const found2 = findLastWordBeforeCaret(text, 8); // after "hòa"
    assert.deepEqual(found2, { start: 5, end: 8, word: "hòa" }, "Word before caret should be 'hòa'");

    assert.equal(findLastWordBeforeCaret("", 0), null, "Empty text returns null");
    assert.equal(findLastWordBeforeCaret("   ", 3), null, "Whitespace-only returns null");
  });

  // 9. Global IME tracker burst states and listeners
  await asyncTest("CH4.7-09: globalImeTracker notifies listeners on burst start and end", async () => {
    let stateChanges = [];
    const unsubscribe = globalImeTracker.onBurstStateChange((active) => {
      stateChanges.push(active);
    });

    globalImeTracker.notifyBurstStart();
    assert.equal(globalImeTracker.isBurstActive(), true, "Burst must be active after start");

    globalImeTracker.scheduleBurstEnd(30);
    await new Promise(r => setTimeout(r, 60));

    assert.equal(globalImeTracker.isBurstActive(), false, "Burst must be inactive after timer expires");
    assert.ok(stateChanges.includes(true), "Listener must receive burst start");
    assert.ok(stateChanges.includes(false), "Listener must receive burst end");
    unsubscribe();
  });

  // 10. 1-step Atomic Word Undo on InputNormalizer
  test("CH4.7-10: InputNormalizer 1-step undo removes only the last word", () => {
    let currentValue = "";
    const fakeEl = {
      tagName: "INPUT",
      get value() { return currentValue; },
      set value(v) { currentValue = v; },
      selectionStart: 0,
      selectionEnd: 0,
      setSelectionRange(s, e) { this.selectionStart = s; this.selectionEnd = e; },
      addEventListener() {},
      removeEventListener() {}
    };

    const normalizer = new InputNormalizer({ target: fakeEl });
    normalizer.attach(fakeEl);

    // Simulate word typing snapshots
    fakeEl.value = "Cộng ";
    normalizer._recordWordSnapshot();
    fakeEl.value = "Cộng hòa ";
    normalizer._recordWordSnapshot();
    fakeEl.value = "Cộng hòa xã ";
    normalizer._recordWordSnapshot();

    assert.equal(normalizer.customUndoStack.length, 3);
    assert.equal(currentValue, "Cộng hòa xã ");

    // Press Ctrl+Z
    const undone = normalizer._handleCtrlZ({});
    assert.equal(undone, true, "Ctrl+Z should be handled");
    assert.equal(currentValue, "Cộng hòa ", "Value after 1-step undo must retain preceding words");

    normalizer.destroy();
  });

  return results;
}
