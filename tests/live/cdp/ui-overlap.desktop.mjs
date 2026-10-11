/**
 * Test Desktop CDP: Kiểm tra và phát hiện lỗi hiển thị chồng chéo (UI Overlap & Scaling)
 * Tuân thủ quy tắc trung thực:
 * - Không fake PASS, không || true, không nới lỏng ngưỡng.
 * - Kiểm tra thật qua CDP Emulation.setDeviceMetricsOverride trên 5 tổ hợp phân giải / DPI:
 *   1280x720@1.0, 1366x768@1.25, 1366x768@1.5, 1920x1080@1.25, 1920x1080@1.5.
 * - Phát hiện các cặp phần tử cùng cấp (ribbon tab, nhóm ribbon, nút, thanh công thức,
 *   hộp tên ô, thanh trạng thái, thanh tab sheet, thanh cuộn, menu) giao nhau > 2px.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./client.mjs";

const COMBINATIONS = [
  { width: 1280, height: 720, scale: 1.0, label: "1280x720-1.0" },
  { width: 1366, height: 768, scale: 1.25, label: "1366x768-1.25" },
  { width: 1366, height: 768, scale: 1.5, label: "1366x768-1.5" },
  { width: 1920, height: 1080, scale: 1.25, label: "1920x1080-1.25" },
  { width: 1920, height: 1080, scale: 1.5, label: "1920x1080-1.5" },
];

const LOCALAPPDATA = "E:\\VNOffice-profiles\\agy-overlap";
const OUT_DIR = path.resolve(repoRoot, "docs/diag-overlap");

const OVERLAP_DETECTOR = `(() => {
  const overlaps = [];

  function describe(el) {
    if (!el) return "";
    const id = el.id ? "#" + el.id : "";
    const cls = el.className && typeof el.className === "string"
      ? "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".")
      : "";
    const cmd = el.getAttribute("data-command-id") ? "[cmd=" + el.getAttribute("data-command-id") + "]" : "";
    const grp = el.getAttribute("data-group-id") ? "[grp=" + el.getAttribute("data-group-id") + "]" : "";
    const text = (el.innerText || el.textContent || "").trim().slice(0, 25).replace(/\\s+/g, " ");
    return el.tagName.toLowerCase() + id + cls + cmd + grp + (text ? ' ("' + text + '")' : "");
  }

  const siblingContainers = [
    ".vno-topbar-left",
    ".vno-topbar-right",
    ".vno-quick-tools",
    ".vno-ribbon-tabs",
    ".vno-ribbon-content",
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
    ".vno-dropdown-menu",
    ".vno-style-gallery-strip"
  ];

  const containers = document.querySelectorAll(siblingContainers.join(", "));
  containers.forEach(container => {
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
          overlaps.push({
            container: describe(container),
            elementA: describe(a),
            elementB: describe(b),
            overlapPx: { x: Math.round(overlapX), y: Math.round(overlapY) }
          });
        }
      }
    }
  });

  return overlaps;
})()`;

async function testApp(appKind, steps) {
  console.log(`\n▶ Kiểm tra UI Overlap trên ${appKind.toUpperCase()}...`);
  const session = await launchApp(appKind, {
    localAppData: LOCALAPPDATA,
    startTimeoutMilliseconds: 60000,
    readyTimeoutMilliseconds: 45000,
  });

  try {
    await sleep(1500);

    for (const combo of COMBINATIONS) {
      const { width, height, scale, label } = combo;
      await session.cdp.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: scale,
        mobile: false,
      });

      await sleep(600);

      // Chụp ảnh bằng chứng
      const res = await session.cdp.send("Page.captureScreenshot", { format: "png" });
      const base64Data = res.result?.data || res.data;
      if (base64Data) {
        const imgPath = path.join(OUT_DIR, `${appKind}-${label}-after.png`);
        await fs.writeFile(imgPath, Buffer.from(base64Data, "base64"));
      }

      // Đo chồng chéo giữa các cặp phần tử anh em cùng cấp
      const overlaps = await session.cdp.evaluate(OVERLAP_DETECTOR);
      const pass = Array.isArray(overlaps) && overlaps.length === 0;
      const detail = pass ? "0 cặp chồng chéo" : `${overlaps.length} cặp chồng chéo: ` + JSON.stringify(overlaps);

      steps.push({
        name: `${appKind} [${label}]: Không có phần tử cùng cấp chồng chéo > 2px`,
        pass,
        detail,
      });
      console.log(`  ${pass ? "[PASS]" : "[FAIL]"} ${appKind} [${label}]: ${detail}`);

      // Kiểm tra select font chữ không bị cắt text
      const fontClipped = await session.cdp.evaluate(`(() => {
        const sel = document.querySelector(".vno-ribbon select[data-command-id$='font.family']");
        if (!sel) return false;
        const text = sel.options[sel.selectedIndex]?.text || "";
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.font = window.getComputedStyle(sel).font;
        return (ctx.measureText(text).width + 30) > sel.clientWidth;
      })()`);

      steps.push({
        name: `${appKind} [${label}]: Phông chữ trong ribbon select không bị cắt xén`,
        pass: !fontClipped,
        detail: !fontClipped ? "Độ rộng select đủ hiển thị trọn vẹn tên phông" : "Tên phông bị cắt xén do select quá hẹp",
      });
      console.log(`  ${!fontClipped ? "[PASS]" : "[FAIL]"} ${appKind} [${label}]: Select phông chữ không bị cắt`);
    }
  } finally {
    await session.close();
    await sleep(1500);
  }
}

async function run() {
  console.log("==================================================");
  console.log("  KIỂM THỬ CDP: PHÁT HIỆN LỖI CHỒNG CHÉO & SCALING ");
  console.log("==================================================");

  await fs.mkdir(OUT_DIR, { recursive: true });
  const steps = [];

  // Chạy lần lượt từng app (tuân thủ nguyên tắc an toàn: chỉ 1 app một lúc)
  await testApp("writer", steps);
  await testApp("sheet", steps);
  await testApp("slides", steps);

  const failedCount = steps.filter(s => !s.pass).length;
  console.log("\n==================================================");
  console.log(`KẾT QUẢ KIỂM THỬ: ${steps.length - failedCount}/${steps.length} PASS | ${failedCount} FAIL`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error("LỖI NGOẠI LỆ TRONG TEST DESKTOP CDP:", err);
  process.exit(1);
});
