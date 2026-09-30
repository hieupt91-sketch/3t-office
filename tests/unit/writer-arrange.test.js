import { POSITION_PRESETS, WRAP_STYLES, WriterArrangeController } from "../../apps/writer/writer-arrange.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";

function image() {
  return {
    tagName: "IMG",
    naturalWidth: 200,
    naturalHeight: 100,
    style: {},
    dataset: {},
    classList: { add() {}, remove() {} },
    setAttribute() {},
    nextElementSibling: null,
    previousElementSibling: null
  };
}

function fixture(images = [image()]) {
  const body = { contains: node => images.includes(node) };
  const snapshots = [];
  const adapter = {
    flushTyping() {},
    recordSnapshot(description) { snapshots.push(description); },
    _recomputeLivePagination() {}
  };
  const controller = new WriterArrangeController({ body, adapter });
  controller.selectedImage = images[0];
  return { controller, images, snapshots, adapter };
}

export async function runWriterArrangeTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  test("Arrange là tab Writer theo ngữ cảnh và có đủ preset", () => {
    assert(WRITER_RIBBON_TABS.some(tab => tab.id === "pictureFormat"), "Thiếu tab Định dạng Hình ảnh");
    assert(Object.keys(WRAP_STYLES).length === 6, "Thiếu 6 kiểu chạy chữ");
    assert(Object.keys(POSITION_PRESETS).length === 9, "Thiếu 9 vị trí trang");
  });

  test("Wrap Text Square và Tight dùng CSS float thật", () => {
    const { controller, images, snapshots } = fixture();
    assert(controller.applyWrap("square"), "Không áp dụng Square");
    assert(images[0].style.float === "left" && images[0].style.position === "relative", "Square không float trái");
    assert(controller.applyWrap("tight"), "Không áp dụng Tight");
    assert(images[0].style.float === "right", "Tight không float phải");
    assert(snapshots.length === 2, "Wrap không ghi history");
  });

  test("Wrap inline/behind/front dùng đúng display, position và z-index", () => {
    const { controller, images } = fixture();
    controller.applyWrap("behind");
    assert(images[0].style.position === "absolute" && images[0].style.zIndex === "-1", "Behind sai CSS");
    controller.applyWrap("front");
    assert(images[0].style.position === "absolute" && images[0].style.zIndex === "10", "Front sai CSS");
    controller.applyWrap("inline");
    assert(images[0].style.display === "inline" && images[0].style.position === "static" && images[0].style.left === "", "Inline không reset tọa độ");
  });

  test("Position đặt đúng tọa độ phần trăm cho đủ 9 preset", () => {
    const { controller, images } = fixture();
    for (const [name, [left, top, transform]] of Object.entries(POSITION_PRESETS)) {
      assert(controller.applyPosition(name), `Không áp dụng ${name}`);
      assert(images[0].style.left === left && images[0].style.top === top && images[0].style.transform === transform, `Sai tọa độ ${name}`);
    }
  });

  test("Kích thước ảnh đặt được theo mm và khóa tỉ lệ mặc định", () => {
    const { controller, images, snapshots } = fixture();
    const size = controller.applySize({ widthMm: 20, lockAspect: true });
    assert(Math.abs(size.widthMm - 20) < 0.01 && Math.abs(size.heightMm - 10) < 0.01, "Không giữ tỉ lệ 2:1 khi đổi rộng");
    assert(Math.abs(Number.parseFloat(images[0].style.width) / 96 * 25.4 - 20) < 0.02, "Chiều rộng CSS không theo kích thước mm");
    assert(images[0].dataset.vnoWidthMm === "20.00" && snapshots.at(-1) === "writer.image.resize", "Thiếu kích thước lưu được hoặc Undo snapshot");
  });

  test("Bring Forward và Send Backward đổi cả z-index lẫn thứ tự DOM", () => {
    const first = image();
    const second = image();
    const order = [first, second];
    first.nextElementSibling = second;
    second.previousElementSibling = first;
    second.after = node => { order.splice(order.indexOf(node), 1); order.splice(order.indexOf(second) + 1, 0, node); };
    second.before = node => { order.splice(order.indexOf(node), 1); order.splice(order.indexOf(second), 0, node); };
    const { controller } = fixture([first, second]);
    controller.bringForward();
    assert(first.style.zIndex === "1" && order[1] === first, "Bring Forward sai");
    first.previousElementSibling = second;
    controller.sendBackward();
    assert(first.style.zIndex === "0" && order[0] === first, "Send Backward sai");
  });

  test("Align canh đúng theo trang mà giữ trục còn lại", () => {
    const { controller, images } = fixture();
    controller.applyPosition("center");
    controller.align("left");
    assert(images[0].style.left === "0%" && images[0].style.top === "50%", "Align left sai");
    controller.align("bottom");
    assert(images[0].style.left === "0%" && images[0].style.top === "100%", "Align bottom sai");
    controller.align("center");
    assert(images[0].style.left === "50%" && images[0].style.transform.includes("-50%"), "Align center sai");
  });

  return results;
}
