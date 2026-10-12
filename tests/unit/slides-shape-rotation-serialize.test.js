/**
 * VN Slides — Kiểm thử serialize góc xoay hình (shape.rotation) khi lưu FODP.
 *
 * _shapeGeomAttrs() phải ghi draw:transform="rotate(...) translate(...)" thay
 * vì svg:x/svg:y khi shape.rotation khác 0/undefined. Khi không xoay vẫn giữ
 * svg:x/svg:y như cũ (không thoái lui).
 */
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(`${message} — expected to include "${needle}", got: ${haystack.slice(0, 200)}`);
}

function assertNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) throw new Error(`${message} — must NOT include "${needle}", got: ${haystack.slice(0, 200)}`);
}

export async function runSlidesShapeRotationSerializeTests() {
  const results = [];

  function test(name, fn) {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  }

  const canvas = {
    slides: [{
      id: 1,
      title: "Test slide",
      body: "",
      layoutType: "blank",
      notes: "",
      shapes: [
        { id: "rotated-rect", type: "rect", x: 100, y: 50, w: 200, h: 100, color: "#ff0000", text: "Xoay", rotation: 30 },
        { id: "normal-rect", type: "rect", x: 100, y: 50, w: 200, h: 100, color: "#00ff00", text: "Bình thường" }
      ]
    }]
  };

  const adapter = new SlidesAdapter(canvas);
  const fodp = adapter.serializeToFodp();

  test("rotated shape emits draw:transform with rotate and translate", () => {
    const rotatedMatch = fodp.match(/draw:id="rotated-rect"[^>]*>/);
    const attrs = rotatedMatch ? rotatedMatch[0] : "";
    assertIncludes(attrs, "draw:transform=", "rotated shape must have draw:transform");
    assertIncludes(attrs, "rotate (", "rotated shape must have rotate in draw:transform");
    assertIncludes(attrs, "translate (", "rotated shape must have translate in draw:transform");
  });

  test("rotated shape does NOT emit svg:x/svg:y", () => {
    const drawPageMatch = fodp.match(/draw:id="rotated-rect"[^>]*>/);
    const attrs = drawPageMatch ? drawPageMatch[0] : fodp;
    assertNotIncludes(attrs, "svg:x=", "rotated shape must not have svg:x");
    assertNotIncludes(attrs, "svg:y=", "rotated shape must not have svg:y");
  });

  test("rotated shape emits correct radian value for 30 degrees", () => {
    const expectedRadian = -(30 * Math.PI / 180);
    const expectedRadianStr = String(expectedRadian);
    assertIncludes(fodp, expectedRadianStr, `FODP must contain radian ${expectedRadianStr}`);
  });

  test("rotated shape keeps svg:width and svg:height", () => {
    assertIncludes(fodp, "svg:width=", "rotated shape must keep svg:width");
    assertIncludes(fodp, "svg:height=", "rotated shape must keep svg:height");
  });

  test("non-rotated shape still uses svg:x/svg:y (no regression)", () => {
    const normalMatch = fodp.match(/draw:id="normal-rect"[^>]*>/);
    const attrs = normalMatch ? normalMatch[0] : "";
    assertIncludes(attrs, "svg:x=", "non-rotated shape must have svg:x");
    assertIncludes(attrs, "svg:y=", "non-rotated shape must have svg:y");
    assertNotIncludes(attrs, "draw:transform=", "non-rotated shape must NOT have draw:transform");
  });

  test("shape with explicit outline serializes a distinct ODF graphic style", () => {
    const outlined = new SlidesAdapter({ slides: [{
      id: 1, title: "Outline", body: "", layoutType: "blank", notes: "",
      shapes: [{ id: "outlined", type: "rect", x: 20, y: 20, w: 100, h: 60, color: "#f97316", fill: "#f97316", stroke: "#111827", strokeColor: "#111827", strokeWidth: 2 }]
    }] }).serializeToFodp();
    assertIncludes(outlined, 'draw:stroke="solid" svg:stroke-color="#111827"', "outline style must retain its chosen line color");
    assertIncludes(outlined, 'draw:fill-color="#f97316"', "outline style must retain the shape fill");
    assertIncludes(outlined, 'draw:style-name="grf97316_stroke111827_2"', "outlined shape must point to its distinct graphic style");
  });

  test("serialize with rotation=45 produces correct radian", () => {
    const canvas45 = {
      slides: [{
        id: 1, title: "45deg", body: "", layoutType: "blank", notes: "",
        shapes: [
          { id: "s45", type: "rect", x: 10, y: 20, w: 50, h: 50, color: "#000", text: "", rotation: 45 }
        ]
      }]
    };
    const adapter45 = new SlidesAdapter(canvas45);
    const fodp45 = adapter45.serializeToFodp();
    const expectedRadian = -(45 * Math.PI / 180);
    assertIncludes(fodp45, String(expectedRadian), "45deg must produce correct radian");
    const shape45 = fodp45.match(/<draw:rect\b[^>]*draw:name="s45"[^>]*>/)?.[0] || "";
    assertNotIncludes(shape45, "svg:x=", "rotated 45 shape must not have svg:x");
  });

  test("serialize with rotation=0 uses svg:x/svg:y (no transform)", () => {
    const canvas0 = {
      slides: [{
        id: 1, title: "0deg", body: "", layoutType: "blank", notes: "",
        shapes: [
          { id: "s0", type: "rect", x: 10, y: 20, w: 50, h: 50, color: "#000", text: "", rotation: 0 }
        ]
      }]
    };
    const adapter0 = new SlidesAdapter(canvas0);
    const fodp0 = adapter0.serializeToFodp();
    assertNotIncludes(fodp0, "draw:transform=", "rotation=0 must NOT emit draw:transform");
    assertIncludes(fodp0, "svg:x=", "rotation=0 must emit svg:x");
    assertIncludes(fodp0, "svg:y=", "rotation=0 must emit svg:y");
  });

  test("serialize with rotation=undefined uses svg:x/svg:y (no transform)", () => {
    const canvasUndef = {
      slides: [{
        id: 1, title: "undef", body: "", layoutType: "blank", notes: "",
        shapes: [
          { id: "su", type: "rect", x: 10, y: 20, w: 50, h: 50, color: "#000", text: "" }
        ]
      }]
    };
    const adapterUndef = new SlidesAdapter(canvasUndef);
    const fodpUndef = adapterUndef.serializeToFodp();
    assertNotIncludes(fodpUndef, "draw:transform=", "undefined rotation must NOT emit draw:transform");
    assertIncludes(fodpUndef, "svg:x=", "undefined rotation must emit svg:x");
  });

  return results;
}
