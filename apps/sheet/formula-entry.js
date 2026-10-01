const CELL_REFERENCE = /\$?[A-Z]{1,3}\$?\d+/g;

function isEscapedQuote(text, index) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor--) slashes++;
  return slashes % 2 === 1;
}

function outsideQuotedText(text, index) {
  let quoted = false;
  let quotedSheet = false;
  for (let cursor = 0; cursor < index; cursor++) {
    if (text[cursor] === '"' && !isEscapedQuote(text, cursor)) quoted = !quoted;
    if (text[cursor] === "'") {
      if (quotedSheet && text[cursor + 1] === "'") { cursor++; continue; }
      quotedSheet = !quotedSheet;
    }
  }
  return !quoted && !quotedSheet;
}

function scanCellReferences(formula) {
  const source = String(formula || "");
  const refs = [];
  CELL_REFERENCE.lastIndex = 0;
  let match;
  while ((match = CELL_REFERENCE.exec(source))) {
    const start = match.index;
    const end = start + match[0].length;
    const before = source[start - 1] || "";
    const after = source[end] || "";
    if (!outsideQuotedText(source, start)) continue;
    if (/[A-Za-z0-9_.]/.test(before) || /[A-Za-z0-9_.]/.test(after)) continue;
    // Do not interpret a function name such as LOG10 as a cell address.
    if (after === "(" || after === "!") continue;
    refs.push({ start, end, text: match[0] });
  }
  return refs;
}

export function isFormulaReferenceInsertionPoint(formula, selectionStart, selectionEnd = selectionStart) {
  const source = String(formula || "");
  const start = Math.max(0, Number(selectionStart) || 0);
  const end = Math.max(start, Number(selectionEnd) || start);
  if (!source.startsWith("=") || start !== end || !outsideQuotedText(source, start)) return false;
  const before = source.slice(0, start).match(/\S\s*$/)?.[0]?.trimEnd() || "";
  const previous = before.slice(-1);
  if (/[=(,+\-*/^&;:]$/.test(previous)) return true;
  return scanCellReferences(source.slice(0, start)).some(ref => ref.end === start);
}

export function quoteSheetName(sheetName) {
  const name = String(sheetName || "");
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(name)
    ? name
    : `'${name.replace(/'/g, "''")}'`;
}

export function insertFunctionSuggestion(formula, tokenStart, tokenEnd, functionName) {
  const source = String(formula || "");
  const start = Math.max(0, Number(tokenStart) || 0);
  const end = Math.max(start, Number(tokenEnd) || start);
  const inserted = `${String(functionName || "").toUpperCase()}(`;
  const value = source.slice(0, start) + inserted + source.slice(end);
  return { formula: value, caret: start + inserted.length };
}

export function makeCellReference(col, row, sheetName = "", currentSheet = "") {
  const address = `${col}${row}`;
  return sheetName && sheetName !== currentSheet
    ? `${quoteSheetName(sheetName)}!${address}`
    : address;
}

export function insertPointReference(formula, selectionStart, selectionEnd, address, options = {}) {
  const source = String(formula || "");
  const start = Math.max(0, Number(selectionStart) || 0);
  const end = Math.max(start, Number(selectionEnd) || start);
  const ref = String(address || "");
  if (!ref) return { formula: source, caret: start, reference: null };

  const previous = scanCellReferences(source.slice(0, start)).at(-1);
  if (options.extendFrom) {
    const extendStart = Math.max(0, Number(options.extendFrom.start) || 0);
    const extendEnd = Math.max(extendStart, Number(options.extendFrom.end) || extendStart);
    const oldToken = source.slice(extendStart, extendEnd);
    const oldStart = oldToken.split(":")[0];
    const sameSheet = oldStart.includes("!") && ref.includes("!") && oldStart.slice(0, oldStart.lastIndexOf("!") + 1) === ref.slice(0, ref.lastIndexOf("!") + 1);
    const rangeEnd = sameSheet ? ref.slice(ref.lastIndexOf("!") + 1) : ref;
    const token = `${oldStart}:${rangeEnd}`;
    const next = source.slice(0, extendStart) + token + source.slice(extendEnd);
    return {
      formula: next,
      caret: extendStart + token.length,
      reference: { start: extendStart, end: extendStart + token.length }
    };
  }

  const prefix = options.additive && !options.replace && previous && previous.end === start ? "," : "";
  const insertion = `${prefix}${ref}`;
  const next = source.slice(0, start) + insertion + source.slice(end);
  return {
    formula: next,
    caret: start + insertion.length,
    reference: { start: start + prefix.length, end: start + insertion.length }
  };
}

export function findFormulaReferences(formula, activeSheet = "") {
  const source = String(formula || "");
  const tokens = [];
  const sheetPrefix = /(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_.]*))!/g;
  let prefix;
  const sheetRanges = [];
  while ((prefix = sheetPrefix.exec(source))) {
    sheetRanges.push({ start: prefix.index, end: sheetPrefix.lastIndex, sheet: (prefix[1] || prefix[2]).replace(/''/g, "'") });
  }

  for (const ref of scanCellReferences(source)) {
    const qualified = sheetRanges.find(item => item.end === ref.start);
    const rangeSuffix = source.slice(ref.end).match(/^\s*:\s*(\$?[A-Z]{1,3}\$?\d+)/i);
    const endCell = rangeSuffix ? { text: rangeSuffix[1], end: rangeSuffix[0].length } : null;
    const end = endCell ? ref.end + endCell.end : ref.end;
    const sheet = qualified?.sheet || activeSheet;
    if (!qualified && tokens.some(item => item.end > ref.start)) continue;
    tokens.push({
      start: qualified ? qualified.start : ref.start,
      end,
      startCell: ref.text,
      endCell: endCell?.text || ref.text,
      sheet,
      qualified: !!qualified
    });
  }
  return tokens;
}

