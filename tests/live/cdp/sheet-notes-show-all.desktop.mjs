// Sheet: Xem xét > Hiện tất cả ghi chú / Ẩn tất cả: ghi chú được ghim lên lưới, lệnh bật tắt đúng, lưu XLSX giữ ghi chú.
// XML kiểm: scripts/audit-0610/sheet_comments_xml.py
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const out = path.join(profile, "notes.xlsx");
const session = await launchApp("sheet", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const run = (id, arg) => cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute(${JSON.stringify(id)}, ${JSON.stringify(arg ?? null)}))`, { awaitPromise: true });
const pinned = () => cdp.evaluate(`document.querySelectorAll('.vno-note-box, .vno-pinned-note, [data-vno-note]').length + '|' + (window.__vnoAppInstance.grid.getDisplayCommentIndicator())`);
try {
  await sleep(2000);
  await cdp.evaluate(`(() => { const g = window.__vnoAppInstance.grid; g.setCellValue('A', 1, 'x'); g.saveComment({ coord: 'A1', text: 'Ghi chu mot' }); g.saveComment({ coord: 'B3', text: 'Ghi chu hai' }); })()`);
  await sleep(300);
  check("Mặc định chỉ hiện dấu ghi chú (chỉ báo -1)", (await pinned()).endsWith("|-1"), await pinned());
  await run("sheet.review.commentShowAll");
  await sleep(400);
  const shown = await pinned();
  check("Hiện tất cả ghi chú: chỉ báo 1 và có ô ghi chú ghim", shown.endsWith("|1") && Number(shown.split("|")[0]) >= 2, shown);
  await run("sheet.review.commentShowAll");
  await sleep(300);
  check("Bấm lần nữa: ẩn tất cả ghi chú", (await pinned()).endsWith("|-1") && Number((await pinned()).split("|")[0]) === 0, await pinned());
  const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(out)}, null)`, { timeoutMilliseconds: 600000 });
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 100));
  console.log("OUT " + out);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
