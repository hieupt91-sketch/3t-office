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
    check(/data-vno-float-anchor[^>]*style="position:relative;min-height:24\.62cm;/i.test(body), `Page anchor must be position:relative with capped height: ${body}`);
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

  test("Repeated full-page behind image is classified as an imported watermark", () => {
    const image = '<span class="sd-abs-pos" style="position:absolute;left:3cm;top:7cm;width:14cm;height:13cm"><img src="same-watermark"></span>';
    const html = `<body><p>${image}</p><p>${image}</p><p>${image}</p></body>`;
    const anchor = '<wp:anchor behindDoc="1"><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapNone/></wp:anchor>';
    const body = new WriterAdapter(null)._normalizeImportedHtml(html, `<w:document>${anchor}${anchor}${anchor}</w:document>`).body;
    check((body.match(/data-vno-imported-watermark="1"/g) || []).length === 3, `Repeated watermark markers missing: ${body}`);
  });

  test("OOXML first-row cell widths restore imported table column proportions", () => {
    const html = '<body><table width="625"><colgroup><col width="313"><col width="313"></colgroup><tr><td>A</td><td>B</td></tr></table></body>';
    const xml = '<w:document><w:tbl><w:tr><w:tc><w:tcPr><w:tcW w:w="7130"/></w:tcPr></w:tc><w:tc><w:tcPr><w:tcW w:w="472"/></w:tcPr></w:tc></w:tr></w:tbl></w:document>';
    const body = new WriterAdapter(null)._normalizeImportedHtml(html, xml).body;
    check(body.includes('<col width="586">') && body.includes('<col width="39">'), `Native Word column ratio was not restored: ${body}`);
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

  test("Image-only document keeps group carrier page break on a real paragraph", () => {
    const html = '<body><p style="page-break-before:always"><span class="sd-abs-pos" style="position:absolute;left:1cm;top:1cm"><img src="x"></span></p></body>';
    const groupedOoxml = OOXML.replace("<wp:wrapNone/>", "<wp:wrapNone/><wpg:wgp/>");
    const body = new WriterAdapter(null)._normalizeImportedHtml(html, groupedOoxml).body;
    check(/^<p\b/i.test(body) && body.includes("page-break-before:always"), "Image-only anchor carrier lost paragraph break semantics");
  });

  test("Whole-editor snapshot detects native textbox and ordinary text edits", () => {
    const editor = {
      innerHTML: '<div class="vno-writer-body"><p>Body</p><div data-vno-float="textbox">Box</div></div>',
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
    const adapter = new WriterAdapter(editor);
    adapter._openedEditorDomHash = adapter._editorDomFingerprint();
    check(adapter._isOpenedDocumentPristine(), "Unedited editor was not pristine");
    editor.innerHTML = editor.innerHTML.replace("Box", "ZZBox");
    check(!adapter._isOpenedDocumentPristine(), "Textbox edit escaped whole-editor snapshot");
    editor.innerHTML = '<div class="vno-writer-body"><p>ZZBody</p><div data-vno-float="textbox">Box</div></div>';
    check(!adapter._isOpenedDocumentPristine(), "Ordinary text edit escaped whole-editor snapshot");
  });

  test("Dirty state overrides an unchanged whole-editor snapshot", () => {
    const editor = { innerHTML: "<p>Body</p>" };
    const adapter = new WriterAdapter(editor);
    adapter._openedEditorDomHash = adapter._editorDomFingerprint();
    adapter.isDirty = true;
    check(!adapter._isOpenedDocumentPristine(), "Dirty document was marked pristine");
  });

  test("Export restores original page-relative geometry without canvas anchor layout", () => {
    const html = '<body><p style="page-break-before:always;margin-left:-2.54cm"><span class="sd-abs-pos" style="position:absolute;left:1cm;top:2cm;width:3cm;height:4cm"><img src="x"></span></p></body>';
    const ooxml = '<w:document><w:body><w:p><w:r><w:drawing><wp:anchor><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapTopAndBottom/></wp:anchor></w:drawing></w:r></w:p></w:body></w:document>';
    const adapter = new WriterAdapter(null);
    const imported = adapter._normalizeImportedHtml(html, ooxml).body;
    check(/data-vno-float-anchor[^>]*position:relative/i.test(imported), "Fixture did not exercise canvas-only relative positioning");
    check(/data-vno-float-anchor[^>]*min-height:3\.46cm/i.test(imported), "Fixture did not exercise canvas-only height reservation");
    check(/data-vno-float[^>]*left:3\.54cm/i.test(imported), `Fixture did not exercise negative-margin display compensation: ${imported}`);

    const body = {
      innerHTML: imported,
      querySelector() { return null; },
      querySelectorAll() { return []; }
    };
    const exported = new WriterAdapter(body)._contentForExport();
    check(/<img[^>]*style="[^"]*left:1cm;top:2cm;/i.test(exported), `Export did not restore LibreOffice geometry: ${exported}`);
    check(!/data-vno-float-anchor[^>]*\b(?:min-height|position)\s*:/i.test(exported), `Canvas-only anchor layout leaked into export: ${exported}`);
    check(/data-vno-float-anchor[^>]*\bpage-break-before\s*:\s*always/i.test(exported), "Carrier break metadata was stripped from export");
  });

  test("R2 (a): FrameN with matched text is moved into paragraph containing anchor image k", () => {
    const html = '<body><p><span class="sd-abs-pos" style="position:absolute;left:0cm;top:0cm;width:10cm;height:10cm"><img name="Shape1" src="img1"></span><span id="Frame99" style="position:absolute;top:5cm;left:1cm;width:8cm"><p>Text for anchor 1</p></span></p><p style="page-break-before:always"><span class="sd-abs-pos" style="position:absolute;left:0cm;top:0cm;width:10cm;height:10cm"><img name="Shape2" src="img2"></span></p></body>';
    const ooxml = `<w:document><w:body>
      <w:p><w:r><w:drawing><wp:anchor><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapNone/><wpg:wgp><wpg:grpSpPr/></wpg:wgp></wp:anchor></w:drawing></w:r></w:p>
      <w:p><w:r><w:drawing><wp:anchor><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapNone/><wpg:wgp><wpg:grpSpPr/>
        <wps:wsp><w:txbxContent><w:p><w:r><w:t>Text for anchor 1</w:t></w:r></w:p></w:txbxContent><a:off x="0" y="0"/><a:ext cx="1000" cy="1000"/></wps:wsp>
      </wpg:wgp></wp:anchor></w:drawing></w:r></w:p>
    </w:body></w:document>`;
    const adapter = new WriterAdapter(null);
    const body = adapter._normalizeImportedHtml(html, ooxml).body;
    const parts = body.split(/page-break-before/i);
    check(parts.length === 2, "Failed to split into two pages by break");
    check(!parts[0].includes("Text for anchor 1"), "Frame99 was not removed from first paragraph");
    check(parts[1].includes("Shape2") && parts[1].includes("Text for anchor 1"), "Frame99 was not moved into paragraph of Shape2");
  });

  test("R2 (b): Page-relative container is position:relative", () => {
    const html = '<body><p><span class="sd-abs-pos" style="position:absolute;left:1cm;top:2cm;width:5cm;height:5cm"><img src="x"></span></p></body>';
    const ooxml = '<w:document><w:body><w:p><w:r><w:drawing><wp:anchor><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapTopAndBottom/></wp:anchor></w:drawing></w:r></w:p></w:body></w:document>';
    const adapter = new WriterAdapter(null);
    const body = adapter._normalizeImportedHtml(html, ooxml).body;
    check(/data-vno-float-anchor[^>]*\bstyle="[^"]*position:\s*relative/i.test(body), `Container must be position:relative: ${body}`);
    check(!/position:\s*static/i.test(body), `Container must not be position:static: ${body}`);
  });

  test("R2 (c): Reserve height does not exceed usable content height", () => {
    const html = '<body><p><span class="sd-abs-pos" style="position:absolute;left:0cm;top:0cm;width:21cm;height:40cm"><img src="huge"></span></p></body>';
    const ooxml = '<w:document><w:body><w:p><w:r><w:drawing><wp:anchor><wp:positionH relativeFrom="page"/><wp:positionV relativeFrom="page"/><wp:wrapTopAndBottom/></wp:anchor></w:drawing></w:r></w:p></w:body></w:document>';
    const adapter = new WriterAdapter(null);
    const body = adapter._normalizeImportedHtml(html, ooxml).body;
    const minHeightMatch = body.match(/min-height:\s*([\d.]+)cm/i);
    check(minHeightMatch, "min-height reserve was not generated");
    const minHeightCm = Number(minHeightMatch[1]);
    check(minHeightCm <= 24.62, `Reserve ${minHeightCm}cm exceeded usable content height ~24.62cm`);
  });

  test("R3 (a): Inline group with child textboxes wraps img in data-vno-inline-group and sets relative coordinates", () => {
    const html = '<body><p><span id="Frame1" style="position:absolute;top:0cm;left:0cm;width:2cm"><p>Inline Label</p></span></p><p><img name="Shape8" src="img_inline.png"></p></body>';
    const ooxml = `<w:document><w:body>
      <w:p><w:r><w:drawing><wp:inline>
        <wp:extent cx="3600000" cy="7200000"/>
        <wp:docPr id="1" name="Group 7735"/>
        <wpg:wgp>
          <wpg:grpSpPr>
            <a:chOff x="0" y="0"/><a:chExt cx="3600000" cy="7200000"/>
          </wpg:grpSpPr>
          <wps:wsp>
            <w:txbxContent><w:p><w:r><w:t>Inline Label</w:t></w:r></w:p></w:txbxContent>
            <a:off x="360000" y="720000"/>
            <a:ext cx="1800000" cy="360000"/>
          </wps:wsp>
        </wpg:wgp>
      </wp:inline></w:drawing></w:r></w:p>
    </w:body></w:document>`;
    const adapter = new WriterAdapter(null);
    const body = adapter._normalizeImportedHtml(html, ooxml).body;
    check(body.includes('data-vno-inline-group="0"'), `Missing data-vno-inline-group: ${body}`);
    check(/<span\b[^>]*data-vno-inline-group="0"[^>]*style="[^"]*width:\s*10cm;\s*height:\s*20cm/i.test(body), `Inline group container must have extent width/height: ${body}`);
    check(/data-vno-left="1"[^>]*data-vno-top="2"/i.test(body), `Child textbox must have local coordinates without page margins: ${body}`);
    check(/left:\s*1cm;\s*top:\s*2cm/i.test(body), `Child textbox must have local CSS positioning: ${body}`);
    check(!/top:\s*-2\.54cm/i.test(body), `Child textbox must not have negative margin offset: ${body}`);
    // Check that Frame1 was removed from first paragraph
    const pParts = body.split(/<\/p>/i);
    check(!pParts[0].includes("Inline Label"), `Child textbox was not removed from initial paragraph: ${pParts[0]}`);
    check(pParts[1].includes("data-vno-inline-group") && pParts[1].includes("Inline Label"), `Child textbox was not moved into inline group container: ${pParts[1]}`);
  });

  return results;
}

