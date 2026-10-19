import { launchApp } from "./session.mjs";
import { click, sleep, typeText, press } from "./actions.mjs";

const session = await launchApp("writer");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  const { cdp } = session;
  await sleep(1000);
  await click(cdp, ".vno-writer-body");
  await typeText(cdp, "Heading preview check");
  await press(cdp, "a", { ctrl: true });
  await click(cdp, '[data-command-id="writer.style.gallery"]');
  await sleep(250);
  const preview = await cdp.evaluate(`(() => { const el=document.querySelector('.vno-style-card[data-style-id="h1"] .vno-style-card-preview span'); const s=getComputedStyle(el); return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,transform:s.textTransform}; })()`);
  await click(cdp, '.vno-style-card[data-style-id="h1"]');
  await sleep(250);
  const applied = await cdp.evaluate(`(() => { const el=document.querySelector('.vno-writer-body h1'); const s=getComputedStyle(el); return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,color:s.color,transform:s.textTransform}; })()`);
  const equal = preview && applied && preview.size === applied.size && preview.weight === applied.weight
    && preview.color === applied.color && preview.transform === applied.transform
    && preview.font.split(",")[0].replaceAll('"', "") === applied.font.split(",")[0].replaceAll('"', "");
  check("Bản xem trước Heading 1 khớp kiểu đã áp dụng", equal, JSON.stringify({ preview, applied }));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(pass => !pass)) process.exit(1);
console.log(`Writer style preview parity: ${checks.length}/${checks.length} PASS`);
