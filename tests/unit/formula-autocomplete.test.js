/**
 * Test Suite: VN Sheet Formula Autocomplete & IntelliSense Tests
 * Kiểm thử độ chính xác của bộ lọc tiền tố, xếp hạng gợi ý và phân tích ngữ cảnh cú pháp tham số
 */

import {
  getFunctionSuggestions,
  parseFormulaContext,
  findEnclosingFunction,
  formatSyntaxHtml,
  FUNCTION_CATALOG
} from "../../apps/sheet/formula-engine.js";

export async function runFormulaAutocompleteTests() {
  const results = [];

  // 1. Tiền tố "AV" phải trả về AVERAGE
  const avSuggestions = getFunctionSuggestions("AV");
  results.push({
    name: "Autocomplete: Gõ 'AV' trả về AVERAGE trong danh sách gợi ý",
    pass: avSuggestions.length === 1 && avSuggestions[0].name === "AVERAGE"
  });

  // 2. Gõ hàm không tồn tại trả về danh sách rỗng
  const emptySuggestions = getFunctionSuggestions("XYZ_NOT_EXIST");
  results.push({
    name: "Autocomplete: Gõ hàm không tồn tại trả về danh sách rỗng",
    pass: Array.isArray(emptySuggestions) && emptySuggestions.length === 0
  });

  // 3. Không phân biệt chữ hoa / chữ thường
  const lowerSuggestions = getFunctionSuggestions("su");
  const upperSuggestions = getFunctionSuggestions("SU");
  const mixedSuggestions = getFunctionSuggestions("sUm");
  results.push({
    name: "Autocomplete: Không phân biệt hoa thường ('su', 'SU', 'sUm')",
    pass: lowerSuggestions.some(f => f.name === "SUM") &&
          upperSuggestions.some(f => f.name === "SUM") &&
          mixedSuggestions.some(f => f.name === "SUM")
  });

  // 4. Khớp tiền tố nhiều hàm "CO" -> CONCAT, COUNT, COUNTA
  const coSuggestions = getFunctionSuggestions("CO");
  const coNames = coSuggestions.map(f => f.name);
  results.push({
    name: "Autocomplete: Tiền tố 'CO' lọc đúng CONCAT, COUNT, COUNTA",
    pass: coNames.includes("CONCAT") &&
          coNames.includes("COUNT") &&
          coNames.includes("COUNTA") &&
          coNames.every(name => name.startsWith("CO"))
  });

  // 5. Xếp hạng: Khớp chính xác (exact match) luôn đứng đầu danh sách
  const ifSuggestions = getFunctionSuggestions("IF");
  const minSuggestions = getFunctionSuggestions("MIN");
  results.push({
    name: "Autocomplete: Khớp chính xác (exact match) luôn được xếp hạng đầu tiên",
    pass: ifSuggestions[0].name === "IF" && minSuggestions[0].name === "MIN"
  });

  // 6. Truy vấn rỗng hoặc khoảng trắng trả về rỗng an toàn
  const blankSuggestions = getFunctionSuggestions("");
  const spaceSuggestions = getFunctionSuggestions("   ");
  const nullSuggestions = getFunctionSuggestions(null);
  results.push({
    name: "Autocomplete: Truy vấn rỗng, khoảng trắng hoặc null trả về mảng rỗng an toàn",
    pass: blankSuggestions.length === 0 && spaceSuggestions.length === 0 && nullSuggestions.length === 0
  });

  // 7. Context Parser: Nhận diện tiền tố '=SU' ở chế độ autocomplete
  const ctxSu = parseFormulaContext("=SU", 3);
  results.push({
    name: "Context Parser: Nhận diện đúng '=SU' kích hoạt mode autocomplete với prefix 'SU'",
    pass: ctxSu.mode === "autocomplete" &&
          ctxSu.prefix === "SU" &&
          ctxSu.tokenStartIndex === 1 &&
          ctxSu.suggestions.some(f => f.name === "SUM")
  });

  // 8. Context Parser: Nhận diện tiền tố trong biểu thức lồng '=IF(A1 > 0, SU'
  const ctxNested = parseFormulaContext("=IF(A1 > 0, SU", 14);
  results.push({
    name: "Context Parser: Nhận diện đúng tiền tố trong biểu thức lồng '=IF(A1 > 0, SU'",
    pass: ctxNested.mode === "autocomplete" &&
          ctxNested.prefix === "SU" &&
          ctxNested.tokenStartIndex === 12
  });

  // 9. Syntax Tooltip: Mở ngoặc '=SUM(' kích hoạt mode syntax_tooltip cho tham số 0
  const ctxOpenParen = parseFormulaContext("=SUM(", 5);
  results.push({
    name: "Syntax Tooltip: Mở ngoặc '=SUM(' kích hoạt tooltip cho tham số đầu tiên (index 0)",
    pass: ctxOpenParen.mode === "syntax_tooltip" &&
          ctxOpenParen.funcName === "SUM" &&
          ctxOpenParen.activeParamIndex === 0
  });

  // 10. Syntax Tooltip: Dấu phẩy phân tách tham số '=SUM(A1, ' chuyển sang tham số 1
  const ctxComma = parseFormulaContext("=SUM(A1, ", 9);
  results.push({
    name: "Syntax Tooltip: Dấu phẩy '=SUM(A1, ' chuyển activeParamIndex sang 1",
    pass: ctxComma.mode === "syntax_tooltip" &&
          ctxComma.funcName === "SUM" &&
          ctxComma.activeParamIndex === 1
  });

  // 11. Syntax Tooltip: Đóng ngoặc '=SUM(A1, B1)' tự động tắt tooltip
  const ctxClosed = parseFormulaContext("=SUM(A1, B1)", 12);
  results.push({
    name: "Syntax Tooltip: Đóng ngoặc công thức '=SUM(A1, B1)' tự động đóng tooltip (mode null)",
    pass: ctxClosed.mode === null
  });

  // 12. Syntax Tooltip: Bỏ qua dấu phẩy trong chuỗi dấu nháy kép
  const ctxQuotes = parseFormulaContext('=IF(A1 = ",", "ok", ', 21);
  results.push({
    name: "Syntax Tooltip: Bỏ qua dấu phẩy nằm trong chuỗi nháy kép để tính đúng vị trí tham số",
    pass: ctxQuotes.mode === "syntax_tooltip" &&
          ctxQuotes.funcName === "IF" &&
          ctxQuotes.activeParamIndex === 2
  });

  // 13. Syntax Formatter: Làm đậm đúng tham số hiện tại (HTML <strong>)
  const htmlParam0 = formatSyntaxHtml("SUM(number1, [number2], ...)", 0);
  const htmlParam1 = formatSyntaxHtml("SUM(number1, [number2], ...)", 1);
  results.push({
    name: "Syntax Formatter: Làm đậm đúng tên tham số đang nhập (number1, [number2])",
    pass: htmlParam0.includes('<strong class="vno-syntax-param-active">number1</strong>') &&
          htmlParam1.includes('<strong class="vno-syntax-param-active">[number2]</strong>')
  });

  // 14. Syntax Formatter: Hỗ trợ tham số mở rộng '...' (variadic)
  const htmlVariadic = formatSyntaxHtml("SUM(number1, [number2], ...)", 4);
  results.push({
    name: "Syntax Formatter: Hỗ trợ làm đậm tham số mở rộng '...' khi index vượt quá",
    pass: htmlVariadic.includes('<strong class="vno-syntax-param-active">...</strong>')
  });

  // 15. Financial PMT có trong catalog với cú pháp tham số tiếng Việt rõ ràng.
  const pmt = FUNCTION_CATALOG.find(item => item.name === "PMT");
  results.push({
    name: "Autocomplete: PMT thuộc nhóm Tài chính và mô tả đủ rate/nper/pv/fv/type",
    pass: pmt?.category === "Tài chính" &&
          pmt.syntax === "PMT(rate, nper, pv, [fv], [type])" &&
          pmt.desc.includes("cuối kỳ") && pmt.desc.includes("đầu kỳ")
  });

  const fv = FUNCTION_CATALOG.find(item => item.name === "FV");
  results.push({
    name: "Autocomplete: FV thuộc nhóm Tài chính với cú pháp đầy đủ",
    pass: fv?.category === "Tài chính" &&
          fv.syntax === "FV(rate, nper, pmt, [pv], [type])" &&
          fv.desc.includes("giá trị tương lai")
  });

  const pv = FUNCTION_CATALOG.find(item => item.name === "PV");
  results.push({
    name: "Autocomplete: PV thuộc nhóm Tài chính với cú pháp đầy đủ",
    pass: pv?.category === "Tài chính" &&
          pv.syntax === "PV(rate, nper, pmt, [fv], [type])" &&
          pv.desc.includes("giá trị hiện tại")
  });

  const npv = FUNCTION_CATALOG.find(item => item.name === "NPV");
  results.push({
    name: "Autocomplete: NPV mô tả rõ value1 bắt đầu ở cuối kỳ đầu tiên",
    pass: npv?.category === "Tài chính" &&
          npv.syntax === "NPV(rate, value1, [value2], ...)" &&
          npv.desc.includes("cuối kỳ đầu tiên")
  });

  const irr = FUNCTION_CATALOG.find(item => item.name === "IRR");
  results.push({
    name: "Autocomplete: IRR thuộc nhóm Tài chính và nêu điều kiện đổi dấu dòng tiền",
    pass: irr?.category === "Tài chính" &&
          irr.syntax === "IRR(values, [guess])" &&
          irr.desc.includes("giá trị âm") && irr.desc.includes("giá trị dương")
  });

  const rate = FUNCTION_CATALOG.find(item => item.name === "RATE");
  results.push({
    name: "Autocomplete: RATE có đủ 6 tham số và mô tả type/guess",
    pass: rate?.category === "Tài chính" &&
          rate.syntax === "RATE(nper, pmt, pv, [fv], [type], [guess])" &&
          rate.desc.includes("guess") && rate.desc.includes("đầu kỳ")
  });

  const sln = FUNCTION_CATALOG.find(item => item.name === "SLN");
  results.push({
    name: "Autocomplete: SLN mô tả rõ ba tham số khấu hao đường thẳng",
    pass: sln?.category === "Tài chính" &&
          sln.syntax === "SLN(cost, salvage, life)" &&
          sln.desc.includes("nguyên giá") && sln.desc.includes("giá trị thu hồi")
  });

  const db = FUNCTION_CATALOG.find(item => item.name === "DB");
  results.push({
    name: "Autocomplete: DB mô tả rõ phương pháp và tham số month",
    pass: db?.category === "Tài chính" &&
          db.syntax === "DB(cost, salvage, life, period, [month])" &&
          db.desc.includes("số dư giảm dần") && db.desc.includes("mặc định 12")
  });

  const nper = FUNCTION_CATALOG.find(item => item.name === "NPER");
  results.push({
    name: "Autocomplete: NPER mô tả số kỳ và đủ tham số fv/type",
    pass: nper?.category === "Tài chính" &&
          nper.syntax === "NPER(rate, pmt, pv, [fv], [type])" &&
          nper.desc.includes("số kỳ") && nper.desc.includes("đầu kỳ")
  });

  const ipmt = FUNCTION_CATALOG.find(item => item.name === "IPMT");
  results.push({
    name: "Autocomplete: IPMT mô tả phần lãi, kỳ per và đủ tham số tùy chọn",
    pass: ipmt?.category === "Tài chính" &&
          ipmt.syntax === "IPMT(rate, per, nper, pv, [fv], [type])" &&
          ipmt.desc.includes("tiền lãi") && ipmt.desc.includes("1 đến nper")
  });

  const ppmt = FUNCTION_CATALOG.find(item => item.name === "PPMT");
  results.push({
    name: "Autocomplete: PPMT mô tả phần gốc, kỳ per và đủ tham số tùy chọn",
    pass: ppmt?.category === "Tài chính" &&
          ppmt.syntax === "PPMT(rate, per, nper, pv, [fv], [type])" &&
          ppmt.desc.includes("tiền gốc") && ppmt.desc.includes("1 đến nper")
  });

  return results;
}
