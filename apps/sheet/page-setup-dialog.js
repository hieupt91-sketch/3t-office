/** VN Office — hộp thoại Thiết lập trang bốn thẻ cho Sheet. */
import { t } from "../../platform/i18n/i18n.js";

const TABS = ["page", "margins", "headerFooter", "sheet"];
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const selected = (value, current) => String(value) === String(current) ? " selected" : "";
const checked = value => value ? " checked" : "";

function tabForFocus(focusField) {
  if (focusField === "margins") return "margins";
  if (focusField === "headerFooter") return "headerFooter";
  if (["printTitles", "sheet", "printArea"].includes(focusField)) return "sheet";
  return "page";
}

function focusId(focusField) {
  return {
    margins: "vno-sheet-margin-top",
    orientation: "vno-sheet-orientation-portrait",
    size: "vno-sheet-size",
    scale: "vno-sheet-scale-percent",
    headerFooter: "vno-sheet-header-preset",
    printTitles: "vno-sheet-title-rows",
    printArea: "vno-sheet-print-area",
    sheet: "vno-sheet-print-area"
  }[focusField] || "vno-sheet-orientation-portrait";
}

function field(label, control, cls = "") {
  return `<label class="vno-ps-field ${cls}"><span>${label}</span>${control}</label>`;
}

function numberInput(id, value, min, max, step = "1") {
  return `<input id="${id}" class="vno-dialog-input" type="number" min="${min}" max="${max}" step="${step}" value="${esc(value)}">`;
}

function picker(id, value, label) {
  return `<span class="vno-ps-picker"><input id="${id}" class="vno-dialog-input" value="${esc(value)}"><button type="button" class="vno-btn vno-btn-icon-only" id="${id}-pick" title="${esc(label)}" aria-label="${esc(label)}">⊞</button></span>`;
}

function presetValue(kind, value) {
  const values = {
    none: "",
    page: t("sheetDialogs.pageSetup.presetPageValue", "Trang &P"),
    pages: t("sheetDialogs.pageSetup.presetPagesValue", "Trang &P / &N"),
    sheet: t("sheetDialogs.pageSetup.presetSheetValue", "Trang tính &A"),
    file: t("sheetDialogs.pageSetup.presetFileValue", "Tệp &F"),
    date: t("sheetDialogs.pageSetup.presetDateValue", "Ngày &D")
  };
  return values[value] ?? (kind === "footer" ? "" : undefined);
}

