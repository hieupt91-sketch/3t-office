// Writer: gõ bảng bằng Tab; Tab ở ô cuối thêm hàng mới — hàng mới cao bằng hàng cũ và giữ canh lề của hàng trên.
// Lỗi gốc (phát hiện khi soạn thử): ô hàng mới bọc <p> nên cao hơn (55 so với 47 px) và mất canh phải của cột số.
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press, pressShortcut } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await sleep(2500);
  await click(cdp, ".vno-writer-body");
  // Chèn bảng 4 cột × 3 hàng như người dùng: Chèn → Bảng → bấm ô 4×3 trong lưới chọn cỡ (56f07440).
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await cdp.waitFor("!!document.querySelector('[data-table-size-picker] [data-table-size=\"4x3\"]')", { timeoutMilliseconds: 5000 });
  await click(cdp, '[data-table-size-picker] [data-table-size="4x3"]');
  await cdp.waitFor("!!document.querySelector('.vno-writer-body table')", { timeoutMilliseconds: 5000 });
  await sleep(600);
  const rowsBefore = await ev(`document.querySelector('.vno-writer-body table').rows.length`);
  await click(cdp, ".vno-writer-body table td");
  const cols = await ev(`document.querySelector('.vno-writer-body table').rows[0].cells.length`);
  const total = rowsBefore * cols;
  for (let i = 0; i < total; i += 1) { await typeText(cdp, String(i + 1), 5); if (i < total - 1) await press(cdp, "Tab"); }
  // Cột 2 canh phải ở hàng cuối, rồi Tab ở ô cuối để thêm hàng
  await press(cdp, "ArrowLeft"); // vẫn trong ô cuối
  await click(cdp, `.vno-writer-body table tr:last-child td:nth-child(2)`);
  await pressShortcut(cdp, "Ctrl+R", { commandId: "writer.para.alignRight" });
  await click(cdp, `.vno-writer-body table tr:last-child td:last-child`);
  await press(cdp, "End");
  await press(cdp, "Tab");
  await typeText(cdp, "A", 5); await press(cdp, "Tab"); await typeText(cdp, "B", 5);
  const info = JSON.parse(await ev(`JSON.stringify((() => { const t = document.querySelector('.vno-writer-body table'); const rows = [...t.rows]; return { count: rows.length, heights: rows.map(r => Math.round(r.getBoundingClientRect().height)), lastStructure: rows[rows.length - 1].cells[0].innerHTML, prevStructure: rows[rows.length - 2].cells[0].innerHTML, alignPrev: getComputedStyle(rows[rows.length - 2].cells[1]).textAlign, alignNew: getComputedStyle(rows[rows.length - 1].cells[1]).textAlign, textNew: [...rows[rows.length - 1].cells].map(c => c.innerText.trim()).join('|') }; })())`));
  check("Tab ở ô cuối thêm đúng một hàng", info.count === rowsBefore + 1, JSON.stringify(info.heights));
  const sameHeight = info.heights.every((h) => Math.abs(h - info.heights[0]) <= 1);
  check("Mọi hàng cao bằng nhau (hàng mới không cao hơn)", sameHeight, JSON.stringify(info.heights));
  check("Ô hàng mới cùng cấu trúc với ô hàng trên (không thêm <p> thừa)", !(info.lastStructure.includes("<p>") && !info.prevStructure.includes("<p>")), `${info.prevStructure} -> ${info.lastStructure}`);
  check("Hàng mới giữ canh phải của hàng trên ở cột 2", info.alignPrev === "right" && info.alignNew === "right", `${info.alignPrev} -> ${info.alignNew}`);
  check("Chữ gõ vào hàng mới đúng ô (A, B ở ô 1 và 2)", /^A\|B\|/.test(info.textNew), info.textNew);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);