/**
 * Phase E.1 acceptance: Track Changes FODT -> real soffice DOCX.
 * Assertions follow measured engine behavior in
 * docs/HANDOFF-WRITER-FODT-PHASE-E1-FINDINGS.md.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase E.1 live test");

function adapterWithZones({ body = "" } = {}) {
  const bodyEl = { innerHTML: body };
  const adapter = new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      return null;
    }
  });
  return adapter;
}

function collectRevisions(documentXml) {
  const items = [];
  const re = /<w:(ins|del)\b([^>]*)>([\s\S]*?)<\/w:\1>/gi;
  let match;
  while ((match = re.exec(String(documentXml || "")))) {
    const kind = match[1].toLowerCase();
    const attrs = match[2] || "";
    const inner = match[3] || "";
    const texts = [];
    const textRe = /<w:(?:t|delText)\b[^>]*>([\s\S]*?)<\/w:(?:t|delText)>/gi;
    let textMatch;
    while ((textMatch = textRe.exec(inner))) texts.push(textMatch[1]);
    items.push({
      kind,
      id: (attrs.match(/\bw:id="([^"]*)"/i) || [])[1] || "",
      author: (attrs.match(/\bw:author="([^"]*)"/i) || [])[1] || "",
      date: (attrs.match(/\bw:date="([^"]*)"/i) || [])[1] || "",
      text: texts.join("")
    });
  }
  return items;
}

const importedBody = '<p>Kính gửi Ban Giám đốc. Phòng kế toán đã hoàn thành <del data-vno-change="delete" contenteditable="false" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:16:00" title="Nguyen Van An (2026-09-05T08:16:00)">bản nháp nội bộ </del><ins data-vno-change="insert" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:15:00" title="Nguyen Van An (2026-09-05T08:15:00)">theo yêu cầu khẩn </ins>báo cáo quý III.</p>';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-e1-"));
try {
  const adapter = adapterWithZones({ body: importedBody });
  const fodt = adapter.serializeToFodt();
  const fodtPath = path.join(tempRoot, "track-changes.fodt");
  fs.writeFileSync(fodtPath, fodt, "utf8");
  const docx = convertWithSoffice(fodtPath, "docx", path.join(tempRoot, "docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-docx")
  });
  const names = listZipEntries(docx).map(entry => entry.name);
  assert.ok(names.includes("word/document.xml"), "DOCX must contain word/document.xml");
  assert.ok(names.includes("word/settings.xml"), "DOCX must contain word/settings.xml");
  const documentXml = readZipEntry(docx, "word/document.xml")?.toString("utf8") || "";
  const settingsXml = readZipEntry(docx, "word/settings.xml")?.toString("utf8") || "";
  assert.match(settingsXml, /<w:trackRevisions\b/);
  const revisions = collectRevisions(documentXml);
  const deletion = revisions.find(item => item.kind === "del" && item.text.includes("bản nháp nội bộ"));
  const insertion = revisions.find(item => item.kind === "ins" && item.text.includes("theo yêu cầu khẩn"));
  assert.ok(deletion, `missing w:del with deleted text: ${JSON.stringify(revisions)}`);
  assert.ok(insertion, `missing w:ins with inserted text: ${JSON.stringify(revisions)}`);
  assert.equal(deletion.author, "Nguyen Van An");
  assert.equal(insertion.author, "Nguyen Van An");
  assert.match(deletion.date, /^2026-09-05T08:16:00Z$/);
  assert.match(insertion.date, /^2026-09-05T08:15:00Z$/);
  assert.match(documentXml, /<w:del\b[^>]*w:author="Nguyen Van An"[^>]*>[\s\S]*<w:delText[^>]*>bản nháp nội bộ /);
  assert.match(documentXml, /<w:ins\b[^>]*w:author="Nguyen Van An"[^>]*>[\s\S]*<w:t[^>]*>theo yêu cầu khẩn /);
  assert.equal((documentXml.match(/<w:rPrChange\b/g) || []).length, 0);
  assert.equal((documentXml.match(/<w:moveFrom\b/g) || []).length, 0);

  const parsed = adapterWithZones({ body: "<p>x</p>" });
  parsed.parseFodt(fodt);
  assert.equal(parsed.serializeToFodt(), fodt);

  const sessionAdapter = adapterWithZones({
    body: '<p>Gốc <ins data-vno-change="insert">SESSION_INSERT</ins> <del data-vno-change="delete" contenteditable="false">SESSION_DELETE</del> còn.</p>'
  });
  const sessionFodt = sessionAdapter.serializeToFodt();
  const sessionPath = path.join(tempRoot, "session.fodt");
  fs.writeFileSync(sessionPath, sessionFodt, "utf8");
  const sessionDocx = convertWithSoffice(sessionPath, "docx", path.join(tempRoot, "session-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-session")
  });
  const sessionXml = readZipEntry(sessionDocx, "word/document.xml")?.toString("utf8") || "";
  const sessionRevisions = collectRevisions(sessionXml);
  assert.ok(sessionRevisions.some(item => item.kind === "ins" && item.text.includes("SESSION_INSERT")), `session insert missing: ${JSON.stringify(sessionRevisions)}`);
  assert.ok(sessionRevisions.some(item => item.kind === "del" && item.text.includes("SESSION_DELETE")), `session delete missing: ${JSON.stringify(sessionRevisions)}`);

  console.log("PASS writer-fodt-phase-e1-real-conversion");
  console.log(`E1_DOCX=${docx}`);
  console.log(`E1_SESSION_DOCX=${sessionDocx}`);
  console.log(`E1_FODT=${fodtPath}`);
} finally {
  // Keep temp dir for Word visual check.
}
