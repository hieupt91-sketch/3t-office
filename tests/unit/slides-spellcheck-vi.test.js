import fs from "node:fs";
import { VietnameseSpellChecker, VI_PERSONAL_DICTIONARY_KEY } from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";

function test(name, fn) {
  try { fn(); return { name, pass: true }; }
  catch (error) { return { name, pass: false, error: error.message }; }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSlidesSpellcheckViTests() {
  const source = fs.readFileSync(new URL("../../apps/slides/slides-canvas.js", import.meta.url), "utf8");
  const platformController = fs.readFileSync(new URL("../../platform/text/spellcheck-dom-controller.js", import.meta.url), "utf8");
  return [
    test("Slides tái sử dụng checker và DOM controller của Shared Platform", () => {
      assert(source.includes('from "../../platform/text/vi-spellchecker.js"'), "thiếu import VietnameseSpellChecker");
      assert(source.includes('from "../../platform/text/spellcheck-dom-controller.js"'), "thiếu import SpellcheckDomController");
      assert(source.includes("new SpellcheckDomController"), "Slides không khởi tạo controller dùng chung");
      assert(platformController.includes("destroy()"), "controller dùng chung thiếu lifecycle destroy");
    }),
    test("Slides bind title, body, body2 và text trong shape đang render", () => {
      assert(source.includes("[this.titleEl, this.bodyEl, this.body2El]"), "thiếu root title/body độc lập");
      assert(source.includes('querySelectorAll?.("[contenteditable]")'), "thiếu root contenteditable trong shape layer");
      assert(source.includes("this.spellcheckController?.destroy()"), "không tháo controller cũ trước khi rebind");
      assert(source.includes("this._refreshSpellcheckRoots();"), "không refresh roots sau render/chuyển slide");
    }),
    test("Slides dùng chung từ điển cá nhân với Writer", () => {
      const values = new Map();
      const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
      const writerEquivalent = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage });
      writerEquivalent.addToPersonalDictionary("chínnh");
      const slidesChecker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage });
      assert(VI_PERSONAL_DICTIONARY_KEY === "vno-spellcheck-vi-personal", "storage key dùng chung đã đổi");
      assert(slidesChecker.checkText("chínnh").length === 0, "Slides không đọc được từ cá nhân cùng key");
    })
  ];
}
