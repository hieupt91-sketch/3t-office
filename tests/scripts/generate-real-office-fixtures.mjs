/**
 * Generate real-office OOXML fixtures WITHOUT using any VN Office serializer.
 *
 * Pipeline (same path a LibreOffice/Office user would take):
 *   1. Hand-written ODF (src/*.fodt|fods|fodp)
 *   2. soffice --headless --convert-to docx/xlsx/pptx
 *
 * Output: tests/fixtures/real-office-samples/{sample-writer.docx,sample-sheet.xlsx,sample-slides.pptx}
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = path.join(root, "tests", "fixtures", "real-office-samples");
const srcDir = path.join(fixtureDir, "src");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-real-office-fixtures-"));
const profileDir = path.join(tmp, "profile");

const jobs = [
  { src: "sample-writer.fodt", ext: "docx", name: "sample-writer.docx" },
  { src: "sample-sheet.fods", ext: "xlsx", name: "sample-sheet.xlsx" },
  { src: "sample-slides.fodp", ext: "pptx", name: "sample-slides.pptx" }
];

try {
  for (const job of jobs) {
    const source = path.join(srcDir, job.src);
    if (!fs.existsSync(source)) throw new Error(`Missing source ODF: ${source}`);
    const outDir = path.join(tmp, job.ext);
    const converted = convertWithSoffice(source, job.ext, outDir, { profileDir });
    const dest = path.join(fixtureDir, job.name);
    fs.copyFileSync(converted, dest);
    const size = fs.statSync(dest).size;
    if (size < 1000) throw new Error(`${job.name} is suspiciously small (${size} bytes)`);
    console.log(`OK  ${job.src} → ${job.name} (${size} bytes)`);
  }
  console.log(`Wrote OOXML fixtures to ${fixtureDir}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tmp, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tmp}`);
  }
}
