/**
 * Unit tests — Slides native PPTX post-process (p14:sectionLst).
 * No soffice. Fake OOXML ZIP + the real LibreOffice presentation.xml from
 * the p14 probe (6 sldId 256–261, p14 ns declared, no extLst).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { parseSlideSize } from "../../adapters/libreoffice/slides/pptx-master-logo.js";
import {
  DEFAULT_SECTION_NAME,
  SECTION_LIST_URI,
  applySectionList,
  applySectionListFromFodp,
  fodpHasSections,
  parseFodpPages,
  parsePresentationSlideIds,
  parseSectionList,
  parseSectionsFromFodp,
  presentationHasSectionList,
  sectionGuidFromId
} from "../../adapters/libreoffice/slides/pptx-section-list.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import { createZip, readZipEntry } from "../helpers/zip-package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PYTHON_PATCHER = path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Compact presentation.xml from soffice FODP→PPTX probe (6 slides, no extLst). */
const LO_PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" xmlns:p15="http://schemas.microsoft.com/office/powerpoint/2012/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId4"/><p:sldId id="258" r:id="rId5"/><p:sldId id="259" r:id="rId6"/><p:sldId id="260" r:id="rId7"/><p:sldId id="261" r:id="rId8"/></p:sldIdLst><p:sldSz cx="10080625" cy="5670550"/><p:notesSz cx="7559675" cy="10691813"/></p:presentation>`;

