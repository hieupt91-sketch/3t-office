import { readFile, writeFile } from "node:fs/promises";
import { EXTENDED_FUNCTION_CATALOG, FormulaEngine } from "../../apps/sheet/formula-engine.js";

const matrixCatalog = JSON.parse(await readFile(new URL("../../docs/EXCEL2016-FUNCTION-CATALOG.json", import.meta.url), "utf8"));
const appCatalog = new Map(EXTENDED_FUNCTION_CATALOG.map(item => [item.name, item]));
const report = JSON.parse(await readFile(new URL("../../docs/EXCEL2016-FUNCTIONS-COM-RESULTS.json", import.meta.url), "utf8"));
const resultByName = new Map(report.rows.map(row => [row.name, row]));
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
const unrun = functions.filter(item => !resultByName.has(item.name));
const laterNames = new Set(later.map(item => item.name));
const notComparableNames = new Set(["TRANSPOSE"]);
const comparable = report.rows.filter(row => row.match !== null && row.name !== "VND" && !laterNames.has(row.name) && !notComparableNames.has(row.name));
const matched = comparable.filter(row => row.match === true);
const mismatched = comparable.filter(row => row.match === false);
const lines = [
  "# Ma trận hàm VN Sheet đối chiếu Excel 2016",
  "",
  `Ngày chạy: 2026-10-13. Oracle: Excel ${report.excelVersion}; VN Sheet ghi một XLSX; Excel COM mở ReadOnly, gọi CalculateFullRebuild trong bộ nhớ và không lưu workbook.`,
  "",
  `Danh mục nguồn Microsoft có ${matrixCatalog.functions.length} hàm duy nhất; ${standards.length} được đánh dấu dùng được trong Excel 2016 và ${later.length} có mốc sau 2016. Danh sách: [Microsoft Excel functions by category](https://support.microsoft.com/en-us/excel/excel-functions-by-category).`,
  `VN Sheet hiện có ${EXTENDED_FUNCTION_CATALOG.length} mục gợi ý hàm (bao gồm hàm riêng VND); ${report.rows.length} hàm đã nhập qua desktop/CDP và đọc lại từ Excel trong lượt này.`,
  "",
  "## Kết quả lượt COM",
  "",
  "| Chỉ số | Kết quả |",
  "|---|---:|",
  `| Hàm đã nhập và đọc qua Excel COM | ${report.rows.length} |`,
  `| Ca scalar có thể so sánh | ${comparable.length} |`,
  `| Khớp | ${matched.length} |`,
  `| Lệch cần xử lý | ${mismatched.length} |`,
  `| Hậu Excel 2016 | ${later.length} |`,
  `| Chưa chạy COM trong ma trận nguồn | ${unrun.length} |`,
  "",
  "`MATCH` chỉ ghi khi giá trị khớp; hậu Excel 2016 và TRANSPOSE scalar không được tính là mismatch E1. Mỗi hàng đã chạy COM chỉ có một ca tham số đại diện; các kiểu dữ liệu/biên khác được đánh dấu riêng bên dưới.",
  "",
  "## Ma trận theo hàm",
  "",
  "| Hàm | Nhóm | Phiên bản | Có trong danh mục VN | Gọi rỗng trong FormulaEngine | Ca COM | Rỗng | Lỗi | Kiểu trộn | Cả cột | Mảng | VN Sheet | Excel 2016 | Kết quả |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"
];

for (const category of categories) {
  lines.push("", `### ${category}`, "");
  for (const item of functions.filter(entry => entry.category === category)) {
    const appItem = appCatalog.get(item.name);
    const row = resultByName.get(item.name);
    const emptyValue = String(engine.evaluate(`=${item.name}()`)).replaceAll("|", "\\|").replaceAll("\n", " ");
    const version = item.year === "VN" ? "Hàm VN" : item.excel2016 ? "Excel 2016" : `Sau Excel 2016 (${item.year})`;
    const listed = appItem ? "Có" : "Không";
    let formula = "—";
    let appValue = "—";
    let excelValue = "—";
    let status = row ? (row.match === null ? "VOLATILE: không so sánh" : laterNames.has(item.name) ? "Ngoài Excel 2016" : notComparableNames.has(item.name) ? "Scalar không tương đương CSE" : row.match ? "MATCH" : item.excel2016 ? "MISMATCH" : "Ngoài chuẩn E1") : "NOT RUN";
    if (row) {
      formula = `\`${String(row.formula).replaceAll("|", "\\|")}\``;
      appValue = `\`${String(row.appValue).replaceAll("|", "\\|")}\``;
      excelValue = `\`${String(row.excelText ?? row.excelValue).replaceAll("|", "\\|")}\``;
    }
    if (!row && /#NAME\?/i.test(emptyValue)) status = appItem ? "Có metadata; COM NOT RUN" : "Chưa nhận dạng; COM NOT RUN";
    const caseStatus = "NOT RUN";
    lines.push(`| ${item.name} | ${item.category} | ${version} | ${listed} | \`${emptyValue}\` | ${formula} | ${caseStatus} | ${caseStatus} | ${caseStatus} | ${caseStatus} | ${caseStatus} | ${appValue} | ${excelValue} | ${status} |`);
  }
}

lines.push(
  "",
  "## Sai lệch đã xác nhận",
  "",
  ...mismatched.map(row => `- **${row.name}** \`${row.formula}\`: VN Sheet=${row.appValue}; Excel=${row.excelText}.`),
  mismatched.length ? "" : "- Chưa có sai lệch trong các ca COM thuộc Excel 2016.",
  "## Phạm vi chưa hoàn tất",
  "",
  `- Còn ${unrun.length} hàm trong danh mục nguồn chưa có ca COM.`,
  "- Nhiều ca dùng cách gọi rỗng để kiểm tra nhận dạng; các hàm cần đối số, vùng dữ liệu, workbook ngoài hoặc mảng vẫn cần ca có đối số tương ứng.",
  "- Các hàm dynamic array mới hơn Excel 2016 được liệt kê để phân biệt, không chấm là lệch E1.",
  "- Hàm riêng VND không thuộc danh mục Excel và không gửi vào workbook oracle."
);

await writeFile(new URL("../../docs/EXCEL2016-FUNCTIONS-MATRIX.md", import.meta.url), `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${functions.length} function rows; COM ${report.rows.length}/${functions.length}.`);
