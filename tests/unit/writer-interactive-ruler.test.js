import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  markerPositions,
  mmToScreenPx,
  screenPxToMm,
  stateForMarkerPosition
} from "../../apps/writer/writer-ruler-controller.js";

const base = () => ({
  pageWidthMm: 210,
  pageHeightMm: 297,
  margins: { top: 20, right: 15, bottom: 20, left: 30 },
  paragraph: { leftMm: 12, rightMm: 8, firstLineMm: 5 }
});

export async function runWriterInteractiveRulerTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Thước ngang: đổi mm sang px và ngược lại đúng ở nhiều mức zoom", () => {
    for (const width of [397, 794, 1191, 1588]) {
      const px = mmToScreenPx(37.5, width, 210);
      assert.ok(Math.abs(screenPxToMm(px, width, 210) - 37.5) < 1e-9);
    }
  });

  await test("Thước ngang: dấu phản ánh đúng lề trang và thụt lề thật", () => {
    assert.deepEqual(markerPositions(base()), {
      marginLeft: 30,
      firstLine: 47,
      hanging: 42,
      leftIndent: 42,
      rightIndent: 187,
      marginRight: 195
    });
  });

  await test("Thước ngang: kéo lề luôn giữ tối thiểu 1 cm vùng văn bản", () => {
    const left = stateForMarkerPosition(base(), "marginLeft", 205);
    assert.equal(left.margins.left, 185);
    const right = stateForMarkerPosition(base(), "marginRight", 2);
    assert.equal(right.margins.right, 170);
  });

  await test("Thước ngang: kéo thụt lề trái mang theo dòng đầu, kéo treo giữ dòng đầu", () => {
    const original = base();
    const movedLeft = stateForMarkerPosition(original, "leftIndent", 52);
    assert.equal(markerPositions(movedLeft).firstLine, 57);
    const movedHanging = stateForMarkerPosition(original, "hanging", 52);
    assert.equal(markerPositions(movedHanging).firstLine, 47);
  });

  await test("Thước ngang: không còn tooltip lề 30mm/15mm ghi cứng", () => {
    const source = readFileSync(new URL("../../apps/writer/writer-app.js", import.meta.url), "utf8");
    assert.doesNotMatch(source, /title=["'][^"']*30mm/);
    assert.doesNotMatch(source, /title=["'][^"']*15mm/);
    assert.match(source, /data-ruler-kind="firstLine"/);
    assert.match(source, /role="slider"/);
  });

  return results;
}
