#!/usr/bin/env node
/**
 * VN Office — Complete Ribbon Inventory & Handler Static Audit
 * Scans all ribbon controls for VN Writer, VN Sheet, and VN Slides.
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
import { viStrings } from "../../platform/i18n/strings-vi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

function readSource(relPath) {
  const fullPath = path.join(rootDir, relPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

const sources = {
  appShell: readSource("platform/shell/app-shell.js"),
  bootstrap: readSource("platform/bootstrap.js"),
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

const cmdDefs = new Map();
for (const def of [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS]) {
  cmdDefs.set(def.id, def);
}

function checkHandlerExists(commandId, appKey) {
  const escaped = commandId.replace(/\./g, "\\.");
  const bindPattern = new RegExp(`(?:bindHandler|bind)\\(\\s*["']${escaped}["']`);
  const casePattern = new RegExp(`case\\s+["']${escaped}["']`);

  if (bindPattern.test(sources.appShell)) return { hasHandler: true, location: "appShell" };
  if (bindPattern.test(sources.bootstrap)) return { hasHandler: true, location: "bootstrap" };

  if (appKey === "writer") {
    if (bindPattern.test(sources.writerApp)) return { hasHandler: true, location: "writerApp" };
    if (bindPattern.test(sources.writerAdapter)) return { hasHandler: true, location: "writerAdapter" };
    if (bindPattern.test(sources.writerVC)) return { hasHandler: true, location: "writerVC" };
    if (bindPattern.test(sources.writerAC)) return { hasHandler: true, location: "writerAC" };
    if (casePattern.test(sources.writerAdapter)) return { hasHandler: true, location: "writerAdapterCase" };
  } else if (appKey === "sheet") {
    if (bindPattern.test(sources.sheetApp)) return { hasHandler: true, location: "sheetApp" };
    if (bindPattern.test(sources.sheetAdapter)) return { hasHandler: true, location: "sheetAdapter" };
    if (bindPattern.test(sources.sheetGrid)) return { hasHandler: true, location: "sheetGrid" };
    if (casePattern.test(sources.sheetAdapter)) return { hasHandler: true, location: "sheetAdapterCase" };
  } else if (appKey === "slides") {
    if (bindPattern.test(sources.slidesApp)) return { hasHandler: true, location: "slidesApp" };
    if (bindPattern.test(sources.slidesAdapter)) return { hasHandler: true, location: "slidesAdapter" };
    if (bindPattern.test(sources.slidesCanvas)) return { hasHandler: true, location: "slidesCanvas" };
    if (casePattern.test(sources.slidesAdapter)) return { hasHandler: true, location: "slidesAdapterCase" };
  }

  const unoUrl = VN_TO_UNO_MAP[commandId];
  if (unoUrl) {
    const unoEscaped = unoUrl.replace(/\./g, "\\.");
    const unoCase = new RegExp(`case\\s+["']${unoEscaped}["']`);
    if (appKey === "writer" && unoCase.test(sources.writerAdapter)) return { hasHandler: true, location: "unoWriter" };
    if (appKey === "sheet" && unoCase.test(sources.sheetAdapter)) return { hasHandler: true, location: "unoSheet" };
    if (appKey === "slides" && unoCase.test(sources.slidesAdapter)) return { hasHandler: true, location: "unoSlides" };
  }

  return { hasHandler: false, location: null };
}

export function extractAllControls(appKey, tabs) {
  const controls = [];
  const seenInTab = new Map(); // tabId -> Set of commandIds

  function walk(items, tab, group, parentType = "group") {
    if (!items || !Array.isArray(items)) return;
    for (const item of items) {
      if (item.type === "dropdown" || item.type === "splitButton") {
        const ddCommandId = item.commandId || item.id;
        const label = item.label || viStrings.commands?.[ddCommandId]?.label || cmdDefs.get(ddCommandId)?.label || ddCommandId;
        controls.push({
          app: appKey,
          tabId: tab.id,
          tabLabel: tab.label,
          groupId: group.id,
          groupLabel: group.label,
          type: item.type,
          commandId: ddCommandId,
          label,
          isSubItem: false,
          parent: null
        });
        if (item.items && Array.isArray(item.items)) {
          const walkMenuItems = (menuItems, parent) => {
            for (const sub of menuItems) {
              if (sub.commandId) {
                const subCmd = sub.commandId;
                const subLabel = sub.label || viStrings.commands?.[subCmd]?.label || cmdDefs.get(subCmd)?.label || subCmd;
                controls.push({
                  app: appKey,
                  tabId: tab.id,
                  tabLabel: tab.label,
                  groupId: group.id,
                  groupLabel: group.label,
                  type: "menuItem",
                  commandId: subCmd,
                  args: sub.args,
                  label: subLabel,
                  isSubItem: true,
                  parent
                });
              }
              if (Array.isArray(sub.items)) walkMenuItems(sub.items, sub.commandId || sub.id || parent);
            }
          };
          walkMenuItems(item.items, ddCommandId);
        }
      } else if (item.commandId) {
        const def = cmdDefs.get(item.commandId);
        const label = item.label || viStrings.commands?.[item.commandId]?.label || def?.label || item.commandId;
        controls.push({
          app: appKey,
          tabId: tab.id,
          tabLabel: tab.label,
          groupId: group.id,
          groupLabel: group.label,
          type: item.type || "button",
          commandId: item.commandId,
          label,
          options: item.options ? item.options.map(o => o.value) : undefined,
          isSubItem: false,
          parent: null
        });
      }
      if (item.items && item.type !== "dropdown" && item.type !== "splitButton") {
        walk(item.items, tab, group, item.type);
      }
    }
  }

  for (const tab of tabs) {
    for (const group of tab.groups || []) {
      if (group.launcherCommandId) {
        const def = cmdDefs.get(group.launcherCommandId);
        controls.push({
          app: appKey,
          tabId: tab.id,
          tabLabel: tab.label,
          groupId: group.id,
          groupLabel: group.label,
          type: "dialogLauncher",
          commandId: group.launcherCommandId,
          label: group.launcherTooltip || def?.label || group.launcherCommandId,
          isSubItem: false,
          parent: null
        });
      }
      walk(group.items, tab, group);
    }
  }

  // Audit handlers and duplicates
  for (const ctrl of controls) {
    const { hasHandler, location } = checkHandlerExists(ctrl.commandId, appKey);
    ctrl.hasHandler = hasHandler;
    ctrl.handlerLocation = location;

    if (!seenInTab.has(ctrl.tabId)) seenInTab.set(ctrl.tabId, new Set());
    const tabSet = seenInTab.get(ctrl.tabId);
    if (tabSet.has(ctrl.commandId)) {
      ctrl.isDuplicateInTab = true;
    } else {
      tabSet.add(ctrl.commandId);
      ctrl.isDuplicateInTab = false;
    }
  }

  return controls;
}

const writerControls = extractAllControls("writer", WRITER_RIBBON_TABS);
const sheetControls = extractAllControls("sheet", SHEET_RIBBON_TABS);
const slidesControls = extractAllControls("slides", SLIDES_RIBBON_TABS);

const all = {
  writer: writerControls,
  sheet: sheetControls,
  slides: slidesControls
};

console.log(`Inventory summary:`);
console.log(`Writer controls: ${writerControls.length} (no handler: ${writerControls.filter(c => !c.hasHandler).length}, duplicates: ${writerControls.filter(c => c.isDuplicateInTab).length})`);
console.log(`Sheet controls: ${sheetControls.length} (no handler: ${sheetControls.filter(c => !c.hasHandler).length}, duplicates: ${sheetControls.filter(c => c.isDuplicateInTab).length})`);
console.log(`Slides controls: ${slidesControls.length} (no handler: ${slidesControls.filter(c => !c.hasHandler).length}, duplicates: ${slidesControls.filter(c => c.isDuplicateInTab).length})`);

fs.writeFileSync(path.join(rootDir, "docs/_ribbon_inventory.json"), JSON.stringify(all, null, 2), "utf8");
console.log(`Saved inventory to docs/_ribbon_inventory.json`);
