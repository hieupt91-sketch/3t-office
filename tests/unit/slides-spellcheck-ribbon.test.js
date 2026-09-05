/**
 * VN Slides Review ribbon — expose existing Vietnamese spellcheck via dialog.
 * Reuses Shared Platform checker; does not rewrite tokenizer/dictionary.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { tCommand, setLocale } from "../../platform/i18n/i18n.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { VietnameseSpellChecker, VI_PERSONAL_DICTIONARY_KEY } from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function container() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    innerHTML: "",
    dataset: {},
    className: "",
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    style: {}
  };
}

function canvasForSpell() {
  const canvas = new SlidesCanvasController(container());
  canvas.shapesLayer = null;
  canvas._renderThumbnails = () => {};
  canvas._renderShapesLayer = () => {};
  canvas._refreshSpellcheckRoots = () => {};
  canvas.selectSlide = (index) => { canvas.currentSlideIndex = index; };
  canvas.slides = [{
    id: 1,
    title: "chínnh tả slide",
    body: "học sinh đọc sách",
    layoutType: "title-content",
    shapes: [{ id: 9, type: "rect", x: 10, y: 10, w: 80, h: 40, color: "#3b82f6", text: "saaai" }]
  }];
  canvas.currentSlideIndex = 0;
  canvas.undoStack = [];
  canvas.redoStack = [];
  return canvas;
}

export async function runSlidesSpellcheckRibbonTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Tab Đánh giá có nhóm Chứng minh và nút slides.review.spellCheck", () => {
    const review = SLIDES_RIBBON_TABS.find((tab) => tab.id === "review");
    assert(review, "Thiếu tab review");
    const proofing = review.groups.find((group) => group.id === "proofing" || group.labelKey === "slidesRibbon.group.proofing");
    assert(proofing, "Thiếu nhóm Chứng minh / Proofing");
    assert(proofing.label === "Chứng minh", "Tên nhóm phải thống nhất với Sheet");
    assert(proofing.items.some((item) => item.commandId === "slides.review.spellCheck"), "Thiếu nút Chính tả");
    assert(review.groups.some((group) => group.items?.some((item) => item.commandId === "slides.review.commentInsert")), "Nút Nhận xét vẫn phải còn");
  });

  await test("Command, icon SVG và UNO mapping; không khai báo trùng F7 common", () => {
    const command = SLIDES_COMMANDS.find((item) => item.id === "slides.review.spellCheck");
    assert(command, "Thiếu slides.review.spellCheck");
    assert(command.icon === "slidesSpellCheck", "Sai icon");
    assert(!command.shortcut, "Không được khai báo shortcut F7 vì F7 common đã dùng cho AI grammarCheck");
    assert(VN_TO_UNO_MAP["slides.review.spellCheck"] === ".uno:Spelling", "Sai UNO mapping");
    assert(ICONS.slidesSpellCheck?.includes("<svg"), "Thiếu SVG slidesSpellCheck");
  });

  await test("i18n VI/EN cho slides.review.spellCheck", () => {
    try {
      setLocale("vi");
      assert(tCommand("slides.review.spellCheck", "label") === "Chính tả", "VI label sai");
      setLocale("en");
      assert(tCommand("slides.review.spellCheck", "label") === "Spelling", "EN label sai");
    } finally {
      setLocale("vi");
    }
  });

  await test("Quét title/body/shape bằng VietnameseSpellChecker dùng chung, không viết lại từ điển", () => {
    const canvas = canvasForSpell();
    const issues = canvas.collectSpellcheckIssues();
    assert(issues.some((item) => item.field === "title" && item.word === "chínnh"), `không bắt chínnh ở title: ${JSON.stringify(issues)}`);
    assert(!issues.some((item) => item.field === "body"), `báo nhầm body đúng: ${JSON.stringify(issues.filter((item) => item.field === "body"))}`);
    assert(issues.some((item) => item.field === "shape" && item.word === "saaai"), "không bắt lỗi trong shape text");
    assert(canvas.spellcheckChecker instanceof VietnameseSpellChecker, "Phải tái sử dụng checker platform");
  });

  await test("Thay thế một lần sửa đúng token, giữ phần còn lại, ghi undo stack hiện có", () => {
    const canvas = canvasForSpell();
    const [issue] = canvas.collectSpellcheckIssues().filter((item) => item.word === "chínnh");
    assert(issue, "không tìm thấy chínnh để thay");
    assert(canvas.replaceSpellcheckIssue(issue, "chính") === true, "replace thất bại");
    assert(canvas.slides[0].title === "chính tả slide", `title sau replace: ${canvas.slides[0].title}`);
    assert(!canvas.collectSpellcheckIssues().some((item) => item.word === "chínnh"), "vẫn còn chínnh sau replace");
    assert(canvas.undoStack.at(-1)?.type === "text-format", "Phải dùng undo type text-format sẵn có");
    canvas.undo();
    assert(canvas.slides[0].title === "chínnh tả slide", "Undo phải trả title cũ");
  });

  await test("Ignore All dùng checker phiên, không ghi từ điển cá nhân", () => {
    const values = new Map();
    const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
    const canvas = canvasForSpell();
    canvas.spellcheckChecker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage });
    assert(canvas.collectSpellcheckIssues().some((item) => item.word === "chínnh"), "cần lỗi chínnh");
    canvas.spellcheckChecker.ignore("chínnh");
    assert(!canvas.collectSpellcheckIssues().some((item) => item.word === "chínnh"), "Ignore All không ẩn chínnh");
    assert(!JSON.parse(values.get(VI_PERSONAL_DICTIONARY_KEY) || "[]").includes("chínnh"), "Ignore All không được ghi localStorage");
  });

  await test("Thêm vào từ điển dùng chung key Writer/Sheet", () => {
    const values = new Map();
    const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
    const canvas = canvasForSpell();
    canvas.spellcheckChecker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage });
    canvas.spellcheckChecker.addToPersonalDictionary("chínnh");
    assert(!canvas.collectSpellcheckIssues().some((item) => item.word === "chínnh"), "từ vừa thêm vẫn bị báo");
    assert(VI_PERSONAL_DICTIONARY_KEY === "vno-spellcheck-vi-personal", "storage key dùng chung đã đổi");
  });

  await test("Gợi ý gần tái sử dụng checker, có chính cho chínnh", () => {
    const canvas = canvasForSpell();
    assert(canvas.suggestSpellcheckWord("chínnh").includes("chính"), "không gợi ý chính");
  });

  await test("Không có document.body thì showSpellcheckDialog trả về danh sách lỗi, không ném", () => {
    const canvas = canvasForSpell();
    const originalDocument = globalThis.document;
    globalThis.document = { createElement: () => ({ className: "", textContent: "", setAttribute() {} }) };
    try {
      const issues = canvas.showSpellcheckDialog();
      assert(Array.isArray(issues) && issues.some((item) => item.word === "chínnh"), "thiếu fallback không DOM");
    } finally {
      globalThis.document = originalDocument;
    }
  });

  await test("Adapter handleDispatch slides.review.spellCheck gọi showSpellcheckDialog", async () => {
    const calls = [];
    const adapter = new SlidesAdapter({
      showSpellcheckDialog(value) { calls.push(value || {}); return true; }
    });
    const ok = await adapter.handleDispatch(".uno:Spelling", null, "slides.review.spellCheck");
    assert(ok === true, "Dispatch phải thành công");
    assert(calls.length === 1, "Phải gọi dialog một lần");
  });

  await test("Handler ribbon chuẩn hóa args=null", async () => {
    const calls = [];
    const adapter = new SlidesAdapter({
      showSpellcheckDialog(value) { calls.push(value); return true; },
      toggleFormatPainter() { return false; },
      openCommentsPanel() { return false; }
    });
    adapter.attach();
    await globalCommandBus.execute("slides.review.spellCheck");
    assert(calls.length === 1 && calls[0] && typeof calls[0] === "object", "Handler không chuẩn hóa args=null");
  });

  return results;
}
