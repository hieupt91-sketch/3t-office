import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterParagraphSortTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.stack || error.message }); }
  };

  test("Writer Sort: không có đoạn đủ điều kiện thì báo cần chọn ít nhất hai đoạn", () => {
    const adapter = Object.create(WriterAdapter.prototype);
    let notification = null;
    adapter._getSelectedParagraphBlocks = () => [];
    adapter.shell = { showNotification(options) { notification = options; } };
    if (adapter.sortParagraphs() !== false) throw new Error("Không có vùng đủ điều kiện nhưng lệnh vẫn thành công");
    if (notification?.type !== "info" || !/ít nhất hai đoạn/.test(notification.message)) {
      throw new Error(`Thiếu thông báo tiếng Việt cụ thể: ${JSON.stringify(notification)}`);
    }
  });

  test("Writer Sort: một đoạn không bị sửa và có thông báo", () => {
    const adapter = Object.create(WriterAdapter.prototype);
    let notification = null;
    const paragraph = { textContent: "Một đoạn" };
    adapter._getSelectedParagraphBlocks = () => [paragraph];
    adapter.shell = { showNotification(options) { notification = options; } };
    if (adapter.sortParagraphs() !== false || paragraph.textContent !== "Một đoạn") {
      throw new Error("Sắp xếp một đoạn phải dừng mà không sửa nội dung");
    }
    if (!notification?.message) throw new Error("Không thông báo khi chỉ có một đoạn");
  });

  return results;
}
