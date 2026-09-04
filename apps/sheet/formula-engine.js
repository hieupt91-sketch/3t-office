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

  // Tra cứu & tham chiếu
  { name: "VLOOKUP", category: "Tra cứu", syntax: "VLOOKUP(lookup_value, table_array, col_index, [range_lookup])", desc: "Tra theo cột đầu của bảng và trả về giá trị ở cột chỉ định." },
  { name: "HLOOKUP", category: "Tra cứu", syntax: "HLOOKUP(lookup_value, table_array, row_index, [range_lookup])", desc: "Tra theo hàng đầu của bảng và trả về giá trị ở hàng chỉ định." },
  { name: "INDEX", category: "Tra cứu", syntax: "INDEX(array, row_num, [col_num])", desc: "Trả về giá trị tại hàng và cột trong vùng." },
  { name: "MATCH", category: "Tra cứu", syntax: "MATCH(lookup_value, lookup_array, [match_type])", desc: "Trả về vị trí tương đối của giá trị trong vùng." },

  // Logic
  { name: "IF", category: "Logic", syntax: "IF(logical_test, value_if_true, [value_if_false])", desc: "Kiểm tra điều kiện và trả về giá trị thứ nhất nếu đúng, thứ hai nếu sai." },
  { name: "AND", category: "Logic", syntax: "AND(logical1, [logical2], ...)", desc: "Trả về TRUE nếu tất cả các đối số là TRUE." },
  { name: "OR", category: "Logic", syntax: "OR(logical1, [logical2], ...)", desc: "Trả về TRUE nếu bất kỳ đối số nào là TRUE." },
  { name: "NOT", category: "Logic", syntax: "NOT(logical)", desc: "Đảo ngược giá trị logic của đối số." },

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

  // Ngày tháng
  { name: "TODAY", category: "Ngày tháng", syntax: "TODAY()", desc: "Trả về ngày hiện tại của hệ thống." },
  { name: "NOW", category: "Ngày tháng", syntax: "NOW()", desc: "Trả về ngày và giờ hiện tại của hệ thống." },
  { name: "YEAR", category: "Ngày tháng", syntax: "YEAR(date)", desc: "Trả về năm tương ứng của một ngày cụ thể." },
  { name: "MONTH", category: "Ngày tháng", syntax: "MONTH(date)", desc: "Trả về tháng trong năm (từ 1 đến 12)." },
  { name: "DAY", category: "Ngày tháng", syntax: "DAY(date)", desc: "Trả về ngày trong tháng (từ 1 đến 31)." }
  ,{ name: "DATE", category: "Ngày tháng", syntax: "DATE(year, month, day)", desc: "Tạo một ngày từ năm, tháng và ngày." }
  ,{ name: "DATEDIF", category: "Ngày tháng", syntax: "DATEDIF(start_date, end_date, unit)", desc: "Tính số ngày, tháng hoặc năm trọn vẹn giữa hai ngày." }
  ,{ name: "EDATE", category: "Ngày tháng", syntax: "EDATE(start_date, months)", desc: "Cộng hoặc trừ số tháng vào một ngày." }

  // Tài chính
  ,{ name: "PMT", category: "Tài chính", syntax: "PMT(rate, nper, pv, [fv], [type])", desc: "Tính khoản thanh toán định kỳ với lãi suất cố định; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "FV", category: "Tài chính", syntax: "FV(rate, nper, pmt, [pv], [type])", desc: "Tính giá trị tương lai của khoản đầu tư; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "PV", category: "Tài chính", syntax: "PV(rate, nper, pmt, [fv], [type])", desc: "Tính giá trị hiện tại của khoản đầu tư hoặc chuỗi thanh toán; type là 0 (cuối kỳ) hoặc 1 (đầu kỳ)." }
  ,{ name: "NPV", category: "Tài chính", syntax: "NPV(rate, value1, [value2], ...)", desc: "Tính giá trị hiện tại ròng của chuỗi dòng tiền đều kỳ; value1 được chiết khấu từ cuối kỳ đầu tiên." }
  ,{ name: "IRR", category: "Tài chính", syntax: "IRR(values, [guess])", desc: "Tính tỷ suất hoàn vốn nội bộ của chuỗi dòng tiền có ít nhất một giá trị âm và một giá trị dương." }
];

