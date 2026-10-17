// Slides: nút Đổi chữ hoa/thường (Trang đầu > Phông chữ) và phím Shift+F3 trên chữ trong khung nhập thật.
import { launchApp } from "./session.mjs";
import { click, mouseClick, press, typeText, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", {});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const fieldText = () => ev(`(() => { const el = document.querySelector('[contenteditable="true"]'); return el ? el.textContent : null; })()`);
const menuItem = async (label) => {
  const box = await ev(`(() => { const el = [...document.querySelectorAll('.vno-ribbon-dropdown-item')].find(e => (e.getAttribute("title") || e.textContent.trim()) === ${JSON.stringify(label)}); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy mục menu: " + label);
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};
const openCaseMenu = async () => {
  const box = await ev(`(() => { const el = document.querySelector('[data-dropdown-id="slides.text.changeCase"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) throw new Error("Không thấy nút Đổi chữ hoa/thường");
  await mouseClick(cdp, box.x, box.y);
  await sleep(250);
};

try {
  await sleep(1500);
  const target = await ev(`(() => { const el = document.querySelector('.vno-slide-title, [data-field="title"], .vno-slide-shape-item[contenteditable], [contenteditable]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), cls: el.className, ce: el.getAttribute('contenteditable') }; })()`);
  check("Có khung chữ để soạn", !!target, JSON.stringify(target));
  await mouseClick(cdp, target.x, target.y);
  await mouseClick(cdp, target.x, target.y, { clickCount: 2 }).catch(() => {});
  await sleep(300);
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "xin chào việt nam. hôm nay trời đẹp");
  await sleep(300);
  check("Gõ được chữ vào khung", /xin chào/.test((await fieldText()) || ""), await fieldText());

  await press(cdp, "a", { ctrl: true });
  await openCaseMenu();
  await menuItem("CHỮ HOA");
  check("Menu: CHỮ HOA (có dấu tiếng Việt)", (await fieldText()) === "XIN CHÀO VIỆT NAM. HÔM NAY TRỜI ĐẸP", await fieldText());

  await openCaseMenu();
  await menuItem("Chữ hoa đầu câu");
  check("Menu: Chữ hoa đầu câu", (await fieldText()) === "Xin chào việt nam. Hôm nay trời đẹp", await fieldText());

  await openCaseMenu();
  await menuItem("Viết Hoa Mỗi Từ");
  check("Menu: Viết Hoa Mỗi Từ", (await fieldText()) === "Xin Chào Việt Nam. Hôm Nay Trời Đẹp", await fieldText());

  await openCaseMenu();
  await menuItem("chữ thường");
  check("Menu: chữ thường", (await fieldText()) === "xin chào việt nam. hôm nay trời đẹp", await fieldText());

  await press(cdp, "F3", { shift: true });
  await sleep(300);
  check("Shift+F3 lần 1: Viết Hoa Mỗi Từ", (await fieldText()) === "Xin Chào Việt Nam. Hôm Nay Trời Đẹp", await fieldText());
  await press(cdp, "F3", { shift: true });
  await sleep(300);
  check("Shift+F3 lần 2: CHỮ HOA", (await fieldText()) === "XIN CHÀO VIỆT NAM. HÔM NAY TRỜI ĐẸP", await fieldText());
  await press(cdp, "F3", { shift: true });
  await sleep(300);
  check("Shift+F3 lần 3: về chữ thường", (await fieldText()) === "xin chào việt nam. hôm nay trời đẹp", await fieldText());
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c.pass)) process.exit(1);
console.log(`Slides change case: ${checks.length}/${checks.length} PASS`);
