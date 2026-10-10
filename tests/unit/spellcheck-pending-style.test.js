/**
 * VN Office — Unit Tests: U1 — Ctrl+B/I/U tại con trỏ không bị kiểm tra chính tả xóa kiểu "sắp gõ".
 */
import assert from "node:assert/strict";
import { hasPendingTypingStyle } from "../../platform/text/spellcheck-dom-controller.js";

export async function runSpellcheckPendingStyleTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (err) { results.push({ name, pass: false, error: err.stack || err.message }); }
  };

  const textNode = { nodeType: 3, parentElement: null };
  const element = { nodeType: 1, parentElement: null };
  textNode.parentElement = element;
  const root = { contains: (n) => n === textNode || n === element };
  const sel = (collapsed = true, rangeCount = 1) => () => ({ rangeCount, isCollapsed: collapsed, anchorNode: textNode });
  const withComputed = async (style, fn) => {
    const prev = globalThis.getComputedStyle;
    globalThis.getComputedStyle = () => ({ fontWeight: "400", fontStyle: "normal", textDecorationLine: "none", ...style });
    try { await fn(); } finally { globalThis.getComputedStyle = prev; }
  };
  const doc = (states) => ({ queryCommandState: (c) => Boolean(states[c]) });

  await test("U1: Ctrl+B đã bật nhưng chưa có chữ đậm tại con trỏ -> kiểu sắp gõ đang chờ", async () => {
    await withComputed({}, () => assert.equal(hasPendingTypingStyle(root, doc({ bold: true }), sel()), true));
  });
  await test("U1: Ctrl+I và Ctrl+U chờ gõ cũng được nhận ra", async () => {
    await withComputed({}, () => {
      assert.equal(hasPendingTypingStyle(root, doc({ italic: true }), sel()), true);
      assert.equal(hasPendingTypingStyle(root, doc({ underline: true }), sel()), true);
    });
  });
  await test("U1: con trỏ đang trong chữ đậm và lệnh đậm bật -> không có kiểu chờ", async () => {
    await withComputed({ fontWeight: "700" }, () => assert.equal(hasPendingTypingStyle(root, doc({ bold: true }), sel()), false));
  });
  await test("U1: Ctrl+B tắt đậm giữa chữ đậm (chờ gõ thường) -> có kiểu chờ", async () => {
    await withComputed({ fontWeight: "700" }, () => assert.equal(hasPendingTypingStyle(root, doc({ bold: false }), sel()), true));
  });
  await test("U1: không có định dạng nào bật -> không hoãn quét chính tả", async () => {
    await withComputed({}, () => assert.equal(hasPendingTypingStyle(root, doc({}), sel()), false));
  });
  await test("U1: có vùng chọn (không phải con trỏ) hoặc không có vùng chọn -> không hoãn", async () => {
    await withComputed({}, () => {
      assert.equal(hasPendingTypingStyle(root, doc({ bold: true }), sel(false)), false);
      assert.equal(hasPendingTypingStyle(root, doc({ bold: true }), sel(true, 0)), false);
    });
  });
  await test("U1: môi trường thiếu queryCommandState không gây lỗi", async () => {
    await withComputed({}, () => assert.equal(hasPendingTypingStyle(root, {}, sel()), false));
  });
  return results;
}