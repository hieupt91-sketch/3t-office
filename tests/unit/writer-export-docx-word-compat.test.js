import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function makeAdapter() {
  const body = { innerHTML: "", querySelector() { return null; }, querySelectorAll() { return []; } };
  return new WriterAdapter(body);
}

export async function runWriterExportDocxWordCompatTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  const adapter = makeAdapter();

  await test("Word Compat: span width stripped from export", () => {
    const input = '<span style="color:red; width:5.02cm; font-size:12pt">Hello</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("width")) throw new Error(`width not stripped: ${out}`);
    if (!out.includes("color:red")) throw new Error("color was stripped");
    if (!out.includes("font-size:12pt")) throw new Error("font-size was stripped");
    if (!out.includes("Hello")) throw new Error("text content lost");
  });

  await test("Word Compat: span height stripped from export", () => {
    const input = '<span style="height:3cm; background:#ff0">X</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("height")) throw new Error(`height not stripped: ${out}`);
    if (!out.includes("background:#ff0")) throw new Error("background was stripped");
  });

  await test("Word Compat: span min-height stripped from export", () => {
    const input = '<span style="min-height:2em; color:blue">Y</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("min-height")) throw new Error(`min-height not stripped: ${out}`);
    if (!out.includes("color:blue")) throw new Error("color was stripped");
  });

  await test("Word Compat: span max-width stripped from export", () => {
    const input = '<span style="max-width:100px; border:1px solid">Z</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("max-width")) throw new Error(`max-width not stripped: ${out}`);
    if (!out.includes("border:1px solid")) throw new Error("border was stripped");
  });

  await test("Word Compat: span position stripped from export", () => {
    const input = '<span style="position:absolute; top:10px; color:green">W</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("position")) throw new Error(`position not stripped: ${out}`);
    if (out.includes("top:")) throw new Error("top was not stripped with position");
    if (!out.includes("color:green")) throw new Error("color was stripped");
  });

  await test("Word Compat: span float stripped from export", () => {
    const input = '<span style="float:left; width:5cm; margin:5px">F</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("float")) throw new Error(`float not stripped: ${out}`);
    if (out.includes("width")) throw new Error("width not stripped");
    if (!out.includes("margin:5px")) throw new Error("margin was stripped");
  });

  await test("Word Compat: span display:inline-block stripped from export", () => {
    const input = '<span style="display:inline-block; width:3cm; color:red">D</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("inline-block")) throw new Error(`display:inline-block not stripped: ${out}`);
    if (out.includes("width")) throw new Error("width not stripped");
    if (!out.includes("color:red")) throw new Error("color was stripped");
  });

  await test("Word Compat: span only width → style attribute removed entirely", () => {
    const input = '<span style="width:5cm">T</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("style=")) throw new Error(`empty style attribute left: ${out}`);
    if (!out.includes("T")) throw new Error("text content lost");
  });

  await test("Word Compat: img width/height preserved", () => {
    const input = '<img src="pic.png" width="200" height="100" style="width:5cm; height:3cm">';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (!out.includes('width="200"')) throw new Error("img width attr stripped");
    if (!out.includes('height="100"')) throw new Error("img height attr stripped");
    if (out.includes("width:5cm")) throw new Error("img style width not stripped");
  });

  await test("Word Compat: div with class vno-export-section keeps width", () => {
    const input = '<div class="vno-export-section vno-export-section-1" style="width:100%">S</div>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (!out.includes("width:100%")) throw new Error("structural div width was stripped");
  });

  await test("Word Compat: non-structural div width stripped", () => {
    const input = '<div class="some-class" style="width:50%; color:red">D</div>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("width")) throw new Error(`non-structural div width not stripped: ${out}`);
    if (!out.includes("color:red")) throw new Error("color was stripped");
  });

  await test("Word Compat: mixed content — spans cleaned, img and structural divs preserved", () => {
    const input = [
      '<div class="vno-export-section" style="width:100%">',
      '<span style="width:5cm; color:blue">A</span>',
      '<img src="x.png" width="100" height="50">',
      '<span style="height:2cm; font-weight:bold">B</span>',
      '</div>'
    ].join("");
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("width:5cm")) throw new Error("span width not stripped in mixed");
    if (out.includes("height:2cm")) throw new Error("span height not stripped in mixed");
    if (!out.includes("width:100%")) throw new Error("structural div width lost");
    if (!out.includes('width="100"')) throw new Error("img attr lost");
    if (!out.includes("color:blue")) throw new Error("span color lost");
    if (!out.includes("font-weight:bold")) throw new Error("span font-weight lost");
  });

  await test("Word Compat: empty/null input returns as-is", () => {
    if (adapter._sanitizeExportHtmlForWordCompat("") !== "") throw new Error("empty not handled");
    if (adapter._sanitizeExportHtmlForWordCompat(null) !== null) throw new Error("null not handled");
    if (adapter._sanitizeExportHtmlForWordCompat(undefined) !== undefined) throw new Error("undefined not handled");
  });

  await test("Word Compat: style with semicolons and spaces handled", () => {
    const input = '<span style="  color:red ;  width:4cm ;  font-size:10pt  ">C</span>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (out.includes("width")) throw new Error(`width not stripped: ${out}`);
    if (!out.includes("color:red")) throw new Error("color lost");
    if (!out.includes("font-size:10pt")) throw new Error("font-size lost");
  });

  await test("Word Compat: div vno-export-watermark keeps width", () => {
    const input = '<div class="vno-export-watermark" style="width:80%; opacity:0.2">W</div>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (!out.includes("width:80%")) throw new Error("watermark div width was stripped");
  });

  await test("Word Compat: div vno-export-shapes keeps width", () => {
    const input = '<div class="vno-export-shapes" style="width:100%; height:0">S</div>';
    const out = adapter._sanitizeExportHtmlForWordCompat(input);
    if (!out.includes("width:100%")) throw new Error("shapes div width was stripped");
  });

  await test("Writer Export: _contentForExport applies Word compat sanitization", () => {
    const body = {
      innerHTML: '<p><span style="width:5cm; color:red">Test</span></p>',
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
    const adapter2 = new WriterAdapter(body);
    adapter2.sectionPageSetups = { "section-1": { size: "a4", orientation: "portrait", margins: { top: 20, bottom: 20, left: 30, right: 15 } } };
    const exported = adapter2._contentForExport();
    if (exported.includes("width:5cm")) throw new Error("_contentForExport did not strip span width");
    if (!exported.includes("color:red")) throw new Error("_contentForExport stripped color");
  });

  return results;
}
