import path from "node:path";
import { auditWriterDocx, formatWriterAudit } from "../../scripts/audit-writer-docx.mjs";

export async function runWriterDocxAuditTests() {
  const fixture = path.resolve("tests/fixtures/real-office-samples/sample-writer.docx");
  try {
    const report = auditWriterDocx(fixture, fixture);
    if (report.total !== 0) throw new Error(`self audit reported ${report.total} differences`);
    const text = formatWriterAudit(report);
    if (!text.includes("Font: 0") || !text.includes("Spacing: 0") || !text.includes("TOTAL: 0")) throw new Error("grouped report incomplete");
    return [{ name: "Writer DOCX audit: fixture self-comparison has zero differences", pass: true }];
  } catch (error) {
    return [{ name: "Writer DOCX audit: fixture self-comparison has zero differences", pass: false, error: error.message }];
  }
}
