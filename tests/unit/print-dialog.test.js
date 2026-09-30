import test from "node:test";
import assert from "node:assert/strict";
import { chooseDefaultPrinter, getPrintErrorMessage, parsePageRange } from "../../platform/print/print-model.js";

test("page range accepts all pages and normalizes custom ranges", () => {
  assert.deepEqual(parsePageRange("", 6), { pageRange: "", pages: null });
  assert.deepEqual(parsePageRange("4, 1-2,3, 5-6,6", 6), {
    pageRange: "1-6",
    pages: [1, 2, 3, 4, 5, 6]
  });
  assert.deepEqual(parsePageRange("2,5-6", 6), { pageRange: "2,5-6", pages: [2, 5, 6] });
});

test("page range rejects malformed, reversed, and out-of-document pages", () => {
  for (const input of ["0", "7", "3-2", "1,,2", "1-a", "-2"]) {
    assert.throws(() => parsePageRange(input, 6), /phạm vi trang/i, input);
  }
});

test("printer selection prefers Windows default and falls back to first printer", () => {
  assert.equal(chooseDefaultPrinter([
    { name: "USB printer" },
    { name: "Microsoft Print to PDF", isDefault: true }
  ]), "Microsoft Print to PDF");
  assert.equal(chooseDefaultPrinter([{ name: "USB printer" }, { name: "Fax" }]), "USB printer");
  assert.equal(chooseDefaultPrinter([]), "");
});

test("printer errors are clear and preserve the local failure reason", () => {
  assert.match(getPrintErrorMessage(new Error("Máy in đang ngoại tuyến")), /Không thể in tài liệu/);
  assert.match(getPrintErrorMessage(new Error("Máy in đang ngoại tuyến")), /ngoại tuyến/);
  assert.match(getPrintErrorMessage(null), /kiểm tra máy in/i);
});
