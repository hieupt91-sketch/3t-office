import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, sleep, typeText } from "./actions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const templateXlsx = path.join(root, "tests/live/cdp/test_sheet_home.xlsx");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

// Helper to inspect zip XML
export function inspectXlsxXml(filePath) {
  try {
    const pythonCode = `
import zipfile, json, sys
p = sys.argv[1]
with zipfile.ZipFile(p, 'r') as z:
    names = z.namelist()
    styles = z.read('xl/styles.xml').decode('utf-8', errors='ignore') if 'xl/styles.xml' in names else ''
    sheet = z.read('xl/worksheets/sheet1.xml').decode('utf-8', errors='ignore') if 'xl/worksheets/sheet1.xml' in names else ''
    shared = z.read('xl/sharedStrings.xml').decode('utf-8', errors='ignore') if 'xl/sharedStrings.xml' in names else ''
print(json.dumps({'entries': names, 'styles': styles, 'sheet': sheet, 'shared': shared}))
`;
    const res = execFileSync("python", ["-c", pythonCode, filePath], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
    return JSON.parse(res);
  } catch (err) {
    return { error: err.message };
  }
}

export async function clickCommand(cdp, commandId) {
  const selector = `[data-command-id="${commandId}"]`;
  const index = await cdp.evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }))()`);
  if (index < 0) throw new Error(`No visible ribbon button for ${commandId}`);
  await click(cdp, selector, index);
}

export async function clickDropdown(cdp, dropdownId, itemCommandId) {
  const toggleSelector = `[data-dropdown-id="${dropdownId}"], [data-dropdown-toggle="${dropdownId}"]`;
  await click(cdp, toggleSelector, 0);
  await sleep(300);
  const itemSelector = `.vno-ribbon-dropdown-item[data-command-id="${itemCommandId}"]`;
  await click(cdp, itemSelector, 0);
  await sleep(200);
}

export async function selectCell(cdp, coord) {
  await click(cdp, `.vno-grid-cell[data-coord="${coord}"]`);
  await sleep(150);
}

export async function getCellInfo(cdp, coord) {
  return await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    const item = grid.cellsData.get(${JSON.stringify(coord)}) || {};
    const rawVal = item.val !== undefined ? item.val : "";
    const dom = document.querySelector('.vno-grid-cell[data-coord="' + ${JSON.stringify(coord)} + '"]');
    const computed = dom ? window.getComputedStyle(dom) : {};
    return {
      rawVal,
      formula: item.formula || "",
      style: item.style || {},
      numFmt: item.numFmt || null,
      domText: dom ? dom.innerText.trim() : "",
      domBg: computed.backgroundColor || "",
      domColor: computed.color || "",
      domWeight: computed.fontWeight || "",
      domStyle: computed.fontStyle || "",
      domDec: computed.textDecoration || "",
      domAlign: computed.textAlign || "",
      domVAlign: computed.verticalAlign || "",
      domBorder: computed.border || "",
      domWrap: dom ? dom.classList.contains("is-wrap-text") : false,
      selectedCoord: grid.selectedCoord,
      selectionRange: grid.selectionRange
    };
  })()`);
}

export async function saveDocument(cdp) {
  await cdp.evaluate('window.__vnoAppInstance.adapter.isDirty = true');
  const saved = await cdp.evaluate('window.__vnoAppInstance.adapter.save()');
  await sleep(500);
  return saved;
}

export async function setupSession() {
  await fs.copyFile(templateXlsx, workXlsx);
  const session = await launchApp("sheet", { filePath: workXlsx });
  const { cdp } = session;
  const started = Date.now();
  while (Date.now() - started < 45000) {
    const ready = await cdp.evaluate('window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector(".vno-sheet-quick-view")');
    if (ready) break;
    await sleep(500);
  }
  await sleep(1000);
  return session;
}
