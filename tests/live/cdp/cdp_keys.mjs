import { click, press, typeText } from "./actions.mjs";

export async function runKeysProbe(session) {
  const { app, cdp } = session;
  if (app === "writer") {
    await click(cdp, ".vno-writer-body p");
    await typeText(cdp, "CDPKey");
    await press(cdp, "Enter");
    await typeText(cdp, "CDPNext");
    const state = await cdp.evaluate(
      "(() => { const body = document.querySelector('.vno-writer-body');"
      + " return {text: body?.innerText || '', paragraphs: body?.querySelectorAll('p').length || 0}; })()",
    );
    return {
      pass: state.paragraphs >= 2 && state.text.includes("CDPKey") && state.text.includes("CDPNext"),
      detail: JSON.stringify(state),
    };
  }
  if (app === "sheet") {
    await click(cdp, '[data-coord="A1"]');
    await typeText(cdp, "123");
    await press(cdp, "Enter");
    await typeText(cdp, "alpha");
    await press(cdp, "Tab");
    await typeText(cdp, "beta");
    await press(cdp, "Enter");
    const state = await cdp.evaluate(
      "(() => { const get = c => document.querySelector('[data-coord=\"' + c + '\"]')?.textContent?.trim() || '';"
      + " return {a1:get('A1'), a2:get('A2'), b2:get('B2')}; })()",
    );
    return {
      pass: state.a1 === "123" && state.a2 === "alpha" && state.b2 === "beta",
      detail: JSON.stringify(state),
    };
  }
  if (app === "slides") {
    await click(cdp, ".vno-slide-canvas");
    await press(cdp, "Enter");
    await press(cdp, "Tab");
    const exists = await cdp.evaluate("!!document.querySelector('.vno-slide-canvas')");
    return { pass: exists, detail: "Enter and Tab reached the 3T Slide canvas without closing the document." };
  }
  throw new Error("Unsupported app: " + app);
}

export async function runClipboardProbe(session) {
  const { app, cdp } = session;
  if (app === "writer") {
    const setup = await cdp.evaluate(
      "(() => { const body = document.querySelector('.vno-writer-body');"
      + " const p = body?.querySelector('p'); if (!p) return false;"
      + " p.focus(); const range = document.createRange(); range.selectNodeContents(p);"
      + " const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); return true; })()",
    );
    if (!setup) throw new Error("Writer did not expose an editable paragraph.");
    await press(cdp, "c", { ctrl: true });
    const copyKeptSelection = await cdp.evaluate("!!getSelection()?.toString()");
    await press(cdp, "x", { ctrl: true });
    const afterCut = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText || ''");
    await click(cdp, ".vno-writer-body p:last-child");
    await press(cdp, "End");
    await press(cdp, "v", { ctrl: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    const afterPaste = await cdp.evaluate("document.querySelector('.vno-writer-body')?.innerText || ''");
    return {
      pass: copyKeptSelection && afterCut.trim().length < afterPaste.trim().length && afterPaste.length > 0,
      detail: JSON.stringify({ copyKeptSelection, cutLength: afterCut.length, pasteLength: afterPaste.length }),
    };
  }
  if (app === "sheet") {
    await click(cdp, '[data-coord="A1"]');
    await typeText(cdp, "Clipboard");
    await press(cdp, "Enter");
    await click(cdp, '[data-coord="A1"]');
    await press(cdp, "c", { ctrl: true });
    await click(cdp, '[data-coord="B1"]');
    await press(cdp, "v", { ctrl: true });
    await click(cdp, '[data-coord="B1"]');
    await press(cdp, "x", { ctrl: true });
    await click(cdp, '[data-coord="C1"]');
    await press(cdp, "v", { ctrl: true });
    const state = await cdp.evaluate(
      "(() => { const get = c => document.querySelector('[data-coord=\"' + c + '\"]')?.textContent?.trim() || '';"
      + " return {a1:get('A1'), b1:get('B1'), c1:get('C1')}; })()",
    );
    return { pass: state.a1 === "Clipboard" && state.b1 === "" && state.c1 === "Clipboard", detail: JSON.stringify(state) };
  }
  if (app === "slides") {
    const selector = await cdp.evaluate(
      "document.querySelector('.vno-slide-title') ? '.vno-slide-title'"
      + " : document.querySelector('.vno-slide-body') ? '.vno-slide-body' : ''",
    );
    if (!selector) return { pass: false, detail: "No editable slide placeholder was available for clipboard verification." };
    await click(cdp, selector);
    await typeText(cdp, "CDPSlideClipboard");
    const selected = await cdp.evaluate(
      "(() => { const node = document.querySelector(" + JSON.stringify(selector) + ");"
      + " if (!node) return false; node.focus?.(); const range = document.createRange();"
      + " range.selectNodeContents(node); const selection = getSelection();"
      + " selection.removeAllRanges(); selection.addRange(range); return !!selection.toString(); })()",
    );
    if (!selected) return { pass: false, detail: "Could not select text inside the slide placeholder." };
    await press(cdp, "c", { ctrl: true });
    await press(cdp, "x", { ctrl: true });
    const afterCut = await cdp.evaluate("document.querySelector(" + JSON.stringify(selector) + ")?.innerText || ''");
    await click(cdp, selector);
    await press(cdp, "End");
    await press(cdp, "v", { ctrl: true });
    await new Promise(resolve => setTimeout(resolve, 500));
    const afterPaste = await cdp.evaluate("document.querySelector(" + JSON.stringify(selector) + ")?.innerText || ''");
    return {
      pass: afterPaste.includes("CDPSlideClipboard") && afterCut.length < afterPaste.length,
      detail: JSON.stringify({ afterCut, afterPaste }),
    };
  }
  throw new Error("Unsupported app: " + app);
}
