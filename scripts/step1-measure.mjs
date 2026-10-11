import fs from "node:fs/promises";
import path from "node:path";
import { launchApp, repoRoot } from "../tests/live/cdp/session.mjs";
import { sleep } from "../tests/live/cdp/client.mjs";

const COMBINATIONS = [
  { width: 1280, height: 720, scale: 1.0, label: "1280x720-1.0" },
  { width: 1366, height: 768, scale: 1.25, label: "1366x768-1.25" },
  { width: 1366, height: 768, scale: 1.5, label: "1366x768-1.5" },
  { width: 1920, height: 1080, scale: 1.25, label: "1920x1080-1.25" },
  { width: 1920, height: 1080, scale: 1.5, label: "1920x1080-1.5" },
];

const LOCALAPPDATA = "E:\\VNOffice-profiles\\agy-overlap";
const OUT_DIR = path.resolve(repoRoot, "docs/diag-overlap");

const DETECT_FN = `(() => {
  const issues = [];

  function describeEl(el) {
    if (!el) return "";
    const id = el.id ? "#" + el.id : "";
    const cls = el.className && typeof el.className === "string" 
      ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".") 
      : "";
    const cmd = el.getAttribute("data-command-id") ? "[cmd=" + el.getAttribute("data-command-id") + "]" : "";
    const grp = el.getAttribute("data-group-id") ? "[grp=" + el.getAttribute("data-group-id") + "]" : "";
    const coord = el.getAttribute("data-coord") ? "[coord=" + el.getAttribute("data-coord") + "]" : "";
    const text = (el.innerText || el.textContent || "").trim().slice(0, 30).replace(/\\s+/g, " ");
    return el.tagName.toLowerCase() + id + cls + cmd + grp + coord + (text ? ' ("' + text + '")' : "");
  }

  // 1. Cặp anh em cùng cấp giao nhau > 2px
  const siblingContainers = [
    ".vno-topbar",
    ".vno-topbar-left",
    ".vno-topbar-right",
    ".vno-quick-tools",
    ".vno-ribbon-tabs",
    ".vno-ribbon-content",
    ".vno-ribbon-group",
    ".vno-ribbon-group-items",
    ".vno-ribbon-group-column",
    ".vno-ribbon-group-row",
    ".vno-formula-bar",
    ".vno-formula-actions",
    ".vno-status-bar",
    ".vno-statusbar",
    ".vno-sheet-tabs-container",
    ".vno-sheet-tabs-bar",
    ".vno-context-menu",
    ".vno-menu",
    ".vno-dropdown-menu"
  ];

  const checkedContainers = document.querySelectorAll(siblingContainers.join(", "));
  checkedContainers.forEach(container => {
    const children = Array.from(container.children).filter(child => {
      const style = window.getComputedStyle(child);
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
      const rect = child.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        const a = children[i];
        const b = children[j];
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();

        const overlapX = Math.min(rA.right, rB.right) - Math.max(rA.left, rB.left);
        const overlapY = Math.min(rA.bottom, rB.bottom) - Math.max(rA.top, rB.top);

        if (overlapX > 2 && overlapY > 2) {
          issues.push({
            type: "sibling_overlap",
            container: describeEl(container),
            elementA: describeEl(a),
            elementB: describeEl(b),
            overlapPx: { x: Math.round(overlapX), y: Math.round(overlapY) },
            rectA: { x: Math.round(rA.left), y: Math.round(rA.top), w: Math.round(rA.width), h: Math.round(rA.height) },
            rectB: { x: Math.round(rB.left), y: Math.round(rB.top), w: Math.round(rB.width), h: Math.round(rB.height) }
          });
        }
      }
    }
  });

  // 2. Nội dung UI bị cắt (scrollWidth > clientWidth với overflow hidden)
  const clippedCandidates = document.querySelectorAll(
    ".vno-ribbon-btn-large, .vno-ribbon-btn-small, .vno-btn, .vno-btn-label, " +
    ".vno-ribbon-tab, .vno-ribbon-group-label, .vno-name-box, .vno-formula-input, " +
    ".vno-status-item, .vno-sheet-tab, .vno-sheet-tab-name"
  );

  clippedCandidates.forEach(el => {
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const isHiddenX = style.overflowX === "hidden" || style.overflowX === "clip" || style.textOverflow === "ellipsis";
    const cutX = el.scrollWidth - el.clientWidth;

    if (isHiddenX && cutX > 2) {
      issues.push({
        type: "clipped_content_x",
        element: describeEl(el),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        cutPx: cutX,
        text: (el.innerText || el.textContent || "").trim().slice(0, 40)
      });
    }
  });

  // 3. Chữ bị tràn ra ngoài nút
  const buttons = document.querySelectorAll("button, .vno-btn, .vno-ribbon-btn-large, .vno-ribbon-btn-small");
  buttons.forEach(btn => {
    const style = window.getComputedStyle(btn);
    if (style.display === "none" || style.visibility === "hidden") return;
    const btnRect = btn.getBoundingClientRect();
    if (btnRect.width <= 0 || btnRect.height <= 0) return;

    Array.from(btn.children).forEach(child => {
      const cStyle = window.getComputedStyle(child);
      if (cStyle.display === "none" || cStyle.visibility === "hidden") return;
      const cRect = child.getBoundingClientRect();
      if (cRect.width <= 0 || cRect.height <= 0) return;

      const overflowRight = cRect.right - btnRect.right;
      const overflowLeft = btnRect.left - cRect.left;
      const overflowBottom = cRect.bottom - btnRect.bottom;
      const overflowTop = btnRect.top - cRect.top;

      if (overflowRight > 2 || overflowLeft > 2 || overflowBottom > 2 || overflowTop > 2) {
        issues.push({
          type: "text_overflow_button",
          button: describeEl(btn),
          child: describeEl(child),
          overflow: {
            right: Math.round(Math.max(0, overflowRight)),
            left: Math.round(Math.max(0, overflowLeft)),
            bottom: Math.round(Math.max(0, overflowBottom)),
            top: Math.round(Math.max(0, overflowTop))
          },
          text: (child.innerText || child.textContent || "").trim().slice(0, 40)
        });
      }
    });
  });

  // 4. Các ô lưới Sheet bị cắt chữ (đặc biệt là ô ngày tháng / số)
  const visibleCells = document.querySelectorAll(".vno-grid-cell[data-coord]");
  visibleCells.forEach(cell => {
    const style = window.getComputedStyle(cell);
    if (style.display === "none" || style.visibility === "hidden") return;
    const rect = cell.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const cutX = cell.scrollWidth - cell.clientWidth;
    if (cutX > 2) {
      issues.push({
        type: "clipped_grid_cell",
        element: describeEl(cell),
        coord: cell.getAttribute("data-coord"),
        scrollWidth: cell.scrollWidth,
        clientWidth: cell.clientWidth,
        cutPx: cutX,
        text: (cell.innerText || cell.textContent || "").trim()
      });
    }
  });

  return issues;
})()`;

