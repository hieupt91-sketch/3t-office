import assert from "node:assert/strict";
import {
  normalizeDocumentProperties,
  parseCorePropertiesXml,
  parseAppPropertiesXml,
  parseCustomPropertiesXml,
  documentPropertiesMarker
} from "../../apps/sheet/document-properties.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";

export async function runSheetFileInfoTests() {
  const tests = [];

  // Test 1: normalizeDocumentProperties
  const raw = {
    title: "  Báo cáo tài chính năm 2026  ",
    creator: "Nguyễn Văn A",
    subject: "Kế toán",
    manager: "Trần Thị B",
    company: "Công ty Cổ phần 3T",
    keywords: "tài chính, doanh thu, lợi nhuận",
    description: "Ghi chú chi tiết cho báo cáo",
    contentStatus: "Final"
  };
  const normalized = normalizeDocumentProperties(raw);
  assert.equal(normalized.title, "  Báo cáo tài chính năm 2026  ");
  assert.equal(normalized.creator, "Nguyễn Văn A");
  assert.equal(normalized.subject, "Kế toán");
  assert.equal(normalized.manager, "Trần Thị B");
  assert.equal(normalized.company, "Công ty Cổ phần 3T");
  assert.equal(normalized.keywords, "tài chính, doanh thu, lợi nhuận");
  assert.equal(normalized.description, "Ghi chú chi tiết cho báo cáo");
  assert.equal(normalized.contentStatus, "Final");

  // Limits
  const longNormalized = normalizeDocumentProperties({
    title: "A".repeat(300),
    keywords: "K".repeat(1200),
    description: "D".repeat(5000)
  });
  assert.equal(longNormalized.title.length, 255);
  assert.equal(longNormalized.keywords.length, 1024);
  assert.equal(longNormalized.description.length, 4096);
  assert.equal(longNormalized.creator, "");
  tests.push({ name: "normalizeDocumentProperties validates and bounds all 7 fields + status", pass: true });

  // Test 2: parseCorePropertiesXml
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Doanh thu &amp; Lợi nhuận</dc:title>
  <dc:subject>Kinh doanh</dc:subject>
  <dc:creator>Lê Văn C</dc:creator>
  <cp:keywords>doanh số, bán hàng</cp:keywords>
  <dc:description>Báo cáo quý &lt;1&gt;&#10;Dòng 2</dc:description>
  <cp:contentStatus>Final</cp:contentStatus>
</cp:coreProperties>`;
  const parsedCore = parseCorePropertiesXml(coreXml);
  assert.equal(parsedCore.title, "Doanh thu & Lợi nhuận");
  assert.equal(parsedCore.subject, "Kinh doanh");
  assert.equal(parsedCore.creator, "Lê Văn C");
  assert.equal(parsedCore.keywords, "doanh số, bán hàng");
  assert.equal(parsedCore.description, "Báo cáo quý <1>\nDòng 2");
  assert.equal(parsedCore.contentStatus, "Final");
  tests.push({ name: "parseCorePropertiesXml extracts all core fields with XML decoding", pass: true });

  // Test 3: parseAppPropertiesXml
  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>3T Sheet</Application>
  <Manager>Phạm Hoàng D</Manager>
  <Company>Tập đoàn Công nghệ 3T</Company>
</Properties>`;
  const parsedApp = parseAppPropertiesXml(appXml);
  assert.equal(parsedApp.manager, "Phạm Hoàng D");
  assert.equal(parsedApp.company, "Tập đoàn Công nghệ 3T");
  tests.push({ name: "parseAppPropertiesXml extracts Manager and Company", pass: true });

  // Test 4: parseCustomPropertiesXml
  const customXmlFinal = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="_MarkAsFinal">
    <vt:bool>true</vt:bool>
  </property>
</Properties>`;
  assert.equal(parseCustomPropertiesXml(customXmlFinal).isFinal, true);

  const customXmlNotFinal = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="_MarkAsFinal">
    <vt:bool>false</vt:bool>
  </property>
</Properties>`;
  assert.equal(parseCustomPropertiesXml(customXmlNotFinal).isFinal, false);
  assert.equal(parseCustomPropertiesXml("").isFinal, false);
  tests.push({ name: "parseCustomPropertiesXml detects _MarkAsFinal flag", pass: true });

  // Test 5: documentPropertiesMarker
  const marker = documentPropertiesMarker(raw);
  const hexMatch = marker.match(/<!--vno-document-properties-hex:([0-9a-fA-F]+)-->/);
  assert.ok(hexMatch);
  const decodedJson = Buffer.from(hexMatch[1], "hex").toString("utf8");
  const decoded = JSON.parse(decodedJson);
  assert.equal(decoded.title, raw.title);
  assert.equal(decoded.company, raw.company);
  assert.equal(decoded.contentStatus, "Final");
  tests.push({ name: "documentPropertiesMarker round-trips hex-encoded Vietnamese JSON", pass: true });

  // Test 6: Command definitions
  const propCmd = SHEET_COMMANDS.find(c => c.id === "sheet.file.properties");
  assert.ok(propCmd, "sheet.file.properties must be registered");
  assert.equal(propCmd.category, "file");

  const finalCmd = SHEET_COMMANDS.find(c => c.id === "sheet.file.markAsFinal");
  assert.ok(finalCmd, "sheet.file.markAsFinal must be registered");
  assert.equal(finalCmd.isToggle, true);
  tests.push({ name: "sheet.file.properties and sheet.file.markAsFinal commands registered", pass: true });

  // Test 7: i18n keys and forbidden trademark check
  assert.ok(viStrings.sheetDocumentProperties, "VI strings has sheetDocumentProperties");
  assert.ok(enStrings.sheetDocumentProperties, "EN strings has sheetDocumentProperties");
  const requiredKeys = [
    "title", "author", "subject", "manager", "company", "keywords", "comments",
    "sheets", "markAsFinal", "unmarkFinal", "statusFinal", "statusEditable", "editAnyway"
  ];
  for (const k of requiredKeys) {
    assert.ok(viStrings.sheetDocumentProperties[k], `VI key ${k} must exist`);
    assert.ok(enStrings.sheetDocumentProperties[k], `EN key ${k} must exist`);
  }

  // Trademark check in strings
  const forbiddenRegex = /\b(Microsoft|Word|Excel|PowerPoint)\b/i;
  for (const [key, val] of Object.entries(viStrings.sheetDocumentProperties)) {
    assert.ok(!forbiddenRegex.test(String(val)), `VI key ${key} contains forbidden trademark: ${val}`);
  }
  for (const [key, val] of Object.entries(enStrings.sheetDocumentProperties)) {
    assert.ok(!forbiddenRegex.test(String(val)), `EN key ${key} contains forbidden trademark: ${val}`);
  }
  tests.push({ name: "i18n strings complete with zero forbidden trademarks", pass: true });

  // Test 8: Help entry
  const helpEntry = SHEET_HELP_ENTRIES.find(h => h.id === "sheet.file.markAsFinalHelp");
  assert.ok(helpEntry, "sheet.file.markAsFinalHelp help entry must exist");
  assert.ok(helpEntry.commandIds.includes("sheet.file.markAsFinal"));
  assert.ok(helpEntry.commandIds.includes("sheet.file.properties"));
  assert.ok(helpEntry.steps.length >= 4);
  assert.ok(helpEntry.steps.some(s => s.includes("Tệp")) && helpEntry.steps.some(s => s.includes("Thông tin")));
  // Check trademark in help entry
  const helpText = JSON.stringify(helpEntry);
  assert.ok(!forbiddenRegex.test(helpText), `Help entry contains forbidden trademark: ${helpText}`);
  tests.push({ name: "sheet.file.markAsFinalHelp entry present, concrete, zero trademarks", pass: true });

  return tests;
}
