/**
 * 3T Doc equation model. Word-like linear input becomes MathML for WebView2's
 * native renderer. This module has no renderer or parser dependencies.
 */

export const MATHML_NAMESPACE = "http://www.w3.org/1998/Math/MathML";

export const EQUATION_GREEK = Object.freeze({
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ",
  omicron: "ο", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ",
  chi: "χ", psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ",
  Xi: "Ξ", Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω"
});

export const EQUATION_SYMBOL_COMMANDS = Object.freeze({
  le: "≤", ge: "≥", ne: "≠", pm: "±", times: "×", div: "÷", infinity: "∞",
  to: "→", in: "∈", sum: "∑", prod: "∏", int: "∫", partial: "∂", approx: "≈",
  cdot: "·", forall: "∀", exists: "∃"
});

const EQUATION_SYMBOL_ALIASES = Object.freeze({
  leq: "le", geq: "ge", neq: "ne", infty: "infinity", rightarrow: "to"
});

export const EQUATION_STRUCTURES = Object.freeze([
  { id: "fraction", labelKey: "writer.equation.structure.fraction", insert: "a/b" },
  { id: "superscript", labelKey: "writer.equation.structure.superscript", insert: "x^2" },
  { id: "subscript", labelKey: "writer.equation.structure.subscript", insert: "x_1" },
  { id: "squareRoot", labelKey: "writer.equation.structure.squareRoot", insert: "\\sqrt(x)" },
  { id: "nthRoot", labelKey: "writer.equation.structure.nthRoot", insert: "\\sqrt[3](x)" },
  { id: "integral", labelKey: "writer.equation.structure.integral", insert: "\\int_{a}^{b}" },
  { id: "sum", labelKey: "writer.equation.structure.sum", insert: "\\sum_{i=1}^{n}" },
  { id: "product", labelKey: "writer.equation.structure.product", insert: "\\prod_{i=1}^{n}" },
  { id: "brackets", labelKey: "writer.equation.structure.brackets", insert: "(x + y)" },
  { id: "matrix2", labelKey: "writer.equation.structure.matrix2", insert: "\\matrix{1,2;3,4}" },
  { id: "matrix3", labelKey: "writer.equation.structure.matrix3", insert: "\\matrix{1,2,3;4,5,6;7,8,9}" }
]);

export const EQUATION_SYMBOLS = Object.freeze([
  ..."alpha beta gamma delta epsilon theta lambda mu pi sigma phi omega".split(" ")
    .map(name => ({ value: "\\" + name, symbol: EQUATION_GREEK[name] })),
  ..."Gamma Delta Theta Lambda Pi Sigma Phi Omega".split(" ")
    .map(name => ({ value: "\\" + name, symbol: EQUATION_GREEK[name] })),
  ..."le ge ne pm times div infinity to in sum prod int".split(" ")
    .map(name => ({ value: "\\" + name, symbol: EQUATION_SYMBOL_COMMANDS[name] }))
]);

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function tokensFor(source) {
  const text = String(source || "");
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    if (/\s/.test(text[index])) { index += 1; continue; }
    const match = text.slice(index).match(/^(\\[A-Za-z]+|<=|>=|!=|->|\d+(?:\.\d+)?|[A-Za-z]+|.)/s);
    if (!match) break;
    tokens.push(match[0]);
    index += match[0].length;
  }
  return tokens;
}

function node(tag, content, attrs = "") {
  return "<" + tag + attrs + ">" + escapeXml(content) + "</" + tag + ">";
}

function row(content) {
  return "<mrow>" + content + "</mrow>";
}

