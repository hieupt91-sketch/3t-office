/**
 * Live Mac/LibreOffice round-trip: unchanged SmartArt should remain native PPTX;
 * editing its canvas nodes must disable restoration of the stale original part.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourcePptx = path.join(root, "tests/fixtures/real-office-samples/sample-slides-smartart.pptx");
const python = process.env.VNO_PYTHON || "python3";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "3t-smartart-native-roundtrip-"));
const convertedDir = path.join(temp, "converted");
const profile = path.join(temp, "lo-profile");
fs.mkdirSync(convertedDir, { recursive: true });

const importedFodpPath = convertWithSoffice(sourcePptx, "fodp", path.join(temp, "imported"), {
  profileDir: path.join(temp, "lo-import-profile"), appKind: "slides"
});
const canvas = { slides: [], selectSlide(index) { this.selected = index; } };
const adapter = new SlidesAdapter(canvas);
adapter.loadFromFodp(fs.readFileSync(importedFodpPath, "utf8"));
const nativeFodp = adapter.serializeToFodp();
assert.match(nativeFodp, /draw:name="VNOfficeSmartArt:QuyTrinhHoSo"[^>]*vno:smartart-preserve="true"/);
const nativeFodpPath = path.join(temp, "unchanged.fodp");
fs.writeFileSync(nativeFodpPath, nativeFodp);
const convertedNativePath = convertWithSoffice(nativeFodpPath, "pptx", convertedDir, {
  profileDir: profile, appKind: "slides"
});
const rawOutput = fs.readFileSync(convertedNativePath);
const rawSlide = readZipEntry(rawOutput, "ppt/slides/slide1.xml").toString("utf8");
assert.match(rawSlide, /VNOfficeSmartArt:QuyTrinhHoSo/, "LibreOffice must preserve the marker group name");
assert.doesNotMatch(rawSlide, /<p:graphicFrame\b/, "LibreOffice still flattens SmartArt before post-process");

const restoredPath = path.join(temp, "restored.pptx");
const restoreCode = [
  "import pathlib,sys,main",
  "patcher=main._ooxml_zip_patch()",
  "out=patcher.restore_unmodified_smartart(pathlib.Path(sys.argv[2]).read_bytes(), pathlib.Path(sys.argv[1]).read_bytes(), pathlib.Path(sys.argv[3]).read_text())",
  "pathlib.Path(sys.argv[4]).write_bytes(out)"
].join(";");
const restored = spawnSync(python, ["-c", restoreCode, sourcePptx, convertedNativePath, nativeFodpPath, restoredPath], {
  cwd: root,
  encoding: "utf8",
  env: process.env
});
assert.equal(restored.status, 0, `Python native restoration failed: ${restored.stderr || restored.stdout}`);
const restoredBytes = fs.readFileSync(restoredPath);
const restoredSlide = readZipEntry(restoredBytes, "ppt/slides/slide1.xml").toString("utf8");
assert.match(restoredSlide, /<p:graphicFrame\b/);
assert.ok(listZipEntries(restoredBytes).some(entry => entry.name === "ppt/diagrams/data1.xml"));
assert.ok(listZipEntries(restoredBytes).some(entry => entry.name === "ppt/diagrams/drawing1.xml"));

const editedNode = canvas.slides[0].shapes.find(shape => shape.diagramRole === "node");
const originalText = editedNode.text;
editedNode.text = `${originalText} (đã sửa)`;
if (editedNode.textHtml) editedNode.textHtml = editedNode.textHtml.replace(originalText, editedNode.text);
const editedFodp = adapter.serializeToFodp();
assert.doesNotMatch(editedFodp, /draw:name="VNOfficeSmartArt:QuyTrinhHoSo"[^>]*vno:smartart-preserve="true"/);
const editedFodpPath = path.join(temp, "edited.fodp");
fs.writeFileSync(editedFodpPath, editedFodp);
const editedPptx = convertWithSoffice(editedFodpPath, "pptx", path.join(temp, "edited-converted"), {
  profileDir: path.join(temp, "lo-edited-profile"), appKind: "slides"
});
const editedOutputPath = path.join(temp, "edited-final.pptx");
const editedRestore = spawnSync(python, ["-c", restoreCode, sourcePptx, editedPptx, editedFodpPath, editedOutputPath], {
  cwd: root,
  encoding: "utf8",
  env: process.env
});
assert.equal(editedRestore.status, 0, `Python edited-group check failed: ${editedRestore.stderr || editedRestore.stdout}`);
const editedOutput = fs.readFileSync(editedOutputPath);
assert.ok(!listZipEntries(editedOutput).some(entry => entry.name.startsWith("ppt/diagrams/")), "edited SmartArt must not restore stale source parts");
assert.match(readZipEntry(editedOutput, "ppt/slides/slide1.xml").toString("utf8"), /đã sửa/);
console.log(`PASS slides-smartart-native-roundtrip artifacts=${temp}`);
