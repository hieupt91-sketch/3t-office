/**
 * Slides Speaker Notes import fidelity.
 *
 * Fixture: handwritten FODP with <presentation:notes> → soffice --convert-to pptx
 * (NOT VN serializeToFodp()). Open path: pptx → soffice --convert-to fodp → parseFodp.
 *
 * Live soffice convert is tests/scripts/probe-slides-speakernotes-import.mjs
 * and tests/live/slides-speakernotes-import-real-conversion.mjs so run-tests.js
 * stays under 60s. SOFFICE_NOTES_FODP is the draw:page structure soffice actually
 * wrote from that PPTX (page-thumbnail + presentation:class="notes", text:span).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PPTX = path.join(root, "tests", "fixtures", "real-office-samples", "sample-slides-notes.pptx");
const FODP_SRC = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-slides-notes.fodp");

const NOTE_SLIDE1_A = "Nhấn mạnh số liệu quý 4: Đã đạt & vượt 120% kế hoạch đề ra!";
const NOTE_SLIDE1_B = "Cần lưu ý: Tỷ giá ngoại tệ không được đọc trước khán giả.";
const NOTE_SLIDE3 = "Gợi ý chuyển slide: dừng 5 giây tại sơ đồ kiến trúc.";
const TITLE_SLIDE1 = "Báo cáo đề án VN Office 2026";

/** Captured from soffice PPTX→FODP of sample-slides-notes.pptx (probe 05/09/2026). */
const SOFFICE_NOTES_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:body><office:presentation>
    <draw:page draw:name="Báo cáo đề án VN Office 2026" draw:style-name="dp3" draw:master-page-name="Default">
      <draw:frame presentation:class="title" svg:x="1.4cm" svg:y="1.999cm" svg:width="25.199cm" svg:height="3.001cm">
        <draw:text-box>
          <text:p><text:span>Báo cáo đề án VN Office 2026</text:span></text:p>
        </draw:text-box>
      </draw:frame>
      <draw:frame presentation:class="outline" svg:x="1.4cm" svg:y="5.5cm" svg:width="25.199cm" svg:height="7.999cm">
        <draw:text-box>
          <text:p><text:span>Kiến trúc nền tảng LibreOffice</text:span></text:p>
          <text:p><text:span>Tương thích định dạng PPTX</text:span></text:p>
        </draw:text-box>
      </draw:frame>
      <presentation:notes draw:style-name="dp4">
        <draw:page-thumbnail draw:page-number="1" presentation:class="page" svg:width="16.485cm" svg:height="9.272cm" svg:x="2.257cm" svg:y="2.257cm"/>
        <draw:frame presentation:class="notes" presentation:user-transformed="true" svg:width="16.485cm" svg:height="13.365cm" svg:x="2.257cm" svg:y="13.728cm">
          <draw:text-box>
            <text:p><text:span>Nhấn mạnh số liệu quý 4: Đã đạt &amp; vượt 120% kế hoạch đề ra!</text:span></text:p>
            <text:p><text:span>Cần lưu ý: Tỷ giá ngoại tệ không được đọc trước khán giả.</text:span></text:p>
          </draw:text-box>
        </draw:frame>
      </presentation:notes>
    </draw:page>
    <draw:page draw:name="page2" draw:style-name="dp3" draw:master-page-name="Default_20_1">
      <draw:frame presentation:class="title" svg:x="1.4cm" svg:y="1.999cm" svg:width="25.199cm" svg:height="3.001cm">
        <draw:text-box>
          <text:p><text:span>Slide không có ghi chú thuyết trình</text:span></text:p>
        </draw:text-box>
      </draw:frame>
      <draw:frame presentation:class="outline" svg:x="1.4cm" svg:y="5.5cm" svg:width="25.199cm" svg:height="7.999cm">
        <draw:text-box>
          <text:p><text:span>Nội dung công khai trên canvas</text:span></text:p>
        </draw:text-box>
      </draw:frame>
      <presentation:notes draw:style-name="dp2">
        <draw:page-thumbnail draw:page-number="2" presentation:class="page"/>
        <draw:frame presentation:class="notes" presentation:placeholder="true">
          <draw:text-box/>
        </draw:frame>
      </presentation:notes>
    </draw:page>
    <draw:page draw:name="Lộ trình triển khai" draw:style-name="dp3" draw:master-page-name="Default_20_1">
      <draw:frame presentation:class="title" svg:x="1.4cm" svg:y="1.999cm" svg:width="25.199cm" svg:height="3.001cm">
        <draw:text-box>
          <text:p><text:span>Lộ trình triển khai</text:span></text:p>
        </draw:text-box>
      </draw:frame>
      <presentation:notes draw:style-name="dp4">
        <draw:frame presentation:class="notes" presentation:user-transformed="true">
          <draw:text-box>
            <text:p><text:span>Gợi ý chuyển slide: dừng 5 giây tại sơ đồ kiến trúc.</text:span></text:p>
          </draw:text-box>
        </draw:frame>
      </presentation:notes>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;