function parseLinear(source) {
  const tokens = tokensFor(source);
  let index = 0;
  const peek = () => tokens[index] || "";
  const take = () => tokens[index++] || "";

  function group(open, close) {
    if (peek() !== open) return "";
    take();
    const content = expression(new Set([close]));
    if (peek() === close) take();
    return content;
  }

  function argument() {
    if (peek() === "{") return group("{", "}");
    if (peek() === "(") return group("(", ")");
    return atom();
  }

  function matrix() {
    const open = peek() === "{" ? "{" : (peek() === "(" ? "(" : "");
    if (!open) return "<mi>matrix</mi>";
    const close = open === "{" ? "}" : ")";
    take();
    const rows = [];
    let cells = [];
    while (index < tokens.length && peek() !== close) {
      cells.push(expression(new Set([",", ";", close])) || "<mrow/>");
      if (peek() === ",") { take(); continue; }
      rows.push(cells);
      cells = [];
      if (peek() === ";") { take(); continue; }
      break;
    }
    if (cells.length) rows.push(cells);
    if (peek() === close) take();
    const width = Math.max(1, ...rows.map(value => value.length));
    const body = rows.map(value => "<mtr>" + Array.from(
      { length: width },
      (_unused, cell) => "<mtd>" + (value[cell] || "<mrow/>") + "</mtd>"
    ).join("") + "</mtr>").join("");
    return '<mfenced open="[" close="]"><mtable>' + body + "</mtable></mfenced>";
  }

  function command(token) {
    const rawName = token.slice(1);
    const name = EQUATION_SYMBOL_ALIASES[rawName] || rawName;
    if (name === "sqrt") {
      const degree = peek() === "[" ? group("[", "]") : "";
      const radicand = argument();
      return degree ? "<mroot>" + radicand + degree + "</mroot>" : "<msqrt>" + radicand + "</msqrt>";
    }
    if (name === "frac") {
      let numerator;
      let denominator;
      if (peek() === "(") {
        take();
        numerator = expression(new Set([","]));
        if (peek() === ",") take();
        denominator = expression(new Set([")"]));
        if (peek() === ")") take();
      } else {
        numerator = argument();
        denominator = argument();
      }
      return "<mfrac>" + row(numerator || "<mrow/>") + row(denominator || "<mrow/>") + "</mfrac>";
    }
    if (name === "matrix") return matrix();
    if (Object.hasOwn(EQUATION_GREEK, name)) return node("mi", EQUATION_GREEK[name]);
    if (Object.hasOwn(EQUATION_SYMBOL_COMMANDS, name)) {
      const symbol = EQUATION_SYMBOL_COMMANDS[name];
      const attrs = ["∑", "∏", "∫"].includes(symbol) ? ' largeop="true"' : "";
      return node("mo", symbol, attrs);
    }
    return node("mi", token);
  }

  function atom() {
    const token = take();
    if (!token) return "";
    if (token[0] === "\\") return command(token);
    if (token === "{") {
      index -= 1;
      return row(group("{", "}"));
    }
    if (token === "(") {
      const content = expression(new Set([")"]));
      if (peek() === ")") take();
      return '<mfenced open="(" close=")">' + content + "</mfenced>";
    }
    if (token === "[") {
      const content = expression(new Set(["]"]));
      if (peek() === "]") take();
      return '<mfenced open="[" close="]">' + content + "</mfenced>";
    }
    if (/^\d/.test(token)) return node("mn", token);
    if (/^[A-Za-z]+$/.test(token)) return [...token].map(char => node("mi", char)).join("");
    const operators = { "<=": "≤", ">=": "≥", "!=": "≠", "->": "→", "*": "×" };
    return node("mo", operators[token] || token);
  }

  function scripts(base) {
    let sub = "";
    let sup = "";
    while (peek() === "^" || peek() === "_") {
      const marker = take();
      const value = argument();
      if (marker === "^") sup = value;
      else sub = value;
    }
    if (base.includes('largeop="true"')) {
      if (sub && sup) return "<munderover>" + base + sub + sup + "</munderover>";
      if (sub) return "<munder>" + base + sub + "</munder>";
      if (sup) return "<mover>" + base + sup + "</mover>";
    }
    if (sub && sup) return "<msubsup>" + base + sub + sup + "</msubsup>";
    if (sup) return "<msup>" + base + sup + "</msup>";
    if (sub) return "<msub>" + base + sub + "</msub>";
    return base;
  }

  function expression(stops = new Set()) {
    const values = [];
    while (index < tokens.length && !stops.has(peek())) {
      if (peek() === "," || peek() === ";") break;
      let left = scripts(atom());
      if (!left) continue;
      while (peek() === "/") {
        take();
        const right = scripts(atom()) || "<mrow/>";
        left = "<mfrac>" + row(left) + row(right) + "</mfrac>";
      }
      values.push(left);
    }
    return values.length > 1 ? row(values.join("")) : (values[0] || "");
  }

  return expression();
}

