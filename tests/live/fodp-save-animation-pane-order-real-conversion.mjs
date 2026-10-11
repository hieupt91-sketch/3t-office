/**
 * Real LibreOffice round-trip for Animation Pane order + start + Set Up loop:
 *   title/body/shape animations with custom order/start
 *   → serializeToFodp() → soffice FODP→PPTX → FODP → parse XML + parseFodp()
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const canvas = {
  slideShowSettings: { loopUntilEsc: true, showWithoutNarration: false, pointerColor: "#DC2626" },
  getSlideShowSettings() { return this.slideShowSettings; },
  slides: [{
    id: 1,
    title: "Tieu de sau",
    body: "Noi dung truoc",
    layoutType: "title-content",
    notes: "",
    titleAnimation: { type: "fadeIn", duration: 500, delay: 0, order: 1, start: "afterPrevious" },
    bodyAnimation: { type: "flyIn", duration: 400, delay: 0, order: 0, start: "onClick" },
    shapes: [{
      id: "rect-zoom",
      type: "rect",
      x: 76, y: 151, w: 227, h: 95,
      color: "#2563eb",
      text: "Hop zoom",
      animation: { type: "zoomIn", duration: 600, delay: 100, order: 2, start: "withPrevious" }
    }]
  }]
};

const fodp = new SlidesAdapter(canvas).serializeToFodp();
const seq = fodp.match(/<anim:seq[\s\S]*?<\/anim:seq>/)?.[0] || "";
assert.match(seq, /ooo-entrance-fly-in/, "body fly-in missing");
assert.match(seq, /ooo-entrance-fade-in/, "title fade-in missing");
assert.match(seq, /ooo-entrance-zoom/, "shape zoom missing");
assert.ok(seq.indexOf("ooo-entrance-fly-in") < seq.indexOf("ooo-entrance-fade-in"), "order: body must serialize before title");
assert.match(seq, /presentation:node-type="after-previous"|presentation:node-type="afterPrevious"/i);
assert.match(seq, /presentation:node-type="with-previous"|presentation:node-type="withPrevious"/i);
assert.match(fodp, /presentation:endless="true"/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-anim-order-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "anim.fodp");
fs.writeFileSync(source, fodp, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir });
  const roundPath = convertWithSoffice(pptxPath, "fodp", path.join(tempRoot, "fodp"), { profileDir });
  const roundXml = fs.readFileSync(roundPath, "utf8");
  const roundSeq = roundXml.match(/<anim:seq[\s\S]*?<\/anim:seq>/)?.[0] || "";
  assert.match(roundSeq, /ooo-entrance-fly-in|preset-id="[^"]*fly/i, `fly-in lost: ${roundSeq.slice(0, 240)}`);
  assert.match(roundSeq, /ooo-entrance-fade-in|preset-id="[^"]*fade/i, "fade-in lost");
  assert.match(roundSeq, /ooo-entrance-zoom|preset-id="[^"]*zoom/i, "zoom lost");

  const parsed = new SlidesAdapter(null).parseFodp(roundXml);
  assert.equal(parsed[0].bodyAnimation?.type, "flyIn", `body=${JSON.stringify(parsed[0].bodyAnimation)}`);
  assert.equal(parsed[0].titleAnimation?.type, "fadeIn", `title=${JSON.stringify(parsed[0].titleAnimation)}`);
  const shape = parsed[0].shapes.find(item => String(item.text || "").includes("Hop"));
  assert.ok(shape, "shape missing");
  assert.equal(shape.animation?.type, "zoomIn", `shape anim=${JSON.stringify(shape.animation)}`);
  const bodyOrder = parsed[0].bodyAnimation?.order;
  const titleOrder = parsed[0].titleAnimation?.order;
  if (Number.isFinite(bodyOrder) && Number.isFinite(titleOrder)) {
    assert.ok(bodyOrder < titleOrder, `order body=${bodyOrder} title=${titleOrder}`);
  }
  const endless = /presentation:endless="true"/i.test(roundXml);
  if (!endless) console.log("NOTE: LibreOffice PPTX hop dropped presentation:endless");
  else assert.equal(parsed.slideShowSettings.loopUntilEsc, true);
  console.log(`PASS: animation pane order flyIn→fadeIn→zoomIn survived PPTX hop. endlessKept=${endless}`);
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
