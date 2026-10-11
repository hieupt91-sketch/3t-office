import { pathToFileURL } from "node:url";

const playwrightPath = process.env.VNO_PLAYWRIGHT_PATH;
if (!playwrightPath) throw new Error("Thiếu VNO_PLAYWRIGHT_PATH");
const playwright = await import(pathToFileURL(playwrightPath).href);
const chromium = playwright.chromium || playwright.default?.chromium;
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const results = [];

const check = async (name, run) => {
  try {
    const detail = await run();
    results.push({ name, status: "PASS", detail });
    console.log(`PASS\t${name}\t${detail}`);
  } catch (error) {
    results.push({ name, status: "FAIL", detail: error.message });
    console.error(`FAIL\t${name}\t${error.message}`);
  }
};

const expect = (condition, message) => {
  if (!condition) throw new Error(message);
};

const activeElementMatches = selector => page.evaluate(expectedSelector => {
  const target = document.querySelector(expectedSelector);
  const active = document.activeElement;
  return {
    matches: Boolean(target && active && (active === target || target.contains(active))),
    active: active?.className || active?.tagName || null
  };
}, selector);

const replaceWithKeyboard = async (locator, text) => {
  await locator.click();
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(text);
};

try {
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" });

  await check("Writer body nhận focus sau click", async () => {
    const body = page.locator('.vno-writer-body[contenteditable="true"]');
    await body.click();
    const focus = await activeElementMatches('.vno-writer-body[contenteditable="true"]');
    expect(focus.matches, `activeElement sai: ${focus.active}`);
    return `activeElement=${focus.active}`;
  });

  await check("Writer body nhận chữ, số và phím mũi tên thật", async () => {
    const body = page.locator(".vno-writer-body");
    await replaceWithKeyboard(body, "AC1");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.type("B");
    const text = await body.innerText();
    expect(text === "ACB1", `nội dung sau ArrowLeft sai: ${JSON.stringify(text)}`);
    return `text=${JSON.stringify(text)}`;
  });

  await check("Writer Ctrl+B tác dụng lên ký tự gõ thật", async () => {
    const body = page.locator(".vno-writer-body");
    await page.keyboard.press("Control+B");
    await page.keyboard.type("BOLD");
    await page.keyboard.press("Control+B");
    const boldText = await body.locator("b, strong").allTextContents();
    expect(boldText.some(text => text.includes("BOLD")), `không thấy BOLD được in đậm: ${JSON.stringify(boldText)}`);
    return `bold=${JSON.stringify(boldText)}`;
  });

  await check("Writer Ctrl+Z hoàn tác nhập liệu thật", async () => {
    const body = page.locator(".vno-writer-body");
    const before = await body.innerText();
    await page.keyboard.type("UNDO-ME");
    await page.waitForTimeout(700);
    await page.keyboard.press("Control+Z");
    const after = await body.innerText();
    expect(after === before, `Ctrl+Z không khôi phục nội dung: before=${JSON.stringify(before)}, after=${JSON.stringify(after)}`);
    return "nội dung đã trở về trạng thái trước khi gõ";
  });

  for (const [label, selector, text] of [
    ["Writer header", ".vno-writer-header", "HEADER-123"],
    ["Writer footer", ".vno-writer-footer", "FOOTER-456"]
  ]) {
    await check(`${label} nhận focus và gõ được`, async () => {
      const editor = page.locator(selector);
      await replaceWithKeyboard(editor, text);
      const focus = await activeElementMatches(selector);
      const actual = await editor.innerText();
      expect(focus.matches, `activeElement sai: ${focus.active}`);
      expect(actual === text, `nội dung sai: ${JSON.stringify(actual)}`);
      return `activeElement=${focus.active}, text=${JSON.stringify(actual)}`;
    });
  }

  await page.locator("#vno-switcher-toggle").click();
  await page.locator('[data-switch="slides"]').click();
  await page.locator(".vno-slides-studio").waitFor();

  for (const [label, selector, seed, expected] of [
    ["Slides title", ".vno-slide-title", "TL1", "TLX1"],
    ["Slides body", ".vno-slide-body:not(.vno-slide-body-col2)", "BD2", "BDX2"]
  ]) {
    await check(`${label} nhận focus, chữ/số và mũi tên`, async () => {
      const editor = page.locator(selector);
      await replaceWithKeyboard(editor, seed);
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.type("X");
      const focus = await activeElementMatches(selector);
      const actual = await editor.innerText();
      expect(focus.matches, `activeElement sai: ${focus.active}`);
      expect(actual === expected, `nội dung sai: ${JSON.stringify(actual)}`);
      return `activeElement=${focus.active}, text=${JSON.stringify(actual)}`;
    });
  }

  await check("Slides SmartArt node vào edit bằng double-click và gõ thật", async () => {
    await page.locator(".vno-ribbon-tab").filter({ hasText: /^(Chèn|Insert)$/ }).click();
    await page.locator('[data-command-id="slides.diagram.insert"]').click();
    await page.locator("#vno-diagram-insert").click();
    const text = page.locator(".vno-slide-shape-item.is-diagram-node .vno-diagram-node-text").first();
    await text.dblclick();
    const focus = await activeElementMatches(".vno-slide-shape-item.is-diagram-node .vno-diagram-node-text");
    expect(focus.matches, `activeElement sai: ${focus.active}`);
    await page.keyboard.press("Control+A");
    await page.keyboard.type("NODE-DOUBLE-1");
    await page.keyboard.press("Enter");
    expect((await text.textContent()) === "NODE-DOUBLE-1", `text node sai: ${await text.textContent()}`);
    return `activeElement=${focus.active}, text=NODE-DOUBLE-1`;
  });

  await check("Slides SmartArt node vào edit bằng click-rồi-gõ", async () => {
    const shape = page.locator(".vno-slide-shape-item.is-diagram-node").nth(1);
    await shape.click();
    const shapeFocused = await shape.evaluate(element => document.activeElement === element);
    expect(shapeFocused, `shape không nhận focus sau click: ${await page.evaluate(() => document.activeElement?.className)}`);
    await page.keyboard.type("Q7");
    const text = shape.locator(".vno-diagram-node-text");
    const actual = await text.textContent();
    const editable = await text.getAttribute("contenteditable");
    const textFocused = await text.evaluate(element => document.activeElement === element);
    expect(actual === "Q7", `click-rồi-gõ không thay/nhập đúng text: ${JSON.stringify(actual)}`);
    expect(editable === "true", `node chưa vào edit mode: contenteditable=${editable}`);
    expect(textFocused, `text node không giữ focus sau khi gõ: ${await page.evaluate(() => document.activeElement?.className)}`);
    return `shapeFocused=${shapeFocused}, textFocused=${textFocused}, contenteditable=${editable}, text=${JSON.stringify(actual)}`;
  });
} finally {
  await browser.close();
}

if (results.some(result => result.status === "FAIL")) process.exitCode = 1;
