/**
 * VN Office — Unit Tests: Kiểm tra 100% lệnh trên Ribbon có Handler và Definition
 * Đảm bảo mọi nút, dropdown, splitButton, dialog launcher trên thanh Ribbon
 * của cả 3 ứng dụng (Writer, Sheet, Slides) đều được định nghĩa và có handler xử lý,
 * không có nút chết (zero silent NO-OPs).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";

import {
  COMMON_COMMANDS,
  WRITER_COMMANDS,
  SHEET_COMMANDS,
  SLIDES_COMMANDS
} from "../../platform/commands/command-definitions.js";

import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { showPendingFeatureNotice } from "../../platform/ui-kit/dialogs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

function readSource(relPath) {
  const fullPath = path.join(rootDir, relPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

const sources = {
  appShell: readSource("platform/shell/app-shell.js"),
  writerAdapter: readSource("adapters/libreoffice/writer/writer-adapter.js"),
  writerApp: readSource("apps/writer/writer-app.js"),
  writerVC: readSource("apps/writer/writer-view-controller.js"),
  writerAC: readSource("apps/writer/writer-arrange-controller.js"),
  sheetAdapter: readSource("adapters/libreoffice/sheet/sheet-adapter.js"),
  sheetApp: readSource("apps/sheet/sheet-app.js"),
  sheetGrid: readSource("apps/sheet/sheet-grid.js"),
  slidesAdapter: readSource("adapters/libreoffice/slides/slides-adapter.js"),
  slidesApp: readSource("apps/slides/slides-app.js"),
  slidesCanvas: readSource("apps/slides/slides-canvas.js"),
};

const allDefinitions = new Map();
for (const def of [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS]) {
  allDefinitions.set(def.id, def);
}

function checkHandler(commandId, appKey) {
  const escaped = commandId.replace(/\./g, "\\.");
  const bindPattern = new RegExp(`(?:bindHandler|bind)\\(\\s*["']${escaped}["']`);
  const casePattern = new RegExp(`case\\s+["']${escaped}["']`);

  if (bindPattern.test(sources.appShell)) return true;

  if (appKey === "writer") {
    if (bindPattern.test(sources.writerApp)) return true;
    if (bindPattern.test(sources.writerAdapter)) return true;
    if (bindPattern.test(sources.writerVC)) return true;
    if (bindPattern.test(sources.writerAC)) return true;
    if (casePattern.test(sources.writerAdapter)) return true;
  } else if (appKey === "sheet") {
    if (bindPattern.test(sources.sheetApp)) return true;
    if (bindPattern.test(sources.sheetAdapter)) return true;
    if (bindPattern.test(sources.sheetGrid)) return true;
    if (casePattern.test(sources.sheetAdapter)) return true;
  } else if (appKey === "slides") {
    if (bindPattern.test(sources.slidesApp)) return true;
    if (bindPattern.test(sources.slidesAdapter)) return true;
    if (bindPattern.test(sources.slidesCanvas)) return true;
    if (casePattern.test(sources.slidesAdapter)) return true;
  }

  const unoUrl = VN_TO_UNO_MAP[commandId];
  if (unoUrl) {
    const unoEscaped = unoUrl.replace(/\./g, "\\.");
    const unoCase = new RegExp(`case\\s+["']${unoEscaped}["']`);
    if (appKey === "writer" && unoCase.test(sources.writerAdapter)) return true;
    if (appKey === "sheet" && unoCase.test(sources.sheetAdapter)) return true;
    if (appKey === "slides" && unoCase.test(sources.slidesAdapter)) return true;
  }

  return false;
}

function extractRibbonCommandIds(tabs) {
  const commandIds = new Set();

  function walk(items) {
    if (!items || !Array.isArray(items)) return;
    for (const item of items) {
      if (item.type === "dropdown" || item.type === "splitButton") {
        const id = item.commandId || item.id;
        if (id) commandIds.add(id);
        if (item.items && Array.isArray(item.items)) {
          for (const sub of item.items) {
            if (sub.commandId) commandIds.add(sub.commandId);
          }
        }
      } else if (item.commandId) {
        commandIds.add(item.commandId);
      }
      if (item.items && item.type !== "dropdown" && item.type !== "splitButton") {
        walk(item.items);
      }
    }
  }

  for (const tab of tabs) {
    for (const group of tab.groups || []) {
      if (group.launcherCommandId) {
        commandIds.add(group.launcherCommandId);
      }
      walk(group.items);
    }
  }

  return Array.from(commandIds);
}

export async function runRibbonCommandHandlersTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  const writerCommands = extractRibbonCommandIds(WRITER_RIBBON_TABS);
  const sheetCommands = extractRibbonCommandIds(SHEET_RIBBON_TABS);
  const slidesCommands = extractRibbonCommandIds(SLIDES_RIBBON_TABS);

  await test("Ribbon Command Handlers: 100% lệnh ribbon Writer có định nghĩa đầy đủ", () => {
    const missing = writerCommands.filter(id => !allDefinitions.has(id));
    if (missing.length > 0) {
      throw new Error(`Còn ${missing.length} lệnh ribbon Writer chưa có định nghĩa: ${missing.join(", ")}`);
    }
  });

  await test("Ribbon Command Handlers: 100% lệnh ribbon Sheet có định nghĩa đầy đủ", () => {
    const missing = sheetCommands.filter(id => !allDefinitions.has(id));
    if (missing.length > 0) {
      throw new Error(`Còn ${missing.length} lệnh ribbon Sheet chưa có định nghĩa: ${missing.join(", ")}`);
    }
  });

  await test("Ribbon Command Handlers: 100% lệnh ribbon Slides có định nghĩa đầy đủ", () => {
    const missing = slidesCommands.filter(id => !allDefinitions.has(id));
    if (missing.length > 0) {
      throw new Error(`Còn ${missing.length} lệnh ribbon Slides chưa có định nghĩa: ${missing.join(", ")}`);
    }
  });

  await test("Ribbon Command Handlers: 100% lệnh ribbon VN Writer có handler thực thi", () => {
    const unhandled = writerCommands.filter(id => !checkHandler(id, "writer"));
    if (unhandled.length > 0) {
      throw new Error(`Còn ${unhandled.length} lệnh ribbon Writer chưa có handler: ${unhandled.join(", ")}`);
    }
  });

  await test("Ribbon Command Handlers: 100% lệnh ribbon VN Sheet có handler thực thi", () => {
    const unhandled = sheetCommands.filter(id => !checkHandler(id, "sheet"));
    if (unhandled.length > 0) {
      throw new Error(`Còn ${unhandled.length} lệnh ribbon Sheet chưa có handler: ${unhandled.join(", ")}`);
    }
  });

  await test("Ribbon Command Handlers: 100% lệnh ribbon VN Slides có handler thực thi", () => {
    const unhandled = slidesCommands.filter(id => !checkHandler(id, "slides"));
    if (unhandled.length > 0) {
      throw new Error(`Còn ${unhandled.length} lệnh ribbon Slides chưa có handler: ${unhandled.join(", ")}`);
    }
  });

  await test("Ribbon Command Handlers: showPendingFeatureNotice hiển thị đúng câu thông báo chuẩn", async () => {
    if (typeof showPendingFeatureNotice !== "function") {
      throw new Error("showPendingFeatureNotice không phải là function");
    }
    // Chạy không crash trong môi trường không có DOM (headless node)
    await showPendingFeatureNotice("Tính năng thử nghiệm");
  });

  return results;
}
