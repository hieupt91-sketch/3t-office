/**
 * VN Office — Unit Tests: Help ⇄ Shortcut consistency (Help Shortcut Consistency Guard)
 *
 * Nội dung Hướng dẫn sử dụng (platform/help/entries-*.js) thường nhắc phím tắt
 * trong title/summary/steps. Bài kiểm tra này đảm bảo shortcut được nhắc KHỚP
 * với shortcut thật định nghĩa trong platform/commands/command-definitions.js
 * (field `shortcut`) và trong app shortcut managers / app keyboard handlers.
 *
 * Hai nhóm kiểm tra:
 *   1. Với mỗi bài Help, với mỗi commandId của bài có shortcut thật: nếu bài
 *      nhắc một shortcut gắn sát cạnh nhãn lệnh (vd "Căn trái (Ctrl+L)"), shortcut
 *      đó phải là shortcut thật của lệnh đó.
 *   2. Bất kỳ shortcut text nào trong Help (pattern Ctrl+..., Shift+..., Alt+...,
 *      F1-F12) phải là shortcut được định nghĩa cho ít nhất một lệnh của app đó.
 *
 * Quy ước chuẩn hóa khi so sánh:
 *   - Bỏ khoảng trắng: "Page Up" ≡ "PageUp".
 *   - Mũi tên ≡ tên phím: "Alt+Shift+↑" ≡ "Alt+Shift+Up".
 *   - Tách tổ hợp viết gọn: "Ctrl+Z/Ctrl+Y" → 2 token; "Alt+Shift+↑/↓" → 2 token.
 *   - Bỏ dấu câu cuối token: "Alt+F:" → "Alt+F".
 *   - Bỏ qua ngữ cảnh phủ định: "Không có Ctrl+Alt+M như Writer", "không F2".
 *
 * Ngoại lệ có chủ ý (ghi rõ, không phải để test xanh):
 *   - Shortcut cấp app (không phải command shortcut) nhưng là phím tắt THẬT,
 *     bind trong app code: Shift+F2 (Sheet: Thêm ghi chú, apps/sheet/sheet-grid.js),
 *     Ctrl+Enter (Slides: gửi nhận xét, apps/slides/slides-canvas.js).
 *   - Hợp phím điều hướng Tab / Shift+Tab / Enter / Shift+Enter là hành vi thật
 *     của app (bẫy tiêu điểm trong hộp thoại ở cả 3 app; di chuyển ô khi đang
 *     nhập trong Sheet — apps/sheet/sheet-grid.js formulaInput). Chúng được chấp
 *     nhận TRONG các bài Hướng dẫn về điều hướng bàn phím (id/title chứa
 *     "keyboardNav" / "bàn phím"), nơi mô tả đúng hành vi này. Ở bài khác, một
 *     hợp phím Shift+/Ctrl+/Alt+ phải là command shortcut thật của app.
 */

import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";
import { ERROR_REPORTING_HELP_ENTRIES } from "../../platform/help/entries-error-reporting.js";
import { AUTORECOVER_HELP_ENTRIES } from "../../platform/help/entries-autorecover.js";
import { UPDATER_HELP_ENTRIES } from "../../platform/help/entries-updater.js";
import {
  COMMON_COMMANDS,
  WRITER_COMMANDS,
  SHEET_COMMANDS,
  SLIDES_COMMANDS
} from "../../platform/commands/command-definitions.js";

const ALL_COMMANDS = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS];

/** commandId -> shortcut thật (chuẩn hóa), chỉ lệnh có shortcut trong command-definitions.js */
const COMMAND_SHORTCUTS = new Map(
  ALL_COMMANDS.filter((cmd) => cmd.shortcut).map((cmd) => [cmd.id, normalizeShortcut(cmd.shortcut)])
);

/** Shortcut cấp app bind trong app code (không phải command shortcut) — xem mô tả trên */
const APP_LEVEL_BINDINGS = {
  writer: { "Shift+Space": "writer.table.selectRow" },
  sheet: { "Shift+F2": "sheet.review.commentInsert", "Alt+Enter": "sheet.cell.insertLineBreak" },
  slides: { "Ctrl+Enter": "slides.review.commentInsert" }
};

/** Phím tắt cấp chung được registerAllStandardCommands bind vào scope common. */
const COMMON_LEVEL_BINDINGS = {
  "Ctrl+Shift+S": "common.file.saveAs"
};

/** Hợp phím điều hướng (bẫy focus / di chuyển ô) — chỉ chấp nhận trong bài về điều hướng bàn phím */
const NAVIGATION_CHORDS = new Set(["Tab", "Shift+Tab", "Enter", "Shift+Enter"]);

