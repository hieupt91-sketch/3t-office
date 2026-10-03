/** P3b: các đường quét/ghép HTML tuyến tính phải byte-identical với bản P3 giữ lại. */
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function fixture(random, count) {
  const html = ["<body>"];
  const xml = ["<w:document><w:body>"];
  for (let index = 0; index < count; index += 1) {
    const left = (random() * 8).toFixed(3);
    const top = (random() * 18 - 2).toFixed(3);
    const width = (1 + random() * 8).toFixed(3);
    const height = (1 + random() * 6).toFixed(3);
    if (random() < 0.72) {
      html.push(`<p>neo-${index}<span class="sd-abs-pos" style="position:absolute;left:${left}cm;top:${top}cm;width:${width}cm;height:${height}cm"><img name="Float${index}" src="img-${index % 11}.png"></span></p>`);
    } else {
      html.push(`<p>anh-inline-${index}<img name="Shape${index + 1}" src="inline-${index}.png" width="40" height="30"></p>`);
    }
    const relative = random() < 0.5 ? "page" : "paragraph";
    xml.push(`<w:p><w:r><w:drawing><wp:anchor behindDoc="${random() < 0.3 ? 1 : 0}"><wp:positionH relativeFrom="${relative}"/><wp:positionV relativeFrom="${relative}"/><wp:wrapNone/></wp:anchor></w:drawing></w:r></w:p>`);
    if (random() < 0.25) html.push(`<p><span id="Frame${index}" style="position:absolute;left:${left}cm;top:${top}cm;width:${width}cm;height:${height}cm"><p>hop ${index} <span>long nhau</span></p></span></p>`);
  }
  html.push("</body>");
  xml.push("</w:body></w:document>");
  return { html: html.join(""), xml: xml.join("") };
}

function runWithFlag(adapter, value, html, xml) {
  if (value) globalThis.__VNO_OPEN_LEGACY = true;
  else delete globalThis.__VNO_OPEN_LEGACY;
  return adapter._preserveImportedFloatingFrames(html, xml, { margins: { left: 25.4, top: 25.4 } });
}

function runAnchorWithFlag(adapter, value, html) {
  if (value) globalThis.__VNO_OPEN_LEGACY = true;
  else delete globalThis.__VNO_OPEN_LEGACY;
  return adapter._makeFloatingAnchorContainers(html, {
    heightMm: 297,
    margins: { left: 25.4, top: 25.4, bottom: 25.4 },
  });
}

function runGeometryWithFlag(adapter, value, html, xml) {
  if (value) globalThis.__VNO_OPEN_LEGACY = true;
  else delete globalThis.__VNO_OPEN_LEGACY;
  return adapter._applyOoxmlTableColumnGeometry(html, xml);
}

function runMarginsWithFlag(adapter, value, html, xml) {
  if (value) globalThis.__VNO_OPEN_LEGACY = true;
  else delete globalThis.__VNO_OPEN_LEGACY;
  return adapter._applyOoxmlTableCellMargins(html, xml);
}

function runPageBreakWithFlag(adapter, value, html, marker) {
  if (value) globalThis.__VNO_OPEN_LEGACY = true;
  else delete globalThis.__VNO_OPEN_LEGACY;
  return adapter._replaceFirstPageBreakParagraph(html, marker);
}

function runEmptyCellFontsWithFlag(adapter, value, html, xml, styles) {
  if (value) globalThis.__VNO_OPEN_LEGACY = true;
  else delete globalThis.__VNO_OPEN_LEGACY;
  return adapter._applyOoxmlTableCellEmptyParagraphFontSizes(html, xml, styles);
}

