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
