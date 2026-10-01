import { readFileSync } from "node:fs";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { HELP_ENTRIES } from "../../platform/help/help-catalog.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";

const viJsonStrings = JSON.parse(readFileSync(new URL("../../platform/i18n/strings.vi.json", import.meta.url), "utf8"));
const oldDisplayName = /\bVN (?:Office|Writer|Sheet|Slides|AI)\b|Trợ lý VN AI/i;

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => collectStrings(item, output));
  return output;
}

export async function run3TDisplayNameTests() {
  const results = [];
  const expectedLabels =
    viStrings.app.suiteName === "3T Office" &&
    viStrings.app.writer.startsWith("3T Doc") &&
    viStrings.app.sheet.startsWith("3T Sheet") &&
    viStrings.app.slides.startsWith("3T Slide") &&
    viJsonStrings.app.suiteName === "3T Office" &&
    enStrings.app.suiteName === "3T Office" &&
    enStrings.app.writer.startsWith("3T Doc") &&
    enStrings.app.sheet.startsWith("3T Sheet") &&
    enStrings.app.slides.startsWith("3T Slide");
  results.push({
    name: "3T display names: suite, app, and Vietnamese/English i18n labels",
    pass: expectedLabels,
    error: expectedLabels ? undefined : "Expected 3T Office, 3T Doc, 3T Sheet, and 3T Slide labels in both locales."
  });

  const sources = [
    ["Vietnamese i18n JavaScript", viStrings],
    ["English i18n JavaScript", enStrings],
    ["Vietnamese i18n JSON", viJsonStrings],
    ["in-app Help", [...HELP_ENTRIES, ...SHEET_HELP_ENTRIES, ...SLIDES_HELP_ENTRIES]]
  ];
  const staleLabels = sources.flatMap(([source, value]) =>
    collectStrings(value)
      .filter((text) => oldDisplayName.test(text))
      .map((text) => `${source}: ${text}`)
  );
  results.push({
    name: "3T display names: no legacy product names in user-visible i18n or Help strings",
    pass: staleLabels.length === 0,
    error: staleLabels.length ? staleLabels.join("\n") : undefined
  });

  return results;
}
