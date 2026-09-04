/**
 * VN Sheet — Enterprise Spreadsheet Formula Calculation Engine
 * Tương thích 100% cú pháp và hàm tính toán Microsoft Excel & LibreOffice Calc (sc)
 */

export const FUNCTION_CATALOG = [
  // Toán học & Lượng giác
  { name: "SUM", category: "Toán học", syntax: "SUM(number1, [number2], ...)", desc: "Tính tổng tất cả các số trong một phạm vi ô được chọn." },
  { name: "PRODUCT", category: "Toán học", syntax: "PRODUCT(number1, [number2], ...)", desc: "Nhân tất cả các số được cung cấp làm đối số và trả về tích." },
  { name: "ROUND", category: "Toán học", syntax: "ROUND(number, num_digits)", desc: "Làm tròn một số đến số lượng chữ số thập phân đã định trước." },
  { name: "ABS", category: "Toán học", syntax: "ABS(number)", desc: "Trả về giá trị tuyệt đối của một số." },
  { name: "INT", category: "Toán học", syntax: "INT(number)", desc: "Làm tròn một số xuống số nguyên gần nhất." },
  { name: "MOD", category: "Toán học", syntax: "MOD(number, divisor)", desc: "Trả về số dư sau khi chia một số cho một số chia." },
  { name: "SUMPRODUCT", category: "Toán học", syntax: "SUMPRODUCT(array1, [array2], ...)", desc: "Nhân các phần tử tương ứng trong các vùng rồi tính tổng các tích." },
  { name: "SQRT", category: "Toán học", syntax: "SQRT(number)", desc: "Trả về căn bậc hai dương của một số." },
  { name: "POWER", category: "Toán học", syntax: "POWER(number, power)", desc: "Nâng một số lên lũy thừa đã cho." },
  { name: "ROUNDUP", category: "Toán học", syntax: "ROUNDUP(number, num_digits)", desc: "Làm tròn một số ra xa số không đến số chữ số chỉ định." },
  { name: "ROUNDDOWN", category: "Toán học", syntax: "ROUNDDOWN(number, num_digits)", desc: "Làm tròn một số về phía số không đến số chữ số chỉ định." },
  { name: "CEILING", category: "Toán học", syntax: "CEILING(number, significance)", desc: "Làm tròn một số lên bội số gần nhất của mức chính xác." },
  { name: "FLOOR", category: "Toán học", syntax: "FLOOR(number, significance)", desc: "Làm tròn một số xuống bội số gần nhất của mức chính xác." },
  { name: "TRUNC", category: "Toán học", syntax: "TRUNC(number, [num_digits])", desc: "Cắt bớt phần thập phân của một số đến số chữ số chỉ định." },
  { name: "SIGN", category: "Toán học", syntax: "SIGN(number)", desc: "Trả về dấu của một số: -1, 0 hoặc 1." },

  // Thống kê
  { name: "AVERAGE", category: "Thống kê", syntax: "AVERAGE(number1, [number2], ...)", desc: "Tính giá trị trung bình cộng của các đối số." },
  { name: "COUNT", category: "Thống kê", syntax: "COUNT(value1, [value2], ...)", desc: "Đếm số lượng các ô chứa giá trị số." },
  { name: "COUNTA", category: "Thống kê", syntax: "COUNTA(value1, [value2], ...)", desc: "Đếm số lượng ô không rỗng (chứa bất kỳ dữ liệu nào)." },
  { name: "MIN", category: "Thống kê", syntax: "MIN(number1, [number2], ...)", desc: "Trả về số nhỏ nhất trong một tập hợp các giá trị." },
  { name: "MAX", category: "Thống kê", syntax: "MAX(number1, [number2], ...)", desc: "Trả về số lớn nhất trong một tập hợp các giá trị." },
  { name: "COUNTIF", category: "Thống kê", syntax: "COUNTIF(range, criteria)", desc: "Đếm các ô thỏa một điều kiện." },
  { name: "SUMIF", category: "Thống kê", syntax: "SUMIF(range, criteria, [sum_range])", desc: "Tính tổng các ô tương ứng thỏa một điều kiện." },
  { name: "COUNTIFS", category: "Thống kê", syntax: "COUNTIFS(range1, criteria1, [range2, criteria2], ...)", desc: "Đếm các hàng thỏa đồng thời nhiều điều kiện." },
  { name: "SUMIFS", category: "Thống kê", syntax: "SUMIFS(sum_range, range1, criteria1, [range2, criteria2], ...)", desc: "Tính tổng các hàng thỏa đồng thời nhiều điều kiện." },
  { name: "AVERAGEIF", category: "Thống kê", syntax: "AVERAGEIF(range, criteria, [average_range])", desc: "Tính trung bình các ô tương ứng thỏa một điều kiện." },
  { name: "AVERAGEIFS", category: "Thống kê", syntax: "AVERAGEIFS(average_range, criteria_range1, criteria1, ...)", desc: "Tính trung bình các ô thỏa đồng thời nhiều điều kiện." },
  { name: "MEDIAN", category: "Thống kê", syntax: "MEDIAN(number1, [number2], ...)", desc: "Trả về trung vị của tập hợp số." },
  { name: "RANK", category: "Thống kê", syntax: "RANK(number, ref, [order])", desc: "Trả về thứ hạng của một số trong danh sách." },
  { name: "RANK.EQ", category: "Thống kê", syntax: "RANK.EQ(number, ref, [order])", desc: "Trả về thứ hạng bằng nhau của một số trong danh sách." },
  { name: "LARGE", category: "Thống kê", syntax: "LARGE(array, k)", desc: "Trả về giá trị lớn thứ k trong tập dữ liệu." },
  { name: "SMALL", category: "Thống kê", syntax: "SMALL(array, k)", desc: "Trả về giá trị nhỏ thứ k trong tập dữ liệu." },
  { name: "COUNTBLANK", category: "Thống kê", syntax: "COUNTBLANK(range)", desc: "Đếm số ô trống trong một vùng." },
  { name: "STDEV", category: "Thống kê", syntax: "STDEV(number1, [number2], ...)", desc: "Ước tính độ lệch chuẩn mẫu từ các đối số." },
  { name: "VAR", category: "Thống kê", syntax: "VAR(number1, [number2], ...)", desc: "Ước tính phương sai mẫu từ các đối số." },

  // Tra cứu & tham chiếu
  { name: "VLOOKUP", category: "Tra cứu", syntax: "VLOOKUP(lookup_value, table_array, col_index, [range_lookup])", desc: "Tra theo cột đầu của bảng và trả về giá trị ở cột chỉ định." },
  { name: "HLOOKUP", category: "Tra cứu", syntax: "HLOOKUP(lookup_value, table_array, row_index, [range_lookup])", desc: "Tra theo hàng đầu của bảng và trả về giá trị ở hàng chỉ định." },
  { name: "INDEX", category: "Tra cứu", syntax: "INDEX(array, row_num, [col_num])", desc: "Trả về giá trị tại hàng và cột trong vùng." },
  { name: "MATCH", category: "Tra cứu", syntax: "MATCH(lookup_value, lookup_array, [match_type])", desc: "Trả về vị trí tương đối của giá trị trong vùng." },
  { name: "XLOOKUP", category: "Tra cứu", syntax: "XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode])", desc: "Tra cứu một giá trị trong một vùng và trả về giá trị tương ứng từ vùng khác." },
  { name: "LOOKUP", category: "Tra cứu", syntax: "LOOKUP(lookup_value, lookup_vector, [result_vector])", desc: "Tra cứu gần đúng trong một hàng hoặc cột đã sắp xếp." },
  { name: "CHOOSE", category: "Tra cứu", syntax: "CHOOSE(index_num, value1, [value2], ...)", desc: "Chọn một giá trị từ danh sách theo số thứ tự." },
  { name: "INDIRECT", category: "Tra cứu", syntax: "INDIRECT(ref_text)", desc: "Trả về giá trị của tham chiếu được tạo từ chuỗi văn bản." },
  { name: "OFFSET", category: "Tra cứu", syntax: "OFFSET(reference, rows, cols, [height], [width])", desc: "Trả về giá trị hoặc vùng được dịch chuyển từ một tham chiếu ban đầu." },

  // Logic
  { name: "IF", category: "Logic", syntax: "IF(logical_test, value_if_true, [value_if_false])", desc: "Kiểm tra điều kiện và trả về giá trị thứ nhất nếu đúng, thứ hai nếu sai." },
  { name: "AND", category: "Logic", syntax: "AND(logical1, [logical2], ...)", desc: "Trả về TRUE nếu tất cả các đối số là TRUE." },
  { name: "OR", category: "Logic", syntax: "OR(logical1, [logical2], ...)", desc: "Trả về TRUE nếu bất kỳ đối số nào là TRUE." },
  { name: "NOT", category: "Logic", syntax: "NOT(logical)", desc: "Đảo ngược giá trị logic của đối số." },
  { name: "IFERROR", category: "Logic", syntax: "IFERROR(value, value_if_error)", desc: "Trả về giá trị thay thế khi biểu thức tạo ra bất kỳ lỗi nào." },
  { name: "IFNA", category: "Logic", syntax: "IFNA(value, value_if_na)", desc: "Trả về giá trị thay thế khi biểu thức tạo ra lỗi #N/A." },
  { name: "ISBLANK", category: "Logic", syntax: "ISBLANK(value)", desc: "Kiểm tra giá trị có phải là ô trống hay không." },
  { name: "ISNUMBER", category: "Logic", syntax: "ISNUMBER(value)", desc: "Kiểm tra giá trị có phải là số hay không." },
  { name: "ISTEXT", category: "Logic", syntax: "ISTEXT(value)", desc: "Kiểm tra giá trị có phải là văn bản hay không." },
  { name: "ISERROR", category: "Logic", syntax: "ISERROR(value)", desc: "Kiểm tra giá trị có phải là mã lỗi hay không." },
  { name: "ISNA", category: "Logic", syntax: "ISNA(value)", desc: "Kiểm tra giá trị có phải là lỗi #N/A hay không." },

  // Văn bản (Text)
  { name: "CONCAT", category: "Văn bản", syntax: "CONCAT(text1, [text2], ...)", desc: "Nối hai hoặc nhiều chuỗi văn bản thành một chuỗi duy nhất." },
  { name: "UPPER", category: "Văn bản", syntax: "UPPER(text)", desc: "Chuyển đổi toàn bộ văn bản thành chữ in hoa." },
  { name: "LOWER", category: "Văn bản", syntax: "LOWER(text)", desc: "Chuyển đổi toàn bộ văn bản thành chữ in thường." },
  { name: "LEN", category: "Văn bản", syntax: "LEN(text)", desc: "Trả về số lượng ký tự trong một chuỗi văn bản." },
  { name: "TRIM", category: "Văn bản", syntax: "TRIM(text)", desc: "Xóa bỏ tất cả các khoảng trắng thừa giữa các từ trong chuỗi." },
  { name: "LEFT", category: "Văn bản", syntax: "LEFT(text, [num_chars])", desc: "Lấy số lượng ký tự đầu tiên từ bên trái chuỗi văn bản." },
  { name: "RIGHT", category: "Văn bản", syntax: "RIGHT(text, [num_chars])", desc: "Lấy số lượng ký tự cuối cùng từ bên phải chuỗi văn bản." },
  { name: "TEXT", category: "Văn bản", syntax: "TEXT(value, format_text)", desc: "Định dạng số hoặc ngày thành văn bản." },
  { name: "CONCATENATE", category: "Văn bản", syntax: "CONCATENATE(text1, [text2], ...)", desc: "Nối nhiều chuỗi văn bản." },
  { name: "SUBSTITUTE", category: "Văn bản", syntax: "SUBSTITUTE(text, old_text, new_text, [instance_num])", desc: "Thay thế chuỗi con trong văn bản." },
  { name: "FIND", category: "Văn bản", syntax: "FIND(find_text, within_text, [start_num])", desc: "Tìm chuỗi con có phân biệt hoa thường." },
  { name: "MID", category: "Văn bản", syntax: "MID(text, start_num, num_chars)", desc: "Trả về số ký tự chỉ định từ giữa chuỗi văn bản." },
  { name: "VALUE", category: "Văn bản", syntax: "VALUE(text)", desc: "Chuyển đổi chuỗi biểu diễn số thành giá trị số." },
  { name: "PROPER", category: "Văn bản", syntax: "PROPER(text)", desc: "Viết hoa chữ cái đầu của mỗi từ trong văn bản." },
  { name: "TEXTJOIN", category: "Văn bản", syntax: "TEXTJOIN(delimiter, ignore_empty, text1, ...)", desc: "Nối các chuỗi bằng dấu phân cách và có thể bỏ qua ô trống." },
  { name: "REPT", category: "Văn bản", syntax: "REPT(text, number_times)", desc: "Lặp lại văn bản theo số lần chỉ định." },
  { name: "EXACT", category: "Văn bản", syntax: "EXACT(text1, text2)", desc: "So sánh chính xác hai chuỗi có phân biệt chữ hoa và chữ thường." },
  { name: "SEARCH", category: "Văn bản", syntax: "SEARCH(find_text, within_text, [start_num])", desc: "Tìm chuỗi con không phân biệt chữ hoa và chữ thường." },

  // Ngày tháng
  { name: "TODAY", category: "Ngày tháng", syntax: "TODAY()", desc: "Trả về ngày hiện tại của hệ thống." },
  { name: "NOW", category: "Ngày tháng", syntax: "NOW()", desc: "Trả về ngày và giờ hiện tại của hệ thống." },
  { name: "YEAR", category: "Ngày tháng", syntax: "YEAR(date)", desc: "Trả về năm tương ứng của một ngày cụ thể." },
  { name: "MONTH", category: "Ngày tháng", syntax: "MONTH(date)", desc: "Trả về tháng trong năm (từ 1 đến 12)." },
  { name: "DAY", category: "Ngày tháng", syntax: "DAY(date)", desc: "Trả về ngày trong tháng (từ 1 đến 31)." }
  ,{ name: "DATE", category: "Ngày tháng", syntax: "DATE(year, month, day)", desc: "Tạo một ngày từ năm, tháng và ngày." }
  ,{ name: "DATEDIF", category: "Ngày tháng", syntax: "DATEDIF(start_date, end_date, unit)", desc: "Tính số ngày, tháng hoặc năm trọn vẹn giữa hai ngày." }
  ,{ name: "EDATE", category: "Ngày tháng", syntax: "EDATE(start_date, months)", desc: "Cộng hoặc trừ số tháng vào một ngày." }
  ,{ name: "WEEKDAY", category: "Ngày tháng", syntax: "WEEKDAY(date, [return_type])", desc: "Trả về số thứ tự của ngày trong tuần theo kiểu đánh số chỉ định." }
  ,{ name: "NETWORKDAYS", category: "Ngày tháng", syntax: "NETWORKDAYS(start_date, end_date, [holidays])", desc: "Đếm số ngày làm việc giữa hai ngày, loại trừ cuối tuần và ngày nghỉ." }
  ,{ name: "WORKDAY", category: "Ngày tháng", syntax: "WORKDAY(start_date, days, [holidays])", desc: "Trả về ngày làm việc trước hoặc sau một số ngày làm việc chỉ định." }
  ,{ name: "EOMONTH", category: "Ngày tháng", syntax: "EOMONTH(start_date, months)", desc: "Trả về ngày cuối tháng trước hoặc sau số tháng chỉ định." }
  ,{ name: "DAYS", category: "Ngày tháng", syntax: "DAYS(end_date, start_date)", desc: "Trả về số ngày giữa ngày kết thúc và ngày bắt đầu." }

  // Tài chính
  ,{ name: "PMT", category: "Tài chính", syntax: "PMT(rate, nper, pv, [fv], [type])", desc: "Tính khoản thanh toán định kỳ với lãi suất cố định; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "FV", category: "Tài chính", syntax: "FV(rate, nper, pmt, [pv], [type])", desc: "Tính giá trị tương lai của khoản đầu tư; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "PV", category: "Tài chính", syntax: "PV(rate, nper, pmt, [fv], [type])", desc: "Tính giá trị hiện tại của khoản đầu tư hoặc chuỗi thanh toán; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "NPV", category: "Tài chính", syntax: "NPV(rate, value1, [value2], ...)", desc: "Tính giá trị hiện tại ròng của chuỗi dòng tiền đều kỳ; value1 được chiết khấu từ cuối kỳ đầu tiên." }
  ,{ name: "IRR", category: "Tài chính", syntax: "IRR(values, [guess])", desc: "Tính tỷ suất hoàn vốn nội bộ của chuỗi dòng tiền có ít nhất một giá trị âm và một giá trị dương." }
  ,{ name: "RATE", category: "Tài chính", syntax: "RATE(nper, pmt, pv, [fv], [type], [guess])", desc: "Tính lãi suất mỗi kỳ của niên kim; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ), guess là giá trị dự đoán ban đầu." }
  ,{ name: "NPER", category: "Tài chính", syntax: "NPER(rate, pmt, pv, [fv], [type])", desc: "Tính số kỳ cần thiết để hoàn tất khoản vay hoặc đạt mục tiêu đầu tư với khoản thanh toán cố định; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "IPMT", category: "Tài chính", syntax: "IPMT(rate, per, nper, pv, [fv], [type])", desc: "Tính phần tiền lãi trong khoản thanh toán tại kỳ per; per phải từ 1 đến nper, type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "PPMT", category: "Tài chính", syntax: "PPMT(rate, per, nper, pv, [fv], [type])", desc: "Tính phần tiền gốc trong khoản thanh toán tại kỳ per; per phải từ 1 đến nper, type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "SLN", category: "Tài chính", syntax: "SLN(cost, salvage, life)", desc: "Tính khấu hao đường thẳng mỗi kỳ từ nguyên giá, giá trị thu hồi và thời gian sử dụng." }
  ,{ name: "DB", category: "Tài chính", syntax: "DB(cost, salvage, life, period, [month])", desc: "Tính khấu hao theo số dư giảm dần cố định; month là số tháng trong năm đầu tiên (mặc định 12)." }
];

export class FormulaEngine {
  /**
   * @param {Map<string, {val: string, formula: string, style: Object}> | (() => Map<string, any>)} cellsData
   */
  constructor(cellsData, namedRangeResolver = null, sheetResolver = null, currentSheetResolver = null, sheetNamesResolver = null) {
    this.cellsData = cellsData;
    this.namedRangeResolver = namedRangeResolver;
    this.sheetResolver = sheetResolver;
    this.currentSheetResolver = currentSheetResolver;
    this.sheetNamesResolver = sheetNamesResolver;
  }

  setCellsData(cellsData) {
    this.cellsData = cellsData;
  }

  get cellsMap() {
    return typeof this.cellsData === "function" ? this.cellsData() : this.cellsData;
  }

  /**
   * Trích xuất giá trị số hoặc chuỗi từ một ô
   */
  getCellValue(coord, sheetName = null) {
    const map = sheetName && typeof this.sheetResolver === "function" ? this.sheetResolver(sheetName) : this.cellsMap;
    if (sheetName && !map) return "#REF!";
    const item = map ? map.get(coord.toUpperCase()) : null;
    if (!item) return 0;
    const raw = item.val || "";

    // Giữ nguyên chuỗi ngày để các hàm ngày tháng có thể phân tích, không coi dấu "/" là ký hiệu tiền tệ.
    if (/^\d{1,2}\/\d{1,2}\/\d{4}(?:\s|$)/.test(String(raw).trim())) return raw;

    // Ô định dạng Text: giữ nguyên chuỗi thô, không cho tính toán số học
    if (item.style?.numberFormat?.category === "text") {
      const textVal = new String(raw);
      textVal.isTextCell = true;
      return textVal;
    }

    // Xử lý chuỗi tiền tệ VNĐ (vd: "25.000.000 ₫" -> loại bỏ dấu chấm hàng nghìn -> 25000000)
    const cleaned = raw.toString().replace(/\./g, "").replace(/[^\d-]/g, "");
    if (cleaned && !isNaN(Number(cleaned))) {
      return Number(cleaned);
    }
    return raw;
  }

  expandRange(rangeStr) {
    const parts = rangeStr.toUpperCase().split(":");
    if (parts.length === 1) return [parts[0].trim()];

    const start = parts[0].trim();
    const end = parts[1].trim();

    const startCol = start.match(/[A-Z]+/)[0];
    const startRow = parseInt(start.match(/\d+/)[0], 10);
    const endCol = end.match(/[A-Z]+/)[0];
    const endRow = parseInt(end.match(/\d+/)[0], 10);

    const cols = [];
    const minColChar = Math.min(startCol.charCodeAt(0), endCol.charCodeAt(0));
    const maxColChar = Math.max(startCol.charCodeAt(0), endCol.charCodeAt(0));
    for (let c = minColChar; c <= maxColChar; c++) {
      cols.push(String.fromCharCode(c));
    }

    const minRow = Math.min(startRow, endRow);
    const maxRow = Math.max(startRow, endRow);

    const result = [];
    for (let r = minRow; r <= maxRow; r++) {
      for (const col of cols) {
        result.push(`${col}${r}`);
      }
    }
    return result;
  }

  _isError(value) {
    return typeof value === "string" && /^#(?:N\/A|VALUE!|REF!|DIV\/0!|NUM!|NAME\?|LỖI!)/.test(value);
  }

  _sheetNames() {
    return typeof this.sheetNamesResolver === "function" ? this.sheetNamesResolver() : [];
  }

  _maxUsedRow(sheet = null) {
    const map = sheet && typeof this.sheetResolver === "function" ? this.sheetResolver(sheet) : this.cellsMap;
    let max = 1;
    for (const coord of map?.keys?.() || []) {
      const match = String(coord).match(/\d+$/);
      if (match) max = Math.max(max, Number(match[0]));
    }
    return max;
  }

  _referenceValues(referenceText) {
    const reference = this._parseReference(referenceText);
    if (reference.error) return [reference.error];
    if (reference.sheets) {
      const values = [];
      for (const sheet of reference.sheets) {
        for (const coord of this.expandRange(reference.ref)) values.push(this.getCellValue(coord, sheet));
      }
      return values;
    }
    const column = reference.ref.match(/^([A-Z]+):([A-Z]+)$/);
    const ref = column ? `${column[1]}1:${column[2]}${this._maxUsedRow(reference.sheet)}` : reference.ref;
    return this.expandRange(ref).map(coord => this.getCellValue(coord, reference.sheet));
  }

  collectValues(args) {
    const values = [];
    for (const arg of args) {
      if (typeof arg === "string" && arg.startsWith('"') && arg.endsWith('"')) {
        values.push(arg.slice(1, -1));
      } else if (typeof arg === "string" && /^[A-Z_.]+\s*\(.*\)$/i.test(arg)) {
        const resolved = this._resolveSingleValue(arg);
        if (Array.isArray(resolved)) values.push(...resolved);
        else values.push(resolved);
      } else if (typeof arg === "string" && (arg.includes(":") || arg.includes("!") || this._resolveNamedRange(arg))) {
        values.push(...this._referenceValues(arg));
      } else if (typeof arg === "string" && /^[A-Z]+\d+$/i.test(arg.trim())) {
        values.push(this.getCellValue(arg.trim()));
      } else {
        values.push(arg);
      }
    }
    return values;
  }

  collectNumericValues(args) {
    return this.collectValues(args)
      .filter(v => !(v && v.isTextCell))
      .map(v => typeof v === "number" ? v : Number(v.toString().replace(/[^\d.-]/g, "")))
      .filter(v => !isNaN(v));
  }

  _rangeValues(range) {
    return this._referenceValues(range);
  }

  _rangeMatrix(range) {
    const reference = this._parseReference(range);
    if (reference.error) return [[reference.error]];
    const column = reference.ref.match(/^([A-Z]+):([A-Z]+)$/);
    const normalizedRef = column ? `${column[1]}1:${column[2]}${this._maxUsedRow(reference.sheet)}` : reference.ref;
    const match = normalizedRef.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
    if (!match) return [[this._resolveSingleValue(range)]];
    const [, startCol, startRowText, endCol, endRowText] = match;
    const startColIndex = this._columnIndex(startCol);
    const endColIndex = this._columnIndex(endCol);
    const rows = [];
    for (let row = Math.min(+startRowText, +endRowText); row <= Math.max(+startRowText, +endRowText); row++) {
      const values = [];
      for (let col = Math.min(startColIndex, endColIndex); col <= Math.max(startColIndex, endColIndex); col++) {
        values.push(this.getCellValue(`${this._columnName(col)}${row}`, reference.sheet));
      }
      rows.push(values);
    }
    return rows;
  }

  _columnIndex(name) {
    return [...name].reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
  }

  _columnName(index) {
    let value = index + 1;
    let name = "";
    while (value > 0) {
      value--;
      name = String.fromCharCode(65 + value % 26) + name;
      value = Math.floor(value / 26);
    }
    return name;
  }

  _resolveNamedRange(name) {
    if (typeof this.namedRangeResolver !== "function") return null;
    return this.namedRangeResolver(String(name).trim()) || null;
  }

  _resolveRangeReference(reference) {
    const raw = String(reference).trim();
    const named = this._resolveNamedRange(raw);
    return String(named?.ref || named || raw).replace(/\$/g, "").toUpperCase();
  }

  _parseReference(reference) {
    const raw = String(reference).trim();
    const named = this._resolveNamedRange(raw);
    if (named) {
      const sheet = named.sheet || (typeof this.currentSheetResolver === "function" ? this.currentSheetResolver() : null);
      if (sheet && typeof this.sheetResolver === "function" && !this.sheetResolver(sheet)) return { error: "#REF!" };
      return { sheet, ref: String(named.ref || named).replace(/\$/g, "").toUpperCase() };
    }
    const threeD = raw.match(/^(?:'((?:[^']|'')+)'|([^':!]+))\s*:\s*(?:'((?:[^']|'')+)'|([^'!]+))!\s*(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)$/i);
    if (threeD) {
      const first = (threeD[1] ? threeD[1].replace(/''/g, "'") : threeD[2]).trim();
      const last = (threeD[3] ? threeD[3].replace(/''/g, "'") : threeD[4]).trim();
      const names = this._sheetNames();
      const start = names.indexOf(first);
      const end = names.indexOf(last);
      if (start < 0 || end < 0) return { error: "#REF!" };
      return { sheets: names.slice(Math.min(start, end), Math.max(start, end) + 1), ref: threeD[5].replace(/\$/g, "").toUpperCase() };
    }
    const match = raw.match(/^(?:'((?:[^']|'')+)'|([^'!]+))!\s*(\$?[A-Z]+(?::\$?[A-Z]+)|\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)$/i);
    if (match) {
      const sheet = (match[1] ? match[1].replace(/''/g, "'") : match[2]).trim();
      if (typeof this.sheetResolver !== "function" || !this.sheetResolver(sheet)) return { error: "#REF!" };
      return { sheet, ref: match[3].replace(/\$/g, "").toUpperCase() };
    }
    return { sheet: null, ref: this._resolveRangeReference(raw) };
  }

  _compareValues(left, right) {
    if (typeof left === "number" && typeof right === "number") return left - right;
    return String(left).localeCompare(String(right), undefined, { sensitivity: "accent", numeric: true });
  }

  _equals(left, right) {
    if (typeof left === "number" || typeof right === "number") {
      const a = Number(left);
      const b = Number(right);
      if (!Number.isNaN(a) && !Number.isNaN(b)) return a === b;
    }
    return String(left).toLocaleLowerCase() === String(right).toLocaleLowerCase();
  }

  _matchesCriteria(value, rawCriteria) {
    const criteria = this._resolveSingleValue(rawCriteria);
    if (typeof criteria === "number" || typeof criteria === "boolean") return this._equals(value, criteria);
    const text = String(criteria);
    const match = text.match(/^(<=|>=|<>|!=|=|<|>)(.*)$/);
    if (match) {
      const rightText = match[2];
      const numericRight = Number(rightText);
      const right = rightText.trim() !== "" && !Number.isNaN(numericRight) ? numericRight : rightText;
      const comparison = this._compareValues(value, right);
      if (match[1] === "<") return comparison < 0;
      if (match[1] === ">") return comparison > 0;
      if (match[1] === "<=") return comparison <= 0;
      if (match[1] === ">=") return comparison >= 0;
      if (match[1] === "<>" || match[1] === "!=") return !this._equals(value, right);
      return this._equals(value, right);
    }
    if (text.includes("*") || text.includes("?")) {
      const escaped = text.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
      return new RegExp(`^${escaped}$`, "i").test(String(value));
    }
    return this._equals(value, text);
  }

  /**
   * Tính toán biểu thức công thức (bắt đầu bằng dấu =)
   * @param {string} formula
   * @returns {string|number}
   */
  evaluate(formula) {
    if (!formula || !formula.startsWith("=")) return formula;
    const expr = formula.substring(1).trim();

    try {
      // 1. Phân tích hàm có tên: TÊN_HÀM(đối số...)
      const funcMatch = expr.match(/^([A-Z_.]+)\s*\((.*)\)$/i);
      if (funcMatch) {
        const funcName = funcMatch[1].toUpperCase();
        const rawArgs = this._splitArgs(funcMatch[2]);
        return this._executeFunction(funcName, rawArgs);
      }

      // 2. Biểu thức toán học số học thông thường: =A1 + B2 * 3
      return this._evaluateArithmetic(expr);
    } catch (err) {
      console.warn("[FormulaEngine] Lỗi tính toán:", formula, err);
      return "#LỖI!";
    }
  }

  evaluateArray(formula) {
    if (!formula || !formula.startsWith("=")) return [formula];
    const expr = formula.slice(1).trim();
    const funcMatch = expr.match(/^SUM\s*\((.*)\)$/i);
    if (funcMatch) {
      const value = this._evaluateArrayArithmetic(funcMatch[1]);
      return Array.isArray(value) ? value.reduce((sum, item) => sum + (Number(item) || 0), 0) : value;
    }
    return this._evaluateArrayArithmetic(expr);
  }

  _evaluateArrayArithmetic(expr) {
    const match = expr.match(/^\s*((?:'[^']*(?:''[^']*)*'|[^\s!+\-*/]+)!\s*)?[A-Z]+\d+:[A-Z]+\d+\s*([+\-*/])\s*(.*?)\s*$/i);
    if (!match) return this.evaluate(`=${expr}`);
    const leftText = expr.slice(0, expr.indexOf(match[2])).trim();
    const rightText = match[3].trim();
    const left = this._rangeValues(leftText);
    const rightRef = /^(?:(?:'[^']+'|[^!]+)!)?[A-Z]+\d+:[A-Z]+\d+$/i.test(rightText);
    const right = rightRef ? this._rangeValues(rightText) : [this._resolveSingleValue(rightText)];
    if (left.includes("#REF!") || right.includes("#REF!")) return "#REF!";
    if (rightRef && left.length !== right.length) return "#VALUE!";
    return left.map((value, index) => {
      const a = Number(value) || 0;
      const b = Number(rightRef ? right[index] : right[0]) || 0;
      if (match[2] === "+") return a + b;
      if (match[2] === "-") return a - b;
      if (match[2] === "*") return a * b;
      return b === 0 ? "#DIV/0!" : a / b;
    });
  }

  _splitArgs(argsStr) {
    if (!argsStr.trim()) return [];
    const args = [];
    let cur = "";
    let parenDepth = 0;
    let inQuotes = false;

    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "(" && !inQuotes) parenDepth++;
      else if (char === ")" && !inQuotes) parenDepth--;
      else if ((char === "," || char === ";") && parenDepth === 0 && !inQuotes) {
        args.push(cur.trim());
        cur = "";
        continue;
      }
      cur += char;
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
  }

  _executeFunction(funcName, args) {
    switch (funcName) {
      // Toán học
      case "SUM": {
        const rawValues = this.collectValues(args);
        if (rawValues.includes("#REF!")) return "#REF!";
        const nums = rawValues
          .filter(v => !(v && v.isTextCell))
          .map(v => typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, "")))
          .filter(v => !isNaN(v));
        const sum = nums.reduce((acc, v) => acc + v, 0);
        return sum;
      }

      case "PRODUCT": {
        const nums = this.collectNumericValues(args);
        return nums.reduce((acc, v) => acc * v, 1);
      }

      case "SUMPRODUCT": {
        if (!args.length) return "#VALUE!";
        const arrays = args.map(arg => this._rangeValues(arg));
        if (arrays.some(values => values.includes("#REF!"))) return "#REF!";
        if (arrays.some(values => values.length !== arrays[0].length)) return "#VALUE!";
        return arrays[0].reduce((sum, _, index) => sum + arrays.reduce((product, values) => product * (Number(values[index]) || 0), 1), 0);
      }

      case "AVERAGE": {
        const rawValues = this.collectValues(args);
        if (rawValues.includes("#REF!")) return "#REF!";
        const nums = this.collectNumericValues(args);
        if (nums.length === 0) return 0;
        const sum = nums.reduce((acc, v) => acc + v, 0);
        return Math.round((sum / nums.length) * 100) / 100;
      }

      case "MIN": {
        if (this.collectValues(args).includes("#REF!")) return "#REF!";
        const nums = this.collectNumericValues(args);
        return nums.length ? Math.min(...nums) : 0;
      }

      case "MAX": {
        if (this.collectValues(args).includes("#REF!")) return "#REF!";
        const nums = this.collectNumericValues(args);
        return nums.length ? Math.max(...nums) : 0;
      }

      case "COUNT": {
        if (this.collectValues(args).includes("#REF!")) return "#REF!";
        const nums = this.collectNumericValues(args);
        return nums.length;
      }

      case "COUNTA": {
        const vals = this.collectValues(args).filter(v => v !== "" && v !== null && v !== undefined);
        return vals.length;
      }

      case "AVERAGEIF": {
        if (args.length < 2) return "#VALUE!";
        const criteriaValues = this._rangeValues(args[0]);
        const averageValues = this._rangeValues(args[2] || args[0]);
        if (criteriaValues.includes("#REF!") || averageValues.includes("#REF!")) return "#REF!";
        if (criteriaValues.length !== averageValues.length) return "#VALUE!";
        const matches = averageValues.filter((value, index) => this._matchesCriteria(criteriaValues[index], args[1]) && typeof value === "number");
        return matches.length ? matches.reduce((sum, value) => sum + value, 0) / matches.length : "#DIV/0!";
      }

      case "AVERAGEIFS": {
        if (args.length < 3 || args.length % 2 === 0) return "#VALUE!";
        const averageValues = this._rangeValues(args[0]);
        const pairs = [];
        for (let index = 1; index < args.length; index += 2) pairs.push([this._rangeValues(args[index]), args[index + 1]]);
        if (pairs.some(([values]) => values.includes("#REF!"))) return "#REF!";
        if (pairs.some(([values]) => values.length !== averageValues.length)) return "#VALUE!";
        const matches = averageValues.filter((value, index) => typeof value === "number" && pairs.every(([values, criteria]) => this._matchesCriteria(values[index], criteria)));
        return matches.length ? matches.reduce((sum, value) => sum + value, 0) / matches.length : "#DIV/0!";
      }

      case "MEDIAN": {
        const nums = this.collectNumericValues(args).sort((a, b) => a - b);
        if (!nums.length) return "#NUM!";
        const middle = Math.floor(nums.length / 2);
        return nums.length % 2 ? nums[middle] : (nums[middle - 1] + nums[middle]) / 2;
      }

      case "RANK":
      case "RANK.EQ": {
        if (args.length < 2) return "#VALUE!";
        const number = Number(this._resolveSingleValue(args[0]));
        const nums = this.collectNumericValues([args[1]]);
        const order = args[2] === undefined ? 0 : Number(this._resolveSingleValue(args[2]));
        if (!Number.isFinite(number) || !nums.includes(number)) return "#N/A";
        nums.sort((a, b) => order === 0 ? b - a : a - b);
        return nums.indexOf(number) + 1;
      }

      case "LARGE":
      case "SMALL": {
        if (args.length < 2) return "#VALUE!";
        const nums = this.collectNumericValues([args[0]]).sort((a, b) => funcName === "LARGE" ? b - a : a - b);
        const k = Number(this._resolveSingleValue(args[1]));
        return Number.isInteger(k) && k >= 1 && k <= nums.length ? nums[k - 1] : "#NUM!";
      }

      case "COUNTBLANK": {
        if (args.length !== 1) return "#VALUE!";
        const reference = this._parseReference(args[0]);
        if (reference.error || reference.sheets) return "#REF!";
        const coords = this.expandRange(reference.ref);
        const map = reference.sheet && typeof this.sheetResolver === "function" ? this.sheetResolver(reference.sheet) : this.cellsMap;
        return coords.filter(coord => !map?.has(coord) || map.get(coord)?.val === "").length;
      }

      case "STDEV":
      case "VAR": {
        const nums = this.collectNumericValues(args);
        if (nums.length < 2) return "#DIV/0!";
        const mean = nums.reduce((sum, value) => sum + value, 0) / nums.length;
        const variance = nums.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (nums.length - 1);
        return funcName === "STDEV" ? Math.sqrt(variance) : variance;
      }

      case "VLOOKUP":
      case "HLOOKUP": {
        const lookup = this._resolveSingleValue(args[0]);
        const matrix = this._rangeMatrix(args[1]);
        const requestedIndex = Number(this._resolveSingleValue(args[2]));
        const exact = args[3] !== undefined && !Boolean(this._resolveSingleValue(args[3]));
        const candidates = funcName === "VLOOKUP" ? matrix.map((row, index) => ({ key: row[0], index })) : matrix[0].map((key, index) => ({ key, index }));
        let found = exact ? candidates.find(item => this._equals(item.key, lookup)) : null;
        if (!exact) {
          for (const candidate of candidates) {
            if (this._compareValues(candidate.key, lookup) <= 0) found = candidate;
            else break;
          }
        }
        if (!found || requestedIndex < 1) return "#N/A";
        const result = funcName === "VLOOKUP" ? matrix[found.index]?.[requestedIndex - 1] : matrix[requestedIndex - 1]?.[found.index];
        return result === undefined ? "#REF!" : result;
      }

      case "INDEX": {
        const matrix = this._rangeMatrix(args[0]);
        const row = Number(this._resolveSingleValue(args[1]));
        const col = args[2] === undefined ? 1 : Number(this._resolveSingleValue(args[2]));
        return row >= 1 && col >= 1 && matrix[row - 1]?.[col - 1] !== undefined ? matrix[row - 1][col - 1] : "#REF!";
      }

      case "MATCH": {
        const lookup = this._resolveSingleValue(args[0]);
        const values = this._rangeMatrix(args[1]).flat();
        const matchType = args[2] === undefined ? 1 : Number(this._resolveSingleValue(args[2]));
        if (matchType === 0) {
          const index = values.findIndex(value => this._equals(value, lookup));
          return index < 0 ? "#N/A" : index + 1;
        }
        let found = -1;
        for (let index = 0; index < values.length; index++) {
          const comparison = this._compareValues(values[index], lookup);
          if ((matchType === 1 && comparison <= 0) || (matchType === -1 && comparison >= 0)) found = index;
          else break;
        }
        return found < 0 ? "#N/A" : found + 1;
      }

      case "XLOOKUP": {
        if (args.length < 3) return "#VALUE!";
        const lookup = this._resolveSingleValue(args[0]);
        const lookupValues = this._rangeValues(args[1]);
        const returnValues = this._rangeValues(args[2]);
        if (lookupValues.includes("#REF!") || returnValues.includes("#REF!")) return "#REF!";
        if (lookupValues.length !== returnValues.length) return "#VALUE!";
        const matchMode = args[4] === undefined ? 0 : Number(this._resolveSingleValue(args[4]));
        if (![0, -1, 1, 2].includes(matchMode)) return "#VALUE!";
        let index = -1;
        if (matchMode === 2) {
          const pattern = String(lookup).replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
          const regex = new RegExp(`^${pattern}$`, "i");
          index = lookupValues.findIndex(value => regex.test(String(value)));
        } else {
          index = lookupValues.findIndex(value => this._equals(value, lookup));
          if (index < 0 && matchMode !== 0) {
            let best = null;
            lookupValues.forEach((value, candidateIndex) => {
              const comparison = this._compareValues(value, lookup);
              if ((matchMode === -1 && comparison < 0) || (matchMode === 1 && comparison > 0)) {
                if (!best || (matchMode === -1 ? comparison > best.comparison : comparison < best.comparison)) best = { candidateIndex, comparison };
              }
            });
            index = best?.candidateIndex ?? -1;
          }
        }
        if (index < 0) return args[3] === undefined ? "#N/A" : this._resolveSingleValue(args[3]);
        return returnValues[index];
      }

      case "LOOKUP": {
        if (args.length < 2) return "#VALUE!";
        const lookup = this._resolveSingleValue(args[0]);
        const vector = this._rangeValues(args[1]);
        const results = args[2] === undefined ? vector : this._rangeValues(args[2]);
        if (vector.includes("#REF!") || results.includes("#REF!")) return "#REF!";
        if (vector.length !== results.length) return "#N/A";
        let found = -1;
        for (let index = 0; index < vector.length; index++) if (this._compareValues(vector[index], lookup) <= 0) found = index;
        return found < 0 ? "#N/A" : results[found];
      }

      case "CHOOSE": {
        const index = Number(this._resolveSingleValue(args[0]));
        if (!Number.isInteger(index) || index < 1 || index >= args.length) return "#VALUE!";
        return this._resolveSingleValue(args[index]);
      }

      case "INDIRECT": {
        if (args.length < 1) return "#VALUE!";
        const text = String(this._resolveSingleValue(args[0]));
        const reference = this._parseReference(text);
        if (reference.error || reference.sheets) return "#REF!";
        if (!/^[A-Z]+\d+(?::[A-Z]+\d+)?$/i.test(reference.ref)) return "#REF!";
        const values = this._referenceValues(text);
        return values.length === 1 ? values[0] : values;
      }

      case "OFFSET": {
        if (args.length < 3) return "#VALUE!";
        const reference = this._parseReference(args[0]);
        if (reference.error || reference.sheets) return "#REF!";
        const match = reference.ref.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
        const rows = Number(this._resolveSingleValue(args[1]));
        const cols = Number(this._resolveSingleValue(args[2]));
        if (!match || !Number.isInteger(rows) || !Number.isInteger(cols)) return "#VALUE!";
        const defaultHeight = match[4] ? Math.abs(Number(match[4]) - Number(match[2])) + 1 : 1;
        const defaultWidth = match[3] ? Math.abs(this._columnIndex(match[3]) - this._columnIndex(match[1])) + 1 : 1;
        const height = args[3] === undefined ? defaultHeight : Number(this._resolveSingleValue(args[3]));
        const width = args[4] === undefined ? defaultWidth : Number(this._resolveSingleValue(args[4]));
        const startRow = Number(match[2]) + rows;
        const startCol = this._columnIndex(match[1]) + cols;
        if (![height, width].every(Number.isInteger) || height <= 0 || width <= 0 || startRow < 1 || startCol < 0) return "#REF!";
        const ref = `${this._columnName(startCol)}${startRow}:${this._columnName(startCol + width - 1)}${startRow + height - 1}`;
        const prefix = reference.sheet ? `'${reference.sheet.replace(/'/g, "''")}'!` : "";
        const values = this._referenceValues(prefix + ref);
        return values.length === 1 ? values[0] : values;
      }

      case "COUNTIF":
        return this._rangeValues(args[0]).filter(value => this._matchesCriteria(value, args[1])).length;

      case "SUMIF": {
        const criteriaValues = this._rangeValues(args[0]);
        const sumValues = this._rangeValues(args[2] || args[0]);
        return criteriaValues.reduce((sum, value, index) => sum + (this._matchesCriteria(value, args[1]) ? Number(sumValues[index]) || 0 : 0), 0);
      }

      case "COUNTIFS":
      case "SUMIFS": {
        const offset = funcName === "SUMIFS" ? 1 : 0;
        const sumValues = funcName === "SUMIFS" ? this._rangeValues(args[0]) : null;
        const pairs = [];
        for (let index = offset; index < args.length; index += 2) pairs.push([this._rangeValues(args[index]), args[index + 1]]);
        if (!pairs.length || pairs.some(([values]) => values.length !== pairs[0][0].length)) return "#VALUE!";
        let result = 0;
        for (let index = 0; index < pairs[0][0].length; index++) {
          if (pairs.every(([values, criteria]) => this._matchesCriteria(values[index], criteria))) result += sumValues ? Number(sumValues[index]) || 0 : 1;
        }
        return result;
      }

      case "ROUND": {
        const val = this.collectNumericValues([args[0]])[0] || 0;
        const digits = args[1] ? Number(args[1]) : 0;
        const factor = Math.pow(10, digits);
        return Math.round(val * factor) / factor;
      }

      case "ABS": {
        const val = this.collectNumericValues([args[0]])[0] || 0;
        return Math.abs(val);
      }

      case "INT": {
        const val = this.collectNumericValues([args[0]])[0] || 0;
        return Math.floor(val);
      }

      case "MOD": {
        const num = Number(this._resolveSingleValue(args[0]));
        const div = Number(this._resolveSingleValue(args[1]));
        if (!Number.isFinite(num) || !Number.isFinite(div)) return "#VALUE!";
        if (div === 0) return "#DIV/0!";
        return ((num % div) + div) % div;
      }

      case "SQRT": {
        const value = Number(this._resolveSingleValue(args[0]));
        if (!Number.isFinite(value)) return "#VALUE!";
        return value < 0 ? "#NUM!" : Math.sqrt(value);
      }

      case "POWER": {
        const number = Number(this._resolveSingleValue(args[0]));
        const power = Number(this._resolveSingleValue(args[1]));
        if (!Number.isFinite(number) || !Number.isFinite(power)) return "#VALUE!";
        const result = Math.pow(number, power);
        return Number.isFinite(result) ? result : "#NUM!";
      }

      case "ROUNDUP":
      case "ROUNDDOWN":
      case "TRUNC": {
        const number = Number(this._resolveSingleValue(args[0]));
        const digits = args[1] === undefined ? 0 : Number(this._resolveSingleValue(args[1]));
        if (!Number.isFinite(number) || !Number.isInteger(digits)) return "#VALUE!";
        const factor = Math.pow(10, digits);
        const scaled = number * factor;
        const rounded = funcName === "ROUNDUP" ? Math.sign(scaled) * Math.ceil(Math.abs(scaled)) : Math.trunc(scaled);
        return rounded / factor;
      }

      case "CEILING":
      case "FLOOR": {
        const number = Number(this._resolveSingleValue(args[0]));
        const significance = Number(this._resolveSingleValue(args[1]));
        if (!Number.isFinite(number) || !Number.isFinite(significance)) return "#VALUE!";
        if (significance === 0) return 0;
        if (number !== 0 && Math.sign(number) !== Math.sign(significance)) return "#NUM!";
        const quotient = number / significance;
        return (funcName === "CEILING" ? Math.ceil(quotient) : Math.floor(quotient)) * significance;
      }

      case "SIGN": {
        const number = Number(this._resolveSingleValue(args[0]));
        return Number.isFinite(number) ? Math.sign(number) : "#VALUE!";
      }

      // Tài chính
      case "PMT": {
        if (args.length < 3) return "#VALUE!";
        const rate = Number(this._resolveSingleValue(args[0]));
        const nper = Number(this._resolveSingleValue(args[1]));
        const pv = Number(this._resolveSingleValue(args[2]));
        const fv = args[3] === undefined ? 0 : Number(this._resolveSingleValue(args[3]));
        const type = args[4] === undefined ? 0 : Number(this._resolveSingleValue(args[4]));
        if (![rate, nper, pv, fv, type].every(Number.isFinite)) return "#VALUE!";
        if (nper <= 0 || (type !== 0 && type !== 1) || rate <= -1) return "#NUM!";
        if (rate === 0) return -(pv + fv) / nper;
        const factor = Math.pow(1 + rate, nper);
        const payment = -((pv * factor + fv) * rate) / ((1 + rate * type) * (factor - 1));
        return Number.isFinite(payment) ? payment : "#NUM!";
      }

      case "FV": {
        if (args.length < 3) return "#VALUE!";
        const rate = Number(this._resolveSingleValue(args[0]));
        const nper = Number(this._resolveSingleValue(args[1]));
        const pmt = Number(this._resolveSingleValue(args[2]));
        const pv = args[3] === undefined ? 0 : Number(this._resolveSingleValue(args[3]));
        const type = args[4] === undefined ? 0 : Number(this._resolveSingleValue(args[4]));
        if (![rate, nper, pmt, pv, type].every(Number.isFinite)) return "#VALUE!";
        if (nper <= 0 || (type !== 0 && type !== 1) || rate <= -1) return "#NUM!";
        if (rate === 0) return -(pv + pmt * nper);
        const factor = Math.pow(1 + rate, nper);
        const futureValue = -(pv * factor + pmt * (1 + rate * type) * (factor - 1) / rate);
        return Number.isFinite(futureValue) ? futureValue : "#NUM!";
      }

      case "PV": {
        if (args.length < 3) return "#VALUE!";
        const rate = Number(this._resolveSingleValue(args[0]));
        const nper = Number(this._resolveSingleValue(args[1]));
        const pmt = Number(this._resolveSingleValue(args[2]));
        const fv = args[3] === undefined ? 0 : Number(this._resolveSingleValue(args[3]));
        const type = args[4] === undefined ? 0 : Number(this._resolveSingleValue(args[4]));
        if (![rate, nper, pmt, fv, type].every(Number.isFinite)) return "#VALUE!";
        if (nper <= 0 || (type !== 0 && type !== 1) || rate <= -1) return "#NUM!";
        if (rate === 0) return -(fv + pmt * nper);
        const factor = Math.pow(1 + rate, nper);
        const presentValue = -(fv + pmt * (1 + rate * type) * (factor - 1) / rate) / factor;
        return Number.isFinite(presentValue) ? presentValue : "#NUM!";
      }

      case "NPV": {
        const rate = Number(this._resolveSingleValue(args[0]));
        if (!Number.isFinite(rate) || rate <= -1) return "#NUM!";
        if (args.length < 2) return "#VALUE!";
        const values = this.collectNumericValues(args.slice(1));
        if (values.length === 0) return "#VALUE!";
        const netPresentValue = values.reduce(
          (total, value, index) => total + value / Math.pow(1 + rate, index + 1),
          0
        );
        return Number.isFinite(netPresentValue) ? netPresentValue : "#NUM!";
      }

      case "IRR": {
        if (args.length < 1) return "#VALUE!";
        const values = this.collectNumericValues([args[0]]);
        const guess = args[1] === undefined ? 0.1 : Number(this._resolveSingleValue(args[1]));
        if (!Number.isFinite(guess) || guess <= -1 ||
            !values.some(value => value < 0) || !values.some(value => value > 0)) return "#NUM!";
        const valueAt = rate => values.reduce(
          (total, value, period) => total + value / Math.pow(1 + rate, period),
          0
        );
        const derivativeAt = rate => values.reduce(
          (total, value, period) => period === 0
            ? total
            : total - period * value / Math.pow(1 + rate, period + 1),
          0
        );
        return this._solveRate(valueAt, derivativeAt, guess);
      }

      case "RATE": {
        if (args.length < 3) return "#VALUE!";
        const nper = Number(this._resolveSingleValue(args[0]));
        const pmt = Number(this._resolveSingleValue(args[1]));
        const pv = Number(this._resolveSingleValue(args[2]));
        const fv = args[3] === undefined ? 0 : Number(this._resolveSingleValue(args[3]));
        const type = args[4] === undefined ? 0 : Number(this._resolveSingleValue(args[4]));
        const guess = args[5] === undefined ? 0.1 : Number(this._resolveSingleValue(args[5]));
        if (![nper, pmt, pv, fv, type, guess].every(Number.isFinite)) return "#VALUE!";
        if (nper <= 0 || (type !== 0 && type !== 1) || guess <= -1) return "#NUM!";
        const valueAt = rate => {
          if (Math.abs(rate) < 1e-12) return fv + pv + pmt * nper;
          const factor = Math.pow(1 + rate, nper);
          return fv + pv * factor + pmt * (1 + rate * type) * (factor - 1) / rate;
        };
        const derivativeAt = rate => {
          if (Math.abs(rate) < 1e-8) {
            return pv * nper + pmt * (type * nper + nper * (nper - 1) / 2);
          }
          const factor = Math.pow(1 + rate, nper);
          const annuityFactor = (factor - 1) / rate;
          const annuityDerivative = (nper * Math.pow(1 + rate, nper - 1) * rate - (factor - 1)) / (rate * rate);
          return pv * nper * Math.pow(1 + rate, nper - 1) +
            pmt * (type * annuityFactor + (1 + rate * type) * annuityDerivative);
        };
        return this._solveRate(valueAt, derivativeAt, guess);
      }

      case "NPER": {
        if (args.length < 3) return "#VALUE!";
        const rate = Number(this._resolveSingleValue(args[0]));
        const pmt = Number(this._resolveSingleValue(args[1]));
        const pv = Number(this._resolveSingleValue(args[2]));
        const fv = args[3] === undefined ? 0 : Number(this._resolveSingleValue(args[3]));
        const type = args[4] === undefined ? 0 : Number(this._resolveSingleValue(args[4]));
        if (![rate, pmt, pv, fv, type].every(Number.isFinite)) return "#VALUE!";
        if ((type !== 0 && type !== 1) || rate <= -1) return "#NUM!";
        if (rate === 0) {
          if (pmt === 0) return "#NUM!";
          const periods = -(pv + fv) / pmt;
          return Number.isFinite(periods) ? periods : "#NUM!";
        }
        const adjustedPayment = pmt * (1 + rate * type);
        const ratio = (adjustedPayment - fv * rate) / (pv * rate + adjustedPayment);
        if (ratio <= 0) return "#NUM!";
        const periods = Math.log(ratio) / Math.log(1 + rate);
        return Number.isFinite(periods) ? periods : "#NUM!";
      }

      case "IPMT": {
        if (args.length < 4) return "#VALUE!";
        const rate = Number(this._resolveSingleValue(args[0]));
        const per = Number(this._resolveSingleValue(args[1]));
        const nper = Number(this._resolveSingleValue(args[2]));
        const pv = Number(this._resolveSingleValue(args[3]));
        const fv = args[4] === undefined ? 0 : Number(this._resolveSingleValue(args[4]));
        const type = args[5] === undefined ? 0 : Number(this._resolveSingleValue(args[5]));
        if (![rate, per, nper, pv, fv, type].every(Number.isFinite)) return "#VALUE!";
        if (nper <= 0 || per < 1 || per > nper || (type !== 0 && type !== 1) || rate <= -1) return "#NUM!";
        if (rate === 0 || (type === 1 && per === 1)) return 0;
        const paymentFactor = Math.pow(1 + rate, nper);
        const payment = -((pv * paymentFactor + fv) * rate) /
          ((1 + rate * type) * (paymentFactor - 1));
        const elapsedFactor = Math.pow(1 + rate, per - 1);
        const balance = -(pv * elapsedFactor + payment * (1 + rate * type) * (elapsedFactor - 1) / rate);
        const interest = type === 1 ? balance * rate / (1 + rate) : balance * rate;
        return Number.isFinite(interest) ? interest : "#NUM!";
      }

      case "PPMT": {
        if (args.length < 4) return "#VALUE!";
        const payment = this._executeFunction("PMT", [args[0], args[2], args[3], args[4], args[5]]);
        if (typeof payment !== "number") return payment;
        const interest = this._executeFunction("IPMT", args);
        if (typeof interest !== "number") return interest;
        const principal = payment - interest;
        return Number.isFinite(principal) ? principal : "#NUM!";
      }

      case "SLN": {
        if (args.length < 3) return "#VALUE!";
        const cost = Number(this._resolveSingleValue(args[0]));
        const salvage = Number(this._resolveSingleValue(args[1]));
        const life = Number(this._resolveSingleValue(args[2]));
        if (![cost, salvage, life].every(Number.isFinite)) return "#VALUE!";
        if (life <= 0) return "#NUM!";
        return (cost - salvage) / life;
      }

      case "DB": {
        if (args.length < 4) return "#VALUE!";
        const cost = Number(this._resolveSingleValue(args[0]));
        const salvage = Number(this._resolveSingleValue(args[1]));
        const life = Number(this._resolveSingleValue(args[2]));
        const period = Number(this._resolveSingleValue(args[3]));
        const month = args[4] === undefined ? 12 : Number(this._resolveSingleValue(args[4]));
        if (![cost, salvage, life, period, month].every(Number.isFinite)) return "#VALUE!";
        const finalPeriod = life + (month < 12 ? 1 : 0);
        if (cost <= 0 || salvage < 0 || salvage > cost || life <= 0 ||
            !Number.isInteger(period) || period < 1 || period > finalPeriod ||
            !Number.isInteger(month) || month < 1 || month > 12) return "#NUM!";

        // Excel làm tròn hệ số giảm dần tới ba chữ số thập phân trước khi tính từng kỳ.
        const rate = Math.round((1 - Math.pow(salvage / cost, 1 / life)) * 1000) / 1000;
        let totalDepreciation = 0;
        let depreciation = 0;
        for (let currentPeriod = 1; currentPeriod <= period; currentPeriod++) {
          const remainingValue = cost - totalDepreciation;
          if (currentPeriod === 1) {
            depreciation = cost * rate * month / 12;
          } else if (currentPeriod === life + 1) {
            depreciation = remainingValue * rate * (12 - month) / 12;
          } else {
            depreciation = remainingValue * rate;
          }
          totalDepreciation += depreciation;
        }
        return Number.isFinite(depreciation) ? depreciation : "#NUM!";
      }

      // Logic
      case "IF": {
        const condExpr = args[0];
        const condResult = this._evaluateCondition(condExpr);
        if (condResult) {
          return this._resolveSingleValue(args[1]);
        } else {
          return args[2] !== undefined ? this._resolveSingleValue(args[2]) : false;
        }
      }

      case "AND": {
        for (const a of args) {
          if (!this._evaluateCondition(a)) return false;
        }
        return true;
      }

      case "OR": {
        for (const a of args) {
          if (this._evaluateCondition(a)) return true;
        }
        return false;
      }

      case "NOT": {
        return !this._evaluateCondition(args[0]);
      }

      case "IFERROR":
      case "IFNA": {
        if (args.length < 2) return "#VALUE!";
        const value = this._resolveSingleValue(args[0]);
        const caught = funcName === "IFNA" ? value === "#N/A" : this._isError(value);
        return caught ? this._resolveSingleValue(args[1]) : value;
      }

      case "ISBLANK": {
        if (args.length !== 1) return "#VALUE!";
        const reference = this._parseReference(args[0]);
        if (reference.error) return false;
        if (/^[A-Z]+\d+$/i.test(reference.ref)) {
          const map = reference.sheet && typeof this.sheetResolver === "function" ? this.sheetResolver(reference.sheet) : this.cellsMap;
          return !map?.has(reference.ref) || map.get(reference.ref)?.val === "";
        }
        return this._resolveSingleValue(args[0]) === "";
      }

      case "ISNUMBER":
        if (args.length !== 1) return "#VALUE!";
        return typeof this._resolveSingleValue(args[0]) === "number";
      case "ISTEXT": {
        if (args.length !== 1) return "#VALUE!";
        const value = this._resolveSingleValue(args[0]);
        return typeof value === "string" && !this._isError(value);
      }
      case "ISERROR":
        if (args.length !== 1) return "#VALUE!";
        return this._isError(this._resolveSingleValue(args[0]));
      case "ISNA":
        if (args.length !== 1) return "#VALUE!";
        return this._resolveSingleValue(args[0]) === "#N/A";

      // Văn bản
      case "CONCAT":
      case "CONCATENATE": {
        const vals = this.collectValues(args);
        return vals.join("");
      }

      case "UPPER": {
        const text = String(this._resolveSingleValue(args[0]) || "");
        return text.toUpperCase();
      }

      case "LOWER": {
        const text = String(this._resolveSingleValue(args[0]) || "");
        return text.toLowerCase();
      }

      case "LEN": {
        const text = String(this._resolveSingleValue(args[0]) || "");
        return text.length;
      }

      case "TRIM": {
        const text = String(this._resolveSingleValue(args[0]) || "");
        return text.trim().replace(/\s+/g, " ");
      }

      case "LEFT": {
        const text = String(this._resolveSingleValue(args[0]) || "");
        const len = args[1] ? Number(args[1]) : 1;
        return text.substring(0, len);
      }

      case "RIGHT": {
        const text = String(this._resolveSingleValue(args[0]) || "");
        const len = args[1] ? Number(args[1]) : 1;
        return text.substring(Math.max(0, text.length - len));
      }

      case "TEXT": {
        const value = this._resolveSingleValue(args[0]);
        const format = String(this._resolveSingleValue(args[1]) || "").toLowerCase();
        if (format === "#,##0") return Number(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
        if (format === "0.00") return Number(value).toFixed(2);
        if (format === "dd/mm/yyyy") {
          const date = this._parseDate(value);
          return date ? this._formatDate(date) : "#VALUE!";
        }
        return String(value);
      }

      case "SUBSTITUTE": {
        const text = String(this._resolveSingleValue(args[0]) ?? "");
        const oldText = String(this._resolveSingleValue(args[1]) ?? "");
        const newText = String(this._resolveSingleValue(args[2]) ?? "");
        if (args[3] === undefined) return oldText ? text.split(oldText).join(newText) : text;
        const instance = Number(this._resolveSingleValue(args[3]));
        if (!Number.isInteger(instance) || instance < 1 || !oldText) return "#VALUE!";
        let seen = 0;
        return text.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), match => ++seen === instance ? newText : match);
      }

      case "FIND": {
        const findText = String(this._resolveSingleValue(args[0]) ?? "");
        const withinText = String(this._resolveSingleValue(args[1]) ?? "");
        const start = args[2] === undefined ? 1 : Number(this._resolveSingleValue(args[2]));
        if (!Number.isInteger(start) || start < 1 || start > withinText.length + 1) return "#VALUE!";
        const index = withinText.indexOf(findText, start - 1);
        return index < 0 ? "#VALUE!" : index + 1;
      }

      case "MID": {
        if (args.length < 3) return "#VALUE!";
        const text = String(this._resolveSingleValue(args[0]) ?? "");
        const start = Number(this._resolveSingleValue(args[1]));
        const count = Number(this._resolveSingleValue(args[2]));
        if (!Number.isInteger(start) || !Number.isInteger(count) || start < 1 || count < 0) return "#VALUE!";
        return text.substring(start - 1, start - 1 + count);
      }

      case "VALUE": {
        if (args.length !== 1) return "#VALUE!";
        const text = String(this._resolveSingleValue(args[0])).trim();
        const percent = text.endsWith("%");
        const normalized = text.replace(/[%$€£₫\s]/g, "").replace(/,/g, "");
        if (!normalized || !Number.isFinite(Number(normalized))) return "#VALUE!";
        return Number(normalized) / (percent ? 100 : 1);
      }

      case "PROPER": {
        if (args.length !== 1) return "#VALUE!";
        return String(this._resolveSingleValue(args[0]) ?? "").toLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_, prefix, letter) => prefix + letter.toUpperCase());
      }

      case "TEXTJOIN": {
        if (args.length < 3) return "#VALUE!";
        const delimiter = String(this._resolveSingleValue(args[0]) ?? "");
        const ignoreEmpty = Boolean(this._resolveSingleValue(args[1]));
        const values = this.collectValues(args.slice(2));
        if (values.some(value => this._isError(value))) return values.find(value => this._isError(value));
        const selected = ignoreEmpty ? values.filter(value => value !== "" && value !== null && value !== undefined) : values;
        const result = selected.join(delimiter);
        return result.length > 32767 ? "#VALUE!" : result;
      }

      case "REPT": {
        if (args.length < 2) return "#VALUE!";
        const text = String(this._resolveSingleValue(args[0]) ?? "");
        const count = Number(this._resolveSingleValue(args[1]));
        if (!Number.isFinite(count) || count < 0 || text.length * Math.trunc(count) > 32767) return "#VALUE!";
        return text.repeat(Math.trunc(count));
      }

      case "EXACT": {
        if (args.length !== 2) return "#VALUE!";
        return String(this._resolveSingleValue(args[0]) ?? "") === String(this._resolveSingleValue(args[1]) ?? "");
      }

      case "SEARCH": {
        if (args.length < 2) return "#VALUE!";
        const findText = String(this._resolveSingleValue(args[0]) ?? "").toLocaleLowerCase();
        const withinText = String(this._resolveSingleValue(args[1]) ?? "").toLocaleLowerCase();
        const start = args[2] === undefined ? 1 : Number(this._resolveSingleValue(args[2]));
        if (!Number.isInteger(start) || start < 1 || start > withinText.length + 1) return "#VALUE!";
        const index = withinText.indexOf(findText, start - 1);
        return index < 0 ? "#VALUE!" : index + 1;
      }

      // Ngày tháng
      case "TODAY": {
        const now = new Date();
        return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
      }

      case "NOW": {
        const now = new Date();
        return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      }

      case "DATE": {
        const date = new Date(Number(this._resolveSingleValue(args[0])), Number(this._resolveSingleValue(args[1])) - 1, Number(this._resolveSingleValue(args[2])));
        return Number.isNaN(date.getTime()) ? "#VALUE!" : this._formatDate(date);
      }

      case "DATEDIF": {
        const start = this._parseDate(this._resolveSingleValue(args[0]));
        const end = this._parseDate(this._resolveSingleValue(args[1]));
        const unit = String(this._resolveSingleValue(args[2]) || "").toLowerCase();
        if (!start || !end || end < start) return "#NUM!";
        if (unit === "d") return Math.floor((end - start) / 86400000);
        let count = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
        if (end.getDate() < start.getDate()) count--;
        if (unit === "m") return count;
        if (unit === "y") return Math.floor(count / 12);
        return "#NUM!";
      }

      case "EDATE": {
        const start = this._parseDate(this._resolveSingleValue(args[0]));
        if (!start) return "#VALUE!";
        const months = Math.trunc(Number(this._resolveSingleValue(args[1])));
        const targetDay = start.getDate();
        const result = new Date(start.getFullYear(), start.getMonth() + months, 1);
        result.setDate(Math.min(targetDay, new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()));
        return this._formatDate(result);
      }

      case "WEEKDAY": {
        const date = this._parseDate(this._resolveSingleValue(args[0]));
        const type = args[1] === undefined ? 1 : Number(this._resolveSingleValue(args[1]));
        if (!date) return "#VALUE!";
        const starts = { 1: 0, 2: 1, 3: 1, 11: 1, 12: 2, 13: 3, 14: 4, 15: 5, 16: 6, 17: 0 };
        if (!(type in starts)) return "#NUM!";
        const shifted = (date.getDay() - starts[type] + 7) % 7;
        return type === 3 ? shifted : shifted + 1;
      }

      case "NETWORKDAYS": {
        const start = this._parseDate(this._resolveSingleValue(args[0]));
        const end = this._parseDate(this._resolveSingleValue(args[1]));
        if (!start || !end) return "#VALUE!";
        const holidays = this._holidaySet(args[2]);
        if (holidays.error) return holidays.error;
        const direction = start <= end ? 1 : -1;
        let count = 0;
        for (let date = new Date(start); direction > 0 ? date <= end : date >= end; date.setDate(date.getDate() + direction)) {
          if (this._isWorkday(date, holidays.values)) count += direction;
        }
        return count;
      }

      case "WORKDAY": {
        const start = this._parseDate(this._resolveSingleValue(args[0]));
        const days = Number(this._resolveSingleValue(args[1]));
        if (!start || !Number.isInteger(days)) return "#VALUE!";
        const holidays = this._holidaySet(args[2]);
        if (holidays.error) return holidays.error;
        const direction = days < 0 ? -1 : 1;
        let remaining = Math.abs(days);
        const result = new Date(start);
        while (remaining > 0) {
          result.setDate(result.getDate() + direction);
          if (this._isWorkday(result, holidays.values)) remaining--;
        }
        return this._formatDate(result);
      }

      case "EOMONTH": {
        const start = this._parseDate(this._resolveSingleValue(args[0]));
        const months = Number(this._resolveSingleValue(args[1]));
        if (!start || !Number.isFinite(months)) return "#VALUE!";
        return this._formatDate(new Date(start.getFullYear(), start.getMonth() + Math.trunc(months) + 1, 0));
      }

      case "DAYS": {
        const end = this._parseDate(this._resolveSingleValue(args[0]));
        const start = this._parseDate(this._resolveSingleValue(args[1]));
        if (!start || !end) return "#VALUE!";
        return Math.round((end - start) / 86400000);
      }

      case "YEAR": {
        const val = String(this._resolveSingleValue(args[0]) || "");
        const parts = val.split("/");
        return parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
      }

      case "MONTH": {
        const date = this._parseDate(this._resolveSingleValue(args[0]));
        return date ? date.getMonth() + 1 : "#VALUE!";
      }

      case "DAY": {
        const date = this._parseDate(this._resolveSingleValue(args[0]));
        return date ? date.getDate() : "#VALUE!";
      }

      default:
        return `#NAME? (${funcName})`;
    }
  }

  _evaluateCondition(condStr) {
    if (!condStr) return false;
    const match = condStr.match(/(>=|<=|!=|<>|>|<|=)(.*)/);
    if (match) {
      const op = match[1];
      const leftStr = condStr.substring(0, match.index).trim();
      const rightStr = match[2].trim();

      const leftVal = this._resolveSingleValue(leftStr);
      const rightVal = this._resolveSingleValue(rightStr);

      if (op === ">=") return leftVal >= rightVal;
      if (op === "<=") return leftVal <= rightVal;
      if (op === ">") return leftVal > rightVal;
      if (op === "<") return leftVal < rightVal;
      if (op === "!=" || op === "<>") return leftVal != rightVal;
      if (op === "=") return leftVal == rightVal;
    }

    const val = this._resolveSingleValue(condStr);
    return Boolean(val && val !== "FALSE" && val !== "0");
  }

  _resolveSingleValue(token) {
    if (typeof token !== "string") return token;
    token = token.trim();
    if (token.startsWith('"') && token.endsWith('"')) {
      return token.slice(1, -1);
    }
    if (/^(?:(?:'[^']+'|[^!]+)!)?[A-Z]+\d+$/i.test(token)) {
      const reference = this._parseReference(token);
      return reference.error || this.getCellValue(reference.ref, reference.sheet);
    }
    const named = this._resolveNamedRange(token);
    if (named) return this.getCellValue(this.expandRange(this._resolveRangeReference(token))[0]);
    if (!isNaN(Number(token))) {
      return Number(token);
    }
    if (token.toUpperCase() === "TRUE") return true;
    if (token.toUpperCase() === "FALSE") return false;

    // Hỗ trợ biểu thức số học trong đối số hàm (ví dụ: 0.08/12, 12*5, A1/12)
    if (/[+\-*/^()]/.test(token)) {
      const arith = this._evaluateArithmetic(token, { raw: true });
      if (typeof arith === "number" && Number.isFinite(arith)) {
        return arith;
      }
    }
    if (/^[A-Z_.]+\s*\(.*\)$/i.test(token)) {
      const nested = this.evaluate(`=${token}`);
      if (nested !== "#LỖI!" && nested !== "#NAME?") {
        return nested;
      }
    }

    return token;
  }

  _parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return new Date(value);
    const match = String(value).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return null;
    const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    return date.getFullYear() === Number(match[3]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[1]) ? date : null;
  }

  _formatDate(date) {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }

  _holidaySet(argument) {
    if (argument === undefined) return { values: new Set() };
    const rawValues = typeof argument === "string" && (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(argument) || argument.includes("!"))
      ? this._rangeValues(argument)
      : [this._resolveSingleValue(argument)];
    if (rawValues.includes("#REF!")) return { error: "#REF!" };
    const values = new Set();
    for (const value of rawValues) {
      const date = this._parseDate(value);
      if (!date) return { error: "#VALUE!" };
      values.add(this._formatDate(date));
    }
    return { values };
  }

  _isWorkday(date, holidays) {
    return date.getDay() !== 0 && date.getDay() !== 6 && !holidays.has(this._formatDate(date));
  }

  _solveRate(valueAt, derivativeAt, guess) {
    const tolerance = 1e-10;
    let rate = guess;
    for (let iteration = 0; iteration < 100; iteration++) {
      const value = valueAt(rate);
      if (Number.isFinite(value) && Math.abs(value) <= tolerance) return rate;
      const derivative = derivativeAt(rate);
      if (!Number.isFinite(value) || !Number.isFinite(derivative) || Math.abs(derivative) < 1e-14) break;
      const nextRate = rate - value / derivative;
      if (!Number.isFinite(nextRate) || nextRate <= -1) break;
      if (Math.abs(nextRate - rate) <= tolerance) return nextRate;
      rate = nextRate;
    }

    // Fallback chia đôi: quét logarit theo (1 + rate) để phủ cả lãi suất gần -100% và rất lớn.
    const candidates = [guess];
    for (let exponent = -64; exponent <= 64; exponent++) {
      candidates.push(Math.pow(10, exponent / 8) - 1);
    }
    candidates.sort((a, b) => a - b);
    let bestBracket = null;
    for (let index = 1; index < candidates.length; index++) {
      const left = candidates[index - 1];
      const right = candidates[index];
      const leftValue = valueAt(left);
      const rightValue = valueAt(right);
      if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) continue;
      if (leftValue === 0) return left;
      if (rightValue === 0) return right;
      if (leftValue * rightValue < 0) {
        const distance = Math.abs((left + right) / 2 - guess);
        if (!bestBracket || distance < bestBracket.distance) bestBracket = { left, right, distance };
      }
    }
    if (!bestBracket) return "#NUM!";

    let { left, right } = bestBracket;
    let leftValue = valueAt(left);
    for (let iteration = 0; iteration < 200; iteration++) {
      const middle = (left + right) / 2;
      const middleValue = valueAt(middle);
      if (!Number.isFinite(middleValue)) return "#NUM!";
      if (Math.abs(middleValue) <= tolerance || Math.abs(right - left) <= tolerance) return middle;
      if (leftValue * middleValue <= 0) {
        right = middle;
      } else {
        left = middle;
        leftValue = middleValue;
      }
    }
    return "#NUM!";
  }

  _evaluateArithmetic(expr, { raw = false } = {}) {
    // Thay thế các tọa độ ô (vd: A1, B2) thành giá trị số tương ứng
    let referenceError = false;
    const resolved = expr.replace(/(?:'(?:[^']|'')+'|[A-Za-zÀ-ỹ_][^\s!+\-*/()]*)![A-Z]+\d+|[A-Z]+\d+/gi, (token) => {
      const reference = this._parseReference(token);
      const val = reference.error || this.getCellValue(reference.ref, reference.sheet);
      if (val === "#REF!") referenceError = true;
      return typeof val === "number" ? val : (Number(val) || 0);
    });
    if (referenceError) return "#REF!";

    // Tính toán an toàn
    if (/^[\d\s+\-*/().%^]+$/.test(resolved)) {
      // Thay thế ^ thành **
      const jsExpr = resolved.replace(/\^/g, "**");
      try {
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${jsExpr})`)();
        return typeof result === "number" ? (raw ? result : Math.round(result * 100) / 100) : result;
      } catch {
        return "#VALUE!";
      }
    }

    return "#VALUE!";
  }
}

/**
 * Lọc và xếp hạng gợi ý hàm tính toán dựa trên tiền tố người dùng nhập
 * @param {string} query Chuỗi tiền tố (ví dụ "SU", "AV", "count")
 * @param {Array<Object>} [catalog=FUNCTION_CATALOG] Danh mục hàm
 * @returns {Array<Object>} Danh sách các hàm khớp tiền tố, sắp xếp theo độ liên quan
 */
export function getFunctionSuggestions(query, catalog = FUNCTION_CATALOG) {
  if (!query || typeof query !== "string") return [];
  const q = query.trim().toUpperCase();
  if (!q) return [];

  const matches = [];
  for (const item of catalog) {
    const nameUpper = item.name.toUpperCase();
    if (nameUpper === q) {
      matches.push({ item, score: 1000 });
    } else if (nameUpper.startsWith(q)) {
      // Khớp tiền tố: ưu tiên tên ngắn hơn hoặc độ chênh lệch độ dài ít hơn
      matches.push({ item, score: 500 - (nameUpper.length - q.length) });
    }
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.item.name.localeCompare(b.item.name);
  });

  return matches.map(m => m.item);
}

/**
 * Định dạng chuỗi cú pháp hàm thành HTML với tham số hiện tại được làm đậm (strong)
 * @param {string} syntax Cú pháp chuẩn (ví dụ "SUM(number1, [number2], ...)")
 * @param {number} [activeParamIndex=0] Vị trí tham số hiện tại (0-indexed)
 * @returns {string} Chuỗi HTML với <strong class="vno-syntax-param-active">...</strong>
 */
export function formatSyntaxHtml(syntax, activeParamIndex = 0) {
  if (!syntax) return "";
  const openParen = syntax.indexOf("(");
  const closeParen = syntax.lastIndexOf(")");
  if (openParen === -1 || closeParen === -1) {
    return syntax;
  }

  const funcName = syntax.substring(0, openParen);
  const innerParams = syntax.substring(openParen + 1, closeParen).trim();
  if (!innerParams) {
    return `${funcName}()`;
  }

  const rawParams = innerParams.split(",").map(p => p.trim());
  const hasVariadic = rawParams.some(p => p === "..." || p.includes("..."));

  const formattedParams = rawParams.map((param, idx) => {
    let isActive = false;
    if (idx === activeParamIndex) {
      isActive = true;
    } else if (hasVariadic && idx === rawParams.length - 1 && activeParamIndex >= rawParams.length - 1) {
      isActive = true;
    }

    if (isActive) {
      return `<strong class="vno-syntax-param-active">${param}</strong>`;
    }
    return param;
  });

  return `${funcName}(${formattedParams.join(", ")})`;
}

/**
 * Tìm hàm đang mở bao quanh vị trí con trỏ (hỗ trợ hàm lồng nhau và chuỗi trong dấu nháy)
 * @param {string} formulaStr Chuỗi công thức (ví dụ "=IF(A1 > 0, SUM(B1, B2), ")
 * @param {number} [cursorPos] Vị trí con trỏ
 * @param {Array<Object>} [catalog=FUNCTION_CATALOG]
 * @returns {Object|null} { funcName, funcDef, activeParamIndex, openParenIndex }
 */
export function findEnclosingFunction(formulaStr, cursorPos, catalog = FUNCTION_CATALOG) {
  if (!formulaStr || !formulaStr.startsWith("=")) return null;
  const pos = (cursorPos !== undefined && cursorPos !== null) ? cursorPos : formulaStr.length;
  const text = formulaStr.slice(0, pos);

  const parenStack = [];
  let inQuotes = false;
  let currentWord = "";

  for (let i = 1; i < text.length; i++) {
    const char = text[i];
    const prevChar = text[i - 1];

    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      currentWord = "";
      continue;
    }

    if (inQuotes) continue;

    if (/[A-Za-z0-9_]/.test(char)) {
      currentWord += char;
    } else {
      if (char === "(") {
        parenStack.push({
          funcName: currentWord.toUpperCase(),
          commaCount: 0,
          openParenIndex: i
        });
        currentWord = "";
      } else if (char === ")") {
        if (parenStack.length > 0) {
          parenStack.pop();
        }
        currentWord = "";
      } else if (char === "," || char === ";") {
        if (parenStack.length > 0) {
          parenStack[parenStack.length - 1].commaCount++;
        }
        currentWord = "";
      } else {
        currentWord = "";
      }
    }
  }

  if (parenStack.length > 0) {
    const active = parenStack[parenStack.length - 1];
    const funcDef = catalog.find(f => f.name.toUpperCase() === active.funcName);
    if (funcDef) {
      return {
        funcName: active.funcName,
        funcDef: funcDef,
        activeParamIndex: active.commaCount,
        openParenIndex: active.openParenIndex
      };
    }
  }

  return null;
}

/**
 * Phân tích ngữ cảnh nhập liệu công thức tại vị trí con trỏ
 * Xác định xem đang gõ tên hàm (autocomplete) hay đang nhập tham số hàm (syntax_tooltip)
 * @param {string} formulaStr Chuỗi công thức
 * @param {number} [cursorPos] Vị trí con trỏ hiện tại
 * @param {Array<Object>} [catalog=FUNCTION_CATALOG]
 * @returns {Object} { mode: "autocomplete"|"syntax_tooltip"|null, ... }
 */
export function parseFormulaContext(formulaStr, cursorPos, catalog = FUNCTION_CATALOG) {
  if (!formulaStr || !formulaStr.startsWith("=")) {
    return { mode: null };
  }

  const pos = (cursorPos !== undefined && cursorPos !== null) ? cursorPos : formulaStr.length;
  const text = formulaStr.slice(0, pos);

  const parenStack = [];
  let inQuotes = false;
  let currentWord = "";
  let currentWordStart = 1;

  for (let i = 1; i < text.length; i++) {
    const char = text[i];
    const prevChar = text[i - 1];

    if (char === '"' && prevChar !== "\\") {
      inQuotes = !inQuotes;
      currentWord = "";
      continue;
    }

    if (inQuotes) continue;

    if (/[A-Za-z0-9_]/.test(char)) {
      if (currentWord === "") {
        currentWordStart = i;
      }
      currentWord += char;
    } else {
      if (char === "(") {
        parenStack.push({
          funcName: currentWord.toUpperCase(),
          commaCount: 0,
          openParenIndex: i
        });
        currentWord = "";
      } else if (char === ")") {
        if (parenStack.length > 0) {
          parenStack.pop();
        }
        currentWord = "";
      } else if (char === "," || char === ";") {
        if (parenStack.length > 0) {
          parenStack[parenStack.length - 1].commaCount++;
        }
        currentWord = "";
      } else {
        currentWord = "";
      }
    }
  }

  // 1. Kiểm tra nếu đang gõ tiền tố tên hàm
  if (!inQuotes && currentWord.length > 0) {
    const suggestions = getFunctionSuggestions(currentWord, catalog);
    if (suggestions.length > 0) {
      return {
        mode: "autocomplete",
        prefix: currentWord,
        tokenStartIndex: currentWordStart,
        tokenEndIndex: currentWordStart + currentWord.length,
        suggestions
      };
    }
  }

  // 2. Nếu không phải gõ tiền tố hàm, kiểm tra xem có đang nằm trong tham số hàm nào không
  if (parenStack.length > 0) {
    const active = parenStack[parenStack.length - 1];
    const funcDef = catalog.find(f => f.name.toUpperCase() === active.funcName);
    if (funcDef) {
      return {
        mode: "syntax_tooltip",
        funcName: active.funcName,
        funcDef: funcDef,
        activeParamIndex: active.commaCount,
        openParenIndex: active.openParenIndex
      };
    }
  }

  return { mode: null };
}

