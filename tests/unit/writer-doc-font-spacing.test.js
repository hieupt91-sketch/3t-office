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

  return results;
}
