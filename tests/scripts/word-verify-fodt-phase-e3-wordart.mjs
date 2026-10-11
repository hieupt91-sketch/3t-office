/**
 * One-shot Word visual check for Phase E.3 WordArt. Writes FODT -> soffice DOCX
 * into a temp dir, then prints the DOCX path for Start-Process. Not part of
 * the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { buildWriterWordArtHtml } from "../../apps/writer/insert-dialogs.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

function adapterWithZones({ body = "", header = "" } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  return new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      return null;
    }
  });
}

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "vno-e3-word-"));
fs.mkdirSync(outDir, { recursive: true });

const wordArt = buildWriterWordArtHtml("KHAI GIANG", { presetId: "navy-outline" });
const adapter = adapterWithZones({
  body: `<p>Kính gửi Ban Giám đốc. Chữ nghệ thuật nằm giữa câu: trước ${wordArt} sau — phải hiện WordArt xanh đậm, không phải chữ thường.</p>`
});
const fodtPath = path.join(outDir, "phase-e3-wordart.fodt");
fs.writeFileSync(fodtPath, adapter.serializeToFodt(), "utf8");
const docx = convertWithSoffice(fodtPath, "docx", path.join(outDir, "docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile")
});
const outDocx = path.join(outDir, "phase-e3-wordart.docx");
fs.copyFileSync(docx, outDocx);
console.log(`WORD_DIR=${outDir}`);
console.log(`E3_WORDART_DOCX=${outDocx}`);
