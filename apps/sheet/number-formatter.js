/**
 * 3T Office — Number Formatter for 3T Sheet
 * Xử lý định dạng hiển thị giá trị ô theo chuẩn Microsoft Excel & LibreOffice Calc
 * Hỗ trợ đầy đủ các Category: General, Number, Currency, Accounting, Date, Percentage, Text, Custom.
 */

export class NumberFormatter {
  /**
   * Định dạng "General" chuẩn Excel: giữ nguyên độ chính xác thật của phép
   * tính (không cắt cứng về 2 chữ số thập phân), chỉ dọn sai số biểu diễn
   * dấu phẩy động nhị phân (vd 0.1+0.2 -> 0.30000000000000004) bằng cách
   * giới hạn 12 chữ số có nghĩa - cùng cấp độ chính xác General format của
   * Excel hiển thị trên cột đủ rộng, không phải làm tròn kế toán.
   * @param {any} rawVal
   * @returns {string}
   */
  static formatGeneralNumber(rawVal) {
    if (typeof rawVal !== "number" || !Number.isFinite(rawVal)) {
      return String(rawVal ?? "");
    }
    if (Number.isInteger(rawVal)) return String(rawVal);
    return String(parseFloat(rawVal.toPrecision(12)));
  }

  /**
   * Định dạng giá trị hiển thị dựa trên cấu hình numberFormat của ô
   * @param {any} rawVal Giá trị thô của ô (số, chuỗi, Date)
   * @param {Object} [formatConfig] Cấu hình định dạng ô
   * @returns {{ text: string, isNegative?: boolean, isRed?: boolean, isAccounting?: boolean, align?: string, symbol?: string, numberText?: string }}
   */
  static formatValue(rawVal, formatConfig) {
    if (rawVal === undefined || rawVal === null || rawVal === "") {
      return { text: "" };
    }

    if (!formatConfig || !formatConfig.category || formatConfig.category === "general") {
      return {
        text: this.formatGeneralNumber(rawVal),
        align: typeof rawVal === "number" ? "right" : undefined
      };
    }

    const { category } = formatConfig;

    switch (category) {
      case "text":
        return {
          text: String(rawVal),
          align: "left",
          isText: true
        };

      case "percentage":
        return this.formatPercentage(rawVal, formatConfig);

      case "date":
        return this.formatDate(rawVal, formatConfig);

      case "time":
        return this.formatTime(rawVal, formatConfig);

      case "currency":
        return this.formatCurrency(rawVal, formatConfig);

      case "accounting":
        return this.formatAccounting(rawVal, formatConfig);

      case "number":
        return this.formatNumber(rawVal, formatConfig);

      case "custom":
        return this.formatCustom(rawVal, formatConfig);

      case "scientific":
        return this.formatScientific(rawVal, formatConfig);

      case "fraction":
        return this.formatFraction(rawVal, formatConfig);

      case "special":
        return this.formatSpecial(rawVal, formatConfig);

      default:
        return { text: String(rawVal) };
    }
  }

  /**
   * Trích xuất giá trị số từ rawVal
   * @param {any} val
   * @returns {number|null}
   */
  static parseNumber(val) {
    if (typeof val === "number") return Number.isFinite(val) ? val : null;
    if (val === null || val === undefined || val === "") return null;
    const str = String(val).trim();
    // Nếu có ngoặc đơn kiểu kế toán: (1234.56) -> -1234.56
    const isParenNegative = /^\((.*)\)$/.test(str);
    let cleaned = isParenNegative ? str.slice(1, -1) : str;
    // Bỏ ký hiệu tiền tệ và khoảng trắng
    cleaned = cleaned.replace(/[₫$€¥£%\s]/g, "");
    // Xử lý dấu phân cách
    if (cleaned.includes(",") && cleaned.includes(".")) {
      if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
        cleaned = cleaned.replace(/\./g, "").replace(",", ".");
      } else {
        cleaned = cleaned.replace(/,/g, "");
      }
    } else if (cleaned.includes(",")) {
      const commaParts = cleaned.split(",");
      if (commaParts.length > 1 && commaParts[commaParts.length - 1].length !== 3) {
        cleaned = cleaned.replace(",", ".");
      } else if (commaParts.length > 2) {
        cleaned = cleaned.replace(/,/g, "");
      } else {
        cleaned = cleaned.replace(/,/g, "");
      }
    }

