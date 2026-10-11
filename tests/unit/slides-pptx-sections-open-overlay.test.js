/**
 * Unit tests — Slides native PPTX open overlay (p14:sectionLst → vno:section-*).
 * LibreOffice PPTX→FODP drops sections; overlay FODP before parseFodp.
 * No soffice. Fake OOXML ZIP + serialize/parse of a real SlidesAdapter canvas.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import {
  applySectionList,
  applySectionListFromFodp,
  fodpHasSections,
  isBracedGuid,
  overlayFodpSections,
  parseFodpPages,
  parseSectionList,
  parseSectionsFromFodp,
  presentationHasSectionList,
  sectionGuidFromId
} from "../../adapters/libreoffice/slides/pptx-section-list.js";
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
    ],
    selectSlide() {}
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

function stripVnoSections(fodp) {
  return String(fodp)
    .replace(/\s*vno:section-id\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s*vno:section-name\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\s*xmlns:vno\s*=\s*["'][^"']*["']/gi, "");
}

function loFodpFromSource() {
  const source = new SlidesAdapter(sectionedCanvas()).serializeToFodp();
  return stripVnoSections(source);
}

function patchedPresentationFromSource() {
  const source = new SlidesAdapter(sectionedCanvas()).serializeToFodp();
  return applySectionListFromFodp(LO_PRESENTATION_XML, source);
}

export async function runSlidesPptxSectionsOpenOverlayTests() {
  const results = [];
  const test = async (name, callback) => {
    try {
      await callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("overlayFodpSections: gắn vno:section-* đúng trang theo sldIdLst, không đoán", () => {
    const loFodp = loFodpFromSource();
    assert(!fodpHasSections(loFodp), "FODP soffice giả lập chưa có phần");
    assert(!/xmlns:vno=/.test(loFodp), "soffice FODP không có xmlns:vno");
    const presentation = patchedPresentationFromSource();
    assert(presentationHasSectionList(presentation), "Phase 3a phải có sectionLst");
    const next = overlayFodpSections(loFodp, presentation);
    assert(fodpHasSections(next), "sau overlay phải có vno:section-id");
    assert(/xmlns:vno="urn:vn-office:slides:1.0"/.test(next), "phải khai báo xmlns:vno");
    const pages = parseFodpPages(next);
    assert(pages.length === 6, `pages=${pages.length}`);
    const intro = sectionGuidFromId("section-intro");
    const body = sectionGuidFromId("section-body");
    assert(pages.slice(0, 3).every((p) => p.sectionId === intro && p.sectionName === "Gioi thieu"), JSON.stringify(pages.slice(0, 3)));
    assert(pages.slice(3).every((p) => p.sectionId === body && p.sectionName === "Noi dung chinh"), JSON.stringify(pages.slice(3)));
    assert(next.includes("Mo dau 1"), "giữ nội dung FODP");
  });

  await test("overlay no-op khi PPTX không có p14:sectionLst", () => {
    const loFodp = loFodpFromSource();
    const next = overlayFodpSections(loFodp, LO_PRESENTATION_XML);
    assert(next === loFodp, "không sửa FODP khi PPTX không có phần");
    assert(!fodpHasSections(next), "không tự bịa phần");
  });

  await test("overlay idempotent; GUID đã có được tái sử dụng khi xuất lại", () => {
    const loFodp = loFodpFromSource();
    const presentation = patchedPresentationFromSource();
    const once = overlayFodpSections(loFodp, presentation);
    const twice = overlayFodpSections(once, presentation);
    assert(once === twice, "idempotent khi đã gắn phần");
    const intro = sectionGuidFromId("section-intro");
    assert(isBracedGuid(intro), intro);
    const reexport = applySectionListFromFodp(LO_PRESENTATION_XML, once);
    const parsed = parseSectionList(reexport);
    assert(parsed[0].id === intro, `re-export phải giữ GUID, nhận ${parsed[0].id}`);
    assert(parsed[1].id === sectionGuidFromId("section-body"), parsed[1].id);
  });

  await test("lệch số trang / sldId lạ / trùng hai phần → ném, không đoán", () => {
    const loFodp = loFodpFromSource();
    const twoSlideWithSections = applySectionList(MINIMAL_PRESENTATION_XML, [
      { name: "Gioi thieu", sourceId: "section-intro", slideIds: ["256", "257"] }
    ]);
    let countThrew = false;
    try {
      overlayFodpSections(loFodp, twoSlideWithSections);
    } catch (error) {
      countThrew = /không đoán/.test(error.message) && /sldIdLst/.test(error.message);
    }
    assert(countThrew, "phải ném khi số sldId ≠ số draw:page");

    const unknown = applySectionList(LO_PRESENTATION_XML, [
      { name: "Gioi thieu", sourceId: "section-intro", slideIds: ["256", "999"] }
    ]);
    let unknownThrew = false;
    try {
      overlayFodpSections(loFodp, unknown);
    } catch (error) {
      unknownThrew = /không đoán/.test(error.message) && /999/.test(error.message);
    }
    assert(unknownThrew, "phải ném khi p14:sldId không có trong p:sldIdLst");

    const dup = applySectionList(LO_PRESENTATION_XML, [
      { name: "A", sourceId: "a", slideIds: ["256"] },
      { name: "B", sourceId: "b", slideIds: ["256"] }
    ]);
    let dupThrew = false;
    try {
      overlayFodpSections(loFodp, dup);
    } catch (error) {
      dupThrew = /không đoán/.test(error.message) && /hai phần/.test(error.message);
    }
    assert(dupThrew, "phải ném khi một sldId thuộc hai phần");
  });

  await test("trang không thuộc phần nào thì không bịa Default Section lúc mở", () => {
    const loFodp = loFodpFromSource();
    const partial = applySectionList(LO_PRESENTATION_XML, [
      { name: "Gioi thieu", sourceId: "section-intro", slideIds: ["256", "257", "258"] }
    ]);
    const next = overlayFodpSections(loFodp, partial);
    const pages = parseFodpPages(next);
    assert(pages.slice(0, 3).every((p) => p.sectionName === "Gioi thieu"), JSON.stringify(pages.slice(0, 3)));
    assert(pages.slice(3).every((p) => !p.sectionId), JSON.stringify(pages.slice(3)));
  });

  await test("parseFodp sau overlay: canvas.sections + slide.sectionId đúng thứ tự", () => {
    const loFodp = loFodpFromSource();
    const presentation = patchedPresentationFromSource();
    const overlaid = overlayFodpSections(loFodp, presentation);
    const parsed = new SlidesAdapter(null).parseFodp(overlaid);
    assert(parsed.length === 6, `slides=${parsed.length}`);
    const intro = sectionGuidFromId("section-intro");
    const body = sectionGuidFromId("section-body");
    assert(parsed.slice(0, 3).every((s) => s.sectionId === intro), JSON.stringify(parsed.map((s) => s.sectionId)));
    assert(parsed.slice(3).every((s) => s.sectionId === body), JSON.stringify(parsed.map((s) => s.sectionId)));
    assert(parsed.sections.length === 2, `sections=${parsed.sections.length}`);
    assert(parsed.sections[0].name === "Gioi thieu", parsed.sections[0].name);
    assert(parsed.sections[1].name === "Noi dung chinh", parsed.sections[1].name);
  });

  await test("Save PPTX (Phase 3a) → Mở overlay → loadFromFodp khôi phục thanh phần", () => {
    const saved = new SlidesAdapter(sectionedCanvas());
    const sourceFodp = saved.serializeToFodp();
    assert(fodpHasSections(sourceFodp), "serialize FODP phải có phần");
    const loZip = fakePptx(LO_PRESENTATION_XML);
    assert(!presentationHasSectionList(readZipEntry(loZip, "ppt/presentation.xml").toString("utf8")));
    const nativePptx = postProcessSlidesPptx(loZip, { sourceFodp });
    assert(presentationHasSectionList(readZipEntry(nativePptx, "ppt/presentation.xml").toString("utf8")), "Phase 3a phải ghi sectionLst");

    const loReopenFodp = stripVnoSections(sourceFodp);
    assert(!fodpHasSections(loReopenFodp), "soffice PPTX→FODP giả lập phải mất phần");
    const overlaid = overlaySlidesPptxFodp(nativePptx, loReopenFodp);
    assert(fodpHasSections(overlaid), "overlay phải gắn lại vno:section-* từ PPTX gốc");

    const canvas = sectionedCanvas();
    canvas.slides = [];
    canvas.sections = [];
    const opened = new SlidesAdapter(canvas);
    opened.loadFromFodp(overlaid);
    assert(canvas.sections.length === 2, `sections=${canvas.sections.length}`);
    assert(canvas.sections[0].name === "Gioi thieu", canvas.sections[0].name);
    assert(canvas.slides.length === 6, `slides=${canvas.slides.length}`);
    assert(canvas.slides[0].sectionId === sectionGuidFromId("section-intro"), canvas.slides[0].sectionId);
    assert(canvas.slides[5].sectionId === sectionGuidFromId("section-body"), canvas.slides[5].sectionId);
  });

  await test("loadFromFodp(fodp, ooxmlPresentationXml) overlay trước parseFodp", () => {
    const canvas = sectionedCanvas();
    canvas.slides = [];
    canvas.sections = [];
    const adapter = new SlidesAdapter(canvas);
    const loFodp = loFodpFromSource();
    assert(!fodpHasSections(loFodp));
    adapter.loadFromFodp(loFodp, patchedPresentationFromSource());
    assert(canvas.sections.length === 2, "adapter phải khôi phục catalogue phần");
    assert(canvas.slides[2].sectionId === sectionGuidFromId("section-intro"));
    assert(canvas.slides[3].sectionId === sectionGuidFromId("section-body"));
  });

  await test("SlidesAdapter.open() overlay từ payload ooxmlPresentationXml", async () => {
    const canvas = sectionedCanvas();
    canvas.slides = [];
    canvas.sections = [];
    const adapter = new SlidesAdapter(canvas);
    const origEngine = globalUnoBridge.hasRealEngine;
    const origApi = globalUnoBridge.desktopApi;
    globalUnoBridge.hasRealEngine = true;
    globalUnoBridge.desktopApi = {
      open_document_dialog: async () => ({
        status: "ok",
        content: loFodpFromSource(),
        ooxmlPresentationXml: patchedPresentationFromSource(),
        fileName: "BaiGiang.pptx"
      })
    };
    try {
      const ok = await adapter.open();
      assert(ok === true, "open() phải thành công");
      assert(canvas.sections.length === 2, "open() phải khôi phục thanh phần");
      assert(canvas.sections[0].name === "Gioi thieu", canvas.sections[0].name);
      assert(adapter.sourceFileName === "BaiGiang", adapter.sourceFileName);
    } finally {
      globalUnoBridge.hasRealEngine = origEngine;
      globalUnoBridge.desktopApi = origApi;
    }
  });

  await test("Python twin overlay FODP giống JS (CLI --overlay-fodp)", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-open-"));
    try {
      const presentation = patchedPresentationFromSource();
      const pptxPath = path.join(tempRoot, "deck.pptx");
      const fodpPath = path.join(tempRoot, "lo.fodp");
      const outPath = path.join(tempRoot, "overlaid.fodp");
      fs.writeFileSync(pptxPath, fakePptx(presentation));
      const loFodp = loFodpFromSource();
      fs.writeFileSync(fodpPath, loFodp, "utf8");
      const py = spawnSync(process.env.PYTHON || "python", [
        PYTHON_PATCHER,
        "--pptx", pptxPath,
        "--overlay-fodp", fodpPath,
        "--out", outPath
      ], { encoding: "utf8" });
      assert(py.status === 0, `Python overlay failed: ${(py.stderr || py.stdout || "").trim()}`);
      const pyFodp = fs.readFileSync(outPath, "utf8");
      const jsFodp = overlaySlidesPptxFodp(fs.readFileSync(pptxPath), loFodp);
      assert(fodpHasSections(pyFodp), "Python phải gắn vno:section-*");
      assert(jsFodp === pyFodp, "JS và Python overlay phải ra cùng FODP");
      const groups = parseSectionsFromFodp(pyFodp);
      assert(groups.length === 2, `groups=${groups.length}`);
      assert(groups[0].pageIndexes.join(",") === "0,1,2", String(groups[0].pageIndexes));
      assert(groups[1].pageIndexes.join(",") === "3,4,5", String(groups[1].pageIndexes));
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  return results;
}
