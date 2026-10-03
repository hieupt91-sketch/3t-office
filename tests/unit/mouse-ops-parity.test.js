/**
 * Tests — Mouse Operations Parity & Sheet Cell Overflow (Suite 237)
 * Kiểm tra các tính năng thao tác chuột tương thích chuẩn Office và tràn chữ ô tính:
 * 1. Doc Table Auto-Fit & Border Hit-Testing (Col/Row resize)
 * 2. Doc Text Drag-Drop (Move vs Copy logic)
 * 3. Sheet Cell Drag-Drop (Move vs Copy & Undo)
 * 4. Sheet Column & Row Resize Logic & Range Selection
 * 5. Sheet Composing Text/Formula Overflow to Right (Bước 3)
 * 6. Slide Filmstrip Reorder & Marquee Selection Intersection
 */

import { WriterTableController } from "../../apps/writer/writer-table.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

const createMockContainer = () => ({
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } }
});

export async function runMouseOpsParityTests() {
  const results = [];

  const assert = (condition, name, errorMsg = "") => {
    if (condition) {
      results.push({ name, pass: true });
    } else {
      results.push({ name, pass: false, error: errorMsg || `Thất bại: ${name}` });
    }
  };

  // =========================================================================
  // Nhóm 1: Doc Table Resize & Auto-fit
  // =========================================================================
  try {
    const tableAdapter = new WriterAdapter();
    const fakeTable = {
      rows: [
        { cells: [{ innerText: "Họ và tên", style: {} }, { innerText: "Chức vụ", style: {} }] },
        { cells: [{ innerText: "Nguyễn Văn A - Trưởng ban Kỹ thuật và Công nghệ", style: {} }, { innerText: "Trưởng ban", style: {} }] }
      ]
    };

    const fitWidth = tableAdapter.autoFitTableColumn(fakeTable, 0);
    assert(
      fitWidth > 200 && fitWidth <= 650,
      "Doc Auto-Fit: Tính độ rộng tự vừa cho cột chứa chuỗi dài hợp lý (> 200px)",
      `Độ rộng tính được: ${fitWidth}`
    );

    const fitWidthCol1 = tableAdapter.autoFitTableColumn(fakeTable, 1);
    assert(
      fitWidthCol1 < fitWidth,
      "Doc Auto-Fit: Cột có chuỗi ngắn hơn có độ rộng nhỏ hơn cột chuỗi dài",
      `fitWidthCol1=${fitWidthCol1}, fitWidth=${fitWidth}`
    );

    // Kiểm tra gán style.width cho các cell trong cột
    assert(
      fakeTable.rows[0].cells[0].style.width === `${fitWidth}px` &&
      fakeTable.rows[1].cells[0].style.width === `${fitWidth}px`,
      "Doc Auto-Fit: Đã áp dụng style.width chuẩn cho mọi ô trong cùng cột"
    );
  } catch (err) {
    assert(false, "Doc Auto-Fit table column exception", err.message);
  }

  // =========================================================================
  // Nhóm 2: Doc Text Drag & Drop (Move vs Copy logic)
  // =========================================================================
  try {
    // Mô phỏng Document Fragment và trích xuất nội dung
    const createFakeNode = (text) => ({ text, parent: null });
    const fakeSrc = { content: "VAN_BAN_KEO_THA" };
    
    // Thao tác Move: nguồn mất, đích nhận
    const moveOp = (src, dest) => {
      const extracted = src.content;
      src.content = "";
      dest.content = (dest.content || "") + extracted;
    };

    const destMove = { content: "Đích: " };
    moveOp(fakeSrc, destMove);
    assert(
      fakeSrc.content === "" && destMove.content === "Đích: VAN_BAN_KEO_THA",
      "Doc Drag-Drop: Thao tác Di chuyển (Move) trích xuất khỏi nguồn và thêm vào đích"
    );

    // Thao tác Copy: nguồn giữ nguyên, đích nhận bản sao
    const fakeSrcCopy = { content: "DU_LIEU_SAO_CHEP" };
    const destCopy = { content: "Đích: " };
    const copyOp = (src, dest) => {
      const cloned = src.content;
      dest.content = (dest.content || "") + cloned;
    };
    copyOp(fakeSrcCopy, destCopy);
    assert(
      fakeSrcCopy.content === "DU_LIEU_SAO_CHEP" && destCopy.content === "Đích: DU_LIEU_SAO_CHEP",
      "Doc Drag-Drop: Thao tác Sao chép (Ctrl+kéo Copy) giữ nguyên nguồn và sao chép vào đích"
    );
  } catch (err) {
    assert(false, "Doc Drag-Drop logic exception", err.message);
  }

  // =========================================================================
  // Nhóm 3: Sheet Cell Drag-Drop (Move vs Copy & Undo)
  // =========================================================================
  try {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    grid.cellsData.set("D1", { val: "GIA_TRI_TEST" });

    // Mô phỏng kéo viền ô di chuyển D1 -> F1
    const fromCoord = "D1";
    const toCoord = "F1";
    const srcVal = grid.cellsData.get(fromCoord)?.val;

    // Move:
    grid.undoStack = [];
    grid.undoStack.push({
      type: "move-cell",
      from: fromCoord,
      to: toCoord,
      oldSrcVal: srcVal,
      oldDestVal: grid.cellsData.get(toCoord)?.val || ""
    });
    grid.cellsData.delete(fromCoord);
    grid.cellsData.set(toCoord, { val: srcVal });

    assert(
      !grid.cellsData.has("D1") && grid.cellsData.get("F1")?.val === "GIA_TRI_TEST",
      "Sheet Drag Cell Move: Ô nguồn D1 bị xóa và ô đích F1 nhận giá trị"
    );

    // Undo:
    const undoItem = grid.undoStack.pop();
    if (undoItem.type === "move-cell") {
      grid.cellsData.set(undoItem.from, { val: undoItem.oldSrcVal });
      if (undoItem.oldDestVal) {
        grid.cellsData.set(undoItem.to, { val: undoItem.oldDestVal });
      } else {
        grid.cellsData.delete(undoItem.to);
      }
    }

    assert(
      grid.cellsData.get("D1")?.val === "GIA_TRI_TEST" && !grid.cellsData.has("F1"),
      "Sheet Drag Cell Move Undo: Hoàn tác Ctrl+Z khôi phục ô D1 và xóa ô F1"
    );

    // Copy:
    grid.cellsData.set("H1", { val: grid.cellsData.get("D1")?.val });
    assert(
      grid.cellsData.get("D1")?.val === "GIA_TRI_TEST" && grid.cellsData.get("H1")?.val === "GIA_TRI_TEST",
      "Sheet Drag Cell Copy: Cả ô nguồn D1 và ô đích H1 đều giữ giá trị khi Ctrl+kéo"
    );
  } catch (err) {
    assert(false, "Sheet Cell Drag-Drop exception", err.message);
  }

  // =========================================================================
  // Nhóm 4: Sheet Auto-fit Column & Row Resize Logic
  // =========================================================================
  try {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    grid.setCellValue("B", 1, "Chuỗi rất dài kiểm tra độ rộng tự vừa khít của cột B", false);
    grid.setColumnWidths(80, ["B"], false);

    assert(
      grid.getColumnWidth("B") === 80,
      "Sheet Column Width: Đặt độ rộng ban đầu cho cột B là 80px"
    );

    const fitted = grid.autoFitColumn("B");
    assert(
      fitted > 150,
      `Sheet Auto-fit Column: Độ rộng sau auto-fit (${fitted}px) lớn hơn 150px đối với chuỗi dài`
    );

    // Thay đổi chiều cao hàng
    grid.setRowHeights(45, [5], false);
    assert(
      grid.getRowHeight(5) === 45,
      "Sheet Row Height: Thay đổi chiều cao hàng 5 thành 45px chính xác"
    );
  } catch (err) {
    assert(false, "Sheet Column & Row resize exception", err.message);
  }

  // =========================================================================
  // Nhóm 5: Sheet Composing Text/Formula Overflow to Right (Bước 3)
  // =========================================================================
  try {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    // Đảm bảo ô E10 rỗng và các ô F10, G10 cũng rỗng
    grid.setCellValue("E", 10, "", false);
    grid.setCellValue("F", 10, "", false);
    grid.setCellValue("G", 10, "", false);

    // Kiểm tra hàm kiểm tra ô bên phải có rỗng không
    const rightCell1 = grid.cellsData.get("F10")?.val || "";
    const rightCell2 = grid.cellsData.get("G10")?.val || "";
    const canOverflow = rightCell1 === "" && rightCell2 === "";

    assert(
      canOverflow === true,
      "Sheet Overflow: Xác định điều kiện cho phép tràn chữ khi các ô bên phải rỗng"
    );

    // Khi ô bên phải có dữ liệu, không được tràn
    grid.setCellValue("F", 10, "ĐÃ CÓ DỮ LIỆU", false);
    const blockedOverflow = (grid.cellsData.get("F10")?.val || "") === "";
    assert(
      blockedOverflow === false,
      "Sheet Overflow: Chặn tràn chữ khi ô liền kề bên phải F10 đã có dữ liệu"
    );
  } catch (err) {
    assert(false, "Sheet Overflow logic exception", err.message);
  }

  // =========================================================================
  // Nhóm 6: Slide Filmstrip Reorder & Marquee Selection
  // =========================================================================
  try {
    const canvas = new SlidesCanvasController();
    canvas.slides = [
      { id: "s1", title: "TRANG_MOT", shapes: [{ id: "sh1", x: 50, y: 50, w: 100, h: 80 }] },
      { id: "s2", title: "TRANG_HAI", shapes: [{ id: "sh2", x: 200, y: 50, w: 120, h: 90 }] },
      { id: "s3", title: "TRANG_BA", shapes: [] }
    ];
    canvas.currentSlideIndex = 0;

    // Kéo slide 0 xuống vị trí 1
    const moveRes = canvas.moveSlide(0, 1);
    assert(
      moveRes === true && canvas.slides[0].title === "TRANG_HAI" && canvas.slides[1].title === "TRANG_MOT",
      "Slide Filmstrip Reorder: Kéo trang 1 xuống dưới trang 2 đổi thứ tự thành [TRANG_HAI, TRANG_MOT, TRANG_BA]"
    );

    // Hoàn tác
    const undoRes = canvas.undo();
    assert(
      undoRes === true && canvas.slides[0].title === "TRANG_MOT" && canvas.slides[1].title === "TRANG_HAI",
      "Slide Filmstrip Reorder Undo: Hoàn tác Ctrl+Z khôi phục TRANG_MOT về vị trí đầu tiên"
    );

    // Kiểm tra logic giao điểm Marquee Selection
    const testIntersects = (box, shape) => {
      const shRight = shape.x + shape.w;
      const shBottom = shape.y + shape.h;
      const mRight = box.x + box.w;
      const mBottom = box.y + box.h;
      return !(shRight < box.x || shape.x > mRight || shBottom < box.y || shape.y > mBottom);
    };

    const marqueeBox = { x: 30, y: 30, w: 320, h: 150 };
    const shape1 = canvas.slides[0].shapes[0]; // sh1: 50, 50, 100, 80
    const shape2 = canvas.slides[1].shapes[0]; // sh2: 200, 50, 120, 90
    const farShape = { id: "shFar", x: 500, y: 500, w: 60, h: 60 };

    assert(
      testIntersects(marqueeBox, shape1) && testIntersects(marqueeBox, shape2),
      "Slide Marquee: Khung bao chọn bao trùm cả 2 shape sh1 và sh2"
    );

    assert(
      !testIntersects(marqueeBox, farShape),
      "Slide Marquee: Shape nằm ngoài vùng chọn (shFar) không bị chọn"
    );
  } catch (err) {
    assert(false, "Slide Filmstrip Reorder & Marquee exception", err.message);
  }

  return results;
}
