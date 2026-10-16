import assert from "node:assert/strict";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";

function createMockContainer() {
  const listeners = {};
  const el = {
    children: [],
    style: {},
    dataset: {},
    appendChild(child) {
      this.children.push(child);
      child.parentNode = this;
      return child;
    },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
      child.parentNode = null;
      return child;
    },
    querySelector(selector) {
      if (selector.startsWith("#")) {
        const id = selector.slice(1);
        return this.children.find(c => c.id === id) || null;
      }
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener(name, fn) {
      listeners[name] = listeners[name] || [];
      listeners[name].push(fn);
    },
    removeEventListener(name, fn) {
      if (listeners[name]) {
        listeners[name] = listeners[name].filter(f => f !== fn);
      }
    },
    focus() {}
  };
  return el;
}

export async function runSheetArrangeTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("VN Sheet Arrange: Z-Order BringToFront, SendToBack, BringForward, SendBackward", async () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    // Thêm 3 đối tượng: 1 ảnh, 1 hộp văn bản, 1 ảnh
    const img1 = grid.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", { c: "B", r: 2 });
    const box1 = grid.insertTextBox("Ghi chú 1", { c: "C", r: 3 });
    const img2 = grid.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", { c: "D", r: 4 });

    const initialOrder = grid._ensureDrawingOrder(grid.activeSheet);
    assert.deepEqual(initialOrder, [img1.id, box1.id, img2.id], "Thứ tự ban đầu từ đáy lên đỉnh");

    // Bring img1 to front (đưa lên đỉnh)
    grid.bringObjectToFront("image", img1.id);
    let currentOrder = grid.drawingOrderBySheet[grid.activeSheet];
    assert.deepEqual(currentOrder, [box1.id, img2.id, img1.id], "img1 lên đỉnh");

    // Send img1 to back (đưa về đáy)
    grid.sendObjectToBack("image", img1.id);
    currentOrder = grid.drawingOrderBySheet[grid.activeSheet];
    assert.deepEqual(currentOrder, [img1.id, box1.id, img2.id], "img1 về đáy");

    // Bring img1 forward (lên 1 lớp qua box1)
    grid.bringObjectForward("image", img1.id);
    currentOrder = grid.drawingOrderBySheet[grid.activeSheet];
    assert.deepEqual(currentOrder, [box1.id, img1.id, img2.id], "img1 lên vị trí giữa");

    // Send img1 backward (xuống 1 lớp)
    grid.sendObjectBackward("image", img1.id);
    currentOrder = grid.drawingOrderBySheet[grid.activeSheet];
    assert.deepEqual(currentOrder, [img1.id, box1.id, img2.id], "img1 về lại đáy");
  });

  await test("VN Sheet Arrange: Căn chỉnh Align Left, Center, Right, Top, Middle, Bottom", async () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    const box1 = grid.insertTextBox("Box 1", { c: "B", r: 2 });
    const box2 = grid.insertTextBox("Box 2", { c: "F", r: 8 });

    grid.selectObject(box1.id, false);
    grid.selectObject(box2.id, true);
    assert.equal(grid.selectedObjectIds.size, 2, "Đã chọn 2 đối tượng");

    // Căn trái: box2 phải có cùng left với box1
    const b1Before = grid._getObjectPixelBounds(box1, "textbox");
    const b2Before = grid._getObjectPixelBounds(box2, "textbox");
    const minLeft = Math.min(b1Before.left, b2Before.left);

    grid.alignObjects("left");
    const b1After = grid._getObjectPixelBounds(box1, "textbox");
    const b2After = grid._getObjectPixelBounds(box2, "textbox");

    assert.ok(Math.abs(b1After.left - minLeft) < 1, "Box 1 căn trái khớp minLeft");
    assert.ok(Math.abs(b2After.left - minLeft) < 1, "Box 2 căn trái khớp minLeft");

    // Căn đỉnh (top)
    const minTop = Math.min(b1Before.top, b2Before.top);
    grid.alignObjects("top");
    const b1Top = grid._getObjectPixelBounds(box1, "textbox");
    const b2Top = grid._getObjectPixelBounds(box2, "textbox");
    assert.ok(Math.abs(b1Top.top - minTop) < 1, "Box 1 căn trên khớp minTop");
    assert.ok(Math.abs(b2Top.top - minTop) < 1, "Box 2 căn trên khớp minTop");
  });

  await test("VN Sheet Arrange: Phân bố đều Distribute Horizontally & Vertically", async () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    const b1 = grid.insertTextBox("1", { c: "A", r: 2 });
    const b2 = grid.insertTextBox("2", { c: "B", r: 4 });
    const b3 = grid.insertTextBox("3", { c: "J", r: 10 });

    grid.selectObject(b1.id, false);
    grid.selectObject(b2.id, true);
    grid.selectObject(b3.id, true);

    const okH = grid.distributeObjects("horizontal");
    assert.ok(okH, "Distribute horizontally thành công");

    const p1 = grid._getObjectPixelBounds(b1, "textbox");
    const p2 = grid._getObjectPixelBounds(b2, "textbox");
    const p3 = grid._getObjectPixelBounds(b3, "textbox");

    const gap1 = p2.left - p1.right;
    const gap2 = p3.left - p2.right;
    assert.ok(Math.abs(gap1 - gap2) <= 1.0, `Khoảng cách giữa các hộp ngang bằng nhau: gap1=${gap1}, gap2=${gap2}`);

    const okV = grid.distributeObjects("vertical");
    assert.ok(okV, "Distribute vertically thành công");
    const v1 = grid._getObjectPixelBounds(b1, "textbox");
    const v2 = grid._getObjectPixelBounds(b2, "textbox");
    const v3 = grid._getObjectPixelBounds(b3, "textbox");
    const gapV1 = v2.top - v1.bottom;
    const gapV2 = v3.top - v2.bottom;
    assert.ok(Math.abs(gapV1 - gapV2) <= 1.0, `Khoảng cách giữa các hộp dọc bằng nhau: gapV1=${gapV1}, gapV2=${gapV2}`);
  });

  await test("VN Sheet Arrange: Nhóm Group và Bỏ nhóm Ungroup", async () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    const img1 = grid.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", { c: "A", r: 1 });
    const box1 = grid.insertTextBox("Text", { c: "C", r: 3 });

    grid.selectObject(img1.id, false);
    grid.selectObject(box1.id, true);

    const grp = grid.groupObjects();
    assert.ok(grp, "Tạo nhóm thành công");
    assert.ok(grp.id.startsWith("group-"), "ID nhóm đúng chuẩn");
    assert.equal(grp.children.length, 2, "Nhóm chứa 2 con");
    assert.equal(img1.groupId, grp.id, "img1 được gắn groupId");
    assert.equal(box1.groupId, grp.id, "box1 được gắn groupId");

    const order = grid.drawingOrderBySheet[grid.activeSheet];
    assert.ok(order.includes(grp.id), "drawingOrder chứa groupId");
    assert.ok(!order.includes(img1.id), "drawingOrder không còn chứa riêng lẻ img1");

    // Ungroup
    grid.selectObject(grp.id, false);
    const ungrpOk = grid.ungroupObjects();
    assert.ok(ungrpOk, "Bỏ nhóm thành công");
    assert.ok(!img1.groupId, "img1 không còn groupId");
    assert.ok(!box1.groupId, "box1 không còn groupId");
    const orderAfter = grid.drawingOrderBySheet[grid.activeSheet];
    assert.ok(!orderAfter.includes(grp.id), "drawingOrder không còn groupId");
    assert.ok(orderAfter.includes(img1.id) && orderAfter.includes(box1.id), "drawingOrder phục hồi các con");
  });

  await test("VN Sheet Arrange: Xoay 90° và Lật ngang/dọc Rotate & Flip", async () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    const img = grid.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", { c: "A", r: 1 });
    grid.selectObject(img.id, false);

    assert.equal(Number(img.rotation || 0), 0, "Góc ban đầu 0");
    grid.rotateRight90();
    assert.equal(img.rotation, 90, "Xoay phải 90° -> 90");
    grid.rotateRight90();
    assert.equal(img.rotation, 180, "Xoay phải tiếp -> 180");
    grid.rotateLeft90();
    assert.equal(img.rotation, 90, "Xoay trái 90° -> 90");

    assert.ok(!img.flipH, "Ban đầu không flipH");
    grid.flipHorizontal();
    assert.equal(img.flipH, true, "Lật ngang -> flipH = true");
    grid.flipHorizontal();
    assert.equal(img.flipH, false, "Lật ngang lại -> flipH = false");

    assert.ok(!img.flipV, "Ban đầu không flipV");
    grid.flipVertical();
    assert.equal(img.flipV, true, "Lật dọc -> flipV = true");
  });

  await test("VN Sheet Arrange: Selection Pane ẩn/hiện, đổi tên và kiểm soát hiển thị", async () => {
    const container = createMockContainer();
    const grid = createSheetGridWithSheets(container, ["Sheet1"]);
    const box = grid.insertTextBox("Tiêu đề báo cáo", { c: "B", r: 2 });

    assert.equal(grid.isSelectionPaneOpen, false, "Ban đầu đóng Ngăn chọn");
    grid.toggleSelectionPane(true);
    assert.equal(grid.isSelectionPaneOpen, true, "Đã mở Ngăn chọn");

    // Đổi tên
    grid.renameObject(box.id, "Khung tiêu đề chính");
    assert.equal(box.name, "Khung tiêu đề chính", "Đổi tên đối tượng thành công");

    // Ẩn/hiện
    assert.ok(box.visible !== false, "Mặc định hiển thị");
    grid.toggleObjectVisibility(box.id);
    assert.equal(box.visible, false, "Đối tượng bị ẩn");
    grid.toggleObjectVisibility(box.id);
    assert.equal(box.visible, true, "Đối tượng hiển thị lại");

    // Ẩn tất cả / Hiện tất cả
    grid.hideAllObjects();
    assert.equal(box.visible, false, "Ẩn tất cả");
    grid.showAllObjects();
    assert.equal(box.visible, true, "Hiện tất cả");
  });

  await test("VN Sheet Arrange: Undo / Redo cho thao tác Z-Order và Xoay/Lật", async () => {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Sheet1"]);
    const img1 = grid.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", { c: "A", r: 1 });
    const img2 = grid.addImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", { c: "B", r: 2 });

    const order0 = [...grid.drawingOrderBySheet[grid.activeSheet]];
    grid.bringObjectToFront("image", img1.id);
    const order1 = [...grid.drawingOrderBySheet[grid.activeSheet]];
    assert.notDeepEqual(order0, order1, "Thứ tự đã đổi");

    // Hoàn tác Undo
    grid.undo();
    assert.deepEqual(grid.drawingOrderBySheet[grid.activeSheet], order0, "Undo phục hồi z-order");

    // Làm lại Redo
    grid.redo();
    assert.deepEqual(grid.drawingOrderBySheet[grid.activeSheet], order1, "Redo áp dụng lại z-order");

    // Xoay và Undo
    grid.selectObject(img1.id, false);
    grid.rotateRight90();
    assert.equal(img1.rotation, 90, "Đã xoay 90°");
    grid.undo();
    assert.equal(img1.rotation, 0, "Undo phục hồi góc xoay 0°");
    grid.redo();
    assert.equal(img1.rotation, 90, "Redo áp dụng góc xoay 90°");
  });

  return results;
}
