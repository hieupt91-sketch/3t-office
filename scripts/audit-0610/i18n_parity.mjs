import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function collectKeys(obj, prefix = "") {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") {
      keys.push({ key: fullKey, value: v });
    } else if (v && typeof v === "object") {
      if (v.label !== undefined || v.tooltip !== undefined) {
        keys.push({ key: fullKey, value: v });
      } else {
        keys.push(...collectKeys(v, fullKey));
      }
    }
  }
  return keys;
}

function getPlaceholders(str) {
  const matches = str.match(/{[^}]+}/g);
  return matches ? new Set(matches) : new Set();
}

function isShortOrSymbol(str) {
  if (str.length <= 3) return true;
  return /^[A-Z0-9\s\-_]+$/.test(str) && /[A-Z]/.test(str);
}

function valuesEqual(vi, en) {
  if (typeof vi !== "string" || typeof en !== "string") return false;
  if (vi === en) {
    if (isShortOrSymbol(vi)) return false;
    return true;
  }
  return false;
}

const viEntries = collectKeys(viStrings);
const enEntries = collectKeys(enStrings);

const viMap = new Map(viEntries.map(e => [e.key, e.value]));
const enMap = new Map(enEntries.map(e => [e.key, e.value]));

const viKeys = new Set(viMap.keys());
const enKeys = new Set(enMap.keys());

const onlyInVi = [...viKeys].filter(k => !enKeys.has(k)).sort();
const onlyInEn = [...enKeys].filter(k => !viKeys.has(k)).sort();

const emptyOrIdentical = [];
for (const k of [...viKeys].filter(k => enKeys.has(k)).sort()) {
  const viVal = viMap.get(k);
  const enVal = enMap.get(k);
  const viStr = typeof viVal === "string" ? viVal : JSON.stringify(viVal);
  const enStr = typeof enVal === "string" ? enVal : JSON.stringify(enVal);
  if (!viStr || !enStr || valuesEqual(viStr, enStr)) {
    emptyOrIdentical.push(k);
  }
}

const placeholderMismatch = [];
for (const k of [...viKeys].filter(k => enKeys.has(k)).sort()) {
  const viVal = viMap.get(k);
  const enVal = enMap.get(k);
  if (typeof viVal === "string" && typeof enVal === "string") {
    const viPH = getPlaceholders(viVal);
    const enPH = getPlaceholders(enVal);
    if (viPH.size !== enPH.size || ![...viPH].every(p => enPH.has(p))) {
      placeholderMismatch.push({ key: k, vi: [...viPH], en: [...enPH] });
    }
  }
}

console.log(`VI keys: ${viKeys.size}`);
console.log(`EN keys: ${enKeys.size}`);
console.log("");

if (onlyInVi.length) {
  console.log("Keys in VI but missing in EN:");
  for (const k of onlyInVi) console.log(`  ${k}`);
} else {
  console.log("Keys in VI but missing in EN: (none)");
}
console.log("");

if (onlyInEn.length) {
  console.log("Keys in EN but missing in VI:");
  for (const k of onlyInEn) console.log(`  ${k}`);
} else {
  console.log("Keys in EN but missing in VI: (none)");
}
console.log("");

if (emptyOrIdentical.length) {
  console.log("Keys with empty value or identical VI/EN (suspected untranslated):");
  for (const k of emptyOrIdentical) console.log(`  ${k}`);
} else {
  console.log("Keys with empty value or identical VI/EN (suspected untranslated): (none)");
}
console.log("");

if (placeholderMismatch.length) {
  console.log("Keys with placeholder mismatch (VI has placeholders EN lacks):");
  for (const { key, vi, en } of placeholderMismatch) {
    console.log(`  ${key}  VI:{${vi.join(",")}}  EN:{${en.join(",")}}`);
  }
} else {
  console.log("Keys with placeholder mismatch (VI has placeholders EN lacks): (none)");
}
console.log("");

const hasIssues = onlyInVi.length > 0 || onlyInEn.length > 0 || placeholderMismatch.length > 0;
console.log(`SUMMARY: VI=${viKeys.size} EN=${enKeys.size} missingVI=${onlyInVi.length} missingEN=${onlyInEn.length} emptyOrIdentical=${emptyOrIdentical.length} placeholderMismatch=${placeholderMismatch.length}`);

process.exit(hasIssues ? 1 : 0);