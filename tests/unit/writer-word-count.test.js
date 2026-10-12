/**
 * VN Writer — Behavioral Tests: Word Count (Đếm từ)
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { countBlockLines, countBlockParagraphs, countDocumentStats, countExplicitLineBreaks, countListMarkerStats } from "../../apps/writer/word-count.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

export async function runWriterWordCountTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Word Count: preserve repeated spaces and tabs from text nodes", () => {
    const stats = countDocumentStats("A B C", { charactersText: "A   B\tC\nD" });
    if (stats.words !== 3) throw new Error(`Words should still use innerText: ${stats.words}`);
    if (stats.charactersWithSpaces !== "A   B\tCD".length) {
      throw new Error(`Repeated spaces or tabs were lost: ${stats.charactersWithSpaces}`);
    }
  });

  await test("Word Count: tách từ tiếng Việt theo khoảng trắng, bỏ token rỗng", () => {
    const stats = countDocumentStats("  Xin   chào   các bạn  ");
    if (stats.words !== 4) throw new Error(`Số từ sai: ${stats.words}`);
    if (stats.charactersNoSpaces !== "Xinchàocácbạn".length) {
      throw new Error(`Ký tự không khoảng trắng sai: ${stats.charactersNoSpaces}`);
    }
    if (stats.charactersWithSpaces !== "  Xin   chào   các bạn  ".length) {
      throw new Error(`Ký tự có khoảng trắng sai: ${stats.charactersWithSpaces}`);
    }
  });

  await test("Word Count: văn bản rỗng và chỉ khoảng trắng cho 0 từ/đoạn/dòng", () => {
    const empty = countDocumentStats("");
    const spaces = countDocumentStats(" \n  \t ");
    if (empty.words !== 0 || empty.paragraphs !== 0 || empty.lines !== 0) {
      throw new Error(`Empty không về 0: ${JSON.stringify(empty)}`);
    }
    if (spaces.words !== 0 || spaces.paragraphs !== 0 || spaces.lines !== 0) {
      throw new Error(`Chỉ khoảng trắng không về 0: ${JSON.stringify(spaces)}`);
    }
  });

  await test("Word Count: đoạn văn và dòng theo ngắt dòng innerText", () => {
    const stats = countDocumentStats("Đoạn một\n\nĐoạn hai\nDòng ba");
    if (stats.paragraphs !== 3) throw new Error(`Số đoạn sai: ${stats.paragraphs}`);
    if (stats.lines !== 4) throw new Error(`Số dòng sai: ${stats.lines}`);
    if (stats.words !== 6) throw new Error(`Số từ sai: ${stats.words}`);
  });

  await test("Word Count: đếm ngắt dòng thủ công, không đếm dấu đoạn hay placeholder đoạn rỗng", () => {
    const content = { textContent: "alpha beta", closest: (selector) => selector === "p, h1, h2, h3, h4, h5, h6, li, blockquote" ? content : null };
    const emptyPlaceholder = { textContent: "", closest: (selector) => selector === "p, h1, h2, h3, h4, h5, h6, li, blockquote" ? emptyPlaceholder : null };
    const body = { querySelectorAll: (selector) => selector === "br" ? [content, emptyPlaceholder] : [] };
    const stats = countDocumentStats("alpha\nbeta", { markerStats: { charactersWithSpaces: countExplicitLineBreaks(body) } });
    if (stats.charactersWithSpaces !== "alpha beta".length) {
      throw new Error(`Ngắt dòng thủ công không được tính: ${JSON.stringify(stats)}`);
    }
    if (stats.charactersNoSpaces !== "alphabeta".length) {
      throw new Error(`Ngắt dòng thủ công không được tính là ký tự không khoảng trắng: ${JSON.stringify(stats)}`);
    }
  });

  await test("Word Count: countBlockParagraphs chỉ đếm khối có chữ", () => {
    const body = {
      querySelectorAll() {
        return [
          { tagName: "P", innerText: "Có nội dung" },
          { tagName: "P", innerText: "   " },
          { tagName: "H1", textContent: "Tiêu đề" },
          { tagName: "LI", innerText: "" }
        ];
      }
    };
    if (countBlockParagraphs(body) !== 2) throw new Error("Không bỏ khối rỗng");
  });

  await test("Word Count: không đếm kép đoạn nằm trong mục danh sách", () => {
    const paragraph = { tagName: "P", innerText: "Mục danh sách" };
    const listItem = { tagName: "LI", innerText: "Mục danh sách", querySelector: () => paragraph };
    const plainListItem = { tagName: "LI", innerText: "Mục không có thẻ đoạn", querySelector: () => null };
    const body = { querySelectorAll: () => [paragraph, listItem, plainListItem] };
    if (countBlockParagraphs(body) !== 2) throw new Error(`Đếm kép mục danh sách: ${countBlockParagraphs(body)}`);
  });

  await test("Word Count: đếm dòng theo vị trí hiển thị, gộp các rect cùng một dòng", () => {
    const makeBlock = (tagName, text, tops) => ({
      tagName,
      innerText: text,
      ownerDocument: { createRange: () => ({
        selectNodeContents() {},
        getClientRects: () => tops.map((top) => ({ top, width: 100, height: 16 }))
      }) },
      querySelector: () => null,
      hasAttribute: () => false
    });
    const body = {
      querySelectorAll: () => [
        makeBlock("P", "Một đoạn xuống hai dòng", [10, 10, 28]),
        makeBlock("P", "Một dòng khác", [60])
      ]
    };
    if (countBlockLines(body) !== 3) throw new Error(`Dòng hiển thị sai: ${countBlockLines(body)}`);
    const stats = countDocumentStats("Một đoạn xuống hai dòng\nMột dòng khác", { lineCount: countBlockLines(body) });
    if (stats.lines !== 3) throw new Error(`Stats không dùng số dòng hiển thị: ${stats.lines}`);
  });

  await test("Word Count: tính ký tự dấu đầu dòng và từ của nhãn danh sách số", () => {
    const makeList = (tagName, type, length) => {
      const list = {
        tagName,
        children: [],
        getAttribute: (name) => name === "type" ? type : null
      };
      list.children = Array.from({ length }, () => ({
        tagName: "LI", parentElement: list,
        getAttribute: () => null
      }));
      return list;
    };
    const numbered = makeList("OL", null, 12);
    const bullets = makeList("UL", null, 2);
    const body = { querySelectorAll: () => [...numbered.children, ...bullets.children] };
    const markers = countListMarkerStats(body);
    if (markers.words !== 12) throw new Error(`Nhãn số không tính từ: ${markers.words}`);
    if (markers.charactersNoSpaces !== 29) throw new Error(`Sai số ký tự nhãn: ${markers.charactersNoSpaces}`);
    if (markers.charactersWithSpaces !== 43) throw new Error(`Sai số ký tự nhãn và dấu phân tách: ${markers.charactersWithSpaces}`);
    const stats = countDocumentStats("A B", { markerStats: markers });
    if (stats.words !== 14) throw new Error(`Không cộng nhãn danh sách vào tổng từ: ${stats.words}`);
  });

  await test("Word Count: lệnh writer.review.wordCount có định nghĩa, icon và i18n VI/EN", () => {
    const cmd = WRITER_COMMANDS.find((item) => item.id === "writer.review.wordCount");
    if (!cmd) throw new Error("Thiếu writer.review.wordCount trong WRITER_COMMANDS");
    if (cmd.icon !== "wordCount") throw new Error("Sai icon command");
    if (!ICONS.wordCount || !ICONS.wordCount.includes("<svg")) throw new Error("Thiếu icon SVG wordCount");
    if (!viStrings.commands["writer.review.wordCount"]?.label?.includes("Đếm từ")) {
      throw new Error("Thiếu nhãn tiếng Việt");
    }
    if (!enStrings.commands["writer.review.wordCount"]?.label) {
      throw new Error("Thiếu nhãn tiếng Anh");
    }
  });

  await test("Word Count: nút nằm trên tab Đánh giá, nhóm Chính tả & Ngữ pháp", () => {
    const review = WRITER_RIBBON_TABS.find((tab) => tab.id === "review");
    const proofread = review?.groups?.find((group) => group.labelKey === "writerRibbon.group.proofread");
    const ids = flattenRibbonItems(proofread?.items || []).map((item) => item.commandId);
    if (!ids.includes("writer.review.wordCount")) {
      throw new Error(`Thiếu nút Đếm từ trên ribbon: ${ids.join(", ")}`);
    }
  });

  await test("Word Count: WriterAdapter.getWordCountStats đọc innerText bodyDom", () => {
    const body = {
      innerText: "Ủy ban nhân dân thành phố",
      textContent: "Ủy ban nhân dân thành phố",
      querySelectorAll(selector) {
        if (String(selector).includes("p")) return [{ innerText: "Ủy ban nhân dân thành phố" }];
        return [];
      },
      contains() { return true; }
    };
    const page = {
      querySelector(sel) { return sel === ".vno-writer-body" ? body : null; }
    };
    const adapter = new WriterAdapter(page);
    const stats = adapter.getWordCountStats({ preferSelection: false });
    if (stats.words !== 6) throw new Error(`Adapter đếm sai: ${stats.words}`);
    if (stats.scope !== "document") throw new Error(`Sai phạm vi: ${stats.scope}`);
    if (stats.paragraphs !== 1) throw new Error(`Sai số đoạn: ${stats.paragraphs}`);
  });

  await test("Word Count: bỏ chữ trong hộp văn bản nổi như thống kê Word", () => {
    const floating = { innerText: "Văn bản trong hộp nổi", textContent: "Văn bản trong hộp nổi" };
    const floatingParagraph = {
      tagName: "P", innerText: floating.innerText, ownerDocument: null,
      closest: () => floating, querySelector: () => null, hasAttribute: () => false
    };
    const bodyParagraph = {
      tagName: "P", innerText: "Văn bản thân tài liệu", ownerDocument: null,
      closest: () => null, querySelector: () => null, hasAttribute: () => false
    };
    const body = {
      innerText: `${floating.innerText}\n${bodyParagraph.innerText}`,
      querySelectorAll(selector) {
        return String(selector).includes("data-vno-float") ? [floating] : [floatingParagraph, bodyParagraph];
      },
      contains: () => true
    };
    const page = { querySelector: (selector) => selector === ".vno-writer-body" ? body : null };
    const stats = new WriterAdapter(page).getWordCountStats({ preferSelection: false });
    if (stats.words !== 5) throw new Error(`Đếm cả hộp nổi: ${stats.words}`);
    if (stats.charactersNoSpaces !== "Vănbảnthântàiliệu".length) {
      throw new Error(`Còn ký tự hộp nổi: ${stats.charactersNoSpaces}`);
    }
    if (stats.paragraphs !== 1) throw new Error(`Đếm cả đoạn trong hộp nổi: ${stats.paragraphs}`);
  });

  await test("Word Count: attach() gắn handler CommandBus", () => {
    const body = {
      innerText: "Một hai",
      addEventListener() {},
      removeEventListener() {},
      querySelector() { return null; },
      querySelectorAll() { return []; },
      contains() { return true; },
      appendChild() { return null; },
      style: {}
    };
    const page = {
      style: {},
      innerHTML: "",
      focus() {},
      querySelector(sel) { return sel === ".vno-writer-body" ? body : null; },
      querySelectorAll() { return []; },
      appendChild() { return null; },
      addEventListener() {},
      removeEventListener() {},
      contains() { return true; }
    };
    const adapter = new WriterAdapter(page);
    try { adapter.attach(); } catch { /* mock DOM tối thiểu — bindHandler chạy trước các bước trang trí */ }
    const handler = globalCommandBus._handlers.get("writer.review.wordCount");
    if (typeof handler !== "function") throw new Error("Chưa bind handler writer.review.wordCount");
  });

  return results;
}
