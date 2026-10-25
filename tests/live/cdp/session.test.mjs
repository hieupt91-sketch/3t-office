import assert from "node:assert/strict";
import test from "node:test";
import { buildCdpEnvironment, defaultPythonCommand, isForeignWindowsPath } from "./session.mjs";

test("macOS CDP environment enables QtWebEngine without removing caller flags", () => {
  const env = buildCdpEnvironment({
    platform: "darwin",
    debugPort: 47123,
    localAppData: "/tmp/vno/local",
    isolatedHome: "/tmp/vno/home",
    baseEnvironment: { QTWEBENGINE_CHROMIUM_FLAGS: "--disable-gpu" },
  });
  assert.equal(env.QTWEBENGINE_REMOTE_DEBUGGING, "47123");
  assert.equal(env.QTWEBENGINE_CHROMIUM_FLAGS, "--disable-gpu");
  assert.equal(env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS, undefined);
  assert.equal(env.VNO_CDP_DEBUG_PORT, "47123");
  assert.equal(env.VNO_CDP_PLATFORM, "darwin");
  assert.equal(env.VNO_CDP_WEBVIEW_GUI, "qt");
  assert.equal(env.HOME, "/tmp/vno/home");
  assert.equal(env.XDG_DATA_HOME, "/tmp/vno/local");
});

test("Windows CDP environment keeps the WebView2 path and caller home", () => {
  const env = buildCdpEnvironment({
    platform: "win32",
    debugPort: 47124,
    localAppData: "C:\\temp\\vno",
    isolatedHome: "C:\\temp\\home",
    baseEnvironment: { HOME: "C:\\Users\\tester" },
  });
  assert.equal(env.WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS, "--remote-debugging-port=47124");
  assert.equal(env.QTWEBENGINE_REMOTE_DEBUGGING, undefined);
  assert.equal(env.VNO_CDP_WEBVIEW_GUI, undefined);
  assert.equal(env.HOME, "C:\\Users\\tester");
  assert.equal(env.XDG_DATA_HOME, undefined);
});

test("default Python launcher follows the host convention", () => {
  assert.equal(defaultPythonCommand("win32"), "python");
  assert.equal(defaultPythonCommand("darwin"), "python3");
  assert.equal(defaultPythonCommand("linux"), "python3");
});

test("Windows-only persisted test paths are rejected on POSIX hosts", () => {
  assert.equal(isForeignWindowsPath("E:\\VNOffice-profiles\\writer", "darwin"), true);
  assert.equal(isForeignWindowsPath("/tmp/vno-writer", "darwin"), false);
  assert.equal(isForeignWindowsPath("E:\\VNOffice-profiles\\writer", "win32"), false);
});
