/**
 * VN Writer — Behavioral Tests: Word Count (Đếm từ)
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { countBlockParagraphs, countDocumentStats } from "../../apps/writer/word-count.js";
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

  await test("Word Count: countBlockParagraphs chỉ đếm khối có chữ", () => {
    const body = {
      querySelectorAll() {
        return [
          { innerText: "Có nội dung" },
          { innerText: "   " },
          { textContent: "Tiêu đề" },
          { innerText: "" }
        ];
      }
    };
    if (countBlockParagraphs(body) !== 2) throw new Error("Không bỏ khối rỗng");
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

  await test("Word Count: attach() gắn handler CommandBus", () => {
    const body = {
      innerText: "Một hai",
      addEventListener() {},
      querySelectorAll() { return []; },
      contains() { return true; }
    };
    const page = {
      style: {},
      innerHTML: "",
      focus() {},
      querySelector(sel) { return sel === ".vno-writer-body" ? body : null; }
    };
    const adapter = new WriterAdapter(page);
    adapter.attach();
    const handler = globalCommandBus._handlers.get("writer.review.wordCount");
    if (typeof handler !== "function") throw new Error("Chưa bind handler writer.review.wordCount");
  });

  return results;
}