const COMBO_TOKEN_RE = /(?:Ctrl|Shift|Alt|Meta|Win)(?:\s*\+\s*(?:Ctrl|Shift|Alt|Meta|Win))*\s*\+\s*(?:[^\s,.)\]}»:/]+|[=+])/gi;
const FKEY_TOKEN_RE = /F(?:[1-9]|1[0-2])\b/g;
const PAGE_TOKEN_RE = /Page\s*(?:Up|Down)/gi;

const ATTACH_DISTANCE = 24;

function normalizeShortcut(raw) {
  return raw
    .replace(/\s+/g, "")
    .replace(/↑/g, "Up")
    .replace(/↓/g, "Down")
    .replace(/←/g, "Left")
    .replace(/→/g, "Right");
}

/** "Alt+Shift+↑/↓" → "Alt+Shift+↑ Alt+Shift+↓" (tổ hợp viết gọn bằng dấu /) */
function expandArrowSlash(text) {
  return text.replace(
    /((?:(?:Ctrl|Shift|Alt|Meta|Win)\+)+[↑↓←→])\s*\/\s*([↑↓←→])/g,
    (match, base, arrow) => `${base} ${base.slice(0, -1) + arrow}`
  );
}

/** Bỏ qua ngữ cảnh phủ định: "không có Ctrl+Alt+M", "không F2", "giảm cấp không phải phím Shift+Tab như Word", ... */
function stripNegations(text) {
  return text
    .replace(
      /không(?:\s+(?:có|phải|dùng|bằng|bấm|nhấn|phím|tổ hợp))*\s*((?:Ctrl|Shift|Alt|Meta|Win)\s*\+\s*[^\s,;.)\]}»]+|F(?:[1-9]|1[0-2])|Page\s*(?:Up|Down))/gi,
      ""
    )
    // Protect Ctrl+Shift+; (sheet.insert.time) from negation removal
    .replace(/Ctrl\+Shift\+;/g, "Ctrl+Shift+;")
    // Remove trailing semicolon from shortcuts like "Ctrl+1;" (Vietnamese punctuation)
    .replace(/\b(Ctrl|Shift|Alt|Meta|Win)(?:\s*\+\s*(?:Ctrl|Shift|Alt|Meta|Win))*\s*\+\s*\w+;/g, (m) => m.slice(0, -1));
}

