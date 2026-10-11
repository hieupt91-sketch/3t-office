import { pathToFileURL } from "node:url";
import path from "node:path";

const playwrightRoot = process.env.VNO_PLAYWRIGHT_ROOT;
if (!playwrightRoot) throw new Error("Thiếu VNO_PLAYWRIGHT_ROOT (thư mục chứa playwright-core)");
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
let failures = 0;
for (const locale of ["vi", "en"]) {
  const context = await browser.newContext({ locale: locale === "vi" ? "vi-VN" : "en-US" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.addInitScript(value => localStorage.setItem("vno-locale", value), locale);
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" });

  const check = async (name, fn) => {
    try { await fn(); console.log(`PASS\t${locale}\t${name}`); }
    catch (error) { failures++; console.error(`FAIL\t${locale}\t${name}\t${error.message}`); }
  };
  const expect = (condition, message) => { if (!condition) throw new Error(message); };
  const switchApp = async app => {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator(`[data-switch="${app}"]`).click();
    await page.locator(`.vno-shell[data-app="${app}"]`).waitFor();
  };
  const assertRibbonIcons = async app => {
    const tabCount = await page.locator(".vno-ribbon-tab").count();
    const seen = new Set();
    const generic = [];
    for (let index = 0; index < tabCount; index++) {
      await page.locator(".vno-ribbon-tab").nth(index).click();
      for (const button of await page.locator("[data-command-id]").all()) {
        const commandId = await button.getAttribute("data-command-id");
        if (!commandId || seen.has(commandId)) continue;
        seen.add(commandId);
        if (await button.locator('svg circle[cx="12"][cy="12"][r="4"]').count()) generic.push(commandId);
      }
    }
    expect(generic.length === 0, `${app} còn icon chấm tròn: ${generic.join(", ")}`);
    expect(seen.size > 0, `${app} không render command ribbon`);
  };

  await check("Writer Ctrl+Z/Ctrl+Y là sự kiện bàn phím thật", async () => {
    const body = page.locator(".vno-writer-body");
    await body.click();
    const before = await body.textContent();
    await page.keyboard.type("AUDIT");
    await page.waitForTimeout(700);
    await page.keyboard.press("Control+z");
    expect((await body.textContent()) === before, "Ctrl+Z không khôi phục Writer");
    await page.keyboard.press("Control+y");
    expect((await body.textContent()).includes("AUDIT"), "Ctrl+Y không làm lại Writer");
  });
  await check("Writer Ctrl+B không bị Sheet ghi đè", async () => {
    await page.locator(".vno-writer-body").click();
    await page.keyboard.press("Control+b");
    const history = await page.evaluate(async () => (await import("/platform/commands/command-bus.js")).globalCommandBus.getHistory().at(-1)?.commandId);
    expect(history === "writer.text.bold", `dispatch sai: ${history}`);
  });
  await check("Writer mọi tab không có icon fallback generic", () => assertRibbonIcons("writer"));

  await switchApp("sheet");
  await check("Sheet Ctrl+Z/Ctrl+Y sau chuyển app", async () => {
    const cell = page.locator('.vno-grid-cell[data-coord="A2"]');
    await cell.click();
    await page.keyboard.press("F2");
    await page.keyboard.type("9876");
    await page.keyboard.press("Enter");
    expect((await cell.textContent()).includes("9876"), "không nhập được ô A1");
    await page.keyboard.press("Control+z");
    expect(!(await cell.textContent()).includes("9876"), "Ctrl+Z không hoàn tác Sheet");
    await page.keyboard.press("Control+y");
    expect((await cell.textContent()).includes("9876"), "Ctrl+Y không làm lại Sheet");
  });
  await check("Sheet Ctrl+B đúng command active", async () => {
    await page.keyboard.press("Control+b");
    const history = await page.evaluate(async () => (await import("/platform/commands/command-bus.js")).globalCommandBus.getHistory().at(-1)?.commandId);
    expect(history === "sheet.cell.bold", `dispatch sai: ${history}`);
  });
  await check("Sheet mọi tab không có icon fallback generic", () => assertRibbonIcons("sheet"));

  await switchApp("slides");
  await check("Slides Ctrl+M, Ctrl+Z, Ctrl+Y sau chuyển app", async () => {
    const thumbs = page.locator(".vno-slide-thumb-item");
    const before = await thumbs.count();
    await page.keyboard.press("Control+m");
    expect(await thumbs.count() === before + 1, "Ctrl+M không thêm slide");
    await page.keyboard.press("Control+z");
    expect(await thumbs.count() === before, "Ctrl+Z không hoàn tác slide mới");
    await page.keyboard.press("Control+y");
    expect(await thumbs.count() === before + 1, "Ctrl+Y không làm lại slide mới");
  });
  await check("Slides mọi tab không có icon fallback generic", () => assertRibbonIcons("slides"));

  await switchApp("writer");
  await check("Writer shortcut đúng lại sau vòng chuyển app", async () => {
    await page.locator(".vno-writer-body").click();
    await page.keyboard.press("Control+m");
    const history = await page.evaluate(async () => (await import("/platform/commands/command-bus.js")).globalCommandBus.getHistory().at(-1)?.commandId);
    expect(history === "writer.para.indentInc", `Ctrl+M còn dính Slides: ${history}`);
  });
  await check("Không có pageerror/console error", async () => {
    const relevant = errors.filter(message => !message.includes("404"));
    expect(relevant.length === 0, relevant.join(" | "));
  });
  await context.close();
}
await browser.close();
if (failures) process.exitCode = 1;
