import fs from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const session = await launchApp("writer");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  const { cdp } = session;
  await sleep(900);
  await click(cdp, '#vno-ribbon-tab-review');
  await cdp.evaluate(`(() => {
    const adapter=window.__vnoAppInstance.adapter;
    adapter.comments=[{id:'q67-comment-1',anchorText:'số liệu',content:'Kiểm tra lại số liệu.',author:'Người dùng',createdAt:new Date().toISOString(),replies:[]}];
    adapter._renderCommentsPanel();
  })()`);
  const labels = await cdp.evaluate(`(() => ({group:[...document.querySelectorAll('.vno-ribbon-group-label')].map(e=>e.textContent.trim()),insert:document.querySelector('[data-command-id="writer.comment.insert"]')?.textContent.trim(),panel:document.querySelector('.vno-writer-comments-panel')?.getAttribute('aria-label')}))()`);
  check("Ribbon và lệnh thêm nhận xét dùng cùng thuật ngữ", labels.group.includes("Nhận xét") && /Thêm nhận xét/.test(labels.insert || ""), JSON.stringify(labels));
  check("Khung bên phải dùng nhãn Nhận xét", labels.panel === "Nhận xét tài liệu", JSON.stringify(labels));
  const evidenceRoot = process.env.VNO_Q67_EVIDENCE || path.join("E:\\VNOffice-briefs\\logs", "Q67-evidence");
  fs.mkdirSync(evidenceRoot, { recursive: true });
  const screenshot = async name => {
    const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = path.join(evidenceRoot, name);
    fs.writeFileSync(file, Buffer.from(result.result.data, "base64"));
    console.log(`SCREENSHOT | ${file}`);
  };
  const viTitle = await cdp.evaluate("document.querySelector('.vno-comments-title')?.textContent.trim() || ''");
  await screenshot("q67-d13-comments-vi.png");
  check("Tiêu đề ngăn nhận xét dùng thuật ngữ Nhận xét", /^Nhận xét/.test(viTitle) && !/Ghi chú/.test(viTitle), viTitle);
  await click(cdp, "#vno-toggle-lang-btn");
  await click(cdp, 'input[name="vno-lang-pick"][value="en"]');
  await click(cdp, "#vno-lang-apply-btn");
  await cdp.waitFor("document.querySelector('#vno-ribbon-tab-review') && document.body.innerText.includes('Review')", { timeoutMilliseconds: 60000 });
  await cdp.evaluate(`(() => { const adapter=window.__vnoAppInstance.adapter; adapter.comments=[{id:'q67-comment-1',anchorText:'data',content:'Please review the figures.',author:'User',createdAt:new Date().toISOString(),replies:[]}]; adapter._renderCommentsPanel(); })()`);
  const enTitle = await cdp.evaluate("document.querySelector('.vno-comments-title')?.textContent.trim() || ''");
  const enDelete = await cdp.evaluate("document.querySelector('.vno-comment-delete')?.textContent.trim() || ''");
  await screenshot("q67-d13-comments-en.png");
  check("Tiêu đề ngăn nhận xét có i18n tiếng Anh", /^Document Comments/.test(enTitle), enTitle);
  check("Nút xóa nhận xét có i18n tiếng Anh", enDelete === "Delete", enDelete);
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(pass => !pass)) process.exit(1);
console.log(`Writer comment terminology: ${checks.length}/${checks.length} PASS`);