function parseReference(address) {
  const match = String(address || "").match(/^(\$?)([A-Z]{1,3})(\$?)(\d+)$/i);
  if (!match) return null;
  return { colAbsolute: !!match[1], col: match[2].toUpperCase(), rowAbsolute: !!match[3], row: Number(match[4]) };
}

function columnNumber(label) {
  let number = 0;
  for (const char of label) number = number * 26 + char.charCodeAt(0) - 64;
  return number;
}

function columnLabel(number) {
  let label = "";
  while (number > 0) {
    const remainder = (number - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    number = Math.floor((number - 1) / 26);
  }
  return label;
}

export function cycleAbsoluteReference(formula, caret) {
  const source = String(formula || "");
  const position = Math.max(0, Number(caret) || 0);
  const refs = scanCellReferences(source);
  const ref = refs.find(item => item.start <= position && position <= item.end) ||
    [...refs].reverse().find(item => item.end <= position);
  if (!ref) return { formula: source, caret: position, changed: false };
  const parts = parseReference(ref.text);
  if (!parts) return { formula: source, caret: position, changed: false };
  const cycle = [
    [true, true], [false, true], [true, false], [false, false]
  ];
  const current = cycle.findIndex(([colAbs, rowAbs]) => colAbs === parts.colAbsolute && rowAbs === parts.rowAbsolute);
  const [colAbsolute, rowAbsolute] = cycle[(current + 1) % cycle.length];
  const nextRef = `${colAbsolute ? "$" : ""}${parts.col}${rowAbsolute ? "$" : ""}${parts.row}`;
  const next = source.slice(0, ref.start) + nextRef + source.slice(ref.end);
  return { formula: next, caret: ref.start + nextRef.length, changed: true, reference: { start: ref.start, end: ref.start + nextRef.length } };
}

export function movePointReference(formula, reference, deltaCol, deltaRow) {
  if (!reference) return null;
  const source = String(formula || "");
  const start = Number(reference.start);
  const end = Number(reference.end);
  const token = source.slice(start, end);
  const lastCell = token.split(":").at(-1);
  const qualifierAt = lastCell.lastIndexOf("!");
  const qualifier = qualifierAt >= 0 ? lastCell.slice(0, qualifierAt + 1) : "";
  const parts = parseReference(qualifierAt >= 0 ? lastCell.slice(qualifierAt + 1) : lastCell);
  if (!parts) return null;
  const nextCol = parts.colAbsolute ? parts.col : columnLabel(Math.max(1, columnNumber(parts.col) + deltaCol));
  const nextRow = parts.rowAbsolute ? parts.row : Math.max(1, parts.row + deltaRow);
  const nextCell = `${parts.colAbsolute ? "$" : ""}${nextCol}${parts.rowAbsolute ? "$" : ""}${nextRow}`;
  const qualifiedNextCell = `${qualifier}${nextCell}`;
  const nextToken = token.includes(":") ? `${token.split(":")[0]}:${qualifiedNextCell}` : qualifiedNextCell;
  const next = source.slice(0, start) + nextToken + source.slice(end);
  return { formula: next, caret: start + nextToken.length, reference: { start, end: start + nextToken.length }, address: nextCell };
}

export function autoCloseFormulaParentheses(formula) {
  const source = String(formula || "");
  let quoted = false;
  let depth = 0;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"' && !isEscapedQuote(source, index)) {
      if (quoted && source[index + 1] === '"') { index++; continue; }
      quoted = !quoted;
      continue;
    }
    if (quoted) continue;
    if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
  }
  return depth > 0 ? source + ")".repeat(depth) : source;
}

