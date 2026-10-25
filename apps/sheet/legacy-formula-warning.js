export const LEGACY_UNSUPPORTED_FUNCTIONS = new Set([
  "UNIQUE", "FILTER", "SORT", "SORTBY", "XLOOKUP", "XMATCH",
  "IFS", "SWITCH", "TEXTJOIN", "CONCAT", "MAXIFS", "MINIFS",
  "LET", "SEQUENCE", "RANDARRAY"
]);

export function findLegacyUnsupportedFunctions(formula) {
  const source = String(formula || "");
  let unquoted = "";
  let inString = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (char === '"') {
      if (inString && source[index + 1] === '"') {
        unquoted += "  ";
        index++;
        continue;
      }
      inString = !inString;
      unquoted += " ";
    } else {
      unquoted += inString ? " " : char;
    }
  }

  const found = new Set();
  const functionCall = /(_xlfn\.)?(?:_xlws\.)?([A-Z][A-Z0-9_.]*)\s*\(/gi;
  let match;
  while ((match = functionCall.exec(unquoted))) {
    const name = match[2].toUpperCase();
    if (match[1] || LEGACY_UNSUPPORTED_FUNCTIONS.has(name)) found.add(name);
  }
  return [...found];
}
