/**
 * One-shot Word visual check. Writes FODT -> soffice DOCX into a temp dir,
 * then prints the DOCX path for Start-Process. Not part of the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

function adapterWithZones({ body = "", header = "", watermark = null } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const adapter = new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      return null;
    }
  });
  if (watermark) adapter.watermark = JSON.parse(JSON.stringify(watermark));
  return adapter;
}

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "vno-e2-word-"));
fs.mkdirSync(outDir, { recursive: true });

const adapter = adapterWithZones({
  body: "<p>Kính gửi Ban Giám đốc. Nội dung công văn nằm trên hình mờ DỰ THẢO, chữ phải đọc được, hình mờ mờ và xoay chéo.</p><p>Người lập: Nguyễn Thị Bình. Ngày lập: 06/09/2026.</p>",
  header: "<p style='text-align: center;'>Công ty TNHH Sao Việt — Đầu trang</p>",
  watermark: { text: "DỰ THẢO", color: "#dc2626", opacity: 0.2, angle: 45, fontSize: 72 }
});
const fodtPath = path.join(outDir, "phase-e2-watermark.fodt");
fs.writeFileSync(fodtPath, adapter.serializeToFodt(), "utf8");
const docx = convertWithSoffice(fodtPath, "docx", path.join(outDir, "docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile")
});
const outDocx = path.join(outDir, "phase-e2-watermark.docx");
fs.copyFileSync(docx, outDocx);
console.log(`WORD_DIR=${outDir}`);
console.log(`E2_DOCX=${outDocx}`);
