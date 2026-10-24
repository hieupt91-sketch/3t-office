import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";

function findTab(tabs, id) {
  return tabs.find((tab) => tab.id === id);
}

function hasCommand(tab, commandId) {
  return (tab?.groups || []).some((group) =>
    (group.items || []).some((item) => item.commandId === commandId)
  );
}

test("all three apps expose appearance theme action in View ribbon", () => {
  assert.equal(hasCommand(findTab(WRITER_RIBBON_TABS, "view"), "common.view.toggleTheme"), true);
  assert.equal(hasCommand(findTab(SHEET_RIBBON_TABS, "view"), "common.view.toggleTheme"), true);
  assert.equal(hasCommand(findTab(SLIDES_RIBBON_TABS, "view"), "common.view.toggleTheme"), true);
});

test("top bar keeps theme action reachable when the Mac window narrows", () => {
  const css = fs.readFileSync(new URL("../../platform/shell/shell.css", import.meta.url), "utf8");
  assert.match(css, /\.vno-topbar-left\s*\{[\s\S]*?min-width:\s*0/);
  assert.match(css, /\.vno-topbar-right\s*\{[\s\S]*?min-width:\s*0/);
  assert.match(css, /\.vno-topbar-right \.vno-theme-label[\s\S]*?display:\s*none/);
});

// FIX-MAC-1 C-1: nhóm "appearance" phải có labelKey dịch được (EN không được hiện nhãn tiếng Việt).
test("appearance group has a translated labelKey in all three ribbons", async () => {
  const { viStrings } = await import("../../platform/i18n/strings-vi.js");
  const { enStrings } = await import("../../platform/i18n/strings-en.js");
  const lookup = (catalog, key) => key.split(".").reduce((node, part) => node?.[part], catalog);
  for (const [prefix, tabs] of [["writerRibbon", WRITER_RIBBON_TABS], ["sheetRibbon", SHEET_RIBBON_TABS], ["slidesRibbon", SLIDES_RIBBON_TABS]]) {
    const group = (findTab(tabs, "view")?.groups || []).find((g) => g.id === "appearance");
    assert.ok(group, `${prefix}: thiếu nhóm appearance`);
    assert.equal(group.labelKey, `${prefix}.group.appearance`);
    assert.equal(lookup(viStrings, group.labelKey), "Giao diện");
    assert.equal(lookup(enStrings, group.labelKey), "Appearance");
  }
});
