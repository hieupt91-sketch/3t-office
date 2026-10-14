/**
 * Bộ phân tích biểu thức công thức (EXCEL-E1d).
 *
 * FormulaEngine trước đây chỉ tính được: một hàm đơn lẻ, phép toán giữa các ô/hằng số, hoặc `F(..)` lồng
 * trong đối số. Biểu thức trộn hàm với toán tử (=SUM(A1:A3)*2, =MAX(A1:A3)-MIN(A1:A3), =ROUND(A1,2)+1)
 * bị tính sai hoặc #VALUE!. Module này phân tích đúng thứ tự ưu tiên của Excel và gọi lại engine cho từng toán hạng:
 *   so sánh (= <> < > <= >=)  <  &  <  + -  <  * /  <  ^  <  % (hậu tố)  <  dấu âm/dương đơn ngôi  <  toán hạng.
 * (Excel: dấu âm đơn ngôi ưu tiên hơn ^, nên -2^2 = 4.)
 */

const REF_BODY = /\$?[A-Za-z]{1,3}\$?\d+:\$?[A-Za-z]{1,3}\$?\d+(?![A-Za-z0-9_.(!:])|\$?[A-Za-z]{1,3}\$?\d+(?![A-Za-z0-9_.(!:])|\$?[A-Za-z]{1,3}:\$?[A-Za-z]{1,3}(?![A-Za-z0-9_.(!:])|\$?\d+:\$?\d+(?![A-Za-z0-9_.(!:])/y;
const IDENT_START = /[A-Za-z_À-ỹ$]/;
const IDENT_CHAR = /[A-Za-z0-9_.À-ỹ$]/;
const ERROR_LITERAL = /#(?:N\/A|VALUE!|REF!|DIV\/0!|NUM!|NAME\?|NULL!)/iy;

export class FormulaParseError extends Error {}

function tokenize(source) {
  const tokens = [];
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let j = i + 1; let text = "";
      for (;;) {
        if (j >= n) throw new FormulaParseError("unterminated string");
        if (source[j] === '"') {
          if (source[j + 1] === '"') { text += '"'; j += 2; continue; }
          break;
        }
        text += source[j++];
      }
      tokens.push({ type: "string", value: text });
      i = j + 1; continue;
    }
    if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(source[i + 1] || ""))) {
      // Số có thể là phần đầu của tham chiếu hàng (1:1) — để REF_BODY xử lý trước.
      REF_BODY.lastIndex = i;
      const rowRef = /[0-9]/.test(ch) ? REF_BODY.exec(source) : null;
      if (rowRef && /^\$?\d+:\$?\d+$/.test(rowRef[0])) { tokens.push({ type: "ref", value: rowRef[0] }); i += rowRef[0].length; continue; }
      const match = /(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
      match.lastIndex = i;
      const found = match.exec(source);
      tokens.push({ type: "number", value: Number(found[0]) });
      i += found[0].length; continue;
    }
    if (ch === "#") {
      ERROR_LITERAL.lastIndex = i;
      const found = ERROR_LITERAL.exec(source);
      if (!found) throw new FormulaParseError("bad error literal");
      tokens.push({ type: "error", value: found[0].toUpperCase() });
      i += found[0].length; continue;
    }
    if (ch === "'" || IDENT_START.test(ch)) {
      // 1. Tham chiếu trần (A1, $A$1, A1:B2, A:B)
      if (ch !== "'") {
        REF_BODY.lastIndex = i;
        const bare = REF_BODY.exec(source);
        if (bare) { tokens.push({ type: "ref", value: bare[0] }); i += bare[0].length; continue; }
      }
      // 2. Tên trang (có thể có nháy) + tùy chọn :TrangCuối rồi !tham chiếu
      let j = i; let sheetPart = "";
      if (ch === "'") {
        j = i + 1;
        for (;;) {
          if (j >= n) throw new FormulaParseError("unterminated sheet name");
          if (source[j] === "'") { if (source[j + 1] === "'") { j += 2; continue; } break; }
          j++;
        }
        j++; sheetPart = source.slice(i, j);
      } else {
        while (j < n && IDENT_CHAR.test(source[j])) j++;
        sheetPart = source.slice(i, j);
      }
      // Trang đầu:trang cuối (tham chiếu 3-D) dạng Sheet1:Sheet3!A1
      if (source[j] === ":") {
        const rest = source.slice(j + 1);
        const second = rest.match(/^(?:'(?:[^']|'')+'|[A-Za-z_À-ỹ][A-Za-z0-9_.À-ỹ]*)!/);
        if (second) { sheetPart += ":" + second[0].slice(0, -1); j += 1 + second[0].length - 1; }
      }
      if (source[j] === "!") {
        REF_BODY.lastIndex = j + 1;
        const body = REF_BODY.exec(source);
        if (!body) {
          // Có thể là tên được định nghĩa gắn trang hoặc #REF!
          const err = /#REF!/iy; err.lastIndex = j + 1;
          if (err.exec(source)) { tokens.push({ type: "error", value: "#REF!" }); i = j + 1 + 5; continue; }
          throw new FormulaParseError("bad sheet reference");
        }
        tokens.push({ type: "ref", value: source.slice(i, j + 1) + body[0] });
        i = j + 1 + body[0].length; continue;
      }
      if (ch === "'") throw new FormulaParseError("quoted name without !");
      // 3. Hàm NAME( ... ) với ngoặc cân bằng
      let k = j;
      while (k < n && /\s/.test(source[k])) k++;
      if (source[k] === "(") {
        let depth = 0; let inQuotes = false; let end = -1;
        for (let p = k; p < n; p++) {
          const c = source[p];
          if (c === '"') inQuotes = !inQuotes;
          else if (!inQuotes) {
            if (c === "(") depth++;
            else if (c === ")") { depth--; if (depth === 0) { end = p; break; } }
          }
        }
        if (end < 0) throw new FormulaParseError("unbalanced call");
        tokens.push({ type: "call", name: sheetPart, inner: source.slice(k + 1, end), text: source.slice(i, end + 1) });
        i = end + 1; continue;
      }
      const upper = sheetPart.toUpperCase();
      if (upper === "TRUE" || upper === "FALSE") { tokens.push({ type: "bool", value: upper === "TRUE" }); i = j; continue; }
      tokens.push({ type: "name", value: sheetPart });
      i = j; continue;
    }
    const two = source.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") { tokens.push({ type: "op", value: two }); i += 2; continue; }
    if ("+-*/^&=<>%(),".includes(ch)) { tokens.push({ type: "op", value: ch }); i++; continue; }
    throw new FormulaParseError(`unexpected character ${ch}`);
  }
  return tokens;
}

const isErrorValue = (engine, value) => engine._isError(value);

function toNumber(engine, value) {
  if (isErrorValue(engine, value)) return { error: String(value) };
  if (value === null || value === undefined || value === "") return { n: 0 };
  if (typeof value === "number") return Number.isFinite(value) ? { n: value } : { error: "#NUM!" };
  if (typeof value === "boolean") return { n: value ? 1 : 0 };
  if (value && value.isTextCell) return { error: "#VALUE!" };
  const parsed = engine._parseNumberOrCurrency(value);
  if (parsed === null || parsed === undefined || Number.isNaN(parsed)) return { error: "#VALUE!" };
  return { n: parsed };
}

/** Khi cả hai toán hạng đều lỗi: #REF! thắng, rồi #N/A, còn lại lấy lỗi bên trái (đối chiếu hành vi cũ đã kiểm Excel). */
function pickError(left, right) {
  if (!left) return right;
  if (!right) return left;
  const l = left.toUpperCase(); const r = right.toUpperCase();
  if (l === "#REF!" || r === "#REF!") return "#REF!";
  if (l === "#N/A" || r === "#N/A") return "#N/A";
  return left;
}

function typeRank(value) {
  if (typeof value === "number") return 1;
  if (typeof value === "boolean") return 3;
  return 2;
}

function compareValues(engine, a, b) {
  const blank = v => v === null || v === undefined || v === "";
  const aBlank = blank(a); const bBlank = blank(b);
  if (aBlank && bBlank) return 0;
  if (aBlank) a = typeof b === "number" ? 0 : typeof b === "boolean" ? false : "";
  if (bBlank) b = typeof a === "number" ? 0 : typeof a === "boolean" ? false : "";
  if (typeof a === "string" || a instanceof String) {
    const parsed = Number(a);
    if (String(a).trim() !== "" && !Number.isNaN(parsed) && typeof b === "number" && !(a && a.isTextCell)) a = parsed;
  }
  if (typeof b === "string" || b instanceof String) {
    const parsed = Number(b);
    if (String(b).trim() !== "" && !Number.isNaN(parsed) && typeof a === "number" && !(b && b.isTextCell)) b = parsed;
  }
  const ra = typeRank(a); const rb = typeRank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (ra === 1) return a < b ? -1 : a > b ? 1 : 0;
  if (ra === 3) return a === b ? 0 : (a ? 1 : -1);
  const x = String(a).toLowerCase(); const y = String(b).toLowerCase();
  if (x === y) return 0;
  return x.localeCompare(y) < 0 ? -1 : 1;
}

function operandValue(engine, token) {
  switch (token.type) {
    case "number": return token.value;
    case "string": return token.value;
    case "bool": return token.value;
    case "error": return token.value;
    case "call": {
      const name = token.name.replace(/^_xlfn\./i, "").toUpperCase();
      const value = engine._executeFunction(name, engine._splitArgs(token.inner));
      return value instanceof String ? String(value) : value;
    }
    case "ref": {
      const parsed = engine._parseReference(token.value);
      if (parsed.error) return parsed.error;
      if (parsed.sheets) return "#VALUE!";
      if (token.value.includes(":") && !token.value.startsWith("'") || /!.*:/.test(token.value)) {
        // Vùng nhiều ô dùng như toán hạng: chỉ hợp lệ khi vùng là một ô, còn lại là #VALUE! (không có giao điểm ngầm).
        const dims = engine._rangeDimensions(token.value);
        if (!dims || dims.rows !== 1 || dims.cols !== 1) return "#VALUE!";
      }
      return engine._resolveSingleValue(token.value);
    }
    case "name": {
      const resolved = engine._resolveSingleValue(token.value);
      return resolved === token.value ? "#NAME?" : resolved;
    }
    default: throw new FormulaParseError("bad operand");
  }
}

class Parser {
  constructor(engine, tokens) { this.engine = engine; this.tokens = tokens; this.pos = 0; }
  peek() { return this.tokens[this.pos]; }
  isOp(value) { const t = this.peek(); return t && t.type === "op" && t.value === value; }
  take() { return this.tokens[this.pos++]; }

  parse() {
    const value = this.comparison();
    if (this.pos < this.tokens.length) throw new FormulaParseError("trailing tokens");
    return value;
  }

  comparison() {
    let left = this.concat();
    for (;;) {
      const t = this.peek();
      if (!(t && t.type === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(t.value))) return left;
      this.take();
      const right = this.concat();
      if (isErrorValue(this.engine, left)) continue;
      if (isErrorValue(this.engine, right)) { left = right; continue; }
      const c = compareValues(this.engine, left, right);
      left = t.value === "=" ? c === 0 : t.value === "<>" ? c !== 0 : t.value === "<" ? c < 0 : t.value === ">" ? c > 0 : t.value === "<=" ? c <= 0 : c >= 0;
    }
  }

  concat() {
    let left = this.additive();
    while (this.isOp("&")) {
      this.take();
      const right = this.additive();
      if (isErrorValue(this.engine, left)) continue;
      if (isErrorValue(this.engine, right)) { left = right; continue; }
      const text = v => (typeof v === "boolean" ? (v ? "TRUE" : "FALSE") : String(v ?? ""));
      left = text(left) + text(right);
    }
    return left;
  }

  additive() {
    let left = this.multiplicative();
    for (;;) {
      const t = this.peek();
      if (!(t && t.type === "op" && (t.value === "+" || t.value === "-"))) return left;
      this.take();
      const right = this.multiplicative();
      left = this.arith(left, right, t.value);
    }
  }

  multiplicative() {
    let left = this.power();
    for (;;) {
      const t = this.peek();
      if (!(t && t.type === "op" && (t.value === "*" || t.value === "/"))) return left;
      this.take();
      const right = this.power();
      left = this.arith(left, right, t.value);
    }
  }

  power() {
    let left = this.unary();
    while (this.isOp("^")) {
      this.take();
      const right = this.unary();
      left = this.arith(left, right, "^");
    }
    return left;
  }

  unary() {
    if (this.isOp("-") || this.isOp("+")) {
      const sign = this.take().value;
      const operand = this.unary();
      if (sign === "+") return operand;
      const num = toNumber(this.engine, operand);
      if (num.error) return num.error;
      return -num.n;
    }
    return this.percent();
  }

  percent() {
    let value = this.primary();
    while (this.isOp("%")) {
      this.take();
      const num = toNumber(this.engine, value);
      value = num.error ? num.error : num.n / 100;
    }
    return value;
  }

  primary() {
    const t = this.peek();
    if (!t) throw new FormulaParseError("unexpected end");
    if (t.type === "op" && t.value === "(") {
      this.take();
      const value = this.comparison();
      if (!this.isOp(")")) throw new FormulaParseError("missing )");
      this.take();
      return value;
    }
    if (t.type === "op") throw new FormulaParseError(`unexpected ${t.value}`);
    this.take();
    return operandValue(this.engine, t);
  }

  arith(left, right, op) {
    const a = toNumber(this.engine, left);
    const b = toNumber(this.engine, right);
    if (a.error || b.error) return pickError(a.error, b.error);
    let result;
    switch (op) {
      case "+": result = a.n + b.n; break;
      case "-": result = a.n - b.n; break;
      case "*": result = a.n * b.n; break;
      case "/": if (b.n === 0) return "#DIV/0!"; result = a.n / b.n; break;
      case "^":
        if (a.n === 0 && b.n === 0) return "#NUM!";
        if (a.n === 0 && b.n < 0) return "#DIV/0!";
        if (a.n < 0 && !Number.isInteger(b.n)) {
          // Excel: căn bậc lẻ của số âm (x^(1/3)) trả về nghiệm thực; các số mũ phân số khác là #NUM!.
          const root = 1 / b.n;
          if (Math.abs(root - Math.round(root)) < 1e-12 && Math.abs(Math.round(root)) % 2 === 1) { result = -((-a.n) ** b.n); break; }
          return "#NUM!";
        }
        result = a.n ** b.n; break;
      default: throw new FormulaParseError("bad operator");
    }
    return Number.isFinite(result) ? result : "#NUM!";
  }
}

/** Số toán tử/ngoặc ở cấp cao nhất cho thấy biểu thức là hỗn hợp (không phải một hàm/ô/hằng đơn). */
export function isCompoundTokens(tokens) {
  if (tokens.length <= 1) return false;
  return true;
}

/**
 * Tính biểu thức (không có dấu = đầu). Trả về { ok: true, value } hoặc { ok: false } nếu không phân tích được
 * (engine rơi về đường cũ).
 */
export function evaluateExpression(engine, expr) {
  let tokens;
  try { tokens = tokenize(expr); } catch (error) {
    if (error instanceof FormulaParseError) return { ok: false };
    throw error;
  }
  if (!isCompoundTokens(tokens)) return { ok: false };
  try {
    return { ok: true, value: new Parser(engine, tokens).parse() };
  } catch (error) {
    if (error instanceof FormulaParseError) return { ok: false };
    throw error;
  }
}
