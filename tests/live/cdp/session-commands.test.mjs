import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createCommandHandler } from "./session-commands.mjs";

function fakeCdp() {
  const mouse = [];
  return {
    mouse,
    async send(method, params) {
      if (method === "Input.dispatchMouseEvent") mouse.push(params);
      if (method === "Page.captureScreenshot") return { result: { data: Buffer.from("png").toString("base64") } };
      return { result: {} };
    },
    async evaluate(expr) {
      if (String(expr).includes("querySelector")) return { x: 40, y: 50 };
      return "ok";
    },
  };
}

test("click forwards modifiers to CDP mouse events (Cmd/Shift-click)", async () => {
  const cdp = fakeCdp();
  const handle = createCommandHandler({ cdp, shotDir: os.tmpdir() });
  await handle("click", { x: 10, y: 20, mods: { meta: true, shift: true } });
  assert.equal(cdp.mouse.length, 2);
  assert.deepEqual(cdp.mouse.map((e) => e.modifiers), [12, 12]);
  assert.deepEqual(cdp.mouse.map((e) => e.type), ["mousePressed", "mouseReleased"]);
});

test("click by selector also forwards modifiers", async () => {
  const cdp = fakeCdp();
  const handle = createCommandHandler({ cdp, shotDir: os.tmpdir() });
  const pos = await handle("click", { selector: ".x", mods: { alt: true } });
  assert.deepEqual(pos, { x: 40, y: 50 });
  assert.ok(cdp.mouse.every((e) => e.modifiers === 1 && e.x === 40 && e.y === 50));
});

test("drag presses at start, moves in steps with button held, releases at end", async () => {
  const cdp = fakeCdp();
  const handle = createCommandHandler({ cdp, shotDir: os.tmpdir() });
  await handle("drag", { x1: 0, y1: 0, x2: 100, y2: 50, steps: 4, mods: { alt: true } });
  const types = cdp.mouse.map((e) => e.type);
  assert.deepEqual(types, ["mouseMoved", "mousePressed", "mouseMoved", "mouseMoved", "mouseMoved", "mouseMoved", "mouseReleased"]);
  const held = cdp.mouse.slice(2, 6);
  assert.ok(held.every((e) => e.buttons === 1));
  assert.deepEqual(held.at(-1), { type: "mouseMoved", x: 100, y: 50, button: "left", buttons: 1, modifiers: 1 });
  assert.equal(cdp.mouse.at(-1).x, 100);
  assert.ok(cdp.mouse.every((e) => e.modifiers === 1));
});

test("shot writes PNG into shotDir and unknown command is reported", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "vno-shot-"));
  try {
    const handle = createCommandHandler({ cdp: fakeCdp(), shotDir: dir });
    const out = await handle("shot", { name: "a" });
    assert.equal(readFileSync(out.file, "utf8"), "png");
    assert.deepEqual(await handle("nope"), { error: "lenh la: nope" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
