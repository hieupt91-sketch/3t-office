import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CdpClient, connectToPort, findFreePort, readTargets, sleep } from "./client.mjs";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readySelector(app) {
  if (app === "writer") return ".vno-writer-body";
  if (app === "sheet") return ".vno-sheet-container";
  if (app === "slides") return ".vno-slide-canvas";
  throw new Error("Unknown app kind: " + app);
}

export function defaultPythonCommand(platform = process.platform) {
  return platform === "win32" ? "python" : "python3";
}

export function isForeignWindowsPath(value, platform = process.platform) {
  return platform !== "win32" && /^[A-Za-z]:[\\/]/.test(String(value || ""));
}

export function buildCdpEnvironment({
  platform = process.platform,
  debugPort,
  localAppData,
  isolatedHome = "",
  baseEnvironment = process.env,
} = {}) {
  if (!Number.isInteger(debugPort) || debugPort <= 0) throw new Error("A positive CDP debug port is required.");
  const existingChromiumFlags = String(baseEnvironment.QTWEBENGINE_CHROMIUM_FLAGS || "").trim();
  return {
    ...baseEnvironment,
    LOCALAPPDATA: localAppData,
    // macOS: Qt/QtWebEngine resolve ~/Library/Caches through CoreFoundation, which ignores $HOME, so the HTTP
    // disk cache (~/Library/Caches/main.py/QtWebEngine) was shared by every worktree and served stale JS/CSS
    // from 127.0.0.1:8080. CFFIXED_USER_HOME moves that cache into the per-run home, deleted on close.
    // Chromium's --disk-cache-dir/--disk-cache-size are ignored by QtWebEngine 6 (measured). Test-only.
    ...(platform === "darwin" && isolatedHome ? { HOME: isolatedHome, CFFIXED_USER_HOME: isolatedHome } : {}),
    ...(platform !== "win32" ? { XDG_DATA_HOME: localAppData } : {}),
    ...(platform === "win32" ? { WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: "--remote-debugging-port=" + debugPort } : {}),
    ...(platform === "darwin" ? {
      QTWEBENGINE_REMOTE_DEBUGGING: String(debugPort),
      QTWEBENGINE_CHROMIUM_FLAGS: existingChromiumFlags,
      VNO_CDP_WEBVIEW_GUI: "qt",
    } : {}),
    VNO_CDP_DEBUG_PORT: String(debugPort),
    VNO_CDP_PLATFORM: platform,
  };
}

export async function launchApp(app, options = {}) {
  const root = options.root || process.env.VNO_APP_ROOT || repoRoot;
  const debugPort = await findFreePort();
  const requestedLocalAppData = options.localAppData || process.env.VNO_CDP_LOCALAPPDATA || "";
  const compatibleLocalAppData = isForeignWindowsPath(requestedLocalAppData) ? "" : requestedLocalAppData;
  const needsIsolatedHome = process.platform === "darwin";
  const createProfileRoot = !options.profileRoot && (!compatibleLocalAppData || needsIsolatedHome);
  const profileRoot = options.profileRoot
    || (createProfileRoot ? await mkdtemp(path.join(os.tmpdir(), "vno-cdp-" + app + "-")) : null);
  const localAppData = compatibleLocalAppData || path.join(profileRoot, "localappdata");
  await mkdir(localAppData, { recursive: true });
  const isolatedHome = profileRoot ? path.join(profileRoot, "home") : "";
  if (isolatedHome) await mkdir(isolatedHome, { recursive: true });
  const python = options.python || process.env.VNO_PYTHON || defaultPythonCommand();
  const args = ["-s", path.join(root, "main.py"), "--app=" + app];
  if (options.filePath) args.push(path.resolve(options.filePath));
  const env = buildCdpEnvironment({ debugPort, localAppData, isolatedHome });
  const child = spawn(python, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let spawnError = null;
  child.once("error", error => { spawnError = error; });
  let output = "";
  const append = chunk => {
    output = (output + chunk.toString()).slice(-30000);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  const session = {
    app, root, debugPort, profileRoot, cleanupProfileRoot: createProfileRoot, localAppData, child, exited,
    get output() { return output; },
    get spawnError() { return spawnError; },
    cdp: null,
    async close() { await closeApp(session); },
  };

  try {
    const readyAt = Date.now();
    let endpointReady = false;
    while (Date.now() - readyAt < (options.startTimeoutMilliseconds || 90000)) {
      if (spawnError) {
        throw new Error("Could not start " + python + ": " + spawnError.message);
      }
      if (child.exitCode !== null) {
        throw new Error("main.py exited with code " + child.exitCode + "\n" + output);
      }
      try {
        const response = await fetch("http://127.0.0.1:" + debugPort + "/json/version");
        if (response.ok) { endpointReady = true; break; }
      } catch {}
      await sleep(250);
    }
    if (!endpointReady) throw new Error("Chromium remote debugging endpoint did not start.\n" + output);
    session.cdp = await connectToPort(debugPort, { timeoutMilliseconds: 30000 });
    await session.cdp.waitFor("!!document.querySelector(" + JSON.stringify(readySelector(app)) + ")", {
      timeoutMilliseconds: options.readyTimeoutMilliseconds || 45000,
    });
    const consent = await session.cdp.evaluate("!!document.querySelector('.vno-error-reporting-overlay')");
    if (consent) {
      const deny = await session.cdp.evaluate("!!document.querySelector('.vno-error-reporting-overlay [data-dialog-action=\"deny\"]')");
      if (deny) {
        const { click } = await import("./actions.mjs");
        await click(session.cdp, ".vno-error-reporting-overlay [data-dialog-action=\"deny\"]");
        await session.cdp.waitFor("!document.querySelector('.vno-error-reporting-overlay')", { timeoutMilliseconds: 8000 });
      }
    }
    return session;
  } catch (error) {
    await closeApp(session);
    throw error;
  }
}

async function closeApp(session) {
  if (!session) return;
  const { child, debugPort, cdp, profileRoot, cleanupProfileRoot } = session;
  try {
    const targets = (await readTargets(debugPort).catch(() => [])).filter(target => target.type === "page");
    for (const target of targets) {
      let client = null;
      try {
        client = target.id === cdp?.target?.id ? cdp : await new CdpClient(target).open();
      } catch {}
      if (client && typeof client.evaluate === "function") {
        await client.evaluate("window.pywebview?.api?.close_current_window?.()").catch(() => {});
        if (client !== cdp) await client.close().catch(() => {});
        continue;
      }
      try {
        const { CdpClient } = await import("./client.mjs");
        const temporary = await new CdpClient(target).open();
        await temporary.evaluate("window.pywebview?.api?.close_current_window?.()").catch(() => {});
        await temporary.close();
      } catch {}
    }
  } catch {}
  if (cdp) await cdp.close().catch(() => {});

  if (child && child.pid != null && child.exitCode === null && child.signalCode === null) {
    await Promise.race([session.exited, sleep(10000)]);
    if (child.exitCode === null && child.signalCode === null) {
      console.error("CDP close requested; stopping only the desktop PID launched by this session after 10 seconds.");
      child.kill("SIGTERM");
      await Promise.race([session.exited, sleep(3000)]);
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      await Promise.race([session.exited, sleep(3000)]);
    }
  }
  const stopped = !child || child.pid == null || child.exitCode !== null || child.signalCode !== null;
  if (cleanupProfileRoot && profileRoot && stopped) {
    await rm(profileRoot, { recursive: true, force: true }).catch(() => {});
  }
}
