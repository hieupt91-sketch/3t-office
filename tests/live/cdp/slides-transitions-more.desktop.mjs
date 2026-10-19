// Q8: UI proof for PPTX-safe transition presets.
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => { checks.push({ name, pass: Boolean(pass) }); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.canvas";
try {
  await sleep(1200);
  await click(cdp, "#vno-ribbon-tab-transitions");
  await click(cdp, "[data-command-id=\"slides.transition.apply\"]");
  const opts = await ev(`JSON.stringify([...document.querySelectorAll("#vno-trans-type-select option")].map(o => ({value:o.value,label:o.textContent.trim()})))`);
  const options = JSON.parse(opts);
  for (const [value, label] of [["push","Đẩy"],["wipe","Quét"],["split","Chia"],["cover","Che phủ"]]) {
    const found = options.some(o => o.value === value && o.label.includes(label));
    check(`Hộp thoại có hiệu ứng ${label}`, found, JSON.stringify(options));
  }
  check("Không hiển thị Lật vì PPTX không lưu được hiệu ứng này", !options.some(o => o.value === "flip"), JSON.stringify(options));
  await click(cdp, "#vno-trans-cancel");
  const out = process.env.VNO_TRANSITIONS_MORE_OUT || "E:\\VNOffice-profiles\\codex-q8\\transitions-more.pptx";
  await click(cdp, "[data-dropdown-id=\"slides.transition.gallery\"]");
  const gallery = JSON.parse(await ev(`JSON.stringify([...document.querySelectorAll(".vno-ribbon-dropdown-item")].map(e => (e.getAttribute("title") || e.textContent).trim()))`));
  for (const label of ["Đẩy", "Quét", "Chia", "Che phủ"]) check(`Gallery có hiệu ứng ${label}`, gallery.some(item => item.includes(label)), JSON.stringify(gallery));
  const selectedTypes = ["push", "wipe", "split", "cover"];
  for (let i = 0; i < selectedTypes.length; i++) {
    if (i > 0) { await click(cdp, "#vno-ribbon-tab-home"); await click(cdp, "[data-command-id=\"slides.slide.new\"]"); await click(cdp, "#vno-ribbon-tab-transitions"); }
    await click(cdp, "[data-command-id=\"slides.transition.apply\"]");
    await ev(`(() => { const s=document.querySelector("#vno-trans-type-select"); s.value=${JSON.stringify(selectedTypes[i])}; s.dispatchEvent(new Event("change",{bubbles:true})); })()`);
    await click(cdp, "#vno-trans-apply-current");
    const actual = await ev(`${canvas}.slides[${i}]?.transition?.type || ""`);
    check(`Áp dụng ${selectedTypes[i]} cho trang ${i+1}`, actual === selectedTypes[i], actual);
  }
  const saved = await ev(`(async () => { const a=window.__vnoAppInstance.adapter||window.__vnoAppInstance; return JSON.stringify(await window.pywebview.api.save_document_in_place(await a.serializeToFodp(), "slides", ${JSON.stringify(out)}, null)); })()`);
  check("Lưu PPTX chứa các hiệu ứng đã chọn", /"status":\s*"ok"/.test(saved), saved.slice(0,120));
} catch (error) { check("CDP không phát sinh ngoại lệ", false, error.stack || error.message); }
finally { await session.close(); }
if (checks.some(item => !item.pass)) process.exit(1);
console.log(`slides-transitions-more: ${checks.length}/${checks.length} PASS`);
