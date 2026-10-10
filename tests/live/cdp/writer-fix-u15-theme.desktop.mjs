import { launchApp } from "./session.mjs";
import { click, press } from "./actions.mjs";

const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
let passed = false;

try {
  await click(cdp, "#vno-ribbon-tab-design");
  await click(cdp, '[data-command-id="writer.design.themeGallery"]');
  const sample = await cdp.evaluate(`(() => {
    const element = document.querySelector('.vno-theme-card[data-theme-id="elegant"] .vno-theme-card-preview-text');
    if (!element) return null;
    const style = getComputedStyle(element);
    return { text: element.textContent, letterSpacing: style.letterSpacing, fontFamily: style.fontFamily };
  })()`);
  passed = Boolean(sample && sample.text.startsWith("Ấn bản") && sample.fontFamily.startsWith("Arial") && sample.letterSpacing === "normal");
  console.log(`${passed ? "PASS" : "FAIL"} | U15: mẫu Trang nhã giữ dấu tiếng Việt và khoảng chữ bình thường | ${JSON.stringify(sample)}`);
  await press(cdp, "Escape");
} catch (error) {
  console.log(`FAIL | U15 CDP | ${error.stack || error.message}`);
} finally {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await session.close();
}

console.log(`SUMMARY ${passed ? 1 : 0}/1 PASS`);
if (!passed) process.exitCode = 1;
