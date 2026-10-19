import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const results = [];
const check = (name, passed, detail = "") => {
  results.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
try {
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>Trước giữa sau</p><h1>Chương đầu</h1>';
    const text = body.querySelector('p').firstChild;
    const range = document.createRange();
    range.setStart(text, 'Trước '.length + 'giữa'.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  })()`);
  await click(cdp, "#vno-ribbon-tab-references");
  await click(cdp, '[data-command-id="writer.reference.tocInsert"]');
  await sleep(250);
  const state = await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    return [...body.children].map(node => ({ tag: node.tagName, toc: node.matches('[data-vno-toc="true"]'), text: (node.innerText || node.textContent || '').trim() }));
  })()`);
  const tocIndex = state.findIndex(node => node.toc);
  check("Mục lục được chèn tại caret và tách đoạn đang chứa caret", tocIndex === 1 && state[0]?.tag === "P" && state[0]?.text === "Trước giữa" && state[2]?.tag === "P" && state[2]?.text === "sau", JSON.stringify(state));
  check("Mục lục vẫn có thể tạo từ tiêu đề tài liệu", state[tocIndex]?.text.includes("Chương đầu"), JSON.stringify(state[tocIndex]));
} catch (error) {
  check("Kịch bản CDP hoàn tất không ngoại lệ", false, error.stack || error.message);
} finally {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await session.close();
}
const passed = results.filter(result => result.passed).length;
console.log(`SUMMARY ${passed}/${results.length} PASS | ${results.length - passed} FAIL`);
if (passed !== results.length) process.exitCode = 1;
