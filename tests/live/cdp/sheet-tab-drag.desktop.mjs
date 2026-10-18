// Sheet: kéo thẻ trang tính đổi thứ tự bằng chuột thật (CDP) -> Hoàn tác -> lưu XLSX -> mở lại giữ thứ tự.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseDrag } from "./actions.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "tab-drag.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const check = (ok, msg, detail = "") => { if (!ok) throw new Error(`${msg}${detail ? " | " + detail : ""}`); console.log(`PASS | ${msg}${detail ? " | " + detail : ""}`); };
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const rects = async (cdp) => JSON.parse(await cdp.evaluate(`JSON.stringify([...document.querySelectorAll('.vno-sheet-tab-item')].map(t => { const r = t.getBoundingClientRect(); return { n: t.dataset.sheet, x: r.left, w: r.width, y: r.top + r.height / 2 }; }))`));
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  await cdp.evaluate(`(() => { const g = window.__vnoAppInstance.grid; for (const n of ["Hai", "Ba"]) if (!g.sheets.includes(n)) g.addSheet(n); g.switchSheet(g.sheets[0]); })()`);
  let r = await rects(cdp);
  const before = r.map(t => t.n);
  check(before.length >= 3, "Có ít nhất 3 thẻ", before.join(","));
  // Kéo thẻ đầu tới nửa phải thẻ cuối => xuống cuối.
  const first = r[0], last = r[r.length - 1];
  await mouseDrag(cdp, first.x + first.w / 2, first.y, last.x + last.w - 3, last.y, { steps: 12 });
  r = await rects(cdp);
  const after = r.map(t => t.n);
  check(after[after.length - 1] === before[0] && after[0] === before[1], "Kéo thẻ đầu xuống cuối đổi đúng thứ tự", after.join(","));
  const active = await cdp.evaluate("window.__vnoAppInstance.grid.activeSheet");
  check(active === before[0] || active === after[0], "Kéo không làm hỏng trang đang mở", active);
  // Kéo ngắn (dưới 6px) vẫn là nhấp bình thường.
  const second = r[1];
  await mouseDrag(cdp, second.x + second.w / 2, second.y, second.x + second.w / 2 + 2, second.y, { steps: 2 });
  check((await cdp.evaluate("window.__vnoAppInstance.grid.activeSheet")) === after[1], "Nhấp thường vẫn chuyển trang", after[1]);
  // Hoàn tác trả lại thứ tự cũ.
  await cdp.evaluate("window.__vnoAppInstance.grid.undo()");
  const undone = (await rects(cdp)).map(t => t.n);
  check(undone.join(",") === before.join(","), "Hoàn tác trả thứ tự cũ", undone.join(","));
  // Kéo lại rồi lưu.
  r = await rects(cdp);
  await mouseDrag(cdp, r[0].x + r[0].w / 2, r[0].y, r[r.length - 1].x + r[r.length - 1].w - 3, r[0].y, { steps: 12 });
  const final = (await rects(cdp)).map(t => t.n);
  await cdp.evaluate("window.__vnoAppInstance.adapter.isDirty = true");
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
  check(saved !== false && saved?.status !== "error", "Lưu XLSX", final.join(","));
  globalThis.__final = final;
  await new Promise((x) => setTimeout(x, 800));
} finally { await session.close(); }
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.sheets?.length > 2 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const names = JSON.parse(await cdp.evaluate("JSON.stringify(window.__vnoAppInstance.grid.sheets)"));
  check(names.join(",") === globalThis.__final.join(","), "Mở lại giữ thứ tự thẻ đã kéo", names.join(","));
} finally { await session.close(); }
