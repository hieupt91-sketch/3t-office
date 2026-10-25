/**
 * FIX-D6-2510 — CSS font stacks for font names that come from documents.
 *
 * A document stores one font name ("Calibri"). Used alone as a CSS font-family it falls back to the browser's
 * default font (a serif on macOS) when the machine does not have that font. documentFontStack() keeps the
 * document's font first (an installed real font always wins), adds the metric-compatible substitutes the
 * document engine also uses (platform/os_services/<os>.py), and always ends with a generic family of the same
 * class (sans-serif / serif / monospace), so nothing silently turns into the default serif.
 *
 * Calibri / Calibri Light additionally resolve through the @font-face aliases in
 * platform/fonts/substitutes/substitute-fonts.css (bundled Carlito). Platform-neutral: on a machine that has
 * the real font, the stack simply picks it.
 *
 * Only for rendering. The model and saved files keep the document's own font name.
 */

/** Lower-case document font name → substitutes tried after it (installed locally or bundled). */
export const DOCUMENT_FONT_SUBSTITUTES = Object.freeze({
  "calibri": Object.freeze(["Carlito"]),
  // Carlito has no light weight: Calibri Light shows in Carlito Regular (same widths, slightly darker).
  "calibri light": Object.freeze(["Carlito"]),
  // Caladea is NOT bundled for the web view (it lacks 48 Vietnamese letters) — used only if installed.
  "cambria": Object.freeze(["Caladea"]),
  "arial": Object.freeze(["Liberation Sans", "Arimo"]),
  "helvetica": Object.freeze(["Liberation Sans", "Arimo"]),
  "times new roman": Object.freeze(["Liberation Serif", "Tinos"]),
  "times": Object.freeze(["Liberation Serif", "Tinos"]),
  "courier new": Object.freeze(["Liberation Mono", "Cousine"]),
  "courier": Object.freeze(["Liberation Mono", "Cousine"]),
});

const SERIF = new Set([
  "cambria", "caladea", "times new roman", "times", "liberation serif", "tinos", "georgia", "garamond",
  "book antiqua", "palatino linotype", "palatino", "constantia", "century", "century schoolbook",
  "bookman old style", "baskerville old face", "cambria math", "simsun", "nsimsun", "vn song", "songti sc",
  "ms mincho", "ms pmincho", "batang", "pmingliu", "mingliu", "noto serif", "dejavu serif", "vni-times",
  ".vntime", ".vntimeh",
]);
const MONOSPACE = new Set([
  "courier new", "courier", "liberation mono", "cousine", "consolas", "vn mono", "lucida console",
  "cascadia mono", "cascadia code", "menlo", "monaco", "sf mono", "dejavu sans mono", "noto sans mono",
  "ms gothic", "simhei mono",
]);
const GENERIC = new Set([
  "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "math", "emoji", "fangsong",
  "ui-serif", "ui-sans-serif", "ui-monospace", "ui-rounded",
]);
const CSS_WIDE = new Set(["inherit", "initial", "unset", "revert", "revert-layer"]);

/** Generic CSS family matching a document font name ("sans-serif" when unknown — the office default class). */
export function genericFamilyFor(name) {
  const key = String(name || "").trim().toLowerCase();
  if (MONOSPACE.has(key)) return "monospace";
  if (SERIF.has(key)) return "serif";
  return "sans-serif";
}

function splitFamilies(value) {
  const out = [];
  let current = "";
  let quote = "";
  for (const ch of String(value)) {
    if (quote) {
      if (ch === quote) quote = "";
      else current += ch;
    } else if (ch === "\"" || ch === "'") {
      quote = ch;
    } else if (ch === ",") {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current.trim());
  return out.filter(Boolean);
}

function quoteFamily(name) {
  if (GENERIC.has(name.toLowerCase())) return name;
  // A single identifier stays unquoted; anything else (spaces, digits first, dots, punctuation) is quoted.
  if (/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) return name;
  return `"${name.replace(/["\\]/g, "\\$&")}"`;
}

/**
 * CSS font-family value for a font name (or list) read from a document.
 * "Calibri" → `Calibri, Carlito, sans-serif`; "Calibri Light" → `"Calibri Light", Carlito, sans-serif`;
 * a list that already ends with a generic family, a CSS-wide keyword or a var() is returned unchanged.
 */
export function documentFontStack(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/var\(|calc\(/i.test(raw) || CSS_WIDE.has(raw.toLowerCase())) return raw;
  const families = splitFamilies(raw);
  if (!families.length) return raw;
  if (GENERIC.has(families[families.length - 1].toLowerCase())) return raw;
  const seen = new Set(families.map(name => name.toLowerCase()));
  const stack = [...families];
  const first = families[0];
  for (const name of DOCUMENT_FONT_SUBSTITUTES[first.toLowerCase()] || []) {
    if (!seen.has(name.toLowerCase())) {
      stack.push(name);
      seen.add(name.toLowerCase());
    }
  }
  stack.push(genericFamilyFor(first));
  return stack.map(quoteFamily).join(", ");
}
