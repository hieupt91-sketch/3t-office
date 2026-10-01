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
    + " const value = model?.val ?? el?.innerText ?? '';"
    + " return {coord:c, value, valueType:typeof value, formula:model?.formula || '',"
    + " dataType:model?.dataType || '', numberFormat:model?.style?.numberFormat || null,"
    + " formatCategory:model?.style?.numberFormat?.category || ''}; }); })()",
  );
  const detected = {
    numberDetected: state?.[0]?.valueType === "number" && Number(state[0].value) === 1234.56,
    dateDetected: state?.[1]?.valueType === "number" && state[1].formatCategory === "date",
    timeDetected: state?.[2]?.valueType === "number" && state[2].formatCategory === "time",
    percentageDetected: state?.[3]?.valueType === "number"
      && Math.abs(Number(state[3].value) - 0.25) < 0.000001
      && state[3].formatCategory === "percentage",
    textPreserved: state?.[4]?.valueType === "string" && String(state[4].value).toLowerCase() === "abc",
    leadingZeroPreserved: state?.[5]?.valueType === "string" && String(state[5].value) === "0123",
  };
  return { pass: Object.values(detected).every(Boolean), detail: JSON.stringify({ detected, state }) };
}