export async function runWriterOpenP3bEquivalenceTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const adapter = new WriterAdapter(null);
  const priorFlag = globalThis.__VNO_OPEN_LEGACY;

  try {
    await test("P3b floating-frame output equals Legacy on 600 deterministic fuzz documents", async () => {
      const random = makeRandom(20261004);
      for (let iteration = 0; iteration < 600; iteration += 1) {
        const { html, xml } = fixture(random, 1 + Math.floor(random() * 24));
        const legacy = runWithFlag(adapter, true, html, xml);
        const current = runWithFlag(adapter, false, html, xml);
        assert(current === legacy, `floating mismatch #${iteration}: legacy=${legacy.length}, current=${current.length}`);
      }
    });

    await test("P3b linear floating-frame path stays equal on a large image document", async () => {
      const { html, xml } = fixture(makeRandom(7), 2500);
      const legacy = runWithFlag(adapter, true, html, xml);
      const started = performance.now();
      const current = runWithFlag(adapter, false, html, xml);
      const elapsed = performance.now() - started;
      assert(current === legacy, "large floating document differs from Legacy");
      assert(elapsed < 1500, `linear floating path too slow: ${elapsed.toFixed(1)} ms`);
    });

    await test("P3b floating anchor containers equal Legacy on randomized paragraphs", async () => {
      const random = makeRandom(99);
      for (let iteration = 0; iteration < 500; iteration += 1) {
        const paragraphs = [];
        const count = 1 + Math.floor(random() * 80);
        for (let index = 0; index < count; index += 1) {
          const margin = random() < 0.4 ? ` style="margin-left:${(random() * 3).toFixed(2)}cm"` : "";
          const block = random() < 0.25 ? `<p>hop ${index}</p>` : `anh ${index}`;
          const floating = random() < 0.55
            ? `<span data-vno-float="${random() < 0.5 ? "image" : "textbox"}" data-vno-source-group="${random() < 0.2 ? 1 : 0}" data-vno-relative-h="page" data-vno-wrap="${random() < 0.5 ? "wrapTopAndBottom" : "wrapNone"}" data-vno-top="${(random() * 10).toFixed(2)}" data-vno-height="${(random() * 8).toFixed(2)}" style="position:absolute;left:${(random() * 8).toFixed(2)}cm">${block}</span>`
            : `doan ${index}`;
          paragraphs.push(`<p${margin}>${floating}</p>`);
        }
        const html = paragraphs.join("");
        const legacy = runAnchorWithFlag(adapter, true, html);
        const current = runAnchorWithFlag(adapter, false, html);
        assert(current === legacy, `anchor mismatch #${iteration}: legacy=${legacy.length}, current=${current.length}`);
      }
    });

    await test("P3b cached table ranges equal Legacy on randomized table documents", async () => {
      const random = makeRandom(314159);
      for (let iteration = 0; iteration < 220; iteration += 1) {
        const html = ["<body>"];
        const xml = ["<w:document><w:body>"];
        const count = 1 + Math.floor(random() * 18);
        for (let index = 0; index < count; index += 1) {
          const first = 100 + Math.floor(random() * 1500);
          const second = 100 + Math.floor(random() * 1500);
          html.push(`<table width="100%"><colgroup><col width="50"><col width="50"></colgroup><tr><td>A${index}</td><td>B${index}</td></tr></table>`);
          xml.push(`<w:tbl><w:tblPr><w:tblW w:w="${first + second}" w:type="dxa"/></w:tblPr><w:tblGrid><w:gridCol w:w="${first}"/><w:gridCol w:w="${second}"/></w:tblGrid><w:tr><w:tc><w:p/></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>`);
        }
        html.push("</body>");
        xml.push('<w:sectPr><w:pgSz w:w="11907" w:h="16839"/><w:pgMar w:left="1134" w:right="1134"/></w:sectPr></w:body></w:document>');
        const htmlText = html.join("");
        const xmlText = xml.join("");
        const legacy = runGeometryWithFlag(adapter, true, htmlText, xmlText);
        const current = runGeometryWithFlag(adapter, false, htmlText, xmlText);
        assert(current === legacy, `table geometry mismatch #${iteration}: legacy=${legacy.length}, current=${current.length}`);
      }
    });

    await test("P3b cached table ranges update outer bounds after nested table growth", async () => {
      const html = '<body><table width="100%"><col width="100"><tr><td>outer<table width="50"><col width="50"><tr><td>inner</td></tr></table></td></tr></table></body>';
      const xml = '<w:document><w:body><w:tbl><w:tblGrid><w:gridCol w:w="2400"/></w:tblGrid><w:tr><w:tc><w:p/><w:tbl><w:tblGrid><w:gridCol w:w="1200"/></w:tblGrid><w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl></w:tc></w:tr></w:tbl></w:body></w:document>';
      const legacy = runGeometryWithFlag(adapter, true, html, xml);
      const current = runGeometryWithFlag(adapter, false, html, xml);
      assert(current === legacy, `nested geometry differs: legacy=${legacy}, current=${current}`);
    });

    await test("P3b cached cell-margin table ranges equal Legacy", async () => {
      const random = makeRandom(271828);
      for (let iteration = 0; iteration < 180; iteration += 1) {
        const html = ["<body>"];
        const xml = ["<w:document><w:body>"];
        const count = 1 + Math.floor(random() * 15);
        for (let index = 0; index < count; index += 1) {
          const pad = Math.floor(random() * 300);
          html.push(`<table><tr><td style="color:#123;padding: ${index % 3}px">A${index}</td><td>B${index}</td></tr></table>`);
          xml.push(`<w:tbl><w:tr><w:tc><w:tcPr><w:tcMar><w:top w:w="${pad}"/><w:right w:w="${pad + 1}"/><w:bottom w:w="${pad + 2}"/><w:left w:w="${pad + 3}"/></w:tcMar></w:tcPr><w:p/></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>`);
        }
        html.push("</body>");
        xml.push("</w:body></w:document>");
        const htmlText = html.join("");
        const xmlText = xml.join("");
        const legacy = runMarginsWithFlag(adapter, true, htmlText, xmlText);
        const current = runMarginsWithFlag(adapter, false, htmlText, xmlText);
        assert(current === legacy, `cell margin mismatch #${iteration}: legacy=${legacy.length}, current=${current.length}`);
      }
    });

    await test("P3b page-break paragraph scan equals Legacy on 2000 fuzz documents", async () => {
      const random = makeRandom(1618033);
      const styles = [
        "color:red",
        "page-break-before:always;color:blue",
        "break-before: page; margin:0",
        "PAGE-BREAK-BEFORE : always",
        "break-before:left",
      ];
      for (let iteration = 0; iteration < 2000; iteration += 1) {
        const parts = [];
        const count = 1 + Math.floor(random() * 35);
        for (let index = 0; index < count; index += 1) {
          const style = styles[Math.floor(random() * styles.length)];
          const quote = random() < 0.5 ? '"' : "'";
          const tag = random() < 0.15 ? "P" : "p";
          parts.push(`<${tag} class="p${index}" style=${quote}${style}${quote}>noi ${index}<span>x</span></${tag}>`);
        }
        const html = parts.join("");
        const marker = `<div data-marker="${iteration}"></div>`;
        const legacy = runPageBreakWithFlag(adapter, true, html, marker);
        const current = runPageBreakWithFlag(adapter, false, html, marker);
        assert(JSON.stringify(current) === JSON.stringify(legacy), `page-break mismatch #${iteration}`);
      }
    });

    await test("P3b linear empty-cell font replacements equal Legacy", async () => {
      const random = makeRandom(57721);
      const styles = '<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:styleId="Small"><w:rPr><w:sz w:val="18"/></w:rPr></w:style></w:styles>';
      for (let iteration = 0; iteration < 180; iteration += 1) {
        const html = ["<body>"];
        const xml = ["<w:document><w:body>"];
        const tableCount = 1 + Math.floor(random() * 9);
        for (let table = 0; table < tableCount; table += 1) {
          html.push("<table><tr>");
          xml.push("<w:tbl><w:tr>");
          const cellCount = 1 + Math.floor(random() * 8);
          for (let cell = 0; cell < cellCount; cell += 1) {
            const empty = random() < 0.7;
            const paragraphCount = 1 + Math.floor(random() * 4);
            html.push("<td>");
            xml.push("<w:tc>");
            for (let paragraph = 0; paragraph < paragraphCount; paragraph += 1) {
              const text = empty || paragraph > 0 ? "" : `noi-${iteration}-${table}-${cell}`;
              html.push(`<p style="font-size: 14pt">${text || (random() < 0.5 ? "<br>" : "")}</p>`);
              xml.push(`<w:p><w:pPr><w:pStyle w:val="${random() < 0.5 ? "Small" : "Normal"}"/></w:pPr>${text ? `<w:r><w:t>${text}</w:t></w:r>` : ""}</w:p>`);
            }
            html.push("</td>");
            xml.push("</w:tc>");
          }
          html.push("</tr></table>");
          xml.push("</w:tr></w:tbl>");
        }
        html.push("</body>");
        xml.push("</w:body></w:document>");
        const htmlText = html.join("");
        const xmlText = xml.join("");
        const legacy = runEmptyCellFontsWithFlag(adapter, true, htmlText, xmlText, styles);
        const current = runEmptyCellFontsWithFlag(adapter, false, htmlText, xmlText, styles);
        assert(current === legacy, `empty-cell font mismatch #${iteration}: legacy=${legacy.length}, current=${current.length}`);
      }
    });

  } finally {
    if (priorFlag === undefined) delete globalThis.__VNO_OPEN_LEGACY;
    else globalThis.__VNO_OPEN_LEGACY = priorFlag;
  }
  return results;
}
