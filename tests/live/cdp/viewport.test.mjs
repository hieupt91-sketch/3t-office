import assert from "node:assert/strict";
import test from "node:test";
import { resizeViewport } from "./viewport.mjs";

function fakeCdp({ windowResizes, failBrowser = false, start = { width: 1920, height: 942 } }) {
  const state = { ...start, emulated: null, calls: [] };
  return {
    state,
    async send(method, params) {
      state.calls.push(method);
      if (method.startsWith("Browser.") && failBrowser) throw new Error("'Browser.getWindowForTarget' wasn't found");
      if (method === "Browser.getWindowForTarget") return { result: { windowId: 1 } };
      if (method === "Browser.setWindowBounds" && windowResizes) {
        state.width = params.bounds.width - 16;
        state.height = params.bounds.height - 90;
      }
      if (method === "Emulation.setDeviceMetricsOverride") state.emulated = { width: params.width, height: params.height };
      if (method === "Emulation.clearDeviceMetricsOverride") state.emulated = null;
      return { result: {} };
    },
    async evaluate() {
      const view = state.emulated || state;
      return view.width + "x" + view.height;
    },
  };
}

test("WebView2-style window resize keeps the real window path", async () => {
  const cdp = fakeCdp({ windowResizes: true });
  const out = await resizeViewport(cdp, 1366, 768, { settleMilliseconds: 0 });
  assert.equal(out.mode, "window");
  assert.equal(out.viewport, "1350x678");
  assert.ok(!cdp.state.calls.includes("Emulation.setDeviceMetricsOverride"));
});

test("QtWebEngine no-op setWindowBounds falls back to emulated viewport", async () => {
  const cdp = fakeCdp({ windowResizes: false });
  const out = await resizeViewport(cdp, 1280, 720, { settleMilliseconds: 0 });
  assert.equal(out.mode, "emulated");
  assert.equal(out.viewport, "1280x720");
});

test("missing Browser domain is reported and still falls back", async () => {
  const cdp = fakeCdp({ windowResizes: false, failBrowser: true });
  const out = await resizeViewport(cdp, 1024, 700, { settleMilliseconds: 0 });
  assert.equal(out.mode, "emulated");
  assert.match(out.windowError, /Browser\.getWindowForTarget/);
});

test("0x0 clears the emulated viewport", async () => {
  const cdp = fakeCdp({ windowResizes: false });
  await resizeViewport(cdp, 1024, 700, { settleMilliseconds: 0 });
  const out = await resizeViewport(cdp, 0, 0, { settleMilliseconds: 0 });
  assert.equal(out.mode, "reset");
  assert.equal(out.viewport, "1920x942");
});
