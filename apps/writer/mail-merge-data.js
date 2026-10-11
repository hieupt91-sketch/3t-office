/** Dependency-free data parsing for 3T Doc mail merge. */

function unescapeXml(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Phân tích cú pháp dữ liệu bảng tính ODF Flat XML (FODS) do LibreOffice chuyển đổi từ XLSX / XLS / ODS.
 * Trích xuất danh sách tất cả trang tính (sheets), các cột tiêu đề dòng đầu và từng bản ghi.
 * Bảo toàn 100% định dạng hiển thị của Excel cho số tiền, ngày tháng và tiếng Việt Unicode.
 * 
 * @param {string} xmlText Nội dung tài liệu XML FODS
 * @param {Object} [options={}]
 * @param {boolean} [options.hasHeaders=true] Dòng đầu tiên là tiêu đề cột
 * @returns {{ sheets: Array<{ name: string, fields: string[], records: Array<Record<string, string>> }>, activeSheetIndex: number }}
 */
export function parseFodsData(xmlText, options = {}) {
  if (!xmlText || typeof xmlText !== "string") {
    return { sheets: [], activeSheetIndex: 0 };
  }

  const hasHeaders = options.hasHeaders !== false;
  const sheets = [];

  // Tìm tất cả các bảng <table:table ...>
  const tableRegex = /<table:table\b([^>]*)>([\s\S]*?)<\/table:table>/gi;
  let tableMatch;

  while ((tableMatch = tableRegex.exec(xmlText)) !== null) {
    const tableAttrs = tableMatch[1] || "";
    const tableBody = tableMatch[2] || "";

    const nameMatch = tableAttrs.match(/table:name=["']([^"']+)["']/i);
    const sheetName = nameMatch ? unescapeXml(nameMatch[1]) : `Trang tính ${sheets.length + 1}`;
    // Bỏ qua bảng nội bộ tạm của Calc
    if (sheetName === "local-table") continue;

    const rows = [];
    const rowRegex = /<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/gi;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableBody)) !== null) {
      const rowContent = rowMatch[1] || "";
      const rowCells = [];
      const cellRegex = /<table:table-cell\b([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:table-cell\b([^>]*)\/>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const cellAttrs = cellMatch[1] || cellMatch[3] || "";
        const cellBody = cellMatch[2] || "";

        let repeat = 1;
        const repMatch = cellAttrs.match(/table:number-columns-repeated=["'](\d+)["']/i);
        if (repMatch) {
          repeat = parseInt(repMatch[1], 10) || 1;
        }

        let cellText = "";
        // Ưu tiên 1: Chuỗi hiển thị bên trong <text:p> (chứa chính xác định dạng số/ngày như Excel)
        const pMatches = cellBody.match(/<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi);
        if (pMatches && pMatches.length > 0) {
          cellText = pMatches.map((p) => {
            const inner = p.replace(/<text:p\b[^>]*>/i, "").replace(/<\/text:p>/i, "");
            const withSpaces = inner
              .replace(/<text:s\b[^>]*\bc=["'](\d+)["'][^>]*\/>/gi, (_, c) => " ".repeat(parseInt(c, 10) || 1))
              .replace(/<text:s\b[^>]*\/>/gi, " ");
            const noTags = withSpaces.replace(/<[^>]+>/g, "");
            return unescapeXml(noTags);
          }).join("\n");
        } else {
          // Ưu tiên 2: office:string-value
          const strMatch = cellAttrs.match(/office:string-value=["']([^"']*)["']/i);
          if (strMatch) {
            cellText = unescapeXml(strMatch[1]);
          } else {
            // Ưu tiên 3: office:value hoặc office:date-value
            const valMatch = cellAttrs.match(/office:value=["']([^"']*)["']/i) || cellAttrs.match(/office:date-value=["']([^"']*)["']/i);
            if (valMatch) {
              cellText = unescapeXml(valMatch[1]);
            }
          }
        }

        cellText = cellText.trim();

        // Tránh cấp phát hàng ngàn ô trống vô tận của Calc
        if (!cellText && repeat > 1) {
          repeat = Math.min(repeat, 1);
        } else if (repeat > 256) {
          repeat = 256;
        }

        for (let r = 0; r < repeat; r++) {
          rowCells.push(cellText);
        }
      }

      // Cắt bỏ các ô trống ở cuối dòng
      while (rowCells.length > 0 && rowCells[rowCells.length - 1] === "") {
        rowCells.pop();
      }

      if (rowCells.length > 0) {
        rows.push(rowCells);
      }
    }

    if (rows.length === 0) {
      sheets.push({ name: sheetName, fields: [], records: [] });
      continue;
    }

    let fields = [];
    const records = [];

    if (hasHeaders) {
      fields = rows[0].map((c) => c.trim()).filter(Boolean);
      if (fields.length === 0) {
        const maxCols = Math.max(...rows.map((r) => r.length));
        fields = Array.from({ length: maxCols }, (_, i) => `Cột ${i + 1}`);
      }
      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const record = { _selected: true };
        for (let c = 0; c < fields.length; c++) {
          record[fields[c]] = (row[c] !== undefined ? row[c] : "").trim();
        }
        records.push(record);
      }
    } else {
      const maxCols = Math.max(...rows.map((r) => r.length));
      fields = Array.from({ length: maxCols }, (_, i) => `Cột ${i + 1}`);
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        const record = { _selected: true };
        for (let c = 0; c < fields.length; c++) {
          record[fields[c]] = (row[c] !== undefined ? row[c] : "").trim();
        }
        records.push(record);
      }
    }

    sheets.push({ name: sheetName, fields, records });
  }

  return { sheets, activeSheetIndex: 0 };
}

/**
 * Phân tích cú pháp văn bản phân tách (CSV, TSV, dấu chấm phẩy) thuần JavaScript.
 * Hỗ trợ dấu ngoặc kép bọc chuỗi, dấu nháy kép thoát "", xuống dòng \r\n hoặc \n.
 * 
 * @param {string} text
 * @param {Object} [options={}]
 * @param {string} [options.delimiter] Tùy chọn dấu phân tách (tự động phát hiện nếu bỏ trống)
 * @param {boolean} [options.hasHeaders=true] Dòng đầu tiên là tiêu đề cột
 * @returns {{ fields: string[], records: Array<Record<string, string>>, hasHeaders: boolean, delimiter: string }}
 */
export function parseDelimitedText(text, options = {}) {
  if (!text || typeof text !== "string") {
    return { fields: [], records: [], hasHeaders: true, delimiter: "," };
  }

  const hasHeaders = options.hasHeaders !== false;

  let delimiter = options.delimiter;
  if (!delimiter) {
    const firstLine = text.split(/\r\n|\n/)[0] || "";
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semiCount = (firstLine.match(/;/g) || []).length;

    if (tabCount > 0 && tabCount >= commaCount) {
      delimiter = "\t";
    } else if (semiCount > 0 && semiCount > commaCount) {
      delimiter = ";";
    } else {
      delimiter = ",";
    }
  }

  const rows = [];
  let currentRow = [];
  let currentVal = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentVal += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === delimiter) {
        currentRow.push(currentVal.trim());
        currentVal = "";
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = "";
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = "";
        i++;
        continue;
      } else {
        currentVal += char;
        i++;
        continue;
      }
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  const nonEmptyRows = rows.filter((r) => r.some((c) => c.trim().length > 0));
  if (nonEmptyRows.length === 0) {
    return { fields: [], records: [], hasHeaders, delimiter };
  }

  let fields = [];
  const records = [];

  if (hasHeaders) {
    fields = nonEmptyRows[0].map((h) => h.trim()).filter(Boolean);
    for (let r = 1; r < nonEmptyRows.length; r++) {
      const row = nonEmptyRows[r];
      const record = { _selected: true };
      for (let c = 0; c < fields.length; c++) {
        record[fields[c]] = (row[c] !== undefined ? row[c] : "").trim();
      }
      records.push(record);
    }
  } else {
    const maxCols = Math.max(...nonEmptyRows.map((r) => r.length));
    fields = Array.from({ length: maxCols }, (_, i) => `Cột ${i + 1}`);
    for (let r = 0; r < nonEmptyRows.length; r++) {
      const row = nonEmptyRows[r];
      const record = { _selected: true };
      for (let c = 0; c < fields.length; c++) {
        record[fields[c]] = (row[c] !== undefined ? row[c] : "").trim();
      }
      records.push(record);
    }
  }

  return { fields, records, hasHeaders, delimiter };
}

