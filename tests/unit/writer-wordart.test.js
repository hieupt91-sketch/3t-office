/**
 * VN Office — Behavioral tests: VN Writer WordArt (chữ nghệ thuật inline)
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import {
  WORDART_PRESETS,
  buildWordArtCss,
  resolveWordArtStyle,
  buildWriterWordArtHtml
} from "../../apps/writer/insert-dialogs.js";

function collectCommandIds(items = []) {
  const ids = [];
  for (const item of items) {
    if (item.commandId) ids.push(item.commandId);
    if (item.items) ids.push(...collectCommandIds(item.items));
  }
  return ids;
}

function createMockWriterDoc(initialHtml = "<p>Van ban mau</p>") {
  const bodyEl = {
    innerHTML: initialHtml,
    innerText: initialHtml.replace(/<[^>]*>/g, ""),
    style: {},
    dataset: {},
    focus() {},
    contains() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const pageEl = {
    style: {},
    dataset: {},
    querySelector(sel) {
      if (sel === ".vno-writer-body") return bodyEl;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".vno-writer-body") return [bodyEl];
      return [];
    }
  };
  return { page: pageEl, body: bodyEl };
}

export async function runWriterWordArtTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Writer WordArt: command, UNO mapping, icon SVG, ribbon Chèn > Văn bản và i18n VI/EN", async () => {
    const command = WRITER_COMMANDS.find((item) => item.id === "writer.insert.wordart");
    if (!command) throw new Error("Thiếu writer.insert.wordart");
    if (mapVnCommandToUno(command.id) !== ".uno:FontworkGalleryFloater") {
      throw new Error(`UNO mapping sai: ${mapVnCommandToUno(command.id)}`);
    }
    if (!ICONS[command.icon]?.includes("<svg") || ICONS[command.icon].includes('circle cx="12" cy="12" r="4"')) {
      throw new Error("Icon WordArt không phải SVG riêng");
    }
    const insertTab = WRITER_RIBBON_TABS.find((tab) => tab.id === "insert");
    const textGroup = insertTab?.groups.find((group) => group.id === "text");
    if (!collectCommandIds(textGroup?.items).includes("writer.insert.wordart")) {
      throw new Error("WordArt chưa nằm trong nhóm Văn bản trên tab Chèn");
    }
    if (!viStrings.commands[command.id]?.label || !enStrings.commands[command.id]?.label) {
      throw new Error("Thiếu chuỗi command VI/EN");
    }
    const { page } = createMockWriterDoc();
    const adapter = new WriterAdapter(page);
    const dispatched = await adapter.handleDispatch(
      mapVnCommandToUno(command.id),
      { text: "Aa", presetId: "navy-outline" },
      command.id
    );
    if (!dispatched || dispatched.presetId !== "navy-outline") {
      throw new Error("handleDispatch chưa gọi insertWordArt thật");
    }
  });

  await test("Writer WordArt: thư viện 8 mẫu fill/outline/gradient/shadow và CSS ocean-gradient", () => {
    if (WORDART_PRESETS.length < 8) throw new Error(`Chỉ có ${WORDART_PRESETS.length} mẫu`);
    const ids = new Set(WORDART_PRESETS.map((item) => item.id));
    if (ids.size !== WORDART_PRESETS.length) throw new Error("Preset trùng id");
    if (!WORDART_PRESETS.some((item) => item.gradient?.from && item.gradient?.to)) throw new Error("Thiếu mẫu gradient");
    if (!WORDART_PRESETS.some((item) => Number(item.strokeWidth) >= 3)) throw new Error("Thiếu mẫu outline đậm");
    if (!WORDART_PRESETS.some((item) => item.shadow?.blur >= 6)) throw new Error("Thiếu mẫu đổ bóng");
    const css = buildWordArtCss(resolveWordArtStyle({ presetId: "ocean-gradient" }));
    if (!css.includes("linear-gradient") || !css.includes("background-clip:text") || !css.includes("-webkit-text-stroke") || !css.includes("text-shadow")) {
      throw new Error(`CSS ocean-gradient thiếu hiệu ứng: ${css}`);
    }
  });

  await test("Writer WordArt: chèn span inline tại con trỏ với CSS/preset đúng", async () => {
    const { page, body } = createMockWriterDoc("<p>Truoc </p>");
    const adapter = new WriterAdapter(page);
    const inserted = await adapter.insertWordArt({ text: "Khai giảng", presetId: "ocean-gradient" });
    if (!inserted || inserted.text !== "Khai giảng" || inserted.presetId !== "ocean-gradient") {
      throw new Error(`insertWordArt trả về sai: ${JSON.stringify(inserted)}`);
    }
    const html = body.innerHTML;
    if (!html.includes("vno-writer-wordart") || !html.includes('data-vno-wordart="true"')) {
      throw new Error(`Thiếu span WordArt: ${html}`);
    }
    if (!html.includes("Khai giảng") || !html.includes("ocean-gradient")) {
      throw new Error(`Thiếu chữ/preset: ${html}`);
    }
    if (!html.includes("linear-gradient") || !html.includes("background-clip:text") || !html.includes("-webkit-text-stroke") || !html.includes("text-shadow")) {
      throw new Error(`HTML thiếu CSS hiệu ứng: ${html}`);
    }
    const markup = buildWriterWordArtHtml("Khai giảng", { presetId: "ocean-gradient" });
    if (!markup.includes("contenteditable=\"false\"") || !markup.includes("vno-wordart-text")) {
      throw new Error("Markup WordArt thiếu contenteditable=false / vno-wordart-text");
    }
  });

  await test("Writer WordArt: sửa chữ, xóa, Undo/Redo dùng snapshot Writer", async () => {
    const { page, body } = createMockWriterDoc("<p>Goc</p>");
    const adapter = new WriterAdapter(page);
    await adapter.insertWordArt({ text: "Tiêu đề", presetId: "navy-outline" });
    if (!body.innerHTML.includes("Tiêu đề")) throw new Error("Chèn không ghi chữ");
    if (!adapter.updateWordArtText("Học kỳ mới")) throw new Error("updateWordArtText thất bại");
    if (!body.innerHTML.includes("Học kỳ mới") || body.innerHTML.includes(">Tiêu đề<")) {
      throw new Error(`Đổi chữ sai: ${body.innerHTML}`);
    }
    if (!adapter.undo() || !body.innerHTML.includes("Tiêu đề")) {
      throw new Error(`Undo chữ sai: ${body.innerHTML}`);
    }
    if (!adapter.redo() || !body.innerHTML.includes("Học kỳ mới")) {
      throw new Error(`Redo chữ sai: ${body.innerHTML}`);
    }
    if (!adapter.deleteWordArt() || body.innerHTML.includes("vno-writer-wordart")) {
      throw new Error(`Xóa WordArt thất bại: ${body.innerHTML}`);
    }
    if (!adapter.undo() || !body.innerHTML.includes("vno-writer-wordart") || !body.innerHTML.includes("Học kỳ mới")) {
      throw new Error(`Undo xóa chưa khôi phục WordArt: ${body.innerHTML}`);
    }
    if (!adapter.redo() || body.innerHTML.includes("vno-writer-wordart")) {
      throw new Error(`Redo xóa chưa bỏ lại WordArt: ${body.innerHTML}`);
    }
  });

  await test("Writer WordArt: bài hướng dẫn tiếng Việt trong catalog Help", () => {
    const entry = WRITER_HELP_ENTRIES.find((item) => item.id === "writer.insert.wordart");
    if (!entry) throw new Error("Thiếu entry Help writer.insert.wordart");
    if (entry.app !== "writer") throw new Error("Help WordArt không thuộc Writer");
    if (!entry.commandIds?.includes("writer.insert.wordart")) throw new Error("Help thiếu commandId");
    if (entry.ribbon?.tab !== "Chèn" || entry.ribbon?.group !== "Văn bản") {
      throw new Error("Help ghi sai vị trí ribbon");
    }
    if (!Array.isArray(entry.steps) || entry.steps.length < 3) throw new Error("Help thiếu bước dùng");
    const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
    if (!/Chèn/.test(blob) || !/con trỏ/.test(blob) || !/Chữ nghệ thuật/.test(blob)) {
      throw new Error("Help WordArt không mô tả đúng UI Writer");
    }
  });

  return results;
}
