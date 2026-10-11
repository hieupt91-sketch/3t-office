import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { SheetAdapter } from '../adapters/libreoffice/sheet/sheet-adapter.js';

const REAL_XLSX_PATH = process.argv[2] || 'E:\\VN OFice\\file test\\DSS_Báo giá Dahua HN-T11.2023.xlsx';
const TARGET_SHEET = 'Thông báo Sản phẩm mới';

console.log(`[1] File nguồn: ${REAL_XLSX_PATH}`);
if (!fs.existsSync(REAL_XLSX_PATH)) {
  console.error(`Không tìm thấy file nguồn: ${REAL_XLSX_PATH}`);
  process.exit(1);
}

// 1. Chạy Python main._run_soffice_convert + _apply_native_import_overlay
const tmpDir = path.join(os.tmpdir(), 'vno-measure-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

const fodsPath = execSync(`python scripts/export_fods.py "${REAL_XLSX_PATH}" "${tmpDir}"`, {
  cwd: path.resolve('.'),
  encoding: 'utf-8'
}).trim().split(/\r?\n/).pop();

console.log(`[3] FODS sinh ra tại: ${fodsPath}`);
const fodsXml = fs.readFileSync(fodsPath, 'utf8');

// 2. Phân tích raw FODS styles
const styleMap = new Map();
const styleRegex = /<style:style\b([^>]*?)\s*(?:\/>|>([\s\S]*?)<\/style:style>)/gi;
let sm;
while ((sm = styleRegex.exec(fodsXml)) !== null) {
  const nameMatch = sm[1].match(/style:name=["']([^"']*)["']/i);
  if (nameMatch) {
    styleMap.set(nameMatch[1], { attrs: sm[1], body: sm[2] || '' });
  }
}

// Trích xuất table sheet mục tiêu
const tableRegex = new RegExp(`<table:table[^>]*table:name=["']${TARGET_SHEET}["'][^>]*>([\\s\\S]*?)<\\/table:table>`, 'i');
const tableMatch = fodsXml.match(tableRegex);
if (!tableMatch) {
  console.error(`Không tìm thấy sheet: ${TARGET_SHEET}`);
  process.exit(1);
}
const tableBody = tableMatch[1];

// 3. parseFods qua SheetAdapter
const adapter = new SheetAdapter(null);
const parsedWb = adapter.parseFods(fodsXml);
const colWidths = parsedWb.colWidthsBySheet[TARGET_SHEET] || new Map();
const rowHeights = parsedWb.rowHeightsBySheet[TARGET_SHEET] || new Map();

// Trích xuất các table-column trong sheet
const colElements = [];
const colRegex = /<table:table-column\b([^>]*?)\/?>/gi;
let cm;
let currentLayoutCol = 1;
function colToLetter(n) {
  let res = '';
  for (let c = n; c > 0; c = Math.floor((c - 1) / 26)) {
    res = String.fromCharCode(65 + ((c - 1) % 26)) + res;
  }
  return res;
}

while ((cm = colRegex.exec(tableBody)) !== null) {
  const attrs = cm[1];
  const repeatMatch = attrs.match(/table:number-columns-repeated=["'](\d+)["']/i);
  const repeat = repeatMatch ? parseInt(repeatMatch[1], 10) : 1;
  const styleMatch = attrs.match(/table:style-name=["']([^"']*)["']/i);
  const styleName = styleMatch ? styleMatch[1] : '';
  const styleObj = styleMap.get(styleName);
  const widthRaw = styleObj?.body?.match(/style:column-width=["']([^"']+)["']/i)?.[1] || null;

  for (let r = 0; r < repeat; r++) {
    const colName = colToLetter(currentLayoutCol);
    colElements.push({ colName, styleName, widthRaw });
    currentLayoutCol++;
    if (currentLayoutCol > 10) break; // chỉ cần A-J
  }
  if (currentLayoutCol > 10) break;
}

// Trích xuất các table-row trong sheet
const rowElements = [];
const rowRegex = /<table:table-row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/gi;
let rm;
let currentLayoutRow = 1;
while ((rm = rowRegex.exec(tableBody)) !== null) {
  const attrs = rm[1];
  const repeatMatch = attrs.match(/table:number-rows-repeated=["'](\d+)["']/i);
  const repeat = repeatMatch ? parseInt(repeatMatch[1], 10) : 1;
  const styleMatch = attrs.match(/table:style-name=["']([^"']*)["']/i);
  const styleName = styleMatch ? styleMatch[1] : '';
  const styleObj = styleMap.get(styleName);
  const heightRaw = styleObj?.body?.match(/style:row-height=["']([^"']+)["']/i)?.[1] || null;

  for (let r = 0; r < Math.min(repeat, 10); r++) {
    rowElements.push({ rowNumber: currentLayoutRow, styleName, heightRaw, repeat });
    currentLayoutRow++;
    if (currentLayoutRow > 10) break; // chỉ cần hàng 1-10
  }
  if (repeat > 10) {
    console.log(`[FODS] Row ${currentLayoutRow - Math.min(repeat, 10)} có repeat = ${repeat}, style = ${styleName}, height = ${heightRaw}`);
  }
  if (currentLayoutRow > 10) break;
}

function odfLengthToExpectedPx(raw) {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(-?[\d.]+)\s*(cm|mm|in|pt|pc|px)?$/i);
  if (!m) return null;
  const val = Number(m[1]);
  const unit = (m[2] || 'cm').toLowerCase();
  const px = unit === 'mm' ? val * (96 / 25.4)
    : unit === 'in' ? val * 96
    : unit === 'pt' ? val * (96 / 72)
    : unit === 'pc' ? val * 16
    : unit === 'px' ? val
    : val * (96 / 2.54);
  return { exact: px, rounded: Math.round(px) };
}

console.log('\n================ BẢNG ĐO ĐỘ RỘNG CỘT (Sheet: ' + TARGET_SHEET + ') ================');
console.log('Cột | Style Name | FODS Raw Width | Kỳ vọng 96dpi (exact -> round) | parseFods px');
console.log('----+------------+----------------+-------------------------------+--------------');
for (const col of colElements.slice(0, 6)) {
  const exp = odfLengthToExpectedPx(col.widthRaw);
  const parsedVal = colWidths instanceof Map ? colWidths.get(col.colName) : colWidths[col.colName];
  const expStr = exp ? `${exp.exact.toFixed(2)}px -> ${exp.rounded}px` : 'N/A';
  console.log(`${col.colName.padEnd(3)} | ${(col.styleName || '').padEnd(10)} | ${(col.widthRaw || 'N/A').padEnd(14)} | ${expStr.padEnd(29)} | ${parsedVal ?? '(default)'}`);
}

console.log('\n================ BẢNG ĐO CHIỀU CAO HÀNG (Sheet: ' + TARGET_SHEET + ') ================');
console.log('Hàng | Style Name | FODS Raw Height | Kỳ vọng 96dpi (exact -> round) | parseFods px');
console.log('-----+------------+-----------------+-------------------------------+--------------');
for (const row of rowElements.slice(0, 6)) {
  const exp = odfLengthToExpectedPx(row.heightRaw);
  const parsedVal = rowHeights instanceof Map ? rowHeights.get(row.rowNumber) : rowHeights[row.rowNumber];
  const expStr = exp ? `${exp.exact.toFixed(2)}px -> ${exp.rounded}px` : 'N/A';
  console.log(`${String(row.rowNumber).padEnd(4)} | ${(row.styleName || '').padEnd(10)} | ${(row.heightRaw || 'N/A').padEnd(15)} | ${expStr.padEnd(29)} | ${parsedVal ?? '(default)'}`);
}

console.log('\n================ NỘI DUNG VÀ STYLE CỦA CÁC Ô VÙNG A1:D5 ================');
const sheetData = parsedWb.sheetsData[TARGET_SHEET] || new Map();
const cols = ['A', 'B', 'C', 'D'];
for (let r = 1; r <= 5; r++) {
  for (const c of cols) {
    const key = `${c}${r}`;
    const cell = sheetData instanceof Map ? sheetData.get(key) : sheetData[key];
    if (cell) {
      console.log(`Ô ${key}: val = ${JSON.stringify(cell.val)}, style = ${JSON.stringify(cell.style)}`);
    } else {
      console.log(`Ô ${key}: (trống)`);
    }
  }
}

