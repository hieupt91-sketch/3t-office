/**
 * Bug thật: parseFods() trước đây chỉ đọc Page Setup từ thuộc tính riêng vno:page-*,
 * vốn CHỈ tồn tại khi chính VN Office ghi ra và CHƯA từng qua vòng chuyển đổi thật nào.
 * Test này đi hết vòng thật FODS (VN Office ghi ra) -> XLSX (LibreOffice thật convert,
 * giống hệt việc mở trên Microsoft Excel thật) -> FODS (LibreOffice thật convert ngược),
 * rồi đưa qua parseFods() CỦA CHÍNH VN OFFICE - xác nhận Orientation/Margins/Scale/
 * CenterOnPage sống sót qua một vòng chuyển đổi THẬT, không chỉ tự-round-trip nội bộ.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

const soffice = process.env.VNOFFICE_SOFFICE_PATH || path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe");
assert.ok(fs.existsSync(soffice), `Không tìm thấy LibreOffice tại ${soffice}`);

const sheet = "BaoCaoQuy";
const grid = {
  sheets: [sheet], activeSheet: sheet,
  sheetsData: { [sheet]: new Map([["A1", { val: "STT", formula: "", style: {} }], ["F30", { val: 999, formula: "", style: {} }]]) },
  commentsBySheet: { [sheet]: {} }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [],
  printAreaBySheet: { [sheet]: "A1:F30" },
  pageSetupBySheet: { [sheet]: {
    margins: { top: 2.5, bottom: 2.5, left: 1.9, right: 1.5 },
    orientation: "landscape",
    size: "a4",
    scale: { mode: "percent", percent: 85, pagesWide: 1, pagesTall: 0 },
    headerFooter: { header: { left: "", center: "", right: "" }, footer: { left: "", center: "Trang &P / &N", right: "" } },
    centerOnPage: { horizontal: true, vertical: false },
    printOptions: { gridlines: true, headings: true },
    printTitles: { rows: "1", cols: "" }
  } }
};

const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pagesetup-realconv-"));
const xlsxDir = path.join(root, "xlsx"), fodsDir = path.join(root, "fods"), profile = path.join(root, "profile");
[xlsxDir, fodsDir, profile].forEach(dir => fs.mkdirSync(dir, { recursive: true }));
const source = path.join(root, "pagesetup.fods");
fs.writeFileSync(source, new SheetAdapter(grid).serializeToFods(), "utf8");

const convert = (input, target, filter, outdir) => {
  const result = spawnSync(soffice, ["--headless", "--invisible", "--nologo", "--nolockcheck", "--norestore", `-env:UserInstallation=${pathToFileURL(profile).href}`, "--convert-to", `${target}:${filter}`, "--outdir", outdir, input], { encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
};

try {
  convert(source, "xlsx", "Calc MS Excel 2007 XML", xlsxDir);
  const xlsx = path.join(xlsxDir, "pagesetup.xlsx");
  assert.ok(fs.existsSync(xlsx), "XLSX phải được tạo ra");

  convert(xlsx, "fods", "OpenDocument Spreadsheet Flat XML", fodsDir);
  const roundTripXml = fs.readFileSync(path.join(fodsDir, "pagesetup.fods"), "utf8");

  // Mấu chốt của test: parseFods() này KHÔNG được assume file có thuộc tính vno:page-*
  // riêng - nó đang đọc một FODS do CHÍNH LibreOffice thật ghi ra (real conversion),
  // không phải FODS do VN Office tự ghi trực tiếp.
  const parsed = new SheetAdapter(null).parseFods(roundTripXml);
  const after = parsed.pageSetupBySheet[sheet];

  assert.equal(after.orientation, "landscape", `orientation sai sau vòng chuyển đổi thật: ${after.orientation}`);
  assert.ok(Math.abs(after.margins.left - 1.9) < 0.05, `margin left sai: ${after.margins.left}`);
  assert.ok(Math.abs(after.margins.right - 1.5) < 0.05, `margin right sai: ${after.margins.right}`);
  assert.equal(after.scale.mode, "percent", `scale mode sai: ${after.scale.mode}`);
  assert.ok(Math.abs(after.scale.percent - 85) < 2, `scale percent sai: ${after.scale.percent}`);
  assert.equal(after.centerOnPage.horizontal, true, "centerOnPage.horizontal phải là true sau vòng chuyển đổi thật");
  assert.equal(after.size, "a4", `size sai: ${after.size}`);

  console.log(`PASS: Page Setup (orientation/margins/scale/centerOnPage) sống sót qua vòng chuyển đổi FODS -> XLSX thật (${fs.statSync(xlsx).size} bytes) -> FODS thật, đọc bằng parseFods() thật không phụ thuộc thuộc tính riêng vno:page-*.`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${root}`);
  else fs.rmSync(root, { recursive: true, force: true });
}
