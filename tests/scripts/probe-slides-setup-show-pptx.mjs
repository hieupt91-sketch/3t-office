/**
 * Probe Phase 3b: does LibreOffice emit p:showPr (CT_ShowProperties)
 * when converting a FODP that already has presentation:settings /
 * vno:without-narration / vno:pointer-color?
 *
 * Not part of the unit suite. Measures before any post-process is written.
 * Dumps presentation.xml AND presProps.xml — ECMA-376 1st edition parents
 * showPr under presentationPr (ppt/presProps.xml), not presentation.xml.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) {
  console.error("LibreOffice soffice.exe not found");
  process.exit(1);
}
console.log("soffice", soffice);

function summarizeXml(label, xml) {
  const text = String(xml || "");
  console.log(`\n===== ${label} (${text.length} chars) =====`);
  console.log(text);
  return {
    bytes: text.length,
    hasShowPr: /<(?:[\w]+:)?showPr\b/i.test(text),
    hasLoopAttr: /\bloop\s*=/i.test(text),
    hasShowNarration: /\bshowNarration\s*=/i.test(text),
    hasShowAnimation: /\bshowAnimation\s*=/i.test(text),
    hasUseTimings: /\buseTimings\s*=/i.test(text),
    hasPenClr: /<(?:[\w]+:)?penClr\b/i.test(text),
    hasKiosk: /<(?:[\w]+:)?kiosk\b/i.test(text),
    hasPresent: /<(?:[\w]+:)?present\b/i.test(text),
    hasBrowse: /<(?:[\w]+:)?browse\b/i.test(text),
    hasSldAll: /<(?:[\w]+:)?sldAll\b/i.test(text),
    hasSldRg: /<(?:[\w]+:)?sldRg\b/i.test(text),
    hasCustShow: /<(?:[\w]+:)?custShow\b/i.test(text),
    has112233: text.includes("112233"),
    hasVno: /vno:/i.test(text)
  };
}

function dumpPptx(label, pptxPath, dumpDir) {
  fs.mkdirSync(dumpDir, { recursive: true });
  const entries = listZipEntries(pptxPath).map((e) => e.name);
  console.log(`\n######## ${label} ########`);
  console.log("pptx", pptxPath, fs.statSync(pptxPath).size, "bytes");
  console.log("zip entries:\n", entries.join("\n"));

  const presentation = readZipEntry(pptxPath, "ppt/presentation.xml")?.toString("utf8") || "";
  const presProps = readZipEntry(pptxPath, "ppt/presProps.xml")?.toString("utf8") || "";
  const contentTypes = readZipEntry(pptxPath, "[Content_Types].xml")?.toString("utf8") || "";
  const rels = readZipEntry(pptxPath, "ppt/_rels/presentation.xml.rels")?.toString("utf8") || "";
  fs.writeFileSync(path.join(dumpDir, "presentation.xml"), presentation, "utf8");
  fs.writeFileSync(path.join(dumpDir, "presProps.xml"), presProps, "utf8");
  fs.writeFileSync(path.join(dumpDir, "Content_Types.xml"), contentTypes, "utf8");
  fs.writeFileSync(path.join(dumpDir, "presentation.xml.rels"), rels, "utf8");

  const presSummary = summarizeXml(`${label} ppt/presentation.xml`, presentation);
  const propsSummary = summarizeXml(`${label} ppt/presProps.xml`, presProps);
  console.log(`\n--- ${label} [Content_Types].xml has presProps?`, /presProps/i.test(contentTypes));
  console.log(`--- ${label} presentation.xml.rels:\n`, rels);
  return {
    pptxBytes: fs.statSync(pptxPath).size,
    zipEntries: entries,
    hasPresPropsEntry: entries.includes("ppt/presProps.xml"),
    presentation: presSummary,
    presProps: propsSummary,
    relsHasPresProps: /presProps/i.test(rels),
    contentTypesHasPresProps: /presProps/i.test(contentTypes)
  };
}

function injectSettings(fodp, settingsXml) {
  if (/<presentation:settings\b/i.test(fodp)) {
    return fodp.replace(/<presentation:settings\b[^>]*\/?>/i, settingsXml);
  }
  return fodp.replace(
    /<\/office:presentation>/i,
    `${settingsXml}\n    </office:presentation>`
  );
}

function threeSlideCanvas(settings) {
  return {
    slideShowSettings: settings,
    getSlideShowSettings() {
      return this.slideShowSettings;
    },
    slides: [
      { id: 1, title: "Mo dau", body: "A1", layoutType: "title-content", notes: "", shapes: [] },
      { id: 2, title: "Noi dung", body: "A2", layoutType: "title-content", notes: "", shapes: [] },
      { id: 3, title: "Ket luan", body: "A3", layoutType: "title-content", notes: "", shapes: [] }
    ]
  };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-setup-show-"));
const profileDir = path.join(tempRoot, "profile");
console.log("tempRoot", tempRoot);

const vnSettings = {
  loopUntilEsc: true,
  showWithoutNarration: true,
  pointerColor: "#112233"
};
const vnFodp = new SlidesAdapter(threeSlideCanvas(vnSettings)).serializeToFodp();
fs.writeFileSync(path.join(tempRoot, "vn-source.fodp"), vnFodp, "utf8");

const settingsMatch = vnFodp.match(/<presentation:settings\b[^>]*\/?>/i);
console.log("\n===== VN serialize presentation:settings =====");
console.log(settingsMatch ? settingsMatch[0] : "(none)");
console.log("has presentation:endless", /presentation:endless=["']true["']/i.test(vnFodp));
console.log("has vno:without-narration", /vno:without-narration=["']true["']/i.test(vnFodp));
console.log("has vno:pointer-color", /vno:pointer-color=["']#112233["']/i.test(vnFodp));
console.log("has presentation:show element", /<presentation:show\b/i.test(vnFodp));
console.log("has presentation:start-page", /presentation:start-page=/i.test(vnFodp));
console.log("has presentation:full-screen", /presentation:full-screen=/i.test(vnFodp));
console.log("has presentation:mouse-as-pen", /presentation:mouse-as-pen=/i.test(vnFodp));
console.log("has kiosk/presenter in FODP", /kiosk|presenter|showType/i.test(vnFodp));

const cases = [];

function runCase(id, fodpXml) {
  const dir = path.join(tempRoot, id);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, "deck.fodp");
  fs.writeFileSync(source, fodpXml, "utf8");
  const pptxPath = convertWithSoffice(source, "pptx", path.join(dir, "pptx"), {
    profileDir,
    appKind: "slides"
  });
  const dump = dumpPptx(id, pptxPath, path.join(dir, "dump"));
  let roundXml = "";
  let roundEndless = false;
  let roundVnoNarration = false;
  let roundVnoPointer = false;
  let roundSettings = "";
  try {
    const roundPath = convertWithSoffice(pptxPath, "fodp", path.join(dir, "fodp"), {
      profileDir,
      appKind: "slides"
    });
    roundXml = fs.readFileSync(roundPath, "utf8");
    fs.writeFileSync(path.join(dir, "round.fodp"), roundXml, "utf8");
    const sm = roundXml.match(/<presentation:settings\b[^>]*\/?>/i);
    roundSettings = sm ? sm[0] : "";
    roundEndless = /presentation:endless=["']true["']/i.test(roundXml);
    roundVnoNarration = /vno:without-narration=/i.test(roundXml);
    roundVnoPointer = /vno:pointer-color=/i.test(roundXml);
    console.log(`\n===== ${id} PPTX→FODP presentation:settings =====`);
    console.log(roundSettings || "(no presentation:settings)");
    console.log("round endless", roundEndless, "vno-narration", roundVnoNarration, "vno-pointer", roundVnoPointer);
  } catch (error) {
    console.log(`\n===== ${id} PPTX→FODP FAILED =====`, error.message || error);
  }
  const result = {
    id,
    ...dump,
    roundEndless,
    roundVnoNarration,
    roundVnoPointer,
    roundSettings
  };
  cases.push(result);
  return result;
}

console.log("\n\n########## CASE vn-serialize ##########");
runCase("vn-serialize", vnFodp);

const endlessOnly = injectSettings(
  vnFodp,
  '<presentation:settings presentation:endless="true"/>'
);
console.log("\n\n########## CASE odf-endless-only ##########");
runCase("odf-endless-only", endlessOnly);

const odfRich = injectSettings(
  vnFodp,
  [
    '<presentation:show presentation:name="CustomKiosk" presentation:pages="page1 page2"/>',
    '<presentation:settings presentation:endless="true" presentation:full-screen="true"',
    ' presentation:start-page="page2" presentation:mouse-as-pen="true"',
    ' presentation:mouse-visible="true" presentation:force-manual="false"',
    ' presentation:transition-on-click="false" presentation:animations="enabled"',
    ' presentation:show="CustomKiosk"/>'
  ].join(" ")
);
console.log("\n\n########## CASE odf-rich-settings ##########");
console.log("injected snippet contains presentation:show", /<presentation:show\b/i.test(odfRich));
runCase("odf-rich-settings", odfRich);

const odfStartPage = injectSettings(
  vnFodp,
  '<presentation:settings presentation:endless="true" presentation:start-page="page3"/>'
);
console.log("\n\n########## CASE odf-start-page ##########");
runCase("odf-start-page", odfStartPage);

const noLoopCanvas = threeSlideCanvas({
  loopUntilEsc: false,
  showWithoutNarration: true,
  pointerColor: "#00AA55"
});
const noLoopFodp = new SlidesAdapter(noLoopCanvas).serializeToFodp();
console.log("\n\n########## CASE vn-no-loop-narration-pointer ##########");
console.log("settings", (noLoopFodp.match(/<presentation:settings\b[^>]*\/?>/i) || ["(none)"])[0]);
runCase("vn-no-loop-narration-pointer", noLoopFodp);

const defaultCanvas = threeSlideCanvas({
  loopUntilEsc: false,
  showWithoutNarration: false,
  pointerColor: "#DC2626"
});
const defaultFodp = new SlidesAdapter(defaultCanvas).serializeToFodp();
console.log("\n\n########## CASE vn-defaults ##########");
console.log("settings", (defaultFodp.match(/<presentation:settings\b[^>]*\/?>/i) || ["(none)"])[0]);
runCase("vn-defaults", defaultFodp);

const mousePen = injectSettings(
  vnFodp,
  '<presentation:settings presentation:mouse-as-pen="true" presentation:mouse-visible="true"/>'
);
console.log("\n\n########## CASE odf-mouse-as-pen ##########");
runCase("odf-mouse-as-pen", mousePen);

const kioskLike = injectSettings(
  vnFodp,
  '<presentation:settings presentation:endless="true" presentation:full-screen="true" presentation:transition-on-click="false"/>'
);
console.log("\n\n########## CASE odf-kiosk-like ##########");
runCase("odf-kiosk-like", kioskLike);

const summary = {
  soffice,
  tempRoot,
  vnSettingsSnippet: settingsMatch ? settingsMatch[0] : null,
  cases: cases.map((c) => ({
    id: c.id,
    pptxBytes: c.pptxBytes,
    hasPresPropsEntry: c.hasPresPropsEntry,
    presentation: c.presentation,
    presProps: c.presProps,
    roundEndless: c.roundEndless,
    roundVnoNarration: c.roundVnoNarration,
    roundVnoPointer: c.roundVnoPointer,
    roundSettings: c.roundSettings
  }))
};
fs.writeFileSync(path.join(tempRoot, "PROBE_JSON.json"), JSON.stringify(summary, null, 2), "utf8");
console.log("\nPROBE_JSON", JSON.stringify(summary, null, 2));
