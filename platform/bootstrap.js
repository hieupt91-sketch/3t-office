/**
 * 3T Office Platform — Unified Suite Bootstrap
 * Khởi tạo Command Bus và UNO Bridge tập trung một lần duy nhất cho toàn bộ Suite.
 * Tuân thủ 01-architecture/SHARED-PLATFORM.md & 00-governance/NON-NEGOTIABLE-RULES.md
 */

import { globalCommandBus } from "./commands/command-bus.js";
import { registerAllStandardCommands } from "./commands/command-definitions.js";
import { themeManager } from "./theme/theme-manager.js";

let _isBootstrapped = false;
let _bootstrapPromise = null;
let _documentServicesPromise = null;
let _launchContext = Object.freeze({ appKind: null, singleAppMode: false, openInitialFile: false });

export function resolveLaunchContext(search = "") {
  const params = new URLSearchParams(search);
  const requestedApp = params.get("app");
  const appKind = ["writer", "sheet", "slides"].includes(requestedApp) ? requestedApp : null;
  return Object.freeze({
    appKind,
    singleAppMode: Boolean(appKind && params.get("singleApp") === "1"),
    openInitialFile: Boolean(appKind && params.get("openFile") === "1"),
    documentName: params.get("documentName") || ""
  });
}

export function configurePlatformLaunchContext(context = {}) {
  _launchContext = Object.freeze({
    appKind: ["writer", "sheet", "slides"].includes(context.appKind) ? context.appKind : null,
    singleAppMode: context.singleAppMode === true,
    openInitialFile: context.openInitialFile === true,
    documentName: typeof context.documentName === "string" ? context.documentName : ""
  });
  return _launchContext;
}

export function getPlatformLaunchContext() {
  return _launchContext;
}

/**
 * Bootstrap toàn bộ hệ thống 3T Office.
 * Đảm bảo chỉ khởi tạo một lần duy nhất khi suite khởi động.
 */
export async function bootstrapPlatform() {
  if (_isBootstrapped) return;
  if (_bootstrapPromise) return _bootstrapPromise;

  _bootstrapPromise = (async () => {
    registerAllStandardCommands(globalCommandBus);
    globalCommandBus.bindHandler("common.view.toggleTheme", () => themeManager.toggleTheme());
    themeManager.init();
    _isBootstrapped = true;
    console.log("[3T Office Platform] Hoàn tất bootstrap suite thành công.");
  })();

  return _bootstrapPromise;
}

/** Connect to the local Python/LibreOffice bridge on demand, outside first paint. */
export function connectDocumentServices() {
  if (_documentServicesPromise) return _documentServicesPromise;
  _documentServicesPromise = import("../adapters/libreoffice/common/uno-bridge.js")
    .then(async ({ globalUnoBridge }) => {
      await globalUnoBridge.init();
      globalThis.window?.pywebview?.api?.report_startup_metric?.("uno_bridge_ready", performance.now());
    })
    .catch((error) => {
      _documentServicesPromise = null;
      throw error;
    });
  return _documentServicesPromise;
}

/**
 * Kiểm tra trạng thái bootstrap
 */
export function isPlatformBootstrapped() {
  return _isBootstrapped;
}