async function measureApp(appKind, fileLabel, options = {}) {
  console.log(`Starting ${appKind} (${fileLabel})...`);
  const session = await launchApp(appKind, {
    localAppData: LOCALAPPDATA,
    filePath: options.filePath,
  });

  try {
    if (options.filePath) {
      // Chờ bảng tính nạp xong
      await session.cdp.waitFor(
        "(() => { const a = window.__vnoAppInstance?.adapter || window.__vnoAppInstance;"
        + " return !!document.querySelector('.vno-grid-cell[data-coord]'); })()",
        { timeoutMilliseconds: 45000, intervalMilliseconds: 500 }
      );
      await sleep(2000);
    } else {
      await sleep(1500);
    }

    for (const combo of COMBINATIONS) {
      const { width, height, scale, label } = combo;
      console.log(`  Metrics override: ${width}x${height}@${scale}`);
      await session.cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: scale,
        mobile: false,
      });

      await sleep(700);

      // Screenshot
      const screenshotRes = await session.cdp.send("Page.captureScreenshot", { format: "png" });
      const base64Data = screenshotRes.result?.data || screenshotRes.data;
      if (!base64Data) {
        throw new Error("Page.captureScreenshot did not return data: " + JSON.stringify(screenshotRes));
      }
      const imgPath = path.join(OUT_DIR, `${fileLabel}-${label}.png`);
      await fs.writeFile(imgPath, Buffer.from(base64Data, "base64"));

      // Detection
      const issues = await session.cdp.evaluate(DETECT_FN);
      const jsonPath = path.join(OUT_DIR, `${fileLabel}-${label}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(issues, null, 2), "utf8");

      console.log(`  -> ${fileLabel}-${label}: ${issues.length} issues recorded`);
    }
  } finally {
    console.log(`Closing ${appKind}...`);
    await session.close();
    await sleep(2000);
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  // 1. Writer
  await measureApp("writer", "writer");

  // 2. Sheet (blank)
  await measureApp("sheet", "sheet");

  // 3. Sheet (ton-kho-3t.xlsx)
  const realFile = path.resolve(repoRoot, "tests/fixtures/ton-kho-3t.xlsx");
  await measureApp("sheet", "sheet-tonkho", { filePath: realFile });

  // 4. Slides
  await measureApp("slides", "slides");

  console.log("ALL MEASUREMENTS COMPLETE!");
}

main().catch(err => {
  console.error("FATAL ERROR in measureApp:", err);
  process.exit(1);
});
