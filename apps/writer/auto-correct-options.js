import { t } from "../../platform/i18n/i18n.js";
import {
  DEFAULT_AUTO_CORRECT_REPLACEMENTS,
  DEFAULT_AUTO_CORRECT_SETTINGS,
  normalizeAutoCorrectReplacements,
  normalizeAutoCorrectSettings
} from "./auto-correct.js";

const SETTING_NAMES = [
  ["enabled", "enabled"],
  ["replaceText", "replaceText"],
  ["capitalizeSentences", "capitalizeSentences"],
  ["smartQuotes", "smartQuotes"],
  ["smartDashes", "smartDashes"],
  ["fractions", "fractions"]
];

export function createWriterAutoCorrectOptionsProvider(preferences) {
  let draftSettings = preferences.getSettings();
  let draftReplacements = preferences.getReplacements();

  const renderHtml = () => `
    <fieldset id="vno-opt-writer-autocorrect" style="border:1px solid var(--vno-border-default);border-radius:var(--vno-radius-md);padding:12px 16px;margin:0;">
      <legend style="font-size:13px;font-weight:600;color:var(--vno-text-primary);padding:0 6px;">${t("writerAutoCorrect.optionsTitle")}</legend>
      <div style="display:grid;gap:8px;margin-top:6px;">
        ${SETTING_NAMES.map(([name, key], index) => `<label style="display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer;${index ? "margin-left:18px;" : "font-weight:600;"}"><input type="checkbox" name="vno-autocorrect-${name}" /><span>${t(`writerAutoCorrect.${key}`)}</span></label>`).join("")}
      </div>
      <div class="vno-autocorrect-replacements" style="margin:12px 0 0 18px;">
        <div style="display:grid;grid-template-columns:1fr 28px 1fr 36px;gap:6px;align-items:center;font-size:12px;font-weight:600;color:var(--vno-text-muted);">
          <span>${t("writerAutoCorrect.replace")}</span><span aria-hidden="true">→</span><span>${t("writerAutoCorrect.with")}</span><span></span>
        </div>
        <div class="vno-autocorrect-replacement-list" style="display:grid;gap:6px;margin-top:6px;"></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button type="button" class="vno-btn vno-autocorrect-add">${t("writerAutoCorrect.add")}</button>
          <button type="button" class="vno-btn vno-autocorrect-reset">${t("writerAutoCorrect.reset")}</button>
        </div>
      </div>
      <div class="vno-autocorrect-error" role="alert" hidden style="margin:8px 0 0 18px;color:var(--vno-danger,#b91c1c);font-size:12px;"></div>
      <p style="margin:10px 0 0 18px;color:var(--vno-text-muted);font-size:12px;">${t("writerAutoCorrect.imeHint")}</p>
    </fieldset>`;

  const mount = overlay => {
    const section = overlay.querySelector("#vno-opt-writer-autocorrect");
    if (!section) return;
    draftSettings = preferences.getSettings();
    draftReplacements = preferences.getReplacements();
    const list = section.querySelector(".vno-autocorrect-replacement-list");
    const error = section.querySelector(".vno-autocorrect-error");
    const showError = message => {
      error.textContent = message || "";
      error.hidden = !message;
    };
    section._vnoShowError = showError;
    if (preferences.lastLoadError) {
      showError(`${t("writerAutoCorrect.storageFailed")} ${preferences.lastLoadError}`);
    }

    const syncDisabled = () => {
      const enabled = section.querySelector('[name="vno-autocorrect-enabled"]').checked;
      const replaceEnabled = enabled && section.querySelector('[name="vno-autocorrect-replaceText"]').checked;
      for (const input of section.querySelectorAll('input[name^="vno-autocorrect-"]')) {
        if (input.name !== "vno-autocorrect-enabled") input.disabled = !enabled;
      }
      section.querySelector(".vno-autocorrect-add").disabled = !replaceEnabled;
      for (const control of list.querySelectorAll("input,button")) control.disabled = !replaceEnabled;
    };

    const addRow = (entry = { from: "", to: "" }) => {
      const row = document.createElement("div");
      row.className = "vno-autocorrect-replacement-row";
      row.style.cssText = "display:grid;grid-template-columns:1fr 28px 1fr 36px;gap:6px;align-items:center;";
      const from = document.createElement("input");
      from.className = "vno-autocorrect-from";
      from.maxLength = 64;
      from.setAttribute("aria-label", t("writerAutoCorrect.replace"));
      from.value = entry.from;
      const arrow = document.createElement("span");
      arrow.textContent = "→";
      arrow.setAttribute("aria-hidden", "true");
      const to = document.createElement("input");
      to.className = "vno-autocorrect-to";
      to.maxLength = 128;
      to.setAttribute("aria-label", t("writerAutoCorrect.with"));
      to.value = entry.to;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "vno-btn vno-autocorrect-remove";
      remove.textContent = "×";
      remove.title = t("writerAutoCorrect.remove");
      remove.setAttribute("aria-label", t("writerAutoCorrect.remove"));
      remove.addEventListener("click", () => { row.remove(); showError(""); });
      row.append(from, arrow, to, remove);
      list.appendChild(row);
      syncDisabled();
      return from;
    };

    for (const [name] of SETTING_NAMES) {
      const input = section.querySelector(`[name="vno-autocorrect-${name}"]`);
      input.checked = Boolean(draftSettings[name]);
      input.addEventListener("change", () => { showError(""); syncDisabled(); });
    }
    draftReplacements.forEach(addRow);
    section.querySelector(".vno-autocorrect-add").addEventListener("click", () => addRow().focus());
    section.querySelector(".vno-autocorrect-reset").addEventListener("click", () => {
      draftSettings = normalizeAutoCorrectSettings(DEFAULT_AUTO_CORRECT_SETTINGS);
      draftReplacements = normalizeAutoCorrectReplacements(DEFAULT_AUTO_CORRECT_REPLACEMENTS);
      for (const [name] of SETTING_NAMES) section.querySelector(`[name="vno-autocorrect-${name}"]`).checked = draftSettings[name];
      list.replaceChildren();
      draftReplacements.forEach(addRow);
      showError("");
      syncDisabled();
    });
    syncDisabled();
  };

  const apply = overlay => {
    const section = overlay.querySelector("#vno-opt-writer-autocorrect");
    if (!section) return true;
    const settings = Object.fromEntries(SETTING_NAMES.map(([name]) => [
      name, section.querySelector(`[name="vno-autocorrect-${name}"]`).checked
    ]));
    const rows = Array.from(section.querySelectorAll(".vno-autocorrect-replacement-row"));
    const replacements = rows.map(row => ({
      from: row.querySelector(".vno-autocorrect-from").value,
      to: row.querySelector(".vno-autocorrect-to").value
    })).filter(entry => entry.from.trim() || entry.to);
    const incomplete = replacements.find(entry => !entry.from.trim() || !entry.to);
    if (incomplete) {
      section._vnoShowError?.(t("writerAutoCorrect.incompleteRow"));
      rows.find(row => !row.querySelector(".vno-autocorrect-from").value.trim() || !row.querySelector(".vno-autocorrect-to").value)?.querySelector("input")?.focus();
      return false;
    }
    const result = preferences.save(settings, replacements);
    if (!result.ok) {
      const message = result.message === "replacementRequired"
        ? t("writerAutoCorrect.replacementRequired")
        : `${t("writerAutoCorrect.storageFailed")}${result.detail ? ` ${result.detail}` : ""}`;
      section._vnoShowError?.(message);
      return false;
    }
    return true;
  };

  return { renderHtml, mount, apply };
}
