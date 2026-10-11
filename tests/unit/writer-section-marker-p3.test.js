/**
 * P3: the linear section-marker lookup must equal the retained legacy regex
 * `(<p\b[^>]*>[\s\S]*?TEXT[\s\S]*?<\/p\s*>)` on randomized HTML, and must stay
 * fast on a large document where the legacy regex is quadratic.
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function escapeText(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function legacyEnd(html, escaped) {
  const re = new RegExp(`(<p\\b[^>]*>[\\s\\S]*?${escaped}[\\s\\S]*?<\\/p\\s*>)`, "i");
  const match = re.exec(html);
  return match ? match.index + match[0].length : -1;
}

// Deterministic PRNG so failures are reproducible.
function makeRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const WORDS = ["Alpha", "beta", "GAMMA", "Điều 1", "a.b", "x(y)", "100%", "[ghi chú]", "Hà Nội", "a+b"];
const TAGS = ["<p>", "<p class=\"x\">", "<P STYLE=\"a\">", "<div>", "<span>", "<br>", "<param x>", "<p-x>"];
const CLOSERS = ["</p>", "</P >", "</div>", "</span>", "</p\n>"];

function randomHtml(random) {
  const parts = [];
  const count = 3 + Math.floor(random() * 25);
  for (let index = 0; index < count; index++) {
    const roll = random();
    if (roll < 0.35) parts.push(TAGS[Math.floor(random() * TAGS.length)]);
    else if (roll < 0.7) parts.push(WORDS[Math.floor(random() * WORDS.length)]);
    else if (roll < 0.9) parts.push(CLOSERS[Math.floor(random() * CLOSERS.length)]);
    else parts.push(" ");
  }
  return parts.join("");
}

export async function runWriterSectionMarkerP3Tests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const adapter = Object.create(WriterAdapter.prototype);

  await test("linear lookup equals the legacy regex on 4000 randomized documents", async () => {
    const random = makeRandom(20261004);
    let hits = 0;
    for (let iteration = 0; iteration < 4000; iteration++) {
      const html = randomHtml(random);
      const needle = WORDS[Math.floor(random() * WORDS.length)];
      const escaped = escapeText(random() < 0.5 ? needle : needle.toLowerCase());
      const expected = legacyEnd(html, escaped);
      const actual = adapter._endOfFirstParagraphWithText(html, escaped);
      if (expected >= 0) hits++;
      assert(actual === expected, `mismatch #${iteration}: legacy=${expected} linear=${actual} html=${JSON.stringify(html)} needle=${needle}`);
    }
    assert(hits > 300, `fuzz should hit often enough (hits=${hits})`);
  });

  await test("no paragraph or no text yields -1", async () => {
    assert(adapter._endOfFirstParagraphWithText("no tags here Alpha", "Alpha") === -1, "no <p>");
    assert(adapter._endOfFirstParagraphWithText("<p>hello</p>", "Alpha") === -1, "text absent");
    assert(adapter._endOfFirstParagraphWithText("<p>Alpha", "Alpha") === -1, "no closing tag");
  });

  await test("large document without a match stays linear (legacy regex is quadratic)", async () => {
    const html = "<p>filler paragraph with some words</p>".repeat(40000);
    const started = Date.now();
    const result = adapter._endOfFirstParagraphWithText(html, escapeText("text-that-is-absent"));
    const elapsed = Date.now() - started;
    assert(result === -1, "must not match");
    assert(elapsed < 1500, `linear lookup too slow: ${elapsed} ms`);
  });

  return results;
}