export class FormulaEngine {
  /**
   * @param {Map<string, {val: string, formula: string, style: Object}> | (() => Map<string, any>)} cellsData
   */
  constructor(cellsData, namedRangeResolver = null, sheetResolver = null, currentSheetResolver = null) {
    this.cellsData = cellsData;
    this.namedRangeResolver = namedRangeResolver;
    this.sheetResolver = sheetResolver;
    this.currentSheetResolver = currentSheetResolver;
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

  collectValues(args) {
    const values = [];
    for (const arg of args) {
      if (typeof arg === "string" && arg.startsWith('"') && arg.endsWith('"')) {
        values.push(arg.slice(1, -1));
      } else if (typeof arg === "string" && (arg.includes(":") || arg.includes("!") || this._resolveNamedRange(arg))) {
        const reference = this._parseReference(arg);
        if (reference.error) { values.push(reference.error); continue; }
        const coords = this.expandRange(reference.ref);
        for (const coord of coords) {
          values.push(this.getCellValue(coord, reference.sheet));
        }
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
      .map(v => typeof v === "number" ? v : Number(v.toString().replace(/[^\d.-]/g, "")))
      .filter(v => !isNaN(v));
  }

  _rangeValues(range) {
    const reference = this._parseReference(range);
    if (reference.error) return [reference.error];
    return this.expandRange(reference.ref).map(coord => this.getCellValue(coord, reference.sheet));
  }

  _rangeMatrix(range) {
    const reference = this._parseReference(range);
    if (reference.error) return [[reference.error]];
    const match = reference.ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
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
    const match = raw.match(/^(?:'((?:[^']|'')+)'|([^'!]+))!\s*(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)$/i);
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
      const funcMatch = expr.match(/^([A-Z_]+)\s*\((.*)\)$/i);
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
        const nums = rawValues.map(v => typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""))).filter(v => !isNaN(v));
        const sum = nums.reduce((acc, v) => acc + v, 0);
        return sum;
      }

      case "PRODUCT": {
        const nums = this.collectNumericValues(args);
        return nums.reduce((acc, v) => acc * v, 1);
      }

      case "AVERAGE": {
        const nums = this.collectNumericValues(args);
        if (nums.length === 0) return 0;
        const sum = nums.reduce((acc, v) => acc + v, 0);
        return Math.round((sum / nums.length) * 100) / 100;
      }

      case "MIN": {
        const nums = this.collectNumericValues(args);
        return nums.length ? Math.min(...nums) : 0;
      }

      case "MAX": {
        const nums = this.collectNumericValues(args);
        return nums.length ? Math.max(...nums) : 0;
      }

      case "COUNT": {
        const nums = this.collectNumericValues(args);
        return nums.length;
      }

      case "COUNTA": {
        const vals = this.collectValues(args).filter(v => v !== "" && v !== null && v !== undefined);
        return vals.length;
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
        const num = this.collectNumericValues([args[0]])[0] || 0;
        const div = this.collectNumericValues([args[1]])[0] || 1;
        return num % div;
      }

      // Tài chính
      case "PMT": {
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

  _evaluateArithmetic(expr) {
    // Thay thế các tọa độ ô (vd: A1, B2) thành giá trị số tương ứng
    let referenceError = false;
    const resolved = expr.replace(/(?:'(?:[^']|'')+'|[A-Za-zÀ-ỹ_][^\s!+\-*/()]*)![A-Z]+\d+|[A-Z]+\d+/gi, (token) => {
      const reference = this._parseReference(token);
      const val = reference.error || this.getCellValue(reference.ref, reference.sheet);
      if (val === "#REF!") referenceError = true;
      return typeof val === "number" ? val : 0;
    });
    if (referenceError) return "#REF!";

    // Tính toán an toàn
    if (/^[\d\s+\-*/().%^]+$/.test(resolved)) {
      // Thay thế ^ thành **
      const jsExpr = resolved.replace(/\^/g, "**");
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${jsExpr})`)();
      return typeof result === "number" ? Math.round(result * 100) / 100 : result;
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

