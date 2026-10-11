import assert from "node:assert/strict";
import { replaceTextInTextNodes } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterFindReplaceDomTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  test("Writer find/replace edits matching text nodes without rebuilding formatting wrappers", () => {
    const bold = { data: "bản nháp", wrapper: "strong" };
    const italic = { data: " và bản nháp", wrapper: "em" };
    const plain = { data: " kết thúc" };
    const nodes = [bold, italic, plain];
    assert.equal(replaceTextInTextNodes(nodes, "bản nháp", "bản chính", false), 1);
    assert.equal(bold.data, "bản chính");
    assert.equal(italic.data, " và bản nháp");
    assert.equal(bold.wrapper, "strong");
    assert.equal(nodes[0], bold);
  });

  test("Writer replace-all preserves every text node and its inline style context", () => {
    const strong = { data: "bản nháp", wrapper: "strong" };
    const regular = { data: " bản nháp; bản nháp" };
    assert.equal(replaceTextInTextNodes([strong, regular], "bản nháp", "bản chính", true), 3);
    assert.equal(strong.data, "bản chính");
    assert.equal(regular.data, " bản chính; bản chính");
    assert.equal(strong.wrapper, "strong");
    assert.equal(replaceTextInTextNodes([regular], "", "x", true), 0);
  });

  return results;
}
