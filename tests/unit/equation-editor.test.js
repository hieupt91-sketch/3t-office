/**
 * VN Office — Unit tests for Equation Editor
 * Tests linear format conversion and MathML output
 */

import { linearToMathML, mathMLToLinear, buildStructureMathML, EQUATION_STRUCTURES, EQUATION_SYMBOLS, LINEAR_PATTERNS } from "../../apps/writer/equation-editor.js";

export async function runEquationEditorTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
      console.error(`✗ ${name}: ${error.message}`);
    }
  };

  const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
      throw new Error(`${message}: expected "${expected}", got "${actual}"`);
    }
  };

  const assertContains = (actual, expected, message) => {
    if (!actual.includes(expected)) {
      throw new Error(`${message}: expected to contain "${expected}" in "${actual}"`);
    }
  };

  // Test linearToMathML basic conversions
  await test("linearToMathML: fraction a/b", () => {
    const result = linearToMathML("a/b");
    assertContains(result, "<mfrac>", "fraction");
    assertContains(result, "<mi>a</mi>", "numerator");
    assertContains(result, "<mi>b</mi>", "denominator");
  });

  await test("linearToMathML: fraction with numbers", () => {
    const result = linearToMathML("1/2");
    assertContains(result, "<mn>1</mn>", "numerator");
    assertContains(result, "<mn>2</mn>", "denominator");
  });

  await test("linearToMathML: superscript x^2", () => {
    const result = linearToMathML("x^2");
    assertContains(result, "<msup>", "superscript");
    assertContains(result, "<mi>x</mi>", "base");
    assertContains(result, "<mn>2</mn>", "exponent");
  });

  await test("linearToMathML: subscript x_1", () => {
    const result = linearToMathML("x_1");
    assertContains(result, "<msub>", "subscript");
    assertContains(result, "<mi>x</mi>", "base");
    assertContains(result, "<mn>1</mn>", "subscript");
  });

  await test("linearToMathML: sqrt", () => {
    const result = linearToMathML("\\sqrt(x)");
    assertContains(result, "<msqrt>", "sqrt");
    assertContains(result, "<mi>x</mi>", "argument");
  });

  await test("linearToMathML: Greek letters", () => {
    const result = linearToMathML("\\alpha + \\beta");
    assertContains(result, "α", "alpha");
    assertContains(result, "β", "beta");
  });

  await test("linearToMathML: symbols le ge ne pm", () => {
    const result = linearToMathML("\\le \\ge \\ne \\pm");
    assertContains(result, "≤", "le");
    assertContains(result, "≥", "ge");
    assertContains(result, "≠", "ne");
    assertContains(result, "±", "pm");
  });

  await test("linearToMathML: symbols times div infty to in", () => {
    const result = linearToMathML("\\times \\div \\infty \\to \\in");
    assertContains(result, "×", "times");
    assertContains(result, "÷", "div");
    assertContains(result, "∞", "infty");
    assertContains(result, "→", "to");
    assertContains(result, "∈", "in");
  });

  await test("linearToMathML: sum prod int", () => {
    const result = linearToMathML("\\sum \\prod \\int");
    assertContains(result, "∑", "sum");
    assertContains(result, "∏", "prod");
    assertContains(result, "∫", "int");
  });

  await test("linearToMathML: complex expression", () => {
    const result = linearToMathML("x = (-b ± \\sqrt(b^2 - 4ac)) / 2a");
    assertContains(result, "<msup>", "superscript");
    assertContains(result, "<msqrt>", "sqrt");
    assertContains(result, "±", "pm");
    assertContains(result, "<mfrac>", "fraction");
  });

  // Test mathMLToLinear round-trip
  await test("mathMLToLinear: fraction round-trip", () => {
    const mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mfrac><mrow><mi>a</mi></mrow><mrow><mi>b</mi></mrow></mfrac></math>';
    const linear = mathMLToLinear(mathml);
    assertEqual(linear, "\\frac(a,b)");
  });

  await test("mathMLToLinear: superscript round-trip", () => {
    const mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><msup><mi>x</mi><mn>2</mn></msup></math>';
    const linear = mathMLToLinear(mathml);
    assertEqual(linear, "x^2");
  });

  await test("mathMLToLinear: subscript round-trip", () => {
    const mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><msub><mi>x</mi><mn>1</mn></msub></math>';
    const linear = mathMLToLinear(mathml);
    assertEqual(linear, "x_1");
  });

  await test("mathMLToLinear: sqrt round-trip", () => {
    const mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><msqrt><mrow><mi>x</mi></mrow></msqrt></math>';
    const linear = mathMLToLinear(mathml);
    assertEqual(linear, "\\sqrt(x)");
  });

  await test("mathMLToLinear: Greek letters round-trip", () => {
    const mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mi>α</mi><mo>+</mo><mi>β</mi></math>';
    const linear = mathMLToLinear(mathml);
    assertContains(linear, "\\alpha");
    assertContains(linear, "\\beta");
  });

  // Test buildStructureMathML
  await test("buildStructureMathML: frac", () => {
    const result = buildStructureMathML("frac");
    assertContains(result, "<mfrac>", "frac");
    assertContains(result, "<mrow>", "numerator/denominator wrapper");
  });

  await test("buildStructureMathML: sup", () => {
    const result = buildStructureMathML("sup");
    assertContains(result, "<msup>", "superscript");
    assertContains(result, "x^2", "template");
  });

  await test("buildStructureMathML: sub", () => {
    const result = buildStructureMathML("sub");
    assertContains(result, "<msub>", "subscript");
    assertContains(result, "x_1", "template");
  });

  await test("buildStructureMathML: sqrt", () => {
    const result = buildStructureMathML("sqrt");
    assertContains(result, "<msqrt>", "sqrt");
  });

  await test("buildStructureMathML: nthroot", () => {
    const result = buildStructureMathML("nthroot");
    assertContains(result, "3", "degree 3");
    assertContains(result, "x", "radicand");
  });

  await test("buildStructureMathML: matrix2", () => {
    const result = buildStructureMathML("matrix2");
    assertContains(result, "<mtable>", "matrix table");
    assertContains(result, "<mtr>", "matrix row");
    assertContains(result, "<mtd>", "matrix cell");
    assertContains(result, "<mn>1</mn>", "cell 1");
    assertContains(result, "<mn>4</mn>", "cell 4");
  });

  await test("buildStructureMathML: matrix3", () => {
    const result = buildStructureMathML("matrix3");
    assertContains(result, "<mtable>", "matrix table");
    const mtrCount = (result.match(/<mtr>/g) || []).length;
    assertEqual(mtrCount, 3, "3 rows");
    const mtdCount = (result.match(/<mtd>/g) || []).length;
    assertEqual(mtdCount, 9, "9 cells");
  });

  // Test EQUATION_STRUCTURES constants
  await test("EQUATION_STRUCTURES: all have id and label", () => {
    for (const s of EQUATION_STRUCTURES) {
      if (!s.id) throw new Error("Structure missing id");
      if (!s.label) throw new Error(`Structure ${s.id} missing label`);
      if (!s.labelKey) throw new Error(`Structure ${s.id} missing labelKey`);
    }
  });

  // Test EQUATION_SYMBOLS constants
  await test("EQUATION_SYMBOLS: all have char and linear", () => {
    for (const s of EQUATION_SYMBOLS) {
      if (!s.char) throw new Error("Symbol missing char");
      if (!s.linear) throw new Error(`Symbol ${s.char} missing linear`);
    }
  });

  // Test LINEAR_PATTERNS constants
  await test("LINEAR_PATTERNS: all have pattern and build", () => {
    for (const p of LINEAR_PATTERNS) {
      if (!p.pattern) throw new Error("Pattern missing regex");
      if (!p.build) throw new Error("Pattern missing build function");
    }
  });

  // Test specific pattern conversions
  await test("LINEAR_PATTERNS: \\frac(num,den) -> mfrac", () => {
    const result = linearToMathML("\\frac(a,b)");
    assertContains(result, "<mfrac>", "fraction");
    assertContains(result, "a", "numerator");
    assertContains(result, "b", "denominator");
  });

  await test("LINEAR_PATTERNS: \\sqrt(x) -> msqrt", () => {
    const result = linearToMathML("\\sqrt(x)");
    assertContains(result, "<msqrt>", "sqrt");
  });

  await test("LINEAR_PATTERNS: superscript x^2", () => {
    const result = linearToMathML("x^2");
    assertContains(result, "<msup>", "superscript");
  });

  await test("LINEAR_PATTERNS: subscript x_1", () => {
    const result = linearToMathML("x_1");
    assertContains(result, "<msub>", "subscript");
  });

  // Test that MathML output is valid
  await test("linearToMathML: outputs valid MathML with xmlns", () => {
    const result = linearToMathML("a/b");
    assertContains(result, 'xmlns="http://www.w3.org/1998/Math/MathML"', "xmlns");
    assertContains(result, 'display="inline"', "display");
    assertContains(result, "<math", "math tag");
    assertContains(result, "</math>", "closing math tag");
  });

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\n=== Equation Editor Tests: ${passed} passed, ${failed} failed ===`);

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }

  return results;
}