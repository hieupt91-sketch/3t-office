/**
 * Unit tests — Slides native PPTX open overlay
 * (p:showPr showNarration=0 / p:penClr → vno:without-narration / vno:pointer-color).
 * LibreOffice PPTX→FODP drops vno:* but keeps presentation:endless; overlay
 * FODP before parseFodp. Does NOT overlay @loop. No soffice.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import {
  PPTX_PRESPROPS_ENTRY,
  fodpHasShowSetupPatch,
  overlayFodpShowProperties,
  parseShowProperties,
  parseShowSettingsFromFodp
} from "../../adapters/libreoffice/slides/pptx-show-properties.js";
import {
  overlaySlidesPptxFodp,
  postProcessSlidesPptx
} from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { createZip, readZipEntry } from "../helpers/zip-package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PYTHON_PATCHER = path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Compact presProps.xml from soffice FODP→PPTX (Phase 3b probe). */
const LO_PRESPROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:showPr loop="1" showNarration="1"></p:showPr></p:presentationPr>`;

/** Phase 3b patched presProps.xml from the open-overlay probe. */
const PATCHED_PRESPROPS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:showPr loop="1" showNarration="0"><p:penClr><a:srgbClr val="112233"/></p:penClr></p:showPr></p:presentationPr>`;

const LO_PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId4"/><p:sldId id="258" r:id="rId5"/></p:sldIdLst><p:sldSz cx="10080625" cy="5670550"/><p:notesSz cx="7559675" cy="10691813"/></p:presentation>`;

/** soffice PPTX→FODP from the open-overlay probe (endless kept, vno:* gone). */
const LO_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles><style:master-page style:name="Default"/></office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="Mo dau"><draw:frame presentation:class="title"><draw:text-box><text:p>Mo dau</text:p></draw:text-box></draw:frame></draw:page>
    <draw:page draw:name="Noi dung"><draw:frame presentation:class="title"><draw:text-box><text:p>Noi dung</text:p></draw:text-box></draw:frame></draw:page>
    <draw:page draw:name="Ket luan"><draw:frame presentation:class="title"><draw:text-box><text:p>Ket luan</text:p></draw:text-box></draw:frame></draw:page>
    <presentation:settings presentation:endless="true" presentation:pause="P0D" presentation:mouse-visible="false"/>
  </office:presentation></office:body>
</office:document>
`;

const FODP_NO_PRESENTATION = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body></office:body>
</office:document>
`;

function setupCanvas(settings) {
  return {
    slideShowSettings: { ...settings },
    getSlideShowSettings() { return this.slideShowSettings; },
    applySlideShowSettings(next) {
      this.slideShowSettings = { ...this.slideShowSettings, ...next };
    },
    slides: [
      { id: 1, title: "Mo dau", body: "A1", layoutType: "title-content", notes: "", shapes: [] },
      { id: 2, title: "Noi dung", body: "A2", layoutType: "title-content", notes: "", shapes: [] },
      { id: 3, title: "Ket luan", body: "A3", layoutType: "title-content", notes: "", shapes: [] }
    ],
    selectSlide() {}
  };
}

function fakePptx(presPropsXml = PATCHED_PRESPROPS_XML) {
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "ppt/presentation.xml", data: LO_PRESENTATION_XML },
    { name: PPTX_PRESPROPS_ENTRY, data: presPropsXml },
    { name: "ppt/slideMasters/slideMaster1.xml", data: '<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree></p:spTree></p:cSld></p:sldMaster>' },
    { name: "ppt/slides/slide1.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' },
    { name: "ppt/slides/slide2.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' },
    { name: "ppt/slides/slide3.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' }
  ]);
}

