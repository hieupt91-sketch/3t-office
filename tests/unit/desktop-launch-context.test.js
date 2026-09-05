import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AppShell } from "../../platform/shell/app-shell.js";
import {
  configurePlatformLaunchContext,
  resolveLaunchContext
} from "../../platform/bootstrap.js";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function runDesktopLaunchContextTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("Desktop URL: ?app=sheet resolves sheet + singleApp", () => {
    const context = resolveLaunchContext("?app=sheet&singleApp=1");
    if (context.appKind !== "sheet" || !context.singleAppMode) {
      throw new Error(JSON.stringify(context));
    }
  });

  test("Web URL: no parameters preserves Writer suite mode", () => {
    const context = resolveLaunchContext("");
    if (context.appKind !== null || context.singleAppMode) throw new Error(JSON.stringify(context));
  });

  test("AppShell single-app callback rejects every cross-app logic call", () => {
    configurePlatformLaunchContext({ appKind: "sheet", singleAppMode: true });
    let switchedTo = null;
    const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet" });
    shell.onSwitchApp = app => { switchedTo = app; return true; };
    const result = shell.onSwitchApp("writer");
    if (result !== false || switchedTo !== null) throw new Error(`switchedTo=${switchedTo}`);
  });

  test("AppShell web suite callback remains enabled", () => {
    configurePlatformLaunchContext({});
    let switchedTo = null;
    const shell = new AppShell({ appName: "writer", appTitle: "VN Writer" });
    shell.onSwitchApp = app => { switchedTo = app; return true; };
    const result = shell.onSwitchApp("sheet");
    if (result !== true || switchedTo !== "sheet") throw new Error(`switchedTo=${switchedTo}`);
  });

  test("index.html launches resolved app with explicit singleApp option", () => {
    const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
    if (!html.includes("await switchApp(initialApp, { singleApp: launchContext.singleAppMode })")) {
      throw new Error("Không tìm thấy lời gọi switchApp theo launch context");
    }
  });

  configurePlatformLaunchContext({});
  return results;
}
