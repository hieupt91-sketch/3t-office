/**
 * Unit tests asserting Microsoft Word 2016 COM Oracle measurements for WordprocessingML list numbering.
 * Brief: BRIEF-AGY-Q83-NUMBERING-ORACLE.md
 * 
 * Tests verify:
 * - Doubt 1: Word ignores `w:start` inside `w:lvl` of `w:lvlOverride` ([MS-OI29500] §17.9).
 * - `w:startOverride` inside `w:lvlOverride` is honored.
 * - Doubt 2: Word ignores `w:lvlRestart` inside `w:lvl` of `w:lvlOverride`.
 * - `w:lvlRestart` inside `w:abstractNum/w:lvl` is honored.
 * - Multiple `w:num` sharing an `abstractNumId` share counters, and `w:startOverride` updates the shared counter.
 * - Jumping to deep level implicitly initializes missing intermediate levels at their start value.
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function check(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runWriterNumberingOracleQ83Tests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const adapter = new WriterAdapter(null);

  test("Q83 Case 1: w:startOverride inside w:lvlOverride sets starting counter (Word Oracle: 5, 6, 7)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 3</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="5"/></w:lvlOverride></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "5,6,7", `Expected 5,6,7 but got: ${values}`);
  });

  test("Q83 Case 2 (Doubt 1): Word ignores w:start inside w:lvlOverride/w:lvl (Word Oracle: 1, 2, 3)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Doan 1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Doan 2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Doan 3</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:lvl w:ilvl="0"><w:start w:val="10"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:lvlOverride></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,2,3", `Expected 1,2,3 (Word ignores override start) but got: ${values}`);
  });

  test("Q83 Case 3 (Doubt 2): Word ignores w:lvlRestart inside w:lvlOverride/w:lvl (Word Oracle: 1, 1, 2, 2, 1)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Phan 1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 1a</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 1b</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Phan 2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 2a</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1">'
      + '  <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>'
      + '  <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/></w:lvl>'
      + '</w:abstractNum>'
      + '<w:num w:numId="1">'
      + '  <w:abstractNumId w:val="1"/>'
      + '  <w:lvlOverride w:ilvl="1"><w:lvl w:ilvl="1"><w:start w:val="1"/><w:lvlRestart w:val="0"/></w:lvl></w:lvlOverride>'
      + '</w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,1,2,2,1", `Expected 1,1,2,2,1 (Word ignores override lvlRestart=0) but got: ${values}`);
  });

  test("Q83 Case 3b: w:lvlRestart=0 in w:abstractNum prevents restart (Word Oracle: 1, 1, 2, 2, 3)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Phan 1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 1a</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 1b</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Phan 2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Muc 2c</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1">'
      + '  <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>'
      + '  <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlRestart w:val="0"/><w:lvlText w:val="%2)"/></w:lvl>'
      + '</w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,1,2,2,3", `Expected 1,1,2,2,3 but got: ${values}`);
  });

  test("Q83 Case 4: Word ignores w:lvlRestart=1 inside w:lvlOverride/w:lvl (Word Oracle: 1, 1, 1, 2, 1, 2, 1, 1)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L0.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L0.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.3</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.3</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1">'
      + '  <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>'
      + '  <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/></w:lvl>'
      + '  <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/></w:lvl>'
      + '</w:abstractNum>'
      + '<w:num w:numId="1">'
      + '  <w:abstractNumId w:val="1"/>'
      + '  <w:lvlOverride w:ilvl="2"><w:lvl w:ilvl="2"><w:start w:val="1"/><w:lvlRestart w:val="1"/></w:lvl></w:lvlOverride>'
      + '</w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,1,1,2,1,2,1,1", `Expected 1,1,1,2,1,2,1,1 but got: ${values}`);
  });

  test("Q83 Case 4b: w:lvlRestart=1 in w:abstractNum keeps level 2 across level 1 (Word Oracle: 1, 1, 1, 2, 2, 2, 1, 1)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L0.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L0.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.3</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.3</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1">'
      + '  <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>'
      + '  <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/></w:lvl>'
      + '  <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlRestart w:val="1"/><w:lvlText w:val="%3."/></w:lvl>'
      + '</w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,1,1,2,2,2,1,1", `Expected 1,1,1,2,2,2,1,1 but got: ${values}`);
  });

  test("Q83 Case 5: multiple numIds sharing same abstractNum share counter sequence (Word Oracle: 1, 2, 3, 4, 5)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>A1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>A2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>B1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>B2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>A3</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>'
      + '<w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,2,3,4,5", `Expected 1,2,3,4,5 but got: ${values}`);
  });

  test("Q83 Case 5b: multiple numIds with startOverride updates shared counter (Word Oracle: 1, 2, 10, 11, 12)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>A1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>A2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>B1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr><w:r><w:t>B2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>A3</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl></w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>'
      + '<w:num w:numId="2"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="10"/></w:lvlOverride></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,2,10,11,12", `Expected 1,2,10,11,12 but got: ${values}`);
  });

  test("Q83 Case 6: deep level implicitly initializes missing intermediate level (Word Oracle: 1, 1, 1, 2, 2, 1, 2, 1)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L0.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.a</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.i</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.ii</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L0.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.i after L0</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L1.b after L2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="2"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>L2.i after L1</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1">'
      + '  <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>'
      + '  <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/></w:lvl>'
      + '  <w:lvl w:ilvl="2"><w:start w:val="1"/><w:numFmt w:val="lowerRoman"/><w:lvlText w:val="%3."/></w:lvl>'
      + '</w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,1,1,2,2,1,2,1", `Expected 1,1,1,2,2,1,2,1 but got: ${values}`);
  });

  test("Q83 Case 7: control case without overrides (Word Oracle: 1, 1, 2, 2, 1)", () => {
    const doc = '<w:document><w:body>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>D0.1</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>D1.a</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>D1.b</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>D0.2</w:t></w:r></w:p>'
      + '<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>D1.a</w:t></w:r></w:p>'
      + '</w:body></w:document>';
    const numXml = '<w:numbering>'
      + '<w:abstractNum w:abstractNumId="1">'
      + '  <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>'
      + '  <w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/></w:lvl>'
      + '</w:abstractNum>'
      + '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>'
      + '</w:numbering>';
    const items = adapter._ooxmlListParagraphs(doc, "", numXml);
    const values = items.map(i => i.value).join(",");
    check(values === "1,1,2,2,1", `Expected 1,1,2,2,1 but got: ${values}`);
  });

  return results;
}
