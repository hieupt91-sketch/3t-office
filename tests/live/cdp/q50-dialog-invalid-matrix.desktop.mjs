import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q50-ui");
mkdirSync(outputDir, { recursive: true });
const appFilter = process.env.VNO_Q50_INVALID_APP || "";
const phase = process.env.VNO_Q50_INVALID_PHASE || "after";
const targets = {
  writer: ["writer.insert.equation", "writer.insert.symbol", "writer.insert.crossReference", "writer.reference.captionInsert", "writer.review.wordCount", "writer.mailMerge.open"],
  sheet: ["sheet.data.validation", "sheet.data.goalSeek", "sheet.data.dataTable", "sheet.data.scenarioManager", "sheet.data.pivotTable", "sheet.format.conditional", "sheet.style.formatAsTable", "sheet.row.height", "sheet.page.margins", "sheet.page.size"],
  slides: ["slides.insert.table", "slides.diagram.insert", "slides.insert.headerFooter", "slides.insert.dateTime", "slides.insert.symbol", "slides.insert.wordart", "slides.review.spellCheck"],
};
const valueCases = [
  { name: "empty", value: "" },
  { name: "negative", value: "-1" },
  { name: "over-1e9", value: "1000000001" },
  { name: "letters", value: "abc" },
  { name: "long-5000", value: "9".repeat(5000) },
  { name: "special", value: "<>&\"" },
];
let fieldCount = 0;
let caseCount = 0;
let enterChecks = 0;
let failures = 0;
const observations = [];
const violations = [];

