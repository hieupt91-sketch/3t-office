/** Tiện ích dùng chung cho các module hàm bổ sung (formula-functions-*.js). */

export const isErr = value => typeof value === "string" && /^#(?:DIV\/0!|N\/A|NAME\?|NULL!|NUM!|REF!|VALUE!)/.test(value);

/** Tính một đối số về giá trị vô hướng; trả lỗi Excel nếu có. */
export function scalar(engine, arg) {
  if (arg === undefined) return undefined;
  const value = engine._resolveSingleValue(arg);
  return value instanceof String ? String(value) : value;
}

/** Đối số số: TRUE=1, chuỗi số được ép số, chuỗi khác -> #VALUE!. */
export function num(engine, arg) {
  const value = scalar(engine, arg);
  if (isErr(value)) return value;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = engine._parseNumberOrCurrency?.(value);
  if (parsed !== null && parsed !== undefined && Number.isFinite(parsed)) return parsed;
  const direct = Number(String(value).trim());
  return Number.isFinite(direct) ? direct : "#VALUE!";
}

export const nums = (engine, args, from = 0) => {
  const out = [];
  for (let i = from; i < args.length; i++) {
    const value = num(engine, args[i]);
    if (isErr(value)) return { error: value };
    out.push(value);
  }
  return { values: out };
};

export const finite = value => Number.isFinite(value) ? value : "#NUM!";

export const unary = fn => (engine, args) => {
  if (args.length !== 1) return "#VALUE!";
  const x = num(engine, args[0]);
  if (isErr(x)) return x;
  const result = fn(x);
  return typeof result === "number" ? finite(result) : result;
};

/** Giá trị số của các đối số (vùng/ô/hằng) như SUM: bỏ chuỗi/trống/logic trong vùng, trả lỗi đầu tiên nếu có. */
export function numericArgs(engine, args) {
  const raw = engine.collectValues(args);
  const error = raw.find(isErr);
  if (error) return { error };
  return { values: engine.collectNumericValues(args) };
}

/** Một vùng thành mảng số theo thứ tự hàng (ô không phải số bị bỏ); lỗi trả về { error }. */
export function rangeNumbers(engine, arg) { return numericArgs(engine, [arg]); }

/** Hai vùng cùng kích thước thành cặp số (bỏ cặp có ô không phải số), như CORREL/SLOPE. */
export function pairedRanges(engine, a, b) {
  const left = engine._rangeMatrix(a).flat();
  const right = engine._rangeMatrix(b).flat();
  if (left.length !== right.length) return { error: "#N/A" };
  const err = [...left, ...right].find(isErr);
  if (err) return { error: err };
  const xs = []; const ys = [];
  for (let i = 0; i < left.length; i++) {
    const x = typeof left[i] === "number" ? left[i] : (left[i] && left[i].isTextCell ? null : engine._parseNumberOrCurrency?.(left[i]));
    const y = typeof right[i] === "number" ? right[i] : (right[i] && right[i].isTextCell ? null : engine._parseNumberOrCurrency?.(right[i]));
    if (typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) { xs.push(x); ys.push(y); }
  }
  return { xs, ys };
}

export const sum = values => values.reduce((a, b) => a + b, 0);
export const mean = values => sum(values) / values.length;
