/**
 * Slides SmartArt import fidelity.
 *
 * Fixture: hand-packed PPTX with native DrawingML SmartArt
 * (ppt/diagrams/data+layout+style+colors+drawing) — NOT VN serializeToFodp().
 * VN Slides open path: pptx → soffice --convert-to fodp → parseFodp/loadFromFodp.
 *
 * Live soffice convert is tests/scripts/probe-slides-smartart-import.mjs
 * (and tests/live/slides-smartart-import-real-conversion.mjs) so run-tests.js
 * stays under 60s. SOFFICE_SMARTART_FODP is the <draw:g> block soffice actually
 * wrote from that PPTX (group name QuyTrinhHoSo, 1 background + 5 nodes).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PPTX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-slides-smartart.pptx");
const LABELS = ["Tiếp nhận hồ sơ", "Thẩm định", "Phê duyệt", "Lưu trữ", "Bàn giao"];

/** Captured from soffice PPTX→FODP of sample-slides-smartart.pptx (probe 05/09/2026). */
const SOFFICE_SMARTART_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:automatic-styles>
    <style:style style:name="grBg" style:family="graphic">
      <style:graphic-properties draw:fill="none" draw:stroke="none"/>
    </style:style>
    <style:style style:name="grNode" style:family="graphic">
      <style:graphic-properties draw:fill="solid" draw:fill-color="#18a303" svg:stroke-color="#ffffff"/>
    </style:style>
  </office:automatic-styles>
  <office:body><office:presentation>
    <draw:page draw:name="Quy trình xử lý hồ sơ">
      <draw:frame presentation:class="title" svg:x="1.4cm" svg:y="0.628cm" svg:width="25.198cm" svg:height="2.628cm">
        <draw:text-box><text:p>Quy trình xử lý hồ sơ</text:p></draw:text-box>
      </draw:frame>
      <draw:g draw:name="QuyTrinhHoSo">
        <draw:custom-shape draw:style-name="grBg" svg:width="22.859cm" svg:height="10.159cm" svg:x="2.328cm" svg:y="3.81cm">
          <text:p/>
          <draw:enhanced-geometry draw:type="ooxml-rect"/>
        </draw:custom-shape>
        <draw:custom-shape draw:style-name="grNode" svg:width="3.758cm" svg:height="2.255cm" svg:x="4.026cm" svg:y="3.814cm">
          <text:p>Tiếp nhận hồ sơ</text:p>
          <draw:enhanced-geometry draw:type="ooxml-rect"/>
        </draw:custom-shape>
        <draw:custom-shape draw:style-name="grNode" svg:width="3.758cm" svg:height="2.255cm" svg:x="8.161cm" svg:y="3.814cm">
          <text:p>Thẩm định</text:p>
          <draw:enhanced-geometry draw:type="ooxml-rect"/>
        </draw:custom-shape>
        <draw:custom-shape draw:style-name="grNode" svg:width="3.758cm" svg:height="2.255cm" svg:x="4.026cm" svg:y="6.445cm">
          <text:p>Phê duyệt</text:p>
          <draw:enhanced-geometry draw:type="ooxml-rect"/>
        </draw:custom-shape>
        <draw:custom-shape draw:style-name="grNode" svg:width="3.758cm" svg:height="2.255cm" svg:x="8.161cm" svg:y="6.445cm">
          <text:p>Lưu trữ</text:p>
          <draw:enhanced-geometry draw:type="ooxml-rect"/>
        </draw:custom-shape>
        <draw:custom-shape draw:style-name="grNode" svg:width="3.758cm" svg:height="2.255cm" svg:x="6.093cm" svg:y="9.077cm">
          <text:p>Bàn giao</text:p>
          <draw:enhanced-geometry draw:type="ooxml-rect"/>
        </draw:custom-shape>
      </draw:g>
      <draw:custom-shape draw:name="ungrouped-note" svg:width="4cm" svg:height="2cm" svg:x="18cm" svg:y="12cm" draw:fill-color="#d97706">
        <text:p>Ghi chú rời</text:p>
        <draw:enhanced-geometry draw:type="ooxml-rect"/>
      </draw:custom-shape>
    </draw:page>
    <draw:page draw:name="page2">
      <draw:g draw:name="NhomTuongDoi" svg:x="2cm" svg:y="3cm">
        <draw:rect svg:x="0cm" svg:y="0cm" svg:width="3cm" svg:height="1.5cm" draw:fill-color="#2563eb">
          <text:p>Nút tương đối</text:p>
        </draw:rect>
        <draw:connector draw:id="c1" draw:type="line" svg:x1="1.5cm" svg:y1="0.75cm" svg:x2="5cm" svg:y2="0.75cm" draw:start-shape="n1" draw:end-shape="n2"/>
        <draw:rect draw:id="n2" svg:x="4cm" svg:y="0cm" svg:width="3cm" svg:height="1.5cm" draw:fill-color="#0f766e">
          <text:p>Nút B</text:p>
        </draw:rect>
      </draw:g>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSlidesSmartartImportTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const asyncTest = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("PPTX fixture là SmartArt DrawingML thật, không phải VN serialize", () => {
    assert(fs.existsSync(PPTX), `thiếu ${PPTX}`);
    const names = listZipEntries(PPTX).map((entry) => entry.name);
    for (const part of [
      "ppt/diagrams/data1.xml",
      "ppt/diagrams/layout1.xml",
      "ppt/diagrams/quickStyle1.xml",
      "ppt/diagrams/colors1.xml",
      "ppt/diagrams/drawing1.xml"
    ]) {
      assert(names.includes(part), `thiếu ${part}`);
    }
    const slide = readZipEntry(PPTX, "ppt/slides/slide1.xml").toString("utf8");
    assert(/<p:graphicFrame\b/i.test(slide), "slide phải có graphicFrame");
    assert(/drawingml\/2006\/diagram/i.test(slide), "graphicFrame phải trỏ diagram URI");
    assert(/<dgm:relIds\b/i.test(slide), "thiếu dgm:relIds");
    const data = readZipEntry(PPTX, "ppt/diagrams/data1.xml").toString("utf8");
    for (const label of LABELS) {
      assert(data.includes(label), `data1.xml thiếu ${label}`);
    }
    const drawing = readZipEntry(PPTX, "ppt/diagrams/drawing1.xml").toString("utf8");
    assert(/<dsp:drawing\b/i.test(drawing), "thiếu cached dsp:drawing");
    for (const label of LABELS) {
      assert(drawing.includes(label), `drawing1.xml thiếu ${label}`);
    }
  });

  test("Canned soffice FODP: parseFodp đọc 5 node SmartArt, bỏ nền, gắn diagramGroupId", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_SMARTART_FODP);
    assert(slides.length === 2, `slides=${slides.length}`);
    const slide = slides[0];
    assert(slide.title === "Quy trình xử lý hồ sơ", `title=${slide.title}`);
    const shapes = slide.shapes || [];
    const nodes = shapes.filter((shape) => shape.diagramRole === "node");
    const background = shapes.filter((shape) => !shape.text && (shape.w || 0) > 700);
    assert(nodes.length === 5, `node count=${nodes.length} shapes=${JSON.stringify(shapes.map((s) => s.text))}`);
    assert(background.length === 0, "hình nền trong suốt của LibreOffice không được đưa lên canvas");
    assert(nodes.every((shape) => shape.diagramGroupId === "QuyTrinhHoSo"), `group=${nodes.map((s) => s.diagramGroupId).join(",")}`);
    assert(nodes.every((shape) => shape.diagramLevel === 0), "imported list không bịa hierarchy");
    const texts = nodes.map((shape) => shape.text);
    for (const label of LABELS) {
      assert(texts.includes(label), `thiếu chữ ${label}: ${texts.join(" | ")}`);
    }
    assert(nodes.every((shape) => shape.type === "rect"), "node phải là rect");
    assert(nodes.every((shape) => String(shape.color).toLowerCase() === "#18a303"), `color=${nodes.map((s) => s.color).join(",")}`);
    assert(nodes.every((shape) => shape.y >= 0 && shape.y + shape.h <= 560), `node tràn slide: ${JSON.stringify(nodes.map((s) => ({ t: s.text, y: s.y, h: s.h })))}`);
    const note = shapes.find((shape) => shape.text === "Ghi chú rời");
    assert(note, "mất shape không thuộc nhóm");
    assert(!note.diagramGroupId, `shape rời không được gắn group: ${note.diagramGroupId}`);
  });

  test("draw:g tọa độ tương đối được cộng origin; connector trong nhóm giữ role", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_SMARTART_FODP);
    const slide = slides[1];
    const nodes = (slide.shapes || []).filter((shape) => shape.diagramRole === "node");
    const connectors = (slide.shapes || []).filter((shape) => shape.type === "connector");
    assert(nodes.length === 2, `nodes=${nodes.length}`);
    assert(connectors.length === 1, `connectors=${connectors.length}`);
    assert(nodes.every((shape) => shape.diagramGroupId === "NhomTuongDoi"), "thiếu group id slide 2");
    const relative = nodes.find((shape) => shape.text === "Nút tương đối");
    assert(relative, "thiếu nút tương đối");
    assert(relative.x >= 70, `chưa cộng svg:x của group: x=${relative.x}`);
    assert(relative.y >= 110, `chưa cộng svg:y của group: y=${relative.y}`);
    assert(connectors[0].diagramRole === "connector", "connector phải giữ diagramRole");
    assert(connectors[0].diagramGroupId === "NhomTuongDoi", "connector phải cùng group");
  });

  test("loadFromFodp nạp SmartArt vào canvas.slides[0].shapes", () => {
    const canvas = { slides: [], selectSlide(index) { this.selected = index; } };
    const adapter = new SlidesAdapter(canvas);
    adapter.loadFromFodp(SOFFICE_SMARTART_FODP);
    assert(canvas.slides.length === 2, `slides=${canvas.slides.length}`);
    assert(canvas.selected === 0, `selected=${canvas.selected}`);
    const nodes = canvas.slides[0].shapes.filter((shape) => shape.diagramRole === "node");
    assert(nodes.length === 5, `nodes=${nodes.length}`);
    assert(nodes[0].diagramGroupId === "QuyTrinhHoSo", "loadFromFodp mất group id");
  });

  await asyncTest("adapter.open() đi FODP soffice và giữ node SmartArt", async () => {
    const canvas = { slides: [], selectSlide(index) { this.selected = index; } };
    const adapter = new SlidesAdapter(canvas);
    const original = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({ status: "ok", content: SOFFICE_SMARTART_FODP, fileName: "sample-slides-smartart.pptx" });
    try {
      const ok = await adapter.open();
      assert(ok === true, "open phải trả true");
      const nodes = canvas.slides[0].shapes.filter((shape) => shape.diagramRole === "node");
      assert(nodes.length === 5 && nodes.some((shape) => shape.text === "Phê duyệt"), "open mất node SmartArt");
    } finally {
      globalUnoBridge.openRealFile = original;
    }
  });

  test("parseFodp không bịa diagramGroupId khi không có draw:g", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">
  <office:body><office:presentation>
    <draw:page draw:name="page1">
      <draw:rect svg:x="2cm" svg:y="3cm" svg:width="4cm" svg:height="2cm" draw:fill-color="#2563eb">
        <text:p>Hình rời</text:p>
      </draw:rect>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;
    const slides = new SlidesAdapter(null).parseFodp(xml);
    assert(slides[0].shapes.length === 1, `shapes=${slides[0].shapes.length}`);
    assert(slides[0].shapes[0].text === "Hình rời", "mất text hình rời");
    assert(!slides[0].shapes[0].diagramGroupId, "không được bịa group cho shape thường");
  });

  return results;
}
