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

  test("Writer find/replace supports special characters: ^p, ^t, ^?, ^w, ^^, ^&", () => {
    // 1. ^p (newline) and ^t (tab)
    const textNode1 = { data: "Dòng 1\nDòng 2\tCột 2" };
    assert.equal(replaceTextInTextNodes([textNode1], "1^pDòng", "1; Dòng", false), 1);
    assert.equal(textNode1.data, "Dòng 1; Dòng 2\tCột 2");

    assert.equal(replaceTextInTextNodes([textNode1], "^tCột", " - Cột", false), 1);
    assert.equal(textNode1.data, "Dòng 1; Dòng 2 - Cột 2");

    // 2. ^? (any character) and ^w (whitespace)
    const textNode2 = { data: "Mã: VN-01   kết thúc" };
    assert.equal(replaceTextInTextNodes([textNode2], "VN-^?^?", "VN-99", false), 1);
    assert.equal(textNode2.data, "Mã: VN-99   kết thúc");

    assert.equal(replaceTextInTextNodes([textNode2], "^w", " ", true), 3); // 2 spaces between "Mã:" and "VN-99", 3 spaces reduced
    assert.equal(textNode2.data, "Mã: VN-99 kết thúc");

    // 3. ^^ (literal caret) and ^& (replacement with matched text)
    const textNode3 = { data: "Giá trị ^x và ^y" };
    assert.equal(replaceTextInTextNodes([textNode3], "^^^?", "[^&]", true), 2);
    assert.equal(textNode3.data, "Giá trị [^x] và [^y]");
  });

  test("Writer find/replace supports wildcards (*, ?)", () => {
    const n1 = { data: "Hợp đồng số 12345/2026/VNO ngày ký kết" };
    const count = replaceTextInTextNodes([n1], "số */VNO", "số [ĐÃ DUYỆT]", false, { useWildcards: true });
    assert.equal(count, 1);
    assert.equal(n1.data, "Hợp đồng số [ĐÃ DUYỆT] ngày ký kết");

    const n2 = { data: "Mục A.1 và Mục B.1 và Mục C.2" };
    const count2 = replaceTextInTextNodes([n2], "Mục ?.1", "[Phần]", true, { useWildcards: true });
    assert.equal(count2, 2);
    assert.equal(n2.data, "[Phần] và [Phần] và Mục C.2");
  });

  test("Writer find/replace supports format filtering (bold, italic, font family, color)", () => {
    const boldNode = { data: "Báo cáo doanh thu", bold: true, color: "#ff0000" };
    const italicNode = { data: "Báo cáo doanh thu", italic: true, color: "#0000ff" };
    const normalNode = { data: "Báo cáo doanh thu" };

    // Chỉ thay thế node có format bold: true
    const nodes = [boldNode, italicNode, normalNode];
    const repCountBold = replaceTextInTextNodes(nodes, "doanh thu", "lợi nhuận", true, {
      format: { bold: true }
    });
    assert.equal(repCountBold, 1);
    assert.equal(boldNode.data, "Báo cáo lợi nhuận");
    assert.equal(italicNode.data, "Báo cáo doanh thu");
    assert.equal(normalNode.data, "Báo cáo doanh thu");

    // Chỉ thay thế node có format color: "#0000ff"
    const repCountColor = replaceTextInTextNodes(nodes, "doanh thu", "chi phí", true, {
      format: { color: "#0000ff" }
    });
    assert.equal(repCountColor, 1);
    assert.equal(italicNode.data, "Báo cáo chi phí");
  });

  return results;
}
