import {
  parseCssStyleBlocks,
  parseCssDeclarations,
  decodeHtmlEntities,
  stripHtmlTags,
  parseCssLengthToPx,
  columnLabel,
  columnNumber,
  detectNumberFormat,
  extractCellValueAndFormula,
  normalizeCssColor,
  extractCellStyle,
  parseHtmlAttributes,
  parseOfficeHtmlTable,
  parseOfficeTsv,
  cleanCssStyleString,
  cleanWordHtml,
  convertMsoListsToHtmlLists,
  serializeWriterSelectionToClipboard,
  getSheetCellDisplayText,
  isCellBold,
  serializeSheetRangeToClipboard
} from "../../platform/clipboard/office-clipboard.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export async function runOfficeClipboardTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Excel date without x:num becomes a date serial", () => {
    const result = parseOfficeHtmlTable('<table><tr><td style="mso-number-format:dd/mm/yyyy">31/12/2026</td></tr></table>');
    assertEqual(result.cells[0][0].val, 46387);
    assertEqual(result.cells[0][0].style.numberFormat.category, "date");
  });

  test("Word bullet marker CSS decimal is not a numbered list", () => {
    const cleaned = cleanWordHtml('<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1"><span style="font-size:7.0pt">Bullet item one</span></p><p class="MsoListParagraph" style="mso-list:l0 level1 lfo1">Bullet item two</p>');
    assert(cleaned.includes("<ul"), "Real Word bullets must remain unordered");
    assert(!cleaned.includes("<ol"), "CSS decimals must not select numbering");
  });

  // =============================================================================
  // PHẦN 1: TIỆN ÍCH CSS & HTML
  // =============================================================================

  test("parseCssStyleBlocks - trích xuất rules từ <style>", () => {
    const html = `<style>.xl65 { font-weight: bold; color: #ff0000; } td.xl66 { background: #ffff00; }</style>`;
    const rules = parseCssStyleBlocks(html);
    assertEqual(rules["xl65"]["font-weight"], "bold");
    assertEqual(rules["xl65"]["color"], "#ff0000");
    assertEqual(rules["xl66"]["background"], "#ffff00");
  });

  test("parseCssStyleBlocks - xử lý nhiều class trong selector", () => {
    const html = `<style>.a, .b { color: red; }</style>`;
    const rules = parseCssStyleBlocks(html);
    assertEqual(rules["a"]["color"], "red");
    assertEqual(rules["b"]["color"], "red");
  });

  test("parseCssDeclarations - phân tích CSS declarations", () => {
    const decls = parseCssDeclarations("font-weight: bold; color: #000000; background: yellow;");
    assertEqual(decls["font-weight"], "bold");
    assertEqual(decls["color"], "#000000");
    assertEqual(decls["background"], "yellow");
  });

  test("decodeHtmlEntities - giải mã các entity cơ bản", () => {
    const input = "&nbsp;" + "&" + "<>" + "'" + "&#x41;";
    const expected = " " + "&" + "<>" + "'" + "A";
    assertEqual(decodeHtmlEntities(input), expected);
  });

  test("stripHtmlTags - loại bỏ thẻ và lấy text", () => {
    const text = stripHtmlTags("<p>Hello <b>World</b></p><br/>End");
    assert(text.includes("Hello"));
    assert(text.includes("World"));
    assert(text.includes("End"));
  });

  test("parseCssLengthToPx - chuyển đổi đơn vị", () => {
    assertEqual(parseCssLengthToPx("12pt"), 16);
    assertEqual(parseCssLengthToPx("1in"), 96);
    assertEqual(parseCssLengthToPx("1cm"), 38);
    assertEqual(parseCssLengthToPx("10px"), 10);
    assertEqual(parseCssLengthToPx(12), 12);
  });

  test("columnLabel - chuyển số cột thành chữ", () => {
    assertEqual(columnLabel(1), "A");
    assertEqual(columnLabel(26), "Z");
    assertEqual(columnLabel(27), "AA");
    assertEqual(columnLabel(52), "AZ");
    assertEqual(columnLabel(702), "ZZ");
    assertEqual(columnLabel(703), "AAA");
  });

  test("columnNumber - chuyển chữ cột thành số", () => {
    assertEqual(columnNumber("A"), 1);
    assertEqual(columnNumber("Z"), 26);
    assertEqual(columnNumber("AA"), 27);
    assertEqual(columnNumber("AZ"), 52);
    assertEqual(columnNumber("ZZ"), 702);
    assertEqual(columnNumber("AAA"), 703);
  });

  // =============================================================================
  // PHẦN 2: SHEET - NUMBER FORMAT DETECTION
  // =============================================================================

  test("detectNumberFormat - Text format (@)", () => {
    const fmt = detectNumberFormat("\\@", "abc");
    assertEqual(fmt.category, "text");
  });

  test("detectNumberFormat - Percentage format", () => {
    const fmt = detectNumberFormat("0.00%", "50%");
    assertEqual(fmt.category, "percentage");
    assertEqual(fmt.decimals, 2);
  });

  test("detectNumberFormat - Percentage từ text", () => {
    const fmt = detectNumberFormat("", "75%");
    assertEqual(fmt.category, "percentage");
  });

  test("detectNumberFormat - Date format", () => {
    const fmt = detectNumberFormat("dd/mm/yyyy", "01/01/2024");
    assertEqual(fmt.category, "date");
    assertEqual(fmt.formatPattern, "dd/mm/yyyy");
  });

  test("detectNumberFormat - Currency USD", () => {
    const fmt = detectNumberFormat("$#,##0.00", "$1,234.56");
    assertEqual(fmt.category, "currency");
    assertEqual(fmt.symbol, "$");
  });

  test("detectNumberFormat - Currency VND", () => {
    const fmt = detectNumberFormat("#,##0 ₫", "1.000.000 ₫");
    assertEqual(fmt.category, "currency");
    assertEqual(fmt.symbol, "₫");
  });

  test("detectNumberFormat - Number format", () => {
    const fmt = detectNumberFormat("#,##0.00", "1,234.56");
    assertEqual(fmt.category, "number");
    assertEqual(fmt.decimals, 2);
    assertEqual(fmt.useSeparator, true);
  });

  test("parseOfficeHtmlTable - localized Excel CF_HTML decimal placeholders", () => {
    const html = `<style>
      table { mso-displayed-decimal-separator:"\\,"; mso-displayed-thousand-separator:"\\."; }
      .xl66 { mso-number-format:"\\#\\.\\#\\#0"; }
      .xl69 { mso-number-format:"\\#\\.\\#\\#000"; }
    </style><table><tr><td class=xl66 align=right>1250,0</td><td class=xl69 align=right>1234,56000</td></tr></table>`;
    const result = parseOfficeHtmlTable(html);
    assertEqual(result.cells[0][0].val, 1250);
    assertEqual(result.cells[0][0].style.numberFormat.decimals, 0);
    assertEqual(result.cells[0][1].val, 1234.56);
    assertEqual(result.cells[0][1].style.numberFormat.decimals, 2);
    assertEqual(result.cells[0][1].style.numberFormat.useThousands, true);
  });

  // =============================================================================
  // PHẦN 3: SHEET - CELL VALUE & FORMULA EXTRACTION
  // =============================================================================

  test("extractCellValueAndFormula - x:num attribute", () => {
    const attrs = { "x:num": "42" };
    const { val, formula } = extractCellValueAndFormula(attrs, "42", null);
    assertEqual(val, 42);
    assertEqual(formula, "");
  });

  test("extractCellValueAndFormula - sdval attribute (Calc)", () => {
    const attrs = { "sdval": "3.14" };
    const { val } = extractCellValueAndFormula(attrs, "3.14", null);
    assertEqual(val, 3.14);
  });

  test("extractCellValueAndFormula - x:f formula attribute", () => {
    const attrs = { "x:f": "A1+B1" };
    const { val, formula } = extractCellValueAndFormula(attrs, "5", null);
    assertEqual(formula, "=A1+B1");
  });

  test("extractCellValueAndFormula - data-formula attribute", () => {
    const attrs = { "data-formula": "SUM(A1:A10)" };
    const { formula } = extractCellValueAndFormula(attrs, "55", null);
    assertEqual(formula, "=SUM(A1:A10)");
  });

  test("extractCellValueAndFormula - percentage parsing", () => {
    const attrs = {};
    const numberFormat = { category: "percentage" };
    const { val } = extractCellValueAndFormula(attrs, "50%", numberFormat);
    assertEqual(val, 0.5);
  });

  test("extractCellValueAndFormula - no formula when not present", () => {
    const attrs = {};
    const { formula } = extractCellValueAndFormula(attrs, "100", null);
    assertEqual(formula, "");
  });

  // =============================================================================
  // PHẦN 4: SHEET - CELL STYLE EXTRACTION
  // =============================================================================

  test("normalizeCssColor - chuẩn hóa màu", () => {
    assertEqual(normalizeCssColor("windowtext"), "#000000");
    assertEqual(normalizeCssColor("auto"), "#000000");
    assertEqual(normalizeCssColor("window"), "");
    assertEqual(normalizeCssColor("#ff0000"), "#ff0000");
    assertEqual(normalizeCssColor("rgb(255,0,0)"), "rgb(255,0,0)");
  });

  test("extractCellStyle - bold/italic/underline", () => {
    const combined = { "font-weight": "bold", "font-style": "italic", "text-decoration": "underline" };
    const style = extractCellStyle(combined, {}, "<b><i><u>text</u></i></b>");
    assertEqual(style.fontWeight, "bold");
    assertEqual(style.fontStyle, "italic");
    assertEqual(style.textDecoration, "underline");
  });

  test("extractCellStyle - color và background", () => {
    const combined = { "color": "#ff0000", "background-color": "#ffff00" };
    const style = extractCellStyle(combined, { bgcolor: "#00ff00" }, "");
    assertEqual(style.color, "#ff0000");
    assertEqual(style.backgroundColor, "#ffff00");
  });

  test("extractCellStyle - borders", () => {
    const combined = { "border": "1px solid #000", "border-top": "2px dashed red" };
    const style = extractCellStyle(combined, {}, "");
    assertEqual(style.border, "1px solid #000");
    assertEqual(style.borderTop, "2px dashed red");
  });

  test("extractCellStyle - text-align và vertical-align", () => {
    const combined = { "text-align": "center", "vertical-align": "middle" };
    const style = extractCellStyle(combined, { align: "right", valign: "top" }, "");
    assertEqual(style.textAlign, "center");
    assertEqual(style.verticalAlign, "middle");
  });

  // =============================================================================
  // PHẦN 5: SHEET - PARSE OFFICE HTML TABLE
  // =============================================================================

  test("parseOfficeHtmlTable - bảng Excel đơn giản", () => {
    const html = `
      <table>
        <tr><td>1</td><td>2</td></tr>
        <tr><td>3</td><td>4</td></tr>
      </table>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    assertEqual(result.cells.length, 2);
    assertEqual(result.cells[0].length, 2);
    // parseOfficeHtmlTable chuyển đổi thành số khi có thể
    assertEqual(result.cells[0][0].val, 1);
    assertEqual(result.cells[1][1].val, 4);
  });

  test("parseOfficeHtmlTable - colspan và rowspan", () => {
    const html = `
      <table>
        <tr><td colspan="2">Header</td></tr>
        <tr><td>A</td><td rowspan="2">B</td></tr>
        <tr><td>C</td></tr>
      </table>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    assertEqual(result.mergedRanges.length, 2);
    // colspan=2 at A1
    assertEqual(result.mergedRanges[0].start.c, "A");
    assertEqual(result.mergedRanges[0].start.r, 1);
    assertEqual(result.mergedRanges[0].end.c, "B");
    assertEqual(result.mergedRanges[0].end.r, 1);
  });

  test("parseOfficeHtmlTable - mso-number-format và x:num", () => {
    const html = `
      <table>
        <tr>
          <td style="mso-number-format:'0.00%'" x:num="0.5">50%</td>
          <td style="mso-number-format:'#,##0.00'" x:num="1234.56">1,234.56</td>
        </tr>
      </table>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    // percentage cell
    assertEqual(result.cells[0][0].val, 0.5);
    assertEqual(result.cells[0][0].style.numberFormat.category, "percentage");
    // number cell
    assertEqual(result.cells[0][1].val, 1234.56);
    assertEqual(result.cells[0][1].style.numberFormat.category, "number");
  });

  test("parseOfficeHtmlTable - bold/italic/color từ inline style", () => {
    const html = `
      <table>
        <tr>
          <td style="font-weight:bold; color:#ff0000; background-color:#ffff00">Bold Red</td>
        </tr>
      </table>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    assertEqual(result.cells[0][0].style.fontWeight, "bold");
    assertEqual(result.cells[0][0].style.color, "#ff0000");
    assertEqual(result.cells[0][0].style.backgroundColor, "#ffff00");
  });

  test("parseOfficeHtmlTable - col width từ <col>", () => {
    const html = `
      <table>
        <col width="100"><col width="200">
        <tr><td>A</td><td>B</td></tr>
      </table>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    assertEqual(result.colWidths.length, 2);
    assertEqual(result.colWidths[0], 100);
    assertEqual(result.colWidths[1], 200);
  });

  // =============================================================================
  // PHẦN 6: SHEET - PARSE TSV
  // =============================================================================

  test("parseOfficeTsv - text/plain tab-separated", () => {
    const text = "A\tB\tC\n1\t2\t3\n4\t5\t6";
    const result = parseOfficeTsv(text);
    assertEqual(result.cells.length, 3);
    assertEqual(result.cells[0].length, 3);
    assertEqual(result.cells[0][0].val, "A");
    // parseOfficeTsv chuyển đổi thành số khi có thể
    assertEqual(result.cells[1][1].val, 2);
  });

  test("parseOfficeTsv - số và phần trăm", () => {
    const text = "10\t20%\t=SUM(A1:B1)";
    const result = parseOfficeTsv(text);
    assertEqual(result.cells[0][0].val, 10);
    assertEqual(result.cells[0][1].val, 0.2);
    assertEqual(result.cells[0][1].style.numberFormat.category, "percentage");
    assertEqual(result.cells[0][2].formula, "=SUM(A1:B1)");
  });

  test("parseOfficeTsv - dòng rỗng cuối được bỏ", () => {
    const text = "A\tB\n1\t2\n";
    const result = parseOfficeTsv(text);
    assertEqual(result.cells.length, 2);
  });

  // =============================================================================
  // PHẦN 7: WRITER - CLEAN WORD HTML
  // =============================================================================

  test("cleanWordHtml - loại bỏ conditional comments", () => {
    const html = `<!--[if gte mso 9]><xml><o:OfficeDocumentSettings></o:OfficeDocumentSettings></xml><![endif]--><p>Hello</p>`;
    const cleaned = cleanWordHtml(html);
    assert(!cleaned.includes("if gte mso"));
    assert(!cleaned.includes("xml"));
    assert(cleaned.includes("<p>Hello</p>"));
  });

  test("cleanWordHtml - loại bỏ w:* o:* v:* m:* tags", () => {
    const html = `<w:p><w:r><w:t>Text</w:t></w:r></w:p><o:p></o:p>`;
    const cleaned = cleanWordHtml(html);
    assert(!cleaned.includes("w:p"));
    assert(!cleaned.includes("w:r"));
    assert(!cleaned.includes("w:t"));
    assert(!cleaned.includes("o:p"));
    assert(cleaned.includes("Text"));
  });

  test("cleanWordHtml - loại bỏ mso-* styles", () => {
    const html = `<p style="mso-margin-top-alt:auto; margin-top:10pt;">Text</p>`;
    const cleaned = cleanWordHtml(html);
    assert(!cleaned.includes("mso-"));
    assert(cleaned.includes('style="margin-top:10pt"') || cleaned.includes("margin-top:10pt"));
  });

  test("cleanWordHtml - heading conversion", () => {
    const html = `<p class="MsoHeading1">Title 1</p><p class="MsoHeading2">Title 2</p><p class="MsoHeading3">Title 3</p>`;
    const cleaned = cleanWordHtml(html);
    assert(cleaned.includes("<h1>Title 1</h1>"));
    assert(cleaned.includes("<h2>Title 2</h2>"));
    assert(cleaned.includes("<h3>Title 3</h3>"));
  });

  test("cleanWordHtml - bullet list conversion", () => {
    const html = `<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;"><span style="font-family:Symbol">·</span>Item 1</p>
<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;"><span style="font-family:Symbol">·</span>Item 2</p>`;
    const cleaned = cleanWordHtml(html);
    assert(cleaned.includes("<ul"));
    assert(cleaned.includes("<li>Item 1</li>"));
    assert(cleaned.includes("<li>Item 2</li>"));
  });

  test("cleanWordHtml - numbered list conversion", () => {
    const html = `<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;">1. Item 1</p>
<p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;">2. Item 2</p>`;
    const cleaned = cleanWordHtml(html);
    assert(cleaned.includes("<ol"));
    assert(cleaned.includes("<li>Item 1</li>"));
    assert(cleaned.includes("<li>Item 2</li>"));
  });

  test("cleanWordHtml - bold/italic/underline preserved", () => {
    const html = `<p><b>Bold</b> <i>Italic</i> <u>Underline</u></p>`;
    const cleaned = cleanWordHtml(html);
    assert(cleaned.includes("<b>Bold</b>"));
    assert(cleaned.includes("<i>Italic</i>"));
    assert(cleaned.includes("<u>Underline</u>"));
  });

  test("cleanWordHtml - links preserved", () => {
    const html = `<p><a href="https://example.com">Link</a></p>`;
    const cleaned = cleanWordHtml(html);
    assert(cleaned.includes('<a href="https://example.com">Link</a>'));
  });

  test("cleanWordHtml - tables preserved", () => {
    const html = `<table class="MsoTableGrid"><tr><td>Cell 1</td><td>Cell 2</td></tr></table>`;
    const cleaned = cleanWordHtml(html);
    assert(cleaned.includes("<table"));
    assert(cleaned.includes("<td>Cell 1</td>"));
    assert(!cleaned.includes("MsoTableGrid"));
  });

  test("cleanWordHtml - font size and color preserved", () => {
    const html = `<p style="font-size:14pt; color:#ff0000;">Red 14pt</p>`;
    const cleaned = cleanWordHtml(html);
    assert(cleaned.includes("font-size:14pt"));
    assert(cleaned.includes("color:#ff0000"));
  });

  // =============================================================================
  // PHẦN 8: WRITER - CLEAN CSS STYLE STRING
  // =============================================================================

  test("cleanCssStyleString - loại bỏ mso-* properties", () => {
    const style = "mso-margin-top-alt:auto; margin-top:10pt; mso-list:l0; font-weight:bold;";
    const cleaned = cleanCssStyleString(style);
    assert(!cleaned.includes("mso-"));
    assert(cleaned.includes("margin-top:10pt"));
    assert(cleaned.includes("font-weight:bold"));
  });

  test("cleanCssStyleString - loại bỏ tab-stops, -ms-*, v:, o:*", () => {
    const style = "tab-stops:100pt; -ms-text-justify:inter-word; v:shapes:pic1; o:allowoverlap:; font-size:12pt;";
    const cleaned = cleanCssStyleString(style);
    assert(!cleaned.includes("tab-"));
    assert(!cleaned.includes("-ms-"));
    assert(!cleaned.includes("v:"));
    assert(!cleaned.includes("o:"));
    assert(cleaned.includes("font-size:12pt"));
  });

  // =============================================================================
  // PHẦN 9: WRITER - CONVERT MSO LISTS
  // =============================================================================

  test("convertMsoListsToHtmlLists - bullet list gom nhóm", () => {
    const html = `<p class="MsoListParagraph">· Item 1</p><p class="MsoListParagraph">· Item 2</p>`;
    const cleaned = convertMsoListsToHtmlLists(html);
    assert(cleaned.includes("<ul"));
    assert(cleaned.includes("<li>Item 1</li>"));
    assert(cleaned.includes("<li>Item 2</li>"));
  });

  test("convertMsoListsToHtmlLists - numbered list gom nhóm", () => {
    const html = `<p class="MsoListParagraph">1. Item 1</p><p class="MsoListParagraph">2. Item 2</p>`;
    const cleaned = convertMsoListsToHtmlLists(html);
    assert(cleaned.includes("<ol"));
    assert(cleaned.includes("<li>Item 1</li>"));
    assert(cleaned.includes("<li>Item 2</li>"));
  });

  // =============================================================================
  // PHẦN 10: WRITER - SERIALIZE SELECTION TO CLIPBOARD
  // =============================================================================

  test("serializeWriterSelectionToClipboard - trả về html và text", () => {
    if (typeof document === "undefined") {
      // Skip in Node.js without DOM
      return;
    }
    const mockRange = {
      cloneContents: () => {
        const frag = document.createDocumentFragment();
        const div = document.createElement("div");
        div.innerHTML = "<p>Hello <b>World</b></p>";
        frag.appendChild(div);
        return frag;
      }
    };
    const mockBody = document.createElement("div");
    mockBody.innerHTML = "<p>Hello <b>World</b></p>";
    const result = serializeWriterSelectionToClipboard(mockRange, mockBody);
    assert(result.html.includes("Hello"));
    assert(result.html.includes("World"));
    assert(result.text.includes("Hello"));
    assert(result.text.includes("World"));
    assert(result.html.includes("font-family"));
  });

  // =============================================================================
  // PHẦN 11: HTML ATTRIBUTES PARSING
  // =============================================================================

  test("parseHtmlAttributes - phân tích thuộc tính thẻ", () => {
    const attrs = parseHtmlAttributes('class="xl65" style="color:red" x:num="42" colspan="2"');
    assertEqual(attrs["class"], "xl65");
    assertEqual(attrs["style"], "color:red");
    assertEqual(attrs["x:num"], "42");
    assertEqual(attrs["colspan"], "2");
  });

  // =============================================================================
  // PHẦN 12: EXCEL HTML FULL SAMPLE - end-to-end
  // =============================================================================

  test("parseOfficeHtmlTable - Excel HTML sample với styles", () => {
    const html = `
      <html>
      <style>
        .xl65 { mso-number-format: '0.00%'; font-weight: bold; color: #ff0000; }
        .xl66 { mso-number-format: '#,##0.00'; background: #ffff00; }
        .xl67 { mso-number-format: 'dd/mm/yyyy'; }
      </style>
      <table>
        <col width="80"><col width="100"><col width="90">
        <tr height="20">
          <td class="xl65" style="border:1px solid #000" x:num="0.75">75%</td>
          <td class="xl66" style="border:1px solid #000" x:num="1234.56">1,234.56</td>
          <td class="xl67" style="border:1px solid #000" x:num="45230">01/01/2024</td>
        </tr>
        <tr height="20">
          <td class="xl65" style="border:1px solid #000" x:num="0.25">25%</td>
          <td class="xl66" style="border:1px solid #000" x:num="789.01">789.01</td>
          <td class="xl67" style="border:1px solid #000" x:num="45231">02/01/2024</td>
        </tr>
      </table>
      </html>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    assertEqual(result.cells.length, 2);
    assertEqual(result.cells[0].length, 3);
    assertEqual(result.colWidths.length, 3);
    assertEqual(result.colWidths[0], 80);
    
    // Row 1
    assertEqual(result.cells[0][0].val, 0.75);
    assertEqual(result.cells[0][0].style.numberFormat.category, "percentage");
    assertEqual(result.cells[0][0].style.fontWeight, "bold");
    assertEqual(result.cells[0][0].style.color, "#ff0000");
    assertEqual(result.cells[0][1].val, 1234.56);
    assertEqual(result.cells[0][1].style.numberFormat.category, "number");
    assertEqual(result.cells[0][1].style.backgroundColor, "#ffff00");
    // Date cell: x:num takes precedence, value is Excel serial number
    assertEqual(result.cells[0][2].val, 45230);
    assertEqual(result.cells[0][2].style.numberFormat.category, "date");
    
    // Row 2
    assertEqual(result.cells[1][0].val, 0.25);
    assertEqual(result.cells[1][1].val, 789.01);
    assertEqual(result.cells[1][2].val, 45231);
    assertEqual(result.cells[1][2].style.numberFormat.category, "date");
    
    // Borders
    assert(result.cells[0][0].style.border || result.cells[0][0].style.borderTop);
  });

  // =============================================================================
  // PHẦN 13: LIBREOFFICE CALC HTML SAMPLE
  // =============================================================================

  test("parseOfficeHtmlTable - LibreOffice Calc HTML với sdval/sdnum", () => {
    const html = `
      <table>
        <tr>
          <td sdval="42" sdnum="NNN" style="font-weight:bold;">42</td>
          <td sdval="3.14159" sdnum="NNN" style="color:#0000ff;">3.14159</td>
        </tr>
      </table>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    assertEqual(result.cells[0][0].val, 42);
    assertEqual(result.cells[0][0].style.fontWeight, "bold");
    assertEqual(result.cells[0][1].val, 3.14159);
    assertEqual(result.cells[0][1].style.color, "#0000ff");
  });

  // =============================================================================
  // PHẦN 14: EXCEL REAL CLIPBOARD FIXTURE (CF_HTML with x:num, class styles)
  // =============================================================================

  test("parseOfficeHtmlTable - Excel real CF_HTML fixture với x:num, class styles, mso-number-format escaped", async () => {
    const { readFileSync } = await import("fs");
    const { parseOfficeHtmlTable } = await import("../../platform/clipboard/office-clipboard.js");
    
    const html = readFileSync("./tests/fixtures/clipboard/excel-real-cfhtml.html", "utf-8");
    const result = parseOfficeHtmlTable(html);
    
    assert(result !== null, "Fixture should parse successfully");
    assertEqual(result.cells.length, 3, "Should have 3 rows");
    assertEqual(result.cells[0].length, 3, "Should have 3 columns");
    
    // Row 1 (header): bold + yellow background from .xl65 class
    assertEqual(result.cells[0][0].val, "Tên", "A1 header text");
    assertEqual(result.cells[0][0].style.fontWeight, "bold", "A1 should be bold from .xl65");
    assertEqual(result.cells[0][0].style.backgroundColor, "yellow", "A1 should have yellow background from .xl65");
    assertEqual(result.cells[0][1].style.fontWeight, "bold", "B1 should be bold");
    assertEqual(result.cells[0][1].style.backgroundColor, "yellow", "B1 should have yellow background");
    assertEqual(result.cells[0][2].style.fontWeight, "bold", "C1 should be bold");
    assertEqual(result.cells[0][2].style.backgroundColor, "yellow", "C1 should have yellow background");
    
    // Row 2: Bút, 1250 (number with #,##0), 46387 (date serial)
    assertEqual(result.cells[1][0].val, "Bút", "A2 text content");
    assertEqual(result.cells[1][1].val, 1250, "B2 should be number 1250 from x:num");
    assertEqual(result.cells[1][1].style.numberFormat.category, "number", "B2 format should be number");
    assertEqual(result.cells[1][1].style.numberFormat.decimals, 0, "B2 format should have 0 decimals (#,##0)");
    assertEqual(result.cells[1][1].style.numberFormat.useSeparator, true, "B2 should use thousand separator");
    assertEqual(result.cells[1][2].val, 46387, "C2 should be date serial 46387 from x:num");
    assertEqual(result.cells[1][2].style.numberFormat.category, "date", "C2 format should be date");
    assertEqual(result.cells[1][2].style.numberFormat.formatPattern, "dd/mm/yyyy", "C2 date pattern");
    
    // Row 3: Giấy, 0.25 (percentage), 1234.56 (number with #,##0.00)
    assertEqual(result.cells[2][0].val, "Giấy", "A3 text content");
    assertEqual(result.cells[2][1].val, 0.25, "B3 should be 0.25 from x:num");
    assertEqual(result.cells[2][1].style.numberFormat.category, "percentage", "B3 format should be percentage");
    assertEqual(result.cells[2][1].style.numberFormat.decimals, 0, "B3 percentage 0 decimals");
    assertEqual(result.cells[2][2].val, 1234.56, "C3 should be 1234.56 from x:num");
    assertEqual(result.cells[2][2].style.numberFormat.category, "number", "C3 format should be number");
    assertEqual(result.cells[2][2].style.numberFormat.decimals, 2, "C3 format should have 2 decimals (#,##0.00)");
    assertEqual(result.cells[2][2].style.numberFormat.useSeparator, true, "C3 should use thousand separator");
  });

  // =============================================================================
  // PHẦN 15: MERGED CELLS VỚI HTML THỰC TẾ
  // =============================================================================

  test("parseOfficeHtmlTable - merged cells thực tế từ Excel", () => {
    const html = `
      <table>
        <tr>
          <td colspan="2" rowspan="2" style="border:1px solid #000;">Merged</td>
          <td style="border:1px solid #000;">C1</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;">C2</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;">A3</td>
          <td style="border:1px solid #000;">B3</td>
          <td style="border:1px solid #000;">C3</td>
        </tr>
      </table>
    `;
    const result = parseOfficeHtmlTable(html);
    assert(result !== null);
    assertEqual(result.mergedRanges.length, 1);
    assertEqual(result.mergedRanges[0].start.c, "A");
    assertEqual(result.mergedRanges[0].start.r, 1);
    assertEqual(result.mergedRanges[0].end.c, "B");
    assertEqual(result.mergedRanges[0].end.r, 2);
  });

  // =============================================================================
  // PHẦN 15: END-TO-END PASTE TESTS — 3T SHEET EXCEL HTML PASTE
  // =============================================================================

