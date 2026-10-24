import fs from "node:fs";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function check(value, message) { if (!value) throw new Error(message); }

export async function runWriterPageHairlineTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("W48: page hairline is not a layout border, so the text column matches Word", () => {
    const css = fs.readFileSync(path.resolve("apps/writer/writer.css"), "utf8");
    const pageRule = css.match(/(?:^|\n)\.vno-writer-page\s*\{([^}]+)\}/);
    check(pageRule, "missing .vno-writer-page rule");
    const body = pageRule[1];
    check(/box-sizing:\s*border-box/.test(body), "page stays border-box so width = paper");
    check(/border:\s*none/.test(body), `layout border must be none (1px border steals 2px): ${body}`);
    check(!/border:\s*1px/.test(body), "the screen page rule must not set a 1px border");
    check(/0\s+0\s+0\s+1px\s+var\(--vno-border-subtle\)/.test(body), "hairline stays visible via box-shadow");
    // d14 (Word COM + GDI): "III. Mở cửa từ bên ngoài bằng thẻ…" Times New Roman 18pt = 624px
    // = (12240 − 1440 − 1440) twips × 96/1440. border-box 816 − 96 − 96 − 2px border = 622 → 2 lines, page 4.
    const wordCol = (12240 - 1440 - 1440) / 1440 * 96;
    check(Math.abs(wordCol - 624) < 0.001, `letter text column must be 624px, got ${wordCol}`);
    const withBorder = 816 - 96 - 96 - 2;
    check(withBorder === 622, "the old border-box column was 622px");
  });

  test("W49: a missing face does not keep the fallback font's line ratio (d16 .VnTimeH)", () => {
    const adapter = new WriterAdapter(null);
    check(adapter._ratioForFontFace(".VnTimeH", 1.27, false) === 1.15, "missing .VnTimeH must not stay 1.27");
    check(adapter._ratioForFontFace("Times New Roman", 1.1499, true) === 1.1499, "installed TNR keeps the measured ratio");
    check(adapter._ratioForFontFace("Calibri", null, null) === 1.2207, "unknown install state with no measurement uses the metric table");
    check(adapter._fontLineRatio(".VnTimeH, sans-serif") === 1.15, `node path must not invent 1.27: ${adapter._fontLineRatio(".VnTimeH, sans-serif")}`);
  });

  test("W51: pagination uses fractional border-box height, not offsetHeight rounded up", () => {
    const adapter = new WriterAdapter(null);
    adapter.pageSetup = { size: "letter", orientation: "portrait", margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }, headerDistanceMm: 12.7, footerDistanceMm: 12.7 };
    adapter.headerDom = { innerText: "", offsetHeight: 0 };
    adapter.footerDom = { innerText: "", offsetHeight: 0 };
    adapter._getUsablePageHeight = () => 250;
    const inserted = [];
    const mk = (top, h, rectH) => {
      const el = {
        tagName: "P", offsetTop: top, offsetHeight: h, textContent: "x", children: [],
        getBoundingClientRect: () => ({ top, height: rectH }),
        getAttribute: () => "", classList: { contains: () => false }, querySelectorAll: () => [],
        parentNode: null
      };
      el.parentNode = { insertBefore: (gap) => inserted.push(gap) };
      return el;
    };
    // Letter usable 864. Khối 2 bắt đầu ở 435, offsetHeight 430 (435+430=865) nhưng rect 428.7 (863.7) thì vừa.
    const a = mk(0, 435, 434.2);
    const b = mk(435, 430, 428.7);
    const body = {
      style: {}, children: [a, b], querySelectorAll: () => [],
      insertBefore: () => {}, dispatchEvent: () => {},
      getBoundingClientRect: () => ({ top: 0 }), scrollTop: 0
    };
    a.parentNode = body; b.parentNode = body;
    adapter.bodyDom = body;
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    globalThis.document = { createElement: () => ({ setAttribute() {}, className: "", appendChild() {} }) };
    globalThis.window = { getComputedStyle: () => ({ marginTop: "0" }) };
    try {
      adapter._alignPageRelativeFloats = () => {};
      adapter._recomputeLivePagination();
      check(inserted.length === 0, `fractional heights 434.2+428.7=862.9 must fit in 864, gaps=${inserted.length}`);
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  test("W52: Letter is 8.5×11 in so the text column is 624px and the body is 864px", () => {
    const adapter = new WriterAdapter(null);
    adapter.pageSetup = {
      size: "letter", orientation: "portrait",
      margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 }
    };
    const dim = adapter.getPageDimensions();
    // 12240×15840 twips. Preset cũ 216×279 mm → trang 1054px, usable 862 (d21 862.9 không vừa, d16 rh 64.55 không vừa).
    check(dim.widthPx === 816, `letter width ${dim.widthPx}`);
    check(dim.heightPx === 1056, `letter height ${dim.heightPx}`);
    check(dim.printableWidthPx === 624, `letter column ${dim.printableWidthPx}`);
    check(dim.printableHeightPx === 864, `letter body ${dim.printableHeightPx}`);
  });

  test("W54: the last line's lower half-leading may cross the bottom margin (d16)", () => {
    const adapter = new WriterAdapter(null);
    adapter._getUsablePageHeight = () => 864;
    const inserted = [];
    const mk = (top, h, lh, fs) => {
      const el = {
        tagName: "P", offsetTop: top, offsetHeight: h, textContent: "x", children: [],
        getBoundingClientRect: () => ({ top, height: h }),
        getAttribute: () => "", classList: { contains: () => false }, querySelectorAll: () => [],
        parentNode: null
      };
      el.parentNode = { insertBefore: (gap) => inserted.push(gap) };
      el._lh = lh; el._fs = fs;
      return el;
    };
    // Trang Letter 864. Đoạn 3 dòng cao 64.55 bắt đầu ở 801 → đáy line box 865.55, sau khi bỏ nửa leading 2.1 còn 863.45.
    const a = mk(0, 100, "21.53px", "17.33px");
    const b = mk(801, 64.55, "21.53px", "17.33px");
    const body = {
      style: {}, children: [a, b], querySelectorAll: () => [],
      insertBefore: () => {}, dispatchEvent: () => {},
      getBoundingClientRect: () => ({ top: 0 }), scrollTop: 0
    };
    a.parentNode = body; b.parentNode = body;
    adapter.bodyDom = body;
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    globalThis.document = { createElement: () => ({ setAttribute() {}, className: "", appendChild() {}, style: { setProperty() {} } }) };
    globalThis.window = {
      getComputedStyle: (el) => ({ marginTop: "0", lineHeight: el._lh || "21.53px", fontSize: el._fs || "17.33px" })
    };
    try {
      adapter._alignPageRelativeFloats = () => {};
      adapter._recomputeLivePagination();
      check(inserted.length === 0, `64.55 − half-leading 2.1 must fit in the last 64.55px of 864, gaps=${inserted.length}`);
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  test("W57: a hidden hyphenation marker cannot shift the first live page origin", () => {
    const adapter = new WriterAdapter(null);
    adapter.pageSetup = { size: "letter", orientation: "portrait", margins: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 } };
    adapter.headerDom = { innerText: "", offsetHeight: 0 };
    adapter.footerDom = { innerText: "", offsetHeight: 0 };
    adapter._getUsablePageHeight = () => 250;
    const inserted = [];
    const make = ({ top, height, marker = false }) => {
      const el = {
        tagName: "SPAN", offsetTop: top, offsetHeight: height, textContent: marker ? "VNO_HYPHENATION_AUTO_V1" : "Nội dung", children: [],
        getBoundingClientRect: () => ({ top, height }),
        getAttribute: (name) => name === "style" && marker ? "display:none" : "",
        classList: { contains: (name) => marker && name === "vno-hyphenation-marker" },
        querySelectorAll: () => [], parentNode: null
      };
      el.parentNode = { insertBefore: (gap) => inserted.push(gap) };
      return el;
    };
    const marker = make({ top: 0, height: 0, marker: true });
    const content = make({ top: 300, height: 100 });
    const body = {
      style: {}, children: [marker, content], querySelectorAll: () => [], insertBefore() {}, dispatchEvent() {},
      getBoundingClientRect: () => ({ top: 300 }), scrollTop: 0
    };
    marker.parentNode = body; content.parentNode = body;
    adapter.bodyDom = body;
    const oldDocument = globalThis.document;
    const oldWindow = globalThis.window;
    globalThis.document = { createElement: () => ({ setAttribute() {}, className: "", appendChild() {}, style: { setProperty() {} } }) };
    globalThis.window = { getComputedStyle: () => ({ marginTop: "0", lineHeight: "20px", fontSize: "16px" }) };
    try {
      adapter._alignPageRelativeFloats = () => {};
      adapter._recomputeLivePagination();
      check(adapter._livePageCount === 1, `hidden marker inflated live pagination to ${adapter._livePageCount} pages`);
    } finally {
      globalThis.document = oldDocument;
      globalThis.window = oldWindow;
    }
  });

  test("W50: imported images align to the bottom of the line box so descent is not added under them", () => {
    const css = fs.readFileSync(path.resolve("apps/writer/writer.css"), "utf8");
    check(/\.vno-writer-page\.vno-doc-imported img[\s\S]*?vertical-align:\s*bottom/.test(css), "imported img must be vertical-align: bottom");
  });

  return results;
}
