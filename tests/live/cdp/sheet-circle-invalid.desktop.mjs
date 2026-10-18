// Sheet: Kiểm tra dữ liệu > Khoanh vòng dữ liệu sai - chỉ ô vi phạm quy tắc được khoanh, thấy được trên màn hình, tắt/bật bằng nút trong hộp thoại.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-circ-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("sheet", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 3000));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await ev(`(() => {
    const g = window.__vnoAppInstance.grid;
    [5, 50, 8, 200, 3].forEach((v, i) => g.setCellValue("A", i + 1, v));
    g.addDataValidation({ start: { c: "A", r: 1 }, end: { c: "A", r: 5 } }, { type: "numberRange", min: 1, max: 10 });
    g.selectCell("A", 1);
    g._renderVirtualRows(g.currentStartRow || 1, g.currentEndRow || 40);
  })()`);
  const circled = () => ev(`JSON.stringify([...document.querySelectorAll('.vno-grid-cell.is-validation-invalid')].map(td => td.dataset.coord).sort())`).then(JSON.parse);
  check("Chưa khoanh: không ô nào bị khoanh", (await circled()).length === 0);
  ev(`window.globalCommandBus.execute("sheet.data.validation")`).catch(() => {});
  await cdp.waitFor("document.querySelector('#vno-dv-circle-invalid')", { timeoutMilliseconds: 15000 });
  await ev(`document.querySelector("#vno-dv-circle-invalid").click()`);
  await new Promise(r => setTimeout(r, 300));
  const on = await circled();
  check("Khoanh vòng: đúng 2 ô sai A2 (50) và A4 (200)", JSON.stringify(on) === JSON.stringify(["A2", "A4"]), JSON.stringify(on));
  const look = JSON.parse(await ev(`JSON.stringify((() => { const cs = getComputedStyle(document.querySelector('.vno-grid-cell[data-coord="A2"]')); const ok = getComputedStyle(document.querySelector('.vno-grid-cell[data-coord="A3"]')); return { outline: cs.outlineStyle + '|' + cs.outlineColor + '|' + cs.outlineWidth, shadow: cs.boxShadow, border: cs.borderTopColor, bg: cs.backgroundImage.slice(0, 60), okOutline: ok.outlineStyle, okShadow: ok.boxShadow }; })())`));
  const visible = (look.outline && !/^none/.test(look.outline)) || (look.shadow && look.shadow !== "none") || (look.bg && look.bg !== "none");
  check("Ô sai có dấu hiệu nhìn thấy (viền/bóng/hình)", visible, JSON.stringify(look));
  check("Ô đúng không có dấu hiệu đó", (look.okOutline === "none" || !look.okOutline) && (look.okShadow === "none" || !look.okShadow), JSON.stringify({ o: look.okOutline, s: look.okShadow }));
  // Sửa ô sai thành giá trị hợp lệ -> hết khoanh
  await ev(`window.__vnoAppInstance.grid.setCellValue("A", 2, 7)`);
  await new Promise(r => setTimeout(r, 300));
  const after = await circled();
  check("Sửa A2 thành 7: chỉ còn A4 bị khoanh", JSON.stringify(after) === JSON.stringify(["A4"]), JSON.stringify(after));
  await ev(`window.__vnoAppInstance.grid.circleInvalidData(false)`);
  await new Promise(r => setTimeout(r, 200));
  check("Tắt khoanh vòng: không còn ô nào", (await circled()).length === 0);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
