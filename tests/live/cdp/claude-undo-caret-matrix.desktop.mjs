import { launchApp } from "./session.mjs";
import { press, typeText, mouseClick } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? "PASS" : "FAIL") + " | " + n + " | " + String(d).slice(0, 200)); };
const paras = async () => JSON.parse(await ev("JSON.stringify([...document.querySelector('.vno-writer-body').querySelectorAll('p,h1,h2,li')].map(p=>p.textContent))"));
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("document.querySelector('.vno-writer-body').focus()");
  await typeText(session.cdp, "Dong mot", 8); await press(session.cdp, "Enter", {}, 60);
  await typeText(session.cdp, "Dong hai", 8); await press(session.cdp, "Enter", {}, 60);
  await typeText(session.cdp, "Dong ba", 8); await sleep(700);
  // 1. go giua dong 2 (chuot), go XX, Ctrl+Z, go Y
  const pos = JSON.parse(await ev(`(() => { const p=[...document.querySelectorAll('.vno-writer-body p')][1]; const r=document.createRange(); r.setStart(p.firstChild,4); r.collapse(true); const b=r.getBoundingClientRect(); return JSON.stringify({x:b.left,y:b.top+b.height/2}); })()`));
  await mouseClick(session.cdp, pos.x, pos.y); await sleep(200);
  await typeText(session.cdp, "XX", 8); await sleep(500);
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(300);
  await typeText(session.cdp, "Y", 8); await sleep(300);
  let p = await paras();
  check("go giua dong 2, Ctrl+Z, go tiep: chu vao dung cho cu", p[1] === "DongY hai", JSON.stringify(p));
  // 2. Backspace roi Ctrl+Z roi go
  await press(session.cdp, "Backspace", {}, 60); await sleep(300);
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(300);
  await typeText(session.cdp, "W", 8); await sleep(300);
  p = await paras();
  check("Backspace + Ctrl+Z + go: chu vao dung cho cu (khong ve dau tai lieu)", p[0] === "Dong mot" && p[1].includes("W"), JSON.stringify(p));
  // 3. Enter roi Ctrl+Z roi go
  const before = (await paras()).length;
  await press(session.cdp, "End", {}, 60); await press(session.cdp, "Enter", {}, 60); await sleep(300);
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(300);
  await typeText(session.cdp, "Q", 8); await sleep(300);
  p = await paras();
  check("Enter + Ctrl+Z + go: so doan tro lai va chu Q o cuoi dong 2", p.length === before && p[1].endsWith("Q"), JSON.stringify(p));
  // 4. Dinh dang tren vung chon roi Ctrl+Z roi Ctrl+Y roi go cuoi tai lieu
  await press(session.cdp, "End", {}, 60); await press(session.cdp, "Home", { shift: true }, 60);
  await press(session.cdp, "b", { ctrl: true }, 100); await sleep(300);
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(300);
  await press(session.cdp, "y", { ctrl: true }, 150); await sleep(300);
  const sel = await ev("getSelection().toString()");
  check("Ctrl+B tren vung chon, Ctrl+Z, Ctrl+Y: van giu vung chon trong cung dong", sel.length > 0 && p[1].includes(sel.slice(0, 3)), "sel=" + sel);
  // 5. Cat (Ctrl+X) roi Ctrl+Z roi go
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(200);
  await press(session.cdp, "End", {}, 60);
  await press(session.cdp, "Home", { shift: true }, 60); await press(session.cdp, "x", { ctrl: true }, 150); await sleep(300);
  await press(session.cdp, "z", { ctrl: true }, 150); await sleep(300);
  const sel2 = await ev("getSelection().toString().length");
  await typeText(session.cdp, "K", 8); await sleep(300);
  p = await paras();
  check("Ctrl+X roi Ctrl+Z roi go: khong chen vao dau tai lieu", !p[0].includes("K"), JSON.stringify(p) + " sel=" + sel2);
  console.log("SUMMARY", results.filter(Boolean).length + "/" + results.length);
} finally { await session.close(); }