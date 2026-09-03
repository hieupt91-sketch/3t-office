/**
 * VN Office LibreOffice Adapter — VN Slides Adapter
 * Quản lý tương tác với StarDraw/Impress (sd) Presentation Model
 */

import { globalUnoBridge } from "../common/uno-bridge.js";

export class SlidesAdapter {
  constructor(presentationController) {
    this.controller = presentationController;
    this.isDirty = false;
  }

  attach() {
    globalUnoBridge.attachDocument(this);
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.controller) return false;

    switch (vnCmdId) {
      case "slides.slide.new":
        return this.controller.addNewSlide();

      case "slides.slide.delete":
        return this.controller.deleteCurrentSlide();

      case "slides.shape.insert":
        return this.controller.insertShape(args || "rect");

      case "slides.text.insert":
        return this.controller.insertTextBox();

      case "slides.show.startFromBegin":
        return this.controller.startSlideShow(0);

      case "slides.show.startFromCurrent":
        return this.controller.startSlideShow();

      case "common.file.save":
        this.isDirty = false;
        console.log("[SlidesAdapter] Đã lưu bài thuyết trình ODP/PPTX.");
        return true;

      default:
        console.log(`[SlidesAdapter] Đã điều hướng lệnh: ${vnCmdId} (${unoUrl})`);
        return true;
    }
  }
}