const MINIMAL_PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><p:sldIdLst><p:sldId id="256" r:id="rId2"/><p:sldId id="257" r:id="rId3"/></p:sldIdLst><p:sldSz cx="10080625" cy="5670550"/></p:presentation>`;

function sectionedCanvas() {
  return {
    sections: [
      { id: "section-intro", name: "Gioi thieu" },
      { id: "section-body", name: "Noi dung chinh" }
    ],
    slides: [
      { id: 1, title: "Mo dau 1", body: "A1", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-intro" },
      { id: 2, title: "Mo dau 2", body: "A2", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-intro" },
      { id: 3, title: "Mo dau 3", body: "A3", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-intro" },
      { id: 4, title: "Noi dung 1", body: "B1", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-body" },
      { id: 5, title: "Noi dung 2", body: "B2", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-body" },
      { id: 6, title: "Noi dung 3", body: "B3", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-body" }
    ]
  };
}

function fakePptx(presentationXml = LO_PRESENTATION_XML, slideCount = 6) {
  const slides = [];
  for (let i = 1; i <= slideCount; i++) {
    slides.push({
      name: `ppt/slides/slide${i}.xml`,
      data: '<?xml version="1.0"?><p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>'
    });
  }
  return createZip([
    { name: "[Content_Types].xml", data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>' },
    { name: "ppt/presentation.xml", data: presentationXml },
    { name: "ppt/slideMasters/slideMaster1.xml", data: '<?xml version="1.0"?><p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree></p:spTree></p:cSld></p:sldMaster>' },
    ...slides
  ]);
}

export async function runSlidesPptxSectionListTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("FODP serialize: 2 phần × 3 trang, vno:section-* trên draw:page", () => {
    const fodp = new SlidesAdapter(sectionedCanvas()).serializeToFodp();
    assert(fodpHasSections(fodp), "FODP phải có section");
    const pages = parseFodpPages(fodp);
    assert(pages.length === 6, `pages=${pages.length}`);
    assert(pages.slice(0, 3).every((p) => p.sectionId === "section-intro" && p.sectionName === "Gioi thieu"), JSON.stringify(pages.slice(0, 3)));
    assert(pages.slice(3).every((p) => p.sectionId === "section-body" && p.sectionName === "Noi dung chinh"), JSON.stringify(pages.slice(3)));
    const groups = parseSectionsFromFodp(fodp);
    assert(groups.length === 2, `groups=${groups.length}`);
    assert(groups[0].pageIndexes.join(",") === "0,1,2", String(groups[0].pageIndexes));
    assert(groups[1].pageIndexes.join(",") === "3,4,5", String(groups[1].pageIndexes));
  });

  test("Probe presentation.xml: đọc đúng sldId 256–261, chưa có sectionLst", () => {
    const ids = parsePresentationSlideIds(LO_PRESENTATION_XML);
    assert(ids.join(",") === "256,257,258,259,260,261", ids.join(","));
    assert(!presentationHasSectionList(LO_PRESENTATION_XML), "probe LO không sinh p14:sectionLst");
  });

  test("applySectionListFromFodp: p14:sectionLst đúng tên + đúng id thật, không đoán", () => {
    const fodp = new SlidesAdapter(sectionedCanvas()).serializeToFodp();
    const next = applySectionListFromFodp(LO_PRESENTATION_XML, fodp);
    assert(presentationHasSectionList(next), "thiếu uri sectionLst");
    assert(next.includes(SECTION_LIST_URI), "thiếu URI {521415D9-...}");
    assert(/xmlns:p14="http:\/\/schemas\.microsoft\.com\/office\/powerpoint\/2010\/main"/.test(next), "thiếu xmlns p14");
    const parsed = parseSectionList(next);
    assert(parsed.length === 2, `sections=${parsed.length}`);
    assert(parsed[0].name === "Gioi thieu", parsed[0].name);
    assert(parsed[0].slideIds.join(",") === "256,257,258", parsed[0].slideIds.join(","));
    assert(parsed[1].name === "Noi dung chinh", parsed[1].name);
    assert(parsed[1].slideIds.join(",") === "259,260,261", parsed[1].slideIds.join(","));
    assert(parsed[0].id === sectionGuidFromId("section-intro"), parsed[0].id);
    assert(parsed[1].id === sectionGuidFromId("section-body"), parsed[1].id);
    assert(parsePresentationSlideIds(next).join(",") === "256,257,258,259,260,261", "không được đọc nhầm p14:sldIdLst");
  });

  test("Idempotent: vá lần hai không nhân đôi ext; no-op khi FODP không có phần", () => {
    const fodp = new SlidesAdapter(sectionedCanvas()).serializeToFodp();
    const once = applySectionListFromFodp(LO_PRESENTATION_XML, fodp);
    const twice = applySectionListFromFodp(once, fodp);
    assert(once === twice, "XML phải ổn định");
    assert((twice.match(/<(?:[\w]+:)?sectionLst\b/g) || []).length === 1, "một sectionLst");
    const empty = new SlidesAdapter({
      slides: [{ id: 1, title: "A", body: "B", layoutType: "title-content", notes: "", shapes: [] }]
    }).serializeToFodp();
    assert(!fodpHasSections(empty), "không section");
    assert(applySectionListFromFodp(LO_PRESENTATION_XML, empty) === LO_PRESENTATION_XML, "no-op");
  });

  test("Trang chưa nhóm → Default Section; lệch số trang thì ném, không đoán id", () => {
    const fodp = new SlidesAdapter({
      sections: [{ id: "section-body", name: "Noi dung" }],
      slides: [
        { id: 1, title: "A", body: "1", layoutType: "title-content", notes: "", shapes: [] },
        { id: 2, title: "B", body: "2", layoutType: "title-content", notes: "", shapes: [], sectionId: "section-body" }
      ]
    }).serializeToFodp();
    const next = applySectionListFromFodp(MINIMAL_PRESENTATION_XML, fodp);
    const parsed = parseSectionList(next);
    assert(parsed.length === 2, `sections=${parsed.length}`);
    assert(parsed[0].name === DEFAULT_SECTION_NAME, parsed[0].name);
    assert(parsed[0].slideIds.join(",") === "256", parsed[0].slideIds.join(","));
    assert(parsed[1].name === "Noi dung", parsed[1].name);
    assert(parsed[1].slideIds.join(",") === "257", parsed[1].slideIds.join(","));
    let threw = false;
    try {
      applySectionListFromFodp(MINIMAL_PRESENTATION_XML, new SlidesAdapter(sectionedCanvas()).serializeToFodp());
    } catch (error) {
      threw = /không đoán id/.test(error.message);
    }
    assert(threw, "phải từ chối khi sldIdLst ≠ số draw:page");
  });

  test("Escape XML trong name; chèn xmlns:p14 khi presentation chưa có", () => {
    const next = applySectionList(MINIMAL_PRESENTATION_XML, [
      { name: 'A & B <C> "D"', sourceId: "sec-x", slideIds: ["256", "257"] }
    ]);
    assert(next.includes("A &amp; B &lt;C&gt; &quot;D&quot;"), next.slice(-400));
    assert(!next.includes('name="A & B <C>'), "không nhét raw <");
    assert(/<p14:sectionLst xmlns:p14=/.test(next), "khai báo p14 trên sectionLst");
    assert(presentationHasSectionList(next), "có uri");
  });

  test("postProcessSlidesPptx ghi p14:sectionLst vào presentation.xml; không đụng slide1", () => {
    const zip = fakePptx();
    const fodp = new SlidesAdapter(sectionedCanvas()).serializeToFodp();
    const patched = postProcessSlidesPptx(zip, { sourceFodp: fodp });
    const xml = readZipEntry(patched, "ppt/presentation.xml").toString("utf8");
    const parsed = parseSectionList(xml);
    assert(parsed.length === 2, `sections=${parsed.length}`);
    assert(parsed[0].slideIds.join(",") === "256,257,258", parsed[0].slideIds.join(","));
    const slide = readZipEntry(patched, "ppt/slides/slide1.xml").toString("utf8");
    assert(/<p:sld\b/.test(slide), "giữ slide1");
    // Không sectionLst nào được thêm khi FODP không có phần - nhưng vẫn KHÔNG
    // còn là no-op tuyệt đối: khổ trang thật (25.4cm, canvas mặc định 960px) vẫn
    // được tự sửa lại độc lập, vì LO_PRESENTATION_XML mô phỏng đúng khổ SAI mà
    // soffice thật luôn ghi (28cm x 15.75cm) - xem docs/HANDOFF-SLIDES-SLIDESIZE-EXPORT-FIX.md.
    const noSectionFodp = new SlidesAdapter({
      slides: Array.from({ length: 6 }, (_, i) => ({
        id: i + 1, title: `T${i}`, body: "x", layoutType: "title-content", notes: "", shapes: []
      }))
    }).serializeToFodp();
    const noop = postProcessSlidesPptx(zip, { sourceFodp: noSectionFodp });
    assert(Buffer.compare(zip, noop) !== 0, "phải có thay đổi: tự sửa khổ trang thật dù không có phần nào");
    const noopPresentation = readZipEntry(noop, "ppt/presentation.xml").toString("utf8");
    assert(!presentationHasSectionList(noopPresentation), "không có phần thì không được thêm sectionLst");
    const noopSize = parseSlideSize(noopPresentation);
    assert(noopSize.cx === Math.round(25.4 * 360000), `sldSz cx phải sửa đúng 25.4cm, nhận ${noopSize.cx}`);
  });

  test("JS GUID UUID v5 khớp Python twin; Python CLI vá PPTX giống JS", () => {
    const expectedIntro = sectionGuidFromId("section-intro");
    assert(/^\{[0-9A-F]{8}-[0-9A-F]{4}-5[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}\}$/.test(expectedIntro), expectedIntro);
    const pyGuid = spawnSync(process.env.PYTHON || "python", [
      "-c",
      "import uuid; print('{' + str(uuid.uuid5(uuid.NAMESPACE_URL, 'urn:vn-office:slides:section:section-intro')).upper() + '}')"
    ], { encoding: "utf8" });
    assert(pyGuid.status === 0, `python uuid failed: ${(pyGuid.stderr || "").trim()}`);
    assert(pyGuid.stdout.trim() === expectedIntro, `js=${expectedIntro} py=${pyGuid.stdout.trim()}`);

    const zipPath = path.join(os.tmpdir(), `vno-p14-sec-${Date.now()}.pptx`);
    const fodpPath = path.join(os.tmpdir(), `vno-p14-sec-${Date.now()}.fodp`);
    const outPath = path.join(os.tmpdir(), `vno-p14-sec-${Date.now()}-out.pptx`);
    const fodp = new SlidesAdapter(sectionedCanvas()).serializeToFodp();
    fs.writeFileSync(zipPath, fakePptx());
    fs.writeFileSync(fodpPath, fodp, "utf8");
    const py = spawnSync(process.env.PYTHON || "python", [
      PYTHON_PATCHER, "--pptx", zipPath, "--fodp", fodpPath, "--out", outPath
    ], { encoding: "utf8" });
    assert(py.status === 0, `Python patcher failed: ${(py.stderr || py.stdout || "").trim()}`);
    const pyXml = readZipEntry(outPath, "ppt/presentation.xml").toString("utf8");
    const jsXml = applySectionListFromFodp(LO_PRESENTATION_XML, fodp);
    const pyParsed = parseSectionList(pyXml);
    const jsParsed = parseSectionList(jsXml);
    assert(JSON.stringify(pyParsed) === JSON.stringify(jsParsed), `py=${JSON.stringify(pyParsed)} js=${JSON.stringify(jsParsed)}`);
    try { fs.unlinkSync(zipPath); fs.unlinkSync(fodpPath); fs.unlinkSync(outPath); } catch { /* ignore */ }
  });

  return results;
}
