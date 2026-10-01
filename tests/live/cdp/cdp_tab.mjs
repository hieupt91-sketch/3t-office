import { click, press, typeText } from "./actions.mjs";

export async function runTabProbe(session) {
  if (session.app !== "writer") return { pass: true, detail: "N/A: Writer Tab insertion applies only to 3T Doc." };
  const { cdp } = session;
  await click(cdp, ".vno-writer-body p");
  await typeText(cdp, "TabA");
  await press(cdp, "Tab");
  await typeText(cdp, "TabB");
  const state = await cdp.evaluate(
    "(() => { const p = document.querySelector('.vno-writer-body p');"
    + " return {text:p?.innerText || '', html:p?.innerHTML || '', active:document.activeElement?.className || ''}; })()",
  );
  const combined = state.text + state.html;
  return { pass: combined.includes("TabA") && combined.includes("TabB") && /tab|\t/i.test(combined), detail: JSON.stringify(state) };
}
