// Sheet: Mở rộng thanh công thức (Ctrl+Shift+U, nút ▾, nút ruy-băng) - chiều cao thật, thu gọn, không đổi nội dung ô.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";
import { click, press } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-efb-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("sheet", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 3000));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  const h = () => ev(`Math.round(document.querySelector('#vno-formula-val').getBoundingClientRect().height)`);
  await ev(`(() => { const g = window.__vnoAppInstance.grid; g.setCellValue("A", 1, "ngan"); g.selectCell("A", 1); g.focusGrid?.(); })()`);
  const base = await h();
  check("Mặc định: thanh công thức một dòng", base <= 30, String(base));
  // 1. Nút mũi tên
  await click(cdp, "#vno-fx-expand");
  const open = await h();
  check("Bấm ▾: thanh cao hơn (≥ 5 dòng)", open >= 90, `${base} -> ${open}`);
  check("Nút đổi sang ▴ và aria-expanded=true", await ev(`(() => { const b = document.querySelector('#vno-fx-expand'); return b.textContent === '▴' && b.getAttribute('aria-expanded') === 'true'; })()`));
  await click(cdp, "#vno-fx-expand");
  const closed = await h();
  check("Bấm ▴: thu gọn về một dòng", closed <= 30, String(closed));
  // 2. Phím tắt khi tiêu điểm ở lưới
  await ev(`document.querySelector('.vno-grid-viewport, .vno-grid-table')?.focus?.()`);
  await press(cdp, "u", { ctrl: true, shift: true });
  const viaKey = await h();
  check("Ctrl+Shift+U (tiêu điểm ở lưới) mở rộng", viaKey >= 90, String(viaKey));
  // 3. Phím tắt khi tiêu điểm ở ô công thức
  await ev(`document.querySelector('#vno-formula-val').focus()`);
  await press(cdp, "u", { ctrl: true, shift: true });
  const viaInput = await h();
  check("Ctrl+Shift+U (tiêu điểm ở thanh công thức) thu gọn", viaInput <= 30, String(viaInput));
  // 4. Lệnh ruy-băng, nội dung ô không đổi
  await ev(`window.globalCommandBus.execute("sheet.view.expandFormulaBar")`);
  check("Lệnh ruy-băng mở rộng", (await h()) >= 90);
  const val = await ev(`window.__vnoAppInstance.grid.cellsData.get("A1")?.val`);
  check("Nội dung ô không đổi", val === "ngan", String(val));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
