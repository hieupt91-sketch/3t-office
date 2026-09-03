/**
 * VN Office Platform — Unified Suite Bootstrap
 * Khởi tạo Command Bus và UNO Bridge tập trung một lần duy nhất cho toàn bộ Suite.
 * Tuân thủ 01-architecture/SHARED-PLATFORM.md & 00-governance/NON-NEGOTIABLE-RULES.md
 */

import { globalCommandBus } from "./commands/command-bus.js";
import { registerAllStandardCommands } from "./commands/command-definitions.js";
import { globalUnoBridge } from "../adapters/libreoffice/common/uno-bridge.js";

let _isBootstrapped = false;
let _bootstrapPromise = null;

/**
 * Bootstrap toàn bộ hệ thống VN Office.
 * Đảm bảo chỉ khởi tạo một lần duy nhất khi suite khởi động.
 */
export async function bootstrapPlatform() {
  if (_isBootstrapped) return;
  if (_bootstrapPromise) return _bootstrapPromise;

  _bootstrapPromise = (async () => {
    registerAllStandardCommands(globalCommandBus);
    await globalUnoBridge.init();
    _isBootstrapped = true;
    console.log("[VN Office Platform] Hoàn tất bootstrap suite thành công.");
  })();

  return _bootstrapPromise;
}

/**
 * Kiểm tra trạng thái bootstrap
 */
export function isPlatformBootstrapped() {
  return _isBootstrapped;
}