/** Tách toàn bộ shortcut token trong đoạn text, kèm vị trí & dạng chuẩn hóa */
function tokenize(text) {
  const tokens = [];
  for (const m of text.matchAll(COMBO_TOKEN_RE)) {
    tokens.push({ raw: m[0], index: m.index, kind: "combo" });
  }
  for (const m of text.matchAll(FKEY_TOKEN_RE)) {
    tokens.push({ raw: m[0], index: m.index, kind: "fkey" });
  }
  for (const m of text.matchAll(PAGE_TOKEN_RE)) {
    tokens.push({ raw: m[0], index: m.index, kind: "page" });
  }
  tokens.sort((a, b) => a.index - b.index);
  // Bỏ token lặp nằm trong token khác (vd "F2" bên trong "Shift+F2")
  const deduped = tokens.filter((t, i) => {
    const end = t.index + t.raw.length;
    return !tokens.some((o, j) => j !== i && o.index <= t.index && o.index + o.raw.length >= end && (o.raw.length > t.raw.length || (o.raw.length === t.raw.length && j < i)));
  });
  return deduped.map((t) => ({ ...t, norm: normalizeShortcut(t.raw) }));
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Vị trí xuất hiện đầu tiên của nhãn lệnh trong text (không phân biệt hoa thường), -1 nếu không có */
function indexOfLabel(text, label) {
  if (!label) return -1;
  const re = new RegExp(escapeRegExp(label), "i");
  const m = re.exec(text);
  return m ? m.index : -1;
}

function isNavigationEntry(entry) {
  return (
    /keyboardNav/i.test(entry.id || "") ||
    /bàn phím|keyboard|điều hướng/i.test(`${entry.title || ""} ${entry.summary || ""}`)
  );
}

/** Tập shortcut được định nghĩa cho app: command-definitions (COMMON + lệnh app) + app-level binds */
function buildDefinedShortcutSet(app) {
  const set = new Set();
  for (const cmd of ALL_COMMANDS) {
    const isAppCmd = cmd.id.startsWith(`${app}.`) || !/^(writer|sheet|slides)\./.test(cmd.id);
    if (isAppCmd && cmd.shortcut) set.add(normalizeShortcut(cmd.shortcut));
  }
  for (const [token, cmdId] of Object.entries(APP_LEVEL_BINDINGS[app] || {})) {
    if (cmdId.startsWith(`${app}.`)) set.add(normalizeShortcut(token));
  }
  for (const [token, cmdId] of Object.entries(COMMON_LEVEL_BINDINGS)) {
    if (ALL_COMMANDS.some((cmd) => cmd.id === cmdId)) set.add(normalizeShortcut(token));
  }
  return set;
}

const APPS = [
  { app: "writer", entries: [...WRITER_HELP_ENTRIES, ...ERROR_REPORTING_HELP_ENTRIES.filter((e) => e.app === "writer"), ...AUTORECOVER_HELP_ENTRIES.filter((e) => e.app === "writer"), ...UPDATER_HELP_ENTRIES.filter((e) => e.app === "writer")] },
  { app: "sheet", entries: [...SHEET_HELP_ENTRIES, ...ERROR_REPORTING_HELP_ENTRIES.filter((e) => e.app === "sheet"), ...AUTORECOVER_HELP_ENTRIES.filter((e) => e.app === "sheet"), ...UPDATER_HELP_ENTRIES.filter((e) => e.app === "sheet")] },
  { app: "slides", entries: [...SLIDES_HELP_ENTRIES, ...ERROR_REPORTING_HELP_ENTRIES.filter((e) => e.app === "slides"), ...AUTORECOVER_HELP_ENTRIES.filter((e) => e.app === "slides"), ...UPDATER_HELP_ENTRIES.filter((e) => e.app === "slides")] }
];

function collectEntryProblems(entry, definedShortcuts) {
  const problems = [];
  const commandIds = Array.isArray(entry.commandIds) ? entry.commandIds : [];
  const segments = [entry.summary, ...(entry.steps || [])].filter(Boolean);
  const cleanedSegments = segments.map((s) => stripNegations(expandArrowSlash(s)));

  // --- Phần 1: shortcut nhắc cạnh nhãn lệnh phải là shortcut thật của lệnh đó ---
  const entryCommands = commandIds.filter((id) => COMMAND_SHORTCUTS.has(id));
  const realShortcutsOfEntry = new Set(entryCommands.map((id) => COMMAND_SHORTCUTS.get(id)));
  const labelById = new Map(ALL_COMMANDS.map((cmd) => [cmd.id, cmd.label || ""]));

  for (const cmdId of entryCommands) {
    const real = COMMAND_SHORTCUTS.get(cmdId);
    const label = labelById.get(cmdId);
    cleanedSegments.forEach((segment, segIdx) => {
      const tokens = tokenize(segment);
      for (const token of tokens) {
        if (token.norm === real) continue;
        if (token.kind === "page") continue; // Page Up/Down không thuộc pattern bắt buộc của task
        const labelIndex = indexOfLabel(segment, label);
        if (labelIndex < 0) continue;
        const distance = Math.abs(labelIndex - token.index);
        if (distance > ATTACH_DISTANCE) continue;
        // Escape hatch: token là shortcut thật của một lệnh khác trong cùng bài
        // (vd cùng step liệt kê "Căn trái (Ctrl+L), Căn giữa (Ctrl+E)").
        if (realShortcutsOfEntry.has(token.norm)) continue;
        const where = segIdx === 0 ? "summary" : `step ${segIdx}`;
        problems.push(
          `[${entry.id}] ${where}: nhắc "${token.norm}" gắn cạnh nhãn "${label}" (${cmdId}) nhưng shortcut thật của lệnh là "${real}"`
        );
      }
    });
  }

  // --- Phần 2: mọi shortcut text trong Help phải được định nghĩa cho app ---
  const fullText = cleanedSegments.join(" ");
  for (const token of tokenize(fullText)) {
    if (token.kind === "page") continue; // ngoài pattern của task (Ctrl+.../Shift+.../Alt+.../F1-F12)
    if (NAVIGATION_CHORDS.has(token.norm) && isNavigationEntry(entry)) continue;
    if (!definedShortcuts.has(token.norm)) {
      problems.push(
        `[${entry.id}] nhắc shortcut "${token.norm}" nhưng không được định nghĩa cho bất kỳ lệnh nào của ${entry.app} (command-definitions.js + app shortcut managers)`
      );
    }
  }

  return problems;
}

export async function runHelpShortcutConsistencyTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  for (const { app, entries } of APPS) {
    const definedShortcuts = buildDefinedShortcutSet(app);

    await test(`Help Shortcut Consistency: mọi shortcut nhắc trong Help ${app} khớp shortcut thật (command-definitions + app binds)`, () => {
      const problems = [];
      let checked = 0;
      for (const entry of entries) {
        checked += 1;
        for (const problem of collectEntryProblems(entry, definedShortcuts)) {
          problems.push(problem);
        }
      }
      if (problems.length > 0) {
        throw new Error(`Phát hiện ${problems.length} bất đồng bộ trên ${checked} bài Help ${app}:\n  - ${problems.join("\n  - ")}`);
      }
    });
  }

  return results;
}
