import { launchApp } from "./session.mjs";
import { press, typeText } from "./actions.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true });
const results = [];
const check = (name, ok, detail) => { results.push(ok); console.log((ok ? "PASS" : "FAIL") + " | " + name + " | " + detail); };
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(4000);
  await ev("(() => { try { localStorage.setItem('vno-spellcheck-enabled','true'); } catch (e) {} const b = document.querySelector('.vno-writer-body'); b.focus(); return 1; })()");
  const html = () => ev("document.querySelector('.vno-writer-body').innerHTML");
  await typeText(session.cdp, "Toi dang lam viec tai cong ty xyzabc ", 8);
  for (const [key, tag] of [["b", "b|strong"], ["i", "i|em"], ["u", "u"]]) {
    await press(session.cdp, key, { ctrl: true }, 30);
    const q0 = await ev("document.queryCommandState('" + (key === "b" ? "bold" : key === "i" ? "italic" : "underline") + "')"); await sleep(900); const q1 = await ev("document.queryCommandState('" + (key === "b" ? "bold" : key === "i" ? "italic" : "underline") + "')"); console.log("  trang thai lenh sau Ctrl+" + key + ": ngay=" + q0 + " sau 900ms=" + q1); // vong quet chinh ta (debounce 400ms) chay SAU Ctrl+X, TRUOC khi go chu
    const word = "chu" + key + "dinh";
    await typeText(session.cdp, word, 8);
    await sleep(900);
    const h = await html();
    const re = new RegExp("<(" + tag + ")[^>]*>(?:<[^>]+>)*[^<]*" + word);
    check("Ctrl+" + key.toUpperCase() + " roi go: chu go ra nam trong the " + tag, re.test(h), h.slice(-150).replace(/\s+/g, " "));
    await press(session.cdp, key, { ctrl: true }, 30);
    await typeText(session.cdp, " ", 8);
  }
  console.log("SUMMARY", results.filter(Boolean).length + "/" + results.length);
} finally { await session.close(); }