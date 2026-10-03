import { launchApp } from "./cdp/session.mjs";
import { sleep } from "./cdp/client.mjs";

async function runDesktopProof() {
  console.log("=== BẮT ĐẦU KIỂM THỬ DESKTOP PROOF QUA CDP (WEBVIEW2) ===");
  console.log("Khởi động ứng dụng Doc (writer) qua python -s main.py --app=writer...");

  let session = null;
  try {
    session = await launchApp("writer", {
      startTimeoutMilliseconds: 60000,
      readyTimeoutMilliseconds: 40000
    });
    console.log(`[PASS] Khởi chạy thành công WebView2 với debugPort=${session.debugPort}`);

    const cdp = session.cdp;

    // 1. Nhấn phím F1 qua CDP Input.dispatchKeyEvent (không dùng OS-level input)
    console.log("Gửi phím F1 qua CDP Input.dispatchKeyEvent...");
    await cdp.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "F1",
      code: "F1",
      windowsVirtualKeyCode: 112
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "F1",
      code: "F1",
      windowsVirtualKeyCode: 112
    });

    // Đợi panel Trợ giúp mở ra
    await cdp.waitFor("!!document.querySelector('#vno-help-panel:not([hidden])')", {
      timeoutMilliseconds: 10000
    });
    console.log("[PASS] Bảng Trợ giúp (#vno-help-panel) đã mở thành công sau khi nhấn F1.");

    // Helper: tìm kiếm và chọn bài trong panel trợ giúp
    async function searchAndInspectEntry(query, entryId) {
      console.log(`\n--- Kiểm tra tra cứu: "${query}" (ID: ${entryId}) ---`);
      
      // Nhập từ khóa tìm kiếm vào ô #vno-help-search
      await cdp.evaluate(`(() => {
        const input = document.querySelector('#vno-help-search');
        if (!input) throw new Error('Không tìm thấy ô tìm kiếm trợ giúp');
        input.value = ${JSON.stringify(query)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`);

      await sleep(400);

      // Nhấp vào topic tương ứng trong danh sách kết quả
      const topicSelector = `.vno-help-topic[data-help-id="${entryId}"]`;
      const topicFound = await cdp.evaluate(`!!document.querySelector(${JSON.stringify(topicSelector)})`);
      if (!topicFound) {
        throw new Error(`Không tìm thấy kết quả chủ đề cho ID: ${entryId} với từ khóa: "${query}"`);
      }

      await cdp.evaluate(`(() => {
        const btn = document.querySelector(${JSON.stringify(topicSelector)});
        if (btn) btn.click();
      })()`);

      await sleep(300);

      // Đọc nội dung bài viết render trong .vno-help-article
      const articleData = await cdp.evaluate(`(() => {
        const article = document.querySelector('.vno-help-article');
        if (!article) return null;
        return {
          title: article.querySelector('h3')?.innerText || '',
          location: article.querySelector('.vno-help-location')?.innerText || '',
          summary: article.querySelector('.vno-help-summary')?.innerText || '',
          stepsHeading: article.querySelector('.vno-help-steps-title')?.innerText || '',
          steps: [...article.querySelectorAll('.vno-help-steps li')].map(li => li.innerText),
          note: article.querySelector('.vno-help-note')?.innerText || '',
          rawText: article.innerText
        };
      })()`);

      if (!articleData || !articleData.title) {
        throw new Error(`Nội dung bài ${entryId} không render trong DOM`);
      }

      console.log(`[PASS] Tiêu đề: ${articleData.title}`);
      console.log(`[PASS] Vị trí: ${articleData.location}`);
      console.log(`[PASS] Tóm tắt: ${articleData.summary}`);
      console.log(`[PASS] Số bước thực hiện: ${articleData.steps.length}`);
      articleData.steps.forEach((s, idx) => console.log(`       Bước ${idx + 1}: ${s}`));
      if (articleData.note) console.log(`[PASS] ${articleData.note}`);

      return articleData;
    }

    // 2. Tra cứu Bài 1: Ribbon Retro Entry - "Giãn khoảng cách dòng"
    const entry1 = await searchAndInspectEntry("khoảng cách dòng", "writer.para.lineSpacingHelp");

    // 3. Tra cứu Bài 2: Shared Platform Retro Entry - "Dán đặc biệt"
    const entry2 = await searchAndInspectEntry("dán đặc biệt", "common.platform.pasteSpecialHelp");

    // 4. Tra cứu Bài 3: Dialog Retro Entry - "Tìm kiếm và Thay thế"
    const entry3 = await searchAndInspectEntry("tìm kiếm thay thế", "common.dialog.findReplaceHelp");

    console.log("\n=== TẤT CẢ 3 BÀI TRỢ GIÚP MỚI ĐÃ RENDER CHUẨN XÁC TRÊN GIAO DIỆN DESKTOP ===");

    return {
      success: true,
      port: session.debugPort,
      entries: [entry1, entry2, entry3]
    };
  } catch (error) {
    console.error("LỖI KIỂM THỬ DESKTOP PROOF:", error);
    throw error;
  } finally {
    if (session) {
      console.log("Đóng phiên ứng dụng desktop sạch sẽ...");
      await session.close();
      console.log("Đã đóng phiên desktop.");
    }
  }
}

runDesktopProof().then(result => {
  console.log("\nKET QUA DESKTOP PROOF: PASS");
  process.exit(0);
}).catch(err => {
  console.error("\nKET QUA DESKTOP PROOF: FAIL", err);
  process.exit(1);
});