/**
 * Phân tích cú pháp CSV thuần JavaScript (kế thừa tương thích hoàn toàn)
 * @param {string} text
 * @returns {{ fields: string[], records: Array<Record<string, string>> }}
 */
export function parseCsv(text) {
  return parseDelimitedText(text, { delimiter: "," });
}

/**
 * Thay thế tất cả trường trộn thư trong chuỗi HTML bằng dữ liệu của bản ghi thật
 * @param {string} html
 * @param {Record<string, string>} record
 * @returns {string}
 */
export function replaceMergeFields(html, record) {
  if (!html || typeof html !== "string") return "";
  const withRules = html.replace(/<span\b([^>]*\bdata-merge-if=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/span>/gi,
    (match, attrs, field, fallback) => {
      const get = (name) => (attrs.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i")) || [])[1] || "";
      const value = record?.[field] == null ? "" : String(record[field]);
      const expected = get("data-value");
      const op = get("data-op");
      let pass = false;
      switch (op) {
        case "equals": pass = value === expected; break;
        case "notEquals": pass = value !== expected; break;
        case "contains": pass = value.includes(expected); break;
        case "greaterThan": pass = Number(value) > Number(expected); break;
        case "lessThan": pass = Number(value) < Number(expected); break;
        case "empty": pass = value.trim() === ""; break;
        case "notEmpty": pass = value.trim() !== ""; break;
        default: return fallback;
      }
      return pass ? get("data-then") : get("data-else");
    });
  return withRules.replace(
    /<span\b([^>]*\bdata-field=["']([^"']+)["'][^>]*)>([\s\S]*?)<\/span>/gi,
    (match, attrs, fieldName) => {
      if (record && record[fieldName] !== undefined) {
        return record[fieldName];
      }
      return "";
    }
  );
}
