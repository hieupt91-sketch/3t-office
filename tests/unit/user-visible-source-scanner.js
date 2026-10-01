// Scan prose literals and HTML templates rather than implementation identifiers,
// imports, XML formats or engine IDs. Runtime catalogs are scanned separately.
export const BANNED_DISPLAY_TEXT = /LibreOffice|soffice|OpenOffice|\bUNO\b|headless|FOD[TSP]|Microsoft|PowerPoint|Office 365|\bWPS\b|(?<![-\w])(Word|Excel)(?![-\w])|3T (Doc|Sheet|Slide)|chuan chuan|chuẩn chuẩn|\.js\b/;

function sourceStrings(source) {
  const values = [];
  let index = 0;
  function code(stopAtBrace = false) {
    let previous = "";
    while (index < source.length) {
      const char = source[index];
      if (/\s/.test(char)) { index++; continue; }
      if (source.startsWith("//", index)) {
        const end = source.indexOf("\n", index);
        index = end < 0 ? source.length : end + 1; continue;
      }
      if (source.startsWith("/*", index)) {
        const end = source.indexOf("*/", index + 2);
        index = end < 0 ? source.length : end + 2; continue;
      }
      if (char === "}" && stopAtBrace) { index++; return; }
      if (char === "{") { index++; code(true); previous = "}"; continue; }
      if (char === '"' || char === "'" || char === "`") {
        const quote = char;
        const start = index++;
        let text = "";
        while (index < source.length) {
          if (source[index] === "\\") { text += source.slice(index, index + 2); index += 2; continue; }
          if (source[index] === quote) { index++; break; }
          if (quote === "`" && source.startsWith("${", index)) {
            values.push({ text, index: start }); text = "";
            index += 2; code(true); continue;
          }
          text += source[index++];
        }
        values.push({ text, index: start }); previous = "string"; continue;
      }
      if (char === "/" && (!previous || /^[=(,:\[!?;{}]$/.test(previous) || ["return", "=>", "||", "&&"].includes(previous))) {
        index++;
        let inClass = false;
        while (index < source.length) {
          const current = source[index++];
          if (current === "\\") { index++; continue; }
          if (current === "[") inClass = true;
          if (current === "]") inClass = false;
          if (current === "/" && !inClass) break;
        }
        while (/[a-z]/i.test(source[index] || "") && index < source.length) index++;
        previous = "regex"; continue;
      }
      const token = source.slice(index).match(/^(?:[\w$]+|=>|\|\||&&)/)?.[0] || char;
      previous = token; index += token.length;
    }
  }
  code();
  return values;
}

export function scanDisplayedSource(source, filename) {
  if (/(^|\/)THIRD-PARTY-NOTICES(?:\.[^/]*)?$/.test(filename)) return [];
  const violations = [];
  for (const match of sourceStrings(source)) {
    const text = match.text;
    const line = source.slice(source.lastIndexOf("\n", match.index) + 1, match.index);
    const statement = source.slice(Math.max(source.lastIndexOf(";", match.index), source.lastIndexOf("}", match.index)) + 1, match.index);
    // Technical paths and single engine/format values are not displayed prose.
    const displayProperty = /\b(?:label|tooltip|title|summary|placeholder|ariaLabel|appTitle|textContent|innerText|innerHTML|message)\s*[:=]\s*$/.test(line);
    // Adapters keep parser diagnostics and format descriptors internally. Scan
    // their displayed properties, notification/status calls and HTML instead.
    if (filename.startsWith("adapters/") && !displayProperty && !/\b(?:setStatus|showNotification|setAttribute)\??\.?\s*\(/.test(line) && !/<[^>]+>/.test(text)) continue;
    if (!displayProperty && !/\s|[À-ỹ]|<[^>]+>/.test(text)) continue;
    if (/console\.(?:log|warn|error|debug)|const prompt\s*=/.test(line) || /console\.(?:log|warn|error|debug)\s*\(|reportOpenIssue\s*\(/.test(statement)) continue;
    // Exception is a single third-party license entry, never the whole About file.
    const restOfLine = source.slice(match.index, source.indexOf("\n", match.index) < 0 ? source.length : source.indexOf("\n", match.index));
    if (filename === "platform/about/about-dialog.js" && /^LibreOffice(?: Core)?$/.test(text) && /license:\s*"MPL-2\.0"/.test(restOfLine)) continue;
    // Quoted paths inside an HTML template are source dependencies, not labels.
    const prose = text.replace(/["'](?:\.{1,2}\/)[^"'\s]+\.js["']/g, "");
    if (BANNED_DISPLAY_TEXT.test(prose)) violations.push({ filename, text: prose.slice(0, 300) });
  }
  return violations;
}