export class PageSetupDialog {
  static show({ grid, focusField = "margins" }) {
    if (!grid || typeof document === "undefined" || !document.body) return false;
    document.querySelectorAll(".vno-page-setup-dialog").forEach(node => node.closeDialog?.());
    const setup = grid.getPageSetup();
    const pending = grid._printTitleSelect;
    const pendingValue = fieldName => pending?.field === fieldName && pending.pendingValue ? pending.pendingValue : null;
    const values = {
      printArea: pendingValue("area") || grid.printAreaBySheet?.[grid.activeSheet] || "",
      rows: pendingValue("rows") || setup.printTitles.rows,
      cols: pendingValue("cols") || setup.printTitles.cols
    };
    const hf = setup.headerFooter || {};
    const pageSettings = setup.pageSettings || {};
    const initialTab = tabForFocus(focusField);
    const tabs = TABS.map(id => `<button type="button" role="tab" id="vno-ps-tab-${id}" class="vno-fc-tab vno-ps-tab" data-tab="${id}" aria-controls="vno-ps-panel-${id}">${t(`sheetDialogs.pageSetup.tab${id[0].toUpperCase()}${id.slice(1)}`)}</button>`).join("");
    const pagePanel = `
      <section id="vno-ps-panel-page" class="vno-ps-panel" role="tabpanel" aria-labelledby="vno-ps-tab-page">
        <fieldset><legend>${t("sheetDialogs.pageSetup.orientation")}</legend>
          <label><input id="vno-sheet-orientation-portrait" type="radio" name="vno-sheet-orientation" value="portrait"${checked(setup.orientation === "portrait")}> ${t("sheetDialogs.pageSetup.portrait")}</label>
          <label><input id="vno-sheet-orientation-landscape" type="radio" name="vno-sheet-orientation" value="landscape"${checked(setup.orientation === "landscape")}> ${t("sheetDialogs.pageSetup.landscape")}</label>
        </fieldset>
        <fieldset><legend>${t("sheetDialogs.pageSetup.scaling")}</legend>
          <label class="vno-ps-scale-row"><input id="vno-sheet-scale-percent-mode" type="radio" name="vno-sheet-scale-mode" value="percent"${checked(setup.scale.mode === "percent")}> ${t("sheetDialogs.pageSetup.adjustTo")} ${numberInput("vno-sheet-scale-percent", setup.scale.percent, 10, 400)} %</label>
          <label class="vno-ps-scale-row"><input id="vno-sheet-scale-pages-mode" type="radio" name="vno-sheet-scale-mode" value="pages"${checked(setup.scale.mode === "pages")}> ${t("sheetDialogs.pageSetup.fitTo")} ${numberInput("vno-sheet-scale-wide", setup.scale.pagesWide, 0, 1000)} ${t("sheetDialogs.pageSetup.pagesWideBy")} ${numberInput("vno-sheet-scale-tall", setup.scale.pagesTall, 0, 1000)} ${t("sheetDialogs.pageSetup.pagesTall")}</label>
          <small>${t("sheetDialogs.pageSetup.autoDimensionHint")}</small>
        </fieldset>
        <div class="vno-ps-grid-two">
          ${field(t("sheetDialogs.pageSetup.paperSize"), `<select id="vno-sheet-size" class="vno-select"><option value="a4"${selected("a4", setup.size)}>A4</option><option value="letter"${selected("letter", setup.size)}>Letter</option><option value="legal"${selected("legal", setup.size)}>Legal</option><option value="a3"${selected("a3", setup.size)}>A3</option><option value="a5"${selected("a5", setup.size)}>A5</option></select>`)}
          ${field(t("sheetDialogs.pageSetup.printQuality"), `<select id="vno-sheet-print-quality" class="vno-select"><option value="600"${selected(600, pageSettings.printQuality)}>600 dpi</option><option value="300"${selected(300, pageSettings.printQuality)}>300 dpi</option><option value="150"${selected(150, pageSettings.printQuality)}>150 dpi</option></select>`)}
          ${field(t("sheetDialogs.pageSetup.firstPageNumber"), `<input id="vno-sheet-first-page-number" class="vno-dialog-input" value="${esc(pageSettings.firstPageNumber === "auto" ? t("sheetDialogs.pageSetup.automatic", "Tự động") : pageSettings.firstPageNumber)}">`)}
        </div>
      </section>`;
    const marginsPanel = `
      <section id="vno-ps-panel-margins" class="vno-ps-panel" role="tabpanel" aria-labelledby="vno-ps-tab-margins">
        <div class="vno-ps-margin-grid">
          ${field(t("sheetDialogs.pageSetup.marginTop"), numberInput("vno-sheet-margin-top", setup.margins.top, 0, 25, ".01"))}
          ${field(t("sheetDialogs.pageSetup.marginBottom"), numberInput("vno-sheet-margin-bottom", setup.margins.bottom, 0, 25, ".01"))}
          ${field(t("sheetDialogs.pageSetup.marginLeft"), numberInput("vno-sheet-margin-left", setup.margins.left, 0, 25, ".01"))}
          ${field(t("sheetDialogs.pageSetup.marginRight"), numberInput("vno-sheet-margin-right", setup.margins.right, 0, 25, ".01"))}
          ${field(t("sheetDialogs.pageSetup.marginHeader"), numberInput("vno-sheet-margin-header", setup.margins.header, 0, 25, ".01"))}
          ${field(t("sheetDialogs.pageSetup.marginFooter"), numberInput("vno-sheet-margin-footer", setup.margins.footer, 0, 25, ".01"))}
        </div>
        <fieldset><legend>${t("sheetDialogs.pageSetup.centerOnPage")}</legend>
          <label><input id="vno-sheet-center-horizontal" type="checkbox"${checked(setup.centerOnPage.horizontal)}> ${t("sheetDialogs.pageSetup.horizontally")}</label>
          <label><input id="vno-sheet-center-vertical" type="checkbox"${checked(setup.centerOnPage.vertical)}> ${t("sheetDialogs.pageSetup.vertically")}</label>
        </fieldset>
      </section>`;
    const headerFooterEditor = kind => `<div class="vno-ps-hf-editor" data-editor="${kind}" hidden>
      ${["left", "center", "right"].map(position => field(t(`sheetDialogs.pageSetup.${position}`), `<input id="vno-sheet-${kind}-${position}" class="vno-dialog-input" maxlength="500" value="${esc(hf[kind]?.[position] || "")}">`)).join("")}
      <small>${t("sheetDialogs.pageSetup.dynamicCodesHint")}</small>
    </div>`;
    const presetOptions = kind => `<option value="custom">${t("sheetDialogs.pageSetup.presetCustom")}</option><option value="none">${t("sheetDialogs.pageSetup.presetNone")}</option><option value="page">${t("sheetDialogs.pageSetup.presetPage")}</option><option value="pages">${t("sheetDialogs.pageSetup.presetPages")}</option><option value="sheet">${t("sheetDialogs.pageSetup.presetSheet")}</option><option value="file">${t("sheetDialogs.pageSetup.presetFile")}</option><option value="date">${t("sheetDialogs.pageSetup.presetDate")}</option>`;
    const headerFooterPanel = `
      <section id="vno-ps-panel-headerFooter" class="vno-ps-panel" role="tabpanel" aria-labelledby="vno-ps-tab-headerFooter">
        <fieldset><legend>${t("sheetDialogs.pageSetup.header")}</legend>
          <div class="vno-ps-hf-row"><select id="vno-sheet-header-preset" class="vno-select" data-kind="header">${presetOptions("header")}</select><button type="button" class="vno-btn vno-ps-custom-hf" data-kind="header">${t("sheetDialogs.pageSetup.customHeader")}</button></div>
          ${headerFooterEditor("header")}
        </fieldset>
        <fieldset><legend>${t("sheetDialogs.pageSetup.footer")}</legend>
          <div class="vno-ps-hf-row"><select id="vno-sheet-footer-preset" class="vno-select" data-kind="footer">${presetOptions("footer")}</select><button type="button" class="vno-btn vno-ps-custom-hf" data-kind="footer">${t("sheetDialogs.pageSetup.customFooter")}</button></div>
          ${headerFooterEditor("footer")}
        </fieldset>
        <div class="vno-ps-check-grid">
          <label><input id="vno-sheet-hf-odd-even" type="checkbox"${checked(hf.differentOddEven)}> ${t("sheetDialogs.pageSetup.differentOddEven")}</label>
          <label><input id="vno-sheet-hf-first" type="checkbox"${checked(hf.differentFirst)}> ${t("sheetDialogs.pageSetup.differentFirst")}</label>
          <label><input id="vno-sheet-hf-scale" type="checkbox"${checked(hf.scaleWithDocument !== false)}> ${t("sheetDialogs.pageSetup.scaleWithDocument")}</label>
          <label><input id="vno-sheet-hf-align" type="checkbox"${checked(hf.alignWithMargins !== false)}> ${t("sheetDialogs.pageSetup.alignWithMargins")}</label>
        </div>
      </section>`;
    const sheetPanel = `
      <section id="vno-ps-panel-sheet" class="vno-ps-panel" role="tabpanel" aria-labelledby="vno-ps-tab-sheet">
        <fieldset><legend>${t("sheetDialogs.pageSetup.printAreaAndTitles")}</legend>
          ${field(t("sheetDialogs.pageSetup.printArea"), picker("vno-sheet-print-area", values.printArea, t("sheetDialogs.pageSetup.pickPrintArea")))}
          ${field(t("sheetDialogs.pageSetup.rowsToRepeat"), picker("vno-sheet-title-rows", values.rows, t("sheetDialogs.pageSetup.pickRows")))}
          ${field(t("sheetDialogs.pageSetup.colsToRepeat"), picker("vno-sheet-title-cols", values.cols, t("sheetDialogs.pageSetup.pickCols")))}
        </fieldset>
        <fieldset><legend>${t("sheetDialogs.pageSetup.print")}</legend>
          <div class="vno-ps-check-grid">
            <label><input id="vno-sheet-print-gridlines" type="checkbox"${checked(setup.printOptions.gridlines)}> ${t("sheetDialogs.printGridlines")}</label>
            <label><input id="vno-sheet-print-black-white" type="checkbox"${checked(setup.printOptions.blackAndWhite)}> ${t("sheetDialogs.pageSetup.blackAndWhite")}</label>
            <label><input id="vno-sheet-print-draft" type="checkbox"${checked(setup.printOptions.draft)}> ${t("sheetDialogs.pageSetup.draftQuality")}</label>
            <label><input id="vno-sheet-print-headings" type="checkbox"${checked(setup.printOptions.headings)}> ${t("sheetDialogs.printHeadings")}</label>
          </div>
          <div class="vno-ps-grid-two">
            ${field(t("sheetDialogs.printComments"), `<select id="vno-sheet-print-comments" class="vno-select"><option value="none"${selected("none", setup.printOptions.comments)}>${t("sheetDialogs.commentsNone")}</option><option value="sheetEnd"${selected("sheetEnd", setup.printOptions.comments)}>${t("sheetDialogs.commentsAtEnd")}</option><option value="asDisplayed"${selected("asDisplayed", setup.printOptions.comments)}>${t("sheetDialogs.commentsAsDisplayed")}</option></select>`)}
            ${field(t("sheetDialogs.cellErrors"), `<select id="vno-sheet-print-cell-errors" class="vno-select"><option value="displayed"${selected("displayed", setup.printOptions.cellErrors)}>${t("sheetDialogs.errorsDisplayed")}</option><option value="blank"${selected("blank", setup.printOptions.cellErrors)}>${t("sheetDialogs.errorsBlank")}</option><option value="dash"${selected("dash", setup.printOptions.cellErrors)}>${t("sheetDialogs.errorsDash")}</option><option value="na"${selected("na", setup.printOptions.cellErrors)}>${t("sheetDialogs.errorsNa")}</option></select>`)}
          </div>
        </fieldset>
        <fieldset><legend>${t("sheetDialogs.pageOrder")}</legend>
          <label><input id="vno-sheet-order-down-over" type="radio" name="vno-sheet-print-page-order" value="downThenOver"${checked(setup.printOptions.pageOrder === "downThenOver")}> ${t("sheetDialogs.orderDownThenOver")}</label>
          <label><input id="vno-sheet-order-over-down" type="radio" name="vno-sheet-print-page-order" value="overThenDown"${checked(setup.printOptions.pageOrder === "overThenDown")}> ${t("sheetDialogs.orderOverThenDown")}</label>
        </fieldset>
      </section>`;
    const overlay = grid._createSheetDialog(t("sheetDialogs.pageSetup.title"), `<div class="vno-ps-tabs vno-fc-tabs" role="tablist">${tabs}</div><div class="vno-ps-panels">${pagePanel}${marginsPanel}${headerFooterPanel}${sheetPanel}</div><div class="vno-rule-error" role="alert"></div>`);
    if (!overlay) return false;
    overlay.classList.add("vno-page-setup-dialog");
    overlay.querySelector(".vno-dialog-box")?.classList.add("vno-page-setup-box");

    const activateTab = (id, moveFocus = false) => {
      if (!TABS.includes(id)) return;
      overlay.querySelectorAll(".vno-ps-tab").forEach(button => {
        const active = button.dataset.tab === id;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
        if (active && moveFocus) button.focus();
      });
      overlay.querySelectorAll(".vno-ps-panel").forEach(panel => { panel.hidden = panel.id !== `vno-ps-panel-${id}`; });
    };
    overlay.querySelectorAll(".vno-ps-tab").forEach(button => {
      button.addEventListener("click", () => activateTab(button.dataset.tab));
      button.addEventListener("keydown", event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const current = TABS.indexOf(button.dataset.tab);
        const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
        activateTab(TABS[next], true);
      });
    });
    activateTab(initialTab);

