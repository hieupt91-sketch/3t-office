import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";

/** Build sample pages explicitly for tests that exercise multi-slide operations. */
export function createSlidesCanvasFixture(container, count = 3, options = {}) {
  const initialSlides = Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Test slide ${index + 1}`,
    body: `Test content ${index + 1}`,
    layoutType: "title-content",
    shapes: [],
    comments: [],
    notes: "",
    hidden: false,
    titleAnimation: { type: "none", duration: 500, delay: 0 }
  }));
  return new SlidesCanvasController(container, {
    isBlankTemplate: false,
    initialSlides,
    ...options
  });
}
