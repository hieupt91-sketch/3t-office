/**
 * 3T Sheet — Evaluate Formula stepper.
 *
 * FormulaEngine.evaluate() chỉ trả kết quả cuối (hàm lồng nhau được
 * _resolveSingleValue gọi đệ quy). Module này không viết lại engine:
 * quét chuỗi công thức để tìm nhóm trong-ra-ngoài (hàm trong cùng,
 * so sánh, nhánh IF, phép toán), rồi gọi engine.evaluate /
 * _evaluateCondition trên đúng đoạn đó để lấy giá trị trung gian thật.
 */

import { NumberFormatter } from "./number-formatter.js";

const COMP_OPS = [">=", "<=", "<>", "!=", ">", "<", "="];
const ERROR_RE = /^#(?:N\/A|VALUE!|REF!|DIV\/0!|NUM!|NAME\?|LỖI!)/i;
const CELL_REF_RE = /^(?:(?:'[^']+'|[A-Za-z0-9_.]+)!)?\$?[A-Z]+\$?\d+$/i;
const RANGE_RE = /^(?:(?:'[^']+'|[A-Za-z0-9_.]+)!)?\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+$/i;
const COL_RANGE_RE = /^(?:(?:'[^']+'|[A-Za-z0-9_.]+)!)?\$?[A-Z]+:\$?[A-Z]+$/i;
const NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const MAX_STEPS = 64;

export function formatFormulaValue(value) {
  if (value === true || String(value).toUpperCase() === "TRUE") return "TRUE";
  if (value === false || String(value).toUpperCase() === "FALSE") return "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "#NUM!";
    return NumberFormatter.formatGeneralNumber(value);
  }
  if (value == null) return "0";
  return String(value);
}

export function valueToFormulaToken(value) {
  if (value === true || String(value).toUpperCase() === "TRUE") return "TRUE";
  if (value === false || String(value).toUpperCase() === "FALSE") return "FALSE";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "#NUM!";
    return NumberFormatter.formatGeneralNumber(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (ERROR_RE.test(trimmed)) return trimmed;
    if (trimmed.toUpperCase() === "TRUE" || trimmed.toUpperCase() === "FALSE") return trimmed.toUpperCase();
    if (NUMBER_RE.test(trimmed)) return trimmed;
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed;
    return `"${trimmed.replace(/"/g, '""')}"`;
  }
  if (value == null) return "0";
  return String(value);
}

export function valuesMatch(left, right) {
  if (left === right) return true;
  const a = formatFormulaValue(left);
  const b = formatFormulaValue(right);
  if (a === b) return true;
  const na = Number(left);
  const nb = Number(right);
  if (Number.isFinite(na) && Number.isFinite(nb)) return Math.abs(na - nb) < 1e-9;
  return String(a).toUpperCase() === String(b).toUpperCase();
}

export function isLiteralToken(text) {
  const token = String(text || "").trim();
  if (!token) return false;
  if (token.toUpperCase() === "TRUE" || token.toUpperCase() === "FALSE") return true;
  if (ERROR_RE.test(token)) return true;
  if (NUMBER_RE.test(token)) return true;
  if (token.startsWith('"') && token.endsWith('"') && token.length >= 2) return true;
  return false;
}

export function isCellRefToken(text) {
  return CELL_REF_RE.test(String(text || "").trim());
}

function isRangeToken(text) {
  const token = String(text || "").trim();
  return RANGE_RE.test(token) || COL_RANGE_RE.test(token);
}

function findMatchingParen(expr, openIndex) {
  let depth = 0;
  let inQuotes = false;
  for (let i = openIndex; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function trimmedArgSpan(text, from, to) {
  const raw = text.slice(from, to);
  const lead = raw.match(/^\s*/)?.[0].length || 0;
  const trail = raw.match(/\s*$/)?.[0].length || 0;
  return {
    text: raw.trim(),
    start: from + lead,
    end: to - trail,
    raw
  };
}

export function splitArgsWithOffsets(argsStr) {
  const args = [];
  let curStart = 0;
  let parenDepth = 0;
  let inQuotes = false;
  const text = String(argsStr || "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "(" && !inQuotes) parenDepth++;
    else if (char === ")" && !inQuotes) parenDepth--;
    else if ((char === "," || char === ";") && parenDepth === 0 && !inQuotes) {
      args.push(trimmedArgSpan(text, curStart, i));
      curStart = i + 1;
    }
  }
  args.push(trimmedArgSpan(text, curStart, text.length));
  return args.filter(arg => arg.text !== "" || args.length === 1);
}

export function findAllFunctions(expr) {
  const results = [];
  const text = String(expr || "");
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (/[A-Za-z_]/.test(text[i])) {
      let j = i + 1;
      while (j < text.length && /[A-Za-z0-9_.]/.test(text[j])) j++;
      let k = j;
      while (k < text.length && text[k] === " ") k++;
      if (text[k] === "(") {
        const close = findMatchingParen(text, k);
        if (close !== -1) {
          results.push({
            start: i,
            end: close + 1,
            name: text.slice(i, j).toUpperCase(),
            openParen: k,
            closeParen: close,
            inner: text.slice(k + 1, close),
            text: text.slice(i, close + 1)
          });
          i = k;
          continue;
        }
      }
      i = j - 1;
    }
  }
  return results;
}

function hasNestedFunction(fn, all) {
  return all.some(other => other.start > fn.start && other.end < fn.end);
}

function innermostFunctions(expr) {
  const all = findAllFunctions(expr);
  return all.filter(fn => !hasNestedFunction(fn, all));
}

function findComparisonSpan(expr) {
  const text = String(expr || "");
  let inQuotes = false;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth !== 0) continue;
    for (const op of COMP_OPS) {
      if (!text.startsWith(op, i)) continue;
      const leftStart = findOperandStart(text, i);
      const rightEnd = findOperandEnd(text, i + op.length);
      const left = text.slice(leftStart, i).trim();
      const right = text.slice(i + op.length, rightEnd).trim();
      if (!left || !right) continue;
      if (findAllFunctions(left).length || findAllFunctions(right).length) continue;
      return {
        start: leftStart,
        end: rightEnd,
        text: text.slice(leftStart, rightEnd).trim(),
        kind: "comparison",
        op
      };
    }
  }
  return null;
}

function findOperandStart(expr, opIndex) {
  let depth = 0;
  let inQuotes = false;
  let start = 0;
  for (let i = 0; i < opIndex; i++) {
    const ch = expr[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if ((ch === "," || ch === ";") && depth === 0) start = i + 1;
  }
  while (start < opIndex && expr[start] === " ") start++;
  return start;
}

function findOperandEnd(expr, afterOp) {
  let depth = 0;
  let inQuotes = false;
  for (let i = afterOp; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "(") depth++;
    else if (ch === ")") {
      if (depth === 0) return i;
      depth--;
    } else if ((ch === "," || ch === ";") && depth === 0) return i;
  }
  return expr.length;
}

function findArithmeticSpan(expr) {
  const args = splitArgsWithOffsets(expr);
  const candidates = args.length ? args : [{ text: String(expr || "").trim(), start: 0, end: String(expr || "").length }];
  for (const arg of candidates) {
    const token = arg.text.trim();
    if (!token || isLiteralToken(token) || isCellRefToken(token) || isRangeToken(token)) continue;
    if (findAllFunctions(token).length) continue;
    if (findComparisonSpan(token)) continue;
    if (/[+\-*/^]/.test(token) && /[A-Z0-9)]/i.test(token)) {
      let start = arg.start;
      const raw = String(expr).slice(arg.start, arg.end);
      const lead = raw.match(/^\s*/)?.[0].length || 0;
      const trail = raw.match(/\s*$/)?.[0].length || 0;
      start += lead;
      return {
        start,
        end: arg.end - trail,
        text: token,
        kind: "arithmetic"
      };
    }
  }
  return null;
}

function offsetSpan(span, delta) {
  if (!span) return null;
  return { ...span, start: span.start + delta, end: span.end + delta };
}

function tryLogicalShortcut(fn) {
  const args = splitArgsWithOffsets(fn.inner);
  if (fn.name === "IF") {
    if (args.length < 2) return null;
    const cond = args[0].text.trim().toUpperCase();
    if (cond !== "TRUE" && cond !== "FALSE") return null;
    const branchArg = cond === "TRUE" ? args[1] : (args[2] || { text: "FALSE", start: args[0].end, end: args[0].end });
    const innerStart = fn.openParen + 1;
    if (isLiteralToken(branchArg.text)) {
      return { start: fn.start, end: fn.end, text: fn.text, kind: "function", name: fn.name };
    }
    return {
      start: innerStart + branchArg.start,
      end: innerStart + branchArg.end,
      text: branchArg.text,
      kind: "branch"
    };
  }
  if (fn.name === "IFERROR" || fn.name === "IFNA") {
    if (args.length < 2) return null;
    if (!isLiteralToken(args[0].text)) return null;
    const first = args[0].text.trim();
    const isCaught = fn.name === "IFNA" ? first === "#N/A" : ERROR_RE.test(first);
    const innerStart = fn.openParen + 1;
    if (isCaught) {
      if (isLiteralToken(args[1].text)) {
        return { start: fn.start, end: fn.end, text: fn.text, kind: "function", name: fn.name };
      }
      return {
        start: innerStart + args[1].start,
        end: innerStart + args[1].end,
        text: args[1].text,
        kind: "branch"
      };
    }
    return { start: fn.start, end: fn.end, text: fn.text, kind: "function", name: fn.name };
  }
  return null;
}

/**
 * Tìm đoạn sẽ được ước lượng tiếp theo (innermost, trái sang phải).
 * @param {string} displayFormula Công thức đang hiển thị, thường bắt đầu bằng =
 * @returns {{ start: number, end: number, text: string, kind: string } | null}
 */
export function findNextEvaluationSpan(displayFormula) {
  const display = String(displayFormula || "");
  const prefix = display.match(/^=\s*/)?.[0] || "";
  const expr = display.slice(prefix.length);
  const prefixLen = prefix.length;
  if (!expr.trim() || isLiteralToken(expr)) return null;

  const innerFns = innermostFunctions(expr);
  if (innerFns.length) {
    const fn = innerFns[0];
    const innerOrigin = prefixLen + fn.openParen + 1;
    if (fn.name === "IF" || fn.name === "IFERROR" || fn.name === "IFNA") {
      const args = splitArgsWithOffsets(fn.inner);
      const first = args[0];
      if (first && !isLiteralToken(first.text)) {
        const condComp = findComparisonSpan(first.text);
        if (condComp) return offsetSpan(condComp, innerOrigin + first.start);
        const condArith = findArithmeticSpan(first.text);
        if (condArith) return offsetSpan(condArith, innerOrigin + first.start);
        if (isCellRefToken(first.text)) {
          return offsetSpan({ start: first.start, end: first.end, text: first.text, kind: "reference" }, innerOrigin);
        }
      }
      const shortcut = tryLogicalShortcut(fn);
      if (shortcut) return offsetSpan(shortcut, prefixLen);
      return offsetSpan({ start: fn.start, end: fn.end, text: fn.text, kind: "function", name: fn.name }, prefixLen);
    }
    const innerComp = findComparisonSpan(fn.inner);
    if (innerComp) return offsetSpan(innerComp, innerOrigin);
    const innerArith = findArithmeticSpan(fn.inner);
    if (innerArith) return offsetSpan(innerArith, innerOrigin);
    return offsetSpan({ start: fn.start, end: fn.end, text: fn.text, kind: "function", name: fn.name }, prefixLen);
  }

  const comparison = findComparisonSpan(expr);
  if (comparison) return offsetSpan(comparison, prefixLen);

  const arithmetic = findArithmeticSpan(expr);
  if (arithmetic) return offsetSpan(arithmetic, prefixLen);

  const trimmed = expr.trim();
  if (isCellRefToken(trimmed)) {
    const start = prefixLen + expr.indexOf(trimmed);
    return { start, end: start + trimmed.length, text: trimmed, kind: "reference" };
  }

  return {
    start: prefixLen,
    end: prefixLen + expr.length,
    text: expr,
    kind: "expression"
  };
}

function parseCellRef(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^(?:'([^']+)'|([A-Za-z0-9_.]+))!(\$?[A-Z]+\$?\d+)$/i);
  if (match) {
    return {
      sheet: match[1] || match[2],
      coord: match[3].replace(/\$/g, "").toUpperCase()
    };
  }
  if (CELL_REF_RE.test(raw)) {
    return { sheet: null, coord: raw.replace(/\$/g, "").toUpperCase() };
  }
  return null;
}

