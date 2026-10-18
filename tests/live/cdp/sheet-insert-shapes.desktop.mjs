// Sheet: Chèn > Hình dạng (thư viện dùng chung) -> lưu XLSX (xdr:sp prstGeom) -> mở lại giữ loại, màu, vị trí, văn bản.
// XML đọc lại bằng scripts/audit-0610/sheet_shapes_xml.py
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "insert-shapes.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  // 1. Mở hộp Hình dạng thật và chọn sao 5 cánh
  await ev(`window.__vnoAppInstance.grid.selectCell("N", 3)`);
  ev(`window.globalCommandBus.execute("sheet.insert.shapes")`).catch(() => {});
  await cdp.waitFor("document.querySelector('.vno-shape-gallery-item')", { timeoutMilliseconds: 15000 });
  const count = await ev(`document.querySelectorAll('.vno-shape-gallery-item').length`);
  check("Hộp Hình dạng có đủ hình (2 cơ bản + 16 dựng sẵn)", count === 18, String(count));
  await ev(`document.querySelector('.vno-shape-gallery-item[data-shape-type="star5"]').click()`);
  await ev(`document.querySelector('.vno-dialog-insert-btn').click()`);
  await new Promise(r => setTimeout(r, 400));
  // 2. Thêm thêm hai hình bằng tham số: mũi tên và elip có chữ
  await ev(`window.__vnoAppInstance.grid.selectCell("N", 10)`);
  await ev(`window.globalCommandBus.execute("sheet.insert.shapes", { shapeType: "rightArrow" })`);
  await ev(`window.__vnoAppInstance.grid.selectCell("R", 3)`);
  await ev(`window.globalCommandBus.execute("sheet.insert.shapes", { shapeType: "ellipse" })`);
  const model = JSON.parse(await ev(`JSON.stringify(window.__vnoAppInstance.grid.shapesBySheet[window.__vnoAppInstance.grid.activeSheet].map(s => [s.shapeType, s.anchor.c + s.anchor.r]))`));
  check("Có 3 hình: sao, mũi tên, elip", JSON.stringify(model) === JSON.stringify([["star5", "N3"], ["rightArrow", "N10"], ["ellipse", "R3"]]), JSON.stringify(model));
  check("Hình sao vẽ bằng SVG (không còn khung CSS)", await ev(`!!document.querySelector('.vno-sheet-shape[data-shape-type="star5"] svg.vno-shape-geometry')`));
  await ev(`window.__vnoAppInstance.grid.undo()`);
  await ev(`window.__vnoAppInstance.grid.redo()`);
  check("Hoàn tác rồi làm lại giữ nguyên 3 hình", (await ev(`window.__vnoAppInstance.grid.shapesBySheet[window.__vnoAppInstance.grid.activeSheet].length`)) === 3);
  await ev(`(() => { const g = window.__vnoAppInstance.grid; const list = g.shapesBySheet[g.activeSheet]; list[2].text = "Xin chao"; list[2].fillColor = "#ef4444"; list[2].strokeColor = "#7f1d1d"; g.renderShapes(); })()`);
  await ev(`window.__vnoAppInstance.adapter.isDirty = true`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(file)}, null)`);
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 60));
  await new Promise(r => setTimeout(r, 800));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
console.log("OUT " + file);
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  const list = JSON.parse(await ev(`JSON.stringify(window.__vnoAppInstance.grid.shapesBySheet[window.__vnoAppInstance.grid.activeSheet].map(s => ({ t: s.shapeType, a: s.anchor.c + s.anchor.r, fill: s.fillColor, stroke: s.strokeColor, text: s.text, w: s.widthPx, h: s.heightPx })))`));
  check("Mở lại: 3 hình đúng loại và vị trí", list.length === 3 && list.map(s => s.t + "@" + s.a).join(",") === "star5@N3,rightArrow@N10,ellipse@R3", JSON.stringify(list.map(s => s.t + "@" + s.a)));
  const ell = list.find(s => s.t === "ellipse");
  check("Mở lại: elip giữ màu nền, viền và chữ", ell && ell.fill.toLowerCase() === "#ef4444" && ell.stroke.toLowerCase() === "#7f1d1d" && ell.text === "Xin chao", JSON.stringify(ell));
  check("Mở lại: kích thước 120×80", list.every(s => s.w === 120 && s.h === 80), JSON.stringify(list.map(s => [s.w, s.h])));
} catch (error) {
  check("Mở lại không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
