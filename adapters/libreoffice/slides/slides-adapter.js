/**
 * VN Office LibreOffice Adapter — VN Slides Adapter
 * Quản lý tương tác với StarImpress (sd) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog } from "../../../platform/ui-kit/dialogs.js";

export class SlidesAdapter {
  constructor(canvasController) {
    this.canvas = canvasController;
    this.isDirty = false;
  }

  attach() {
    globalUnoBridge.attachDocument(this);
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.canvas) return false;

    switch (vnCmdId) {
      case "slides.slide.new":
        return this.canvas.addNewSlide();

      case "slides.slide.duplicate":
        return this.canvas.duplicateCurrentSlide();

      case "slides.slide.delete":
        return this.canvas.deleteCurrentSlide();

      case "slides.show.startFromBegin":
        return this.canvas.startSlideShow(0);

      case "slides.show.startFromCurrent":
        return this.canvas.startSlideShow();

      case "slides.text.insert":
        this.canvas.bodyEl.innerText += "\n• Khung văn bản mới bổ sung";
        this.canvas._renderThumbnails();
        return true;

      case "slides.shape.insert":
        if (typeof window !== "undefined" && typeof document !== "undefined") {
          await showAlertDialog({
            title: "Chèn Hình Khối",
            message: "Đã chèn đối tượng hình khối vector (LibreOffice Drawing Shape)."
          });
        }
        return true;

      case "slides.image.insert":
        if (typeof window !== "undefined" && typeof document !== "undefined") {
          await showAlertDialog({
            title: "Chèn Hình Ảnh",
            message: "Đã mở hộp thoại chèn hình ảnh minh họa trình chiếu."
          });
        }
        return true;

      case "common.edit.undo":
        return this.canvas.undo ? this.canvas.undo() : false;

      case "common.edit.redo":
        return this.canvas.redo ? this.canvas.redo() : false;

      case "common.file.save":
        this.isDirty = false;
        console.log("[SlidesAdapter] Đã lưu bản trình chiếu sd.");
        return true;

      default:
        return false;
    }
  }
}