export async function runSlidesPptxSetupShowOpenOverlayTests() {
  const results = [];
  const test = async (name, callback) => {
    try {
      await callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("overlayFodpShowProperties: gắn vno:* từ showNarration=0 / penClr, không đụng loop", () => {
    assert(!fodpHasShowSetupPatch(LO_FODP), "FODP soffice giả lập chưa có vno:*");
    assert(/presentation:endless="true"/.test(LO_FODP), "soffice giữ endless");
    assert(!/xmlns:vno=/.test(LO_FODP), "soffice FODP không có xmlns:vno");
    const next = overlayFodpShowProperties(LO_FODP, PATCHED_PRESPROPS_XML);
    assert(fodpHasShowSetupPatch(next), "sau overlay phải có vno:*");
    assert(/xmlns:vno="urn:vn-office:slides:1.0"/.test(next), "phải khai báo xmlns:vno");
    const parsed = parseShowSettingsFromFodp(next);
    assert(parsed.showWithoutNarration === true, "without-narration");
    assert(parsed.pointerColor === "#112233", `pointer=${parsed.pointerColor}`);
    assert(parsed.loopUntilEsc === true, "không được xóa endless");
    assert(/presentation:pause="P0D"/.test(next), "giữ pause LO");
    assert(/presentation:mouse-visible="false"/.test(next), "giữ mouse-visible LO");
    assert(next.includes("Mo dau"), "giữ nội dung FODP");
  });

  await test("overlay no-op khi PPTX không có p:showPr hoặc chỉ showNarration=1 — không bịa", () => {
    const noShowPr = LO_PRESPROPS_XML.replace(/<p:showPr[\s\S]*?<\/p:showPr>/, "");
    assert(overlayFodpShowProperties(LO_FODP, noShowPr) === LO_FODP, "no-op thiếu showPr");
    const loDefault = overlayFodpShowProperties(LO_FODP, LO_PRESPROPS_XML);
    assert(loDefault === LO_FODP, "no-op khi LO mặc định showNarration=1 không penClr");
    assert(!fodpHasShowSetupPatch(loDefault), "không tự bịa vno:*");
  });

  await test("overlay idempotent; hex không hợp lệ thì bỏ pointer, không bịa", () => {
    const once = overlayFodpShowProperties(LO_FODP, PATCHED_PRESPROPS_XML);
    const twice = overlayFodpShowProperties(once, PATCHED_PRESPROPS_XML);
    assert(once === twice, "idempotent khi đã gắn vno:*");
    const badPen = PATCHED_PRESPROPS_XML.replace('val="112233"', 'val="GGHHII"');
    const narrationOnly = overlayFodpShowProperties(LO_FODP, badPen);
    const parsed = parseShowSettingsFromFodp(narrationOnly);
    assert(parsed.showWithoutNarration === true, "narration=0 vẫn gắn");
    assert(parsed.pointerColor === "", "hex lệch không bịa pointer");
    const garbageNarration = LO_PRESPROPS_XML.replace('showNarration="1"', 'showNarration="maybe"');
    assert(overlayFodpShowProperties(LO_FODP, garbageNarration) === LO_FODP, "showNarration lệch → no-op");
  });

  await test("FODP thiếu office:presentation khi cần gắn → ném, không đoán", () => {
    let threw = false;
    try {
      overlayFodpShowProperties(FODP_NO_PRESENTATION, PATCHED_PRESPROPS_XML);
    } catch (error) {
      threw = /không gắn Thiết lập trình chiếu/.test(error.message) && /office:presentation/.test(error.message);
    }
    assert(threw, "phải ném khi FODP thiếu office:presentation");
  });

  await test("parseFodp sau overlay: dialog Set Up Show hiện lại đúng giá trị", () => {
    const overlaid = overlayFodpShowProperties(LO_FODP, PATCHED_PRESPROPS_XML);
    const parsed = new SlidesAdapter(null).parseFodp(overlaid);
    assert(parsed.length === 3, `slides=${parsed.length}`);
    assert(parsed.slideShowSettings?.loopUntilEsc === true, "loop");
    assert(parsed.slideShowSettings?.showWithoutNarration === true, "without narration");
    assert(parsed.slideShowSettings?.pointerColor === "#112233", parsed.slideShowSettings?.pointerColor);
  });

  await test("Save PPTX (Phase 3b) → Mở overlay → loadFromFodp khôi phục dialog", () => {
    const saved = new SlidesAdapter(setupCanvas({
      loopUntilEsc: true,
      showWithoutNarration: true,
      pointerColor: "#112233"
    }));
    const sourceFodp = saved.serializeToFodp();
    assert(fodpHasShowSetupPatch(sourceFodp), "serialize FODP phải có vno:*");
    const loZip = fakePptx(LO_PRESPROPS_XML);
    const loParsed = parseShowProperties(readZipEntry(loZip, PPTX_PRESPROPS_ENTRY).toString("utf8"));
    assert(loParsed.showNarration === true && loParsed.penRgb === "", "LO ZIP giả lập chưa vá");
    const nativePptx = postProcessSlidesPptx(loZip, { sourceFodp });
    const nativeProps = parseShowProperties(readZipEntry(nativePptx, PPTX_PRESPROPS_ENTRY).toString("utf8"));
    assert(nativeProps.showNarration === false, "Phase 3b phải ghi showNarration=0");
    assert(nativeProps.penRgb === "112233", nativeProps.penRgb);
    assert(nativeProps.loop === true, "Phase 3b giữ loop");

    assert(!fodpHasShowSetupPatch(LO_FODP), "soffice PPTX→FODP giả lập phải mất vno:*");
    const overlaid = overlaySlidesPptxFodp(nativePptx, LO_FODP);
    assert(fodpHasShowSetupPatch(overlaid), "overlay phải gắn lại vno:* từ PPTX gốc");
    assert(/presentation:endless="true"/.test(overlaid), "giữ endless");

    const canvas = setupCanvas({
      loopUntilEsc: false,
      showWithoutNarration: false,
      pointerColor: "#DC2626"
    });
    canvas.slides = [];
    const opened = new SlidesAdapter(canvas);
    opened.loadFromFodp(overlaid);
    assert(canvas.slideShowSettings.showWithoutNarration === true, "khôi phục không thuyết minh");
    assert(canvas.slideShowSettings.pointerColor === "#112233", canvas.slideShowSettings.pointerColor);
    assert(canvas.slideShowSettings.loopUntilEsc === true, "loop từ FODP soffice");
    assert(canvas.slides.length === 3, `slides=${canvas.slides.length}`);
  });

  await test("loadFromFodp(..., ooxmlPresPropsXml) overlay trước parseFodp", () => {
    const canvas = setupCanvas({
      loopUntilEsc: false,
      showWithoutNarration: false,
      pointerColor: "#DC2626"
    });
    canvas.slides = [];
    const adapter = new SlidesAdapter(canvas);
    assert(!fodpHasShowSetupPatch(LO_FODP));
    adapter.loadFromFodp(LO_FODP, LO_PRESENTATION_XML, "", PATCHED_PRESPROPS_XML);
    assert(canvas.slides.length === 3, `slides=${canvas.slides.length}`);
    assert(canvas.slideShowSettings.showWithoutNarration === true, "adapter phải khôi phục narration");
    assert(canvas.slideShowSettings.pointerColor === "#112233");
    assert(canvas.slideShowSettings.loopUntilEsc === true);
    assert(String(canvas.slides[0].title || "").includes("Mo dau"));
  });

  await test("SlidesAdapter.open() overlay từ payload ooxmlPresPropsXml", async () => {
    const canvas = setupCanvas({
      loopUntilEsc: false,
      showWithoutNarration: false,
      pointerColor: "#000000"
    });
    canvas.slides = [];
    const adapter = new SlidesAdapter(canvas);
    const origEngine = globalUnoBridge.hasRealEngine;
    const origApi = globalUnoBridge.desktopApi;
    globalUnoBridge.hasRealEngine = true;
    globalUnoBridge.desktopApi = {
      open_document_dialog: async () => ({
        status: "ok",
        content: LO_FODP,
        ooxmlPresentationXml: LO_PRESENTATION_XML,
        ooxmlPresPropsXml: PATCHED_PRESPROPS_XML,
        fileName: "BaiChieu.pptx"
      })
    };
    try {
      const ok = await adapter.open();
      assert(ok === true, "open() phải thành công");
      assert(canvas.slideShowSettings.showWithoutNarration === true, "open() phải khôi phục narration");
      assert(canvas.slideShowSettings.pointerColor === "#112233");
      assert(adapter.sourceFileName === "BaiChieu", adapter.sourceFileName);
    } finally {
      globalUnoBridge.hasRealEngine = origEngine;
      globalUnoBridge.desktopApi = origApi;
    }
  });

  await test("Python twin overlay FODP giống JS (CLI --overlay-fodp)", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-setup-show-open-"));
    try {
      const pptxPath = path.join(tempRoot, "deck.pptx");
      const fodpPath = path.join(tempRoot, "lo.fodp");
      const outPath = path.join(tempRoot, "overlaid.fodp");
      fs.writeFileSync(pptxPath, fakePptx(PATCHED_PRESPROPS_XML));
      fs.writeFileSync(fodpPath, LO_FODP, "utf8");
      const py = spawnSync(process.env.PYTHON || "python", [
        PYTHON_PATCHER,
        "--pptx", pptxPath,
        "--overlay-fodp", fodpPath,
        "--out", outPath
      ], { encoding: "utf8" });
      assert(py.status === 0, `Python overlay failed: ${(py.stderr || py.stdout || "").trim()}`);
      const pyFodp = fs.readFileSync(outPath, "utf8");
      const jsFodp = overlaySlidesPptxFodp(fs.readFileSync(pptxPath), LO_FODP);
      assert(fodpHasShowSetupPatch(pyFodp), "Python phải gắn vno:*");
      assert(jsFodp === pyFodp, "JS và Python overlay phải ra cùng FODP");
      const parsed = parseShowSettingsFromFodp(pyFodp);
      assert(parsed.showWithoutNarration === true, "python narration");
      assert(parsed.pointerColor === "#112233", parsed.pointerColor);
      assert(parsed.loopUntilEsc === true, "python loop");
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  await test("ZIP hỏng thì ném, không gán bừa", () => {
    let threw = false;
    try {
      overlaySlidesPptxFodp(Buffer.from("not-a-zip"), LO_FODP);
    } catch (error) {
      threw = /ZIP/i.test(error.message);
    }
    assert(threw, "phải ném khi ZIP hỏng");
  });

  return results;
}
