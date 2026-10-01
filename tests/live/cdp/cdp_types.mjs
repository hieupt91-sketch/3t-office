import { click, press, typeText } from "./actions.mjs";

export async function runTypeProbe(session) {
  if (session.app !== "sheet") return { status: "N/A", detail: "Data type detection applies to 3T Sheet." };
  const { cdp } = session;
  const values = ["1234.56", "31/12/2026", "13:45", "25%", "abc", "'0123"];
  for (let index = 0; index < values.length; index += 1) {
    await click(cdp, '[data-coord="A' + (index + 1) + '"]');
    await typeText(cdp, values[index]);
    await press(cdp, "Enter");
  }
  const state = await cdp.evaluate(
    "(() => { const grid = window.__vnoAppInstance?.adapter?.grid;"
    + " const coords = ['A1','A2','A3','A4','A5','A6'];"
    + " return coords.map(c => { const model = grid?.cellsData?.get(c);"
    + " const el = document.querySelector('[data-coord=\"' + c + '\"]');"
    + " return {coord:c, value:model?.val ?? el?.innerText ?? '', formula:model?.formula || '',"
    + " dataType:model?.dataType || '', numberFormat:model?.style?.numberFormat || ''}; }); })()",
  );
  const valuesOk = state?.length === 6
    && String(state[0].value).includes("1234.56")
    && String(state[4].value).toLowerCase().includes("abc")
    && String(state[5].value).includes("0123");
  return { pass: Boolean(valuesOk), detail: JSON.stringify(state) };
}
