/**
 * VN Sheet — Cell visual styles import from FODS (background, border, font, alignment)
 * + sheet visibility (hidden/veryHidden tabs not rendered)
 * + round-trip serialize → parse keeps styles.
 */

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertClose(a, b, msg) {
  assert(String(a).toLowerCase() === String(b).toLowerCase(), `${msg}: expected "${b}" got "${a}"`);
}

function makeGrid(sheetName) {
  return {
    sheets: [sheetName],
    activeSheet: sheetName,
    sheetsData: { [sheetName]: new Map() },
    commentsBySheet: { [sheetName]: {} },
    mergedRangesBySheet: { [sheetName]: [] },
    namedRangesBySheet: { [sheetName]: [] },
    namedRangesWorkbook: [],
    printAreaBySheet: { [sheetName]: null },
    pageSetupBySheet: { [sheetName]: {} },
    rowHeightsBySheet: { [sheetName]: new Map() },
    colWidthsBySheet: { [sheetName]: new Map() },
    userHiddenRowsBySheet: { [sheetName]: new Set() },
    userHiddenColsBySheet: { [sheetName]: new Set() },
    chartsBySheet: { [sheetName]: [] },
    sparklinesBySheet: { [sheetName]: [] },
    conditionalFormattingBySheet: { [sheetName]: [] },
    dataValidationsBySheet: { [sheetName]: [] },
    pageBreaksBySheet: { [sheetName]: { rows: [], cols: [] } },
    protectionBySheet: { [sheetName]: { enabled: false, password: "" } },
    workbookProtection: { enabled: false, password: "" },
    outlineGroupsBySheet: { [sheetName]: [] },
    imagesBySheet: { [sheetName]: [] },
    pivotTablesBySheet: {},
    sheetVisibilityBySheet: {}
  };
}