    let num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    if (isParenNegative) num = -Math.abs(num);
    return num;
  }

  /**
   * Định dạng số (Number)
   */
  static formatNumber(val, config = {}) {
    const num = this.parseNumber(val);
    if (num === null) return { text: String(val) };

    const decimals = config.decimals !== undefined ? Math.max(0, Math.min(30, Number(config.decimals))) : 2;
    const useThousands = Boolean(config.useThousands);
    const negativeStyle = Number(config.negativeStyle || 0); // 0: -1234, 1: 1234 đỏ, 2: (1234), 3: (1234) đỏ

    const isNegative = num < 0;
    const absVal = Math.abs(num);

    if (num === 0 && (config.zeroFormat === "-" || config.zeroAsDash)) {
      return { text: "-", isNegative: false, isRed: false, align: "right" };
    }

    let formattedNumber = this._formatDecimalAndThousands(absVal, decimals, useThousands);

    let text = "";
    let isRed = false;

    if (isNegative) {
      switch (negativeStyle) {
        case 0:
          text = `-${formattedNumber}`;
          break;
        case 1:
          text = formattedNumber;
          isRed = true;
          break;
        case 2:
          text = `(${formattedNumber})`;
          break;
        case 3:
          text = `(${formattedNumber})`;
          isRed = true;
          break;
        default:
          text = `-${formattedNumber}`;
      }
    } else {
      text = formattedNumber;
    }

    return { text, isNegative, isRed, align: "right" };
  }

  /**
   * Định dạng tiền tệ (Currency)
   */
  static formatCurrency(val, config = {}) {
    const num = this.parseNumber(val);
    if (num === null) return { text: String(val) };

    const decimals = config.decimals !== undefined ? Math.max(0, Math.min(30, Number(config.decimals))) : 2;
    const useThousands = config.useThousands !== undefined ? Boolean(config.useThousands) : true;
    const symbol = config.currencySymbol !== undefined ? config.currencySymbol : "₫";
    const negativeStyle = Number(config.negativeStyle || 0);

    const isNegative = num < 0;
    const absVal = Math.abs(num);
    const formattedNumber = this._formatDecimalAndThousands(absVal, decimals, useThousands);

    const isSymbolAfter = symbol === "₫" || config.symbolPosition === "after";

    const withSymbol = (numStr) => {
      if (!symbol) return numStr;
      return isSymbolAfter ? `${numStr} ${symbol}` : `${symbol}${numStr}`;
    };

    let text = "";
    let isRed = false;

    if (isNegative) {
      switch (negativeStyle) {
        case 0:
          text = isSymbolAfter ? `-${formattedNumber} ${symbol}` : `-${symbol}${formattedNumber}`;
          break;
        case 1:
          text = withSymbol(formattedNumber);
          isRed = true;
          break;
        case 2:
          text = `(${withSymbol(formattedNumber)})`;
          break;
        case 3:
          text = `(${withSymbol(formattedNumber)})`;
          isRed = true;
          break;
        default:
          text = isSymbolAfter ? `-${formattedNumber} ${symbol}` : `-${symbol}${formattedNumber}`;
      }
    } else {
      text = withSymbol(formattedNumber);
    }

    return { text, isNegative, isRed, align: "right" };
  }

  /**
   * Định dạng Kế toán (Accounting)
   * Đặc điểm:
   * 1. Ký hiệu tiền tệ luôn canh lề trái ô
   * 2. Giá trị số luôn canh lề phải ô
   * 3. Số 0 hiển thị thành dấu gạch ngang "-"
   * 4. Số âm KHÔNG có dấu trừ, hiển thị trong ngoặc đơn: (1,234.00)
   */
  static formatAccounting(val, config = {}) {
    const num = this.parseNumber(val);
    if (num === null) return { text: String(val) };

    const decimals = config.decimals !== undefined ? Math.max(0, Math.min(30, Number(config.decimals))) : 2;
    const symbol = config.currencySymbol !== undefined ? config.currencySymbol : "₫";
    const isNegative = num < 0;
    const isZero = Math.abs(num) < (1 / Math.pow(10, decimals + 1));

    let numberText = "";
    if (isZero) {
      numberText = "-";
    } else {
      const absVal = Math.abs(num);
      const formatted = this._formatDecimalAndThousands(absVal, decimals, true);
      numberText = isNegative ? `(${formatted})` : `${formatted} `;
    }

    const fullText = symbol ? `${symbol}    ${numberText}` : numberText;

    return {
      text: fullText,
      isAccounting: true,
      symbol: symbol || "",
      numberText,
      isZero,
      isNegative,
      align: "right"
    };
  }

  /**
   * Định dạng Phần trăm (Percentage)
   */
  static formatPercentage(val, config = {}) {
    const num = this.parseNumber(val);
    if (num === null) return { text: String(val) };

    const decimals = config.decimals !== undefined ? Math.max(0, Math.min(30, Number(config.decimals))) : 2;
    const percentVal = num * 100;
    const formatted = percentVal.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return {
      text: `${formatted}%`,
      align: "right"
    };
  }

  /**
   * Định dạng Ngày tháng (Date)
   */
  static formatDate(val, config = {}) {
    const date = this._parseDate(val, config);
    if (!date || isNaN(date.getTime())) {
      return { text: String(val) };
    }

    const formatPattern = config.dateFormat || "dd/mm/yyyy";
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");
    const yyyy = String(year);
    const yy = yyyy.slice(-2);
    const hh = String(hours).padStart(2, "0");
    const minStr = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");

    let result = "";

    switch (formatPattern) {
      case "dd/mm/yyyy":
        result = `${dd}/${mm}/${yyyy}`;
        break;
      case "dd-mm-yyyy":
        result = `${dd}-${mm}-${yyyy}`;
        break;
      case "d/m/yyyy":
        result = `${day}/${month}/${yyyy}`;
        break;
      case "yyyy-mm-dd":
        result = `${yyyy}-${mm}-${dd}`;
        break;
      case '"ngày" dd "tháng" mm "năm" yyyy':
      case "ngày dd tháng mm năm yyyy":
        result = `ngày ${dd} tháng ${mm} năm ${yyyy}`;
        break;
      case "dd/mm/yyyy hh:mm":
        result = `${dd}/${mm}/${yyyy} ${hh}:${minStr}`;
        break;
      case "d mmmm yyyy":
      case "d mmmm, yyyy":
        result = `${day} tháng ${month}, ${yyyy}`;
        break;
      case "dd-mm-yy":
        result = `${dd}-${mm}-${yy}`;
        break;
      default:
        result = `${dd}/${mm}/${yyyy}`;
    }

    return { text: result, align: "right" };
  }

  /**
   * Định dạng Giờ (Time) — ô lưu số ngày dạng phân số, ví dụ 13:45 -> 0.5729166...
   * Hiển thị lại theo mẫu timeFormat: "HH:mm" (mặc định) hoặc "HH:mm:ss".
   * @param {any} val
   * @param {Object} [config] { timeFormat?: string }
   * @returns {{ text: string, align: string }}
   */
  static formatTime(val, config = {}) {
    const num = typeof val === "number" ? val : this.parseNumber(val);
    if (num === null || !Number.isFinite(num)) return { text: String(val) };

    const pattern = String(config.timeFormat || "HH:mm");
    const withSeconds = /ss/i.test(pattern);
    const padHours = /hh/i.test(pattern);
    // Số ngày vượt quá 1 vẫn hiển thị phần giờ trong ngày (như phần mềm bảng tính khác).
    const totalSeconds = Math.round(((num % 1) + 1) % 1 * 86400) % 86400;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hh = padHours ? String(hours).padStart(2, "0") : String(hours);
    const mm = String(minutes).padStart(2, "0");
    const ss = String(seconds).padStart(2, "0");
    return { text: withSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`, align: "right" };
  }

  /**
   * Định dạng Khoa học (Scientific)
   */
  static formatScientific(val, config = {}) {
    const num = this.parseNumber(val);
    if (num === null) return { text: String(val) };
    const decimals = config.decimals !== undefined ? Math.max(0, Math.min(30, Number(config.decimals))) : 2;
    return {
      text: num.toExponential(decimals).toUpperCase(),
      align: "right"
    };
  }

  static formatFraction(val, config = {}) {
    const num = this.parseNumber(val);
    if (num === null) return { text: String(val) };
    const sign = num < 0 ? "-" : "";
    const absolute = Math.abs(num);
    const whole = Math.floor(absolute);
    const fraction = absolute - whole;
    const pattern = String(config.fractionFormat || "# ??/??");
    const fixed = pattern.match(/\/([248]|10|16)$/)?.[1];
    const maxDenominator = fixed ? Number(fixed) : pattern.includes("???") ? 999 : pattern.includes("??") ? 99 : 9;
    let bestNumerator = 0, bestDenominator = 1, bestError = Infinity;
    for (let denominator = fixed ? maxDenominator : 1; denominator <= maxDenominator; denominator++) {
      const numerator = Math.round(fraction * denominator);
      const error = Math.abs(fraction - numerator / denominator);
      if (error < bestError) { bestError = error; bestNumerator = numerator; bestDenominator = denominator; }
      if (fixed) break;
    }
    if (!bestNumerator) return { text: `${sign}${whole}`, align: "right" };
    const prefix = whole ? `${whole} ` : "";
    return { text: `${sign}${prefix}${bestNumerator}/${bestDenominator}`, align: "right" };
  }

  static formatSpecial(val, config = {}) {
    const digits = String(val ?? "").replace(/\D/g, "");
    const pattern = String(config.specialFormat || "00000");
    if (pattern === "00000") return { text: digits.padStart(5, "0").slice(-5), align: "right" };
    if (pattern === "00000-0000") return { text: `${digits.padStart(9, "0").slice(0, 5)}-${digits.padStart(9, "0").slice(5, 9)}`, align: "right" };
    const padded = digits.padStart(10, "0").slice(-10);
    return { text: digits.length <= 7 ? `${padded.slice(-7, -4)}-${padded.slice(-4)}` : `(${padded.slice(0, 3)}) ${padded.slice(3, 6)}-${padded.slice(6)}`, align: "right" };
  }

  /**
   * Định dạng Tùy chỉnh (Custom pattern)
   */
  static formatCustom(val, config = {}) {
    const pattern = config.customPattern || "General";
    if (pattern === "General") {
      return {
        text: this.formatGeneralNumber(val),
        align: typeof val === "number" ? "right" : undefined
      };
    }

    const num = this.parseNumber(val);
    if (num === null) return { text: String(val) };

    const sections = pattern.split(";");
    let targetSection = sections[0];

    if (num < 0 && sections.length > 1) {
      targetSection = sections[1];
    } else if (num === 0 && sections.length > 2) {
      targetSection = sections[2];
    }

    let isRed = false;
    if (targetSection.includes("[Red]") || targetSection.includes("[Đỏ]")) {
      isRed = true;
      targetSection = targetSection.replace(/\[(Red|Đỏ)\]/gi, "");
    }

    const isPercentage = targetSection.includes("%");
    const workingNum = isPercentage ? Math.abs(num) * 100 : Math.abs(num);

    const literals = [];
    let cleanPattern = targetSection.replace(/"([^"]*)"/g, (_, match) => {
      literals.push(match);
      return `\u0000${literals.length - 1}\u0000`;
    });

    const dotIndex = cleanPattern.indexOf(".");
    let decimals = 0;
    if (dotIndex >= 0) {
      const decPart = cleanPattern.slice(dotIndex + 1);
      for (const char of decPart) {
        if (char === "0" || char === "#") decimals++;
        else break;
      }
    }

    const useThousands = cleanPattern.includes(",");
    let formattedNum = this._formatDecimalAndThousands(workingNum, decimals, useThousands);

    let output = cleanPattern;
    const numPlaceholderMatch = output.match(/[#0,.]+/);
    if (numPlaceholderMatch) {
      output = output.replace(numPlaceholderMatch[0], formattedNum);
    }

    if (num < 0 && sections.length === 1 && !output.includes("-") && !output.includes("(")) {
      output = `-${output}`;
    }

    output = output.replace(/\u0000(\d+)\u0000/g, (_, idx) => literals[Number(idx)] || "");
    output = output.replace(/_[\s\S]/g, "").replace(/\*[\s\S]/g, "").replace(/\\(.)/g, "$1").replace(/\?/g, "").trim();

    return { text: output, isRed, align: "right" };
  }

  static _formatDecimalAndThousands(absVal, decimals, useThousands) {
    const fixedStr = absVal.toFixed(decimals);
    const [intPart, decPart] = fixedStr.split(".");

    let formattedInt = intPart;
    if (useThousands) {
      formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return decimals > 0 && decPart ? `${formattedInt}.${decPart}` : formattedInt;
  }

  /**
   * Xác định số chữ số phần thập phân của cấu hình định dạng ô.
   * Trả về số nguyên >= 0 hoặc null nếu định dạng General/không cố định thập phân.
   */
  static getFormatDecimals(formatConfig) {
    if (!formatConfig) return null;
    const cfg = typeof formatConfig === "string" ? { code: formatConfig } : formatConfig;
    if (typeof cfg !== "object") return null;
    if (cfg.decimals !== undefined && cfg.decimals !== null) {
      return Math.max(0, Math.min(30, Number(cfg.decimals)));
    }
    const code = cfg.code || cfg.formatCode || "";
    if (typeof code === "string" && code) {
      const match = code.match(/\.([0#]+)/);
      if (match) return match[1].length;
      if (/^[0#,\s%]+$/.test(code) && !code.includes(".")) return 0;
    }
    const cat = cfg.category;
    if (cat === "number" || cat === "currency" || cat === "accounting" || cat === "percentage") {
      return 2;
    }
    return null;
  }

  /**
   * Làm tròn giá trị số theo độ chính xác của định dạng hiển thị.
   * Dùng khi bật tùy chọn Precision as displayed (fullPrecision="0").
   */
  static roundToFormatPrecision(val, formatConfig) {
    if (typeof val !== "number" || !Number.isFinite(val)) return val;
    const decimals = this.getFormatDecimals(formatConfig);
    if (decimals === null) return val;
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  }

  static _parseDate(val, config = {}) {
    if (val instanceof Date) return val;
    if (typeof val === "number") {
      if (val > 10000000000) return new Date(val);
      if (val > 0 && val < 200000) {
        const is1904 = Boolean(config?.date1904 ?? this.date1904);
        const offset = is1904 ? 24107 : 25569;
        const utcDays = val - offset;
        return new Date(utcDays * 86400 * 1000);
      }
      return new Date(val);
    }

    const str = String(val).trim();
    if (!str) return null;

    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (dmyMatch) {
      const d = parseInt(dmyMatch[1], 10);
      const m = parseInt(dmyMatch[2], 10) - 1;
      const y = parseInt(dmyMatch[3], 10);
      const hh = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
      const mm = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
      const ss = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      return new Date(y, m, d, hh, mm, ss);
    }

    const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10) - 1;
      const d = parseInt(isoMatch[3], 10);
      const hh = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
      const mm = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
      const ss = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
      return new Date(y, m, d, hh, mm, ss);
    }

    const vnTextMatch = str.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
    if (vnTextMatch) {
      const d = parseInt(vnTextMatch[1], 10);
      const m = parseInt(vnTextMatch[2], 10) - 1;
      const y = parseInt(vnTextMatch[3], 10);
      return new Date(y, m, d);
    }

    const timestamp = Date.parse(str);
    return isNaN(timestamp) ? null : new Date(timestamp);
  }

  /**
   * Infer types only for literal user entry. Imports and programmatic cell
   * updates continue to use normalizeInputForFormat() unchanged.
   */
  static inferUserInput(inputVal, formatConfig, locale = {}) {
    if (typeof inputVal !== "string") return null;
    const input = inputVal.trim();
    if (inputVal === "") return { value: "" };
    if (formatConfig?.category === "text") return { value: inputVal };
    if (inputVal.startsWith("=")) return null;
    if (inputVal.startsWith("'")) return { value: inputVal.slice(1), forceText: true };

    const dateMatch = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dateMatch) {
      const day = Number(dateMatch[1]);
      const month = Number(dateMatch[2]);
      const year = Number(dateMatch[3]);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
        const excelEpoch = Date.UTC(1899, 11, 30);
        return {
          value: (date.getTime() - excelEpoch) / 86400000,
          numberFormat: { category: "date", dateFormat: "dd/mm/yyyy" }
        };
      }
    }

    const timeMatch = input.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      const seconds = timeMatch[3] !== undefined ? Number(timeMatch[3]) : null;
      if (hours < 24 && minutes < 60 && (seconds === null || seconds < 60)) {
        return {
          value: (hours * 3600 + minutes * 60 + (seconds || 0)) / 86400,
          numberFormat: { category: "time", timeFormat: seconds !== null ? "hh:mm:ss" : "hh:mm" }
        };
      }
    }

    const parseNumber = (raw, { details = false } = {}) => {
      const decimal = String(locale.decimalSeparator ?? ".");
      const grouping = String(locale.thousandsSeparator ?? ",");
      if (!raw || !decimal || decimal === grouping || decimal.length !== 1 || grouping.length > 2) return null;
      const sign = /^[+-]/.test(raw) ? raw[0] : "";
      const unsigned = sign ? raw.slice(1) : raw;
      if (!unsigned) return null;
      const decimalParts = unsigned.split(decimal);
      if (decimalParts.length > 2) return null;
      const integerPart = decimalParts[0];
      const fractionPart = decimalParts.length === 2 ? decimalParts[1] : null;
      if (fractionPart !== null && !/^\d*$/.test(fractionPart)) return null;
      let integerDigits = integerPart;
      let hasThousandsGroup = false;
      if (grouping && integerPart.includes(grouping)) {
        const groups = integerPart.split(grouping);
        if (!/^\d{1,3}$/.test(groups[0]) || groups.slice(1).some(group => !/^\d{3}$/.test(group))) return null;
        integerDigits = groups.join("");
        hasThousandsGroup = true;
      }
      if (integerDigits && !/^\d+$/.test(integerDigits)) return null;
      if (!integerDigits && (fractionPart === null || fractionPart === "")) return null;
      const normalized = `${sign}${integerDigits || "0"}${fractionPart === null ? "" : `.${fractionPart}`}`;
      const number = Number(normalized);
      if (!Number.isFinite(number)) return null;
      if (details) {
        return {
          number,
          hasThousandsGroup,
          decimals: fractionPart !== null ? fractionPart.length : 0
        };
      }
      return number;
    };

    const currency = /^(?:₫|đ|đồng|vnd|vnđ)\s*(.+)$/iu.exec(input)
      || /^(.+?)\s*(?:₫|đ|đồng|vnd|vnđ)$/iu.exec(input);
    if (currency) {
      const rawNum = currency[1].trim();
      let number = null;
      if (/^\d{1,3}(?:\.\d{3})+$/.test(rawNum)) {
        number = Number(rawNum.replace(/\./g, ""));
      } else if (/^\d{1,3}(?:,\d{3})+$/.test(rawNum)) {
        number = Number(rawNum.replace(/,/g, ""));
      } else {
        number = parseNumber(rawNum);
      }
      if (number !== null && Number.isFinite(number)) {
        return {
          value: number,
          numberFormat: { category: "currency", currencySymbol: "₫", decimals: 0, useThousands: true, symbolPosition: "after" }
        };
      }
    }

    if (input.endsWith("%")) {
      const number = parseNumber(input.slice(0, -1).trim());
      if (number !== null) {
        return { value: number / 100, numberFormat: { category: "percentage", decimals: 0 } };
      }
    }

    const parsed = parseNumber(input, { details: true });
    if (parsed !== null) {
      if (parsed.hasThousandsGroup) {
        return {
          value: parsed.number,
          numberFormat: {
            category: "number",
            useThousands: true,
            decimals: parsed.decimals > 0 ? Math.max(2, parsed.decimals) : 0
          }
        };
      }
      return { value: parsed.number };
    }
    return { value: inputVal };
  }

  /** True only for the unambiguous date spellings accepted by Sheet input. */
  static isDateInput(val) {
    if (typeof val !== "string") return false;
    const str = val.trim();
    const match = str.match(/^(?:(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})|(\d{4})[\/-](\d{1,2})[\/-](\d{1,2}))(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
    if (!match) return false;
    const day = Number(match[1] || match[6]);
    const month = Number(match[2] || match[5]);
    const year = Number(match[3] || match[4]);
    const hour = Number(match[7] || 0);
    const minute = Number(match[8] || 0);
    const second = Number(match[9] || 0);
    if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return false;
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  /**
   * True only for the H:MM, HH:MM, HH:MM:SS spellings Sheet accepts as a time
   * (giờ 0-23, phút/giây 0-59). Mẫu khác như 1:2, 1234, 25:00, 13:60 là văn bản.
   * @param {any} val
   * @returns {boolean}
   */
  static isTimeInput(val) {
    if (typeof val !== "string") return false;
    const match = val.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return false;
    return Number(match[1]) <= 23 && Number(match[2]) <= 59 && Number(match[3] || 0) <= 59;
  }

  static _dateInputToSerial(inputVal) {
    const date = this._parseDate(inputVal);
    if (!date || isNaN(date.getTime())) return inputVal;
    const epoch = Date.UTC(1899, 11, 30);
    const utcValue = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
    return Math.round((utcValue - epoch) / 86400000 * 1000000) / 1000000;
  }

  static normalizeInputForFormat(inputVal, formatConfig) {
    if (inputVal === null || inputVal === undefined || inputVal === "") return "";
    if (typeof inputVal === "string" && inputVal.startsWith("=")) return inputVal;

    if (!formatConfig || !formatConfig.category || formatConfig.category === "general") {
      if (typeof inputVal !== "string") return inputVal;
      const str = inputVal.trim();
      if (this.isDateInput(str)) return this._dateInputToSerial(str);
      const strictNumber = /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
      if (strictNumber.test(str)) {
        const parsed = this.parseNumber(str);
        return parsed !== null && Number.isFinite(parsed) ? parsed : inputVal;
      }
      // A single comma with one or two trailing digits is a decimal in the
      // Vietnamese locale; comma groups of three remain thousands separators.
      if (/^[+-]?\d+,\d{1,2}$/.test(str) && !/^[+-]?\d{1,3},\d{3}$/.test(str)) {
        const parsed = this.parseNumber(str);
        return parsed !== null && Number.isFinite(parsed) ? parsed : inputVal;
      }
      return inputVal;
    }

    const { category } = formatConfig;

    if (category === "text") {
      return String(inputVal);
    }

    if (category === "percentage") {
      const str = String(inputVal).trim();
      if (str.endsWith("%")) {
        const num = parseFloat(str.slice(0, -1));
        return isNaN(num) ? inputVal : num / 100;
      }
      const num = Number(str);
      if (!isNaN(num)) {
        return num / 100;
      }
      return inputVal;
    }

    if (category === "number" || category === "currency" || category === "accounting") {
      const parsed = this.parseNumber(inputVal);
      return parsed !== null ? parsed : inputVal;
    }

    if (category === "time") {
      const match = String(inputVal).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
      if (match) {
        const hours = Number(match[1]);
        const minutes = Number(match[2]);
        const seconds = Number(match[3] || 0);
        if (hours < 24 && minutes < 60 && seconds < 60) return (hours * 3600 + minutes * 60 + seconds) / 86400;
      }
      return inputVal;
    }

    if (category === "date") {
      return this._dateInputToSerial(inputVal);
    }

    return inputVal;
  }
}
