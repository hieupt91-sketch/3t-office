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
  const labels = await cdp.evaluate(`(() => ({group:[...document.querySelectorAll('.vno-ribbon-group-label')].map(e=>e.textContent.trim()),insert:document.querySelector('[data-command-id="writer.comment.insert"]')?.textContent.trim(),panel:document.querySelector('.vno-writer-comments-panel')?.getAttribute('aria-label')}))()`);
  check("Ribbon và lệnh thêm nhận xét dùng cùng thuật ngữ", labels.group.includes("Nhận xét") && /Thêm nhận xét/.test(labels.insert || ""), JSON.stringify(labels));
  check("Khung bên phải dùng nhãn Nhận xét", labels.panel === "Nhận xét tài liệu", JSON.stringify(labels));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(pass => !pass)) process.exit(1);
console.log(`Writer comment terminology: ${checks.length}/${checks.length} PASS`);