/** Notes master placeholders soffice DID emit, inlined on a page to lock the filter. */
const NOTES_WITH_MASTER_PLACEHOLDERS_FODP = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0">
  <office:body><office:presentation>
    <draw:page draw:name="page1">
      <draw:frame presentation:class="title"><draw:text-box><text:p>Tiêu đề công khai</text:p></draw:text-box></draw:frame>
      <presentation:notes>
        <draw:page-thumbnail presentation:class="page"/>
        <draw:frame presentation:class="notes">
          <draw:text-box><text:p>Ghi chú thật cho người thuyết trình</text:p></draw:text-box>
        </draw:frame>
        <draw:frame presentation:class="header">
          <draw:text-box><text:p>Công ty TNHH VN Office</text:p></draw:text-box>
        </draw:frame>
        <draw:frame presentation:class="date-time">
          <draw:text-box><text:p>05/09/2026</text:p></draw:text-box>
        </draw:frame>
        <draw:frame presentation:class="footer">
          <draw:text-box><text:p>Bản nội bộ</text:p></draw:text-box>
        </draw:frame>
        <draw:frame presentation:class="page-number">
          <draw:text-box><text:p>&lt;number&gt;</text:p></draw:text-box>
        </draw:frame>
      </presentation:notes>
    </draw:page>
  </office:presentation></office:body>
