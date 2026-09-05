/**
 * Executable real-soffice assertions for confirmed Writer export defects that
 * cannot be repaired inside the current HTML-only adapter boundary.
 *
 * This probe is EXPECTED TO FAIL until the export pipeline can emit/patch the
 * required native document structures. It runs every assertion and reports
 * all defects rather than stopping at the first one.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { buildWriterWordArtHtml } from "../../apps/writer/insert-dialogs.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required");

function adapterFor(html) {
  const body = { innerHTML: html, innerText: "x", contains: () => true, querySelectorAll: () => [], querySelector: () => null, classList: { add() {}, remove() {}, toggle() {} }, style: {} };
  const empty = { innerHTML: "", innerText: "" };
  return new WriterAdapter({
    style: { setProperty() {} }, innerHTML: html,
    querySelector(selector) { if (selector === ".vno-writer-body") return body; if (selector === ".vno-writer-header" || selector === ".vno-writer-footer") return empty; return null; },
    closest() { return { style: { setProperty() {} } }; }, addEventListener() {}, removeEventListener() {}
  });
}

function convert(temp, name, adapter) {
  const source = path.join(temp, `${name}.html`);
  fs.writeFileSync(source, `<!doctype html><meta charset="utf-8"><body>${adapter._contentForExport()}</body>`, "utf8");
  return convertWithSoffice(source, "docx", path.join(temp, `${name}-out`), { appKind: "writer", profileDir: path.join(temp, `${name}-profile`) });
}

function xml(docx, entry) { return readZipEntry(docx, entry)?.toString("utf8") || ""; }
const failures = [];
function check(name, assertion) {
  try { assertion(); console.log(`PASS ${name}`); }
  catch (error) { failures.push(`${name}: ${error.message}`); console.error(`FAIL ${name}: ${error.message}`); }
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-known-export-limits-"));
try {
  const decorations = adapterFor("<p>BODY</p>");
  decorations.watermark = { text: "WATERMARK_NATIVE", color: "#dc2626", opacity: 0.2, angle: 45, fontSize: 72 };
  decorations.pageBorder = { enabled: true, style: "double", width: 3, color: "#0f4c81" };
  const decorationDocx = convert(temp, "decorations", decorations);
  const decorationXml = xml(decorationDocx, "word/document.xml");
  check("Page Border", () => assert.match(decorationXml, /<w:pgBorders\b/, "real DOCX has no w:pgBorders; @page border was ignored"));
  check("Watermark", () => assert.ok(/<wp:anchor\b|<v:shape\b/.test(decorationXml), "watermark was flattened into an ordinary body paragraph (no anchored drawing/shape)"));

  const columnBreak = adapterFor('<p>BEFORE</p><p data-vno-column-break="true" style="break-before:column">&nbsp;</p><p>AFTER</p>');
  columnBreak.columns = { count: 2, gap: 10, rule: false };
  const columnDocx = convert(temp, "column-break", columnBreak);
  check("Column Break", () => assert.match(xml(columnDocx, "word/document.xml"), /<w:br\b[^>]*w:type="column"/, "break-before:column on <p> was ignored"));

  const notes = adapterFor('<p>TEXT<sup data-vno-footnote-ref="fn-1">1</sup><sup data-vno-endnote-ref="en-1">i</sup></p><div data-vno-footnotes="true"><div class="vno-footnote-item"><span>1</span><span>FOOTNOTE_NATIVE</span></div></div><div data-vno-endnotes="true"><div class="vno-endnote-item"><span>i</span><span>ENDNOTE_NATIVE</span></div></div>');
  const notesDocx = convert(temp, "notes-native", notes);
  const noteEntries = listZipEntries(notesDocx).map((entry) => entry.name);
  check("Footnote native semantics", () => assert.ok(noteEntries.includes("word/footnotes.xml") && /<w:footnoteReference\b/.test(xml(notesDocx, "word/document.xml")), "footnote exports as static body text, not a native footnote"));
  check("Endnote native semantics", () => assert.ok(noteEntries.includes("word/endnotes.xml") && /<w:endnoteReference\b/.test(xml(notesDocx, "word/document.xml")), "endnote exports as static body text, not a native endnote"));

  const wordArt = adapterFor(`<p>${buildWriterWordArtHtml("WORDART_EFFECT", { presetId: "ocean-gradient" })}</p>`);
  const wordArtDocx = convert(temp, "wordart-effect", wordArt);
  check("WordArt effects", () => assert.match(xml(wordArtDocx, "word/document.xml"), /<a:gradFill\b|<wps:wordArt\b|<w14:textOutline\b/, "gradient/stroke WordArt CSS was flattened to ordinary text"));

  assert.fail(`Known real-export limitations remain (${failures.length}):\n- ${failures.join("\n- ")}`);
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
