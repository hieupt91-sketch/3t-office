/**
 * One-shot Word visual check. Writes FODT -> soffice DOCX into a temp dir,
 * then prints the DOCX path for Start-Process. Not part of the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

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

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "vno-e1-word-"));
fs.mkdirSync(outDir, { recursive: true });

const body = '<p>Kính gửi Ban Giám đốc. Phòng kế toán đã hoàn thành <del data-vno-change="delete" contenteditable="false" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:16:00" title="Nguyen Van An (2026-09-05T08:16:00)">bản nháp nội bộ </del><ins data-vno-change="insert" data-vno-author="Nguyen Van An" data-vno-date="2026-09-05T08:15:00" title="Nguyen Van An (2026-09-05T08:15:00)">theo yêu cầu khẩn </ins>báo cáo quý III.</p><p>Người lập: Nguyễn Thị Bình. Ngày lập: 05/09/2026.</p>';
const fodtPath = path.join(outDir, "phase-e1-track-changes.fodt");
fs.writeFileSync(fodtPath, adapterWithZones({ body }).serializeToFodt(), "utf8");
const docx = convertWithSoffice(fodtPath, "docx", path.join(outDir, "docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile")
});
const outDocx = path.join(outDir, "phase-e1-track-changes.docx");
fs.copyFileSync(docx, outDocx);
console.log(`WORD_DIR=${outDir}`);
console.log(`E1_DOCX=${outDocx}`);
