import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

// Đo thật 2026-09-15 (HDLD.docx, Word 2016 COM): Arial 12pt w:line=312 → Word 19.1pt/dòng
// (= 1.3 × chiều cao dòng tự nhiên của Calibri Light 1.2207), CSS 130% chỉ cho 20.8px;
// hai đoạn sa=6pt / sb=6pt cách nhau 6pt (MAX, gộp lề như CSS), không phải 12pt.
// MYTIME.docx: đoạn chỉ chứa ảnh neo được LibreOffice xuất `<span>…</span><br/><br/>`
// (2 dòng) trong khi Word vẽ 1 dòng.

function check(value, message) { if (!value) throw new Error(message); }

export async function runWriterDocFontSpacingTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("Import: line-height % and unitless become --vno-lh (Word multiple), exact cm stays", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p style="margin-bottom: 0.21cm; line-height: 130%">A</p><p style="line-height: 1.5">B</p><p style="line-height: 0.53cm">C</p><span style="line-height:0">F</span>';
    const out = adapter._encodeProportionalLineHeights(html);
    check(out.includes('style="margin-bottom: 0.21cm; --vno-lh: 1.3"'), `130% not encoded: ${out}`);
    check(out.includes('style="--vno-lh: 1.5"'), `unitless 1.5 not encoded: ${out}`);
    check(out.includes('style="line-height: 0.53cm"'), `exact cm must stay: ${out}`);
    check(out.includes('style="line-height:0"'), `zero line-height (floats) must stay: ${out}`);
  });

  test("Import: font runs carry --vno-font-ratio so each run's natural line height counts", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p><font face="Calibri Light, sans-serif"><font size="3" style="font-size: 12pt">x</font></font><span style="font-family: Arial; color: red">y</span></p>';
    const out = adapter._encodeProportionalLineHeights(html);
    check(/<font face="Calibri Light, sans-serif" style="--vno-font-ratio: 1\.2207">/.test(out), `Calibri Light ratio missing: ${out}`);
    check(out.includes('<font size="3" style="font-size: 12pt">'), `inner font without face must stay untouched (ratio inherits): ${out}`);
    check(/style="font-family: Arial; color: red; --vno-font-ratio: 1\.1499"/.test(out), `Arial ratio missing on span: ${out}`);
  });

  test("Export: --vno-lh returns to line-height % and ratios are stripped", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p style="margin-bottom: 0.21cm; --vno-lh: 1.3"><font face="Arial" style="--vno-font-ratio: 1.1499">a</font><span style="font-family: Arial; --vno-font-ratio: 1.1499; color: red">b</span></p>';
    const out = adapter._restoreProportionalLineHeightsForExport(html);
    check(out.includes('style="margin-bottom: 0.21cm; line-height: 130%"'), `line-height % not restored: ${out}`);
    check(out.includes('<font face="Arial">'), `empty style must be removed: ${out}`);
    check(out.includes('style="font-family: Arial; color: red"'), `ratio must be stripped in the middle: ${out}`);
    check(!/vno-font-ratio|--vno-lh/.test(out), `no vno custom properties may leak to LibreOffice: ${out}`);
  });

  test("Import→export round trip keeps 130% exactly", () => {
    const adapter = new WriterAdapter(null);
    const src = '<p style="line-height: 130%; margin-top: 0.21cm">a</p><p style="line-height: 115%">b</p>';
    const out = adapter._restoreProportionalLineHeightsForExport(adapter._encodeProportionalLineHeights(src));
    check(out.includes('line-height: 130%') && out.includes('line-height: 115%'), `round trip changed values: ${out}`);
  });

  test("Export: font lists collapse to the first family so LibreOffice does not write 'Calibri Light;sans-serif'", () => {
    const adapter = new WriterAdapter(null);
    const html = '<font face="Calibri Light, sans-serif"><font size="3">a</font></font><span style="font-family: Arial, sans-serif; color: red">b</span><span style="font-family: Tahoma">c</span><font face="Arial">d</font>';
    const out = adapter._simplifyFontFamiliesForExport(html);
    check(out.includes('<font face="Calibri Light">'), `face list must keep the first family: ${out}`);
    check(out.includes('style="font-family: Arial; color: red"'), `font-family list must keep the first family: ${out}`);
    check(out.includes('style="font-family: Tahoma"') && out.includes('<font face="Arial">'), `single families must not change: ${out}`);
  });

  test("Font line ratio: table fallback outside the browser, cached per family", () => {
    const adapter = new WriterAdapter(null);
    check(Math.abs(adapter._fontLineRatio('"Arial", sans-serif') - 1.1499) < 1e-6, "Arial ratio");
    check(Math.abs(adapter._fontLineRatio("Calibri") - 1.2207) < 1e-6, "Calibri ratio");
    check(adapter._fontLineRatio("Unknown Font X") === 1.15, "unknown font default 1.15");
    check(adapter._fontLineRatio("") === 1.15, "empty family default");
  });

  test("Anchor-only paragraph: LibreOffice's double <br> collapses to one line", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p data-vno-float-anchor="" style="position:relative;margin-bottom: 0.9cm">\n<span data-vno-float="image" data-vno-float-id="3" style="position:absolute;left:0.24cm;top:6.33cm;"><img src="x">\n</span><span data-vno-float="image" data-vno-float-id="4" style="position:absolute;"><img src="y">\n</span><br>\n<br>\n\n</p><p style="line-height: 0.02cm"><br>\n<br>\n</p><p>text<br><br></p>';
    const out = adapter._collapseFloatOnlyParagraphBreaks(html);
    const anchor = out.match(/<p data-vno-float-anchor[\s\S]*?<\/p>/)[0];
    check((anchor.match(/<br>/g) || []).length === 1, `anchor paragraph must keep exactly one <br>: ${anchor}`);
    check(out.includes('<p style="line-height: 0.02cm"><br>\n<br>\n</p>'), `paragraph without floats must not change: ${out}`);
    check(out.includes("<p>text<br><br></p>"), `paragraph with text must not change: ${out}`);
  });

  test("Empty double-<br> paragraphs collapse only when the DOCX has no real empty line-break paragraph", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p style="margin-bottom: 0.28cm"><br>\n<br>\n</p><p>text<br><br></p>';
    const noLegit = '<w:document><w:body><w:p><w:r><w:drawing/></w:r></w:p><w:p><w:r><w:t>text</w:t><w:br/></w:r></w:p></w:body></w:document>';
    const withLegit = '<w:document><w:body><w:p><w:r><w:br/></w:r></w:p></w:body></w:document>';
    const collapsed = adapter._collapseFloatOnlyParagraphBreaks(html, noLegit);
    check(collapsed.includes('<p style="margin-bottom: 0.28cm"><br>\n</p>'), `anchor-carrier leftovers must collapse: ${collapsed}`);
    check(collapsed.includes("<p>text<br><br></p>"), `paragraph with text must not change: ${collapsed}`);
    const kept = adapter._collapseFloatOnlyParagraphBreaks(html, withLegit);
    check(kept === html, `real empty line-break paragraph in DOCX must keep both <br>: ${kept}`);
  });

  test("W11: table-cell paragraphs take spacing/line from the paragraph pPr and the table style (TableGrid)", () => {
    // d13.docx: LibreOffice bỏ w:spacing after=0 trong ô và không áp TableGrid (after=0, line=240) → hàng 28px thay vì 14px.
    const adapter = new WriterAdapter(null);
    const html = '<p>before</p><table><tr><td><p class="western" style="widows: 2">A</p></td><td><p style="margin-bottom: 0.5cm">B</p></td></tr></table>';
    const doc = '<w:document><w:body><w:p><w:r><w:t>before</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr><w:tr><w:tc><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:pPr><w:spacing w:before="120" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:t>B</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="table" w:styleId="TableGrid"><w:basedOn w:val="TableNormal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblStylePr w:type="firstRow"><w:pPr><w:spacing w:after="999"/></w:pPr></w:tblStylePr></w:style></w:styles>';
    const out = adapter._applyOoxmlTableParagraphSpacing(html, doc, stylesXml);
    check(out.includes('<p class="western" style="widows: 2; margin-bottom: 0cm; line-height: 100%">A</p>'), `cell A must get after=0 + table style line 240: ${out}`);
    check(out.includes('<p style="margin-top: 0.212cm; margin-bottom: 0cm; line-height: 150%">B</p>'), `cell B keeps own before/line, table style after: ${out}`);
    check(out.startsWith("<p>before</p>"), "paragraphs outside tables must not change");
  });

  test("Imported document class toggles with docStyles (NĐ30 table margins off)", () => {
    const classes = new Set();
    const editor = {
      style: { setProperty(k, v) { this[k] = v; }, removeProperty(k) { delete this[k]; } },
      classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, add(name) { classes.add(name); }, remove(name) { classes.delete(name); } }
    };
    const adapter = new WriterAdapter(editor);
    adapter.docStyles = { fontFamily: '"Arial", sans-serif', fontSize: "12pt", lineHeight: "1.15", paraMargin: null, rawRules: {} };
    adapter._applyDocStyles();
    check(classes.has("vno-doc-imported"), "imported class missing");
    check(editor.style["--vno-font-ratio"] === "1.1499", `font ratio var must follow the document font: ${editor.style["--vno-font-ratio"]}`);
    adapter.docStyles = null;
    adapter._applyDocStyles();
    check(!classes.has("vno-doc-imported"), "imported class must be removed for a new document");
  });

  test("W12a: contextualSpacing zeros margin between consecutive same-style paragraphs", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p style="margin-top: 0.21cm; margin-bottom: 0.21cm">First</p><p style="margin-top: 0.21cm; margin-bottom: 0.21cm">Second</p><p style="margin-top: 0.21cm; margin-bottom: 0.21cm">Third</p>';
    const doc = '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:contextualSpacing/></w:pPr><w:r><w:t>First</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:contextualSpacing/></w:pPr><w:r><w:t>Second</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>Third</w:t></w:r></w:p></w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="paragraph" w:styleId="ListParagraph"><w:pPr><w:contextualSpacing/></w:pPr></w:style></w:styles>';
    const out = adapter._applyOoxmlContextualSpacing(html, doc, stylesXml);
    check(out.includes('<p style="margin-top: 0.21cm; margin-bottom: 0">First</p>'), `first para must have margin-bottom: 0: ${out}`);
    check(out.includes('<p style="margin-top: 0; margin-bottom: 0.21cm">Second</p>'), `second para must have margin-top: 0: ${out}`);
    check(out.includes('<p style="margin-top: 0.21cm; margin-bottom: 0.21cm">Third</p>'), `third para (different style) must not change: ${out}`);
  });

  test("W12a: contextualSpacing via style basedOn chain", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p style="margin-top: 0.21cm; margin-bottom: 0.21cm">A</p><p style="margin-top: 0.21cm; margin-bottom: 0.21cm">B</p>';
    const doc = '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="MyList"/></w:pPr><w:r><w:t>A</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="MyList"/></w:pPr><w:r><w:t>B</w:t></w:r></w:p></w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="paragraph" w:styleId="MyList"><w:basedOn w:val="ListParagraph"/></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:pPr><w:contextualSpacing/></w:pPr></w:style></w:styles>';
    const out = adapter._applyOoxmlContextualSpacing(html, doc, stylesXml);
    check(out.includes('<p style="margin-top: 0.21cm; margin-bottom: 0">A</p>'), `first para must have margin-bottom: 0 via basedOn: ${out}`);
    check(out.includes('<p style="margin-top: 0; margin-bottom: 0.21cm">B</p>'), `second para must have margin-top: 0 via basedOn: ${out}`);
  });

  test("W12a: contextualSpacing not applied when styles differ", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p style="margin-top: 0.21cm; margin-bottom: 0.21cm">A</p><p style="margin-top: 0.21cm; margin-bottom: 0.21cm">B</p>';
    const doc = '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:contextualSpacing/></w:pPr><w:r><w:t>A</w:t></w:r></w:p><w:p><w:pPr><w:pStyle w:val="Normal"/></w:pPr><w:r><w:t>B</w:t></w:r></w:p></w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="paragraph" w:styleId="ListParagraph"><w:pPr><w:contextualSpacing/></w:pPr></w:style></w:styles>';
    const out = adapter._applyOoxmlContextualSpacing(html, doc, stylesXml);
    check(out === html, `different styles must not change margins: ${out}`);
  });

  test("W12c: lineRule=atLeast becomes max(value, natural line) instead of LibreOffice's absolute line-height", () => {
    // Đo d06 (19/9): <w:spacing w:line="10" w:lineRule="atLeast"/> (0,5pt) → LibreOffice line-height: 0.02cm → canvas 0,76 px;
    // Word vẽ 1 dòng tự nhiên (Calibri 12: 19–20 px). 15 đoạn.
    const adapter = new WriterAdapter(null);
    const html = '<p style="line-height: 0.02cm; margin-bottom: 0.28cm">SS04</p><p style="line-height: 0.02cm">Via</p><p style="line-height: 1.5cm">Exact</p>';
    const doc = '<w:document><w:body><w:p><w:pPr><w:spacing w:after="160" w:line="10" w:lineRule="atLeast"/></w:pPr><w:r><w:t>SS04</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="Tight"/></w:pPr><w:r><w:t>Via</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:spacing w:line="850" w:lineRule="exact"/></w:pPr><w:r><w:t>Exact</w:t></w:r></w:p></w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="paragraph" w:styleId="Tight"><w:pPr><w:spacing w:line="240" w:lineRule="atLeast"/></w:pPr></w:style></w:styles>';
    const out = adapter._applyOoxmlContextualSpacing(html, doc, stylesXml);
    check(out.includes('line-height: max(0.5pt, calc(1em * var(--vno-font-ratio, 1.15)))') && out.includes("SS04"), `atLeast on paragraph: ${out}`);
    check(out.includes('line-height: max(12pt, calc(1em * var(--vno-font-ratio, 1.15)))'), `atLeast via style chain: ${out}`);
    check(out.includes('<p style="line-height: 1.5cm">Exact</p>'), `exact must stay absolute: ${out}`);
  });

  return results;
}