</office:document>`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSlidesSpeakernotesImportTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const asyncTest = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("PPTX fixture là notesSlide OOXML thật, không phải VN serialize", () => {
    assert(fs.existsSync(PPTX), `thiếu ${PPTX}`);
    assert(fs.existsSync(FODP_SRC), `thiếu ${FODP_SRC}`);
    const src = fs.readFileSync(FODP_SRC, "utf8");
    assert(src.includes("<presentation:notes"), "FODP nguồn phải viết tay presentation:notes");
    assert(src.includes("Nhấn mạnh số liệu quý 4"), "FODP nguồn thiếu notes slide 1");
    assert(src.includes("Đã đạt &amp; vượt"), "FODP nguồn phải escape & trong notes");
    assert(!src.includes("vno:"), "FODP nguồn không được chứa metadata VN serialize");

    const names = listZipEntries(PPTX).map((entry) => entry.name);
    assert(names.includes("ppt/notesSlides/notesSlide1.xml"), "thiếu ppt/notesSlides/notesSlide1.xml");
    assert(names.includes("ppt/notesSlides/notesSlide3.xml"), "thiếu ppt/notesSlides/notesSlide3.xml");
    assert(!names.includes("ppt/notesSlides/notesSlide2.xml"), "slide không notes không được bịa notesSlide2");
    assert(names.includes("ppt/notesMasters/notesMaster1.xml"), "thiếu notesMaster");

    const types = readZipEntry(PPTX, "[Content_Types].xml").toString("utf8");
    assert(/notesSlide/i.test(types), "[Content_Types] thiếu notesSlide");

    const slide1 = readZipEntry(PPTX, "ppt/notesSlides/notesSlide1.xml").toString("utf8");
    assert(/<p:notes\b/i.test(slide1), "notesSlide1 phải là p:notes");
    assert(/<p:ph\b[^>]*type=["']body["']/i.test(slide1), "notesSlide1 thiếu placeholder body");
    assert(slide1.includes("Nhấn mạnh số liệu quý 4"), "notesSlide1.xml thiếu dòng 1");
    assert(slide1.includes("Đã đạt") && (slide1.includes("&amp;") || slide1.includes("&")), "notesSlide1.xml thiếu dấu & trong notes");
    assert(slide1.includes(NOTE_SLIDE1_B), `notesSlide1.xml thiếu ${NOTE_SLIDE1_B}`);

    const slide3 = readZipEntry(PPTX, "ppt/notesSlides/notesSlide3.xml").toString("utf8");
    assert(slide3.includes(NOTE_SLIDE3), `notesSlide3.xml thiếu ${NOTE_SLIDE3}`);

    const rels1 = readZipEntry(PPTX, "ppt/slides/_rels/slide1.xml.rels").toString("utf8");
    const rels2 = readZipEntry(PPTX, "ppt/slides/_rels/slide2.xml.rels").toString("utf8");
    const rels3 = readZipEntry(PPTX, "ppt/slides/_rels/slide3.xml.rels").toString("utf8");
    assert(/notesSlide/i.test(rels1) && rels1.includes("notesSlide1.xml"), "slide1.xml.rels phải trỏ notesSlide1");
    assert(!/notesSlide/i.test(rels2), "slide2 không notes không được có rel notesSlide");
    assert(/notesSlide/i.test(rels3) && rels3.includes("notesSlide3.xml"), "slide3.xml.rels phải trỏ notesSlide3");
  });

  test("Canned soffice FODP: parseFodp đọc notes tiếng Việt, không lẫn body, slide trống notes rỗng", () => {
    const slides = new SlidesAdapter(null).parseFodp(SOFFICE_NOTES_FODP);
    assert(slides.length === 3, `slides=${slides.length}`);
    assert(slides[0].title === TITLE_SLIDE1, `title0=${slides[0].title}`);
    assert(slides[0].body.includes("Kiến trúc nền tảng LibreOffice"), `body0=${slides[0].body}`);
    assert(slides[0].notes === `${NOTE_SLIDE1_A}\n${NOTE_SLIDE1_B}`, `notes0=${JSON.stringify(slides[0].notes)}`);
    assert(!slides[0].body.includes("Nhấn mạnh số liệu"), "notes bị lẫn vào body slide 1");
    assert(!String(slides[0].title).includes("Nhấn mạnh"), "notes bị lẫn vào title");

    assert(slides[1].title === "Slide không có ghi chú thuyết trình", `title1=${slides[1].title}`);
    assert(slides[1].notes === "", `notes1 phải rỗng, thực tế=${JSON.stringify(slides[1].notes)}`);
    assert(slides[1].body === "Nội dung công khai trên canvas", `body1=${slides[1].body}`);

    assert(slides[2].title === "Lộ trình triển khai", `title2=${slides[2].title}`);
    assert(slides[2].notes === NOTE_SLIDE3, `notes2=${JSON.stringify(slides[2].notes)}`);
    assert(!slides[2].body.includes("Gợi ý chuyển slide"), "notes slide 3 lẫn body");
  });

  test("Header/footer/date/page-number trên notes page không thành slide.notes", () => {
    const slides = new SlidesAdapter(null).parseFodp(NOTES_WITH_MASTER_PLACEHOLDERS_FODP);
    assert(slides.length === 1, `slides=${slides.length}`);
    assert(slides[0].notes === "Ghi chú thật cho người thuyết trình", `notes=${JSON.stringify(slides[0].notes)}`);
    assert(!slides[0].notes.includes("Công ty TNHH VN Office"), "header notes master bị lẫn");
    assert(!slides[0].notes.includes("05/09/2026"), "date-time bị lẫn vào notes");
    assert(!slides[0].notes.includes("Bản nội bộ"), "footer bị lẫn vào notes");
    assert(!slides[0].notes.includes("<number>"), "page-number bị lẫn vào notes");
    assert(slides[0].title === "Tiêu đề công khai", `title=${slides[0].title}`);
    assert(!slides[0].body.includes("Ghi chú thật"), "notes lẫn body khi có placeholder master");
  });

  test("loadFromFodp nạp notes vào canvas.slides và selectSlide(0) đưa lên panel", () => {
    let selected = null;
    const canvas = {
      slides: [],
      notesTextarea: { value: "" },
      selectSlide(index) {
        selected = index;
        this.notesTextarea.value = this.slides[index]?.notes || "";
      }
    };
    const adapter = new SlidesAdapter(canvas);
    adapter.loadFromFodp(SOFFICE_NOTES_FODP);
    assert(canvas.slides.length === 3, `slides=${canvas.slides.length}`);
    assert(selected === 0, `selected=${selected}`);
    assert(canvas.slides[0].notes.includes(NOTE_SLIDE1_A), "loadFromFodp mất notes slide 1");
    assert(canvas.notesTextarea.value.includes(NOTE_SLIDE1_A), "panel Speaker Notes không nhận notes slide đang chọn");
    assert(canvas.slides[1].notes === "", "slide 2 phải notes rỗng sau loadFromFodp");
    assert(canvas.slides[2].notes === NOTE_SLIDE3, "loadFromFodp mất notes slide 3");
  });

  await asyncTest("adapter.open() đi FODP soffice và giữ Speaker Notes", async () => {
    const canvas = {
      slides: [],
      notesTextarea: { value: "" },
      selectSlide(index) {
        this.notesTextarea.value = this.slides[index]?.notes || "";
      }
    };
    const adapter = new SlidesAdapter(canvas);
    const original = globalUnoBridge.openRealFile;
    globalUnoBridge.openRealFile = async () => ({
      status: "ok",
      content: SOFFICE_NOTES_FODP,
      fileName: "sample-slides-notes.pptx"
    });
    try {
      const ok = await adapter.open();
      assert(ok === true, "open phải trả true");
      assert(canvas.slides[0].notes.includes("Tỷ giá ngoại tệ"), "open mất notes");
      assert(canvas.notesTextarea.value.includes("Tỷ giá ngoại tệ"), "open không đẩy notes lên panel");
      assert(canvas.slides[1].notes === "", "open bịa notes cho slide trống");
    } finally {
      globalUnoBridge.openRealFile = original;
    }
  });

  test("parseFodp notes VN serialize (class=notes, không thumbnail) vẫn đọc đúng", () => {
    const xml = new SlidesAdapter({
      slides: [{
        id: 1,
        title: "Một slide",
        body: "Nội dung",
        shapes: [],
        notes: "Ghi chú tự tạo trong VN Slides\nDòng hai"
      }]
    }).serializeToFodp();
    const parsed = new SlidesAdapter(null).parseFodp(xml);
    assert(parsed[0].notes === "Ghi chú tự tạo trong VN Slides\nDòng hai", `notes=${JSON.stringify(parsed[0].notes)}`);
  });

  return results;
}
