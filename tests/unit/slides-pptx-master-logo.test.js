/**
 * Unit tests — Slides native PPTX post-process (Slide Master logo p:sp).
 * No soffice. Fake OOXML ZIP + the real LibreOffice slideMaster1.xml shape
 * from the Phase 2b probe (5 placeholders, ids 1–6, no logo).
 */
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import {
  MASTER_LOGO_SHAPE_NAME,
  applyMasterLogoShape,
  chooseMasterLogoBox,
  fodpHasMasterLogo,
  masterHasLogoShape,
  parseMasterLogoFromFodp,
  parsePlaceholderBoxes,
  parseSlideSize
} from "../../adapters/libreoffice/slides/pptx-master-logo.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import { createZip, readZipEntry } from "../helpers/zip-package.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Coordinates and ids from soffice FODP→PPTX probe (28cm × 15.75cm). */
const LO_MASTER_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="PlaceHolder 1"></p:cNvPr><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="504000" y="226080"/><a:ext cx="9071640" cy="946440"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Click to edit the title text format</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="PlaceHolder 2"></p:cNvPr><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="504000" y="1326600"/><a:ext cx="9071640" cy="3288240"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>Click to edit the outline text format</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="4" name="PlaceHolder 3"></p:cNvPr><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="dt" idx="1"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="504000" y="5165280"/><a:ext cx="2348280" cy="390600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>&lt;date/time&gt;</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="5" name="PlaceHolder 4"></p:cNvPr><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="ftr" idx="2"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="3447360" y="5165280"/><a:ext cx="3195000" cy="390600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>&lt;footer&gt;</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:cNvPr id="6" name="PlaceHolder 5"></p:cNvPr><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldNum" idx="3"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="7227360" y="5165280"/><a:ext cx="2348280" cy="390600"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>&lt;number&gt;</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId2"/></p:sldLayoutIdLst></p:sldMaster>`;

const LO_PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="10080625" cy="5670550"/></p:presentation>`;

const LOGO = "VN OFFICE • SANG TAO";

function fakePptx(masterXml, presentationXml = LO_PRESENTATION_XML) {
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "ppt/presentation.xml", data: presentationXml },
    { name: "ppt/slideMasters/slideMaster1.xml", data: masterXml },
    { name: "ppt/slides/slide1.xml", data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>' }
  ]);
}

function logoShape(xml) {
  const blocks = String(xml).match(/<(?:[\w]+:)?sp\b[\s\S]*?<\/(?:[\w]+:)?sp>/gi) || [];
  return blocks.find((sp) => sp.includes(MASTER_LOGO_SHAPE_NAME)) || "";
}

function overlaps(a, b) {
  return a.x < b.x + b.cx && a.x + a.cx > b.x && a.y < b.y + b.cy && a.y + a.cy > b.y;
}

