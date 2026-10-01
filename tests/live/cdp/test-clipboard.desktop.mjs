import { launchApp } from "./session.mjs";

async function testClipboardRibbon() {
  console.log("=== KIỂM TRA CLIPBOARD RIBBON MOUSE CLICK TRÊN DESKTOP VIA CDP ===");
  const session = await launchApp("writer", { root: process.cwd() });
  try {
    const cdp = session.cdp;

    const result = await cdp.evaluate(`(async () => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p id="p1">Hello RibbonClip World</p>';

      const app = window.__vnoAppInstance;
      const adapter = app?.adapter;
      if (adapter) {
        adapter.recordSnapshot("Initial State");
      }

      const p1 = document.getElementById("p1");
      const textNode = p1.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 6);
      range.setEnd(textNode, 16); // "RibbonClip"
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // 1. Tìm nút Cut trên ribbon
      const cutBtn = document.querySelector(".vno-ribbon button[data-command-id='common.edit.cut']");
      const hasCutBtn = !!cutBtn;
      if (cutBtn) cutBtn.click();
      await new Promise(r => setTimeout(r, 60));
      const textAfterRibbonCut = body.textContent.trim();

      // 2. Tìm nút Paste trên ribbon và dán
      const pasteBtn = document.querySelector(".vno-ribbon button[data-command-id='common.edit.paste']");
      const hasPasteBtn = !!pasteBtn;
      if (pasteBtn) pasteBtn.click();
      await new Promise(r => setTimeout(r, 60));
      const textAfterRibbonPaste = body.textContent.trim();

      // 3. Thử nghiệm Copy: chọn "World", click nút Copy
      const copyBtn = document.querySelector(".vno-ribbon button[data-command-id='common.edit.copy']");
      const hasCopyBtn = !!copyBtn;
      const p = body.querySelector("p");
      let targetNode = null;
      let targetOffset = 0;
      for (const child of p.childNodes) {
        if (child.nodeType === 3 && child.textContent.includes("World")) {
          targetNode = child;
          targetOffset = child.textContent.indexOf("World");
          break;
        }
      }
      if (targetNode) {
        // select "World"
        const r = document.createRange();
        r.setStart(targetNode, targetOffset);
        r.setEnd(targetNode, targetOffset + 5);
        sel.removeAllRanges();
        sel.addRange(r);
        if (copyBtn) copyBtn.click();
        await new Promise(r => setTimeout(r, 60));

        // Di chuyển con trỏ về cuối và dán
        const endRange = document.createRange();
        endRange.selectNodeContents(p);
        endRange.collapse(false);
        sel.removeAllRanges();
        sel.addRange(endRange);
        if (pasteBtn) pasteBtn.click();
        await new Promise(r => setTimeout(r, 60));
      }
      const textAfterRibbonCopyPaste = body.textContent.trim();

      return {
        hasCutBtn,
        hasCopyBtn,
        hasPasteBtn,
        textAfterRibbonCut,
        textAfterRibbonPaste,
        textAfterRibbonCopyPaste
      };
    })()`);

    console.log("Kết quả evaluate:", JSON.stringify(result, null, 2));
  } finally {
    await session.close();
  }
}

testClipboardRibbon().catch(err => {
  console.error("Lỗi:", err);
  process.exit(1);
});
