import assert from "node:assert/strict";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runSlidesFixL2DuplicateTests() {
  let slideCount = 1;
  let shapeDuplicateCalls = 0;
  let duplicateArgs = null;
  const canvas = {
    selectedShapeIds: new Set(["selected-shape"]),
    duplicateSelectedShapes() {
      shapeDuplicateCalls += 1;
      return true;
    },
    duplicateCurrentSlide(recordUndo, forceSlide) {
      duplicateArgs = [recordUndo, forceSlide];
      if (!forceSlide) return this.duplicateSelectedShapes();
      slideCount += 1;
      return true;
    }
  };
  const adapter = new SlidesAdapter(canvas);
  let status = "";
  adapter.setShell({ setStatus(value) { status = value; } });

  const duplicated = await adapter.handleDispatch(".uno:DuplicatePage", null, "slides.slide.duplicate");
  assert.equal(duplicated, true, "ribbon command reports successful slide duplication");
  assert.deepEqual(duplicateArgs, [true, true], "ribbon command explicitly forces slide duplication");
  assert.equal(slideCount, 2, "selected shape does not redirect the ribbon command to shape duplication");
  assert.equal(shapeDuplicateCalls, 0, "selected shape remains untouched by the slide command");

  canvas.duplicateCurrentSlide = () => false;
  const failed = await adapter.handleDispatch(".uno:DuplicatePage", null, "slides.slide.duplicate");
  assert.equal(failed, false, "command returns failure when there is no active slide");
  assert.match(status, /Không thể nhân đôi slide/, "failure is reported in the status bar");

  return [{ name: "Slides FIX-L2 ribbon duplicate forces a slide and reports failure", pass: true }];
}
