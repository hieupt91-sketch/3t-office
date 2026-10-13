import { launchApp } from "./session.mjs";
import { click, press, sleep, typeText } from "./actions.mjs";

const checks = [];
const check = (name, passed, detail = "") => {
  checks.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const session = await launchApp("sheet", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);

async function openTab(tabId) {
  await click(cdp, `#vno-ribbon-tab-${tabId}`);
}

async function clickCommand(commandId) {
  const selector = `[data-command-id="${commandId}"]`;
  const index = await cdp.evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(node => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }))()`);
  if (index < 0) throw new Error(`No visible ribbon button for ${commandId}`);
  await click(cdp, selector, index);
}

async function visibleCommandState(commandId) {
  return cdp.evaluate(`(() => {
    const selector = ${JSON.stringify(`[data-command-id="${commandId}"]`)};
    const node = [...document.querySelectorAll(selector)].find(item => {
      const rect = item.getBoundingClientRect();
      const style = getComputedStyle(item);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const label = node?.querySelector(".vno-btn-label");
    const labelStyle = label ? getComputedStyle(label) : null;
    const labelRect = label?.getBoundingClientRect();
    return node ? {
      pressed:node.getAttribute("aria-pressed"), active:node.classList.contains("is-checked"), text:node.innerText.trim(), buttonClass:node.className,
      group:node.closest(".vno-ribbon-group")?.className || "", labelText:label?.textContent.trim() || "",
      labelDisplay:labelStyle?.display || "", labelVisibility:labelStyle?.visibility || "",
      labelSize:labelRect ? [labelRect.width,labelRect.height] : null
    } : null;
  })()`);
}

async function isDialogOpen() {
  return cdp.evaluate("!!document.querySelector('.vno-func-dialog')");
}

async function closeWithEscape() {
  await press(cdp, "Escape", {}, 250);
}

function contrastRatio(foreground, background) {
  const luminance = color => {
    const values = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  };
  const l1 = luminance(foreground), l2 = luminance(background);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

try {
  await sleep(700);
  await openTab("formulas");
  await clickCommand("sheet.formula.insertFunction");
  check("Chèn hàm mở bằng ribbon", await isDialogOpen());
  await closeWithEscape();
  const functionClose = await cdp.evaluate(`({open:!!document.querySelector('.vno-func-dialog'), focus:document.activeElement?.className || document.activeElement?.id || document.activeElement?.tagName})`);
  check("Esc đóng Chèn hàm và trả focus về lưới", !functionClose.open && String(functionClose.focus).includes("vno-sheet-container"), JSON.stringify(functionClose));
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "F3", code: "F3", windowsVirtualKeyCode: 114, modifiers: 8 });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "F3", code: "F3", windowsVirtualKeyCode: 114, modifiers: 8 });
  await sleep(300);
  check("Shift+F3 mở Chèn hàm", await isDialogOpen());
  await closeWithEscape();

  const categories = [
    ["Financial", "Tài chính"], ["Logical", "Logic"], ["Text", "Văn bản"],
    ["DateTime", "Ngày tháng"], ["Lookup", "Tra cứu"], ["Math", "Toán học"]
  ];
  for (const [suffix, expected] of categories) {
    await clickCommand(`sheet.formula.category${suffix}`);
    const actual = await cdp.evaluate("document.querySelector('#vno-func-cat-select')?.value || ''");
    check(`Thư viện hàm ${expected} mở danh mục đã lọc`, actual === expected, actual);
    await closeWithEscape();
  }
  await clickCommand("sheet.formula.watchWindow");
  check("Cửa sổ theo dõi mở", await cdp.evaluate("!!document.querySelector('#vno-watch-window')"));
  await closeWithEscape();
  await openTab("data");
  await clickCommand("sheet.data.customSort");
  const sortNotice = await cdp.evaluate("document.querySelector('.vno-data-result')?.innerText || ''");
  check("Sắp xếp tùy chỉnh báo lý do khi vùng chỉ có một hàng", sortNotice.includes("ít nhất hai hàng"), sortNotice);
  await closeWithEscape();

  await clickCommand("sheet.data.customSort");
  const sortLabel = await cdp.evaluate(`document.querySelector('[data-command-id="sheet.data.customSort"]')?.innerText.trim() || ''`);
  check("Nút Sắp xếp tùy chỉnh có nhãn chữ", sortLabel.includes("Sắp xếp tùy chỉnh"), sortLabel);
  await closeWithEscape();

  await openTab("home");
  const labelChecks = {};
  const labelsByTab = {
    home: ["sheet.cell.mergeCenter", "sheet.format.currencyVND", "sheet.format.increaseDecimal", "sheet.format.decreaseDecimal", "sheet.format.cellsDialog"],
    data: ["sheet.data.sortAsc", "sheet.data.sortDesc"],
    insert: ["sheet.insert.textbox"],
    pageLayout: ["sheet.page.size"],
    view: ["sheet.view.pageBreakPreview", "sheet.view.zoomReset"]
  };
  for (const [tabId, ids] of Object.entries(labelsByTab)) {
    await openTab(tabId);
    for (const id of ids) labelChecks[id] = (await visibleCommandState(id))?.text || "";
  }
  const duplicates = Object.entries(labelChecks).filter(([_, value]) => /^(?:a\s|a4\s|100%\s|100\s|trang 1\s|₫\s|12\s|9,9\s|\.0\s|\.00\s|a z\s|z a\s)/i.test(value));
  check("Nhãn ribbon không lặp chữ từ icon", duplicates.length === 0, JSON.stringify({ labels: labelChecks, duplicates }));
  await openTab("home");
  const labelledControls = {};
  for (const [groupId, ids] of Object.entries({
    styles: ["sheet.style.formatAsTable", "sheet.style.cellStyles"],
    cells: ["sheet.row.insert", "sheet.col.insert", "sheet.row.delete", "sheet.col.delete"]
  })) {
    const collapsed = await cdp.evaluate(`document.querySelector('[data-group-id="${groupId}"]')?.classList.contains('vno-group-collapsed') || false`);
    if (collapsed) await click(cdp, `[data-group-id="${groupId}"] .vno-ribbon-group-collapsed-btn`);
    for (const id of ids) labelledControls[id] = await visibleCommandState(id);
  }
  check("Nút Định dạng bảng, Kiểu ô và Chèn/Xóa hàng cột có nhãn", Object.values(labelledControls).every(value => value?.text?.length > 0 || (/vno-group-icon-only/.test(value?.group || "") && value?.labelText?.length > 0)), JSON.stringify(labelledControls));

  await click(cdp, '.vno-grid-cell[data-coord="A1"]');
  await typeText(cdp, "demo");
  await press(cdp, "Enter");
  await press(cdp, "b", { ctrl: true });
  await sleep(150);
  let toggleState = await visibleCommandState("sheet.cell.bold");
  check("Ctrl+B cập nhật trạng thái nút In đậm", toggleState.pressed === "true" && toggleState.active, JSON.stringify(toggleState));
  await clickCommand("sheet.cell.bold");
  toggleState = await visibleCommandState("sheet.cell.bold");
  check("Bấm In đậm cập nhật trạng thái tắt", toggleState.pressed === "false" && !toggleState.active, JSON.stringify(toggleState));

  await openTab("formulas");
  await clickCommand("sheet.formula.showFormulas");
  let showState = await visibleCommandState("sheet.formula.showFormulas");
  check("Hiện công thức bật aria-pressed/is-checked", showState.pressed === "true" && showState.active, JSON.stringify(showState));
  await clickCommand("sheet.formula.showFormulas");
  showState = await visibleCommandState("sheet.formula.showFormulas");
  check("Hiện công thức tắt aria-pressed/is-checked", showState.pressed === "false" && !showState.active, JSON.stringify(showState));

  await openTab("review");
  await sleep(700);
  let spellState = await visibleCommandState("sheet.review.toggleSpellCheck");
  const initialSpellEnabled = spellState.pressed === "true" && spellState.active;
  await clickCommand("sheet.review.toggleSpellCheck");
  spellState = await visibleCommandState("sheet.review.toggleSpellCheck");
  const spellToggledOnce = (spellState.pressed === "true" && spellState.active) !== initialSpellEnabled;
  check("Kiểm tra chính tả cập nhật aria-pressed/is-checked sau khi bấm", spellToggledOnce, JSON.stringify({ initialSpellEnabled, afterClick: spellState }));
  await clickCommand("sheet.review.toggleSpellCheck");
  spellState = await visibleCommandState("sheet.review.toggleSpellCheck");
  check("Kiểm tra chính tả khôi phục trạng thái sau lần bấm thứ hai", (spellState.pressed === "true" && spellState.active) === initialSpellEnabled, JSON.stringify({ initialSpellEnabled, afterSecondClick: spellState }));
  const proofingLabel = await cdp.evaluate(`document.querySelector('[data-group-id="proofing"]')?.getAttribute('data-group-label') || ''`);
  check("Nhóm Xem xét dùng nhãn Kiểm lỗi", proofingLabel === "Kiểm lỗi", proofingLabel);

  await cdp.evaluate("document.documentElement.setAttribute('data-theme','dark')");
  await openTab("home");
  await click(cdp, '.vno-grid-cell[data-coord="A1"]');
  await press(cdp, "1", { ctrl: true });
  await sleep(350);
  const formatDialogOpen = await cdp.evaluate("!!document.querySelector('.vno-format-cells-overlay')");
  check("Hộp thoại Định dạng ô mở trong dark mode", formatDialogOpen);
  const tabColors = await cdp.evaluate(`(() => {
    const tab = document.querySelector('.vno-format-cells-overlay .vno-fc-tab.is-active');
    const title = document.querySelector('#vno-fc-dialog-title');
    const titleStyle = title ? getComputedStyle(title) : null;
    return {
      tabFg:tab ? getComputedStyle(tab).color : "",
      tabBg:tab ? getComputedStyle(tab).backgroundColor : "",
      titleFg:titleStyle?.color || "",
      titleBg:title?.parentElement?.parentElement ? getComputedStyle(title.parentElement.parentElement).backgroundColor : ""
    };
  })()`);
  const activeTabContrast = tabColors.tabFg && tabColors.tabBg ? contrastRatio(tabColors.tabFg, tabColors.tabBg) : 0;
  check("Tab Định dạng ô ở dark mode đạt tương phản 4.5:1", activeTabContrast >= 4.5, `${activeTabContrast.toFixed(2)}:1 ${JSON.stringify(tabColors)}`);
  await closeWithEscape();

  const failed = checks.filter(item => !item.passed);
  console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS, ${failed.length} FAIL`);
  if (failed.length) process.exitCode = 1;
} finally {
  await session.close();
}
