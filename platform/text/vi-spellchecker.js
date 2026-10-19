import { isValidVietnameseSyllable } from "./vi-syllable.js";

const WORD_PATTERN = /[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+)*/gu;

export const VI_PERSONAL_DICTIONARY_KEY = "vno-spellcheck-vi-personal";

export function normalizeVietnameseWord(word) {
  return String(word || "").normalize("NFC").toLocaleLowerCase("vi");
}

export function tokenizeVietnamese(text) {
  const source = String(text || "").normalize("NFC");
  return [...source.matchAll(WORD_PATTERN)].map(match => ({
    word: match[0],
    normalized: normalizeVietnameseWord(match[0]),
    start: match.index,
    end: match.index + match[0].length
  }));
}

export function levenshteinDistance(left, right, limit = Infinity) {
  const a = normalizeVietnameseWord(left);
  const b = normalizeVietnameseWord(right);
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 1; row <= a.length; row++) {
    const current = [row];
    let rowMin = row;
    for (let column = 1; column <= b.length; column++) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + cost
      );
      rowMin = Math.min(rowMin, current[column]);
    }
    if (rowMin > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

function readPersonalWords(storage, key) {
  try {
    const value = JSON.parse(storage?.getItem?.(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export class VietnameseSpellChecker {
  constructor(words, { storage = globalThis.localStorage, storageKey = VI_PERSONAL_DICTIONARY_KEY } = {}) {
    this.storage = storage;
    this.storageKey = storageKey;
    this.words = new Set();
    for (const word of words || []) {
      const normalized = normalizeVietnameseWord(String(word).split("/")[0].trim());
      if (normalized && !/^\d+$/.test(normalized)) this.words.add(normalized);
    }
    this.personalWords = new Set(readPersonalWords(storage, storageKey).map(normalizeVietnameseWord));
    this.ignoredWords = new Set();
  }

  static async fromUrl(url, options) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Không tải được từ điển tiếng Việt (${response.status})`);
    const lines = (await response.text()).replace(/^\uFEFF/, "").split(/\r?\n/);
    if (/^\d+$/.test(lines[0]?.trim())) lines.shift();
    return new VietnameseSpellChecker(lines, options);
  }

  isKnown(word) {
    const normalized = normalizeVietnameseWord(word);
    if (!normalized || normalized.length === 1 || /\d/.test(normalized)) return true;
    // Unknown capitalized tokens are commonly names, brands or acronyms. Treat them as
    // uncertain-but-not-actionable to avoid noisy false positives in normal documents.
    if (/^\p{Lu}[\p{Ll}\p{M}]+$/u.test(word) || /^\p{Lu}{2,}$/u.test(word)) return true;
    if (this.words.has(normalized) || this.personalWords.has(normalized) || this.ignoredWords.has(normalized)) return true;
    // Danh sách từ chỉ có ~2.800 âm tiết nên thiếu cả từ rất thông dụng (thuế, kênh, trực, mại...). Mọi âm tiết hợp lệ
    // theo quy tắc chính tả tiếng Việt đều coi là đúng; chữ sai vần, thiếu thanh ở vần kín, chữ ngoại vẫn bị đánh dấu.
    return isValidVietnameseSyllable(normalized);
  }

  checkText(text) {
    return tokenizeVietnamese(text).filter(token => !this.isKnown(token.word));
  }

  ignore(word) {
    this.ignoredWords.add(normalizeVietnameseWord(word));
  }

  addToPersonalDictionary(word) {
    const normalized = normalizeVietnameseWord(word);
    if (!normalized) return;
    this.personalWords.add(normalized);
    try {
      this.storage?.setItem?.(this.storageKey, JSON.stringify([...this.personalWords].sort()));
    } catch {
      // Storage can be unavailable in private/embedded contexts; the in-memory set still works.
    }
  }

  suggest(word, { maxDistance = 2, limit = 5, contextPrev = "" } = {}) {
    const normalized = normalizeVietnameseWord(word);
    const normToneFree = stripVietnameseTone(normalized);
    const normBase = stripVietnameseDiacritics(normalized);

    const candidates = [];
    for (const candidate of this.words) {
      if (Math.abs(candidate.length - normalized.length) > maxDistance) continue;
      if (candidate[0] !== normalized[0]) continue;
      const distance = levenshteinDistance(normalized, candidate, maxDistance);
      if (distance <= maxDistance) {
        const candToneFree = stripVietnameseTone(candidate);
        const candBase = stripVietnameseDiacritics(candidate);

        let tier = 3;
        if (candToneFree === normToneFree) {
          tier = 0; // Cùng chữ cái gốc, chỉ khác thanh điệu (ví dụ đinh -> định, đình)
        } else if (candBase === normBase) {
          tier = 1; // Cùng phụ âm & nguyên âm gốc, khác dấu mũ/móc (ví dụ a -> ă, â)
        } else if (distance === 1) {
          tier = 2; // Sai khác 1 ký tự
        }

        let contextBonus = 0;
        if (contextPrev) {
          const bigram = `${contextPrev.toLowerCase()} ${candidate}`;
          if (["quyết định", "xác định", "nhất định", "khẳng định", "quy định", "dự định", "gia đình", "hội đồng", "văn bản", "cộng hòa", "xã hội", "chính phủ", "tiêu chuẩn"].includes(bigram)) {
            contextBonus = -1;
          }
        }

        candidates.push({
          word: candidate,
          distance,
          tier,
          score: tier * 10 + distance + contextBonus
        });
      }
    }
    return candidates
      .sort((a, b) => a.score - b.score || a.word.localeCompare(b.word, "vi"))
      .slice(0, limit)
      .map(item => item.word);
  }
}

export function stripVietnameseTone(word) {
  return String(word || "")
    .normalize("NFD")
    .replace(/[\u0300\u0301\u0303\u0309\u0323]/g, "")
    .normalize("NFC");
}

export function stripVietnameseDiacritics(word) {
  return String(word || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
}