test("E2E Sheet: Excel HTML paste -> grid cells with number, date, percentage, bold, color, background, borders, merged", async () => {
    const { SheetGridController } = await import("../../apps/sheet/sheet-grid.js");
    const { parseOfficeHtmlTable } = await import("../../platform/clipboard/office-clipboard.js");

    const container = {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      classList: { add() {}, remove() {}, toggle() {} },
      dataset: {},
      setAttribute() {},
      style: {},
      innerHTML: "",
      appendChild() {},
      insertBefore() {},
      focus() {}
    };
    const grid = new SheetGridController(container);
    grid.selectedCoord = { c: "A", r: 1 };

    const excelHtml = `
      <html>
      <style>
        .xl65 { mso-number-format: '0.00%'; font-weight: bold; color: #ff0000; }
        .xl66 { mso-number-format: '#,##0.00'; background: #ffff00; }
        .xl67 { mso-number-format: 'dd/mm/yyyy'; }
      </style>
      <table>
        <col width="80"><col width="100"><col width="90"><col width="120">
        <tr height="20">
          <td class="xl65" style="border:1px solid #000" x:num="0.75">75%</td>
          <td class="xl66" style="border:1px solid #000" x:num="1234.56">1,234.56</td>
          <td class="xl67" style="border:1px solid #000" x:num="45230">01/01/2024</td>
          <td style="font-style:italic; background-color:#00ff00;">Italic Green</td>
        </tr>
        <tr height="20">
          <td class="xl67" style="border:1px solid #000" x:num="45231">02/01/2024</td>
          <td style="text-decoration:underline;">Underlined</td>
          <td style="border:1px solid #000;">A3</td>
          <td style="border:1px solid #000;">B3</td>
        </tr>
      </table>
      </html>
    `;

    const model = parseOfficeHtmlTable(excelHtml, "");
    assert(model !== null, "parseOfficeHtmlTable must return a model");

    const applied = grid.applyPasteSpecial(model, "source", grid.selectedCoord);
    assert(applied === true, "applyPasteSpecial must return true");

    // Row 1 checks
    const cA1 = grid.cellsData.get("A1");
    assertEqual(cA1.val, 0.75, "A1 value should be 0.75 (percentage)");
    assertEqual(cA1.style.numberFormat.category, "percentage", "A1 format should be percentage");
    assertEqual(cA1.style.fontWeight, "bold", "A1 should be bold");
    assertEqual(cA1.style.color, "#ff0000", "A1 should be red");

    const cB1 = grid.cellsData.get("B1");
    assertEqual(cB1.val, 1234.56, "B1 value should be 1234.56");
    assertEqual(cB1.style.numberFormat.category, "number", "B1 format should be number");
    assertEqual(cB1.style.backgroundColor, "#ffff00", "B1 should have yellow background");

    const cC1 = grid.cellsData.get("C1");
    assertEqual(cC1.val, 45230, "C1 value should be 45230 (Excel serial date)");
    assertEqual(cC1.style.numberFormat.category, "date", "C1 format should be date");

    const cD1 = grid.cellsData.get("D1");
    assertEqual(cD1.val, "Italic Green", "D1 text content");
    assertEqual(cD1.style.fontStyle, "italic", "D1 should be italic");
    assertEqual(cD1.style.backgroundColor, "#00ff00", "D1 should have green background");

    // Row 2 checks
    const cA2 = grid.cellsData.get("A2");
    assertEqual(cA2.val, 45231, "A2 should be 45231 (date)");
    assertEqual(cA2.style.numberFormat.category, "date", "A2 format should be date");

    const cB2 = grid.cellsData.get("B2");
    assertEqual(cB2.val, "Underlined", "B2 text content");
    assertEqual(cB2.style.textDecoration, "underline", "B2 should be underlined");

    const cC2 = grid.cellsData.get("C2");
    assertEqual(cC2.val, "A3", "C2 should be A3");

    const cD2 = grid.cellsData.get("D2");
    assertEqual(cD2.val, "B3", "D2 should be B3");

    // Borders from inline styles should be parsed
    assert(cA1.style.border || cA1.style.borderTop, "A1 should have border from inline style");
  });

  test("E2E Sheet: TSV paste -> grid cells with tab-separated values", async () => {
    const { SheetGridController } = await import("../../apps/sheet/sheet-grid.js");
    const { parseOfficeTsv } = await import("../../platform/clipboard/office-clipboard.js");

    const container = {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      classList: { add() {}, remove() {}, toggle() {} },
      dataset: {},
      setAttribute() {},
      style: {},
      innerHTML: "",
      appendChild() {},
      insertBefore() {},
      focus() {}
    };
    const grid = new SheetGridController(container);
    grid.selectedCoord = { c: "B", r: 2 };

    const tsvText = "10\t20%\t=SUM(A1:B1)\nHello\t3.14\tWorld";
    const model = parseOfficeTsv(tsvText);
    assert(model !== null);

    const applied = grid.applyPasteSpecial(model, "source", grid.selectedCoord);
    assert(applied === true);

    // Starting at B2, 2 rows × 3 cols
    assertEqual(grid.cellsData.get("B2").val, 10, "B2 should be 10");
    assertEqual(grid.cellsData.get("C2").val, 0.2, "C2 should be 0.2 (20%)");
    assertEqual(grid.cellsData.get("C2").style.numberFormat.category, "percentage", "C2 format should be percentage");
    // Formula references are offset relative to paste destination (B2 vs source A1)
    // Source formula =SUM(A1:B1) at source col C (3rd col) → dest col D, row 2: =SUM(B2:C2)
    assertEqual(grid.cellsData.get("D2").formula, "=SUM(B2:C2)", "D2 should have offset formula");

    assertEqual(grid.cellsData.get("B3").val, "Hello", "B3 should be Hello");
    assertEqual(grid.cellsData.get("C3").val, 3.14, "C3 should be 3.14");
    assertEqual(grid.cellsData.get("D3").val, "World", "D3 should be World");
  });

  // =============================================================================
  // PHẦN 16: END-TO-END PASTE TESTS — 3T DOC WORD HTML PASTE
  // =============================================================================

  test("E2E Writer: Word HTML paste -> cleaned formatting (headings, lists, tables, links, bold/italic)", async () => {
    const { cleanWordHtml } = await import("../../platform/clipboard/office-clipboard.js");

    const wordHtml = `
      <!--[if gte mso 9]><xml><o:OfficeDocumentSettings></o:OfficeDocumentSettings></xml><![endif]-->
      <w:p class="MsoNormal"><w:r><w:t>Word junk</w:t></w:r></w:p>
      <p class="MsoHeading1">Heading 1 Title</p>
      <p class="MsoHeading2">Heading 2 Subtitle</p>
      <p class="MsoHeading3">Heading 3 Section</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;"><span style="font-family:Symbol">·</span>Bullet item 1</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;"><span style="font-family:Symbol">·</span>Bullet item 2</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2;">1. Numbered item 1</p>
      <p class="MsoListParagraph" style="mso-list:l1 level1 lfo2;">2. Numbered item 2</p>
      <p><b>Bold text</b> <i>Italic text</i> <u>Underlined text</u></p>
      <p style="font-size:14pt; color:#ff0000;">Red 14pt text</p>
      <p><a href="https://example.com">External Link</a></p>
      <table class="MsoTableGrid">
        <tr><td style="border:1px solid #000;">Cell A1</td><td style="border:1px solid #000;">Cell B1</td></tr>
        <tr><td style="border:1px solid #000;">Cell A2</td><td style="border:1px solid #000;">Cell B2</td></tr>
      </table>
      <o:p></o:p>
    `;

    const cleaned = cleanWordHtml(wordHtml);

    // Word junk removed
    assert(!cleaned.includes("if gte mso"), "Conditional comments removed");
    assert(!cleaned.includes("o:OfficeDocumentSettings"), "Office XML removed");
    assert(!cleaned.includes("w:p"), "w:* tags removed");
    assert(!cleaned.includes("o:p"), "o:p tags removed");
    assert(!cleaned.includes("MsoNormal"), "Mso classes removed");
    assert(!cleaned.includes("MsoTableGrid"), "MsoTableGrid class removed");

    // Headings preserved
    assert(cleaned.includes("<h1>Heading 1 Title</h1>"), "Heading 1 converted to h1");
    assert(cleaned.includes("<h2>Heading 2 Subtitle</h2>"), "Heading 2 converted to h2");
    assert(cleaned.includes("<h3>Heading 3 Section</h3>"), "Heading 3 converted to h3");

    // Lists converted to ul/ol
    assert(cleaned.includes("<ul"), "Bullet list converted to ul");
    assert(cleaned.includes("<li>Bullet item 1</li>"), "Bullet item 1 in li");
    assert(cleaned.includes("<li>Bullet item 2</li>"), "Bullet item 2 in li");
    assert(cleaned.includes("<ol"), "Numbered list converted to ol");
    assert(cleaned.includes("<li>Numbered item 1</li>"), "Numbered item 1 in li");
    assert(cleaned.includes("<li>Numbered item 2</li>"), "Numbered item 2 in li");

    // Formatting preserved
    assert(cleaned.includes("<b>Bold text</b>"), "Bold preserved");
    assert(cleaned.includes("<i>Italic text</i>"), "Italic preserved");
    assert(cleaned.includes("<u>Underlined text</u>"), "Underline preserved");
    assert(cleaned.includes("font-size:14pt"), "Font size preserved");
    assert(cleaned.includes("color:#ff0000") || cleaned.includes("color: #ff0000"), "Color preserved");

    // Link preserved
    assert(cleaned.includes('<a href="https://example.com">External Link</a>'), "Link preserved");

    // Table preserved
    assert(cleaned.includes("<table"), "Table preserved");
    assert(cleaned.includes("Cell A1"), "Table cell A1 content preserved");
    assert(cleaned.includes("Cell B2"), "Table cell B2 content preserved");

    // mso-* styles removed from style attributes (data-vno-mso-list is internal marker attribute)
    assert(!cleaned.includes('style="mso-list') && !cleaned.includes("style='mso-list"), "mso-list removed from style attributes");
    assert(!cleaned.includes("mso-margin-top-alt") && !cleaned.includes("mso-list:"), "All mso-* styles removed from style attributes");
  });

  test("E2E Writer: Paste Special - plain text only", async () => {
    const { cleanWordHtml } = await import("../../platform/clipboard/office-clipboard.js");

    const wordHtml = `<p class="MsoNormal" style="font-weight:bold; color:#ff0000;"><b>Bold Red</b> <i>Italic</i></p>`;
    const cleaned = cleanWordHtml(wordHtml);

    // When pasting as plain text, only text content should remain
    const plainText = cleaned.replace(/<[^>]+>/g, "").trim();
    assert(plainText.includes("Bold Red"), "Plain text contains bold text content");
    assert(plainText.includes("Italic"), "Plain text contains italic text content");
    assert(!plainText.includes("<b>"), "Plain text has no HTML tags");
    assert(!plainText.includes("<i>"), "Plain text has no HTML tags");
  });

  // =============================================================================
  // PHẦN 8: CHUYỂN GIÁ TRỊ HIỂN THỊ VÀ IN ĐẬM KHI SAO CHÉP Ô TÍNH
  // =============================================================================

  test("getSheetCellDisplayText: định dạng phần trăm (60%)", () => {
    const cell = { val: 0.6, style: { numberFormat: { category: "percentage", decimals: 0 } } };
    assertEqual(getSheetCellDisplayText(cell), "60%", "0.6 với category percentage 0 decimals phải hiển thị 60%");
  });

  test("getSheetCellDisplayText: định dạng số hàng nghìn (1,250)", () => {
    const cell = { val: 1250, style: { numberFormat: { category: "number", useThousands: true, decimals: 0 } } };
    assertEqual(getSheetCellDisplayText(cell), "1,250", "1250 có useThousands phải hiển thị 1,250");
  });

  test("getSheetCellDisplayText: định dạng ngày tháng (31/12/2026)", () => {
    const cellSerial = { val: 46387, style: { numberFormat: { category: "date", dateFormat: "dd/mm/yyyy" } } };
    assertEqual(getSheetCellDisplayText(cellSerial), "31/12/2026", "Serial 46387 phải format thành 31/12/2026");
    const cellStr = { val: "31/12/2026", style: { numberFormat: { category: "date", dateFormat: "dd/mm/yyyy" } } };
    assertEqual(getSheetCellDisplayText(cellStr), "31/12/2026", "Chuỗi ngày tháng được giữ nguyên 31/12/2026");
  });

  test("getSheetCellDisplayText: số thông thường và chuỗi chữ", () => {
    assertEqual(getSheetCellDisplayText({ val: 100 }), "100", "Số không có format config hiển thị số chuẩn");
    assertEqual(getSheetCellDisplayText({ val: "Hạng mục" }), "Hạng mục", "Chuỗi văn bản giữ nguyên");
    assertEqual(getSheetCellDisplayText({ val: "" }), "", "Ô rỗng trả về rỗng");
    assertEqual(getSheetCellDisplayText(null), "", "Ô null trả về rỗng");
  });

  test("isCellBold: nhận diện in đậm từ style và HTML tags", () => {
    assert(isCellBold({ style: { fontWeight: "bold" } }), "fontWeight bold là đậm");
    assert(isCellBold({ style: { bold: true } }), "bold true là đậm");
    assert(isCellBold({ style: { fontWeight: "700" } }), "fontWeight 700 là đậm");
    assert(isCellBold({ style: { fontWeight: 600 } }), "fontWeight 600 là đậm");
    assert(isCellBold({ val: "<b>Tiêu đề</b>" }), "thẻ <b> trong val là đậm");
    assert(isCellBold({ text: "<strong>Tiêu đề</strong>" }), "thẻ <strong> trong text là đậm");
    assert(isCellBold("<b>Văn bản</b>"), "chuỗi có thẻ <b> là đậm");
    assert(!isCellBold({ val: "Văn bản thường", style: {} }), "ô bình thường không đậm");
    assert(!isCellBold({ val: "60%", style: { fontWeight: "normal" } }), "fontWeight normal không đậm");
  });

  test("serializeSheetRangeToClipboard: đưa giá trị hiển thị và in đậm chuẩn vào TSV và HTML", () => {
    const mockGrid = {
      selectedCoord: { c: "A", r: 1 },
      selectionRange: { start: { c: "A", r: 1 }, end: { c: "B", r: 2 } },
      _columnNumber: c => c.charCodeAt(0) - 64,
      _columnLabel: n => String.fromCharCode(64 + n),
      getColumnWidth: () => 64,
      getRowHeight: () => 20,
      cellsData: new Map([
        ["A1", { val: "Hạng mục", formula: "", style: { fontWeight: "bold" } }],
        ["B1", { val: "Tỷ trọng", formula: "", style: { fontWeight: "bold" } }],
        ["A2", { val: "Phần cứng", formula: "", style: {} }],
        ["B2", { val: 0.6, formula: "", style: { numberFormat: { category: "percentage", decimals: 0 } } }]
      ])
    };
    const res = serializeSheetRangeToClipboard(mockGrid, mockGrid.selectionRange);
    assertEqual(res.text, "Hạng mục\tTỷ trọng\nPhần cứng\t60%", "TSV chứa giá trị hiển thị 60%");
    assert(res.html.includes('<td style="font-weight:bold">Hạng mục</td>'), "A1 có font-weight:bold");
    assert(res.html.includes('<td style="font-weight:bold">Tỷ trọng</td>'), "B1 có font-weight:bold");
    assert(res.html.includes("<td>Phần cứng</td>"), "A2 không có font-weight:bold");
    assert(res.html.includes(">60%</td>"), "B2 có nội dung 60%");
    assert(!res.html.includes('font-weight:bold">60%'), "B2 không mang font-weight:bold");
  });

  return results;
}