export class FormulaEntrySession {
  constructor({ original = "", value = original, caret = String(value).length, mode = "edit", sheet = "", coord = null } = {}) {
    this.original = original;
    this.value = String(value ?? "");
    this.caret = caret;
    this.mode = mode;
    this.sheet = sheet;
    this.coord = coord ? { ...coord } : null;
    this.lastReference = null;
    this.drag = null;
  }

  update(value, caret = String(value ?? "").length) {
    this.value = String(value ?? "");
    this.caret = caret;
    this.lastReference = null;
    return this.value;
  }

  insertPoint(address, { shift = false, ctrl = false } = {}) {
    const result = insertPointReference(this.value, this.caret, this.caret, address, {
      extendFrom: shift ? this.lastReference : null,
      additive: ctrl
    });
    this.value = result.formula;
    this.caret = result.caret;
    this.lastReference = result.reference;
    return result;
  }

  beginDrag(address, { start = this.caret, end = this.caret, shift = false, ctrl = false } = {}) {
    const extendFrom = shift ? this.lastReference : null;
    const initial = extendFrom
      ? insertPointReference(this.value, start, end, address, { extendFrom })
      : insertPointReference(this.value, start, end, address, { replace: !ctrl, additive: ctrl });
    this.drag = {
      baseValue: this.value,
      start,
      end,
      extendFrom: extendFrom ? { ...extendFrom } : null,
      additive: ctrl,
      firstAddress: address,
      address
    };
    this.value = initial.formula;
    this.caret = initial.caret;
    this.lastReference = initial.reference;
    return initial;
  }

  updateDrag(address) {
    if (!this.drag) return null;
    const stripSameSheetPrefix = (first, last) => {
      if (!first.includes("!") || !last.includes("!")) return last;
      const firstPrefix = first.slice(0, first.lastIndexOf("!") + 1);
      return last.startsWith(firstPrefix) ? last.slice(firstPrefix.length) : last;
    };
    const rangeAddress = this.drag.extendFrom
      ? address
      : this.drag.firstAddress === address
        ? address
        : `${this.drag.firstAddress}:${stripSameSheetPrefix(this.drag.firstAddress, address)}`;
    const result = this.drag.extendFrom
      ? insertPointReference(this.drag.baseValue, this.drag.start, this.drag.end, rangeAddress, { extendFrom: this.drag.extendFrom })
      : insertPointReference(this.drag.baseValue, this.drag.start, this.drag.end, rangeAddress, { replace: !this.drag.additive, additive: this.drag.additive });
    this.value = result.formula;
    this.caret = result.caret;
    this.lastReference = result.reference;
    this.drag.address = address;
    return result;
  }

  endDrag() {
    this.drag = null;
  }

  cycleReference() {
    const result = cycleAbsoluteReference(this.value, this.caret);
    if (result.changed) {
      this.value = result.formula;
      this.caret = result.caret;
      this.lastReference = result.reference;
    }
    return result;
  }

  moveReference(deltaCol, deltaRow) {
    const result = movePointReference(this.value, this.lastReference, deltaCol, deltaRow);
    if (!result) return null;
    this.value = result.formula;
    this.caret = result.caret;
    this.lastReference = result.reference;
    return result;
  }

  commit() {
    if (this.value.startsWith("=")) this.value = autoCloseFormulaParentheses(this.value);
    this.caret = this.value.length;
    return this.value;
  }

  cancel() {
    return this.original;
  }
}
