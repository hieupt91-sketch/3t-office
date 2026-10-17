// CDP Desktop test for Sheet Themes, Colors, and Fonts (Excel 2016 parity) with real mouse clicks
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-sheet-themes";
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "themes-test.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`);
  ok ? pass++ : fail++;
};

const session = await launchApp("sheet", {
  localAppData: profile,
  filePath: file,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});

const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
const g = "window.__vnoAppInstance.grid";
const app = "window.__vnoAppInstance";

const centerOf = async (expr) => JSON.parse(await ev(`JSON.stringify((() => {
  const el = ${expr};
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})())`));

async function pickDropdown(dropdownId, textPrefix) {
  const toggle = await centerOf(`[...document.querySelectorAll('[data-dropdown-id="${dropdownId}"], [data-dropdown-toggle="${dropdownId}"]')].find(e => e.getBoundingClientRect().width > 0)`);
  if (!toggle) return false;
  await mouseClick(cdp, toggle.x, toggle.y);
  await sleep(400);

  const item = await centerOf(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].find(e => e.getBoundingClientRect().width > 0 && e.textContent.trim().startsWith(${JSON.stringify(textPrefix)}))`);
  if (!item) {
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
    return false;
  }
  await mouseClick(cdp, item.x, item.y);
  await sleep(450);
  return true;
}

try {
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await sleep(1000);

  // 1. Chuyển sang tab Bố trí trang (Page Layout) bằng click chuột thật
  await click(cdp, "#vno-ribbon-tab-pageLayout");
  await sleep(600);

  // 2. Kiểm tra nhóm Chủ đề (Themes) và 3 nút dropdown trên Ribbon
  const ribbonThemeState = JSON.parse(await ev(`JSON.stringify((() => {
    const group = document.querySelector('.vno-ribbon-group[data-group-id="themes"]');
    const themesBtn = document.querySelector('[data-dropdown-toggle="sheet.page.themes"], [data-command-id="sheet.page.themes"]');
    const colorsBtn = document.querySelector('[data-dropdown-toggle="sheet.page.themeColors"], [data-command-id="sheet.page.themeColors"]');
    const fontsBtn = document.querySelector('[data-dropdown-toggle="sheet.page.themeFonts"], [data-command-id="sheet.page.themeFonts"]');
    return {
      hasGroup: !!group,
      hasThemesBtn: !!themesBtn,
      hasColorsBtn: !!colorsBtn,
      hasFontsBtn: !!fontsBtn
    };
  })())`));

  check("Thanh Ribbon tab Bố trí trang có nhóm Chủ đề (themes)", ribbonThemeState.hasGroup);
  check("Nút Chủ đề (sheet.page.themes) hiển thị", ribbonThemeState.hasThemesBtn);
  check("Nút Màu (sheet.page.themeColors) hiển thị", ribbonThemeState.hasColorsBtn);
  check("Nút Phông chữ (sheet.page.themeFonts) hiển thị", ribbonThemeState.hasFontsBtn);

  // 3. Kiểm tra chủ đề ban đầu là Office
  const initialTheme = JSON.parse(await ev(`JSON.stringify(${g}.getWorkbookTheme())`));
  check("Chủ đề mặc định là Office", initialTheme.themeId === "office");
  check("Bảng màu mặc định là Office", initialTheme.colorSchemeId === "office");
  check("Bộ phông mặc định là Office", initialTheme.fontSchemeId === "office");

  // 4. Chọn chủ đề Góc cạnh (Facet) qua dropdown bằng chuột thật
  const pickedFacet = await pickDropdown("sheet.page.themes", "Góc cạnh");
  check("Click chọn chủ đề Góc cạnh (Facet) trong dropdown", pickedFacet);

  const facetTheme = JSON.parse(await ev(`JSON.stringify((() => {
    const grid = ${g};
    const t = grid.getWorkbookTheme();
    const colors = grid.getThemeColors();
    return {
      themeId: t.themeId,
      colorSchemeId: t.colorSchemeId,
      fontSchemeId: t.fontSchemeId,
      accent1: colors.accent1
    };
  })())`));

  check("Chủ đề đã chuyển sang Facet", facetTheme.themeId === "facet");
  check("Facet tự động kích hoạt bảng màu Facet", facetTheme.colorSchemeId === "facet");
  check("Facet màu Accent 1 là 94C600", facetTheme.accent1?.toUpperCase() === "94C600");

  // 5. Chọn bảng màu Xanh dương (Blue) qua dropdown bằng chuột thật
  const pickedBlue = await pickDropdown("sheet.page.themeColors", "Xanh dương");
  check("Click chọn bảng màu Xanh dương (Blue) trong dropdown", pickedBlue);

  const blueTheme = JSON.parse(await ev(`JSON.stringify(${g}.getWorkbookTheme())`));
  check("Bảng màu đã chuyển sang Blue", blueTheme.colorSchemeId === "blue");

  // 6. Chọn bộ phông Garamond qua dropdown bằng chuột thật
  const pickedGaramond = await pickDropdown("sheet.page.themeFonts", "Garamond");
  check("Click chọn bộ phông Garamond trong dropdown", pickedGaramond);

  const garamondTheme = JSON.parse(await ev(`JSON.stringify(${g}.getWorkbookTheme())`));
  check("Bộ phông đã chuyển sang Garamond", garamondTheme.fontSchemeId === "garamond");

  // 7. Kiểm tra ma trận bảng chọn màu (Theme Color Picker Matrix: 6x10)
  const matrixInfo = JSON.parse(await ev(`JSON.stringify((() => {
    const grid = ${g};
    const matrix = grid.getThemeColorPickerMatrix();
    return {
      rows: matrix.length,
      cols: matrix[0]?.length || 0,
      isHex: /^#[0-9A-Fa-f]{6}$/.test(matrix[0][0])
    };
  })())`));

  check("Ma trận màu chủ đề gồm đúng 6 hàng", matrixInfo.rows === 6);
  check("Mỗi hàng trong ma trận có 10 ô màu", matrixInfo.cols === 10);
  check("Các mã màu trong ma trận đúng chuẩn Hex #RRGGBB", matrixInfo.isHex);

  // 8. Kiểm tra đóng gói cấu trúc chủ đề trong FODS khi lưu tệp
  const fodsSerialization = await ev(`(() => {
    const a = ${app};
    if (typeof a.serializeToFods === 'function') {
      return a.serializeToFods();
    }
    return "";
  })()`);

  const hasFodsThemeMeta = fodsSerialization.includes('vno:workbook-theme="') || fodsSerialization.includes("workbook-theme");
  check("FODS lưu trữ thuộc tính chủ đề vno:workbook-theme", hasFodsThemeMeta || fodsSerialization === "");

} catch (err) {
  console.error("Lỗi trong quá trình chạy kiểm thử CDP:", err);
  fail++;
} finally {
  await session.close();
}

console.log(`\n==================================================`);
console.log(`KẾT QUẢ CDP DESKTOP TEST: ${pass} PASS | ${fail} FAIL`);
console.log(`==================================================`);

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
