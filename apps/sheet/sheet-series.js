/**
 * Tạo chuỗi giá trị cho Điền > Chuỗi (Series): tuyến tính, tăng trưởng, ngày (ngày/ngày làm việc/tháng/năm).
 * Module thuần (không DOM) để kiểm thử bằng Node.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const SERIES_MAX_COUNT = 100000;

/** Phân tích chuỗi ngày dd/mm/yyyy hoặc yyyy-mm-dd; trả về mẫu định dạng để in lại cùng kiểu. */
export function parseDateText(value) {
  const raw = String(value ?? "").trim();
  const ymd = raw.match(/^(\d{4})([/-])(\d{1,2})\2(\d{1,2})$/);
  const dmy = raw.match(/^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/);
  if (!ymd && !dmy) return null;
  const year = Number(ymd ? ymd[1] : dmy[4]);
  const month = Number(ymd ? ymd[3] : dmy[3]);
  const day = Number(ymd ? ymd[4] : dmy[1]);
  const utc = Date.UTC(year, month - 1, day);
  const date = new Date(utc);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return {
    utc,
    yearFirst: Boolean(ymd),
    separator: (ymd || dmy)[2],
    dayWidth: ymd ? ymd[4].length : dmy[1].length,
    monthWidth: ymd ? ymd[3].length : dmy[3].length
  };
}

export function formatDateLike(utc, template) {
  const date = new Date(utc);
  const day = String(date.getUTCDate()).padStart(template.dayWidth, "0");
  const month = String(date.getUTCMonth() + 1).padStart(template.monthWidth, "0");
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  return template.yearFirst
    ? `${year}${template.separator}${month}${template.separator}${day}`
    : `${day}${template.separator}${month}${template.separator}${year}`;
}

/** Cộng amount đơn vị vào ngày (UTC ms). Tháng/năm giữ ngày trong tháng, kẹp về ngày cuối tháng nếu thiếu. */
export function addDateUnit(utc, unit, amount) {
  const date = new Date(utc);
  if (unit === "month" || unit === "year") {
    const months = unit === "year" ? amount * 12 : amount;
    const day = date.getUTCDate();
    const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(day, lastDay));
    return target.getTime();
  }
  if (unit === "weekday") {
    let current = utc;
    const direction = amount >= 0 ? 1 : -1;
    let remaining = Math.abs(amount);
    while (remaining > 0) {
      current += direction * DAY_MS;
      const weekday = new Date(current).getUTCDay();
      if (weekday !== 0 && weekday !== 6) remaining--;
    }
    return current;
  }
  return utc + amount * DAY_MS;
}

/**
 * @param {{start:number|string, type:"linear"|"growth"|"date", step?:number, stop?:number|null, count?:number, dateUnit?:string}} options
 *   count = tổng số phần tử gồm cả giá trị bắt đầu. Nếu có stop thì dừng khi vượt stop (tối đa SERIES_MAX_COUNT).
 * @returns {{values:(number|string)[], error?:string}}
 */
export function buildSeries(options) {
  const type = options.type || "linear";
  const step = options.step === undefined || options.step === null || options.step === "" ? 1 : Number(options.step);
  const stop = options.stop === undefined || options.stop === null || options.stop === "" ? null : Number(options.stop);
  const limit = Math.min(SERIES_MAX_COUNT, Math.max(1, Number(options.count) || SERIES_MAX_COUNT));
  const hasStop = stop !== null && Number.isFinite(stop);
  if (!Number.isFinite(step)) return { values: [], error: "step" };

  if (type === "date" && (typeof options.start === "number" || /^\d+(?:\.\d+)?$/.test(String(options.start).trim()))) {
    // Ô ngày lưu dạng số serial (ngày 1/1/1970 = 25569): tính trên serial, giữ phần thập phân (giờ).
    const serial = Number(options.start);
    const whole = Math.floor(serial);
    const fraction = serial - whole;
    const unit = options.dateUnit || "day";
    const base = (whole - 25569) * DAY_MS;
    const stopTemplate = hasStop || options.stopText ? parseDateText(options.stopText) : null;
    const stopUtc = stopTemplate ? stopTemplate.utc : (hasStop ? (Math.floor(stop) - 25569) * DAY_MS : null);
    const values = [];
    for (let i = 0; i < limit; i++) {
      const utc = addDateUnit(base, unit, step * i);
      if (stopUtc !== null && ((step > 0 && utc > stopUtc) || (step < 0 && utc < stopUtc))) break;
      values.push(Math.round(utc / DAY_MS) + 25569 + fraction);
      if (step === 0) break;
    }
    return { values };
  }

  if (type === "date") {
    const template = parseDateText(options.start);
    if (!template) return { values: [], error: "start" };
    const unit = options.dateUnit || "day";
    const stopDate = hasStop ? parseDateText(options.stopText) : null;
    const values = [];
    for (let i = 0; i < limit; i++) {
      const utc = addDateUnit(template.utc, unit, step * i);
      if (stopDate && ((step > 0 && utc > stopDate.utc) || (step < 0 && utc < stopDate.utc))) break;
      values.push(formatDateLike(utc, template));
      if (step === 0) break;
    }
    return { values };
  }

  const start = Number(options.start);
  if (!Number.isFinite(start)) return { values: [], error: "start" };
  if (type === "growth" && (step === 0 || start === 0)) return { values: [start] };
  const values = [];
  let current = start;
  for (let i = 0; i < limit; i++) {
    if (hasStop && ((step > 0 && type !== "growth" && current > stop) || (step < 0 && type !== "growth" && current < stop) ||
      (type === "growth" && ((Math.abs(step) > 1 && Math.abs(current) > Math.abs(stop)) || (Math.abs(step) < 1 && Math.abs(current) < Math.abs(stop)))))) break;
    values.push(Number(current.toPrecision(15)));
    current = type === "growth" ? current * step : current + step;
    if (!hasStop && values.length >= limit) break;
    if (step === 0 && type === "linear") break;
    if (type === "growth" && Math.abs(step) === 1 && hasStop) break;
  }
  return { values };
}
