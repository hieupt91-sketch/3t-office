import { click, press, typeText } from "./actions.mjs";

export async function runFormulaProbe(session) {
  if (session.app !== "sheet") return { status: "N/A", detail: "Formula point mode applies to 3T Sheet." };
  const { cdp } = session;
  for (const [coord, value] of [["A1", "2"], ["A2", "3"]]) {
    await click(cdp, '[data-coord="' + coord + '"]');
    await typeText(cdp, value);
    await press(cdp, "Enter");
  }
  await click(cdp, '[data-coord="B1"]');
  await typeText(cdp, "=A1+");
  await click(cdp, '[data-coord="A2"]');
  const editState = await cdp.evaluate(
    "(() => ({formulaBar: document.querySelector('.vno-formula-input, #vno-formula-input, input.vno-formula-bar-input')?.value || '',"
    + " active: document.activeElement?.className || ''}))()",
  );
  await press(cdp, "Enter");
  await new Promise(resolve => setTimeout(resolve, 250));
  const result = await cdp.evaluate(
    "(() => { const model = window.__vnoAppInstance?.adapter?.grid?.cellsData?.get('B1');"
    + " return {value: document.querySelector('[data-coord=\"B1\"]')?.innerText?.trim() || '',"
    + " formula:model?.formula || '', modelValue:model?.val ?? null, formulaBar:document.querySelector('.vno-formula-input, #vno-formula-input, input.vno-formula-bar-input')?.value || ''}; })()",
  );
  const expression = (editState.formulaBar || "") + " " + (result.formula || "");
  return {
    pass: /A1/.test(expression) && /A2/.test(expression) && (String(result.value).includes("5") || Number(result.modelValue) === 5),
    detail: JSON.stringify({ editState, result }),
  };
}
