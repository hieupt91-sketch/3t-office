// Chẩn đoán: in các kiểu chữ (style:text-properties) trong FODP sau khi áp hộp thoại Phông chữ lên tiêu đề.
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { mouseClick, typeText, press, sleep } from "../../tests/live/cdp/actions.mjs";
const session = await launchApp("slides", {});
const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await sleep(1500);
  const t = await ev(`(() => { const r = document.querySelector('.vno-slide-title').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  await mouseClick(session.cdp, t.x, t.y);
  await typeText(session.cdp, "Chu thu");
  await press(session.cdp, "a", { ctrl: true });
  await ev(`(() => { const a = window.__vnoAppInstance.adapter; const range = getSelection().getRangeAt(0).cloneRange(); a.applyFontDialogChanges({ family: "Georgia", size: 28, color: "#ff0000", underlineStyle: "double", sup: true, spacing: 2 }, range, document.querySelector('.vno-slide-title')); })()`);
  await ev(`(() => { const a = window.__vnoAppInstance.adapter; getSelection().selectAllChildren(document.querySelector(".vno-slide-title")); a.setCharacterSpacing(3); })()`);
  console.log("HTML:", (await ev(`document.querySelector('.vno-slide-title').innerHTML`)).slice(0, 300));
  await ev(`window.__vnoAppInstance.canvas._syncEditableFieldsFromDom()`);
  console.log("titleHtml:", await ev(`window.__vnoAppInstance.canvas.slides[0].titleHtml`));
  const fodp = await ev(`window.__vnoAppInstance.adapter.serializeToFodp()`);
  console.log((fodp.match(/<style:style style:name="vnoT\d+"[\s\S]*?<\/style:style>/g) || []).join("\n"));
  console.log((fodp.match(/<draw:frame[^>]*presentation:class="title"[\s\S]{0,500}/) || [""])[0].slice(0, 600));
  const out = process.env.VNO_DBG_OUT || "E:\\VNOffice-profiles\\claude-slidetrans\\font_dbg.pptx";
  console.log(await ev(`(async () => { const a = window.__vnoAppInstance.adapter; return JSON.stringify(await window.pywebview.api.save_document_in_place(a.serializeToFodp(), "slides", ${JSON.stringify(out)}, null)).slice(0, 60); })()`));
} finally { await session.close(); }