    const syncScale = () => {
      const mode = overlay.querySelector('[name="vno-sheet-scale-mode"]:checked')?.value || "percent";
      overlay.querySelector("#vno-sheet-scale-percent").disabled = mode !== "percent";
      overlay.querySelector("#vno-sheet-scale-wide").disabled = mode !== "pages";
      overlay.querySelector("#vno-sheet-scale-tall").disabled = mode !== "pages";
    };
    overlay.querySelectorAll('[name="vno-sheet-scale-mode"]').forEach(input => input.addEventListener("change", syncScale));
    syncScale();

    overlay.querySelectorAll(".vno-ps-custom-hf").forEach(button => button.addEventListener("click", () => {
      const editor = overlay.querySelector(`[data-editor="${button.dataset.kind}"]`);
      editor.hidden = !editor.hidden;
      if (!editor.hidden) editor.querySelector("input")?.focus();
    }));
    overlay.querySelectorAll(".vno-ps-hf-row select").forEach(select => select.addEventListener("change", event => {
      const kind = event.target.dataset.kind;
      if (event.target.value === "custom") {
        const editor = overlay.querySelector(`[data-editor="${kind}"]`);
        editor.hidden = false;
        editor.querySelector("input")?.focus();
        return;
      }
      const value = presetValue(kind, event.target.value);
      if (value === undefined) return;
      ["left", "center", "right"].forEach(position => { overlay.querySelector(`#vno-sheet-${kind}-${position}`).value = position === "center" ? value : ""; });
    }));

