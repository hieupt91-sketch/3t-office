/**
 * Multilevel list: VN FODT -> real soffice DOCX.
 * Asserts unzipped word/numbering.xml w:lvl and document.xml w:numPr/w:ilvl.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer multilevel-list live test");

function createAdapter(innerHTML) {
  const body = { innerHTML };
  return new WriterAdapter({
    innerHTML,
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  });
}

function threeLevelHtml(className) {
  return `<ol class="${className}"><li>L1_ONE<ol class="${className}"><li>L2_ONE<ol class="${className}"><li>L3_ONE</li><li>L3_TWO</li></ol></li><li>L2_TWO</li></ol></li><li>L1_TWO</li></ol>`;
}

function extractAbstractLvls(numberingXml) {
  const abstracts = [];
  const abstractRe = /<w:abstractNum\b([^>]*)>([\s\S]*?)<\/w:abstractNum>/g;
  let match;
  while ((match = abstractRe.exec(numberingXml))) {
    const lvls = [];
    const lvlRe = /<w:lvl\b([^>]*)>([\s\S]*?)<\/w:lvl>/g;
    let lvlMatch;
    while ((lvlMatch = lvlRe.exec(match[2]))) {
      const body = lvlMatch[2];
      lvls.push({
        ilvl: /w:ilvl="([^"]+)"/.exec(lvlMatch[1])?.[1] || "",
        numFmt: /<w:numFmt\b[^>]*w:val="([^"]+)"/.exec(body)?.[1] || "",
        lvlText: /<w:lvlText\b[^>]*w:val="([^"]+)"/.exec(body)?.[1] || ""
      });
    }
    abstracts.push(lvls);
  }
  return abstracts;
}

function extractParaNumPr(documentXml) {
  const paras = [];
  const re = /<w:p\b[\s\S]*?<\/w:p>/g;
  let match;
  while ((match = re.exec(documentXml))) {
    const xml = match[0];
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const numPr = xml.match(/<w:numPr\b[\s\S]*?<\/w:numPr>/)?.[0] || "";
    if (!text) continue;
    paras.push({
      text,
      ilvl: /<w:ilvl\b[^>]*w:val="([^"]+)"/.exec(numPr)?.[1] ?? null,
      numId: /<w:numId\b[^>]*w:val="([^"]+)"/.exec(numPr)?.[1] ?? null
    });
  }
  return paras;
}

function convertList(html, tempRoot, name) {
  const adapter = createAdapter(html);
  const fodt = adapter.serializeToFodt();
  const parsed = createAdapter("<p>drop</p>");
  parsed.parseFodt(fodt);
  assert.equal(parsed.serializeToFodt(), fodt, `${name}: serialize → parse → serialize must be byte-identical`);
  const source = path.join(tempRoot, `${name}.fodt`);
  fs.writeFileSync(source, fodt, "utf8");
  const docx = convertWithSoffice(source, "docx", path.join(tempRoot, `${name}-docx`), {
    appKind: "writer",
    profileDir: path.join(tempRoot, `${name}-profile`)
  });
  const entries = listZipEntries(docx).map((entry) => entry.name);
  assert.ok(entries.includes("word/numbering.xml"), `${name}: thiếu word/numbering.xml`);
  const numberingXml = readZipEntry(docx, "word/numbering.xml").toString("utf8");
  const documentXml = readZipEntry(docx, "word/document.xml").toString("utf8");
  fs.writeFileSync(path.join(tempRoot, `${name}-numbering.xml`), numberingXml, "utf8");
  fs.writeFileSync(path.join(tempRoot, `${name}-document.xml`), documentXml, "utf8");
  return { fodt, numberingXml, documentXml, abstracts: extractAbstractLvls(numberingXml), paras: extractParaNumPr(documentXml) };
}

function assertThreeLevelParas(paras, name) {
  const byMarker = Object.fromEntries(paras.filter((p) => /L[123]_/.test(p.text)).map((p) => [p.text.match(/L[123]_[A-Z]+/)[0], p]));
  assert.equal(byMarker.L1_ONE?.ilvl, "0", `${name} L1_ONE ilvl 0`);
  assert.equal(byMarker.L2_ONE?.ilvl, "1", `${name} L2_ONE ilvl 1`);
  assert.equal(byMarker.L3_ONE?.ilvl, "2", `${name} L3_ONE ilvl 2`);
  assert.equal(byMarker.L3_TWO?.ilvl, "2", `${name} L3_TWO ilvl 2`);
  assert.equal(byMarker.L2_TWO?.ilvl, "1", `${name} L2_TWO ilvl 1`);
  assert.equal(byMarker.L1_TWO?.ilvl, "0", `${name} L1_TWO ilvl 0`);
  const numIds = [...new Set(Object.values(byMarker).map((p) => p.numId))];
  assert.equal(numIds.length, 1, `${name}: mọi cấp cùng w:numId`);
}

function numberedAbstract(abstracts) {
  return abstracts.find((lvls) => lvls[0]?.numFmt && lvls[0].numFmt !== "none") || abstracts[0];
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-multilevel-"));
try {
  const decimal = convertList(threeLevelHtml("vno-ml-decimal"), tempRoot, "decimal");
  assert.match(decimal.fodt, /text:display-levels="2"/);
  assert.match(decimal.fodt, /text:display-levels="3"/);
  const decimalLvls = numberedAbstract(decimal.abstracts);
  assert.equal(decimalLvls[0].lvlText, "%1.");
  assert.equal(decimalLvls[1].lvlText, "%1.%2.");
  assert.equal(decimalLvls[2].lvlText, "%1.%2.%3.");
  assert.equal(decimalLvls[0].numFmt, "decimal");
  assertThreeLevelParas(decimal.paras, "decimal");

  const letter = convertList(threeLevelHtml("vno-ml-letter"), tempRoot, "letter");
  const letterLvls = numberedAbstract(letter.abstracts);
  assert.equal(letterLvls[0].numFmt, "decimal");
  assert.equal(letterLvls[1].numFmt, "lowerLetter");
  assert.equal(letterLvls[2].numFmt, "lowerRoman");
  assert.equal(letterLvls[0].lvlText, "%1.");
  assert.equal(letterLvls[1].lvlText, "%2.");
  assert.equal(letterLvls[2].lvlText, "%3.");
  assertThreeLevelParas(letter.paras, "letter");

  const nd30 = convertList(threeLevelHtml("vno-ml-nd30"), tempRoot, "nd30");
  const nd30Lvls = numberedAbstract(nd30.abstracts);
  assert.equal(nd30Lvls[0].lvlText, "Điều %1.");
  assert.equal(nd30Lvls[1].lvlText, "%2.");
  assert.equal(nd30Lvls[2].lvlText, "%3)");
  assert.equal(nd30Lvls[2].numFmt, "lowerLetter");
  assertThreeLevelParas(nd30.paras, "nd30");

  console.log("PASS  Writer multilevel FODT → DOCX (decimal %1.%2.%3., letter 1/a/i, NĐ 30 Điều, ilvl 0/1/2 cùng numId)");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
