import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.env.VNO_PLAYWRIGHT_ROOT;
if (!root) throw new Error("Thiếu VNO_PLAYWRIGHT_ROOT");
const { chromium } = await import(pathToFileURL(path.join(root, "node_modules/playwright-core/index.mjs")));
const browser = await chromium.launch({ executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", headless: true });
let failures = 0;

for (const locale of ["vi", "en"]) {
  const context = await browser.newContext({ locale: locale === "vi" ? "vi-VN" : "en-US" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.addInitScript(value => localStorage.setItem("vno-locale", value), locale);
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "networkidle" });
  const expect = (condition, message) => { if (!condition) throw new Error(message); };
  const check = async (name, action) => {
    try { await action(); console.log(`PASS\t${locale}\t${name}`); }
    catch (error) { failures++; console.error(`FAIL\t${locale}\t${name}\t${error.message}`); }
  };
  const switchApp = async app => {
    await page.locator("#vno-switcher-toggle").click();
    await page.locator(`[data-switch="${app}"]`).click();
    await page.locator(`.vno-shell[data-app="${app}"]`).waitFor();
  };
  const selectTab = async labels => {
    const tab = page.locator(".vno-ribbon-tab").filter({ hasText: new RegExp(`^(${labels.join("|")})$`, "i") });
    await tab.click();
  };
  const clickCommand = id => page.locator(`[data-command-id="${id}"]`).click();
  const grid = () => page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid);
  const canvasState = () => page.evaluate(async () => {
    const canvas = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.canvas;
    return { slides: canvas.slides, current: canvas.currentSlideIndex, transitionConfig: canvas.transitionConfig };
  });
  const enterCell = async (coord, value) => {
    await page.locator(`.vno-grid-cell[data-coord="${coord}"]`).click();
    await page.locator("#vno-formula-val").fill(String(value));
    await page.keyboard.press("Enter");
  };

  await switchApp("sheet");
  await check("Sheet formulas: lookup/conditional functions through real formula input", async () => {
    const seed = { A1: 100, B1: "An", C1: 8, A2: 200, B2: "Binh", C2: 15, A3: 300, B3: "Chi Anh", C3: 25, F1: 100, G1: 200, H1: 300, F2: "An", G2: "Binh", H2: "Chi Anh" };
    for (const [coord, value] of Object.entries(seed)) await enterCell(coord, value);
    const formulas = {
      E1: "=VLOOKUP(300,A1:C3,2,FALSE)", E2: "=HLOOKUP(200,F1:H2,2,FALSE)",
      E3: "=INDEX(B1:C3,3,2)", E4: "=MATCH(300,A1:A3,0)",
      E5: '=COUNTIF(C1:C3,">10")', E6: '=SUMIF(B1:B3,"*Anh*",C1:C3)'
    };
    for (const [coord, formula] of Object.entries(formulas)) await enterCell(coord, formula);
    const values = await page.evaluate(async coords => {
      const g = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
      return coords.map(coord => g.cellsData.get(coord)?.val);
    }, Object.keys(formulas));
    const normalized = values.map(value => typeof value === "string" && /\d/.test(value) ? Number(value.replace(/[^\d.-]/g, "")) : value);
    expect(JSON.stringify(normalized) === JSON.stringify(["Chi Anh", "Binh", 25, 3, 2, 25]), `kết quả sai: ${JSON.stringify(values)}`);
  });
  await check("Sheet AutoSum ribbon click and Alt+= shortcut", async () => {
    await enterCell("G1", 2); await enterCell("G2", 3); await page.locator('.vno-grid-cell[data-coord="G3"]').click();
    await selectTab(locale === "vi" ? ["Công thức"] : ["Formulas"]);
    await clickCommand("sheet.formula.sum");
    expect((await page.locator("#vno-formula-val").inputValue()).startsWith("=SUM("), "click AutoSum không chèn công thức");
    await page.keyboard.press("Escape");
    await page.locator('.vno-grid-cell[data-coord="H3"]').click();
    await page.keyboard.press("Alt+=");
    const history = await page.evaluate(async () => (await import("/platform/commands/command-bus.js")).globalCommandBus.getHistory().at(-1)?.commandId);
    expect(history === "sheet.formula.sum", `Alt+= dispatch ${history}`);
  });
  await check("Sheet Ctrl+Shift+Enter real array formula", async () => {
    await enterCell("I1", 2); await enterCell("J1", 4);
    await page.locator('.vno-grid-cell[data-coord="K1"]').click();
    await page.locator('.vno-grid-cell[data-coord="L1"]').click({ modifiers: ["Shift"] });
    await page.locator("#vno-formula-val").fill("=I1:J1*2");
    await page.keyboard.press("Control+Shift+Enter");
    const state = await page.evaluate(async () => {
      const g = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
      return g.cellsData.get("K1");
    });
    expect(state?.isArrayFormula, "array metadata không được tạo");
  });
  await check("Sheet Name Manager creates a name and Escape closes from document focus", async () => {
    await clickCommand("sheet.formula.nameManager");
    await page.locator("#vno-name-new").click();
    await page.locator("#vno-name-value").fill("AuditRange");
    await page.locator("#vno-name-ref").fill("A1:A3");
    await page.locator(".vno-rule-apply").click();
    const named = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid.namedRangesWorkbook.some(item => item.name === "AuditRange"));
    expect(named, "Name Manager không lưu tên");
    await page.locator(".vno-rule-cancel").click();
    await clickCommand("sheet.formula.nameManager");
    await page.locator("body").focus(); await page.keyboard.press("Escape");
    expect(await page.locator(".vno-sheet-rule-dialog").count() === 0, "Name Manager không đóng bằng Escape");
  });
  await check("Sheet sort/filter/validation through Data tab and shortcut", async () => {
    await enterCell("M1", 3); await enterCell("M2", 1); await enterCell("M3", 2); await page.locator('.vno-grid-cell[data-coord="M1"]').click();
    await page.locator('.vno-grid-cell[data-coord="M3"]').click({ modifiers: ["Shift"] });
    await selectTab(locale === "vi" ? ["Dữ liệu"] : ["Data"]);
    await clickCommand("sheet.data.sortAsc");
    const sorted = await page.evaluate(async () => {
      const g = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
      return [1, 2, 3].map(r => g.cellsData.get(`M${r}`)?.val);
    });
    expect(sorted.join(",") === "1,2,3", `sort sai ${sorted}`);
    await page.keyboard.press("Control+Shift+l");
    const filterActive = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid.isFilterActive);
    expect(filterActive, "shortcut Filter không bật filter");
    await clickCommand("sheet.data.validation");
    await page.locator("#vno-dv-list").fill("Có,Không");
    await page.locator(".vno-rule-apply").click();
    const validations = await page.evaluate(async () => (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid.dataValidationsBySheet);
    expect(Object.values(validations).some(items => items.length), "validation không được lưu");
  });
  await check("Sheet Pivot Table creates a real result sheet and Escape", async () => {
    await page.locator('.vno-grid-cell[data-coord="A1"]').click();
    await page.locator('.vno-grid-cell[data-coord="C3"]').click({ modifiers: ["Shift"] });
    await clickCommand("sheet.data.pivotTable");
    expect(await page.locator(".vno-pivot-dialog").count() === 1, "Pivot dialog không mở");
    await page.locator('input[data-zone="rows"][data-index="1"]').check();
    await page.locator('input[data-zone="values"][data-index="2"]').check();
    await page.locator(".vno-rule-apply").click();
    const pivotCount = await page.evaluate(async () => {
      const g = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
      return Object.values(g.pivotTablesBySheet).reduce((sum, items) => sum + items.length, 0);
    });
    expect(pivotCount > 0, "Pivot Table không được tạo");
    await clickCommand("sheet.data.pivotTable");
    await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press("Escape");
    expect(await page.locator(".vno-pivot-dialog").count() === 0, "Pivot dialog không đóng Escape");
  });
  await check("Sheet Insert row/column/chart and chart Escape from outside modal", async () => {
    await selectTab(locale === "vi" ? ["Chèn"] : ["Insert"]);
    const before = await page.evaluate(async () => {
      const g = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
      return [g.rowCount, g.cols.length];
    });
    await clickCommand("sheet.row.insert"); await clickCommand("sheet.col.insert");
    const after = await page.evaluate(async () => {
      const g = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.grid;
      return [g.rowCount, g.cols.length];
    });
    expect(after[0] === before[0] + 1 && after[1] === before[1] + 1, `insert row/col sai ${before} -> ${after}`);
    await clickCommand("sheet.chart.insert");
    expect(await page.locator("[data-chart-preview]").count() === 1, "chart dialog không mở");
    await page.locator("body").focus(); await page.keyboard.press("Escape");
    expect(await page.locator("[data-chart-preview]").count() === 0, "chart dialog không đóng Escape ngoài modal");
  });

  await switchApp("slides");
  await check("Slides transition preview/apply current/apply all/Escape", async () => {
    await page.keyboard.press("Control+m");
    await selectTab(locale === "vi" ? ["Chuyển tiếp"] : ["Transitions"]);
    await clickCommand("slides.transition.apply");
    await page.locator("#vno-trans-type-select").selectOption("zoom");
    await page.locator("#vno-trans-preview-btn").click();
    expect((await page.locator("#vno-trans-preview-box").getAttribute("style")).includes("vnoTransitionZoom"), "preview không chạy");
    await page.locator("#vno-trans-apply-current").click();
    let state = await canvasState();
    expect(state.slides[state.current].transition?.type === "zoom", "không áp transition hiện tại");
    await clickCommand("slides.transition.apply"); await page.locator("#vno-trans-type-select").selectOption("flip"); await page.locator("#vno-trans-apply-all").click();
    state = await canvasState(); expect(state.slides.every(slide => slide.transition?.type === "flip"), "không áp dụng tất cả");
    await clickCommand("slides.transition.apply"); await page.locator("body").focus(); await page.keyboard.press("Escape");
    expect(await page.locator("#vno-trans-type-select").count() === 0, "transition dialog không đóng Escape");
  });
  await check("Slides animation add/preview/remove/Escape", async () => {
    await selectTab(locale === "vi" ? ["Hoạt hình"] : ["Animations"]);
    await clickCommand("slides.animation.apply"); await page.locator("#vno-anim-type-select").selectOption("fadeIn"); await page.locator("#vno-anim-preview-btn").click();
    expect((await page.locator("#vno-anim-preview-box").getAttribute("style")).includes("vnoAnimFadeIn"), "animation preview không chạy");
    await page.locator("#vno-anim-apply").click();
    let state = await canvasState(); expect(state.slides[state.current].titleAnimation?.type === "fadeIn", "animation không lưu");
    await clickCommand("slides.animation.apply"); await page.locator("#vno-anim-clear").click();
    state = await canvasState(); expect(state.slides[state.current].titleAnimation?.type === "none", "animation không xóa");
    await clickCommand("slides.animation.apply"); await page.locator("body").focus(); await page.keyboard.press("Escape");
    expect(await page.locator("#vno-anim-target-select").count() === 0, "animation dialog không đóng Escape");
  });
  await check("Slides slideshow ribbon and F5/Shift+F5/Alt+F5 shortcuts", async () => {
    await selectTab(locale === "vi" ? ["Trình chiếu"] : ["Slide Show"]);
    await clickCommand("slides.show.startFromBegin"); expect(await page.locator(".vno-slideshow-overlay").count() === 1, "start begin không mở"); await page.keyboard.press("Escape");
    await page.keyboard.press("Shift+F5"); expect(await page.locator(".vno-slideshow-overlay").count() === 1, "Shift+F5 không mở"); await page.keyboard.press("Escape");
    await page.keyboard.press("Alt+F5"); expect(await page.locator(".vno-presenter-overlay").count() === 1, "Alt+F5 presenter không mở"); await page.keyboard.press("Escape");
    await clickCommand("slides.show.rehearseTimings"); expect(await page.locator(".vno-rehearse-timer-box").count() === 1, "rehearse không mở"); await page.keyboard.press("Escape");
  });
  await check("Slides Insert image/video/audio/shape/diagram via real clicks", async () => {
    await selectTab(locale === "vi" ? ["Chèn"] : ["Insert"]);
    let chooser = page.waitForEvent("filechooser"); await clickCommand("slides.image.insert"); (await chooser).setFiles({ name: "pixel.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") });
    await page.waitForTimeout(50);
    chooser = page.waitForEvent("filechooser"); await clickCommand("slides.media.insertVideo"); (await chooser).setFiles({ name: "sample.webm", mimeType: "video/webm", buffer: Buffer.from([0x1a, 0x45, 0xdf, 0xa3]) });
    await page.waitForTimeout(50);
    chooser = page.waitForEvent("filechooser"); await clickCommand("slides.media.insertAudio"); (await chooser).setFiles({ name: "sample.wav", mimeType: "audio/wav", buffer: Buffer.from("RIFF0000WAVE", "ascii") });
    await page.waitForTimeout(50);
    await clickCommand("slides.shape.insert"); await clickCommand("slides.diagram.insert");
    expect(await page.locator(".vno-diagram-dialog").count() + await page.locator("[data-diagram-type]").count() > 0, "diagram dialog không mở");
    await page.locator('[data-diagram-type="cycle"]').click();
    await page.locator("#vno-diagram-count").fill("3");
    await page.locator("#vno-diagram-insert").click();
    const types = await page.evaluate(async () => {
      const c = (await import("/adapters/libreoffice/common/uno-bridge.js")).globalUnoBridge.activeDocument.canvas;
      return c.slides[c.currentSlideIndex].shapes.map(shape => shape.type);
    });
    expect(types.includes("image") && types.includes("video") && types.includes("audio") && types.includes("rect") && types.includes("connector"), `thiếu object ${types}`);
  });
  await check("No browser runtime errors", async () => {
    const relevant = errors.filter(error => !error.includes("404") && !error.includes("NotSupportedError"));
    expect(relevant.length === 0, relevant.join(" | "));
  });
  await context.close();
}

await browser.close();
if (failures) process.exitCode = 1;
