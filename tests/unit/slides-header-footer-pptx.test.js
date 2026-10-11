import assert from "node:assert/strict";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runSlidesHeaderFooterPptxTests() {
  const canvas = {
    slides: [
      { title: "Applied", body: "", layoutType: "blank", shapes: [], headerFooter: {
        showDate: true, dateFormat: "yyyy-MM-dd", showSlideNumber: true,
        showFooter: true, footerText: "Quarterly report", applyToAll: false
      } },
      { title: "Untouched", body: "", layoutType: "blank", shapes: [] }
    ],
    sections: [],
    slideSize: { width: 960, height: 540 },
    headerFooter: { showDate: false, showSlideNumber: false, showFooter: false, applyToAll: false },
    masterTheme: {},
    currentSlideIndex: 0,
    selectSlide(index) { this.currentSlideIndex = index; }
  };
  const adapter = new SlidesAdapter(canvas);
  const fodp = adapter.serializeToFodp();
  const firstPage = fodp.match(/<draw:page\b[^>]*>[\s\S]*?<\/draw:page>/i)?.[0] || "";
  const secondPage = fodp.match(/<draw:page\b[^>]*>[\s\S]*?<\/draw:page>/ig)?.[1] || "";
  assert.match(firstPage, /presentation:class="date-time"[^>]*vno:date-format="yyyy-MM-dd"|vno:date-format="yyyy-MM-dd"[^>]*presentation:class="date-time"/);
  assert.match(firstPage, /presentation:class="page-number"/);
  assert.match(firstPage, /presentation:class="footer"[\s\S]*?Quarterly report/);
  assert.doesNotMatch(secondPage, /presentation:class="(?:date-time|page-number|footer)"/,
    "slide without explicit apply must not gain fields");

  const reopened = new SlidesAdapter(null).parseFodp(fodp);
  assert.deepEqual(reopened[0].headerFooter, {
    showDate: true,
    dateFormat: "yyyy-MM-dd",
    showSlideNumber: true,
    showFooter: true,
    footerText: "Quarterly report",
    applyToAll: false
  });
  assert.equal(reopened[1].headerFooter, undefined, "untouched slide remains untouched after reopen");
  return [{ name: "Slides header/footer per-slide FODP save and reopen", pass: true }];
}
