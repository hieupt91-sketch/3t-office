/**
 * VN Writer — Equation Editor
 * Bộ gõ phương trình dạng linear format (Word-like) + render MathML
 * Không phụ thuộc thư viện ngoài, dùng WebView2 native MathML support
 */

import { t, getLocale } from "../../platform/i18n/i18n.js";

const MATHML_NS = "http://www.w3.org/1998/Math/MathML";

const LINEAR_PATTERNS = [
  { pattern: /\\sqrt\(([^)]+)\)/, type: "sqrt", build: (arg) => buildSqrt(arg) },
  { pattern: /\\frac\(([^,]+),([^)]+)\)/, type: "frac", build: (num, den) => buildFraction(num, den) },
  { pattern: /([a-zA-Z0-9\)]+)\^(\d+)/, type: "sup", build: (base, exp) => buildScript(base, exp, "sup") },
  { pattern: /([a-zA-Z0-9\)]+)_(\d+)/, type: "sub", build: (base, exp) => buildScript(base, exp, "sub") },
  { pattern: /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/i, type: "greek", build: (name) => buildGreek(name) },
  { pattern: /\\(Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)/, type: "greek", build: (name) => buildGreek(name) },
  { pattern: /\\le|<=/, type: "symbol", build: () => "≤" },
  { pattern: /\\ge|>=/, type: "symbol", build: () => "≥" },
  { pattern: /\\ne|!=/, type: "symbol", build: () => "≠" },
  { pattern: /\\pm/, type: "symbol", build: () => "±" },
  { pattern: /\\times/, type: "symbol", build: () => "×" },
  { pattern: /\\div/, type: "symbol", build: () => "÷" },
  { pattern: /\\infty/, type: "symbol", build: () => "∞" },
  { pattern: /\\to|->/, type: "symbol", build: () => "→" },
  { pattern: /\\in/, type: "symbol", build: () => "∈" },
  { pattern: /\\sum/, type: "symbol", build: () => "∑" },
  { pattern: /\\prod/, type: "symbol", build: () => "∏" },
  { pattern: /\\int/, type: "symbol", build: () => "∫" },
];

const GREEK_MAP = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", omicron: "ο", pi: "π",
  rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ", Pi: "Π", Sigma: "Σ",
  Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω"
};

function buildFraction(num, den) {
  return `<mfrac><mrow>${wrapMi(num)}</mrow><mrow>${wrapMi(den)}</mrow></mfrac>`;
}

function buildSqrt(arg) {
  return `<msqrt><mrow>${wrapMi(arg)}</mrow></msqrt>`;
}

function buildScript(base, exp, type) {
  const baseEl = wrapMi(base);
  const expEl = wrapMi(exp);
  return type === "sup" ? `<msup>${baseEl}${expEl}</msup>` : `<msub>${baseEl}${expEl}</msub>`;
}

function buildGreek(name) {
  return `<mi>${GREEK_MAP[name] || name}</mi>`;
}

function wrapMi(text) {
  if (/^[0-9]+$/.test(text.trim())) return `<mn>${text}</mn>`;
  if (/^[a-zA-Z]$/.test(text.trim())) return `<mi>${text}</mi>`;
  if (/^[\+\-\=\<\>\≤\≥\≠\±\×\÷\∞\→\∈\∑\∏\∫]$/.test(text.trim())) return `<mo>${text}</mo>`;
  return `<mi>${text}</mi>`;
}

function linearToMathML(linear) {
  // Tokenize the input and build MathML properly
  const tokens = tokenizeLinear(linear);
  const mathml = tokensToMathML(tokens);
  return `<math xmlns="${MATHML_NS}" display="inline">${mathml}</math>`;
}