export function linearToMathML(linear, display = "inline") {
  const mode = display === "block" ? "block" : "inline";
  return "<math xmlns=\"" + MATHML_NAMESPACE + "\" display=\"" + mode + "\">"
    + (parseLinear(linear) || "<mrow/>") + "</math>";
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

function parseMathML(mathml) {
  const root = { tag: "root", children: [] };
  const stack = [root];
  const tokens = String(mathml || "").match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
  for (const token of tokens) {
    if (token.startsWith("<!--") || /^<\?/.test(token)) continue;
    if (/^<\//.test(token)) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    if (token[0] === "<") {
      const tag = token.match(/^<([\w:-]+)/)?.[1]?.split(":").pop();
      if (!tag) continue;
      const attributes = {};
      for (const match of token.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) {
        attributes[match[1].toLowerCase()] = decodeXml(match[3]);
      }
      const child = { tag: tag.toLowerCase(), children: [], ...attributes };
      stack[stack.length - 1].children.push(child);
      if (!/\/>$/.test(token)) stack.push(child);
      continue;
    }
    stack[stack.length - 1].children.push(decodeXml(token));
  }
  return root.children.find(child => typeof child !== "string" && child.tag === "math") || root;
}

const GREEK_REVERSE = Object.freeze(Object.fromEntries(Object.entries(EQUATION_GREEK).map(([name, value]) => [value, name])));
const SYMBOL_REVERSE = Object.freeze(Object.fromEntries(Object.entries(EQUATION_SYMBOL_COMMANDS).map(([name, value]) => [value, name])));

function linearNode(value) {
  if (typeof value === "string") return value;
  const children = value.children || [];
  const render = child => linearNode(child);
  if (value.tag === "math" || value.tag === "mrow") return children.map(render).join("");
  if (value.tag === "mi") {
    const text = children.map(render).join("");
    return GREEK_REVERSE[text] ? "\\" + GREEK_REVERSE[text] : text;
  }
  if (value.tag === "mn") return children.map(render).join("");
  if (value.tag === "mo") {
    const text = children.map(render).join("");
    return SYMBOL_REVERSE[text] ? "\\" + SYMBOL_REVERSE[text] : text;
  }
  if (value.tag === "mfrac") return (children[0] ? render(children[0]) : "") + "/" + (children[1] ? render(children[1]) : "");
  if (value.tag === "msqrt") return "\\sqrt(" + children.map(render).join("") + ")";
  if (value.tag === "mroot") return "\\sqrt[" + render(children[1] || "") + "](" + render(children[0] || "") + ")";
  if (value.tag === "msup") return render(children[0] || "") + "^" + render(children[1] || "");
  if (value.tag === "msub") return render(children[0] || "") + "_" + render(children[1] || "");
  if (value.tag === "msubsup") return render(children[0] || "") + "_" + render(children[1] || "") + "^" + render(children[2] || "");
  if (value.tag === "mtable") {
    return "\\matrix{" + children.map(rowNode => rowNode.children.map(cell => cell.children.map(render).join("")).join(",")).join(";") + "}";
  }
  if (value.tag === "mtr") return children.map(render).join(",");
  if (value.tag === "mtd") return children.map(render).join("");
  if (value.tag === "mfenced") {
    if (children.some(child => child && child.tag === "mtable")) {
      return children.map(render).join("");
    }
    const open = value.open ?? "(";
    const close = value.close ?? ")";
    return open + children.map(render).join("") + close;
  }
  if (value.tag === "munder") return render(children[0] || "") + "_" + render(children[1] || "");
  if (value.tag === "mover") return render(children[0] || "") + "^" + render(children[1] || "");
  if (value.tag === "munderover") return render(children[0] || "") + "_" + render(children[1] || "") + "^" + render(children[2] || "");
  return children.map(render).join("");
}

export function mathMLToLinear(mathml) {
  return linearNode(parseMathML(mathml)).trim();
}

export function replaceGreekCommandAtCursor(value, cursor) {
  const text = String(value || "");
  const position = Math.max(0, Math.min(text.length, Number(cursor) || 0));
  const match = text.slice(0, position).match(/\\([A-Za-z]+)$/);
  if (!match || !Object.hasOwn(EQUATION_GREEK, match[1])) return null;
  const commandStart = position - match[0].length;
  const symbol = EQUATION_GREEK[match[1]];
  return {
    value: text.slice(0, commandStart) + symbol + " " + text.slice(position),
    cursor: commandStart + symbol.length + 1
  };
}

export function equationMarkerToken(id) {
  const safe = String(id || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return "VNOEQ" + safe + "MARKER";
}
