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
  await sleep(1000);
  await click(cdp, '[data-command-id="writer.style.gallery"]');
  await sleep(200);
  const labels = await cdp.evaluate(`(() => ({gallery:document.querySelector('.vno-style-gallery-dropdown')?.textContent || '',header:getComputedStyle(document.querySelector('.vno-writer-header'),'::after').content,footer:getComputedStyle(document.querySelector('.vno-writer-footer'),'::after').content}))()`);
  check("Thư viện kiểu hiển thị nhãn tiếng Việt", labels.gallery.includes("Bình thường") && !/\bNormal\b/.test(labels.gallery), labels.gallery.slice(0, 160));
  check("Vùng đầu trang và chân trang dùng nhãn thuần tiếng Việt", labels.header === '"Đầu trang"' && labels.footer === '"Chân trang"', JSON.stringify(labels));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(pass => !pass)) process.exit(1);
console.log(`Writer Vietnamese UI labels: ${checks.length}/${checks.length} PASS`);
