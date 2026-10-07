import fs from "node:fs";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";

// Äo tháº­t 2026-09-15 (HDLD.docx, Word 2016 COM): Arial 12pt w:line=312 â†’ Word 19.1pt/dÃ²ng
// (= 1.3 Ã— chiá»u cao dÃ²ng tá»± nhiÃªn cá»§a Calibri Light 1.2207), CSS 130% chá»‰ cho 20.8px;
// hai Ä‘oáº¡n sa=6pt / sb=6pt cÃ¡ch nhau 6pt (MAX, gá»™p lá» nhÆ° CSS), khÃ´ng pháº£i 12pt.
// MYTIME.docx: Ä‘oáº¡n chá»‰ chá»©a áº£nh neo Ä‘Æ°á»£c LibreOffice xuáº¥t `<span>â€¦</span><br/><br/>`
// (2 dÃ²ng) trong khi Word váº½ 1 dÃ²ng.

function check(value, message) { if (!value) throw new Error(message); }

export async function runWriterDocFontSpacingTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("13.5 pt is available in the 3T Doc font-size list and applies as an exact point value", () => {
    const home = WRITER_RIBBON_TABS.find(tab => tab.id === "home");
    const flatten = items => items.flatMap(item => item.items ? flatten(item.items) : [item]);
    const size = flatten(home.groups).find(item => item.commandId === "writer.font.size");
    check(size?.options.some(option => option.value === "13.5"), "13.5 pt option missing");
    const adapter = new WriterAdapter({ getElementsByTagName: () => [font] });
    const font = { size: "7", style: {}, removeAttribute(name) { if (name === "size") this.size = ""; } };
    const oldWindow = globalThis.window;
    const oldDocument = globalThis.document;
    let command;
    try {
      globalThis.window = { getSelection: () => ({ rangeCount: 1 }) };
      globalThis.document = { execCommand: (...args) => { command = args; } };
      adapter.flushTyping = () => {};
      adapter.recordSnapshot = name => { adapter.lastSnapshotName = name; };
      check(adapter._applyFontSizePt(13.5), "13.5 pt command did not apply");
      check(command[0] === "fontSize" && command[2] === "7", "selection was not isolated for precise sizing");
      check(font.style.fontSize === "13.5pt", `wrong point size: ${font.style.fontSize}`);
      check(adapter.lastSnapshotName === "writer.font.size", "Undo snapshot was not recorded");
    } finally {
      globalThis.window = oldWindow;
      globalThis.document = oldDocument;
    }
  });

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

  test("Importâ†’export round trip keeps 130% exactly", () => {
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

  test("W12d: nested empty 12pt wrapper takes the 8pt text-run strut", () => {
    const adapter = new WriterAdapter(null);
    const oldWindow = globalThis.window;
    const oldDocument = globalThis.document;
    const oldNodeFilter = globalThis.NodeFilter;
    const style = () => ({ fontSize: "", fontFamily: "", setProperty() {} });
    const block = { style: style(), parentElement: null, closest: () => null, querySelectorAll: () => [] };
    const outer = { style: style(), parentElement: block, childNodes: [], closest: () => null };
    const inner = { style: style(), parentElement: outer, childNodes: [], closest: () => null };
    const textNode = { nodeType: 3, textContent: "Tá»« nhá»¯ng thay Ä‘á»•i", parentElement: inner };
    inner.childNodes = [textNode];
    outer.childNodes = [inner];
    block.childNodes = [outer];
    const computed = new Map([
      [block, { fontSize: "12pt", fontFamily: "Times New Roman" }],
      [outer, { fontSize: "12pt", fontFamily: "Times New Roman" }],
      [inner, { fontSize: "8pt", fontFamily: "Times New Roman" }]
    ]);
    try {
      globalThis.window = { getComputedStyle: el => ({ ...computed.get(el), ...(el.style.fontSize ? { fontSize: el.style.fontSize } : {}), ...(el.style.fontFamily ? { fontFamily: el.style.fontFamily } : {}) }) };
      globalThis.NodeFilter = { SHOW_TEXT: 4 };
      globalThis.document = {
        createTreeWalker() {
          let done = false;
          return { nextNode() { if (done) return null; done = true; return textNode; } };
        }
      };
      const root = { querySelectorAll(selector) { return selector === "*" ? [] : [block]; } };
      adapter._normalizeImportedFontMetrics(root);
      check(block.style.fontSize === "8pt", `paragraph strut must be 8pt: ${block.style.fontSize}`);
      check(outer.style.fontSize === "8pt", `empty outer wrapper strut must be 8pt: ${outer.style.fontSize}`);
      check(inner.style.fontSize === "", "wrapper with direct 8pt text must keep its explicit run size");
    } finally {
      globalThis.window = oldWindow;
      globalThis.document = oldDocument;
      globalThis.NodeFilter = oldNodeFilter;
    }
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

  test("W56: 13pt keeps CSS size but GDI advance scale 17/17.333 so wrap matches Word (d01)", () => {
    const adapter = new WriterAdapter(null);
    check(adapter._gdiDevicePxForPt(13) === 17, "13pt × 96/72 rounds to 17px");
    check(adapter._gdiDevicePxForPt(18) === 24, "18pt stays an integer 24px");
    const scale = adapter._gdiAdvanceScaleForPt(13);
    check(Math.abs(scale - 17 / (13 * 96 / 72)) < 1e-6, `gdi advance scale ${scale}`);
    const html = '<p style="font-size: 13pt">Hội đồng thành</p><font style="font-size:13.0pt">x</font><span style="font-size: 14pt">y</span>';
    const out = adapter._applyGdiDeviceFontPixels(html);
    check(out.includes("font-size: 13pt; --vno-gdi-advance:"), `13pt must keep size and gain advance: ${out}`);
    check(out.includes(`--vno-gdi-advance: ${scale}`), `advance must be ${scale}: ${out}`);
    check(out.includes('<span style="font-size: 14pt">y</span>'), `14pt must stay: ${out}`);
    const twice = adapter._applyGdiDeviceFontPixels(out);
    check((twice.match(/--vno-gdi-advance/g) || []).length === (out.match(/--vno-gdi-advance/g) || []).length, `idempotent: ${twice}`);
    const restored = adapter._stripCharacterScaleForExport(out);
    check(restored.includes("font-size: 13pt"), `export keeps 13pt: ${restored}`);
    check(!/--vno-gdi-advance/.test(restored), `export drops the canvas marker: ${restored}`);
    const wordCol = (11907 - 1134 - 1134) / 1440 * 96;
    check(Math.abs(wordCol - 642.6) < 0.001, `d01 text column ${wordCol}`);
    check(650 > wordCol && 650 * scale < wordCol, "13pt CSS overflows the Word column; GDI-scaled 13pt fits");
    const src = fs.readFileSync(path.resolve("adapters/libreoffice/writer/writer-adapter.js"), "utf8");
    check(src.includes('!family.includes("times new roman")'), "GDI advance applies only to Times New Roman (d07 Arial 13pt already matches Word)");
  });

  test("W55: a whitespace-only paragraph with a <br> is one line when the DOCX has no manual break there (d07)", () => {
    const adapter = new WriterAdapter(null);
    const html = '<p class="western"> <br></p><p>Mẫu hợp đồng</p>';
    const xml = '<w:document><w:body><w:p><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p><w:p><w:r><w:t>Mẫu hợp đồng</w:t></w:r></w:p></w:body></w:document>';
    const out = adapter._collapseFloatOnlyParagraphBreaks(html, xml);
    check(out.startsWith("<p class=\"western\"><br></p>"), `space+br must be a single line: ${out}`);
    check(out.includes("<p>Mẫu hợp đồng</p>"), `text paragraph stays: ${out}`);
    const legit = '<w:document><w:body><w:p><w:r><w:t xml:space="preserve"> </w:t><w:br/></w:r></w:p></w:body></w:document>';
    const kept = adapter._collapseFloatOnlyParagraphBreaks(html, legit);
    check(kept === html, `a real break in a whitespace paragraph must stay: ${kept}`);
  });

  test("W11: table-cell paragraphs take spacing/line from the paragraph pPr and the table style (TableGrid)", () => {
    // d13.docx: LibreOffice bá» w:spacing after=0 trong Ã´ vÃ  khÃ´ng Ã¡p TableGrid (after=0, line=240) â†’ hÃ ng 28px thay vÃ¬ 14px.
    const adapter = new WriterAdapter(null);
    const html = '<p>before</p><table><tr><td><p class="western" style="widows: 2">A</p></td><td><p style="margin-bottom: 0.5cm">B</p></td></tr></table>';
    const doc = '<w:document><w:body><w:p><w:r><w:t>before</w:t></w:r></w:p><w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/></w:tblPr><w:tr><w:tc><w:p><w:pPr><w:spacing w:after="0"/></w:pPr><w:r><w:t>A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:pPr><w:spacing w:before="120" w:line="360" w:lineRule="auto"/></w:pPr><w:r><w:t>B</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="table" w:styleId="TableGrid"><w:basedOn w:val="TableNormal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:tblStylePr w:type="firstRow"><w:pPr><w:spacing w:after="999"/></w:pPr></w:tblStylePr></w:style></w:styles>';
    const out = adapter._applyOoxmlTableParagraphSpacing(html, doc, stylesXml);
    check(out.includes('<p class="western" style="widows: 2; margin-bottom: 0cm; line-height: 100%">A</p>'), `cell A must get after=0 + table style line 240: ${out}`);
    check(out.includes('<p style="margin-top: 0.212cm; margin-bottom: 0cm; line-height: 150%">B</p>'), `cell B keeps own before/line, table style after: ${out}`);
    check(out.startsWith("<p>before</p>"), "paragraphs outside tables must not change");
  });

  test("WF1: top-level table rows keep OOXML atLeast/default heights without confusing nested rows", () => {
    const adapter = new WriterAdapter(null);
    const html = '<table><tbody><tr style="color: red; height: 1pt"><td>A<table><tr><td>N</td></tr></table></td></tr><tr><td>B</td></tr></tbody></table>'
      + '<table><tr><td>C</td></tr></table>';
    const doc = '<w:document><w:body><w:tbl><w:tr><w:trPr><w:trHeight w:val="683"/></w:trPr><w:tc><w:p/><w:tbl>'
      + '<w:tr><w:trPr><w:trHeight w:val="400" w:hRule="atLeast"/></w:trPr><w:tc><w:p/></w:tc></w:tr></w:tbl></w:tc></w:tr>'
      + '<w:tr><w:trPr><w:trHeight w:val="700" w:hRule="exact"/></w:trPr><w:tc><w:p/></w:tc></w:tr></w:tbl>'
      + '<w:tbl><w:tr><w:trPr><w:trHeight w:hRule="atLeast" w:val="2897"/></w:trPr><w:tc><w:p/></w:tc></w:tr></w:tbl>'
      + '</w:body></w:document>';
    const out = adapter._applyOoxmlTableRowHeights(html, doc);
    check(/<tr style="color: red;?\s*height: 34\.15pt;"><td>A/.test(out), `outer default/atLeast height missing: ${out}`);
    check(out.includes('<table><tr style="height: 20pt;"><td>N'), `nested row height mapped to the wrong row: ${out}`);
    check(out.includes('</table></td></tr><tr><td>B'), `exact height must stay untouched: ${out}`);
    check(out.endsWith('<table><tr style="height: 144.85pt;"><td>C</td></tr></table>'), `second top-level table height missing: ${out}`);
  });

  test("WF1: explicit OOXML paragraph spacing without w:line restores Word single spacing in table cells", () => {
    const adapter = new WriterAdapter(null);
    const html = '<table><tr><td><p style="margin-top: 0.1cm; line-height: 115%">A</p></td></tr></table>';
    const doc = '<w:document><w:body><w:tbl><w:tr><w:tc><w:p><w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr><w:r><w:t>A</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>';
    const out = adapter._applyOoxmlTableParagraphSpacing(html, doc);
    check(out.includes('margin-top: 0.212cm; margin-bottom: 0.212cm; line-height: 100%'), `single spacing was not restored: ${out}`);
    check(!out.includes('line-height: 115%'), `LibreOffice 115% leaked through: ${out}`);
  });

  test("Imported document class toggles with docStyles (NÄ30 table margins off)", () => {
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
    // Äo d06 (19/9): <w:spacing w:line="10" w:lineRule="atLeast"/> (0,5pt) â†’ LibreOffice line-height: 0.02cm â†’ canvas 0,76 px;
    // Word váº½ 1 dÃ²ng tá»± nhiÃªn (Calibri 12: 19â€“20 px). 15 Ä‘oáº¡n.
    const adapter = new WriterAdapter(null);
    const html = '<p style="line-height: 0.02cm; margin-bottom: 0.28cm">SS04</p><p style="line-height: 0.02cm">Via</p><p style="line-height: 1.5cm">Exact</p>';
    const doc = '<w:document><w:body><w:p><w:pPr><w:spacing w:after="160" w:line="10" w:lineRule="atLeast"/></w:pPr><w:r><w:t>SS04</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="Tight"/></w:pPr><w:r><w:t>Via</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:spacing w:line="850" w:lineRule="exact"/></w:pPr><w:r><w:t>Exact</w:t></w:r></w:p></w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="paragraph" w:styleId="Tight"><w:pPr><w:spacing w:line="240" w:lineRule="atLeast"/></w:pPr></w:style></w:styles>';
    const out = adapter._applyOoxmlContextualSpacing(html, doc, stylesXml);
    // atLeast 0,5pt (< 8pt) → dòng tự nhiên; atLeast 12pt (≥ 8pt) giữ số LibreOffice ghi (đo d07: max() làm thêm 1 trang)
    check(/<p style="[^"]*line-height: normal[^"]*">SS04<\/p>/.test(out), `atLeast 0.5pt -> normal: ${out}`);
    check(out.includes('<p style="line-height: 0.02cm">Via</p>'), `atLeast 12pt keeps LibreOffice value: ${out}`);
    check(out.includes('<p style="line-height: 1.5cm">Exact</p>'), `exact must stay absolute: ${out}`);
  });

  test("W21a: .vno-writer-page has flex-shrink: 0 to prevent footer overlap on multi-page docs", () => {
    const cssPath = path.resolve("apps/writer/writer.css");
    const css = fs.readFileSync(cssPath, "utf8");
    const pageRule = css.match(/(?:^|\n)\.vno-writer-page\s*\{([^}]+)\}/);
    check(pageRule && /flex-shrink:\s*0/.test(pageRule[1]), "vno-writer-page must have flex-shrink: 0");
  });

  test("W21b: _applyOoxmlListBullets maps hyphen bullet '-' from numbering.xml to list-style-type: '- '", () => {
    const adapter = new WriterAdapter(null);
    const html = '<ul><li><p>Tên thương mại: CÔNG TY 3T</p></li><li><p>Tên viết tắt</p></li></ul>';
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr></w:pPr><w:r><w:t>Tên thương mại: CÔNG TY 3T</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr></w:pPr><w:r><w:t>Tên viết tắt</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="6"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/><w:rPr><w:rFonts w:ascii="Times New Roman"/></w:rPr></w:lvl></w:abstractNum>'
      + '<w:num w:numId="4"><w:abstractNumId w:val="6"/></w:num>'
      + '</w:numbering>';
    const out = adapter._applyOoxmlListBullets(html, doc, "", numXml);
    check(out.includes('<li style="list-style-type: \'- \';"><p>Tên thương mại: CÔNG TY 3T</p></li>'), `first li must have list-style-type: '- ': ${out}`);
    check(out.includes('<li style="list-style-type: \'- \';"><p>Tên viết tắt</p></li>'), `second li must have list-style-type: '- ': ${out}`);
  });

  test("W21b: _applyOoxmlListBullets resolves numPr from style chain (e.g. ListBullet)", () => {
    const adapter = new WriterAdapter(null);
    const html = '<ul><li><p>Bullet item via style</p></li></ul>';
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:pStyle w:val="ListBullet"/></w:pPr><w:r><w:t>Bullet item via style</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="paragraph" w:styleId="ListBullet"><w:pPr><w:numPr><w:numId w:val="10"/><w:ilvl w:val="0"/></w:numPr></w:pPr></w:style></w:styles>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="20"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/></w:lvl></w:abstractNum>'
      + '<w:num w:numId="10"><w:abstractNumId w:val="20"/></w:num>'
      + '</w:numbering>';
    const out = adapter._applyOoxmlListBullets(html, doc, stylesXml, numXml);
    check(out.includes('<li style="list-style-type: \'- \';"><p>Bullet item via style</p></li>'), `style-inherited bullet must have list-style-type: '- ': ${out}`);
  });

  test("W21b: _applyOoxmlListBullets leaves decimal/ordered lists and standard disc bullets untouched", () => {
    const adapter = new WriterAdapter(null);
    const html = '<ol><li><p>Item 1</p></li></ol><ul><li><p>Standard bullet</p></li></ul>';
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Item 1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>Standard bullet</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>'
      + '<w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val=""/></w:lvl></w:abstractNum>'
      + '<w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>'
      + '</w:numbering>';
    const out = adapter._applyOoxmlListBullets(html, doc, "", numXml);
    // W33: mục đánh số nhận value + list-style decimal (số thứ tự tính như Word); disc chuẩn giữ nguyên
    check(out.includes('<li value="1" style="list-style-type: decimal;"><p>Item 1</p>'), `ordered item gets Word value/decimal: ${out}`);
    check(out.includes('<ul><li><p>Standard bullet</p></li></ul>'), `standard bullet untouched: ${out}`);
  });

  test("DOCX reopen keeps lowerLetter closing parenthesis from w:lvlText", () => {
    const adapter = new WriterAdapter({});
    const html = '<ol type="a"><li><p>Mục chữ cái</p></li></ol>';
    const doc = '<w:document><w:body><w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="7"/></w:numPr></w:pPr><w:r><w:t>Mục chữ cái</w:t></w:r></w:p></w:body></w:document>';
    const numXml = '<w:numbering><w:abstractNum w:abstractNumId="3"><w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%3)"/></w:lvl></w:abstractNum><w:num w:numId="7"><w:abstractNumId w:val="3"/></w:num></w:numbering>';
    const out = adapter._applyOoxmlListBullets(html, doc, "", numXml);
    check(out.includes('class="vno-list-suffix-paren"'), `lowerLetter ')' must keep marker class: ${out}`);
    check(out.includes("list-style-type: lower-alpha"), `lowerLetter must keep lower-alpha counter: ${out}`);
  });

  test("W33: số thứ tự như Word — đếm theo abstractNum, cấp 0 numFmt none = list-style none, ghép có kiểm chữ đầu", () => {
    const adapter = new WriterAdapter(null);
    // LibreOffice: tiêu đề cấp 0 (none) không có <li>, danh sách cấp 1 bị tách <ol> mới (mất start)
    const html = '<h1>Phần A</h1><ol><li><p>Mục 1</p></li><li><p>Mục 2</p></li></ol>'
      + '<ol><li><h1>Phần B</h1></li></ol><ol><li><p>Mục 3</p></li></ol>';
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Phần A</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Mục 1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Mục 2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Phần B</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Mục 3</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering><w:abstractNum w:abstractNumId="2">'
      + '<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="none"/><w:lvlText w:val=""/></w:lvl>'
      + '<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlRestart w:val="0"/><w:lvlText w:val="%2."/></w:lvl>'
      + '</w:abstractNum><w:num w:numId="12"><w:abstractNumId w:val="2"/></w:num></w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    check(items.map(i => i.value).join(",") === "1,1,2,2,3", `Word counters (lvlRestart=0 không đặt lại): ${items.map(i => i.value).join(",")}`);
    // Không có lvlRestart: cấp 0 xuất hiện thì cấp 1 đặt lại về 1 (mặc định Word)
    const itemsReset = adapter._ooxmlListParagraphs(doc, "", numXml.replace('<w:lvlRestart w:val="0"/>', ""));
    check(itemsReset.map(i => i.value).join(",") === "1,1,2,2,1", `Word counters mặc định: ${itemsReset.map(i => i.value).join(",")}`);
    const out = adapter._applyOoxmlListBullets(html, doc, "", numXml);
    check(out.includes('<li value="1" style="list-style-type: decimal;"><p>Mục 1</p>'), `Mục 1 = 1: ${out}`);
    check(out.includes('<li value="2" style="list-style-type: decimal;"><p>Mục 2</p>'), `Mục 2 = 2: ${out}`);
    check(out.includes('<li style="list-style-type: none;"><h1>Phần B</h1>'), `Phần B none: ${out}`);
    check(out.includes('<li value="3" style="list-style-type: decimal;"><p>Mục 3</p>'), `Mục 3 tiếp 3 (không về 1): ${out}`);
    // Bóc <ol><li><hN> chỉ khi tiêu đề KHÔNG phải đoạn danh sách OOXML
    const wrapped = '<ol><li><h1>Tiêu đề dàn ý</h1></li></ol><ol><li><h1>Phần B</h1></li></ol>';
    const unwrapped = adapter._unwrapOutlineHeadingLists(wrapped, doc, "", numXml);
    check(unwrapped === '<h1>Tiêu đề dàn ý</h1><ol><li><h1>Phần B</h1></li></ol>', `unwrap outline only: ${unwrapped}`);
    check(adapter._unwrapOutlineHeadingLists(wrapped, "", "", "") === '<h1>Tiêu đề dàn ý</h1><h1>Phần B</h1>', "no OOXML: unwrap all");
  });

  // Đo d09 (Word COM): "PHẦN II"/"THỰC TRẠNG…" là Normal (không contextualSpacing) nhưng canvas nhận margin 0 vì ánh xạ
  // w:p ↔ <p> theo thứ tự bị lệch: header 3 đoạn đứng đầu HTML và 30 hộp văn bản có w:p trong body nhưng không có <p>.
  test("W12e: ánh xạ thứ tự bỏ qua <p> trong header/footer/footnote và w:p trong hộp văn bản / mc:Fallback", () => {
    const adapter = new WriterAdapter(null);
    const styles = '<w:styles><w:style w:styleId="ListParagraph"><w:pPr><w:contextualSpacing/></w:pPr></w:style></w:styles>';
    const doc = '<w:document><w:body>'
      + '<w:p><w:r><w:mc:AlternateContent><mc:Choice><w:drawing><wps:txbx><w:txbxContent><w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t>Hộp</w:t></w:r></w:p></w:txbxContent></wps:txbx></w:drawing></mc:Choice>'
      + '<mc:Fallback><w:pict><v:textbox><w:txbxContent><w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t>Hộp</w:t></w:r></w:p></w:txbxContent></v:textbox></w:pict></mc:Fallback></w:mc:AlternateContent></w:r><w:r><w:t>Thân 1</w:t></w:r></w:p>'
      + '<w:p><w:r><w:t>Thân 2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t>Mục A</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t>Mục B</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Tiêu đề</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t>Mục C</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/></w:pPr><w:r><w:t>Mục D</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const html = '<div title="header"><p>Đầu trang 1</p><p>Đầu trang 2</p></div>'
      + '<p>Thân 1</p><p>Thân 2</p><p>Mục A</p><p>Mục B</p><h2 class="western">Tiêu đề</h2><p>Mục C</p><p>Mục D</p>'
      + '<div id="sdfootnote1"><p>Chú thích</p></div><div title="footer"><p>Chân trang</p></div>';
    const out = adapter._applyOoxmlContextualSpacing(html, doc, styles);
    check(out.includes('<p>Đầu trang 1</p><p>Đầu trang 2</p>'), `header paragraphs must be untouched: ${out}`);
    check(out.includes('<p>Thân 1</p><p>Thân 2</p>'), `Normal paragraphs must keep their spacing: ${out}`);
    check(/<p style="margin-bottom: 0">Mục A<\/p><p style="margin-top: 0">Mục B<\/p>/.test(out), `contextual pair must be Mục A/B: ${out}`);
    check(out.includes('<h2 class="western">Tiêu đề</h2>'), `heading counts as a w:p but keeps its tag: ${out}`);
    // Bảng lồng: replace lười dừng ở </w:tbl> của bảng con → hàng sau của bảng cha bị coi là đoạn thân
    const nested = '<w:body><w:tbl><w:tr><w:tc><w:tbl><w:tr><w:tc><w:p><w:r><w:t>in</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:tc></w:tr>'
      + '<w:tr><w:tc><w:p><w:r><w:t>hàng sau</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:t>Thân</w:t></w:r></w:p></w:body>';
    const stripped = adapter._stripOoxmlTables(nested);
    check(!stripped.includes("hàng sau") && stripped.includes("Thân"), `nested tables must be stripped whole: ${stripped}`);
    check(/<p style="margin-bottom: 0">Mục C<\/p><p style="margin-top: 0">Mục D<\/p>/.test(out), `mapping after a heading must stay aligned (Mục C/D): ${out}`);
    check(out.includes('<p>Chú thích</p>') && out.includes('<p>Chân trang</p>'), `footnote/footer paragraphs must be untouched: ${out}`);
  });

  // Đo d01 (Word COM): ô STT = đoạn đánh số rỗng 13pt → hàng Word 35px; canvas rỗng lấy 14pt mặc định → hàng 42px.
  test("W26c: đoạn rỗng trong ô bảng lấy cỡ dấu đoạn; bỏ ô vMerge tiếp nối; ô/đoạn không khớp thì bỏ qua", () => {
    const adapter = new WriterAdapter(null);
    const styles = '<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="28"/></w:rPr></w:rPrDefault></w:docDefaults></w:styles>';
    const doc = '<w:document><w:body><w:tbl><w:tr>'
      + '<w:tc><w:p><w:pPr><w:rPr><w:sz w:val="26"/></w:rPr></w:pPr></w:p></w:tc>'
      + '<w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc>'
      + '<w:tc><w:p><w:r><w:t>Có chữ</w:t></w:r></w:p><w:p><w:pPr><w:rPr><w:sz w:val="20"/></w:rPr></w:pPr></w:p></w:tc>'
      + '</w:tr></w:tbl><w:p><w:pPr><w:rPr><w:sz w:val="16"/></w:rPr></w:pPr></w:p></w:body></w:document>';
    const html = '<div title="header"><table><tr><td><p><br></p></td></tr></table></div>'
      + '<table><tr><td><p><br></p></td><td><p>Có chữ</p><p><br></p></td></tr></table><p><br></p>';
    const out = adapter._applyOoxmlTableCellEmptyParagraphFontSizes(html, doc, styles);
    check(out.includes('<td><p style="font-size: 13pt"><br></p></td>'), `empty numbered cell paragraph must take 13pt: ${out}`);
    check(out.includes('<p>Có chữ</p><p style="font-size: 10pt"><br></p>'), `second cell: text paragraph untouched, empty one 10pt: ${out}`);
    check(out.startsWith('<div title="header"><table><tr><td><p><br></p></td></tr></table></div>'), `header table must be skipped: ${out}`);
    check(out.endsWith('<p><br></p>'), `body paragraph outside tables is not this step's job: ${out}`);
    const li = adapter._propagateEmptyParagraphFontSizeToListItem('<ol><li style="margin-left: 1.27cm;">\n<p style="font-size: 13pt"><br></p></li><li><p style="font-size: 13pt">x</p></li><li><p style="font-size: 13pt"></p></li></ol>');
    check(li.includes('<li style="margin-left: 1.27cm; font-size: 13pt;">\n<p style="font-size: 13pt"><br></p></li>'), `li with only an empty p must take its font-size: ${li}`);
    check(li.includes('<li><p style="font-size: 13pt">x</p></li>'), `li with text keeps its own font: ${li}`);
    check(li.includes('<li style="font-size: 13pt;"><p style="font-size: 13pt"><br></p></li>'), `li without style gets a new style and the empty p gets a <br> so the marker shares its line: ${li}`);
  });

  // Đo thật d15 (Word 2016 COM): 16/16 đoạn "wrap" là List Paragraph, Word left=714 (đoạn) hoặc 1080 (mức numbering)
  // twips, canvas <li> margin 0 vì shell.css reset `* { padding: 0 }` → cột chữ rộng hơn Word 47–72px → ít hơn 1 dòng.
  test("W10b: _applyOoxmlListIndents đặt margin-left cho <li> theo w:ind (đoạn > mức numbering > style), lồng nhau lấy phần chênh", () => {
    const adapter = new WriterAdapter(null);
    const html = '<ul><li><p>Đoạn có w:ind riêng</p></li><li><p>Đoạn lấy lề mức numbering</p></li>'
      + '<li><p>Mục cha</p><ul><li><p>Mục con</p></li></ul></li></ul>'
      + '<ul><li style="list-style-type: \'- \';"><p>Đã có style bullet</p></li></ul>';
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="12"/></w:numPr><w:ind w:left="714" w:hanging="357"/></w:pPr><w:r><w:t>Đoạn có w:ind riêng</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Đoạn lấy lề mức numbering</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Mục cha</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="12"/></w:numPr></w:pPr><w:r><w:t>Mục con</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr></w:pPr><w:r><w:t>numId 0 = bỏ đánh số, không phải li</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="12"/></w:numPr><w:ind w:left="1440"/></w:pPr><w:r><w:t>Đã có style bullet</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const stylesXml = '<w:styles><w:style w:type="paragraph" w:styleId="ListParagraph"><w:pPr><w:ind w:left="720"/></w:pPr></w:style></w:styles>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="6">'
      + '<w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/><w:pPr><w:ind w:left="1080" w:hanging="360"/></w:pPr></w:lvl>'
      + '<w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/><w:lvlText w:val="o"/><w:pPr><w:ind w:left="1800" w:hanging="360"/></w:pPr></w:lvl>'
      + '</w:abstractNum><w:num w:numId="12"><w:abstractNumId w:val="6"/></w:num></w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, stylesXml, numXml);
    check(items.length === 5, `numId=0 must be skipped, 5 list paragraphs expected: ${items.length}`);
    check(items[0].ind.left === 714 && items[0].ind.hanging === 357, `direct w:ind wins: ${JSON.stringify(items[0].ind)}`);
    check(items[1].ind.left === 1080 && items[1].ind.hanging === 360, `numbering level beats style ind 720: ${JSON.stringify(items[1].ind)}`);
    const out = adapter._applyOoxmlListIndents(html, doc, stylesXml, numXml);
    check(out.includes('<li style="margin-left: 1.259cm;"><p>Đoạn có w:ind riêng</p>'), `714 twips → 1.259cm: ${out}`);
    check(out.includes('<li style="margin-left: 1.905cm;"><p>Đoạn lấy lề mức numbering</p>'), `1080 twips → 1.905cm: ${out}`);
    check(out.includes('<li style="margin-left: 1.905cm;"><p>Mục cha</p><ul><li style="margin-left: 1.27cm;"><p>Mục con</p>'), `nested li gets 1800-1080 = 720 twips: ${out}`);
    check(out.includes('<li style="list-style-type: \'- \'; margin-left: 2.54cm;"><p>Đã có style bullet</p>'), `existing single-quoted style must be extended, not duplicated: ${out}`);
    check(!out.includes("text-indent"), `hanging lists must not get a negative text-indent (marker sits outside): ${out}`);
  });

  // Đo d07 (Word COM): mục danh sách 2 dòng Word 39,8px, canvas <li> 41,8px vì hộp dòng của ::marker dùng
  // line-height của <li> (--vno-lh mặc định 1,15 × 1,15 = 22,9px) trong khi <p> bên trong có line-height 100% (19,9px).
  test("W10c: <li> nhận --vno-lh của <p> đầu tiên bên trong để marker không làm mục cao thêm", () => {
    const adapter = new WriterAdapter(null);
    const html = '<ul><li><p style="margin-top: 0.21cm; line-height: 100%">Mục</p></li><li>\n\t<p style="line-height: 130%">Mục 2</p></li><li><p>Không có line-height</p></li></ul>';
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Mục</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Mục 2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Không có line-height</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num></w:numbering>';
    const out = adapter._applyOoxmlListIndents(html, doc, "", numXml);
    check(out.includes('<li style="--vno-lh: 1;"><p style="margin-top: 0.21cm; line-height: 100%">Mục</p>'), `li must take --vno-lh: 1 from its 100% paragraph: ${out}`);
    check(out.includes('<li style="--vno-lh: 1.3;">\n\t<p style="line-height: 130%">Mục 2</p>'), `li must take --vno-lh: 1.3 (whitespace before <p> allowed): ${out}`);
    check(out.includes('<li><p>Không có line-height</p>'), `li without line-height on its paragraph stays untouched: ${out}`);
  });

  test("Import (W25b): odd w:sz runs (11.5/16.5 pt) restored to exact half-point font-size without touching even runs", () => {
    const adapter = new WriterAdapter(null);
    const docXml = '<w:document xmlns:w="w"><w:body>'
      + '<w:p><w:pPr><w:rPr><w:sz w:val="23"/></w:rPr></w:pPr>'
      + '<w:r><w:t>Đoạn 1 run 1 kế thừa pPr</w:t></w:r>'
      + '<w:r><w:rPr><w:sz w:val="33"/></w:rPr><w:t>Tiêu đề 16.5pt</w:t></w:r>'
      + '<w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>Run chẵn 12pt</w:t></w:r>'
      + '</w:p>'
      + '<w:p>'
      + '<w:r><w:rPr><w:sz w:val="23"/></w:rPr><w:t>Đoạn 2 run 11.5pt</w:t></w:r>'
      + '</w:p>'
      + '</w:body></w:document>';
    const html = '<p><font face="Times New Roman"><font size="3" style="font-size: 11pt">Đoạn 1 run 1 kế thừa pPr</font></font>'
      + '<span style="font-size: 16pt">Tiêu đề 16.5pt</span>'
      + '<font style="font-size: 12pt">Run chẵn 12pt</font></p>'
      + '<p><font style="font-size: 11pt">Đoạn 2 run 11.5pt</font></p>';
    const out = adapter._applyOoxmlHalfPointRunFontSizes(html, docXml, "");
    check(out.includes('style="font-size: 11.5pt">Đoạn 1 run 1'), `11pt must become 11.5pt: ${out}`);
    check(out.includes('style="font-size: 16.5pt">Tiêu đề 16.5pt</span>'), `16pt must become 16.5pt: ${out}`);
    check(out.includes('style="font-size: 12pt">Run chẵn 12pt</font>'), `even 12pt must remain untouched: ${out}`);
    check(out.includes('style="font-size: 11.5pt">Đoạn 2 run 11.5pt</font>'), `second para run must become 11.5pt: ${out}`);
  });

  test("Import (W26a): empty paragraphs receive exact paragraph mark font-size from pPr/rPr/sz or style chain", () => {
    const adapter = new WriterAdapter(null);
    const stylesXml = '<w:styles xmlns:w="w">'
      + '<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>'
      + '<w:style w:styleId="Heading1"><w:rPr><w:sz w:val="28"/></w:rPr></w:style>'
      + '<w:style w:styleId="CustomHeading"><w:basedOn w:val="Heading1"/></w:style>'
      + '</w:styles>';
    const docXml = '<w:document xmlns:w="w"><w:body>'
      + '<w:p><w:pPr><w:rPr><w:sz w:val="26"/></w:rPr></w:pPr></w:p>' // empty 13pt
      + '<w:p><w:pPr><w:pStyle w:val="CustomHeading"/></w:pPr></w:p>' // empty 14pt via style chain
      + '<w:p><w:r><w:t>Đoạn có chữ không bị đổi</w:t></w:r></w:p>' // has text
      + '<w:p><w:r><w:drawing><wp:inline/></w:drawing></w:r></w:p>' // has drawing (anchored shape)
      + '</w:body></w:document>';
    const html = '<p style="margin-bottom: 0cm; line-height: 130%"><br/></p>'
      + '<p style="margin-bottom: 0cm"><br/></p>'
      + '<p style="margin-bottom: 0cm">Đoạn có chữ không bị đổi</p>'
      + '<p style="margin-bottom: 0cm"><span data-vno-float="1"><img src="x"/></span></p>';
    const out = adapter._applyOoxmlEmptyParagraphFontSizes(html, docXml, stylesXml);
    check(out.includes('style="margin-bottom: 0cm; line-height: 130%; font-size: 13pt"><br/></p>'), `first empty para must get 13pt: ${out}`);
    check(out.includes('style="margin-bottom: 0cm; font-size: 14pt"><br/></p>'), `second empty para must get 14pt via style chain: ${out}`);
    check(out.includes('>Đoạn có chữ không bị đổi</p>') && !out.includes('Đoạn có chữ không bị đổi</p>').includes?.('font-size:'), `text para must not get empty para font-size: ${out}`);
    check(out.includes('<p style="margin-bottom: 0cm"><span data-vno-float="1">'), `drawing para must not get font-size: ${out}`);
  });

  return results;
}
