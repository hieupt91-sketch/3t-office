import { launchApp } from "./session.mjs";
import { click, press } from "./actions.mjs";

const session = await launchApp("sheet", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

try {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await click(cdp, "#vno-ribbon-tab-data");
  const command = '[data-command-id="sheet.data.sortAsc"]';
  const seedAndSelect = `(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.cellsData.clear();
    [["A1","Giá trị"],["B1","Mã"],["A2",10],["B2","mười"],["A3",""],["B3","trống"],["A4",2],["B4","hai"],["A5",1],["B5","một"]].forEach(([coord,val])=>grid.cellsData.set(coord,{val,formula:"",style:{}}));
    grid.selectionRange={start:{c:"A",r:1},end:{c:"B",r:5}};
    grid.selectedCoord={c:"A",r:1};
    grid._renderVirtualRows(1,40);
    return true;
  })()`;
  await cdp.evaluate(seedAndSelect);
  await click(cdp, command);
  const afterMouse = await cdp.evaluate(`(() => [2,3,4,5].map(row => window.__vnoAppInstance.grid.cellsData.get('A'+row)?.val ?? ''))()`);
  assert(afterMouse.join("|") === "1|2|10|", `Chuột A-Z: ô trống chưa xuống cuối (${afterMouse})`);

  await cdp.evaluate(seedAndSelect);
  await cdp.evaluate(`(() => { const el=[...document.querySelectorAll(${JSON.stringify(command)})].find(node=>node.getBoundingClientRect().width>0); el?.focus(); return document.activeElement===el; })()`);
  await press(cdp, " ");
  const afterKeyboard = await cdp.evaluate(`(() => [2,3,4,5].map(row => window.__vnoAppInstance.grid.cellsData.get('A'+row)?.val ?? ''))()`);
  assert(afterKeyboard.join("|") === "1|2|10|", `Bàn phím Space trên nút A-Z: ô trống chưa xuống cuối (${afterKeyboard})`);
  console.log("PASS | Sort A-Z bằng chuột và bàn phím | ô trống cuối, dữ liệu hàng đi cùng nhau");
} finally {
  await session.close();
}