for (const [app, allCommands] of Object.entries(targets)) {
  if (appFilter && appFilter !== app) continue;
  const commands = allCommands;
  const session = await launchApp(app, { localAppData: path.join(profileRoot, app) });
  try {
    const win = await session.cdp.send("Browser.getWindowForTarget", {});
    await session.cdp.send("Browser.setWindowBounds", {
      windowId: (win.result || win).windowId,
      bounds: { windowState: "normal", width: 1366, height: 768 },
    });
    for (const command of commands) {
      await session.cdp.evaluate(`void window.globalCommandBus.execute(${JSON.stringify(command)})`);
      await sleep(300);
      if (app === "writer" && command === "writer.mailMerge.open") {
        await session.cdp.evaluate(`(() => [...document.querySelectorAll('[role="dialog"] button,.vno-dialog-box button')].find(b => /mẫu/i.test(b.innerText || ""))?.click())()`);
        await sleep(250);
      }
      const fields = await session.cdp.evaluate(`(() => {
        const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== "none");
        const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].filter(visible);
        const d = dialogs.at(-1), root = d?.classList.contains("vno-dialog-box") ? d : (d?.querySelector(".vno-dialog-box") || d);
        if (!root) return { open: false, fields: [] };
        const inputs = [...root.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),textarea')].filter(visible);
        return { open: true, fields: inputs.map((e, index) => {
          const label = e.labels?.[0]?.innerText || e.getAttribute("aria-label") || e.placeholder || e.id || e.name || ("field-" + index);
          return { index, tag: e.tagName.toLowerCase(), type: e.type || "text", id: e.id, name: e.name, label: label.trim(), value: e.value, required: e.required, min: e.min, max: e.max, maxLength: e.maxLength };
        }) };
      })()`);
      if (!fields.open) {
        observations.push({ app, command, status: "NO_DIALOG" });
        continue;
      }
      const relevant = fields.fields.filter(f => f.type === "number" || /name|title|caption|label|range|source|page|width|height|row|column|margin|value|date|time|url/i.test(`${f.label} ${f.id} ${f.name}`));
      for (const field of relevant) {
        fieldCount++;
        const cases = field.type === "number" ? valueCases.slice(0, 5) : [valueCases[0], valueCases[4], valueCases[5]];
        const states = [];
        for (const testCase of cases) {
          const state = await session.cdp.evaluate(`(() => {
            const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== "none");
            const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].filter(visible);
            const d = dialogs.at(-1), root = d?.classList.contains("vno-dialog-box") ? d : (d?.querySelector(".vno-dialog-box") || d);
            const inputs = [...(root?.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),textarea') || [])].filter(visible);
            const e = inputs[${field.index}];
            if (!e) return { open: !!root, missingField: true };
            const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), "value")?.set;
            set?.call(e, ${JSON.stringify(testCase.value)});
            e.focus();
            e.dispatchEvent(new Event("input", { bubbles: true }));
            e.dispatchEvent(new Event("change", { bubbles: true }));
            const alerts = [...(root?.querySelectorAll('[role="alert"],.vno-dialog-error,.vno-rule-error') || [])].filter(visible).map(n => (n.innerText || n.textContent || "").trim()).filter(Boolean);
            const buttons = [...(root?.querySelectorAll("button") || [])].filter(visible);
            const primary = buttons.find(b => /(apply|insert|create|confirm|save|add|ok|agree)/i.test([b.id, b.className, b.innerText].join(" ")) && !/(cancel|close)/i.test([b.id, b.className, b.innerText].join(" ")));
            return { open: !!root, valueLength: e.value.length, badInput: e.validity?.badInput, valid: e.checkValidity?.(), valueMissing: e.validity?.valueMissing, rangeUnderflow: e.validity?.rangeUnderflow, rangeOverflow: e.validity?.rangeOverflow, alerts, primaryText: primary?.innerText?.trim(), primaryDisabled: primary?.disabled || primary?.getAttribute("aria-disabled") === "true" };
          })()`);
          caseCount++;
          if (!state.open || state.missingField) failures++;
          const invalid = state.valid === false || state.badInput || state.valueMissing || state.rangeUnderflow || state.rangeOverflow;
          if (invalid && !state.primaryDisabled && state.alerts.length === 0) {
            failures++;
            violations.push({ app, command, field: field.id || field.label, test: testCase.name, primary: state.primaryText });
          }
          states.push({ test: testCase.name, ...state });
          if (testCase.name === (field.type === "number" ? "negative" : "special")) {
            const currentTheme = await session.cdp.evaluate("document.documentElement.dataset.theme || 'light'");
            for (const theme of ["light", "dark"]) {
              await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
              await sleep(80);
              const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
              const stem = `invalid-${app}-${command.split(".").at(-1)}-${field.index}-${phase}-${theme}-1366x768`;
              writeFileSync(path.join(outputDir, `${stem}.png`), Buffer.from((shot.result || shot).data, "base64"));
            }
            await session.cdp.evaluate(`document.documentElement.dataset.theme=${JSON.stringify(currentTheme)}`);
          }
        }
        observations.push({ app, command, field, states });
      }
      if (relevant.length) {
        const restored = await session.cdp.evaluate(`(() => {
          const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== "none");
          const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].filter(visible);
          const d = dialogs.at(-1), root = d?.classList.contains("vno-dialog-box") ? d : (d?.querySelector(".vno-dialog-box") || d);
          const inputs = [...(root?.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),textarea') || [])].filter(visible);
          const originals = ${JSON.stringify(fields.fields.map(field => field.value))};
          inputs.forEach((e, index) => {
            if (originals[index] === undefined) return;
            const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), "value")?.set;
            set?.call(e, originals[index]);
            e.dispatchEvent(new Event("input", { bubbles: true }));
            e.dispatchEvent(new Event("change", { bubbles: true }));
          });
          const buttons = [...(root?.querySelectorAll("button") || [])].filter(visible);
          const primary = buttons.find(b => /(apply|insert|create|confirm|save|add|ok|agree)/i.test([b.id, b.className, b.innerText].join(" ")) && !/(cancel|close)/i.test([b.id, b.className, b.innerText].join(" ")));
          return { open: !!root, primaryText: primary?.innerText?.trim(), primaryDisabled: primary?.disabled || primary?.getAttribute("aria-disabled") === "true" };
        })()`);
        if (!restored.open || restored.primaryDisabled) {
          failures++;
          violations.push({ app, command, test: "valid values did not re-enable action", state: restored });
        }
        const invalidNumber = relevant.find(field => field.type === "number" && (field.min !== "" || field.max !== ""));
        if (invalidNumber) {
          await session.cdp.evaluate(`(() => {
            const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== "none");
            const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].filter(visible);
            const d = dialogs.at(-1), root = d?.classList.contains("vno-dialog-box") ? d : (d?.querySelector(".vno-dialog-box") || d);
            const inputs = [...(root?.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]),textarea') || [])].filter(visible);
            const e = inputs[${invalidNumber.index}];
            const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), "value")?.set;
            set?.call(e, "-1");
            e.dispatchEvent(new Event("input", { bubbles: true }));
            e.focus();
          })()`);
          await press(session.cdp, "Enter", {}, 150);
          const staysOpen = await session.cdp.evaluate(`(() => [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].some(e => e.getClientRects().length && getComputedStyle(e).display !== "none"))()`);
          observations.push({ app, command, enterChecked: true, staysOpen });
          enterChecks++;
          if (!staysOpen) {
            failures++;
            violations.push({ app, command, field: invalidNumber.id || invalidNumber.label, test: "Enter closed invalid dialog" });
          }
        }
      }
      await press(session.cdp, "Escape", {}, 120);
    }
  } catch (error) {
    failures++;
    observations.push({ app, error: String(error) });
  } finally {
    await session.close();
  }
}
for (const item of violations) console.log(`FAIL ${JSON.stringify(item)}`);
console.log(`SUMMARY fields=${fieldCount} cases=${caseCount} invalidEnterChecks=${enterChecks} failures=${failures}`);
if (failures) process.exitCode = 1;