function minimalFodsXml(opts = {}) {
  const {
    sheetName = "Sheet1",
    cells = [],
    hiddenSheet = null,
    columnDefaultStyle = ""
  } = opts;

  const defaultCellAttr = columnDefaultStyle ? ` table:default-cell-style-name="${columnDefaultStyle}"` : "";
  const sheetStateAttr = hiddenSheet ? ` vno:sheet-state="${hiddenSheet}"` : "";
  const sheetTableAttr = hiddenSheet ? ` table:name="${sheetName}"${sheetStateAttr}` : ` table:name="${sheetName}"`;

  const cellXml = cells.map(c => {
    const attrs = Object.entries(c.attrs || {}).map(([k, v]) => ` ${k}="${v}"`).join("");
    const text = c.text !== undefined ? `<text:p>${c.text}</text:p>` : "";
    return `<table:table-cell${attrs}>${text}</table:table-cell>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:vno="https://vn-office.vn/2024/vno">
  <office:automatic-styles>
    ${opts.autoStyles || ""}
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table${sheetTableAttr}>
        <table:table-column${defaultCellAttr}/>
        <table:table-row>
          ${cellXml}
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;
}

export async function runSheetImportCellStylesTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  let SheetAdapter;
  try {
    const mod = await import("../../adapters/libreoffice/sheet/sheet-adapter.js");
    SheetAdapter = mod.SheetAdapter;
  } catch (e) {
    results.push({ name: "IMPORT: sheet-adapter.js loads", pass: false, error: e.message });
    return results;
  }

  function makeAdapter(grid) {
    return new SheetAdapter(grid);
  }

  // ── Test 1: parseFods builds cellStyles from automatic-styles (DOM branch) ──
  await test("cell.styles.import: parseFods reads background from automatic-styles", () => {
    const fods = minimalFodsXml({
      sheetName: "StyleTest",
      autoStyles: `
        <style:style style:name="ce3" style:family="table-cell" style:parent-style-name="Default">
          <style:table-cell-properties fo:background-color="#558ed5" style:text-align-source="fix"
            style:vertical-align="middle" fo:wrap-option="no-wrap"
            fo:border-left="0.74pt solid #000000" fo:border-right="none"
            fo:border-top="none" fo:border-bottom="0.74pt solid #000000"/>
          <style:paragraph-properties fo:text-align="center"/>
          <style:text-properties fo:color="#ffffff" fo:font-weight="bold"
            style:font-name="Times New Roman" fo:font-size="14pt"/>
        </style:style>`,
      cells: [{
        attrs: { "table:style-name": "ce3", "office:value-type": "string" },
        text: "SẢN PHẨM MỚI"
      }]
    });

    const adapter = makeAdapter(makeGrid("StyleTest"));
    const wb = adapter.parseFods(fods);
    const data = wb.sheetsData["StyleTest"];
    assert(data, "sheetsData must exist");
    const item = data.get("A1");
    assert(item, "A1 must exist");
    assert(item.style, "A1 must have style");
    assertClose(item.style.backgroundColor, "#558ed5", "A1 backgroundColor");
    assertClose(item.style.color, "#ffffff", "A1 color");
    assert(item.style.fontWeight === "bold", `A1 fontWeight must be bold, got ${item.style.fontWeight}`);
    assert(item.style.fontFamily === "Times New Roman", `A1 fontFamily must be Times New Roman, got ${item.style.fontFamily}`);
    const a1Size = parseFloat(item.style.fontSize);
    assert(Math.abs(a1Size - 18.666) < 0.1, `A1 fontSize must be ~18.67px (14pt converted), got ${item.style.fontSize}`);
    assert(item.style.textAlign === "center", `A1 textAlign must be center, got ${item.style.textAlign}`);
    assert(item.style.verticalAlign === "middle", `A1 verticalAlign must be middle, got ${item.style.verticalAlign}`);
    assert(item.style.borderLeft, "A1 must have borderLeft");
    assert(!item.style.borderRight || item.style.borderRight === "none", "A1 borderRight should be none");
  });

  // ── Test 2: column default-cell-style-name fallback ──
  await test("cell.styles.import: column default-cell-style-name applied to cell without own style", () => {
    const fods = minimalFodsXml({
      sheetName: "ColDefault",
      autoStyles: `
        <style:style style:name="colDef" style:family="table-cell">
          <style:table-cell-properties fo:background-color="#ff0000"/>
          <style:text-properties fo:color="#00ff00"/>
        </style:style>`,
      columnDefaultStyle: "colDef",
      cells: [{
        attrs: { "office:value-type": "string" },
        text: "NoStyle"
      }]
    });

    const adapter = makeAdapter(makeGrid("ColDefault"));
    const wb = adapter.parseFods(fods);
    const data = wb.sheetsData["ColDefault"];
    const item = data.get("A1");
    assert(item, "A1 must exist");
    assertClose(item.style.backgroundColor, "#ff0000", "A1 backgroundColor from col default");
    assertClose(item.style.color, "#00ff00", "A1 color from col default");
  });

  // ── Test 3: style-only cells within used range get styles ──
  await test("cell.styles.import: style-only empty cell within used range gets style", () => {
    const fods = minimalFodsXml({
      sheetName: "EmptyStyle",
      autoStyles: `
        <style:style style:name="celGreen" style:family="table-cell">
          <style:table-cell-properties fo:background-color="#00ff00"/>
        </style:style>`,
      cells: [
        { attrs: { "office:value-type": "string" }, text: "data" },
        { attrs: { "table:style-name": "celGreen", "office:value-type": "string" }, text: "" },
        { attrs: { "office:value-type": "string" }, text: "data2" }
      ]
    });

    const adapter = makeAdapter(makeGrid("EmptyStyle"));
    const wb = adapter.parseFods(fods);
    const data = wb.sheetsData["EmptyStyle"];
    const item = data.get("B1");
    assert(item, "B1 must exist (style-only cell in used range)");
    assertClose(item.style.backgroundColor, "#00ff00", "B1 backgroundColor");
  });

  // ── Test 4: hidden/veryHidden sheets parsed correctly ──
  await test("cell.styles.import: sheetVisibilityBySheet marks hidden and veryHidden sheets", () => {
    const fods = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:vno="https://vn-office.vn/2024/vno">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Visible"/>
      <table:table table:name="HiddenSheet" vno:sheet-state="hidden"/>
      <table:table table:name="VeryHiddenSheet" vno:sheet-state="veryHidden"/>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;

    const g = makeGrid("Visible");
    g.sheets = ["Visible", "HiddenSheet", "VeryHiddenSheet"];
    g.sheetsData["HiddenSheet"] = new Map();
    g.sheetsData["VeryHiddenSheet"] = new Map();
    const adapter = makeAdapter(g);
    const wb = adapter.parseFods(fods);
    assert(wb.sheetVisibilityBySheet["HiddenSheet"] === "hidden", `HiddenSheet should be hidden, got ${wb.sheetVisibilityBySheet["HiddenSheet"]}`);
    assert(wb.sheetVisibilityBySheet["VeryHiddenSheet"] === "veryHidden", `VeryHiddenSheet should be veryHidden, got ${wb.sheetVisibilityBySheet["VeryHiddenSheet"]}`);
    assert(!wb.sheetVisibilityBySheet["Visible"], "Visible sheet should not be in visibility map");
  });

  // ── Test 5: round-trip serialize → parse keeps visual styles ──
  await test("cell.styles.import: round-trip serialize → parse keeps background and color", () => {
    const sheetName = "RoundTrip";
    const g = makeGrid(sheetName);
    const data = g.sheetsData[sheetName];
    data.set("A1", {
      val: "Hello",
      formula: "",
      style: {
        backgroundColor: "#ff0000",
        color: "#00ff00",
        fontWeight: "bold",
        textAlign: "center"
      }
    });
    data.set("B1", {
      val: 42,
      formula: "",
      style: {
        backgroundColor: "#0000ff",
        fontSize: "16px"
      }
    });

    const adapter = makeAdapter(g);
    const fodsXml = adapter.serializeToFods();
    assert(fodsXml, "serializeToFods must return XML");

    const g2 = makeGrid(sheetName);
    const adapter2 = makeAdapter(g2);
    const wb2 = adapter2.parseFods(fodsXml);
    const data2 = wb2.sheetsData[sheetName];
    assert(data2, "sheetsData must exist after round-trip");
    const a1 = data2.get("A1");
    assert(a1, "A1 must exist after round-trip");
    assertClose(a1.style.backgroundColor, "#ff0000", "round-trip A1 backgroundColor");
    assertClose(a1.style.color, "#00ff00", "round-trip A1 color");
    assert(a1.style.fontWeight === "bold", "round-trip A1 fontWeight");
    assert(a1.style.textAlign === "center", "round-trip A1 textAlign");
    const b1 = data2.get("B1");
    assert(b1, "B1 must exist after round-trip");
    assertClose(b1.style.backgroundColor, "#0000ff", "round-trip B1 backgroundColor");
    const b1Size = parseFloat(b1.style.fontSize);
    assert(Math.abs(b1Size - 16) < 0.1, `round-trip B1 fontSize must be ~16px, got ${b1.style.fontSize}`);
  });

  // ── Test 6: parent-style-name inheritance (1 level) ──
  await test("cell.styles.import: parent-style-name inherited for visual properties", () => {
    const fods = minimalFodsXml({
      sheetName: "ParentStyle",
      autoStyles: `
        <style:style style:name="baseCell" style:family="table-cell">
          <style:table-cell-properties fo:background-color="#aabbcc"/>
          <style:text-properties fo:font-weight="bold" fo:color="#112233"/>
        </style:style>
        <style:style style:name="childCell" style:family="table-cell" style:parent-style-name="baseCell">
          <style:text-properties fo:color="#ff0000"/>
        </style:style>`,
      cells: [{
        attrs: { "table:style-name": "childCell", "office:value-type": "string" },
        text: "Child"
      }]
    });

    const adapter = makeAdapter(makeGrid("ParentStyle"));
    const wb = adapter.parseFods(fods);
    const item = wb.sheetsData["ParentStyle"].get("A1");
    assert(item, "A1 must exist");
    assertClose(item.style.backgroundColor, "#aabbcc", "inherited backgroundColor from parent");
    assert(item.style.fontWeight === "bold", "inherited fontWeight from parent");
    assertClose(item.style.color, "#ff0000", "child color overrides parent");
  });

  // ── Test 7: regex branch also reads cellStyles (no DOMParser) ──
  await test("cell.styles.import: regex branch reads cellStyles when DOMParser unavailable", () => {
    const origDOMParser = globalThis.DOMParser;
    try {
      delete globalThis.DOMParser;
      const fods = minimalFodsXml({
        sheetName: "RegexTest",
        autoStyles: `
          <style:style style:name="re1" style:family="table-cell">
            <style:table-cell-properties fo:background-color="#123456"/>
            <style:text-properties fo:color="#abcdef" fo:font-weight="bold"/>
          </style:style>`,
        cells: [{
          attrs: { "table:style-name": "re1", "office:value-type": "string" },
          text: "Regex"
        }]
      });

      const adapter = makeAdapter(makeGrid("RegexTest"));
      const wb = adapter.parseFods(fods);
      const item = wb.sheetsData["RegexTest"].get("A1");
      assert(item, "A1 must exist (regex branch)");
      assertClose(item.style.backgroundColor, "#123456", "regex A1 backgroundColor");
      assert(item.style.fontWeight === "bold", "regex A1 fontWeight");
    } finally {
      if (origDOMParser !== undefined) globalThis.DOMParser = origDOMParser;
      else delete globalThis.DOMParser;
    }
  });

  // ── Test 8: regex branch preserves empty cells with borders (used-range expansion) ──
  await test("cell.styles.import: regex branch preserves empty cell with border at used-range edge", () => {
    const origDOMParser = globalThis.DOMParser;
    try {
      delete globalThis.DOMParser;
      // Cell A1 has data, B1 is empty but has border style
      // B1 should be materialized because its style has borders
      const fods = minimalFodsXml({
        sheetName: "BorderEdgeTest",
        autoStyles: `
          <style:style style:name="dataStyle" style:family="table-cell">
            <style:text-properties fo:font-weight="bold"/>
          </style:style>
          <style:style style:name="borderStyle" style:family="table-cell">
            <style:table-cell-properties fo:border="0.75pt solid #000000"/>
          </style:style>`,
        cells: [
          { attrs: { "table:style-name": "dataStyle", "office:value-type": "string" }, text: "Data" },
          { attrs: { "table:style-name": "borderStyle", "office:value-type": "string" }, text: "" }
        ]
      });

      const adapter = makeAdapter(makeGrid("BorderEdgeTest"));
      const wb = adapter.parseFods(fods);
      const data = wb.sheetsData["BorderEdgeTest"];
      const a1 = data.get("A1");
      const b1 = data.get("B1");
      assert(a1, "A1 must exist");
      assert(b1, "B1 must exist (empty cell with border at used-range edge)");
      assert(b1.style.borderLeft, "B1 must have borderLeft");
      assert(b1.style.borderRight, "B1 must have borderRight");
      assert(b1.style.borderTop, "B1 must have borderTop");
      assert(b1.style.borderBottom, "B1 must have borderBottom");
    } finally {
      if (origDOMParser !== undefined) globalThis.DOMParser = origDOMParser;
      else delete globalThis.DOMParser;
    }
  });

  // ── Test 9: wrapText from fo:wrap-option="wrap" ──
  await test("cell.styles.import: fo:wrap-option maps to wrapText", () => {
    const fods = minimalFodsXml({
      sheetName: "WrapTest",
      autoStyles: `
        <style:style style:name="wrap1" style:family="table-cell">
          <style:table-cell-properties fo:wrap-option="wrap"/>
        </style:style>`,
      cells: [{
        attrs: { "table:style-name": "wrap1", "office:value-type": "string" },
        text: "Wrap"
      }]
    });

    const adapter = makeAdapter(makeGrid("WrapTest"));
    const wb = adapter.parseFods(fods);
    const item = wb.sheetsData["WrapTest"].get("A1");
    assert(item, "A1 must exist");
    assert(item.style.whiteSpace === "pre-wrap", `wrapText must be pre-wrap, got ${item.style.whiteSpace}`);
  });

  await test("cell.styles.save: reused visual style combines with number format without contamination", () => {
    const grid = makeGrid("CombinedStyle");
    const centered = { textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" };
    grid.sheetsData.CombinedStyle.set("A1", { val: "header", formula: "", style: { ...centered } });
    grid.sheetsData.CombinedStyle.set("A2", {
      val: 42,
      formula: "",
      style: { ...centered, numberFormat: { category: "number", decimals: 0, useThousands: true } }
    });
    grid.sheetsData.CombinedStyle.set("A3", {
      val: "unrelated",
      formula: "",
      style: { textAlign: "left", verticalAlign: "top", whiteSpace: "pre-wrap" }
    });
    const fods = makeAdapter(grid).serializeToFods();
    const cellStyle = fods.match(/<table:table-cell\b[^>]*office:value="42"[^>]*table:style-name="([^"]+)"/)?.[1];
    assert(cellStyle, "number cell must reference a combined style");
    const escaped = cellStyle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const combined = fods.match(new RegExp(`<style:style\\b[^>]*style:name="${escaped}"[^>]*>([\\s\\S]*?)<\\/style:style>`))?.[1] || "";
    assert(/style:vertical-align="middle"/.test(combined), "combined style must keep the reused middle alignment");
    assert(/fo:text-align="center"/.test(combined), "combined style must keep the reused center alignment");
    assert(/fo:wrap-option="no-wrap"/.test(combined), "combined style must keep the reused no-wrap setting");
  });

  await test("cell.styles.font: quoted ODF font name is normalized on parse and save", () => {
    const fods = minimalFodsXml({
      sheetName: "QuotedFont",
      autoStyles: `
        <style:style style:name="quoted" style:family="table-cell">
          <style:text-properties style:font-name="&quot;Times New Roman&quot;"/>
        </style:style>`,
      cells: [{ attrs: { "table:style-name": "quoted", "office:value-type": "string" }, text: "Text" }]
    });
    const parsed = makeAdapter(makeGrid("QuotedFont")).parseFods(fods);
    assert(parsed.sheetsData.QuotedFont.get("A1").style.fontFamily === "Times New Roman",
      "parse must remove wrapping quote entities from the font name");

    const grid = makeGrid("QuotedFont");
    grid.sheetsData.QuotedFont.set("A1", {
      val: "Text", formula: "", style: { fontFamily: '"Times New Roman"' }
    });
    const saved = makeAdapter(grid).serializeToFods();
    assert(/style:font-name="Times New Roman"/.test(saved), "save must write an unquoted style:font-name");
    assert(!/style:font-name="&amp;quot;Times New Roman&amp;quot;"/.test(saved),
      "save must not double-escape wrapping font quotes");
  });

  await test("cell.styles.font: Calc underline/strikethrough attributes round-trip as textDecoration", () => {
    const fods = minimalFodsXml({
      sheetName: "Underline",
      autoStyles: `
        <style:style style:name="cellU" style:family="table-cell">
          <style:text-properties style:font-name="Times New Roman" style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color" style:text-line-through-style="none"/>
        </style:style>
        <style:style style:name="TU" style:family="text">
          <style:text-properties fo:font-weight="bold" style:text-underline-style="solid" style:text-line-through-type="single"/>
        </style:style>`,
      cells: [
        { attrs: { "table:style-name": "cellU", "office:value-type": "string" }, text: "Plain" },
        {
          attrs: { "table:style-name": "cellU", "office:value-type": "string" },
          text: '<text:span text:style-name="TU">Label:</text:span> value'
        }
      ]
    });
    const parsed = makeAdapter(makeGrid("Underline")).parseFods(fods);
    const plain = parsed.sheetsData.Underline.get("A1");
    assert(plain.style.textDecoration === "underline", `cell underline must be parsed, got ${plain.style.textDecoration}`);
    const cell = parsed.sheetsData.Underline.get("B1");
    assert(cell.richText?.[0]?.style?.textDecoration === "underline line-through",
      `run underline+strike must be parsed, got ${cell.richText?.[0]?.style?.textDecoration}`);

    const grid = makeGrid("Underline");
    grid.sheetsData.Underline = parsed.sheetsData.Underline;
    const saved = makeAdapter(grid).serializeToFods();
    assert(/style:text-underline-style="solid"/.test(saved), "save must write style:text-underline-style for Calc");
    assert(/style:text-line-through-style="solid"/.test(saved), "save must write style:text-line-through-style for Calc");
  });

  await test("cell.styles.richText: first bold run does not make the whole cell bold", () => {
    const fods = minimalFodsXml({
      sheetName: "RichFont",
      autoStyles: `
        <style:style style:name="cellBold" style:family="table-cell">
          <style:text-properties style:font-name="Times New Roman" fo:font-size="11pt" fo:font-weight="bold" fo:color="#000000"/>
        </style:style>
        <style:style style:name="T1" style:family="text">
          <style:text-properties style:font-name="Times New Roman" fo:font-size="11pt" fo:font-weight="bold" fo:color="#000000"/>
        </style:style>
        <style:style style:name="T2" style:family="text">
          <style:text-properties style:font-name="Times New Roman" fo:font-size="11pt" fo:font-weight="normal" fo:color="#000000"/>
        </style:style>`,
      cells: [{
        attrs: { "table:style-name": "cellBold", "office:value-type": "string" },
        text: '<text:span text:style-name="T1">Label:</text:span><text:span text:style-name="T2"> value</text:span>'
      }]
    });
    const parsed = makeAdapter(makeGrid("RichFont")).parseFods(fods);
    const cell = parsed.sheetsData.RichFont.get("A1");
    assert(Array.isArray(cell.richText) && cell.richText.length === 2, "two rich-text runs must be parsed");
    assert(cell.style.fontWeight === "normal", "mixed run weights need a neutral cell-level baseline");
    assert(cell.richText[0].style.fontWeight === "bold", "first run must stay bold");
    assert(cell.richText[1].style.fontWeight === "normal", "second run must explicitly stay normal");

    const grid = makeGrid("RichFont");
    grid.sheetsData.RichFont = parsed.sheetsData.RichFont;
    const saved = makeAdapter(grid).serializeToFods();
    assert(/fo:font-weight="bold"/.test(saved) && /fo:font-weight="normal"/.test(saved),
      "serialized rich-text runs must carry both explicit weights");
  });

  await test("cell.styles.import: self-closing style does not consume the following style body", () => {
    const fods = minimalFodsXml({
      sheetName: "SelfClosingStyle",
      autoStyles: `
        <style:style style:name="Excel_Comma" style:family="table-cell" style:parent-style-name="Default"/>
        <style:style style:name="ConditionalStyle_1" style:family="table-cell">
          <style:table-cell-properties fo:background-color="#ffc7ce"/>
          <style:text-properties fo:color="#9c0006"/>
        </style:style>`,
      cells: [{
        attrs: { "table:style-name": "Excel_Comma", "office:value-type": "float", "office:value": "1270000" },
        text: "1270000"
      }]
    });
    const item = makeAdapter(makeGrid("SelfClosingStyle")).parseFods(fods).sheetsData.SelfClosingStyle.get("A1");
    assert(item, "A1 must exist");
    assert(!item.style.backgroundColor, `self-closing style must stay empty, got ${item.style.backgroundColor}`);
    assert(!item.style.color, `self-closing style must not inherit following text color, got ${item.style.color}`);
  });

  await test("cell.styles.import: numeric vno format is ignored for string cells", () => {
    const fods = minimalFodsXml({
      sheetName: "TextNumberFormat",
      cells: [{
        attrs: { "office:value-type": "string", "vno:number-format": "_(* #,##0_);_(* (#,##0);_(* &quot;-&quot;_);_(@_)" },
        text: "24 thang"
      }]
    });
    const item = makeAdapter(makeGrid("TextNumberFormat")).parseFods(fods).sheetsData.TextNumberFormat.get("A1");
    assert(item?.val === "24 thang", `string value must remain intact, got ${item?.val}`);
    assert(!item.style.numberFormat, "string cell must not retain a numeric numberFormat");
  });

  return results;
}