export class EvaluateFormulaSession {
  /**
   * @param {{ formula: string, coord?: string, sheetName?: string, engine: object, getCell?: Function, cellValue?: any }} options
   */
  constructor(options = {}) {
    this.engine = options.engine;
    this.getCell = typeof options.getCell === "function" ? options.getCell : () => null;
    this.originalFormula = String(options.formula || "").trim();
    this.originalCoord = options.coord || "";
    this.originalSheet = options.sheetName || "";
    this.originalCellValue = options.cellValue;
    this.display = this.originalFormula.startsWith("=") ? this.originalFormula : "";
    this.coord = this.originalCoord;
    this.sheetName = this.originalSheet;
    this.steps = [];
    this.referenceStack = [];
    this.error = this.originalFormula.startsWith("=") ? "" : "not-formula";
  }

  _currentUnderline() {
    if (this.error || !this.display) return null;
    return findNextEvaluationSpan(this.display);
  }

  _cellHasFormula(span) {
    if (!span || (span.kind !== "reference" && !isCellRefToken(span.text))) return false;
    const ref = parseCellRef(span.text);
    if (!ref) return false;
    const cell = this.getCell(ref.coord, ref.sheet || this.sheetName);
    const formula = cell?.formula || "";
    return typeof formula === "string" && formula.startsWith("=");
  }

