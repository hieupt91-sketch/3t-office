/**
 * Follow-up: drawings MUST live inside text:p (sibling-of-paragraph was dropped).
 * Probe as-char vs paragraph-anchor for every Writer UI shape type.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assertSoffice();
function assertSoffice() {
  if (!findSoffice()) throw new Error("soffice not found");
}

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-b2-shapes-"));
console.log(`PROBE_ROOT=${outRoot}`);

const graphicStyles = `
<style:style style:name="grRect" style:family="graphic">
  <style:graphic-properties draw:fill="solid" draw:fill-color="#2563eb" draw:stroke="solid" svg:stroke-color="#1d4ed8" svg:stroke-width="0.053cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grEllipse" style:family="graphic">
  <style:graphic-properties draw:fill="solid" draw:fill-color="#0ea5e9" draw:stroke="solid" svg:stroke-color="#0284c7" svg:stroke-width="0.053cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grLine" style:family="graphic">
  <style:graphic-properties draw:fill="none" draw:stroke="solid" svg:stroke-color="#0f172a" svg:stroke-width="0.079cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grArrow" style:family="graphic">
  <style:graphic-properties draw:fill="solid" draw:fill-color="#f59e0b" draw:stroke="solid" svg:stroke-color="#d97706" svg:stroke-width="0.053cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grTextBox" style:family="graphic">
  <style:graphic-properties draw:fill="none" draw:stroke="solid" svg:stroke-color="#2563eb" svg:stroke-width="0.053cm" fo:padding-top="0.1cm" fo:padding-bottom="0.1cm" fo:padding-left="0.15cm" fo:padding-right="0.15cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>`;

function fodtShell(bodyInner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>${graphicStyles}</office:automatic-styles>
<office:body><office:text>${bodyInner}</office:text></office:body>
</office:document>`;
}

const shapes = {
  rect: `<draw:rect draw:style-name="grRect" draw:name="Rect1" ANCHOR svg:width="3.704cm" svg:height="2.117cm"><text:p/></draw:rect>`,
  "round-rect": `<draw:rect draw:style-name="grRect" draw:name="Round1" ANCHOR svg:width="3.704cm" svg:height="2.117cm" draw:corner-radius="0.3cm"><text:p/></draw:rect>`,
  ellipse: `<draw:ellipse draw:style-name="grEllipse" draw:name="Ellipse1" ANCHOR svg:width="2.91cm" svg:height="2.91cm"><text:p/></draw:ellipse>`,
  line: `<draw:line draw:style-name="grLine" draw:name="Line1" ANCHOR svg:x1="0cm" svg:y1="0cm" svg:x2="4.233cm" svg:y2="0cm"><text:p/></draw:line>`,
  arrow: `<draw:custom-shape draw:style-name="grArrow" draw:name="Arrow1" ANCHOR svg:width="3.704cm" svg:height="1.852cm"><text:p/><draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:type="right-arrow" draw:enhanced-path="M 0 7640 L 13955 7640 13955 3890 21600 10800 13955 17710 13955 13960 0 13960 Z"/></draw:custom-shape>`,
  textbox: `<draw:frame draw:style-name="grTextBox" draw:name="TextBox1" ANCHOR svg:width="5.821cm" svg:height="2.117cm"><draw:text-box><text:p>HOP_VAN_BAN</text:p></draw:text-box></draw:frame>`
};

const anchors = {
  "as-char": `text:anchor-type="as-char"`,
  "para-in-p": `text:anchor-type="paragraph" svg:x="1.905cm" svg:y="0.5cm"`
};

function snippetDrawings(xml) {
  const source = String(xml || "");
  const matches = [];
  const re = /<draw:(frame|rect|ellipse|line|custom-shape|circle)\b[^>]*(?:\/>|>[\s\S]*?<\/draw:\1>)/gi;
  let match;
  while ((match = re.exec(source)) !== null) matches.push(match[0].replace(/\s+/g, " ").slice(0, 450));
  return matches;
}

function dumpDocx(docxPath) {
  const documentXml = readZipEntry(docxPath, "word/document.xml")?.toString("utf8") || "";
  return {
    drawing: (documentXml.match(/<w:drawing>/g) || []).length,
    wps: (documentXml.match(/<wps:wsp\b/g) || []).length,
    prstGeom: [...documentXml.matchAll(/prst="([^"]+)"/g)].map((m) => m[1]),
    txbx: (documentXml.match(/<w:txbxContent\b|<wps:txbx\b|<v:textbox\b/g) || []).length,
    corner: /cornerRadius|adj="val"|roundRect|roundrect/i.test(documentXml),
    hasHop: documentXml.includes("HOP_VAN_BAN")
  };
}

function convertSafe(source, ext, label) {
  const dir = path.join(outRoot, `${label}-${ext}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const dest = convertWithSoffice(source, ext, dir, {
      appKind: "writer",
      profileDir: path.join(dir, "profile"),
      timeoutMs: 90000
    });
    return { ok: true, dest, size: fs.statSync(dest).size };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

for (const [shapeId, template] of Object.entries(shapes)) {
  for (const [anchorId, anchorAttr] of Object.entries(anchors)) {
    const drawXml = template.replace("ANCHOR", anchorAttr);
    const body = `<text:p>BEFORE_${shapeId} ${drawXml} AFTER_${shapeId}</text:p>`;
    const id = `${shapeId}__${anchorId}`;
    const source = path.join(outRoot, `${id}.fodt`);
    fs.writeFileSync(source, fodtShell(body), "utf8");
    const docx = convertSafe(source, "docx", id);
    const fodt = convertSafe(source, "fodt", `${id}-round`);
    console.log(`SHAPE ${id} docx=${docx.ok ? "OK" : "FAIL " + docx.error} fodt=${fodt.ok ? "OK" : "FAIL"}`);
    if (docx.ok) console.log(`  DOCX ${JSON.stringify(dumpDocx(docx.dest))}`);
    if (fodt.ok) {
      const xml = fs.readFileSync(fodt.dest, "utf8");
      console.log(`  CANON_DRAW ${JSON.stringify(snippetDrawings(xml))}`);
      console.log(`  CANON_ANCHOR ${JSON.stringify(xml.match(/text:anchor-type="[^"]+"/g))}`);
      const corner = xml.match(/draw:corner-radius="[^"]+"/);
      const drawType = xml.match(/draw:type="[^"]+"/);
      if (corner) console.log(`  CORNER ${corner[0]}`);
      if (drawType) console.log(`  DRAW_TYPE ${drawType[0]}`);
    }
  }
}
console.log("PROBE_DONE");
