/**
 * Live soffice convert of the handwritten Speaker Notes PPTX:
 *   sample-slides-notes.pptx → fodp → parseFodp() / loadFromFodp()
 *
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pptxPath = path.join(root, "tests", "fixtures", "real-office-samples", "sample-slides-notes.pptx");
const note1a = "Nhấn mạnh số liệu quý 4: Đã đạt & vượt 120% kế hoạch đề ra!";
const note1b = "Cần lưu ý: Tỷ giá ngoại tệ không được đọc trước khán giả.";
const note3 = "Gợi ý chuyển slide: dừng 5 giây tại sơ đồ kiến trúc.";

assert.ok(fs.existsSync(pptxPath), `missing ${pptxPath}`);
const names = listZipEntries(pptxPath).map((entry) => entry.name);
assert.ok(names.includes("ppt/notesSlides/notesSlide1.xml"), "fixture is not native notesSlide");
assert.ok(names.includes("ppt/notesSlides/notesSlide3.xml"), "missing notesSlide3");
assert.ok(!names.includes("ppt/notesSlides/notesSlide2.xml"), "empty notes slide must not invent notesSlide2");
const notes1 = readZipEntry(pptxPath, "ppt/notesSlides/notesSlide1.xml").toString("utf8");
assert.ok(notes1.includes("Nhấn mạnh số liệu quý 4"), "notesSlide1 lost line 1");
assert.ok(notes1.includes(note1b), "notesSlide1 lost line 2");
const rels1 = readZipEntry(pptxPath, "ppt/slides/_rels/slide1.xml.rels").toString("utf8");
assert.ok(/notesSlide/i.test(rels1), "slide1.xml.rels missing notesSlide relationship");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-live-notes-import-"));
const fodpPath = convertWithSoffice(pptxPath, "fodp", path.join(tmp, "fodp"), {
  profileDir: path.join(tmp, "profile"),
  timeoutMs: 60000
});
const fodp = fs.readFileSync(fodpPath, "utf8");
assert.match(fodp, /<presentation:notes\b/i, "soffice must emit presentation:notes");
assert.ok(fodp.includes("Nhấn mạnh số liệu quý 4"), "FODP missing notes slide 1");
assert.ok(fodp.includes(note3), "FODP missing notes slide 3");
assert.match(fodp, /presentation:class=["']notes["']/i, "notes body must keep presentation:class=notes");

const parsed = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(parsed.length, 3, `slides=${parsed.length}`);
assert.equal(parsed[0].title, "Báo cáo đề án VN Office 2026");
assert.equal(parsed[0].notes, `${note1a}\n${note1b}`, `notes0=${JSON.stringify(parsed[0].notes)}`);
assert.equal(parsed[1].notes, "", `notes1 must stay empty, got ${JSON.stringify(parsed[1].notes)}`);
assert.equal(parsed[2].notes, note3, `notes2=${JSON.stringify(parsed[2].notes)}`);
assert.ok(!parsed[0].body.includes("Nhấn mạnh số liệu"), "notes leaked into body");
assert.ok(!parsed[0].notes.includes("<number>"), "page-number placeholder leaked into notes");

const canvas = {
  slides: [],
  notesTextarea: { value: "" },
  selectSlide(index) {
    this.notesTextarea.value = this.slides[index]?.notes || "";
  }
};
new SlidesAdapter(canvas).loadFromFodp(fodp);
assert.ok(canvas.notesTextarea.value.includes("Tỷ giá ngoại tệ"), "Speaker Notes panel did not receive imported notes");

console.log("PASS slides-speakernotes-import-real-conversion");
console.log("notes0=", parsed[0].notes);
console.log("notes1=", JSON.stringify(parsed[1].notes));
console.log("notes2=", parsed[2].notes);
console.log("tmp", tmp);
