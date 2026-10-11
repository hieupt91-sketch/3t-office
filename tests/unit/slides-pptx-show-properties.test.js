/**
 * Unit tests — Slides native PPTX post-process (p:showPr on ppt/presProps.xml).
 * No soffice. Fake OOXML ZIP + the real LibreOffice presProps.xml from the
 * Phase 3b probe (showPr loop="1" showNarration="1", no penClr).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { parseSlideSize } from "../../adapters/libreoffice/slides/pptx-master-logo.js";
import {
  PPTX_PRESPROPS_ENTRY,
  applyShowProperties,
  applyShowPropertiesFromFodp,
  fodpHasShowSetupPatch,
  parseShowProperties,
  parseShowSettingsFromFodp
} from "../../adapters/libreoffice/slides/pptx-show-properties.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import { createZip, readZipEntry } from "../helpers/zip-package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PYTHON_PATCHER = path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Compact presProps.xml from soffice FODP→PPTX probe (endless + vno flags). */
const LO_PRESPROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:showPr loop="1" showNarration="1"></p:showPr></p:presentationPr>`;

const LO_PRESPROPS_SLDRG_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:showPr loop="1" showNarration="1"><p:sldRg st="2" end="3"/></p:showPr></p:presentationPr>`;

const LO_PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId4"/><p:sldId id="258" r:id="rId5"/></p:sldIdLst><p:sldSz cx="10080625" cy="5670550"/><p:notesSz cx="7559675" cy="10691813"/></p:presentation>`;

function setupCanvas(settings) {
  return {
    slideShowSettings: settings,
    getSlideShowSettings() { return this.slideShowSettings; },
    slides: [
      { id: 1, title: "Mo dau", body: "A1", layoutType: "title-content", notes: "", shapes: [] },
      { id: 2, title: "Noi dung", body: "A2", layoutType: "title-content", notes: "", shapes: [] },
      { id: 3, title: "Ket luan", body: "A3", layoutType: "title-content", notes: "", shapes: [] }
    ]
  };
}

function fakePptx(presPropsXml = LO_PRESPROPS_XML) {
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "ppt/presentation.xml", data: LO_PRESENTATION_XML },
    { name: PPTX_PRESPROPS_ENTRY, data: presPropsXml },
    { name: "ppt/slideMasters/slideMaster1.xml", data: '<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree></p:spTree></p:cSld></p:sldMaster>' },
    { name: "ppt/slides/slide1.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' },
    { name: "ppt/slides/slide2.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' },
    { name: "ppt/slides/slide3.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' }
  ]);
}

export async function runSlidesPptxShowPropertiesTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("FODP serialize: endless + vno:without-narration + vno:pointer-color", () => {
    const fodp = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: true,
      pointerColor: "#112233"
    })).serializeToFodp();
    assert(fodpHasShowSetupPatch(fodp), "phải vá khi có vno:*");
    const parsed = parseShowSettingsFromFodp(fodp);
    assert(parsed.loopUntilEsc === true, "endless");
    assert(parsed.showWithoutNarration === true, "narration flag");
    assert(parsed.pointerColor === "#112233", `pointer=${parsed.pointerColor}`);
  });

  test("Probe presProps.xml: LO đã có showPr loop=1 showNarration=1, không penClr", () => {
    const parsed = parseShowProperties(LO_PRESPROPS_XML);
    assert(parsed.loop === true, `loop=${parsed.loop}`);
    assert(parsed.showNarration === true, `showNarration=${parsed.showNarration}`);
    assert(parsed.penRgb === "", "probe không có penClr");
    assert(parsed.hasSldRg === false, "probe không có sldRg");
  });

  test("applyShowPropertiesFromFodp: showNarration=0 + penClr, giữ loop", () => {
    const fodp = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: true,
      pointerColor: "#112233"
    })).serializeToFodp();
    const next = applyShowPropertiesFromFodp(LO_PRESPROPS_XML, fodp);
    const parsed = parseShowProperties(next);
    assert(parsed.loop === true, "không được xóa loop LO đã ghi");
    assert(parsed.showNarration === false, `showNarration=${parsed.showNarration}`);
    assert(parsed.penRgb === "112233", `penRgb=${parsed.penRgb}`);
    assert(/<p:penClr><a:srgbClr val="112233"\/><\/p:penClr>/.test(next), next);
    assert(!/vno:/.test(next), "không nhét vno vào PPTX");
    assert(!next.includes("#112233"), "srgbClr không có dấu #");
  });

  test("Idempotent; no-op khi FODP không có vno setup; giữ sldRg", () => {
    const fodp = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: true,
      pointerColor: "#00AA55"
    })).serializeToFodp();
    const once = applyShowPropertiesFromFodp(LO_PRESPROPS_XML, fodp);
    const twice = applyShowPropertiesFromFodp(once, fodp);
    assert(once === twice, "XML phải ổn định");
    assert((twice.match(/<(?:[\w]+:)?penClr\b/g) || []).length === 1, "một penClr");
    const empty = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: false,
      pointerColor: "#DC2626"
    })).serializeToFodp();
    assert(!fodpHasShowSetupPatch(empty), "loop-only không vá");
    assert(applyShowPropertiesFromFodp(LO_PRESPROPS_XML, empty) === LO_PRESPROPS_XML, "no-op endless-only");
    const withRange = applyShowPropertiesFromFodp(LO_PRESPROPS_SLDRG_XML, fodp);
    const parsed = parseShowProperties(withRange);
    assert(parsed.hasSldRg === true, "giữ sldRg");
    assert(parsed.sldRg.st === "2" && parsed.sldRg.end === "3", JSON.stringify(parsed.sldRg));
    assert(parsed.penRgb === "00AA55", parsed.penRgb);
    assert(parsed.showNarration === false, "narration 0 trên showPr có sldRg");
  });

  test("Hex không hợp lệ thì ném, không đoán; chèn showPr khi thiếu", () => {
    let threw = false;
    try {
      applyShowProperties(LO_PRESPROPS_XML, { pointerColor: "red" });
    } catch (error) {
      threw = /hex 6 chữ/.test(error.message);
    }
    assert(threw, "phải từ chối màu không hex");
    const bare = '<?xml version="1.0"?><p:presentationPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"></p:presentationPr>';
    const inserted = applyShowProperties(bare, { showWithoutNarration: true, pointerColor: "#ABCDEF" });
    const parsed = parseShowProperties(inserted);
    assert(parsed.showNarration === false, "chèn showNarration=0");
    assert(parsed.penRgb === "ABCDEF", parsed.penRgb);
    assert(/xmlns:a="http:\/\/schemas.openxmlformats.org\/drawingml\/2006\/main"/.test(inserted), "thêm xmlns:a khi thiếu");
  });

  test("postProcessSlidesPptx ghi showPr vào presProps.xml; không đụng slide1 / presentation", () => {
    const zip = fakePptx();
    const fodp = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: true,
      pointerColor: "#112233"
    })).serializeToFodp();
    const patched = postProcessSlidesPptx(zip, { sourceFodp: fodp });
    const xml = readZipEntry(patched, PPTX_PRESPROPS_ENTRY).toString("utf8");
    const parsed = parseShowProperties(xml);
    assert(parsed.showNarration === false, "JS patch showNarration");
    assert(parsed.penRgb === "112233", parsed.penRgb);
    assert(parsed.loop === true, "giữ loop");
    const slide = readZipEntry(patched, "ppt/slides/slide1.xml").toString("utf8");
    assert(/<p:sld\b/.test(slide), "giữ slide1");
    const presentation = readZipEntry(patched, "ppt/presentation.xml").toString("utf8");
    assert(!/showPr/.test(presentation), "không nhét showPr vào presentation.xml");
    // Không showPr nào được thêm khi cấu hình chỉ có endless (giá trị mặc định) -
    // nhưng vẫn KHÔNG còn là no-op tuyệt đối: khổ trang thật (25.4cm, canvas mặc
    // định 960px) vẫn được tự sửa lại độc lập, vì fakePptx() mô phỏng đúng khổ
    // SAI mà soffice thật luôn ghi (28cm x 15.75cm) - xem
    // docs/HANDOFF-SLIDES-SLIDESIZE-EXPORT-FIX.md.
    const endlessOnlyFodp = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: false,
      pointerColor: "#DC2626"
    })).serializeToFodp();
    const noop = postProcessSlidesPptx(zip, { sourceFodp: endlessOnlyFodp });
    assert(Buffer.compare(zip, noop) !== 0, "phải có thay đổi: tự sửa khổ trang thật dù chỉ endless");
    const originalProps = readZipEntry(zip, PPTX_PRESPROPS_ENTRY).toString("utf8");
    const noopProps = readZipEntry(noop, PPTX_PRESPROPS_ENTRY).toString("utf8");
    assert(noopProps === originalProps, "presProps.xml (showPr có sẵn từ soffice) không được đụng tới khi chỉ endless");
    const noopSize = parseSlideSize(readZipEntry(noop, "ppt/presentation.xml").toString("utf8"));
    assert(noopSize.cx === Math.round(25.4 * 360000), `sldSz cx phải sửa đúng 25.4cm, nhận ${noopSize.cx}`);
  });

  test("Python CLI vá presProps.xml giống JS", () => {
    const fodp = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: true,
      pointerColor: "#112233"
    })).serializeToFodp();
    const zipPath = path.join(os.tmpdir(), `vno-showpr-${Date.now()}.pptx`);
    const fodpPath = path.join(os.tmpdir(), `vno-showpr-${Date.now()}.fodp`);
    const outPath = path.join(os.tmpdir(), `vno-showpr-${Date.now()}-out.pptx`);
    fs.writeFileSync(zipPath, fakePptx());
    fs.writeFileSync(fodpPath, fodp, "utf8");
    const py = spawnSync(process.env.PYTHON || "python", [
      PYTHON_PATCHER, "--pptx", zipPath, "--fodp", fodpPath, "--out", outPath
    ], { encoding: "utf8" });
    assert(py.status === 0, `Python patcher failed: ${(py.stderr || py.stdout || "").trim()}`);
    const pyXml = readZipEntry(outPath, PPTX_PRESPROPS_ENTRY).toString("utf8");
    const jsXml = applyShowPropertiesFromFodp(LO_PRESPROPS_XML, fodp);
    const pyParsed = parseShowProperties(pyXml);
    const jsParsed = parseShowProperties(jsXml);
    assert(JSON.stringify(pyParsed) === JSON.stringify(jsParsed), `py=${JSON.stringify(pyParsed)} js=${JSON.stringify(jsParsed)}`);
    try { fs.unlinkSync(zipPath); fs.unlinkSync(fodpPath); fs.unlinkSync(outPath); } catch { /* ignore */ }
  });

  return results;
}
