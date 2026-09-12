import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

const HTML = `<body><p>Neo ảnh<span class="sd-abs-pos" style="position: absolute; top: 7.41cm; left: 3.39cm; width: 528px"><img src="data:image/png;base64,iVBOR" width="528" height="492"></span><span id="textbox2" style="position:absolute;top:-2.54cm;left:1.94cm;width:12.71cm;height:3cm;border:none;background:#fff"><p>Nội dung hộp <span style="font-weight:bold">đậm</span></p></span></p><p>Sau khung</p></body>`;
const OOXML = `<w:document><w:body><w:p><w:r><w:drawing><wp:anchor behindDoc="1"><wp:positionH relativeFrom="page"><wp:posOffset>1</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>2</wp:posOffset></wp:positionV><wp:wrapNone/></wp:anchor></w:drawing></w:r></w:p><w:p><w:r><w:drawing><wp:anchor behindDoc="0"><wp:positionH relativeFrom="paragraph"/><wp:positionV relativeFrom="paragraph"/><wp:wrapSquare/></wp:anchor></w:drawing></w:r></w:p></w:body></w:document>`;

function check(value, message) { if (!value) throw new Error(message); }

export async function runWriterFloatingImageImportTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("Floating import preserves image geometry and OOXML anchor semantics", () => {
    const adapter = new WriterAdapter(null);
    const body = adapter._normalizeImportedHtml(HTML, OOXML).body;
    check(body.includes('data-vno-float="image"'), "Missing image float marker");
    check(body.includes('data-vno-left="3.39"') && body.includes('data-vno-top="7.41"'), "Image coordinates changed");
    check(body.includes('data-vno-width="13.97"'), "528px width was not normalized to cm");
    check(body.includes('data-vno-relative-h="page"') && body.includes('data-vno-behind="1"'), "OOXML page/behind metadata missing");
  });

  test("Floating import preserves textbox content, negative geometry and wrap", () => {
    const adapter = new WriterAdapter(null);
    const body = adapter._normalizeImportedHtml(HTML, OOXML).body;
    check(body.includes('data-vno-float="textbox"'), "Missing textbox float marker");
    check(body.includes('data-vno-top="-2.54"') && body.includes('data-vno-width="12.71"'), "Textbox geometry changed");
    check(body.includes('data-vno-wrap="wrapSquare"'), "OOXML wrapSquare metadata missing");
    check(body.includes("Nội dung hộp") && body.includes("font-weight:bold"), "Textbox nested content changed");
    check(body.includes("data-vno-float-anchor") && body.includes("position:relative"), "Textbox anchor paragraph was not made a relative container");
  });

  test("Page-relative image uses the page rather than a negatively indented paragraph", () => {
    const html = '<body><p style="margin-left:-2.54cm"><span class="sd-abs-pos" style="position:absolute;left:-2.54cm;top:-2.54cm;width:21cm;height:29.7cm"><img src="cover"></span></p><p>Trang sau</p></body>';
    const xml = '<w:document><w:body><w:p><w:r><w:drawing><wp:anchor behindDoc="1"><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapTopAndBottom/></wp:anchor></w:drawing></w:r></w:p></w:body></w:document>';
    const body = new WriterAdapter(null)._normalizeImportedHtml(html, xml).body;
    check(body.includes('data-vno-relative-h="page"'), "Page origin metadata missing");
    check(/data-vno-float-anchor[^>]*style="position:static;min-height:27\.16cm;/i.test(body), `Page anchor still follows paragraph box: ${body}`);
    check(body.includes("left:0cm") && body.includes("top:-2.54cm"), "Negative paragraph margin was not compensated");
  });

  test("Margin-relative image includes imported page margins", () => {
    const adapter = new WriterAdapter(null);
    const normalized = adapter._preserveImportedFloatingFrames(
      '<span class="sd-abs-pos" style="position:absolute;left:1cm;top:2cm;width:3cm;height:4cm"><img src="x"></span>',
      '<wp:anchor><wp:positionH relativeFrom="margin"/><wp:positionV relativeFrom="margin"/><wp:wrapNone/></wp:anchor>',
      { margins: { left: 30, top: 20 } }
    );
    check(normalized.includes("left:4cm") && normalized.includes("top:4cm"), `Margins were not applied: ${normalized}`);
  });

  test("Rasterized OOXML group uses native page geometry instead of LibreOffice HTML geometry", () => {
    const html = '<span class="sd-abs-pos" style="position:absolute;left:-2.54cm;top:-2.54cm;width:10cm;height:10cm"><img src="group-preview"></span>';
    const xml = '<wp:anchor><wp:positionH relativeFrom="page"><wp:posOffset>360000</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>720000</wp:posOffset></wp:positionV><wp:extent cx="1800000" cy="2160000"/><wp:wrapNone/><wpg:wgp/></wp:anchor>';
    const body = new WriterAdapter(null)._preserveImportedFloatingFrames(html, xml);
    check(body.includes('data-vno-left="1"') && body.includes('data-vno-top="2"'), `Native offsets missing: ${body}`);
    check(body.includes('data-vno-width="5"') && body.includes('data-vno-height="6"'), `Native extent missing: ${body}`);
  });

  test("Floating export emits absolute img and div while ordinary spans remain sanitized", () => {
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(HTML, OOXML).body;
    const prepared = adapter._prepareFloatingFramesForExport(imported);
    const exported = adapter._sanitizeExportHtmlForWordCompat(`${prepared}<span style="position:absolute;width:5cm">regular</span>`);
    check(/<img[^>]+style="position:absolute;left:3\.39cm;top:7\.41cm;width:13\.97cm;height:13\.018cm;[^"']*"/i.test(exported), "Image was not exported as absolute img");
    check(/<div[^>]*style="position:absolute;left:1\.94cm;top:-2\.54cm;width:12\.71cm;height:3cm;[^"']*">/i.test(exported), `Textbox was not exported as absolute div: ${exported}`);
    check(!/<span style="[^"]*(?:position|width)/i.test(exported), "Ordinary span compatibility sanitization regressed");
  });

  test("Inline images and documents without floating frames are unchanged", () => {
    const adapter = new WriterAdapter(null);
    const plain = `<body><p>Hello</p><img src="x" width="100"><table><tr><td>A</td></tr></table></body>`;
    const body = adapter._normalizeImportedHtml(plain, OOXML).body;
    check(body === `<p>Hello</p><img src="x" width="100"><table><tr><td>A</td></tr></table>`, "Plain content changed");
    check(!body.includes("data-vno-float"), "Invented a floating marker");
  });

  for (const [raw, expected] of [["10mm", 1], ["1in", 2.54], ["96px", 2.54], ["72pt", 2.54], ["-2.5cm", -2.5]]) {
    test(`Floating length conversion preserves ${raw}`, () => {
      check(new WriterAdapter(null)._cssLengthToCm(raw) === expected, `Wrong cm conversion for ${raw}`);
    });
  }

  for (const [needle, label] of [["wrapSquare", "wrap"], ["page", "horizontal origin"], ["paragraph", "vertical origin"], ['"behindDoc":true', "layer"]]) {
    test(`OOXML floating metadata reads ${label}`, () => {
      const metadata = new WriterAdapter(null)._ooxmlFloatingAnchorMetadata(OOXML);
      check(JSON.stringify(metadata).includes(needle), `Missing ${needle}`);
    });
  }

  for (const [needle, label] of [["border:none", "border"], ["background:#fff", "background"], ['data-vno-height="3"', "height"], ['data-vno-relative-v="paragraph"', "relative origin"]]) {
    test(`Floating textbox import preserves ${label}`, () => {
      const body = new WriterAdapter(null)._normalizeImportedHtml(HTML, OOXML).body;
      check(body.includes(needle), `Missing ${needle}`);
    });
  }

  for (const [kind, tag] of [["image", "<img"], ["textbox", "<div"], ["textbox", "position:absolute"]]) {
    test(`Floating ${kind} export includes ${tag}`, () => {
      const adapter = new WriterAdapter(null);
      const exported = adapter._prepareFloatingFramesForExport(adapter._normalizeImportedHtml(HTML, OOXML).body);
      check(exported.includes(tag), `Missing ${tag}`);
    });
  }

  test("Compatibility sanitizer still strips regular absolute span", () => {
    const clean = new WriterAdapter(null)._sanitizeExportHtmlForWordCompat('<span style="position:absolute;left:1cm;width:2cm;color:red">x</span>');
    check(!clean.includes("position:") && !clean.includes("width:"), "Regular span retained frame geometry");
  });

  test("Compatibility sanitizer retains exported absolute div", () => {
    const clean = new WriterAdapter(null)._sanitizeExportHtmlForWordCompat('<div style="position:absolute;left:1cm;width:2cm">x</div>');
    check(clean.includes("position:absolute") && clean.includes("width:2cm"), "Exported div lost frame geometry");
  });

  test("Textbox document converts its float paragraph to a div anchor", () => {
    const body = new WriterAdapter(null)._normalizeImportedHtml(HTML, OOXML).body;
    check(/^<div\b/i.test(body), "Float anchor did not become div");
  });

  test("Image-only document keeps paragraph page-break semantics", () => {
    const html = '<body><p style="page-break-before:always"><span class="sd-abs-pos" style="position:absolute;left:1cm;top:1cm"><img src="x"></span></p></body>';
    const body = new WriterAdapter(null)._normalizeImportedHtml(html, OOXML).body;
    check(/^<p\b/i.test(body) && body.includes("page-break-before:always"), "Image-only anchor paragraph changed");
  });

  test("Export restores original page-relative geometry without canvas anchor layout", () => {
    const html = '<body><p style="page-break-before:always;margin-left:-2.54cm"><span class="sd-abs-pos" style="position:absolute;left:1cm;top:2cm;width:3cm;height:4cm"><img src="x"></span></p></body>';
    const ooxml = '<w:document><w:body><w:p><w:r><w:drawing><wp:anchor><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapTopAndBottom/></wp:anchor></w:drawing></w:r></w:p></w:body></w:document>';
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(html, ooxml).body;
    check(/data-vno-float-anchor[^>]*position:static/i.test(imported), "Fixture did not exercise canvas-only static positioning");
    check(/data-vno-float-anchor[^>]*min-height:6cm/i.test(imported), "Fixture did not exercise canvas-only height reservation");
    check(/data-vno-float[^>]*left:3\.54cm/i.test(imported), `Fixture did not exercise negative-margin display compensation: ${imported}`);

    const body = {
      innerHTML: imported,
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
    const exported = new WriterAdapter(body)._contentForExport();
    check(/<img[^>]*style="[^"]*left:1cm;top:2cm;/i.test(exported), `Export did not restore LibreOffice geometry: ${exported}`);
    check(!/data-vno-float-anchor[^>]*\b(?:min-height|position)\s*:/i.test(exported), `Canvas-only anchor layout leaked into export: ${exported}`);
    check(!/data-vno-float-anchor[^>]*\b(?:page-break-before|break-before)\s*:/i.test(exported), "Carrier paragraph page break leaked into export");
  });

  return results;
}