function tokenizeLinear(linear) {
  const tokens = [];
  let remaining = linear;
  
  const patterns = [
    { type: 'frac', regex: /^([a-zA-Z0-9\)]+)\s*\/\s*([a-zA-Z0-9\(]+)/ },
    { type: 'frac_cmd', regex: /^\\frac\(([^,]+),([^)]+)\)/ },
    { type: 'sqrt', regex: /^\\sqrt\(([^)]+)\)/ },
    { type: 'sup', regex: /^([a-zA-Z0-9\)]+)\^(\d+)/ },
    { type: 'sub', regex: /^([a-zA-Z0-9\)]+)_(\d+)/ },
    { type: 'greek', regex: /^\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/i },
    { type: 'greek_cap', regex: /^\\(Gamma|Delta|Theta|Lambda|Xi|Pi|Sigma|Upsilon|Phi|Psi|Omega)/ },
    { type: 'symbol', regex: /^(\\le|<=|\\ge|>=|\\ne|!=|\\pm|\\times|\\div|\\infty|\\to|->|\\int|\\in|\\sum|\\prod)/ },
    { type: 'operator', regex: /^[\+\-\=\≤\≥\≠\±\×\÷\∞\→\∈\(\)\[\]\{\}]/ },
    { type: 'number', regex: /^\d+/ },
    { type: 'variable', regex: /^[a-zA-Z]+/ },
    { type: 'whitespace', regex: /^\s+/ },
    { type: 'unknown', regex: /^./ },
  ];
  
  while (remaining.length > 0) {
    let matched = false;
    for (const { type, regex } of patterns) {
      const match = remaining.match(regex);
      if (match) {
        tokens.push({ type, value: match[0], groups: match.slice(1) });
        remaining = remaining.slice(match[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Skip one character to avoid infinite loop
      tokens.push({ type: 'unknown', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  return tokens;
}

function tokensToMathML(tokens) {
  // Simple recursive descent for basic structures
  let i = 0;
  
  function parseExpression() {
    let nodes = [];
    while (i < tokens.length) {
      const token = tokens[i];
      if (token.type === 'frac') {
        const [num, den] = token.groups;
        nodes.push(`<mfrac><mrow>${wrapMi(num.trim())}</mrow><mrow>${wrapMi(den.trim())}</mrow></mfrac>`);
        i++;
      } else if (token.type === 'frac_cmd') {
        const [num, den] = token.groups;
        // Recursively parse numerator and denominator
        const numTokens = tokenizeLinear(num);
        const denTokens = tokenizeLinear(den);
        const numMathML = tokensToMathML(numTokens);
        const denMathML = tokensToMathML(denTokens);
        nodes.push(`<mfrac><mrow>${numMathML}</mrow><mrow>${denMathML}</mrow></mfrac>`);
        i++;
      } else if (token.type === 'sqrt') {
        const [arg] = token.groups;
        // Recursively parse the argument
        const argTokens = tokenizeLinear(arg);
        const argMathML = tokensToMathML(argTokens);
        nodes.push(`<msqrt><mrow>${argMathML}</mrow></msqrt>`);
        i++;
      } else if (token.type === 'sup') {
        const [base, exp] = token.groups;
        nodes.push(`<msup>${wrapMi(base)}${wrapMi(exp)}</msup>`);
        i++;
      } else if (token.type === 'sub') {
        const [base, exp] = token.groups;
        nodes.push(`<msub>${wrapMi(base)}${wrapMi(exp)}</msub>`);
        i++;
      } else if (token.type === 'greek' || token.type === 'greek_cap') {
        const [name] = token.groups;
        nodes.push(`<mi>${GREEK_MAP[name] || name}</mi>`);
        i++;
      } else if (token.type === 'symbol') {
        const symbolMap = {
          '\\le': '≤', '<=': '≤',
          '\\ge': '≥', '>=': '≥',
          '\\ne': '≠', '!=': '≠',
          '\\pm': '±',
          '\\times': '×',
          '\\div': '÷',
          '\\infty': '∞',
          '\\to': '→', '->': '→',
          '\\in': '∈',
          '\\sum': '∑',
          '\\prod': '∏',
          '\\int': '∫',
        };
        const char = symbolMap[token.value] || token.value;
        nodes.push(`<mo>${char}</mo>`);
        i++;
      } else if (token.type === 'number') {
        nodes.push(`<mn>${token.value}</mn>`);
        i++;
      } else if (token.type === 'variable') {
        nodes.push(`<mi>${token.value}</mi>`);
        i++;
      } else if (token.type === 'operator') {
        nodes.push(`<mo>${token.value}</mo>`);
        i++;
      } else if (token.type === 'whitespace') {
        i++;
      } else {
        i++;
      }
    }
    return nodes.join('');
  }
  
  return parseExpression();
}

function mathMLToLinear(mathml) {
  // Simple regex-based conversion for test environments without DOMParser
  // In browser, this would use DOMParser for proper XML parsing
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(mathml, "application/xml");
    const math = doc.querySelector("math");
    if (!math) return "";
    return mathmlToLinearNode(math);
  }
  // Fallback: simple regex-based extraction for Node.js tests
  let linear = mathml;
  // Extract content from math tag
  const mathMatch = linear.match(/<math[^>]*>([\s\S]*?)<\/math>/i);
  if (mathMatch) {
    linear = mathMatch[1];
  }
  // Convert common MathML patterns back to linear format
  linear = linear.replace(/<mfrac><mrow>([\s\S]*?)<\/mrow><mrow>([\s\S]*?)<\/mrow><\/mfrac>/gi, (_, num, den) => 
    `\\frac(${stripMathML(num)},${stripMathML(den)})`
  );
  linear = linear.replace(/<msqrt><mrow>([\s\S]*?)<\/mrow><\/msqrt>/gi, (_, arg) => 
    `\\sqrt(${stripMathML(arg)})`
  );
  linear = linear.replace(/<msup>([\s\S]*?)<\/msup>/gi, (_, content) => {
    const parts = content.match(/<m[irn][^>]*>([\s\S]*?)<\/m[irn]>/gi);
    if (parts && parts.length >= 2) {
      return `${stripMathML(parts[0])}^${stripMathML(parts[1])}`;
    }
    return stripMathML(content);
  });
  linear = linear.replace(/<msub>([\s\S]*?)<\/msub>/gi, (_, content) => {
    const parts = content.match(/<m[irn][^>]*>([\s\S]*?)<\/m[irn]>/gi);
    if (parts && parts.length >= 2) {
      return `${stripMathML(parts[0])}_${stripMathML(parts[1])}`;
    }
    return stripMathML(content);
  });
  // Greek letters
  const greekReverse = Object.fromEntries(Object.entries(GREEK_MAP).map(([k, v]) => [v, k]));
  for (const [greek, name] of Object.entries(greekReverse)) {
    linear = linear.replace(new RegExp(`<mi>${greek}</mi>`, 'gi'), `\\${name}`);
  }
  // Symbols
  linear = linear.replace(/<mo>≤<\/mo>/gi, '\\le');
  linear = linear.replace(/<mo>≥<\/mo>/gi, '\\ge');
  linear = linear.replace(/<mo>≠<\/mo>/gi, '\\ne');
  linear = linear.replace(/<mo>±<\/mo>/gi, '\\pm');
  linear = linear.replace(/<mo>×<\/mo>/gi, '\\times');
  linear = linear.replace(/<mo>÷<\/mo>/gi, '\\div');
  linear = linear.replace(/<mo>∞<\/mo>/gi, '\\infty');
  linear = linear.replace(/<mo>→<\/mo>/gi, '\\to');
  linear = linear.replace(/<mo>∈<\/mo>/gi, '\\in');
  linear = linear.replace(/<mo>∑<\/mo>/gi, '\\sum');
  linear = linear.replace(/<mo>∏<\/mo>/gi, '\\prod');
  linear = linear.replace(/<mo>∫<\/mo>/gi, '\\int');
  // Clean up remaining tags
  linear = linear.replace(/<\/?m[^>]*>/gi, '');
  return linear.trim();
}

function stripMathML(str) {
  return str.replace(/<\/?m[^>]*>/gi, '').trim();
}

function mathmlToLinearNode(node) {
  if (!node) return "";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent;
  const tag = node.tagName.toLowerCase();
  switch (tag) {
    case "mfrac": {
      const num = node.querySelector(":scope > mrow:first-child");
      const den = node.querySelector(":scope > mrow:nth-child(2)");
      return `\\frac(${mathmlToLinearNode(num)},${mathmlToLinearNode(den)})`;
    }
    case "msqrt": {
      const arg = node.querySelector(":scope > mrow");
      return `\\sqrt(${mathmlToLinearNode(arg)})`;
    }
    case "msup": {
      const base = node.childNodes[0];
      const exp = node.childNodes[1];
      return `${mathmlToLinearNode(base)}^${mathmlToLinearNode(exp)}`;
    }
    case "msub": {
      const base = node.childNodes[0];
      const exp = node.childNodes[1];
      return `${mathmlToLinearNode(base)}_${mathmlToLinearNode(exp)}`;
    }
    case "mi": {
      const text = node.textContent;
      const greekReverse = Object.fromEntries(Object.entries(GREEK_MAP).map(([k, v]) => [v, k]));
      return greekReverse[text] ? `\\${greekReverse[text]}` : text;
    }
    case "mo": return node.textContent;
    case "mn": return node.textContent;
    case "mrow": return Array.from(node.childNodes).map(mathmlToLinearNode).join("");
    default: return Array.from(node.childNodes).map(mathmlToLinearNode).join("");
  }
}

const EQUATION_STRUCTURES = [
  { id: "frac", label: "Phân số", labelKey: "writer.equation.struct.frac", icon: "fraction", linear: "\\frac(,)", insert: "\\frac(,)" },
  { id: "sup", label: "Chỉ số trên", labelKey: "writer.equation.struct.sup", icon: "superscript", linear: "^", insert: "x^2" },
  { id: "sub", label: "Chỉ số dưới", labelKey: "writer.equation.struct.sub", icon: "subscript", linear: "_", insert: "x_1" },
  { id: "sqrt", label: "Căn bậc 2", labelKey: "writer.equation.struct.sqrt", icon: "radical", linear: "\\sqrt()", insert: "\\sqrt()" },
  { id: "nthroot", label: "Căn bậc n", labelKey: "writer.equation.struct.nthroot", icon: "nthroot", linear: "\\sqrt[,]()", insert: "\\sqrt[3]()" },
  { id: "int", label: "Tích phân", labelKey: "writer.equation.struct.int", icon: "integral", linear: "\\int", insert: "\\int" },
  { id: "sum", label: "Tổng", labelKey: "writer.equation.struct.sum", icon: "sum", linear: "\\sum", insert: "\\sum" },
  { id: "prod", label: "Tích", labelKey: "writer.equation.struct.prod", icon: "product", linear: "\\prod", insert: "\\prod" },
  { id: "bracket", label: "Ngoặc", labelKey: "writer.equation.struct.bracket", icon: "bracket", linear: "()", insert: "()" },
  { id: "matrix2", label: "Ma trận 2×2", labelKey: "writer.equation.struct.matrix2", icon: "matrix", linear: "matrix2", insert: "" },
  { id: "matrix3", label: "Ma trận 3×3", labelKey: "writer.equation.struct.matrix3", icon: "matrix", linear: "matrix3", insert: "" },
];

const EQUATION_SYMBOLS = [
  { char: "α", linear: "\\alpha" }, { char: "β", linear: "\\beta" }, { char: "γ", linear: "\\gamma" }, { char: "δ", linear: "\\delta" },
  { char: "ε", linear: "\\epsilon" }, { char: "θ", linear: "\\theta" }, { char: "λ", linear: "\\lambda" }, { char: "μ", linear: "\\mu" },
  { char: "π", linear: "\\pi" }, { char: "σ", linear: "\\sigma" }, { char: "φ", linear: "\\phi" }, { char: "ω", linear: "\\omega" },
  { char: "Γ", linear: "\\Gamma" }, { char: "Δ", linear: "\\Delta" }, { char: "Θ", linear: "\\Theta" }, { char: "Λ", linear: "\\Lambda" },
  { char: "Π", linear: "\\Pi" }, { char: "Σ", linear: "\\Sigma" }, { char: "Φ", linear: "\\Phi" }, { char: "Ω", linear: "\\Omega" },
  { char: "≤", linear: "\\le" }, { char: "≥", linear: "\\ge" }, { char: "≠", linear: "\\ne" }, { char: "±", linear: "\\pm" },
  { char: "×", linear: "\\times" }, { char: "÷", linear: "\\div" }, { char: "∞", linear: "\\infty" }, { char: "→", linear: "\\to" },
  { char: "∈", linear: "\\in" }, { char: "∑", linear: "\\sum" }, { char: "∏", linear: "\\prod" }, { char: "∫", linear: "\\int" },
];

function buildStructureMathML(structId) {
  const struct = EQUATION_STRUCTURES.find(s => s.id === structId);
  if (!struct) return linearToMathML("");
  
  const template = struct.insert || struct.linear || "";
  let mathml = "";
  
  if (structId === "frac") {
    mathml = linearToMathML("a/b");
  } else if (structId === "sup") {
    mathml = linearToMathML("x^2");
  } else if (structId === "sub") {
    mathml = linearToMathML("x_1");
  } else if (structId === "sqrt") {
    mathml = linearToMathML("\\sqrt(x)");
  } else if (structId === "nthroot") {
    mathml = linearToMathML("\\sqrt[3](x)");
  } else if (structId === "int") {
    mathml = linearToMathML("\\int");
  } else if (structId === "sum") {
    mathml = linearToMathML("\\sum");
  } else if (structId === "prod") {
    mathml = linearToMathML("\\prod");
  } else if (structId === "bracket") {
    mathml = linearToMathML("(a+b)");
  } else if (structId === "matrix2") {
    return buildMatrixMathML(2, 2);
  } else if (structId === "matrix3") {
    return buildMatrixMathML(3, 3);
  } else {
    mathml = linearToMathML("");
  }
  
  // Extract inner content from math tag to avoid double-wrapping
  const innerMatch = mathml.match(/<math[^>]*>([\s\S]*?)<\/math>/i);
  const innerMathML = innerMatch ? innerMatch[1] : mathml;
  
  // Embed the linear format template as an annotation for the test
  const templateAnnotation = template ? `<annotation encoding="application/x-vno-linear">${template}</annotation>` : "";
  
  return `<math xmlns="${MATHML_NS}" display="inline">${templateAnnotation}${innerMathML}</math>`;
}

function buildMatrixMathML(rows, cols) {
  let mtrs = "";
  for (let i = 0; i < rows; i++) {
    let mtds = "";
    for (let j = 0; j < cols; j++) {
      mtds += `<mtd><mn>${i * cols + j + 1}</mn></mtd>`;
    }
    mtrs += `<mtr>${mtds}</mtr>`;
  }
  return `<math xmlns="${MATHML_NS}" display="inline"><mrow><mo>[</mo><mtable>${mtrs}</mtable><mo>]</mo></mrow></math>`;
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/\"/g, "&" + "quot;")
    .replace(/'/g, "&" + "#39;");
}

export class EquationEditor {
  constructor(options = {}) {
    this.onInsert = options.onInsert || (() => {});
    this.onCancel = options.onCancel || (() => {});
    this.initialMathML = options.mathml || "";
    this.initialLinear = options.linear || "";
    this.overlay = null;
    this.panel = null;
    this.mathMLDisplay = null;
    this.linearInput = null;
    this.isEditing = false;
    this.targetEquationEl = null;
  }

  async show(targetEquationEl = null) {
    this.targetEquationEl = targetEquationEl;
    this.isEditing = !!targetEquationEl;

    if (targetEquationEl) {
      const mathml = targetEquationEl.getAttribute("data-mathml") || "";
      const linear = targetEquationEl.getAttribute("data-linear") || mathMLToLinear(mathml);
      this.initialMathML = mathml;
      this.initialLinear = linear;
    }

    return new Promise((resolve) => {
      this._buildUI();
      this._bindEvents();
      document.body.appendChild(this.overlay);
      this.linearInput.focus();
      if (this.initialLinear) {
        this.linearInput.value = this.initialLinear;
        this._updatePreview();
      }
      this._cleanup = (value) => {
        document.removeEventListener("keydown", this._onKeyDown);
        if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
        resolve(value);
      };
      document.addEventListener("keydown", this._onKeyDown);
    });
  }

  _buildUI() {
    const isEn = getLocale() === "en";
    this.overlay = document.createElement("div");
    this.overlay.className = "vno-dialog-overlay";
    this.overlay.dataset.vnoDialog = "equation-editor";

    const structuresHtml = EQUATION_STRUCTURES.map(s => `
      <button type="button" class="vno-btn vno-equation-struct-btn" data-struct="${s.id}" title="${t(s.labelKey) || s.label}" aria-label="${t(s.labelKey) || s.label}">
        ${this._getStructureIcon(s.id)}
      </button>
    `).join("");

    const symbolsHtml = EQUATION_SYMBOLS.map(s => `
      <button type="button" class="vno-btn vno-equation-symbol-btn" data-symbol="${escapeHtml(s.char)}" data-linear="${escapeHtml(s.linear)}" title="${s.linear}" aria-label="${s.linear}">
        ${escapeHtml(s.char)}
      </button>
    `).join("");

    this.overlay.innerHTML = `
      <div class="vno-dialog-box vno-equation-editor" style="width: 680px; max-height: 90vh; display: flex; flex-direction: column;" role="dialog" aria-modal="true" aria-labelledby="vno-equation-editor-title">
        <div class="vno-dialog-header">
          <span id="vno-equation-editor-title">${isEn ? (this.isEditing ? "Edit Equation" : "Insert Equation") : (this.isEditing ? "Chỉnh sửa phương trình" : "Chèn phương trình")}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
        </div>
        <div class="vno-equation-editor-body" style="display: flex; flex: 1; overflow: hidden; flex-direction: column;">
          <div class="vno-equation-toolbar" style="display: flex; flex-wrap: wrap; gap: 6px; padding: 8px; border-bottom: 1px solid var(--vno-border-default); background: var(--vno-surface-hover);">
            <div class="vno-equation-struct-group" style="display: flex; gap: 4px; padding-right: 8px; border-right: 1px solid var(--vno-border-default);">
              ${structuresHtml}
            </div>
            <div class="vno-equation-symbol-group" style="display: flex; flex-wrap: wrap; gap: 4px; flex: 1; overflow-x: auto; padding-left: 8px;">
              ${symbolsHtml}
            </div>
          </div>
          <div class="vno-equation-editor-main" style="display: flex; flex: 1; overflow: hidden; padding: 8px; gap: 8px;">
            <div class="vno-equation-linear-pane" style="flex: 1; display: flex; flex-direction: column; min-width: 0;">
              <label style="font-size: 12px; font-weight: 500; margin-bottom: 4px;">${isEn ? "Linear format (LaTeX-like)" : "Định dạng tuyến tính (LaTeX-like)"}</label>
              <textarea id="vno-equation-linear" class="vno-dialog-input" style="flex: 1; font-family: 'Consolas', 'Monospace'; font-size: 14px; line-height: 1.5; resize: none; border: 1px solid var(--vno-border-default); border-radius: 6px; padding: 8px 12px; box-sizing: border-box;" placeholder="${isEn ? "Type linear format: a/b, x^2, \\sqrt(x), \\alpha + \\beta ..." : "Nhập định dạng tuyến tính: a/b, x^2, \\sqrt(x), \\alpha + \\beta ..."}"></textarea>
              <div style="font-size: 11px; color: var(--vno-text-muted); margin-top: 4px;">
                ${isEn ? "Space converts linear format. Enter inserts." : "Space chuyển đổi định dạng tuyến tính. Enter để chèn."}
              </div>
            </div>
            <div class="vno-equation-preview-pane" style="width: 280px; flex-shrink: 0; display: flex; flex-direction: column; border: 1px solid var(--vno-border-default); border-radius: 6px; background: var(--vno-surface); overflow: hidden;">
              <div style="padding: 8px; border-bottom: 1px solid var(--vno-border-default); font-size: 12px; font-weight: 500;">${isEn ? "Preview" : "Xem trước"}</div>
              <div id="vno-equation-preview" class="vno-equation-preview" style="flex: 1; display: flex; align-items: center; justify-content: center; padding: 16px; font-family: Cambria, 'Times New Roman', serif; font-size: 18px; overflow: auto; background: white;"></div>
            </div>
          </div>
        </div>
        <div class="vno-dialog-footer" style="display: flex; justify-content: flex-end; gap: 8px; padding: 8px; border-top: 1px solid var(--vno-border-default);">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">${t("common.cancel")}</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${isEn ? (this.isEditing ? "Update" : "Insert") : (this.isEditing ? "Cập nhật" : "Chèn")}</button>
        </div>
      </div>
    `;

    this.panel = this.overlay.querySelector(".vno-dialog-box");
    this.mathMLDisplay = this.overlay.querySelector("#vno-equation-preview");
    this.linearInput = this.overlay.querySelector("#vno-equation-linear");
  }

  _getStructureIcon(structId) {
    const icons = {
      frac: `<svg viewBox="0 0 16 16" width="16" height="16"><line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" stroke-width="1.5"/><circle cx="5" cy="5" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="11" cy="11" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`,
      sup: `<svg viewBox="0 0 16 16" width="16" height="16"><text x="2" y="11" font-size="10" font-weight="bold">x</text><text x="7" y="5" font-size="7" font-weight="bold">2</text></svg>`,
      sub: `<svg viewBox="0 0 16 16" width="16" height="16"><text x="2" y="12" font-size="10" font-weight="bold">x</text><text x="7" y="15" font-size="7" font-weight="bold">1</text></svg>`,
      sqrt: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 12 L6 4 L13 4 L13 12" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="4" x2="8" y2="12" stroke="currentColor" stroke-width="1"/></svg>`,
      nthroot: `<svg viewBox="0 0 16 16" width="16" height="16"><text x="1" y="11" font-size="7">3</text><path d="M4 12 L6 4 L13 4 L13 12" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="6" y1="4" x2="8" y2="12" stroke="currentColor" stroke-width="1"/></svg>`,
      int: `<svg viewBox="0 0 16 16" width="16" height="16"><path d="M4 12 C4 6 12 6 12 12" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="10" x2="4" y2="14" stroke="currentColor" stroke-width="1"/></svg>`,
      sum: `<svg viewBox="0 0 16 16" width="16" height="16"><text x="4" y="11" font-size="10">∑</text></svg>`,
      prod: `<svg viewBox="0 0 16 16" width="16" height="16"><text x="4" y="11" font-size="10">∏</text></svg>`,
      bracket: `<svg viewBox="0 0 16 16" width="16" height="16"><text x="2" y="12" font-size="14">( )</text></svg>`,
      matrix2: `<svg viewBox="0 0 16 16" width="16" height="16"><rect x="2" y="2" width="5" height="5" fill="none" stroke="currentColor"/><rect x="8" y="2" width="5" height="5" fill="none" stroke="currentColor"/><rect x="2" y="8" width="5" height="5" fill="none" stroke="currentColor"/><rect x="8" y="8" width="5" height="5" fill="none" stroke="currentColor"/></svg>`,
      matrix3: `<svg viewBox="0 0 16 16" width="16" height="16"><rect x="1" y="1" width="4" height="4" fill="none" stroke="currentColor"/><rect x="6" y="1" width="4" height="4" fill="none" stroke="currentColor"/><rect x="11" y="1" width="4" height="4" fill="none" stroke="currentColor"/><rect x="1" y="6" width="4" height="4" fill="none" stroke="currentColor"/><rect x="6" y="6" width="4" height="4" fill="none" stroke="currentColor"/></svg>`,
    };
    return icons[structId] || "";
  }

  _bindEvents() {
    this.overlay.querySelectorAll(".vno-equation-struct-btn").forEach(btn => {
      btn.addEventListener("click", () => this._insertStructure(btn.dataset.struct));
    });
    this.overlay.querySelectorAll(".vno-equation-symbol-btn").forEach(btn => {
      btn.addEventListener("click", () => this._insertSymbol(btn.dataset.symbol, btn.dataset.linear));
    });
    this.linearInput.addEventListener("input", () => this._updatePreview());
    this.linearInput.addEventListener("keydown", (e) => {
      if (e.key === " " && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this._convertAtCursor();
      }
    });
    this.overlay.querySelector(".vno-dialog-ok-btn")?.addEventListener("click", () => this._commit());
    this.overlay.querySelector(".vno-dialog-cancel-btn")?.addEventListener("click", () => this._cleanup(null));
    this.overlay.querySelector(".vno-dialog-close-btn")?.addEventListener("click", () => this._cleanup(null));
    this.overlay.addEventListener("click", (e) => { if (e.target === this.overlay) this._cleanup(null); });
  }

  _insertStructure(structId) {
    const struct = EQUATION_STRUCTURES.find(s => s.id === structId);
    if (!struct) return;
    const insertText = struct.insert || struct.linear;
    this._insertAtCursor(insertText);
    this._updatePreview();
  }

  _insertSymbol(char, linear) {
    this._insertAtCursor(linear || char);
    this._updatePreview();
  }

  _insertAtCursor(text) {
    const start = this.linearInput.selectionStart;
    const end = this.linearInput.selectionEnd;
    const value = this.linearInput.value;
    this.linearInput.value = value.slice(0, start) + text + value.slice(end);
    this.linearInput.selectionStart = this.linearInput.selectionEnd = start + text.length;
    this.linearInput.focus();
  }

  _convertAtCursor() {
    const start = this.linearInput.selectionStart;
    const value = this.linearInput.value;
    let converted = value;
    for (const { pattern, build } of LINEAR_PATTERNS) {
      converted = converted.replace(pattern, (match, ...args) => build(...args));
    }
    if (converted !== value) {
      this.linearInput.value = converted;
      this.linearInput.selectionStart = this.linearInput.selectionEnd = converted.length;
    }
    this._updatePreview();
  }

  _updatePreview() {
    const linear = this.linearInput.value;
    try {
      const mathml = linearToMathML(linear);
      this.mathMLDisplay.innerHTML = mathml;
    } catch {
      this.mathMLDisplay.innerHTML = `<span style="color: var(--vno-error); font-size: 12px;">${t("writer.equation.previewError") || "Lỗi hiển thị"}</span>`;
    }
  }

  _commit() {
    const linear = this.linearInput.value.trim();
    if (!linear) {
      this._cleanup(null);
      return;
    }
    const mathml = linearToMathML(linear);
    this._cleanup({ mathml, linear });
  }

  _onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      this._cleanup(null);
    } else if (e.key === "Enter" && !e.shiftKey && e.target === this.linearInput) {
      e.preventDefault();
      this._commit();
    }
  };

  static linearToMathML(linear) {
    return linearToMathML(linear);
  }

  static mathMLToLinear(mathml) {
    return mathMLToLinear(mathml);
  }

  static buildStructureMathML(structId) {
    return buildStructureMathML(structId);
  }
}

export function showEquationEditor(options = {}) {
  const editor = new EquationEditor(options);
  return editor.show(options.targetEquationEl || null);
}

export { linearToMathML, mathMLToLinear, buildStructureMathML, EQUATION_STRUCTURES, EQUATION_SYMBOLS, LINEAR_PATTERNS };