function boxOf(shapeXml) {
  const off = shapeXml.match(/<(?:[\w]+:)?off\b[^>]*>/i)?.[0] || "";
  const ext = shapeXml.match(/<(?:[\w]+:)?ext\b[^>]*>/i)?.[0] || "";
  return {
    x: Number(off.match(/\bx=["'](-?\d+)["']/i)?.[1] || 0),
    y: Number(off.match(/\by=["'](-?\d+)["']/i)?.[1] || 0),
    cx: Number(ext.match(/\bcx=["'](\d+)["']/i)?.[1] || 0),
    cy: Number(ext.match(/\bcy=["'](\d+)["']/i)?.[1] || 0)
  };
}

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
    ]
  };
}

export async function runSlidesPptxMasterLogoTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("FODP serialize: đọc logo + accent từ vno:master-theme", () => {
    const fodp = new SlidesAdapter(themeCanvas()).serializeToFodp();
    assert(fodpHasMasterLogo(fodp), "FODP phải có logo");
    const parsed = parseMasterLogoFromFodp(fodp);
    assert(parsed.logoText === LOGO, `logo=${parsed.logoText}`);
    assert(parsed.accentColor === "#b53818", `accent=${parsed.accentColor}`);
    assert(/Times New Roman/.test(parsed.fontFamily), `font=${parsed.fontFamily}`);
  });

  test("LibreOffice slideMaster1.xml: chèn p:sp không p:ph, id=7, đúng chữ", () => {
    assert(!masterHasLogoShape(LO_MASTER_XML, LOGO), "probe LO chưa có logo");
    const next = applyMasterLogoShape(LO_MASTER_XML, {
      logoText: LOGO,
      accentColor: "#b53818",
      fontFamily: "'Times New Roman', serif",
      slideCx: 10080625,
      slideCy: 5670550
    });
    const sp = logoShape(next);
    assert(sp, "thiếu p:sp VNOfficeMasterLogo");
    assert(!/<(?:[\w]+:)?ph\b/i.test(sp), "logo không được là placeholder");
    assert(/<(?:p:)?nvPr\s*\/>/i.test(sp) || /<(?:p:)?nvPr><\/(?:p:)?nvPr>/i.test(sp), "nvPr rỗng (không p:ph)");
    assert(/id="7"/.test(sp), `id phải 7 (max probe=6). sp=${sp.slice(0, 180)}`);
    assert(sp.includes(LOGO), "a:t phải chứa logo");
    assert(/val="B53818"/i.test(sp), "màu accent");
    assert(/typeface="Times New Roman"/i.test(sp), "font latin");
    assert((next.match(/<(?:p:)?sp\b/gi) || []).length === 6, "5 placeholder + 1 logo");
    assert(masterHasLogoShape(next, LOGO), "detector phải thấy logo");
  });

  test("Tọa độ logo không đè 5 placeholder probe", () => {
    const placeholders = parsePlaceholderBoxes(LO_MASTER_XML);
    assert(placeholders.length === 5, `ph=${placeholders.length}`);
    const next = applyMasterLogoShape(LO_MASTER_XML, {
      logoText: LOGO,
      slideCx: 10080625,
      slideCy: 5670550
    });
    const box = boxOf(logoShape(next));
    assert(box.cx > 0 && box.cy > 0, JSON.stringify(box));
    for (const ph of placeholders) {
      assert(!overlaps(box, ph), `đè placeholder ${JSON.stringify(ph)} logo=${JSON.stringify(box)}`);
    }
    const chosen = chooseMasterLogoBox({ cx: 10080625, cy: 5670550 }, placeholders);
    assert(chosen.y + chosen.cy <= 226080, `phải nằm trên title y=226080, box=${JSON.stringify(chosen)}`);
  });

  test("Idempotent: vá lần hai không nhân đôi shape", () => {
    const once = applyMasterLogoShape(LO_MASTER_XML, { logoText: LOGO, slideCx: 10080625, slideCy: 5670550 });
    const twice = applyMasterLogoShape(once, { logoText: LOGO, slideCx: 10080625, slideCy: 5670550 });
    assert((twice.match(/VNOfficeMasterLogo/g) || []).length === 1, "một shape");
    assert((twice.match(/<(?:p:)?sp\b/gi) || []).length === 6, "vẫn 6 sp");
  });

  test("Escape XML trong a:t; no-op khi không có logo", () => {
    const next = applyMasterLogoShape(LO_MASTER_XML, {
      logoText: 'A & B <C> "D"',
      slideCx: 10080625,
      slideCy: 5670550
    });
    const sp = logoShape(next);
    assert(sp.includes("A &amp; B &lt;C&gt;"), sp.slice(-200));
    assert(!sp.includes("A & B <C>"), "không nhét raw <");
    const empty = applyMasterLogoShape(LO_MASTER_XML, { logoText: "   ", slideCx: 10080625, slideCy: 5670550 });
    assert(empty === LO_MASTER_XML, "logo trống không sửa XML");
  });

  test("parseSlideSize đọc p:sldSz probe", () => {
    const size = parseSlideSize(LO_PRESENTATION_XML);
    assert(size.cx === 10080625 && size.cy === 5670550, JSON.stringify(size));
  });

  test("postProcessSlidesPptx ghi logo vào slideMaster1.xml; không đụng slide1", () => {
    const zip = fakePptx(LO_MASTER_XML);
    const fodp = new SlidesAdapter(themeCanvas()).serializeToFodp();
    const patched = postProcessSlidesPptx(zip, { sourceFodp: fodp });
    const xml = readZipEntry(patched, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
    assert(masterHasLogoShape(xml, LOGO), xml.slice(0, 300));
    const slide = readZipEntry(patched, "ppt/slides/slide1.xml").toString("utf8");
    assert(/<p:sld\b/.test(slide), "giữ slide1");
  });

  test("postProcessSlidesPptx không đụng slideMaster/slide khi FODP không có logo (chỉ còn tự sửa khổ trang thật)", () => {
    // LO_PRESENTATION_XML mô phỏng đúng khổ mặc định SAI mà soffice thật luôn ghi
    // (28cm x 15.75cm, xem docs/HANDOFF-SLIDES-SLIDESIZE-EXPORT-FIX.md) - khác
    // khổ 25.4cm x 14.287cm mà canvas.slideSize mặc định (960x540) thật sự dùng,
    // nên hàm KHÔNG còn no-op tuyệt đối nữa: nó tự sửa lại <p:sldSz> đúng khổ
    // thật độc lập với logo, đây là hành vi ĐÚNG và có chủ đích, không phải lỗi.
    const zip = fakePptx(LO_MASTER_XML);
    const fodp = new SlidesAdapter({
      slides: [{ id: 1, title: "A", body: "B", layoutType: "title-content", notes: "", shapes: [] }]
    }).serializeToFodp();
    assert(!fodpHasMasterLogo(fodp), "không theme thì không logo");
    const patched = postProcessSlidesPptx(zip, { sourceFodp: fodp });
    assert(Buffer.compare(zip, patched) !== 0, "phải có thay đổi: tự sửa khổ trang thật dù không có logo");
    const master = readZipEntry(patched, "ppt/slideMasters/slideMaster1.xml").toString("utf8");
    assert(!masterHasLogoShape(master, LOGO), "không có logo thì slideMaster không được thêm hình logo nào");
    const slide = readZipEntry(patched, "ppt/slides/slide1.xml").toString("utf8");
    assert(/<p:sld\b/.test(slide), "giữ nguyên slide1, không đụng vào");
    const presentation = readZipEntry(patched, "ppt/presentation.xml").toString("utf8");
    const size = parseSlideSize(presentation);
    assert(size.cx === Math.round(25.4 * 360000), `sldSz cx phải sửa đúng 25.4cm (khổ 960px mặc định), nhận ${size.cx}`);
  });

  return results;
}
