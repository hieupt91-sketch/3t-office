import path from "node:path";
import { auditWriterDocx, formatWriterAudit } from "../../scripts/audit-writer-docx.mjs";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

class ParagraphElement {
  constructor(html) { this.tagName = "P"; this.innerHTML = html; this.attrs = new Map(); }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
}

export async function runWriterDocxAuditTests() {
  const results = [];
  const fixture = path.resolve("tests/fixtures/real-office-samples/sample-writer.docx");
  try {
    const report = auditWriterDocx(fixture, fixture);
    if (report.total !== 0) throw new Error(`self audit reported ${report.total} differences`);
    const text = formatWriterAudit(report);
    if (!text.includes("Font: 0") || !text.includes("Spacing: 0") || !text.includes("TOTAL: 0")) throw new Error("grouped report incomplete");
    results.push({ name: "Writer DOCX audit: fixture self-comparison has zero differences", pass: true });
  } catch (error) {
    results.push({ name: "Writer DOCX audit: fixture self-comparison has zero differences", pass: false, error: error.message });
  }

  const adapter = new WriterAdapter(null);
  const paragraphs = [new ParagraphElement("Đoạn 1"), new ParagraphElement("Đoạn 2"), new ParagraphElement("Đoạn 3")];
  const root = { children: paragraphs };
  adapter._markImportedParagraphsUntouched(root);
  paragraphs[1].innerHTML = "<strong>Đoạn 2</strong>";
  paragraphs[2].innerHTML = "Đoạn 3 đã sửa";
  adapter._markCurrentUntouchedParagraphs(root);
  const pass = paragraphs[0].getAttribute("id") === "vno-untouched-0"
    && !paragraphs[1].getAttribute("id")
    && !paragraphs[2].getAttribute("id");
  results.push({
    name: "Writer untouched guard: unchanged paragraph marked; formatting/text edits unmarked",
    pass,
    ...(pass ? {} : { error: paragraphs.map((p) => p.innerHTML).join(" | ") }),
  });

  const nested = new ParagraphElement("Đoạn lồng trong khung neo");
  const nestedRoot = {
    children: [{}],
    querySelectorAll: () => [nested]
  };
  adapter._markImportedParagraphsUntouched(nestedRoot);
  adapter._markCurrentUntouchedParagraphs(nestedRoot);
  results.push({
    name: "Writer untouched guard: nested paragraphs receive export marker",
    pass: nested.getAttribute("id") === "vno-untouched-0",
    ...(nested.getAttribute("id") === "vno-untouched-0" ? {} : { error: nested.innerHTML }),
  });
  return results;
}