  getState() {
    const underline = this.error ? null : this._currentUnderline();
    const done = !this.error && !underline;
    let finalValue = null;
    if (done) {
      const token = this.display.replace(/^=\s*/, "").trim();
      if (token.toUpperCase() === "TRUE") finalValue = true;
      else if (token.toUpperCase() === "FALSE") finalValue = false;
      else if (NUMBER_RE.test(token)) finalValue = Number(token);
      else if (token.startsWith('"') && token.endsWith('"')) finalValue = token.slice(1, -1).replace(/""/g, '"');
      else finalValue = token;
    }
    return {
      formula: this.display,
      originalFormula: this.originalFormula,
      coord: this.coord,
      sheetName: this.sheetName,
      underline,
      underlinedText: underline ? this.display.slice(underline.start, underline.end) : "",
      canEvaluate: Boolean(underline),
      canStepIn: this._cellHasFormula(underline),
      canStepOut: this.referenceStack.length > 0,
      done,
      error: this.error,
      finalValue,
      cellValue: this.originalCellValue,
      steps: this.steps.slice(),
      referenceStack: this.referenceStack.map(item => ({ coord: item.coord, formula: item.formula }))
    };
  }

  _evaluateSpan(span) {
    const text = span.text.trim();
    if (span.kind === "comparison") {
      return this.engine._evaluateCondition(text);
    }
    if (span.kind === "reference" || isCellRefToken(text)) {
      return this.engine.evaluate(`=${text}`);
    }
    if (/^[A-Z_.]+\s*\(/i.test(text) || /[+\-*/^]/.test(text) || span.kind === "function" || span.kind === "arithmetic" || span.kind === "branch" || span.kind === "expression") {
      const viaEval = this.engine.evaluate(`=${text}`);
      if (viaEval !== "#VALUE!" && viaEval !== "#LỖI!") return viaEval;
      if (findComparisonSpan(text)) return this.engine._evaluateCondition(text);
      return viaEval;
    }
    if (isLiteralToken(text)) {
      if (text.toUpperCase() === "TRUE") return true;
      if (text.toUpperCase() === "FALSE") return false;
      if (NUMBER_RE.test(text)) return Number(text);
      return text;
    }
    return this.engine.evaluate(`=${text}`);
  }

  evaluate() {
    if (this.steps.length >= MAX_STEPS) return this.getState();
    const state = this.getState();
    if (!state.canEvaluate) return this.getState();
    const span = state.underline;
    const value = this._evaluateSpan(span);
    const token = valueToFormulaToken(value);
    const before = this.display;
    const after = `${before.slice(0, span.start)}${token}${before.slice(span.end)}`;
    this.steps.push({
      before,
      underlined: span.text,
      kind: span.kind,
      value,
      token,
      after
    });
    this.display = after;
    return this.getState();
  }

  stepIn() {
    const state = this.getState();
    if (!state.canStepIn) return this.getState();
    const ref = parseCellRef(state.underlinedText);
    const cell = this.getCell(ref.coord, ref.sheet || this.sheetName);
    this.referenceStack.push({
      display: this.display,
      coord: this.coord,
      sheetName: this.sheetName,
      formula: this.display,
      steps: this.steps.slice()
    });
    this.display = cell.formula;
    this.coord = ref.coord;
    this.sheetName = ref.sheet || this.sheetName;
    this.steps = [];
    return this.getState();
  }

  stepOut() {
    if (!this.referenceStack.length) return this.getState();
    const prev = this.referenceStack.pop();
    this.display = prev.display;
    this.coord = prev.coord;
    this.sheetName = prev.sheetName;
    this.steps = prev.steps;
    return this.getState();
  }

  restart() {
    this.display = this.originalFormula.startsWith("=") ? this.originalFormula : "";
    this.coord = this.originalCoord;
    this.sheetName = this.originalSheet;
    this.steps = [];
    this.referenceStack = [];
    this.error = this.originalFormula.startsWith("=") ? "" : "not-formula";
    return this.getState();
  }
}

export function escapeFormulaHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

export function renderFormulaHtml(display, underline) {
  const text = String(display || "");
  if (!underline) return escapeFormulaHtml(text);
  const before = escapeFormulaHtml(text.slice(0, underline.start));
  const mid = escapeFormulaHtml(text.slice(underline.start, underline.end));
  const after = escapeFormulaHtml(text.slice(underline.end));
  return `${before}<span class="vno-eval-underline">${mid}</span>${after}`;
}

export function createEvaluateFormulaSession(options) {
  return new EvaluateFormulaSession(options);
}

export function createEvaluateFormulaSessionFromGrid(grid) {
  const coord = `${grid.selectedCoord.c}${grid.selectedCoord.r}`;
  const item = grid.cellsData.get(coord);
  return createEvaluateFormulaSession({
    formula: item?.formula || "",
    coord,
    sheetName: grid.activeSheet,
    engine: grid.formulaEngine,
    cellValue: item?.val,
    getCell: (ref, sheet) => {
      const key = String(ref || "").replace(/\$/g, "").toUpperCase();
      const map = sheet && grid.sheetsData?.[sheet] ? grid.sheetsData[sheet] : grid.cellsData;
      return map?.get(key) || null;
    }
  });
}

export { MAX_STEPS };
