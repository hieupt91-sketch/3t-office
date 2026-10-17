/**
 * Các hàm trả về ma trận của VN Sheet.
 * Biên engine giữ ma trận hai chiều; grid chỉ làm phẳng khi điền vùng CSE.
 */

export const ARRAY_FUNCTION_NAMES = new Set([
  "MMULT", "MINVERSE", "MUNIT", "TRANSPOSE", "FREQUENCY",
  "LINEST", "TREND", "GROWTH", "LOGEST"
]);

const isError = value => typeof value === "string" && /^#/.test(value);

function boolArg(engine, arg, fallback) {
  if (arg === undefined) return fallback;
  const value = engine._resolveSingleValue(arg);
  if (isError(value)) return value;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (/^TRUE$/i.test(String(value))) return true;
  if (/^FALSE$/i.test(String(value))) return false;
  return "#VALUE!";
}

function numericMatrix(engine, arg, { positive = false } = {}) {
  const source = engine._rangeMatrix(arg);
  if (!source.length || !source[0]?.length || source.some(row => row.length !== source[0].length)) return { error: "#VALUE!" };
  const rows = [];
  for (const row of source) {
    const output = [];
    for (const value of row) {
      if (isError(value)) return { error: value };
      if (typeof value !== "number" || !Number.isFinite(value) || (positive && value <= 0)) return { error: positive ? "#NUM!" : "#VALUE!" };
      output.push(value);
    }
    rows.push(output);
  }
  return { rows };
}

function identity(size) {
  return Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, col) => row === col ? 1 : 0));
}

function inverse(matrix) {
  const n = matrix.length;
  if (!n || matrix.some(row => row.length !== n)) return { error: "#VALUE!" };
  const augmented = matrix.map((row, index) => [...row, ...identity(n)[index]]);
  const scale = Math.max(1, ...matrix.flat().map(Math.abs));
  const epsilon = Number.EPSILON * scale * n * 32;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
    if (Math.abs(augmented[pivot][col]) <= epsilon) return { error: "#NUM!" };
    if (pivot !== col) [augmented[pivot], augmented[col]] = [augmented[col], augmented[pivot]];
    const divisor = augmented[col][col];
    for (let c = 0; c < n * 2; c++) augmented[col][c] /= divisor;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = augmented[row][col];
      for (let c = 0; c < n * 2; c++) augmented[row][c] -= factor * augmented[col][c];
    }
  }
  return { rows: augmented.map(row => row.slice(n)) };
}

function multiply(left, right) {
  return left.map(row => right[0].map((_, col) => row.reduce((sum, value, index) => sum + value * right[index][col], 0)));
}

function transpose(matrix) {
  return matrix[0].map((_, col) => matrix.map(row => row[col]));
}

function regressionInputs(engine, knownYArg, knownXArg, positiveY = false) {
  const yMatrix = numericMatrix(engine, knownYArg, { positive: positiveY });
  if (yMatrix.error) return yMatrix;
  let y;
  let yShape;
  if (yMatrix.rows[0].length === 1) {
    y = yMatrix.rows.map(row => row[0]);
    yShape = { rows: y.length, cols: 1 };
  } else if (yMatrix.rows.length === 1) {
    y = [...yMatrix.rows[0]];
    yShape = { rows: 1, cols: y.length };
  } else {
    return { error: "#VALUE!" };
  }
  let x;
  if (knownXArg === undefined) {
    x = y.map((_, index) => [index + 1]);
  } else {
    const xMatrix = numericMatrix(engine, knownXArg);
    if (xMatrix.error) return xMatrix;
    if (xMatrix.rows.length === y.length) x = xMatrix.rows;
    else if (xMatrix.rows.length === 1 && xMatrix.rows[0].length === y.length) x = transpose(xMatrix.rows);
    else return { error: "#REF!" };
  }
  if (!x.length || x.length !== y.length || x.some(row => row.length !== x[0].length)) return { error: "#REF!" };
  return { y, x, yShape };
}

