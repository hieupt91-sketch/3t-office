import { readFile, writeFile } from "node:fs/promises";
import { EXTENDED_FUNCTION_CATALOG, FormulaEngine } from "../../apps/sheet/formula-engine.js";

const matrixCatalog = JSON.parse(await readFile(new URL("../../docs/EXCEL2016-FUNCTION-CATALOG.json", import.meta.url), "utf8"));
const appCatalog = new Map(EXTENDED_FUNCTION_CATALOG.map(item => [item.name, item]));
const report = JSON.parse(await readFile(new URL("../../docs/EXCEL2016-FUNCTIONS-COM-RESULTS.json", import.meta.url), "utf8"));
const caseReport = JSON.parse(await readFile(new URL("../../docs/EXCEL2016-FUNCTIONS-COM-CASES.json", import.meta.url), "utf8"));
let transposeArrayEvidence = null;
try {
  transposeArrayEvidence = JSON.parse(await readFile(new URL("../../docs/EXCEL2016-TRANSPOSE-ARRAY-COM-RESULTS.json", import.meta.url), "utf8"));
} catch {}
const resultByName = new Map(report.rows.map(row => [row.name, row]));
const casesByName = new Map();
for (const row of caseReport.rows) {
  if (!casesByName.has(row.name)) casesByName.set(row.name, []);
  casesByName.get(row.name).push(row);
}
const engine = new FormulaEngine(new Map());
const functions = [...matrixCatalog.functions];
for (const item of EXTENDED_FUNCTION_CATALOG) {
  if (!functions.some(entry => entry.name === item.name)) {
    functions.push({ name: item.name, category: item.category, excel2016: false, year: "VN", sourceYearTag: "" });
  }
}
const categories = [...new Set(functions.map(item => item.category))];
const standards = functions.filter(item => item.excel2016);
const later = functions.filter(item => !item.excel2016 && item.year !== "VN");
const unrun = standards.filter(item => (casesByName.get(item.name)?.length || 0) < 3);
const laterNames = new Set(later.map(item => item.name));
const notComparableNames = new Set(["TRANSPOSE"]);
const comparable = report.rows.filter(row => row.match !== null && row.name !== "VND" && !laterNames.has(row.name) && !notComparableNames.has(row.name));
const matched = comparable.filter(row => row.match === true);
const mismatched = comparable.filter(row => row.match === false);
const standardCaseRows = caseReport.rows.filter(row => standards.some(item => item.name === row.name));
const comparableCases = standardCaseRows.filter(row => row.match !== null);
const matchedCases = comparableCases.filter(row => row.match === true);
const mismatchedCases = comparableCases.filter(row => row.match === false);
const lines = [
  "# Ma trận hàm VN Sheet đối chiếu Excel 2016",
  "",
  `Ngày chạy: 2026-10-13. Oracle: Excel ${report.excelVersion}; VN Sheet ghi một XLSX; Excel COM mở ReadOnly, gọi CalculateFullRebuild trong bộ nhớ và không lưu workbook.`,
  "",
  `Danh mục nguồn Microsoft có ${matrixCatalog.functions.length} hàm duy nhất; ${standards.length} được đánh dấu dùng được trong Excel 2016 và ${later.length} có mốc sau 2016. Danh sách: [Microsoft Excel functions by category](https://support.microsoft.com/en-us/excel/excel-functions-by-category).`,
  `VN Sheet hiện có ${EXTENDED_FUNCTION_CATALOG.length} mục gợi ý hàm (bao gồm hàm riêng VND); ${casesByName.size} hàm có ít nhất ba ca đã nhập qua desktop/CDP và đọc lại từ Excel 2016 COM ReadOnly.${transposeArrayEvidence?.match ? " Ca CSE TRANSPOSE riêng cũng khớp trên desktop và Excel COM ReadOnly." : ""}`,
  "",
  "## Kết quả lượt COM",
  "",
  "**Giới hạn tương thích lưu:** ca RANK.EQ và FORMULATEXT trong lượt này nhập công thức có tiền tố `_xlfn.` qua CDP để Excel 2016 tính được. Công thức thông thường không có tiền tố vẫn chưa được sửa ở đường lưu XLSX; mapping đề xuất nằm trong `docs/PLAN-EXCEL-2016-E1-OOXML-COMPAT.md` và đang chờ phê duyệt do thay đổi output XLSX.",
  "",
  "| Chỉ số | Kết quả |",
  "|---|---:|",
  `| Hàm Excel 2016 đủ tối thiểu 3 ca COM | ${standards.length - unrun.length}/${standards.length} |`,
  `| Tổng ca COM ReadOnly | ${standardCaseRows.length} |`,
  `| Ca scalar có thể so sánh | ${comparableCases.length} |`,
  `| Khớp | ${matchedCases.length} |`,
  `| Lệch (gồm hàm chưa hỗ trợ) | ${mismatchedCases.length} |`,
  `| Hậu Excel 2016 | ${later.length} |`,
  `| Chưa chạy COM trong ma trận nguồn | ${unrun.length} |`,
  "",
  "`MATCH` chỉ ghi khi giá trị khớp. Mỗi hàm Excel 2016 có ba ca: thường, ô trống/lỗi và kiểu trộn; mọi workbook được Excel 2016 mở ReadOnly và chỉ tính lại trong bộ nhớ.",
  "",
  "## Ma trận theo hàm",
  "",
  "| Hàm | Nhóm | Phiên bản | Có trong danh mục VN | Gọi rỗng trong FormulaEngine | Ca thường | Ca ô trống/lỗi | Ca kiểu trộn | Khớp | Kết quả |",
  "|---|---|---|---|---|---|---|---|---:|---|"
];

