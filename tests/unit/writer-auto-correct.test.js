import assert from "node:assert/strict";
import {
  computeAutoCorrection,
  DEFAULT_AUTO_CORRECT_REPLACEMENTS
} from "../../apps/writer/auto-correct.js";

function corrected(text, inputData, settings = {}) {
  return computeAutoCorrection(text, text.length, {
    inputData,
    settings,
    replacements: DEFAULT_AUTO_CORRECT_REPLACEMENTS
  })?.text || text;
}

export async function runWriterAutoCorrectTests() {
  assert.equal(corrected('"', '"'), "“");
  assert.equal(corrected('“xin chào"', '"'), "“xin chào”");
  assert.equal(corrected("'Việt Nam'", "'"), "'Việt Nam’");
  assert.equal(corrected("a--", "-"), "a–");
  assert.equal(corrected("1/2", "2"), "½");
  assert.equal(corrected("(c)", ")"), "©");
  assert.equal(corrected("teh ", " "), "The ");
  assert.equal(corrected(":) ", " "), "☺ ");
  assert.equal(corrected("xin chào. việt ", " "), "xin chào. Việt ");
  assert.equal(corrected("đây ", " "), "Đây ");
  assert.equal(corrected("Tooi ddang gox ", " ", { enabled: false }), "Tooi ddang gox ");

  const composingText = "Tooi ddang gox tieengs Vieetj";
  assert.equal(corrected(composingText, "j", { smartQuotes: true }), composingText,
    "A non-boundary Vietnamese Telex sequence must not be rewritten");

  return [{ name: "Writer AutoCorrect transforms committed text without rewriting an active Vietnamese token", pass: true }];
}
