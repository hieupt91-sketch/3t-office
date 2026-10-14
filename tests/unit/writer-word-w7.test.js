import assert from "node:assert/strict";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import {
  normalizeDocumentProperties,
  parseCorePropertiesXml
} from "../../apps/writer/document-properties.js";

function getNested(obj, path) {
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

export async function runWriterWordW7Tests() {
  const results = [];

  // 1. Kiểm tra đăng ký lệnh trong WRITER_COMMANDS
  const requiredCommands = [
    "writer.trackChanges.showMarkup",
    "writer.trackChanges.balloons",
    "writer.trackChanges.balloonsMode",
    "writer.trackChanges.balloonsRevisions",
    "writer.trackChanges.balloonsInline",
    "writer.trackChanges.balloonsCommentsOnly",
    "writer.file.markAsFinal"
  ];
  for (const cmdId of requiredCommands) {
    const cmd = WRITER_COMMANDS.find(c => c.id === cmdId);
    assert.ok(cmd, `Command ${cmdId} must be registered in WRITER_COMMANDS`);
    assert.ok(cmd.label, `Command ${cmdId} must have a label`);
    assert.ok(cmd.labelKey, `Command ${cmdId} must have a labelKey`);
  }
  results.push({ name: "W7 commands registered in WRITER_COMMANDS", pass: true });

  // 2. Kiểm tra chuỗi i18n VI và EN
  const requiredKeys = [
    "writerTrackChanges.showMarkup",
    "writerTrackChanges.balloons",
    "writerTrackChanges.balloonsRevisions",
    "writerTrackChanges.balloonsInline",
    "writerTrackChanges.balloonsCommentsOnly",
    "writerDocumentProperties.markAsFinal",
    "writerDocumentProperties.unmarkFinal",
    "writerDocumentProperties.statusFinal",
    "writerDocumentProperties.statusEditable",
    "writerDocumentProperties.finalBanner",
    "writerDocumentProperties.editAnyway",
    "writerDocumentProperties.size",
    "writerDocumentProperties.pages",
    "writerDocumentProperties.words",
    "writerDocumentProperties.modified",
    "writerDocumentProperties.created"
  ];
  const forbiddenRegex = /\b(Microsoft|Word|Excel|PowerPoint)\b/i;

  for (const key of requiredKeys) {
    const viVal = getNested(viStrings, key);
    const enVal = getNested(enStrings, key);
    assert.ok(viVal, `String ${key} must exist in viStrings`);
    assert.ok(enVal, `String ${key} must exist in enStrings`);
    assert.ok(!forbiddenRegex.test(viVal), `Vietnamese string for ${key} must not contain forbidden trademarks: ${viVal}`);
  }
  results.push({ name: "W7 i18n VI and EN strings exist without forbidden trademarks", pass: true });

  // 3. Kiểm tra mục Trợ giúp / Hướng dẫn sử dụng
  const requiredHelp = [
    "writer.trackChanges.balloonsHelp",
    "writer.file.markAsFinalHelp"
  ];
  for (const helpId of requiredHelp) {
    const entry = WRITER_HELP_ENTRIES.find(h => h.id === helpId);
    assert.ok(entry, `Help entry ${helpId} must be registered in WRITER_HELP_ENTRIES`);
    const summary = entry.summary || entry.description;
    assert.ok(summary && summary.length > 20, `Help entry ${helpId} must have a summary/description`);
    assert.ok(Array.isArray(entry.steps) && entry.steps.length >= 2, `Help entry ${helpId} must have concrete steps`);
    assert.ok(!forbiddenRegex.test(entry.title), `Help title ${helpId} must not have forbidden terms`);
    assert.ok(!forbiddenRegex.test(summary), `Help description ${helpId} must not have forbidden terms`);
    for (const step of entry.steps) {
      assert.ok(!forbiddenRegex.test(step), `Help step in ${helpId} must not have forbidden terms: ${step}`);
    }
  }
  results.push({ name: "W7 Vietnamese in-app Help entries exist with clear steps and no forbidden trademarks", pass: true });

  // 4. Kiểm tra chuẩn hóa & đọc thuộc tính contentStatus trong document-properties
  const xmlWithFinal = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>Báo cáo cuối cùng</dc:title>
  <dc:creator>Ban Giám đốc</dc:creator>
  <cp:contentStatus>Final</cp:contentStatus>
</cp:coreProperties>`;
  const parsed = parseCorePropertiesXml(xmlWithFinal);
  assert.equal(parsed.contentStatus, "Final");
  assert.equal(parsed.title, "Báo cáo cuối cùng");
  assert.equal(parsed.creator, "Ban Giám đốc");

  const normalized = normalizeDocumentProperties({
    title: "Văn bản thử nghiệm",
    contentStatus: "Final  "
  });
  assert.equal(normalized.contentStatus, "Final");

  const cleared = normalizeDocumentProperties({
    title: "Văn bản mở",
    contentStatus: ""
  });
  assert.equal(cleared.contentStatus, "");
  results.push({ name: "Document properties parses and normalizes contentStatus Final", pass: true });

  return results;
}
