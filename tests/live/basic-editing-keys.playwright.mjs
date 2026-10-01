import { pathToFileURL } from "node:url";
import path from "node:path";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const port = Number(process.env.VNO_BASIC_KEYS_PORT || 8786);
const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT || "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const edgePath = process.env.VNO_EDGE_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));
const server = spawn("python", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
  cwd: repoRoot,
  stdio: "ignore"
});

const failures = [];
const assert = (condition, message, detail = "") => {
  console.log(`${condition ? "PASS" : "FAIL"}\t${message}${detail ? ` — ${detail}` : ""}`);
  if (!condition) failures.push({ message, detail });
};
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;

try {
  await sleep(900);
  browser = await chromium.launch({ executablePath: edgePath, headless: true });
  const context = await browser.newContext({
    locale: "vi-VN",
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"]
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  const runtime = async expression => page.evaluate(async expressionText => {
    const { globalUnoBridge } = await import("/adapters/libreoffice/common/uno-bridge.js");
    return Function("bridge", `return (${expressionText})`)(globalUnoBridge);
  }, expression);
  const openApp = async app => {
    await page.goto(`http://127.0.0.1:${port}/?app=${app}&singleApp=1`, { waitUntil: "networkidle" });
  };

  await openApp("writer");
  const writer = page.locator(".vno-writer-body");
  await writer.waitFor();
  await writer.click();
  await page.keyboard.insertText("abc");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("Dong mot qzxqzx");
  await page.waitForTimeout(650);
  const wrappedState = await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body");
    const selection = getSelection();
    const block = (selection?.anchorNode?.nodeType === 1 ? selection.anchorNode : selection?.anchorNode?.parentElement)
      ?.closest("p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,pre");
    return {
      paragraphs: [...editor.querySelectorAll("p")].map(node => node.textContent),
      caretText: block?.textContent || "",
      uncertainMarkers: editor.querySelectorAll("[data-vno-spelling-uncertain]").length
    };
  });
  assert(wrappedState.paragraphs.length === 2 && wrappedState.paragraphs[0] === "abc" && wrappedState.paragraphs[1] === "Dong mot qzxqzx",
    "3T Doc Enter creates a new paragraph and spellcheck keeps both paragraphs intact", JSON.stringify(wrappedState));
  await page.keyboard.insertText(" a");
  await page.keyboard.press("Backspace");
  await page.keyboard.insertText("á");
  await page.keyboard.insertText(" tiếp");
  await page.waitForTimeout(650);
  const composedState = await page.evaluate(() => {
    const selection = getSelection();
    const node = selection?.anchorNode;
    const block = (node?.nodeType === 1 ? node : node?.parentElement)?.closest("p,li,td,th,h1,h2,h3,h4,h5,h6,blockquote,pre");
    const range = document.createRange();
    if (block && selection?.anchorNode) {
      range.selectNodeContents(block);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
    }
    return { text: block?.textContent || "", caretOffset: range.toString().length, caretBlock: block?.tagName || "" };
  });
  assert(composedState.text === "Dong mot qzxqzx á tiếp" && composedState.caretBlock === "P",
    "3T Doc caret survives Unikey-style replacement via Backspace plus insertText", JSON.stringify(composedState));

  await page.keyboard.press("Enter");
  await page.keyboard.insertText("Tab test");
  await page.keyboard.press("Tab");
  await page.keyboard.insertText("after tab");
  await page.keyboard.press("Shift+Enter");
  await page.keyboard.insertText("same paragraph line");
  const writerTabState = await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body");
    const blocks = [...editor.querySelectorAll("p")];
    const block = blocks.at(-1);
    return {
      text: block?.textContent || "",
      hasTab: (block?.textContent || "").includes("\t"),
      tabSize: getComputedStyle(editor).tabSize,
      breakCount: block?.querySelectorAll("br").length || 0,
      paragraphCount: editor.querySelectorAll("p").length,
      html: block?.innerHTML || ""
    };
  });
  assert(writerTabState.text.includes("Tab test\tafter tab") && writerTabState.html.includes("\t") && writerTabState.tabSize === "48px",
    "3T Doc Tab inserts a model tab rendered with 1.27 cm tab stops", JSON.stringify(writerTabState));
  assert(writerTabState.text.includes("\nsame paragraph line") && writerTabState.paragraphCount === 3,
    "3T Doc Shift+Enter inserts a line break without leaving the paragraph", JSON.stringify(writerTabState));
  await page.waitForTimeout(650);
  await page.keyboard.insertText(" after idle");
  const afterLineCheck = await page.evaluate(() => {
    const editor = document.querySelector(".vno-writer-body");
    const selection = getSelection();
    const node = selection?.anchorNode;
    const block = (node?.nodeType === 1 ? node : node?.parentElement)?.closest("p");
    const range = document.createRange();
    if (block && selection?.anchorNode) {
      range.selectNodeContents(block);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
    }
    return { text: block?.textContent || "", caretOffset: range.toString().length, paragraphs: editor.querySelectorAll("p").length };
  });
  assert(afterLineCheck.text.endsWith("same paragraph line after idle") &&
    afterLineCheck.caretOffset === afterLineCheck.text.length && afterLineCheck.paragraphs === 3,
  "3T Doc typing stays at the exact caret after Shift+Enter and a spellcheck idle pass", JSON.stringify(afterLineCheck));
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.insertText(" safe");
  assert((await writer.innerText()).includes("same paragraph line after idle safe"),
    "3T Doc Shift+Tab outside a list or table does not move focus or discard text");

  await page.keyboard.press("Enter");
  await page.keyboard.insertText("qzxqzx");
  await page.locator('[data-command-id="writer.list.bullet"]').first().click();
  const listItem = writer.locator("li").last();
  await listItem.waitFor();
  await listItem.click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Tab");
  const nestedList = await listItem.evaluate(el => {
    let depth = 0;
    let list = el.closest("ol,ul");
    while (list) {
      const parentItem = list.parentElement?.closest("li");
      if (!parentItem) break;
      depth++;
      list = parentItem.parentElement?.closest("ol,ul") || null;
    }
    return { depth, focusInside: document.querySelector(".vno-writer-body").contains(getSelection()?.anchorNode) };
  });
  assert(nestedList.depth === 1 && nestedList.focusInside, "3T Doc Tab at the start of a list item changes its list level", JSON.stringify(nestedList));
  await page.keyboard.press("Shift+Tab");
  const listOutdent = await listItem.evaluate(el => {
    let depth = 0;
    let list = el.closest("ol,ul");
    while (list) {
      const parentItem = list.parentElement?.closest("li");
      if (!parentItem) break;
      depth++;
      list = parentItem.parentElement?.closest("ol,ul") || null;
    }
    return { depth, focusInside: document.querySelector(".vno-writer-body").contains(getSelection()?.anchorNode) };
  });
  assert(listOutdent.depth === 0 && listOutdent.focusInside, "3T Doc Shift+Tab at the start of a list item returns one level", JSON.stringify(listOutdent));

  await page.locator(".vno-ribbon-tab").filter({ hasText: "Chèn" }).click();
  await page.locator('[data-command-id="writer.header.insert"]').first().click();
  await page.keyboard.insertText("header qzxqzx");
  await page.waitForTimeout(650);
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("header line");
  await page.waitForTimeout(650);
  await page.keyboard.insertText(" after idle");
  const headerCaret = await page.evaluate(() => {
    const root = document.querySelector(".vno-writer-header");
    const selection = getSelection();
    const node = selection?.anchorNode;
    const block = (node?.nodeType === 1 ? node : node?.parentElement)?.closest("p");
    const range = document.createRange();
    if (block && selection?.anchorNode) {
      range.selectNodeContents(block);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
    }
    return { text: block?.textContent || "", offset: range.toString().length, inHeader: !!root?.contains(selection?.anchorNode) };
  });
  assert(headerCaret.inHeader && headerCaret.text === "header line after idle" && headerCaret.offset === headerCaret.text.length,
    "3T Doc spellcheck preserves the caret in the header after Enter", JSON.stringify(headerCaret));
  await page.locator('[data-command-id="writer.footer.insert"]').first().click();
  await page.keyboard.insertText("footer qzxqzx");
  await page.waitForTimeout(650);
  await page.keyboard.insertText(" footer tiếp");
  const footerCaret = await page.evaluate(() => {
    const root = document.querySelector(".vno-writer-footer");
    const selection = getSelection();
    const node = selection?.anchorNode;
    const block = (node?.nodeType === 1 ? node : node?.parentElement)?.closest("p");
    const range = document.createRange();
    if (block && selection?.anchorNode) {
      range.selectNodeContents(block);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
    }
    return { text: block?.textContent || "", offset: range.toString().length, inFooter: !!root?.contains(selection?.anchorNode) };
  });
  assert(footerCaret.inFooter && footerCaret.text.endsWith("footer tiếp") && footerCaret.offset === footerCaret.text.length,
    "3T Doc spellcheck preserves the caret in the footer", JSON.stringify(footerCaret));

  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.locator('[data-command-id="writer.table.insert"]').first().click();
  const writerTable = writer.locator("table").last();
  await writerTable.waitFor();
  const tableCells = writerTable.locator("td,th");
  await tableCells.first().click();
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.keyboard.insertText("table qzxqzx");
  await page.waitForTimeout(650);
  await page.keyboard.insertText(" after idle");
  const tableCaret = await page.evaluate(() => {
    const root = document.querySelector(".vno-writer-body");
    const selection = getSelection();
    const node = selection?.anchorNode;
    const cell = (node?.nodeType === 1 ? node : node?.parentElement)?.closest("td,th");
    const range = document.createRange();
    if (cell && selection?.anchorNode) {
      range.selectNodeContents(cell);
      range.setEnd(selection.anchorNode, selection.anchorOffset);
    }
    return { text: cell?.textContent || "", offset: range.toString().length, inBody: !!root?.contains(selection?.anchorNode) };
  });
  assert(tableCaret.text === "table qzxqzx after idle" && tableCaret.offset === tableCaret.text.length && tableCaret.inBody,
    "3T Doc spellcheck keeps the caret in the same table cell", JSON.stringify(tableCaret));
  await page.keyboard.press("Tab");
  await page.keyboard.insertText("next cell");
  for (let i = 0; i < 10; i++) await page.keyboard.press("Tab");
  const lastTableCell = await page.evaluate(() => {
    const table = document.querySelector(".vno-writer-body table:last-of-type");
    const cells = [...(table?.querySelectorAll("td,th") || [])].filter(cell => cell.closest("table") === table);
    return { index: cells.findIndex(cell => cell.contains(getSelection()?.anchorNode)), count: cells.length, rows: table?.rows.length || 0 };
  });
  assert(lastTableCell.index === 11 && lastTableCell.rows === 3, "3T Doc Tab traverses each table cell in order", JSON.stringify(lastTableCell));
  await page.keyboard.press("Tab");
  const appendedRow = await page.evaluate(() => {
    const table = document.querySelector(".vno-writer-body table:last-of-type");
    const cells = [...(table?.querySelectorAll("td,th") || [])].filter(cell => cell.closest("table") === table);
    return { index: cells.findIndex(cell => cell.contains(getSelection()?.anchorNode)), count: cells.length, rows: table?.rows.length || 0 };
  });
  assert(appendedRow.index === 12 && appendedRow.rows === 4, "3T Doc Tab in the last table cell appends a row and focuses its first cell", JSON.stringify(appendedRow));
  await tableCells.first().click();
  await page.keyboard.press("Shift+Tab");
  const firstTableCell = await page.evaluate(() => {
    const table = document.querySelector(".vno-writer-body table:last-of-type");
    const cells = [...(table?.querySelectorAll("td,th") || [])].filter(cell => cell.closest("table") === table);
    return cells.findIndex(cell => cell.contains(getSelection()?.anchorNode));
  });
  assert(firstTableCell === 0, "3T Doc Shift+Tab in the first table cell stays in the table");

  const exportHtml = await runtime("bridge.activeDocument._contentForExport()");
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "3t-basic-keys-docx-"));
  const htmlPath = path.join(tempDir, "basic-keys.html");
  fs.writeFileSync(htmlPath, exportHtml, "utf8");
  const sofficePath = execFileSync("python", ["-c", "import main; print(main.find_soffice())"], { cwd: repoRoot, encoding: "utf8" }).trim();
  const convert = spawnSync("python", ["-c", "import main,sys; print(main._run_soffice_convert(sys.argv[1], 'docx', sys.argv[2], app_kind='writer'))", htmlPath, tempDir], { cwd: repoRoot, encoding: "utf8", timeout: 60000 });
  const docxPath = path.join(tempDir, "basic-keys.docx");
  const docxTab = fs.existsSync(docxPath)
    ? execFileSync("python", ["-c", "import re,sys,zipfile; print(bool(re.search(rb'<w:tab(?:\\s|/)', zipfile.ZipFile(sys.argv[1]).read('word/document.xml'))))", docxPath], { encoding: "utf8" }).trim() === "True"
    : false;
  assert(exportHtml.includes("\t") && docxTab,
    "3T Doc Tab is preserved through production HTML export to DOCX as w:tab", JSON.stringify({ sofficePath, status: convert.status, stdout: convert.stdout, stderr: convert.stderr, docxExists: fs.existsSync(docxPath), htmlHasTab: exportHtml.includes("\t"), docxHasTab: docxTab }));

  await page.evaluate(async () => {
    const item = new ClipboardItem({
      "text/html": new Blob(["<p><strong>Rich clipboard</strong></p>"], { type: "text/html" }),
      "text/plain": new Blob(["Rich clipboard"], { type: "text/plain" })
    });
    await navigator.clipboard.write([item]);
  });
  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(100);
  const keyboardPaste = await writer.evaluate(el => ({
    rich: [...el.querySelectorAll("strong,b")].some(node => node.textContent === "Rich clipboard"),
    text: el.textContent.includes("Rich clipboard")
  }));
  assert(keyboardPaste.rich && keyboardPaste.text, "3T Doc Ctrl+V handles native paste event and retains safe HTML formatting", JSON.stringify(keyboardPaste));

  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.locator("#vno-ribbon-tab-home").click();
  await page.locator('[data-command-id="common.edit.paste"]').first().click({ timeout: 5000 });
  await page.waitForTimeout(100);
  assert((await writer.innerText()).includes("Rich clipboard"), "3T Doc ribbon Paste reads the system clipboard bridge/API");

  const copyTarget = writer.locator("p").last();
  await copyTarget.click();
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.locator('[data-command-id="common.edit.copy"]').first().click();
  await copyTarget.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(100);
  assert((await writer.innerText()).includes("Rich clipboardRich clipboard"), "3T Doc ribbon Copy fills the clipboard for native Ctrl+V");

  const cutTarget = writer.locator("p").last();
  await cutTarget.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("Ribbon cut check");
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  const ribbonCutSelection = await page.evaluate(() => getSelection()?.toString() || "");
  await page.locator('[data-command-id="common.edit.cut"]').first().click();
  await page.waitForTimeout(100);
  const afterRibbonCut = await writer.innerText();
  assert(ribbonCutSelection === "Ribbon cut check" && !afterRibbonCut.includes("Ribbon cut check"),
    "3T Doc ribbon Cut removes the selected text", JSON.stringify({ ribbonCutSelection, removed: !afterRibbonCut.includes("Ribbon cut check") }));

  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await page.keyboard.insertText("Keyboard clipboard");
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  const writerSelection = await page.evaluate(() => getSelection()?.toString() || "");
  await page.keyboard.press("Control+c");
  const writerClipboardText = await page.evaluate(() => navigator.clipboard.readText().catch(error => "ERROR:" + error.message));
  await page.keyboard.press("End");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(100);
  const afterWriterCopy = await writer.innerText();
  assert(writerSelection === "Keyboard clipboard" && writerClipboardText === "Keyboard clipboard" &&
    afterWriterCopy.includes("Keyboard clipboardKeyboard clipboard"),
  "3T Doc native Ctrl+C and Ctrl+V copy the selected text", JSON.stringify({ writerSelection, writerClipboardText, afterWriterCopy }));
  await page.keyboard.press("Home");
  await page.keyboard.down("Shift");
  await page.keyboard.press("End");
  await page.keyboard.up("Shift");
  await page.keyboard.press("Control+x");
  await page.waitForTimeout(100);
  const afterWriterCut = await writer.innerText();
  assert(!afterWriterCut.includes("Keyboard clipboard"), "3T Doc native Ctrl+X cuts the selected text", afterWriterCut);

  await writer.locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText("Plain: ");
  await page.evaluate(async () => {
    const item = new ClipboardItem({
      "text/html": new Blob(["<strong>Plain fallback</strong>"], { type: "text/html" }),
      "text/plain": new Blob(["Plain fallback"], { type: "text/plain" })
    });
    await navigator.clipboard.write([item]);
  });
  await page.keyboard.press("Control+Shift+v");
  await page.waitForTimeout(100);
  const plainPaste = await writer.evaluate(el => {
    const found = [...el.querySelectorAll("*")].find(node => node.textContent === "Plain fallback");
    return { present: el.textContent.includes("Plain fallback"), formatted: !!found?.closest("strong,b") };
  });
  assert(plainPaste.present && !plainPaste.formatted, "3T Doc Ctrl+Shift+V uses the plain-text clipboard path", JSON.stringify(plainPaste));

  await openApp("sheet");
  const grid = page.locator(".vno-sheet-container");
  await grid.waitFor();
  await page.waitForSelector('.vno-grid-cell[data-coord="A1"]');
  const cellState = async coord => runtime(`(() => { const grid = bridge.activeDocument.grid; const cell = grid.cellsData.get(${JSON.stringify(coord)}); return { value: cell?.val ?? "", formula: cell?.formula ?? "", selected: grid.selectedCoord.c + grid.selectedCoord.r, focus: document.activeElement?.classList?.contains("vno-sheet-container") || false }; })()`);
  const clickCell = async coord => {
    const cell = page.locator(`.vno-grid-cell[data-coord="${coord}"]`).first();
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
  };
  const selectedCoord = async () => runtime("bridge.activeDocument.grid.selectedCoord.c + bridge.activeDocument.grid.selectedCoord.r");

  assert(await grid.evaluate(el => el.tabIndex === 0) && await grid.evaluate(el => document.activeElement === el),
    "3T Sheet starts with the keyboard focus on its grid");
  await page.keyboard.type("123");
  await page.keyboard.press("Enter");
  assert(String((await cellState("A1")).value) === "123" && await selectedCoord() === "A2", "3T Sheet type 123 then Enter stores A1 and selects A2");
  await page.keyboard.insertText("abc");
  await page.keyboard.press("Tab");
  assert(String((await cellState("A2")).value) === "abc" && await selectedCoord() === "B2", "3T Sheet type abc then Tab stores A2 and selects B2");
  await page.keyboard.press("Enter");
  assert(await selectedCoord() === "A3", "3T Sheet Enter after Tab returns to the starting column");

  await page.keyboard.press("F2");
  await page.keyboard.insertText("first");
  await page.keyboard.press("Enter");
  await clickCell("A3");
  await page.keyboard.press("F2");
  await page.keyboard.press("Alt+Enter");
  await page.keyboard.insertText("second");
  await page.keyboard.press("Enter");
  const lineCell = await cellState("A3");
  assert(lineCell.value === "first\nsecond", "3T Sheet F2 edits a cell and Alt+Enter inserts a line break inside it", JSON.stringify(lineCell));

  await page.evaluate(() => {
    const root = document.querySelector(".vno-sheet-container");
    window.__basicKeyClipboardEvents = [];
    for (const type of ["copy", "cut", "paste"]) root.addEventListener(type, event => window.__basicKeyClipboardEvents.push(type), true);
  });
  await clickCell("A2");
  const beforeCut = await page.evaluate(async () => {
    const { globalShortcutManager } = await import("/platform/commands/shortcut-manager.js");
    const grid = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
    return {
      selected: grid.selectedCoord.c + grid.selectedCoord.r,
      focus: document.activeElement?.className,
      editable: document.activeElement?.isContentEditable,
      activeScope: globalShortcutManager.getActiveScope(),
      cutBinding: globalShortcutManager._shortcuts.get("CTRL+X")
    };
  });
  await page.keyboard.press("Control+x");
  await page.waitForTimeout(50);
  const cutMarked = await page.locator('.vno-grid-cell[data-coord="A2"]').evaluate(el => el.classList.contains("is-cut-source"));
  const cutAfter = await runtime("({clipboard:bridge.activeDocument.grid._clipboardRange, model:bridge.activeDocument._clipboardModel?.cells?.[0]?.[0]?.val, cacheText:bridge.activeDocument._clipboardText, selected:bridge.activeDocument.grid.selectedCoord.c+bridge.activeDocument.grid.selectedCoord.r, events:window.__basicKeyClipboardEvents})");
  cutAfter.systemText = await page.evaluate(() => navigator.clipboard.readText().catch(error => "ERROR:" + error.message));
  assert(cutMarked && String((await cellState("A2")).value) === "abc", "3T Sheet Ctrl+X shows the cut outline and preserves the source until paste", JSON.stringify({ beforeCut, cutAfter, cutMarked }));
  await page.keyboard.press("Escape");
  assert(!(await page.locator('.vno-grid-cell[data-coord="A2"]').evaluate(el => el.classList.contains("is-cut-source"))), "3T Sheet Esc cancels the cut outline");
  await page.keyboard.press("Control+x");
  await page.waitForTimeout(50);
  await clickCell("C2");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(120);
  const moveValues = { from: await cellState("A2"), to: await cellState("C2") };
  moveValues.events = await page.evaluate(() => window.__basicKeyClipboardEvents);
  assert(String(moveValues.from.value) === "" && String(moveValues.to.value) === "abc", "3T Sheet Ctrl+X then Ctrl+V moves cells", JSON.stringify(moveValues));

  await clickCell("C2");
  await page.keyboard.press("Control+c");
  await clickCell("D2");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(120);
  assert(String((await cellState("D2")).value) === "abc", "3T Sheet Ctrl+C then Ctrl+V copies cells", JSON.stringify(await cellState("D2")));

  await page.evaluate(() => navigator.clipboard.writeText("outside\t42"));
  await clickCell("E5");
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(120);
  assert(String((await cellState("E5")).value) === "outside" && String((await cellState("F5")).value) === "42",
    "3T Sheet Ctrl+V imports tab-separated text from outside the app");
  await clickCell("F5");
  await page.keyboard.press("Delete");
  assert(String((await cellState("F5")).value) === "", "3T Sheet Delete clears a selected cell");
  await page.keyboard.press("Control+z");
  assert(String((await cellState("F5")).value) === "42", "3T Sheet Ctrl+Z undoes the clear");
  await page.keyboard.press("Control+z");
  assert(String((await cellState("E5")).value) === "" && String((await cellState("F5")).value) === "",
    "3T Sheet a second Ctrl+Z undoes the entire outside-text paste");
  await page.keyboard.press("Control+z");
  assert(String((await cellState("D2")).value) === "", "3T Sheet Ctrl+Z undoes cell copy/paste in one step");
  await page.keyboard.press("Control+z");
  assert(String((await cellState("A2")).value) === "abc" && String((await cellState("C2")).value) === "",
    "3T Sheet Ctrl+Z undoes the move and restores the source cell");

  await page.locator('[data-command-id="sheet.cell.alignMiddle"]').first().click();
  await page.waitForTimeout(50);
  assert(await grid.evaluate(el => document.activeElement === el), "3T Sheet returns focus after a non-editor ribbon command");
  await clickCell("G8");
  await page.locator('[data-command-id="sheet.format.cellsDialog"]').first().click();
  await page.locator(".vno-dialog-overlay").waitFor();
  await page.keyboard.press("Escape");
  await page.locator(".vno-dialog-overlay").waitFor({ state: "detached", timeout: 3000 });
  await page.waitForTimeout(50);
  assert(await grid.evaluate(el => document.activeElement === el), "3T Sheet returns focus when a dialog closes");
  await page.keyboard.insertText("afterDialog");
  await page.keyboard.press("Enter");
  assert(String((await cellState("G8")).value) === "afterDialog", "3T Sheet accepts typing immediately after a dialog closes");

  await page.evaluate(() => navigator.clipboard.writeText("special"));
  await page.locator('[data-command-id="sheet.edit.pasteSpecial"]').first().click();
  await page.waitForTimeout(150);
  assert(await page.locator(".vno-dialog-overlay").count() > 0, "3T Sheet ribbon Paste Special opens from the system clipboard");
  await page.keyboard.press("Escape");

  assert(pageErrors.length === 0, "No browser runtime errors across both app workflows", JSON.stringify(pageErrors));
} finally {
  await browser?.close();
  server.kill();
}

if (failures.length) process.exitCode = 1;
