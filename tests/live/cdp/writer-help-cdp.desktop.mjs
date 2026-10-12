// VN Writer CDP Test: Mở Trợ giúp (F1 hoặc tab Trợ giúp) và tra cứu 5 lệnh bất kỳ, xác nhận hiển thị nội dung tiếng Việt.
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";
import { sleep } from "./client.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const session = await launchApp("writer", {});
const { cdp } = session;

try {
  await sleep(2500);

  // 1. Mở panel Trợ giúp qua lệnh writer.help.open (F1 / tab Trợ giúp)
  await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('writer.help.open'))`);
  await sleep(800);

  const isPanelOpen = await cdp.evaluate(`(() => {
    const panel = document.querySelector('#vno-help-panel');
    return Boolean(panel && !panel.hidden && panel.offsetHeight > 0);
  })()`);
  check("Mở panel Trợ giúp (F1 / tab Trợ giúp) thành công trên app", isPanelOpen);

  // Danh sách 5 lệnh bất kỳ tra cứu trên app qua CDP
  const testCommands = [
    { commandId: "writer.page.blank", entryId: "writer.page.blank", searchKeyword: "trang trắng", expectedTitle: "Chèn trang trắng" },
    { commandId: "writer.table.fromText", entryId: "writer.table.fromText", searchKeyword: "văn bản thành bảng", expectedTitle: "Chuyển văn bản thành bảng" },
    { commandId: "writer.review.spellCheck", entryId: "writer.review.spellCheck", searchKeyword: "chính tả", expectedTitle: "Soát lỗi chính tả và gợi ý sửa từ tiếng Việt" },
    { commandId: "common.edit.find", entryId: "writer.edit.findReplaceSelect", searchKeyword: "tìm kiếm", expectedTitle: "Tìm kiếm và Thay thế trong Doc" },
    { commandId: "ai.assistant.summarize", entryId: "writer.ai.core", searchKeyword: "tóm tắt", expectedTitle: "Trợ lý 3T AI: Tóm tắt nhanh và Viết lại văn phong" }
  ];

  for (const item of testCommands) {
    // Nhập từ khóa vào ô search của Help Panel
    await cdp.evaluate(`(() => {
      const input = document.querySelector('#vno-help-search');
      if (input) {
        input.value = ${JSON.stringify(item.searchKeyword)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await sleep(400);

    // Chọn đúng chủ đề bằng chuột, không dựa vào một global instance không được expose.
    const topicSelector = `.vno-help-topic[data-help-id="${item.entryId}"]`;
    await cdp.waitFor(`!!document.querySelector(${JSON.stringify(topicSelector)})`, { timeoutMilliseconds: 5000 });
    await click(cdp, topicSelector);
    await sleep(500);

    const articleInfo = await cdp.evaluate(`(() => {
      const article = document.querySelector('.vno-help-article');
      if (!article) return null;
      const titleEl = article.querySelector('.vno-help-article-title, h3, h2, strong');
      const bodyText = article.innerText || article.textContent || '';
      return {
        hasTitle: Boolean(titleEl && titleEl.textContent.trim()),
        titleText: titleEl ? titleEl.textContent.trim() : '',
        bodyLength: bodyText.length,
        hasSteps: article.querySelectorAll('ol li, ul li, p').length > 0
      };
    })()`);

    const isOk = Boolean(articleInfo && articleInfo.hasTitle
      && articleInfo.bodyLength > 100 && articleInfo.titleText === item.expectedTitle);
    check(
      `Tra cứu lệnh [${item.commandId}]: hiển thị bài Hướng dẫn tiếng Việt (${item.expectedTitle})`,
      isOk,
      articleInfo ? `tiêu đề bài viết: "${articleInfo.titleText}", độ dài: ${articleInfo.bodyLength} ký tự` : "không tìm thấy article DOM"
    );
  }

} catch (err) {
  check("CDP Help Verification Test gặp lỗi ngoại lệ", false, err.stack || err.message);
} finally {
  try {
    await session.close();
  } catch {}
}

const failed = results.filter(r => !r.ok);
if (failed.length > 0) {
  console.error(`CDP Test có ${failed.length} câu kiểm tra thất bại.`);
  process.exit(1);
} else {
  console.log(`CDP Help Verification Test hoàn toàn XANH (${results.length}/${results.length} PASS).`);
  process.exit(0);
}
