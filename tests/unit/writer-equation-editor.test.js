import {
  EQUATION_STRUCTURES,
  EQUATION_GREEK,
  EQUATION_SYMBOL_COMMANDS,
  linearToMathML,
  mathMLToLinear,
  replaceGreekCommandAtCursor
} from "../../apps/writer/equation-editor.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countMatches(value, expression) {
  return [...String(value).matchAll(expression)].length;
}

export async function runWriterEquationEditorTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Writer equations: Word-style linear fractions, scripts, and roots map to MathML", () => {
    const cases = [
      ["a/b", "<mfrac>", "a/b"],
      ["x^2", "<msup>", "x^2"],
      ["x_1", "<msub>", "x_1"],
      [String.raw`\sqrt(x)`, "<msqrt>", String.raw`\sqrt(x)`],
      [String.raw`\sqrt[3](x)`, "<mroot>", String.raw`\sqrt[3](x)`]
    ];
    for (const [linear, expectedTag, expectedLinear] of cases) {
      const mathml = linearToMathML(linear);
      assert(mathml.includes(expectedTag), `${linear} must create ${expectedTag}`);
      assert(mathMLToLinear(mathml) === expectedLinear, `${linear} must round-trip, got ${mathMLToLinear(mathml)}`);
    }
    assert(linearToMathML("x^2", "block").includes('display="block"'), "block display must be retained");
  });

  test("Writer equations: integrals, sums, products, brackets, and matrices create MathML structures", () => {
    const structures = Object.fromEntries(EQUATION_STRUCTURES.map(item => [item.id, item]));
    assert(linearToMathML(structures.integral.insert).includes("<munderover>"), "integral limits must be structured");
    assert(linearToMathML(structures.sum.insert).includes("<munderover>"), "sum limits must be structured");
    assert(linearToMathML(structures.product.insert).includes("<munderover>"), "product limits must be structured");
    assert(linearToMathML(structures.brackets.insert).includes("<mfenced"), "brackets must be a MathML fence");
    for (const [id, rows, cols] of [["matrix2", 2, 2], ["matrix3", 3, 3]]) {
      const mathml = linearToMathML(structures[id].insert);
      assert(mathml.includes("<mtable>"), `${id} must create a MathML table`);
      assert(countMatches(mathml, /<mtr>/g) === rows, `${id} row count must be ${rows}`);
      assert(countMatches(mathml, /<mtd>/g) === rows * cols, `${id} cell count must be ${rows * cols}`);
      assert(mathMLToLinear(mathml).startsWith(String.raw`\matrix{`), `${id} should round-trip as a linear matrix`);
    }
  });

  test("Writer equations: Greek, common symbols, and Space conversion have linear-format mappings", () => {
    const mathml = linearToMathML(String.raw`\alpha + \Omega + \le + \infty + \infinity`);
    for (const symbol of ["\u03b1", "\u03a9", "\u2264", "\u221e"]) {
      assert(mathml.includes(symbol), `MathML must contain ${symbol}`);
    }
    assert(Object.hasOwn(EQUATION_GREEK, "alpha") && Object.hasOwn(EQUATION_GREEK, "Omega"), "Greek command table must contain lowercase and uppercase forms");
    for (const command of ["le", "infinity"]) assert(Object.hasOwn(EQUATION_SYMBOL_COMMANDS, command), `missing symbol command ${command}`);
    const converted = replaceGreekCommandAtCursor(String.raw`\alpha`, 6);
    assert(converted?.value === "\u03b1 " && converted.cursor === 2, "Space should turn \\alpha into alpha plus a trailing space");
    assert(replaceGreekCommandAtCursor("\\unknown", 8) === null, "unknown commands must stay unchanged");
  });

  return results;
}
