/**
 * Paragraph spacing before/after: VN FODT -> real soffice DOCX.
 * Asserts w:spacing twips = pt × 20 on unzipped word/document.xml.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer paragraph-spacing live test");

function createAdapter(innerHTML) {
  const body = { innerHTML };
  return new WriterAdapter({
    innerHTML,
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  });
}

function paragraphBlocks(documentXml) {
  const blocks = [];
  const re = /<w:p\b[\s\S]*?<\/w:p>/g;
  let match;
  while ((match = re.exec(documentXml))) {
    const xml = match[0];
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const spacing = xml.match(/<w:spacing\b[^/]*\/>/)?.[0] || "";
    blocks.push({
      text,
      before: spacing.match(/w:before="([^"]+)"/)?.[1] ?? null,
      after: spacing.match(/w:after="([^"]+)"/)?.[1] ?? null,
      spacing
    });
  }
  return blocks;
}

const html = [
  '<p style="margin-top:12pt;margin-bottom:6pt">SPACING_12_6</p>',
  '<p style="margin-top:0pt;margin-bottom:8pt">SPACING_0_8</p>',
  '<p style="margin-top:18pt;margin-bottom:0pt">SPACING_18_0</p>',
  "<p>SPACING_PLAIN</p>"
].join("");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-para-spacing-"));
try {
  const adapter = createAdapter(html);
  const fodt = adapter.serializeToFodt();
  assert.match(fodt, /fo:margin-top="12pt"/);
  assert.match(fodt, /fo:margin-bottom="6pt"/);
  assert.match(fodt, /fo:margin-top="0pt"/);
  assert.match(fodt, /fo:margin-bottom="8pt"/);
  assert.match(fodt, /fo:margin-top="18pt"/);
  assert.match(fodt, /fo:margin-bottom="0pt"/);

  const parsed = createAdapter("<p>drop</p>");
  parsed.parseFodt(fodt);
  assert.equal(parsed.serializeToFodt(), fodt, "serialize → parse → serialize must be byte-identical");

  const source = path.join(tempRoot, "paragraph-spacing.fodt");
  fs.writeFileSync(source, fodt, "utf8");
  const docx = convertWithSoffice(source, "docx", path.join(tempRoot, "docx"), {
    appKind: "writer",
    profileDir: path.join(tempRoot, "profile-docx")
  });
  const entries = listZipEntries(docx).map((entry) => entry.name);
  assert.ok(entries.includes("word/document.xml"));
  const documentXml = readZipEntry(docx, "word/document.xml").toString("utf8");
  fs.writeFileSync(path.join(tempRoot, "document.xml"), documentXml, "utf8");

  const paras = paragraphBlocks(documentXml);
  const byMarker = Object.fromEntries(
    paras.filter((p) => /SPACING_/.test(p.text)).map((p) => [p.text.match(/SPACING_[A-Z0-9_]+/)[0], p])
  );

  assert.equal(byMarker.SPACING_12_6?.before, "240", "12pt before → 240 twips");
  assert.equal(byMarker.SPACING_12_6?.after, "120", "6pt after → 120 twips");
  assert.equal(byMarker.SPACING_0_8?.before, "0", "0pt before → 0 twips");
  assert.equal(byMarker.SPACING_0_8?.after, "160", "8pt after → 160 twips");
  assert.equal(byMarker.SPACING_18_0?.before, "360", "18pt before → 360 twips");
  assert.equal(byMarker.SPACING_18_0?.after, "0", "0pt after → 0 twips");
  assert.equal(byMarker.SPACING_PLAIN?.before, null, "plain paragraph has no w:before");
  assert.equal(byMarker.SPACING_PLAIN?.after, null, "plain paragraph has no w:after");
  assert.equal(byMarker.SPACING_PLAIN?.spacing, "", "plain paragraph has no w:spacing");

  console.log("PASS  Writer paragraph spacing FODT → DOCX twips (12→240, 6→120, 8→160, 18→360, 0→0, plain omit)");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