    const pick = (buttonId, selectionField) => overlay.querySelector(buttonId)?.addEventListener("click", () => grid.beginPageSetupRangeSelection(selectionField, overlay));
    pick("#vno-sheet-print-area-pick", "area");
    pick("#vno-sheet-title-rows-pick", "rows");
    pick("#vno-sheet-title-cols-pick", "cols");
    const clearPending = () => { grid._printTitleSelect = null; };
    overlay.querySelector(".vno-rule-cancel")?.addEventListener("click", clearPending);
    overlay.querySelector(".vno-rule-close")?.addEventListener("click", clearPending);

    overlay.querySelector(".vno-rule-apply").addEventListener("click", () => {
      const readHeaderFooter = kind => Object.fromEntries(["left", "center", "right"].map(position => [position, overlay.querySelector(`#vno-sheet-${kind}-${position}`).value]));
      const autoText = t("sheetDialogs.pageSetup.automatic", "Tự động").trim().toLocaleLowerCase();
      const rawFirstPage = overlay.querySelector("#vno-sheet-first-page-number").value.trim();
      const firstPageNumber = !rawFirstPage || rawFirstPage.toLocaleLowerCase() === autoText || rawFirstPage.toLowerCase() === "auto" ? "auto" : Number(rawFirstPage);
      const result = grid.setPageSetup({
        margins: Object.fromEntries(["top", "bottom", "left", "right", "header", "footer"].map(side => [side, overlay.querySelector(`#vno-sheet-margin-${side}`).value])),
        orientation: overlay.querySelector('[name="vno-sheet-orientation"]:checked')?.value,
        size: overlay.querySelector("#vno-sheet-size").value,
        scale: {
          mode: overlay.querySelector('[name="vno-sheet-scale-mode"]:checked')?.value,
          percent: overlay.querySelector("#vno-sheet-scale-percent").value,
          pagesWide: overlay.querySelector("#vno-sheet-scale-wide").value,
          pagesTall: overlay.querySelector("#vno-sheet-scale-tall").value
        },
        pageSettings: { printQuality: overlay.querySelector("#vno-sheet-print-quality").value, firstPageNumber },
        headerFooter: {
          header: readHeaderFooter("header"), footer: readHeaderFooter("footer"),
          differentOddEven: overlay.querySelector("#vno-sheet-hf-odd-even").checked,
          differentFirst: overlay.querySelector("#vno-sheet-hf-first").checked,
          scaleWithDocument: overlay.querySelector("#vno-sheet-hf-scale").checked,
          alignWithMargins: overlay.querySelector("#vno-sheet-hf-align").checked
        },
        centerOnPage: { horizontal: overlay.querySelector("#vno-sheet-center-horizontal").checked, vertical: overlay.querySelector("#vno-sheet-center-vertical").checked },
        printOptions: {
          gridlines: overlay.querySelector("#vno-sheet-print-gridlines").checked,
          blackAndWhite: overlay.querySelector("#vno-sheet-print-black-white").checked,
          draft: overlay.querySelector("#vno-sheet-print-draft").checked,
          headings: overlay.querySelector("#vno-sheet-print-headings").checked,
          comments: overlay.querySelector("#vno-sheet-print-comments").value,
          cellErrors: overlay.querySelector("#vno-sheet-print-cell-errors").value,
          pageOrder: overlay.querySelector('[name="vno-sheet-print-page-order"]:checked')?.value
        },
        printTitles: { rows: overlay.querySelector("#vno-sheet-title-rows").value, cols: overlay.querySelector("#vno-sheet-title-cols").value }
      });
      const error = overlay.querySelector(".vno-rule-error");
      if (!result) {
        error.textContent = grid._lastPageSetupError || t("sheetDialogs.pageSetup.invalidValue");
        return;
      }
      const area = overlay.querySelector("#vno-sheet-print-area").value.trim().replace(/\$/g, "").toUpperCase();
      const areaResult = area ? grid.setPrintArea({ range: area }) : (grid.printAreaBySheet?.[grid.activeSheet] ? grid.clearPrintArea() : true);
      if (!areaResult) {
        error.textContent = t("sheetDialogs.pageSetup.invalidPrintArea");
        return;
      }
      grid._printTitleSelect = null;
      overlay.closeDialog();
    });
    overlay.querySelector(`#${focusId(focusField)}`)?.focus();
    return true;
  }
}
