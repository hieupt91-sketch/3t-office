// Sheet: Khóa ô (Locked) + Bảo vệ trang tính theo từng ô: ô mở khóa sửa được, ô khóa thì không; lưu XLSX giữ locked=0 và sheetProtection.
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
const out = path.join(profile, "lock-cells.xlsx");
const session = await launchApp("sheet", { localAppData: profile });
const { cdp } = session;
const results = [];
const check = (pass, name, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
try {
  await new Promise(r => setTimeout(r, 2000));
  await ev(`(() => {
    const g = window.__vnoAppInstance.grid;
    g.setCellValue("A", 1, "khoa"); g.setCellValue("B", 1, "mo");
    g.applyCellFormat({ stylePatch: { locked: false } }, { start: { c: "B", r: 1 }, end: { c: "B", r: 1 } });
    g.protectSheet({});
    window.__alerts = 0;
    return true;
  })()`);
  const probe = JSON.parse(await ev(`JSON.stringify((() => {
    const g = window.__vnoAppInstance.grid;
    const res = {};
    g.selectCell("A", 1);
    res.guardLocked = g._guardProtectedMutation();
    g.selectCell("B", 1);
    res.guardUnlocked = g._guardProtectedMutation();
    // Xóa nội dung ô khóa / ô mở khóa
    g.selectCell("A", 1); try { g.clearContents?.(); } catch (e) { res.errA = String(e); }
    g.selectCell("B", 1); try { g.clearContents?.(); } catch (e) { res.errB = String(e); }
    res.a1 = g.cellsData.get("A1")?.val; res.b1 = g.cellsData.get("B1")?.val ?? "";
    g.setCellValue("A", 1, "khoa"); g.setCellValue("B", 1, "mo");
    g.selectCell("A", 1); g.selectCell("B", 1, true); try { g.clearContents?.(); } catch (e) { res.errR = String(e); }
    res.rangeA1 = g.cellsData.get("A1")?.val; res.rangeB1 = g.cellsData.get("B1")?.val ?? "";
    return res;
  })())`));
  console.log(JSON.stringify(probe));
  check(probe.guardLocked === true, "Ô khóa bị chặn khi trang tính được bảo vệ");
  check(probe.guardUnlocked === false, "Ô mở khóa vẫn sửa được");
  check(probe.a1 === "khoa", "Xóa nội dung không làm mất ô khóa", String(probe.a1));
  check(probe.b1 === "", "Xóa nội dung xóa được ô mở khóa", String(probe.b1));
  check(probe.rangeA1 === "khoa" && probe.rangeB1 === "mo", "Xóa vùng có ô khóa bị chặn toàn bộ (như Excel)", `${probe.rangeA1}|${probe.rangeB1}`);
  await ev(`(() => { const g = window.__vnoAppInstance.grid; g.setCellValue("A", 1, "khoa"); g.setCellValue("B", 1, "mo"); window.__vnoAppInstance.adapter.isDirty = true; return true; })()`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(out)}, null)`);
  check(saved?.status === "ok", "Lưu XLSX", JSON.stringify(saved).slice(0, 80));
  console.log("OUT " + out);
} catch (error) {
  check(false, "Không phát sinh ngoại lệ", error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
