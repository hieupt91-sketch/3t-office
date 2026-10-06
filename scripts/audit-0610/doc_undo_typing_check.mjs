// D15b: Ctrl+Z sau khi go mot cum chu phai bo theo tu/cum, khong tung ky tu (nhu Office).
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press, typeText } from "../../tests/live/cdp/actions.mjs";
let failed = 0; const rec = (n, ok, v) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", n, "|", JSON.stringify(v)); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const ev = (e) => session.cdp.evaluate(e);
try {
  await ev(`(()=>{const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p><br></p>'; b.focus(); const r=document.createRange(); r.setStart(b.firstChild,0); r.collapse(true); const s=getSelection(); s.removeAllRanges(); s.addRange(r);})()`);
  await typeText(session.cdp, "chuoi go lien nhau", 70);
  await new Promise(r => setTimeout(r, 900));
  const txt = () => ev(`document.querySelector('.vno-writer-body').innerText.trim()`);
  rec("Go xong 4 tu", (await txt()) === "chuoi go lien nhau", await txt());
  await press(session.cdp, "z", { ctrl: true }, 500); const z1 = await txt();
  rec("Ctrl+Z lan 1 bo it nhat tu cuoi (khong chi 1 ky tu)", z1.length <= "chuoi go lien nhau".length - 4 && z1.startsWith("chuoi go"), z1);
  await press(session.cdp, "z", { ctrl: true }, 500); const z2 = await txt();
  rec("Ctrl+Z lan 2 tiep tuc bo mot cum nua", z2.length < z1.length && z2.length <= z1.length - 3, z2);
  await press(session.cdp, "y", { ctrl: true }, 500); const y1 = await txt();
  rec("Ctrl+Y lam lai mot cum", y1.length > z2.length, y1);
} catch (e) { rec("Loi chay", false, String(e?.stack || e)); } finally { await session.close(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS"); process.exit(failed ? 1 : 0);