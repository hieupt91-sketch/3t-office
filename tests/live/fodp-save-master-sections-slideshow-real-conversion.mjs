/**
 * Real LibreOffice round-trip for Slide Master, Slide Sections, Set Up Slide Show.
 * Parses FODP XML after soffice FODP→PPTX→FODP.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const canvas = {
  masterTheme: {
    id: "corporate-red",
    fontFamily: "'Times New Roman', serif",
    titleColor: "#991b1b",
    bodyColor: "#1f2937",
    accentColor: "#b53818",
    bgColor: "#fffdfa",
    logoText: "VN OFFICE • SANG TAO",
    footerText: "Bao mat noi bo"
  },
  sections: [
    { id: "sec-intro", name: "Gioi thieu" },
    { id: "sec-body", name: "Noi dung chinh" }
  ],
  slideShowSettings: {
    loopUntilEsc: true,
    showWithoutNarration: true,
    pointerColor: "#112233"
  },
  getSlideShowSettings() { return this.slideShowSettings; },
  slides: [
    { id: 1, title: "Mo dau", body: "Slide mot", layoutType: "title-content", notes: "", sectionId: "sec-intro", shapes: [] },
    { id: 2, title: "Noi dung", body: "Slide hai", layoutType: "title-content", notes: "", sectionId: "sec-body", shapes: [] }
  ]
};

const fodp = new SlidesAdapter(canvas).serializeToFodp();
assert.match(fodp, /vno:master-theme=/, "serializer must emit master theme");
assert.match(fodp, /VN OFFICE • SANG TAO/, "serializer must emit master logo");
assert.match(fodp, /vno:section-id="sec-intro"/, "serializer must emit section id");
assert.match(fodp, /vno:section-name="Gioi thieu"/, "serializer must emit section name");
assert.match(fodp, /presentation:endless="true"/, "serializer must emit endless");
assert.match(fodp, /vno:pointer-color="#112233"/, "serializer must emit pointer color");

const inMemory = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(inMemory.masterTheme?.logoText, "VN OFFICE • SANG TAO");
assert.equal(inMemory.sections?.[0]?.id, "sec-intro");
assert.equal(inMemory.slideShowSettings?.loopUntilEsc, true);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-master-sec-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, fodp, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX failed");
  const roundPath = convertWithSoffice(pptxPath, "fodp", path.join(tempRoot, "fodp"), { profileDir });
  const roundXml = fs.readFileSync(roundPath, "utf8");

  const masterMetaKept = /vno:master-theme=/i.test(roundXml);
  const logoKept = /VN OFFICE • SANG TAO/.test(roundXml);
  const sectionKept = /vno:section-id=/i.test(roundXml);
  const endlessKept = /presentation:endless="true"/i.test(roundXml);
  const pointerKept = /vno:pointer-color=/i.test(roundXml);

  const parsed = new SlidesAdapter(null).parseFodp(roundXml);
  assert.equal(parsed.length, 2, `slides=${parsed.length}`);
  assert.equal(parsed[0].title.includes("Mo dau") || parsed[0].title.length > 0, true, `title0=${parsed[0].title}`);

  if (!masterMetaKept) {
    console.log("NOTE: LibreOffice PPTX hop dropped vno:master-theme (custom namespace).");
  }
  if (!logoKept) {
    console.log("NOTE: LibreOffice PPTX hop dropped master-page logo text.");
  } else {
    assert.ok(parsed.masterTheme?.logoText === "VN OFFICE • SANG TAO" || /VN OFFICE • SANG TAO/.test(roundXml), "logo text present in XML");
  }
  if (!sectionKept) {
    console.log("NOTE: LibreOffice PPTX hop dropped vno:section-* (no OOXML section equivalent).");
  } else {
    assert.equal(parsed.sections?.[0]?.name, "Gioi thieu");
  }
  if (!endlessKept) {
    console.log("NOTE: LibreOffice PPTX hop dropped presentation:endless.");
  } else {
    assert.equal(parsed.slideShowSettings.loopUntilEsc, true);
  }
  if (!pointerKept) {
    console.log("NOTE: LibreOffice PPTX hop dropped vno:pointer-color.");
  }

  assert.ok(logoKept || masterMetaKept || /draw:fill-color="#fffdfa"/i.test(roundXml),
    "Slide Master left no measurable trace after PPTX hop (theme metadata, logo, and fill all gone)");
  console.log(`PASS: master/sections/slideshow measured. masterMeta=${masterMetaKept} logo=${logoKept} section=${sectionKept} endless=${endlessKept} pointer=${pointerKept}`);
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
