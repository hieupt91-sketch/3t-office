import { launchApp } from "./session.mjs";
import { click, press, typeText, sleep } from "./actions.mjs";

const session = await launchApp("slides", {});
const { cdp } = session;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const canvas = "window.__vnoAppInstance.adapter.canvas";
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await sleep(1000);
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="slides.insert.table"]');
  await cdp.waitFor('!!document.querySelector("#vno-slide-table-rows")', { timeoutMilliseconds: 10000 });
  const tableBefore = await ev(`JSON.stringify({rows:document.querySelector("#vno-slide-table-rows").value,cols:document.querySelector("#vno-slide-table-cols").value})`);
  console.log("TABLE_INPUT_BEFORE " + tableBefore);
  for (const [selector, value] of [["#vno-slide-table-rows", "4"], ["#vno-slide-table-cols", "3"]]) {
    await click(cdp, selector);
    await press(cdp, "Home", {}, 50);
    await press(cdp, "End", { shift: true }, 50);
    await typeText(cdp, value, 0);
  }
  const tableInput = await ev(`JSON.stringify({rows:document.querySelector("#vno-slide-table-rows").value,cols:document.querySelector("#vno-slide-table-cols").value})`);
  console.log("TABLE_INPUT_AT_INSERT " + tableInput);
  await click(cdp, ".vno-dialog-ok-btn");
  await sleep(500);
  const table = await ev(`JSON.stringify(${canvas}.slides[0].shapes.filter(s=>s.type==="table").at(-1))`);
  const tableShape = JSON.parse(table || "null");
  check("4×3 table inserts with requested dimensions", tableShape?.rows === 4 && tableShape?.cols === 3, table);

  await click(cdp, '[data-command-id="slides.insert.chart"]');
  await cdp.waitFor('!!document.querySelector("[data-chart-title-input]")', { timeoutMilliseconds: 10000 });
  const chartDefault = await ev(`document.querySelector("[data-chart-title-input]").value`);
  console.log("CHART_INPUT_BEFORE " + JSON.stringify(chartDefault));
  await click(cdp, "[data-chart-title-input]");
  await press(cdp, "Home", {}, 50);
  await press(cdp, "End", { shift: true }, 50);
  await typeText(cdp, "Tiến độ triển khai", 0);
  const chartInput = await ev(`document.querySelector("[data-chart-title-input]").value`);
  console.log("CHART_INPUT_AT_INSERT " + JSON.stringify(chartInput));
  await click(cdp, "[data-chart-apply]");
  await sleep(500);
  const chart = await ev(`JSON.stringify(${canvas}.slides[0].shapes.filter(s=>s.type==="chart").at(-1)?.title)`);
  const chartTitle = JSON.parse(chart || "null");
  check("Chart title equals selected replacement text", chartTitle === "Tiến độ triển khai", JSON.stringify(chartTitle));
} catch (error) {
  check("CDP run completes", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some(ok => !ok)) process.exit(1);
console.log(`slides-q14-insert-fields: ${checks.length}/${checks.length} PASS`);
