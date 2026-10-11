/**
 * Probe: ODF style:rotation-angle / direction → LibreOffice XLSX textRotation.
 * Measurement only — not part of the unit suite. Run before implementing
 * sheet.cell.orientation so mapping is measured, not guessed.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) {
  console.error("LibreOffice soffice.exe not found");
  process.exit(1);
}
console.log("soffice", soffice);

function fodsFor(stylesInner, cellStyleName = "ceRot") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 xmlns:loext="urn:org:documentfoundation:names:experimental:office:xmlns:loext:1.0"
                 office:version="1.3"
                 office:mimetype="application/vnd.oasis.opendocument.spreadsheet">
  <office:automatic-styles>
    <style:style style:name="${cellStyleName}" style:family="table-cell">
      <style:table-cell-properties ${stylesInner}/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="RotationProbe">
        <table:table-row>
          <table:table-cell table:style-name="${cellStyleName}" office:value-type="string" office:string-value="XOAY">
            <text:p>XOAY</text:p>
          </table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document>`;
}

function extractTextRotation(stylesXml) {
  const compact = String(stylesXml || "").replace(/\s+/g, " ");
  const xfs = [...compact.matchAll(/<(?:[\w]+:)?xf\b([^>]*)\/?>/gi)].map(m => m[1].trim());
  const rotations = [...compact.matchAll(/\btextRotation\s*=\s*"([^"]+)"/gi)].map(m => m[1]);
  const alignmentBlocks = [...compact.matchAll(/<(?:[\w]+:)?alignment\b([^>]*)\/?>/gi)].map(m => m[0]);
  return { xfsCount: xfs.length, rotations, alignmentBlocks, snippet: compact.slice(0, 1800) };
}

function extractFodsRotation(fodsXml) {
  const compact = String(fodsXml || "").replace(/\s+/g, " ");
  const angles = [...compact.matchAll(/style:rotation-angle\s*=\s*"([^"]+)"/gi)].map(m => m[1]);
  const directions = [...compact.matchAll(/style:direction\s*=\s*"([^"]+)"/gi)].map(m => m[1]);
  const glyphs = [...compact.matchAll(/style:glyph-orientation-vertical\s*=\s*"([^"]+)"/gi)].map(m => m[1]);
  const cellProps = [...compact.matchAll(/<style:table-cell-properties\b[^>]*>/gi)].map(m => m[0]);
  return { angles, directions, glyphs, cellProps };
}

const cases = [
  { id: "angle-0", attrs: 'style:rotation-angle="0"' },
  { id: "angle-45", attrs: 'style:rotation-angle="45"' },
  { id: "angle-90", attrs: 'style:rotation-angle="90"' },
  { id: "angle-minus45", attrs: 'style:rotation-angle="-45"' },
  { id: "angle-minus90", attrs: 'style:rotation-angle="-90"' },
  { id: "angle-315", attrs: 'style:rotation-angle="315"' },
  { id: "angle-270", attrs: 'style:rotation-angle="270"' },
  { id: "angle-45deg", attrs: 'style:rotation-angle="45deg"' },
  { id: "dir-ttb", attrs: 'style:direction="ttb"' },
  { id: "dir-ttb-glyph0", attrs: 'style:direction="ttb" style:glyph-orientation-vertical="0"' },
  { id: "dir-ttb-glyphauto", attrs: 'style:direction="ttb" style:glyph-orientation-vertical="auto"' },
  { id: "angle-0-dir-ttb", attrs: 'style:rotation-angle="0" style:direction="ttb"' }
];

const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-sheet-rotation-"));
const profileDir = path.join(root, "lo-profile");
console.log("temp", root);

const results = [];
for (const item of cases) {
  const dir = path.join(root, item.id);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, `${item.id}.fods`);
  fs.writeFileSync(source, fodsFor(item.attrs), "utf8");
  const row = { id: item.id, attrs: item.attrs };
  try {
    const xlsx = convertWithSoffice(source, "xlsx", path.join(dir, "xlsx"), { profileDir, timeoutMs: 30000 });
    row.xlsxBytes = fs.statSync(xlsx).size;
    row.zip = listZipEntries(xlsx).map(e => e.name);
    const stylesXml = readZipEntry(xlsx, "xl/styles.xml")?.toString("utf8") || "";
    fs.writeFileSync(path.join(dir, "styles.xml"), stylesXml, "utf8");
    const sheetXml = readZipEntry(xlsx, "xl/worksheets/sheet1.xml")?.toString("utf8") || "";
    fs.writeFileSync(path.join(dir, "sheet1.xml"), sheetXml, "utf8");
    row.styles = extractTextRotation(stylesXml);
    row.sheetHasS = /s="\d+"/.test(sheetXml);
    row.sheetCellSnippet = (sheetXml.match(/<(?:[\w]+:)?c\b[^>]*>/i)?.[0] || "").replace(/\s+/g, " ");
    try {
      const round = convertWithSoffice(xlsx, "fods", path.join(dir, "fods"), { profileDir, timeoutMs: 30000 });
      const roundXml = fs.readFileSync(round, "utf8");
      fs.writeFileSync(path.join(dir, "roundtrip.fods"), roundXml, "utf8");
      row.roundtrip = extractFodsRotation(roundXml);
    } catch (err) {
      row.roundtripError = String(err.message || err);
    }
  } catch (err) {
    row.error = String(err.message || err);
  }
  results.push(row);
  console.log("\n========", item.id, "========");
  console.log("attrs", item.attrs);
  if (row.error) {
    console.log("ERROR", row.error);
    continue;
  }
  console.log("xlsxBytes", row.xlsxBytes);
  console.log("textRotation", JSON.stringify(row.styles.rotations));
  console.log("alignmentBlocks", JSON.stringify(row.styles.alignmentBlocks));
  console.log("sheetCell", row.sheetCellSnippet);
  console.log("roundtrip angles", JSON.stringify(row.roundtrip?.angles));
  console.log("roundtrip direction", JSON.stringify(row.roundtrip?.directions));
  console.log("roundtrip glyph", JSON.stringify(row.roundtrip?.glyphs));
  console.log("roundtrip cellProps", JSON.stringify(row.roundtrip?.cellProps));
}

const summaryPath = path.join(root, "summary.json");
fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2), "utf8");
console.log("\nSUMMARY", summaryPath);
console.log("KEEP", root);
