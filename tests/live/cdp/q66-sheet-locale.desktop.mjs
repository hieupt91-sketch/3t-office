import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { click, mouseClick, press, sleep, typeText } from "./actions.mjs";

const screenshotDir = path.join(repoRoot, "docs", "screenshots");
await mkdir(screenshotDir, { recursive: true });
const session = await launchApp("sheet", { localAppData: path.join(os.tmpdir(), `vno-cdp-q66-sheet-locale-${Date.now()}`) });
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 90000 });
  await sleep(500);
  const cdp = session.cdp;
  const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 30000 });
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  const centerOf = async coord => ev(`(() => { const el = document.querySelector('[data-coord="${coord}"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x:r.x+r.width/2, y:r.y+r.height/2 }; })()`);
  const clickCell = async coord => {
    const point = await centerOf(coord);
    if (!point) throw new Error(`Không tìm thấy ô ${coord}`);
    await mouseClick(cdp, point.x, point.y);
    await sleep(120);
  };
  const enter = async (coord, value) => {
    await clickCell(coord);
    await typeText(cdp, value, 2);
    await press(cdp, "Enter");
    await sleep(150);
  };
  await enter("A1", "1.250");
  await enter("A2", "1.250,75");
  await enter("A3", "1250,5");
  await enter("B1", "=SUM(A1;A2)");
  await ev(`(() => {
    const g = window.__vnoAppInstance.grid;
    g.applyNumberFormat({ category: "number", useThousands: true, decimals: 2 }, { start: { c: "A", r: 2 }, end: { c: "A", r: 2 } }, false);
  })()`);
  await sleep(150);
  const state = await ev(`(() => {
    const g = window.__vnoAppInstance.grid;
    const get = key => g.cellsData.get(key);
    return {
      values: [get("A1")?.val, get("A2")?.val, get("A3")?.val, get("B1")?.val],
      styles: [get("A1")?.style, get("A2")?.style, get("A3")?.style],
      formula: get("B1")?.formula,
      cellText: ["A1","A2","A3","B1"].map(key => document.querySelector('[data-coord="'+key+'"]')?.textContent.trim()),
      locale: g.options.numberLocale,
      viewport: { width: innerWidth, height: innerHeight }
    };
  })()`);
  check("Locale của ứng dụng tiếng Việt dùng vi-VN", state.locale.locale === "vi-VN");
  check("1.250 nhập là số 1250", state.values[0] === 1250, JSON.stringify(state.values[0]));
  check("1.250,75 nhập là số 1250,75, không làm tròn", state.values[1] === 1250.75, JSON.stringify(state.values[1]));
  check("1250,5 nhập là số 1250,5", state.values[2] === 1250.5, JSON.stringify(state.values[2]));
  check("Hiển thị theo vùng vi-VN", state.cellText[0] === "1.250" && state.cellText[1] === "1.250,75" && state.cellText[2] === "1250,5", JSON.stringify(state.cellText));
  check("Công thức dùng dấu chấm phẩy tính đúng", state.formula === "=SUM(A1;A2)" && state.values[3] === 2500.75, `${state.formula} = ${state.values[3]}`);
  const saveShot = async filename => {
    const response = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(path.join(screenshotDir, filename), Buffer.from(response.result?.data || "", "base64"));
  };
  await saveShot("q66-sheet-locale-light.png");
  await click(cdp, "#vno-toggle-theme-btn");
  await sleep(300);
  await saveShot("q66-sheet-locale-dark.png");
  const xlsxPath = path.join(session.localAppData, "q66-number-locale.xlsx");
  const save = await ev(`(() => {
    const app = window.__vnoAppInstance;
    return globalThis.globalUnoBridge.saveRealFileInPlace("sheet", app.adapter.serializeToFods(), ${JSON.stringify(xlsxPath)}, null);
  })()`);
  check("Lưu XLSX qua LibreOffice thành công", save?.status === "ok", JSON.stringify(save));
  if (save?.status === "ok") {
    const inspect = String.raw`import sys, zipfile, re
with zipfile.ZipFile(sys.argv[1]) as z:
    xml = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
def cell(ref):
    m = re.search(r'<c\b[^>]*\br="' + ref + r'"[^>]*>(.*?)</c>', xml)
    if not m: return None
    v = re.search(r'<v>(.*?)</v>', m.group(1))
    return v.group(1) if v else None
print("|".join(str(cell(ref)) for ref in ("A1", "A2", "A3")))`;
    const stored = execFileSync("python", ["-c", inspect, xlsxPath], { encoding: "utf8" }).trim();
    check("XLSX lưu số theo giá trị chuẩn không phân cách vùng", stored === "1250|1250.75|1250.5", stored);
  }
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close().catch(() => {});
}
if (checks.some(pass => !pass)) process.exit(1);
