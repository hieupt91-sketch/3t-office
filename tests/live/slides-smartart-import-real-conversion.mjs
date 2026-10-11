/**
 * Live soffice convert of the hand-packed SmartArt PPTX:
 *   sample-slides-smartart.pptx → fodp → parseFodp()
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
const pptxPath = path.join(root, "tests", "fixtures", "real-office-samples", "sample-slides-smartart.pptx");
const labels = ["Tiếp nhận hồ sơ", "Thẩm định", "Phê duyệt", "Lưu trữ", "Bàn giao"];

assert.ok(fs.existsSync(pptxPath), `missing ${pptxPath}`);
const names = listZipEntries(pptxPath).map((entry) => entry.name);
assert.ok(names.includes("ppt/diagrams/data1.xml"), "fixture is not native SmartArt");
const dataXml = readZipEntry(pptxPath, "ppt/diagrams/data1.xml").toString("utf8");
for (const label of labels) assert.ok(dataXml.includes(label), `data1.xml missing ${label}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-live-smartart-import-"));
const fodpPath = convertWithSoffice(pptxPath, "fodp", path.join(tmp, "fodp"), {
  profileDir: path.join(tmp, "profile"),
  timeoutMs: 60000
});
const fodp = fs.readFileSync(fodpPath, "utf8");
assert.match(fodp, /<draw:g\b[^>]*draw:name="QuyTrinhHoSo"/i, "soffice must emit draw:g named QuyTrinhHoSo");
assert.doesNotMatch(fodp, /<draw:image\b/i, "SmartArt must not be flattened to a bitmap");
for (const label of labels) {
  assert.ok(fodp.includes(label), `FODP missing ${label}`);
}

const parsed = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(parsed.length, 1, `slides=${parsed.length}`);
assert.ok(String(parsed[0].title || "").includes("Quy trình xử lý hồ sơ"), `title=${parsed[0].title}`);
const nodes = (parsed[0].shapes || []).filter((shape) => shape.diagramRole === "node");
assert.equal(nodes.length, 5, `nodes=${nodes.length} shapes=${JSON.stringify((parsed[0].shapes || []).map((s) => ({ t: s.text, r: s.diagramRole, g: s.diagramGroupId })))}`);
assert.ok(nodes.every((shape) => shape.diagramGroupId === "QuyTrinhHoSo"));
for (const label of labels) {
  assert.ok(nodes.some((shape) => shape.text === label), `parsed missing ${label}`);
}
assert.ok(nodes.every((shape) => shape.y >= 0 && shape.y + shape.h <= 560), "node overflowed the 16:9 slide");
const background = (parsed[0].shapes || []).filter((shape) => !shape.text && (shape.w || 0) > 700);
assert.equal(background.length, 0, "background rect should be omitted");

console.log("PASS slides-smartart-import-real-conversion");
console.log("title=", parsed[0].title);
console.log("nodes=", nodes.map((shape) => `${shape.text}@${shape.x},${shape.y}`).join(" | "));
console.log("tmp", tmp);
