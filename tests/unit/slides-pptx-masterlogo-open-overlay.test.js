/**
 * Unit tests — Slides native PPTX open overlay
 * (VNOfficeMasterLogo p:sp → vno:master-theme).
 * LibreOffice PPTX→FODP drops vno:master-theme / grMasterLogo; overlay FODP
 * before parseFodp. Identify ONLY by name="VNOfficeMasterLogo". No soffice.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import {
  MASTER_LOGO_SHAPE_NAME,
  applyMasterLogoShape,
  findNamedLogoShapes,
  fodpHasMasterLogo,
  overlayFodpMasterLogo,
  parseMasterLogoFromFodp,
  parseMasterLogoFromSlideMaster
} from "../../adapters/libreoffice/slides/pptx-master-logo.js";
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

const LOGO = "VN OFFICE • SANG TAO";

const LO_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="PlaceHolder 1"/><p:cNvSpPr/><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="504000" y="226080"/><a:ext cx="9071640" cy="946440"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Title</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sldMaster>`;

const LO_PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="10080625" cy="5670550"/></p:presentation>`;

const LO_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:master-styles>
    <style:master-page style:name="Default" style:page-layout-name="PM1" draw:style-name="dp1">
      <draw:custom-shape draw:name="VNOfficeMasterLogo">
        <text:p><text:span>${LOGO}</text:span></text:p>
      </draw:custom-shape>
    </style:master-page>
  </office:master-styles>
  <office:body><office:presentation>
    <draw:page draw:name="Mo dau">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Mo dau</text:p></draw:text-box></draw:frame>
    </draw:page>
  </office:presentation></office:body>
</office:document>
`;

const FODP_NO_MASTER_PAGE = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:body><office:presentation><draw:page draw:name="Mo dau"/></office:presentation></office:body>
</office:document>
`;

function themeCanvas() {
  return {
    masterTheme: {
      id: "corporate-red",
      fontFamily: "'Times New Roman', serif",
      titleColor: "#991b1b",
      bodyColor: "#1f2937",
      accentColor: "#b53818",
      bgColor: "#fffdfa",
      logoText: LOGO,
      footerText: "Bao mat noi bo"
    },
    slides: [
      { id: 1, title: "Mo dau", body: "Slide mot", layoutType: "title-content", notes: "", shapes: [] }
    ],
    applySlideMaster(theme) {
      this.masterTheme = { ...this.masterTheme, ...theme };
    },
    selectSlide() {}
  };
}

function patchedMaster(logoText = LOGO) {
  return applyMasterLogoShape(LO_MASTER_XML, {
    logoText,
    accentColor: "#b53818",
    fontFamily: "Times New Roman",
    slideCx: 10080625,
    slideCy: 5670550
  });
}

function fakePptx(masterXml = patchedMaster(), presentationXml = LO_PRESENTATION_XML) {
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "ppt/presentation.xml", data: presentationXml },
    { name: "ppt/slideMasters/slideMaster1.xml", data: masterXml },
    { name: "ppt/slides/slide1.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' }
  ]);
}

function extraSimilarSp(masterXml) {
  return masterXml.replace(
    "</p:spTree>",
    `<p:sp><p:nvSpPr><p:cNvPr id="9" name="OtherText"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="vi-VN" sz="1200" b="1"><a:solidFill><a:srgbClr val="B53818"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>NOT THE LOGO</a:t></a:r></a:p></p:txBody></p:sp></p:spTree>`
  );
}

export async function runSlidesPptxMasterLogoOpenOverlayTests() {
  const results = [];
  const test = async (name, callback) => {
    try {
      await callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("overlayFodpMasterLogo: gắn vno:master-theme từ p:sp VNOfficeMasterLogo, không đoán", () => {
    assert(!fodpHasMasterLogo(LO_FODP), "FODP soffice giả lập chưa có vno:master-theme/grMasterLogo");
    assert(!/xmlns:vno=/.test(LO_FODP), "soffice FODP không có xmlns:vno");
    const master = patchedMaster();
    const named = parseMasterLogoFromSlideMaster(master);
    assert(named.logoText === LOGO, named.logoText);
    assert(named.accentColor === "#b53818", named.accentColor);
    assert(named.fontFamily === "Times New Roman", named.fontFamily);
    const next = overlayFodpMasterLogo(LO_FODP, master);
    assert(fodpHasMasterLogo(next), "sau overlay phải có logo");
    assert(/xmlns:vno="urn:vn-office:slides:1.0"/.test(next), "phải khai báo xmlns:vno");
    const parsed = parseMasterLogoFromFodp(next);
    assert(parsed.logoText === LOGO, parsed.logoText);
    assert(parsed.accentColor === "#b53818", parsed.accentColor);
    assert(parsed.fontFamily === "Times New Roman", parsed.fontFamily);
    assert(next.includes("Mo dau"), "giữ nội dung FODP");
    assert(next.includes(`draw:name="${MASTER_LOGO_SHAPE_NAME}"`), "giữ custom-shape soffice");
  });

  await test("overlay no-op khi PPTX không có VNOfficeMasterLogo — không đoán p:sp khác", () => {
    const withSimilar = extraSimilarSp(LO_MASTER_XML);
    const next = overlayFodpMasterLogo(LO_FODP, withSimilar);
    assert(next === LO_FODP, "không sửa FODP khi thiếu tên VNOfficeMasterLogo");
    assert(!fodpHasMasterLogo(next), "không tự bịa logo từ p:sp khác");
  });

  await test("overlay idempotent", () => {
    const master = patchedMaster();
    const once = overlayFodpMasterLogo(LO_FODP, master);
    const twice = overlayFodpMasterLogo(once, master);
    assert(once === twice, "idempotent khi đã gắn vno:master-theme");
  });

  await test("nhiều VNOfficeMasterLogo / mang p:ph / thiếu a:t / master-page lệch → ném, không đoán", () => {
    const one = patchedMaster();
    const named = findNamedLogoShapes(one)[0];
    assert(named, "fixture Phase 2b phải có đúng một VNOfficeMasterLogo");
    const dup = one.replace("</p:spTree>", `${named}</p:spTree>`);
    let dupThrew = false;
    try {
      overlayFodpMasterLogo(LO_FODP, dup);
    } catch (error) {
      dupThrew = /không đoán/.test(error.message) && /2 shape/.test(error.message);
    }
    assert(dupThrew, "phải ném khi hai shape trùng tên trên một master");

    const withPh = one.replace(named, named.replace("<p:nvPr/>", '<p:nvPr><p:ph type="title"/></p:nvPr>'));
    let phThrew = false;
    try {
      overlayFodpMasterLogo(LO_FODP, withPh);
    } catch (error) {
      phThrew = /không đoán/.test(error.message) && /p:ph/.test(error.message);
    }
    assert(phThrew, "phải ném khi shape tên logo mang p:ph");

    const emptyText = one.replace(`<a:t>${LOGO}</a:t>`, "<a:t>   </a:t>");
    let emptyThrew = false;
    try {
      overlayFodpMasterLogo(LO_FODP, emptyText);
    } catch (error) {
      emptyThrew = /không đoán/.test(error.message) && /a:t/.test(error.message);
    }
    assert(emptyThrew, "phải ném khi VNOfficeMasterLogo thiếu chữ");

    const conflict = [patchedMaster("AAA"), patchedMaster("BBB")];
    let conflictThrew = false;
    try {
      overlayFodpMasterLogo(LO_FODP, conflict);
    } catch (error) {
      conflictThrew = /không đoán/.test(error.message) && /Hai slide master/.test(error.message);
    }
    assert(conflictThrew, "phải ném khi hai master khác chữ");

    let pageThrew = false;
    try {
      overlayFodpMasterLogo(FODP_NO_MASTER_PAGE, patchedMaster());
    } catch (error) {
      pageThrew = /không gắn logo master/.test(error.message) && /master-page/.test(error.message);
    }
    assert(pageThrew, "phải ném khi FODP thiếu style:master-page");
  });

  await test("parseFodp sau overlay: masterTheme.logoText/accentColor/fontFamily", () => {
    const overlaid = overlayFodpMasterLogo(LO_FODP, patchedMaster());
    const parsed = new SlidesAdapter(null).parseFodp(overlaid);
    assert(parsed.length === 1, `slides=${parsed.length}`);
    assert(parsed.masterTheme?.logoText === LOGO, JSON.stringify(parsed.masterTheme));
    assert(parsed.masterTheme?.accentColor === "#b53818", parsed.masterTheme?.accentColor);
    assert(parsed.masterTheme?.fontFamily === "Times New Roman", parsed.masterTheme?.fontFamily);
  });

  await test("Save PPTX (Phase 2b) → Mở overlay → loadFromFodp khôi phục logo canvas", () => {
    const saved = new SlidesAdapter(themeCanvas());
    const sourceFodp = saved.serializeToFodp();
    assert(fodpHasMasterLogo(sourceFodp), "serialize FODP phải có logo");
    const loZip = fakePptx(LO_MASTER_XML);
    assert(!String(readZipEntry(loZip, "ppt/slideMasters/slideMaster1.xml")).includes(MASTER_LOGO_SHAPE_NAME));
    const nativePptx = postProcessSlidesPptx(loZip, { sourceFodp });
    const nativeMaster = readZipEntry(nativePptx, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
    assert(nativeMaster.includes(MASTER_LOGO_SHAPE_NAME), "Phase 2b phải ghi VNOfficeMasterLogo");

    assert(!fodpHasMasterLogo(LO_FODP), "soffice PPTX→FODP giả lập phải mất vno:master-theme");
    const overlaid = overlaySlidesPptxFodp(nativePptx, LO_FODP);
    assert(fodpHasMasterLogo(overlaid), "overlay phải gắn lại vno:master-theme từ PPTX gốc");

    const canvas = themeCanvas();
    canvas.slides = [];
    canvas.masterTheme = { logoText: "KHAC", accentColor: "#000000", fontFamily: "Arial", bgColor: "#ffffff" };
    const opened = new SlidesAdapter(canvas);
    opened.loadFromFodp(overlaid);
    assert(canvas.masterTheme.logoText === LOGO, canvas.masterTheme.logoText);
    assert(canvas.masterTheme.accentColor === "#b53818", canvas.masterTheme.accentColor);
    assert(canvas.masterTheme.fontFamily === "Times New Roman", canvas.masterTheme.fontFamily);
    assert(canvas.slides.length === 1, `slides=${canvas.slides.length}`);
  });

  await test("loadFromFodp(fodp, presentationXml, slideMasterXml) overlay trước parseFodp", () => {
    const canvas = themeCanvas();
    canvas.slides = [];
    canvas.masterTheme = { logoText: "KHAC", accentColor: "#000000", fontFamily: "Arial", bgColor: "#ffffff" };
    const adapter = new SlidesAdapter(canvas);
    assert(!fodpHasMasterLogo(LO_FODP));
    adapter.loadFromFodp(LO_FODP, LO_PRESENTATION_XML, patchedMaster());
    assert(canvas.slides.length === 1, `slides=${canvas.slides.length}`);
    assert(canvas.masterTheme.logoText === LOGO, "adapter phải khôi phục logo");
    assert(canvas.masterTheme.accentColor === "#b53818");
    assert(String(canvas.slides[0].title || "").includes("Mo dau"));
  });

  await test("SlidesAdapter.open() overlay từ payload ooxmlSlideMasterXml", async () => {
    const canvas = themeCanvas();
    canvas.slides = [];
    canvas.masterTheme = { logoText: "KHAC", accentColor: "#000000", fontFamily: "Arial", bgColor: "#ffffff" };
    const adapter = new SlidesAdapter(canvas);
    const origEngine = globalUnoBridge.hasRealEngine;
    const origApi = globalUnoBridge.desktopApi;
    globalUnoBridge.hasRealEngine = true;
    globalUnoBridge.desktopApi = {
      open_document_dialog: async () => ({
        status: "ok",
        content: LO_FODP,
        ooxmlPresentationXml: LO_PRESENTATION_XML,
        ooxmlSlideMasterXml: patchedMaster(),
        fileName: "BaiChieu.pptx"
      })
    };
    try {
      const ok = await adapter.open();
      assert(ok === true, "open() phải thành công");
      assert(canvas.masterTheme.logoText === LOGO, "open() phải khôi phục logo");
      assert(adapter.sourceFileName === "BaiChieu", adapter.sourceFileName);
    } finally {
      globalUnoBridge.hasRealEngine = origEngine;
      globalUnoBridge.desktopApi = origApi;
    }
  });

  await test("Python twin overlay FODP giống JS (CLI --overlay-fodp)", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-logo-open-"));
    try {
      const pptxPath = path.join(tempRoot, "deck.pptx");
      const fodpPath = path.join(tempRoot, "lo.fodp");
      const outPath = path.join(tempRoot, "overlaid.fodp");
      fs.writeFileSync(pptxPath, fakePptx(patchedMaster()));
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
      assert(fodpHasMasterLogo(pyFodp), "Python phải gắn vno:master-theme");
      assert(jsFodp === pyFodp, "JS và Python overlay phải ra cùng FODP");
      const parsed = parseMasterLogoFromFodp(pyFodp);
      assert(parsed.logoText === LOGO, parsed.logoText);
      assert(parsed.accentColor === "#b53818", parsed.accentColor);
      assert(parsed.fontFamily === "Times New Roman", parsed.fontFamily);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  return results;
}