function fitRegression(engine, args, logarithmic = false) {
  if (!args.length || args.length > 4) return { error: "#VALUE!" };
  const input = regressionInputs(engine, args[0], args[1], logarithmic);
  if (input.error) return input;
  const useConstant = boolArg(engine, args[2], true);
  if (isError(useConstant)) return { error: useConstant };
  const stats = boolArg(engine, args[3], false);
  if (isError(stats)) return { error: stats };
  const y = logarithmic ? input.y.map(Math.log) : input.y;
  const design = input.x.map(row => [...row, ...(useConstant ? [1] : [])]);
  const parameterCount = design[0].length;
  if (design.length < parameterCount || parameterCount === 0) return { error: "#NUM!" };
  const xt = transpose(design);
  const xtx = multiply(xt, design);
  const inv = inverse(xtx);
  if (inv.error) return inv;
  const beta = multiply(multiply(inv.rows, xt), y.map(value => [value])).map(row => row[0]);
  const fitted = design.map(row => row.reduce((sum, value, index) => sum + value * beta[index], 0));
  const residuals = y.map((value, index) => value - fitted[index]);
  const ssResidual = residuals.reduce((sum, value) => sum + value * value, 0);
  const mean = y.reduce((sum, value) => sum + value, 0) / y.length;
  const ssTotal = useConstant
    ? y.reduce((sum, value) => sum + (value - mean) ** 2, 0)
    : y.reduce((sum, value) => sum + value * value, 0);
  const ssRegression = Math.max(0, ssTotal - ssResidual);
  const predictorCount = input.x[0].length;
  const df = y.length - parameterCount;
  const mse = df > 0 ? ssResidual / df : 0;
  const standardErrors = inv.rows.map((row, index) => Math.sqrt(Math.max(0, row[index] * mse)));
  const slopes = beta.slice(0, predictorCount).reverse();
  const intercept = useConstant ? beta[beta.length - 1] : 0;
  const coefficients = [...slopes, intercept];
  if (logarithmic) {
    for (let index = 0; index < coefficients.length; index++) coefficients[index] = Math.exp(coefficients[index]);
  }
  const model = { ...input, useConstant, stats, beta, coefficients, fitted, ssResidual, ssRegression, ssTotal, df, standardErrors };
  if (!stats) return { rows: [coefficients], model };
  const width = predictorCount + 1;
  const pad = (first, second) => [first, second, ...Array(Math.max(0, width - 2)).fill("#N/A")];
  const orderedErrors = [...standardErrors.slice(0, predictorCount).reverse(), useConstant ? standardErrors[standardErrors.length - 1] : "#N/A"];
  const r2 = ssTotal === 0 ? "#NUM!" : 1 - ssResidual / ssTotal;
  const sey = df > 0 ? Math.sqrt(mse) : "#NUM!";
  const f = predictorCount > 0 && ssResidual > 0 && df > 0 ? (ssRegression / predictorCount) / (ssResidual / df) : "#NUM!";
  return {
    rows: [coefficients, orderedErrors, pad(r2, sey), pad(f, df), pad(ssRegression, ssResidual)],
    model
  };
}

function prediction(engine, args, logarithmic = false) {
  if (!args.length || args.length > 4) return { error: "#VALUE!" };
  const fit = fitRegression(engine, [args[0], args[1], args[3], "FALSE"], logarithmic);
  if (fit.error) return fit;
  const model = fit.model;
  let newX;
  let outputShape;
  if (args[2] === undefined) {
    newX = model.x;
    outputShape = model.yShape;
  } else {
    const matrix = numericMatrix(engine, args[2]);
    if (matrix.error) return matrix;
    if (matrix.rows[0].length === model.x[0].length) {
      newX = matrix.rows;
      outputShape = { rows: matrix.rows.length, cols: 1 };
    } else if (model.x[0].length === 1 && matrix.rows.length === 1) {
      newX = matrix.rows[0].map(value => [value]);
      outputShape = { rows: 1, cols: matrix.rows[0].length };
    } else return { error: "#REF!" };
  }
  const predicted = newX.map(row => {
    const design = [...row, ...(model.useConstant ? [1] : [])];
    const value = design.reduce((sum, item, index) => sum + item * model.beta[index], 0);
    return logarithmic ? Math.exp(value) : value;
  });
  return { rows: outputShape.rows === 1 ? [predicted] : predicted.map(value => [value]) };
}

export function evaluateArrayFunction(engine, name, args) {
  switch (name) {
    case "TRANSPOSE": {
      if (args.length !== 1) return { error: "#VALUE!" };
      const matrix = engine._rangeMatrix(args[0]);
      if (!matrix.length || !matrix[0]?.length) return { error: "#VALUE!" };
      return { rows: transpose(matrix) };
    }
    case "MMULT": {
      if (args.length !== 2) return { error: "#VALUE!" };
      const left = numericMatrix(engine, args[0]); if (left.error) return left;
      const right = numericMatrix(engine, args[1]); if (right.error) return right;
      if (left.rows[0].length !== right.rows.length) return { error: "#VALUE!" };
      return { rows: multiply(left.rows, right.rows) };
    }
    case "MINVERSE": {
      if (args.length !== 1) return { error: "#VALUE!" };
      const matrix = numericMatrix(engine, args[0]); if (matrix.error) return matrix;
      return inverse(matrix.rows);
    }
    case "MUNIT": {
      if (args.length !== 1) return { error: "#VALUE!" };
      const raw = engine._resolveSingleValue(args[0]);
      const size = Number(raw);
      if (isError(raw)) return { error: raw };
      if (!Number.isInteger(size) || size < 1 || size > 512) return { error: "#VALUE!" };
      return { rows: identity(size) };
    }
    case "FREQUENCY": {
      if (args.length !== 2) return { error: "#VALUE!" };
      const data = engine._rangeMatrix(args[0]).flat();
      const bins = engine._rangeMatrix(args[1]).flat();
      const error = [...data, ...bins].find(isError); if (error) return { error };
      const numericData = data.filter(value => typeof value === "number" && Number.isFinite(value));
      const numericBins = bins.filter(value => typeof value === "number" && Number.isFinite(value));
      const counts = Array(numericBins.length + 1).fill(0);
      for (const value of numericData) {
        const index = numericBins.findIndex(bin => value <= bin);
        counts[index < 0 ? numericBins.length : index]++;
      }
      return { rows: counts.map(value => [value]) };
    }
    case "LINEST": return fitRegression(engine, args, false);
    case "LOGEST": return fitRegression(engine, args, true);
    case "TREND": return prediction(engine, args, false);
    case "GROWTH": return prediction(engine, args, true);
    default: return { error: "#NAME?" };
  }
}
