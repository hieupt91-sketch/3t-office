import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";


const DOCUMENT_XML = `<w:document><w:body>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Chu cai a</w:t></w:r></w:p>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>La Ma i</w:t></w:r></w:p>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="3"/></w:numPr></w:pPr><w:r><w:t>So 1</w:t></w:r></w:p>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="4"/></w:numPr></w:pPr><w:r><w:t>Gach dau dong</w:t></w:r></w:p>
</w:body></w:document>`;

const NUMBERING_XML = `<w:numbering>
  <w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%1)"/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="3"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>
  <w:abstractNum w:abstractNumId="4"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>
  <w:num w:numId="3"><w:abstractNumId w:val="3"/></w:num>
  <w:num w:numId="4"><w:abstractNumId w:val="4"/></w:num>
</w:numbering>`;


export async function runWriterListNumberingRoundTripTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer DOCX open: lowerLetter/lowerRoman override LibreOffice decimal and keep exact lvlText", () => {
    const adapter = new WriterAdapter(null);
    const libreOfficeHtml = [
      '<ol><li style="list-style-type: decimal;">Chu cai a</li></ol>',
      '<ol><li style="list-style-type: decimal;">La Ma i</li></ol>',
      '<ol><li style="list-style-type: decimal;">So 1</li></ol>',
      '<ul><li style="list-style-type: square;">Gach dau dong</li></ul>'
    ].join("");
    const html = adapter._applyOoxmlListBullets(libreOfficeHtml, DOCUMENT_XML, "", NUMBERING_XML);
    assert.match(html, /Chu cai a/);
    assert.match(html, /list-style-type: lower-alpha;[^>]*data-vno-list-num-fmt="lowerLetter"[^>]*data-vno-list-lvl-text="%1\)"/);
    assert.match(html, /list-style-type: lower-roman;[^>]*data-vno-list-num-fmt="lowerRoman"[^>]*data-vno-list-lvl-text="%1\."/);
    assert.match(html, /list-style-type: decimal;[^>]*data-vno-list-num-fmt="decimal"[^>]*data-vno-list-lvl-text="%1\."/);
    assert.match(html, /list-style-type: square;[^>]*>Gach dau dong/);
  });

  await test("Writer DOCX open-save: DOCX tự tạo giữ a) / i. / 1. và không đổi bullet", () => {
    const run = spawnSync(process.env.PYTHON || "python", ["tests/test_writer_list_numbering_roundtrip.py"], {
      cwd: process.cwd(),
      encoding: "utf8"
    });
    assert.equal(run.status, 0, `${run.stdout || ""}\n${run.stderr || ""}`.trim());
  });

  return results;
}
