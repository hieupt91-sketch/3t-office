import { webcrypto } from "node:crypto";
import {
  buildParagraphComparison,
  createDocumentProtection,
  documentProtectionMetadataComment,
  parseDocumentProtection,
  verifyDocumentProtection
} from "../../apps/writer/document-review.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

export async function runWriterDocumentReviewTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Writer Review: so sánh theo đoạn tạo đúng insertion/deletion", () => {
    const compared = buildParagraphComparison(
      "<p>Giữ nguyên</p><p>Nội dung cũ</p>",
      "<p>Giữ nguyên</p><p>Nội dung mới</p>",
      { author: "Kiểm thử", date: "2026-10-14T00:00:00Z" }
    );
    if (!compared.changed || compared.insertions !== 1 || compared.deletions !== 1) {
      throw new Error(JSON.stringify(compared));
    }
    if (!compared.html.includes("<del") || !compared.html.includes("Nội dung cũ") || !compared.html.includes("<ins") || !compared.html.includes("Nội dung mới")) {
      throw new Error(`Thiếu marker chèn/xóa: ${compared.html}`);
    }
    if ((compared.html.match(/Giữ nguyên/g) || []).length !== 1) throw new Error("Đoạn không đổi bị nhân đôi");
  });

  await test("Writer Review: tài liệu giống nhau không tạo thay đổi giả", () => {
    const compared = buildParagraphComparison("<p>Một</p><p>Hai</p>", "<p>Một</p><p>Hai</p>");
    if (compared.changed || compared.insertions || compared.deletions) throw new Error("Có thay đổi giả");
  });

  await test("Writer Protection: băm SHA-512 có salt, đúng mật khẩu mở và sai mật khẩu bị từ chối", async () => {
    const protection = await createDocumentProtection("readOnly", "mật-khẩu", {
      cryptoApi: webcrypto,
      salt: new Uint8Array(16).fill(7),
      spinCount: 2
    });
    if (!protection.hash || !protection.salt || protection.mode !== "readOnly") throw new Error("Thiếu verifier");
    if (!await verifyDocumentProtection("mật-khẩu", protection, webcrypto)) throw new Error("Đúng mật khẩu nhưng không mở");
    if (await verifyDocumentProtection("sai", protection, webcrypto)) throw new Error("Sai mật khẩu vẫn mở");
    const marker = documentProtectionMetadataComment(protection);
    if (!marker.includes("vno-document-protection-hex:")) throw new Error("Thiếu metadata export");
  });

  await test("Writer Protection: đọc readOnly/trackedChanges từ settings.xml", () => {
    const readOnly = parseDocumentProtection('<w:settings><w:documentProtection w:edit="readOnly" w:enforcement="1" w:cryptAlgorithmSid="14" w:cryptSpinCount="2" w:hash="AA==" w:salt="AQ=="/></w:settings>');
    const tracked = parseDocumentProtection('<w:settings><w:documentProtection w:edit="trackedChanges" w:enforcement="1"/></w:settings>');
    const off = parseDocumentProtection('<w:settings><w:documentProtection w:edit="readOnly" w:enforcement="0"/></w:settings>');
    if (readOnly.mode !== "readOnly" || readOnly.algorithm !== "SHA-512") throw new Error("Sai readOnly");
    if (tracked.mode !== "trackedChanges" || off.mode !== "none") throw new Error("Sai tracked/off");
  });

  await test("Writer Review: command, ribbon, Help và i18n VI/EN đầy đủ", () => {
    const ids = ["writer.review.compare", "writer.review.combine", "writer.review.restrictEditing"];
    const review = WRITER_RIBBON_TABS.find(tab => tab.id === "review");
    const flatten = items => (items || []).flatMap(item => item.items ? flatten(item.items) : [item]);
    const ribbonIds = review.groups.flatMap(group => flatten(group.items)).map(item => item.commandId);
    for (const id of ids) {
      if (!WRITER_COMMANDS.some(command => command.id === id)) throw new Error(`Thiếu command ${id}`);
      if (!ribbonIds.includes(id)) throw new Error(`Thiếu ribbon ${id}`);
      if (!viStrings.commands[id]?.label || !enStrings.commands[id]?.label) throw new Error(`Thiếu i18n ${id}`);
      if (!WRITER_HELP_ENTRIES.some(entry => entry.commandIds?.includes(id))) throw new Error(`Thiếu Help ${id}`);
    }
  });

  return results;
}
