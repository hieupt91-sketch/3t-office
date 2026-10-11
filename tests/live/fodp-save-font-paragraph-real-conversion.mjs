/**
 * Real LibreOffice measurement for slide font/paragraph:
 *   serializeToFodp() → inspect ODF text styles → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
 *
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const canvas = {
  slides: [
    {
      id: 1,
      title: "Dam nghieng gach",
      titleHtml: "<b>Dam</b> <i>nghieng</i> <u>gach</u>",
      body: "Muc mot\nMuc hai",
      bodyHtml: "<ul><li>Muc mot</li><li>Muc hai</li></ul>",
      layoutType: "title-content",
      shapes: []
    },
    {
      id: 2,
      title: "Can giua Arial",
      titleHtml: '<div style="text-align:center"><font face="Arial">Can giua Arial</font></div>',
      body: "Do",
      bodyHtml: '<span style="color:#dc2626">Do</span>',
      layoutType: "title-content",
      shapes: []
    }
  ]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();

assert.match(fodp, /fo:font-weight="bold"/, "serializer must emit fo:font-weight=bold");
assert.match(fodp, /fo:font-style="italic"/, "serializer must emit fo:font-style=italic");
assert.match(fodp, /style:text-underline-style="solid"/, "serializer must emit underline");
assert.match(fodp, /<text:list\b/, "serializer must emit text:list for bullets");
assert.match(fodp, /fo:text-align="center"/, "serializer must emit fo:text-align=center");
assert.doesNotMatch(fodp, /vno:titleHtml/, "must not use custom vno:titleHtml");

const inMemory = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(inMemory.length, 2);
assert.match(inMemory[0].titleHtml || "", /<b>/i);
assert.match(inMemory[0].bodyHtml || "", /<ul|<li/i);
assert.match(inMemory[1].titleHtml || "", /text-align:\s*center/i);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-font-para-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function readPptxRunFlags(pptxPath, unzipDir) {
  fs.mkdirSync(unzipDir, { recursive: true });
  const unzip = spawnSync("tar", ["-xf", pptxPath, "-C", unzipDir], { encoding: "utf8" });
  if (unzip.status !== 0) return { error: unzip.stderr || unzip.stdout || "unzip failed" };
  const slidesDir = path.join(unzipDir, "ppt", "slides");
  if (!fs.existsSync(slidesDir)) return { error: "no ppt/slides" };
  return fs.readdirSync(slidesDir)
    .filter((name) => /^slide\d+\.xml$/i.test(name))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
    .map((name) => {
      const xml = fs.readFileSync(path.join(slidesDir, name), "utf8");
      return {
        name,
        bold: /<a:b\b/.test(xml) || /b="1"/.test(xml),
        italic: /<a:i\b/.test(xml) || /i="1"/.test(xml),
        underline: /<a:u\b/.test(xml),
        center: /algn="ctr"/.test(xml),
        bullet: /<a:buChar\b|<a:buFont\b|<a:buAutoNum\b/.test(xml),
        color: /<a:srgbClr val="DC2626"/i.test(xml) || /<a:srgbClr val="dc2626"/i.test(xml)
      };
    });
}

const measurement = {
  odfBold: /fo:font-weight="bold"/.test(fodp),
  odfList: /<text:list\b/.test(fodp),
  pptxRuns: [],
  hopTitleHtml: "",
  hopBodyHtml: "",
  hopHasBold: false,
  hopHasList: false,
  hopHasCenter: false
};

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");
  measurement.pptxRuns = readPptxRunFlags(pptxPath, path.join(tempRoot, "pptx-unzip"));
  console.log("PPTX run flags:", JSON.stringify(measurement.pptxRuns));

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  const parsedHop = new SlidesAdapter(null).parseFodp(roundTripXml);
  measurement.hopTitleHtml = parsedHop[0]?.titleHtml || "";
  measurement.hopBodyHtml = parsedHop[0]?.bodyHtml || "";
  measurement.hopHasBold = /fo:font-weight="bold"/.test(roundTripXml) || /<b>/i.test(measurement.hopTitleHtml);
  measurement.hopHasList = /<text:list\b/.test(roundTripXml) || /<ul|<li/i.test(measurement.hopBodyHtml);
  measurement.hopHasCenter = /fo:text-align="center"/.test(roundTripXml) || /text-align:\s*center/i.test(parsedHop[1]?.titleHtml || "");

  console.log("PPTX→FODP hop titleHtml:", measurement.hopTitleHtml);
  console.log("PPTX→FODP hop bodyHtml:", measurement.hopBodyHtml);
  console.log("MEASUREMENT", JSON.stringify(measurement, null, 2));

  if (!measurement.hopHasBold) {
    console.log("CAVEAT: soffice PPTX hop dropped bold (parseFodp titleHtml has no <b> and ODF has no fo:font-weight=bold). In-memory FODP still keeps it.");
  }
  if (!measurement.hopHasList) {
    console.log("CAVEAT: soffice PPTX hop dropped bullets.");
  }

  console.log("PASS  serializeToFodp emits ODF text styles; in-memory parse keeps HTML; soffice hop measured (see CAVEAT if any)");
} finally {
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch { /* ignore */ }
}
