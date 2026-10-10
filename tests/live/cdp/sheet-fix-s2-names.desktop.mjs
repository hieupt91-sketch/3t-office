import { launchApp } from "./session.mjs";
import { press } from "./actions.mjs";

const session = await launchApp("sheet", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
try {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await cdp.evaluate(`(() => {
    const grid=window.__vnoAppInstance.grid;
    grid.selectionRange={start:{c:"A",r:1},end:{c:"A",r:1}};
    grid.selectedCoord={c:"A",r:1};
    document.querySelector(".vno-sheet-container")?.focus();
  })()`);
  await press(cdp, "F3", { ctrl: true, shift: true });
  const notice = await cdp.evaluate(`document.querySelector(".vno-data-result")?.innerText || ""`);
  if (!notice.includes("ít nhất hai hàng") || !notice.includes("tiêu đề")) {
    throw new Error(`Ctrl+Shift+F3 không hiện thông báo cần vùng có tiêu đề và dữ liệu: ${notice}`);
  }
  console.log(`PASS | Ctrl+Shift+F3 báo vùng không đủ | ${notice}`);
} finally {
  await session.close();
}
