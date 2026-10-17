import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { normalizeDocumentProperties, documentPropertiesMarker } from "../../platform/dialogs/document-properties.js";
import { inspectSlidesDocument, removeSlidesDocumentCategory } from "../../apps/slides/document-inspector-dialog.js";

export async function runSlidesDocumentPropertiesTests() {
  const results = [];
  const test = async (name, run) => {
    try { await run(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error?.stack || String(error) }); }
  };
  await test("Shared properties retain all PPTX fields and encode reversible FODP marker", () => {
    const input = { title: "Trình bày", creator: "An", subject: "Kế hoạch", manager: "Bình", company: "VN", keywords: "a,b", description: "Ghi chú", contentStatus: "Final" };
    const normalized = normalizeDocumentProperties(input);
    for (const [key, value] of Object.entries(input)) if (normalized[key] !== value) throw new Error(`${key} không được giữ`);
    const marker = documentPropertiesMarker(normalized);
    const hex = marker.match(/hex:([0-9a-f]+)/)?.[1];
    const decoded = JSON.parse(new TextDecoder().decode(new Uint8Array(hex.match(/.{2}/g).map(x => parseInt(x, 16)))));
    if (decoded.company !== "VN" || decoded.contentStatus !== "Final") throw new Error("marker không giữ đủ thuộc tính");
  });
  await test("SlidesAdapter nạp metadata từ PPTX marker trong FODP trung gian", () => {
    const properties = { title: "Bản gốc", creator: "Tác giả", company: "VN", contentStatus: "Final" };
    const marker = documentPropertiesMarker(properties);
    const adapter = new SlidesAdapter({ slides: [] });
    adapter.loadFromFodp(`<?xml version="1.0"?>${marker}<office:document/>`);
    if (adapter.documentProperties.title !== "Bản gốc" || adapter.documentProperties.creator !== "Tác giả" || adapter.documentProperties.company !== "VN" || !adapter.isFinal) throw new Error("metadata gốc không được khôi phục");
  });
  await test("Mark as Final cập nhật contentStatus và trạng thái adapter", () => {
    const adapter = new SlidesAdapter({ slides: [] });
    if (!adapter.markAsFinal(true) || adapter.documentProperties.contentStatus !== "Final") throw new Error("không đánh dấu Final");
    if (adapter.markAsFinal(false) || adapter.documentProperties.contentStatus) throw new Error("không gỡ Final");
  });
  await test("Inspector đếm và xóa từng nhóm nội dung Slides", () => {
    const adapter = { isDirty: false, documentProperties: { title: "A", company: "B" }, canvas: { slides: [
      { comments: [{ text: "x" }], notes: "ghi chú", hidden: true, shapes: [{ src: "https://example.test/a.png" }] },
      { comments: [], notes: "", hidden: false, shapes: [] }
    ] } };
    const before = inspectSlidesDocument(adapter);
    if (before.comments.count !== 1 || before.speakerNotes.count !== 1 || before.hiddenSlides.count !== 1 || before.externalContent.count !== 1) throw new Error("số lượng kiểm tra sai");
    for (const category of ["personalInfo", "comments", "speakerNotes", "hiddenSlides", "externalContent"]) removeSlidesDocumentCategory(adapter, category);
    if (Object.values(inspectSlidesDocument(adapter)).some((item) => item.count)) throw new Error("xóa từng nhóm chưa sạch");
    if (!adapter.isDirty) throw new Error("thay đổi chưa đánh dấu dirty");
  });
  return results;
}