function formatCase(row) {
  if (!row) return "NOT RUN";
  const app = String(row.appValue ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
  const oracle = String(row.excelText ?? row.excelValue ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
  const status = row.match === null ? "VOLATILE" : row.match ? "MATCH" : "MISMATCH";
  return `\`${String(row.formula).replaceAll("|", "\\|")}\` → VN \`${app}\`; COM \`${oracle}\` (${status})`;
}

for (const category of categories) {
  lines.push("", `### ${category}`, "");
  for (const item of functions.filter(entry => entry.category === category)) {
    const appItem = appCatalog.get(item.name);
    const caseRows = casesByName.get(item.name) || [];
    const emptyValue = String(engine.evaluate(`=${item.name}()`)).replaceAll("|", "\\|").replaceAll("\n", " ");
    const version = item.year === "VN" ? "Hàm VN" : item.excel2016 ? "Excel 2016" : `Sau Excel 2016 (${item.year})`;
    const listed = appItem ? "Có" : "Không";
    const byKind = new Map(caseRows.map(row => [row.kind, row]));
    const comparableForFunction = caseRows.filter(row => row.match !== null);
    const matchCount = comparableForFunction.filter(row => row.match === true).length;
    let status = caseRows.length < 3 ? "NOT RUN" : matchCount === comparableForFunction.length ? "MATCH" : appItem ? "MISMATCH — cần sửa" : "CHƯA HỖ TRỢ";
    if (!item.excel2016) status = "Ngoài Excel 2016";
    lines.push(`| ${item.name} | ${item.category} | ${version} | ${listed} | \`${emptyValue}\` | ${formatCase(byKind.get("normal"))} | ${formatCase(byKind.get("blank_or_error"))} | ${formatCase(byKind.get("mixed_type"))} | ${matchCount}/${comparableForFunction.length} | ${status} |`);
  }
}

lines.push(
  "",
  "## Sai lệch đã xác nhận",
  "",
  ...mismatchedCases.filter(row => row.implemented).map(row => `- **${row.name}** (${row.kind}) \`${row.formula}\`: VN Sheet=${row.appValue}; Excel=${row.excelText}.`),
  mismatchedCases.some(row => row.implemented) ? "" : "- Không còn sai lệch trong các ca của hàm đã hỗ trợ.",
  "## Phạm vi chưa hoàn tất",
  "",
  `- Còn ${unrun.length} hàm Excel 2016 chưa đủ ba ca COM.`,
  `- Có ${new Set(mismatchedCases.filter(row => !row.implemented).map(row => row.name)).size} hàm Excel 2016 chưa được FormulaEngine hỗ trợ; các hàng này ghi CHƯA HỖ TRỢ, không che thành PASS.`,
  "- Các hàm dynamic array mới hơn Excel 2016 được liệt kê để phân biệt, không chấm là lệch E1.",
  "- Hàm riêng VND không thuộc danh mục Excel và không gửi vào workbook oracle."
);

await writeFile(new URL("../../docs/EXCEL2016-FUNCTIONS-MATRIX.md", import.meta.url), `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${functions.length} function rows; COM ${report.rows.length}/${functions.length}.`);
