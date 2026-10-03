import fs from "node:fs/promises";
import path from "node:path";
import { WriterAdapter } from "../../../adapters/libreoffice/writer/writer-adapter.js";

const inputDir = process.argv[2];
if (!inputDir) throw new Error("Usage: node _p3b_compare_writer_payloads.mjs <payload-dir>");

const files = (await fs.readdir(inputDir)).filter(name => name.endsWith(".json")).sort();
let passed = 0;
for (const name of files) {
  const payload = JSON.parse(await fs.readFile(path.join(inputDir, name), "utf8"));
  const adapter = new WriterAdapter(null);
  const xml = payload.ooxmlDocumentXml || "";
  const styles = payload.ooxmlStylesXml || "";
  const page = adapter._pageHeaderFooterFromOoxml(xml)?.page || null;
  const run = legacy => {
    if (legacy) globalThis.__VNO_OPEN_LEGACY = true;
    else delete globalThis.__VNO_OPEN_LEGACY;
    let html = payload.content || "";
    html = adapter._applyOoxmlTableCellEmptyParagraphFontSizes(html, xml, styles);
    html = adapter._applyOoxmlTableColumnGeometry(html, xml);
    html = adapter._applyOoxmlTableCellMargins(html, xml);
    html = adapter._preserveImportedFloatingFrames(html, xml, page);
    html = adapter._makeFloatingAnchorContainers(html, page);
    const pageBreak = adapter._replaceFirstPageBreakParagraph(html, '<div data-p3b-marker="1"></div>');
    return `${pageBreak.replaced}\n${pageBreak.html}`;
  };
  const legacy = run(true);
  const current = run(false);
  if (current !== legacy) throw new Error(`${name}: output mismatch legacy=${legacy.length} current=${current.length}`);
  passed += 1;
  console.log(`EQUIV_OK ${name} chars=${current.length}`);
}
delete globalThis.__VNO_OPEN_LEGACY;
console.log(`P3B_REAL_EQUIVALENCE ${passed}/${files.length} PASS`);
