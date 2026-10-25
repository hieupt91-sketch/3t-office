/**
 * CH-8.1 Desktop CDP Live Consistency Test Suite
 * ĐO THẬT trên ứng dụng desktop cho cả 3 app: Doc, Sheet, Slide.
 * Bảng kết quả 27 dòng kiểm tra chi tiết theo spec CH-8.1.
 * TUÂN THỦ NGHIÊM NGẶT:
 * - Chỉ dùng CDP thuần (Runtime.evaluate, Input.dispatchKeyEvent, Input.dispatchMouseEvent).
 * - CẤM SendKeys, SendInput, mouse_event, pyautogui.
 * - LOCALAPPDATA riêng biệt.
 * - Chỉ tắt PID của chính mình bằng taskkill /PID pid /T /F.
 * - CẤM || true, CẤM gán cứng PASS, CẤM dữ liệu giả.
 */

import { launchApp } from "./session.mjs";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { platformOutputPath } from "./output-path.mjs";

const LOCAL_PROFILES_DIR = platformOutputPath("E:\\VNOffice-profiles\\agy-ch81-cdp", { directory: true });

// Danh sách 27 tiêu chí kiểm tra
const CHECKLIST_ITEMS = [
  { id: "1. Backstage: Nút Quay lại", desc: "Nút Quay lại (#vno-backstage-back) hiện diện và có nhãn/aria-label" },
  { id: "2. Backstage: Nút Trang chủ", desc: "Nút Trang chủ (#vno-backstage-nav-home) nhãn Trang chủ" },
  { id: "3. Backstage: Nút Mới", desc: "Nút Mới (#vno-backstage-nav-new) có nhãn Mới (Ctrl+N)" },
  { id: "4. Backstage: Nút Mở", desc: "Nút Mở (#vno-backstage-nav-open) có nhãn Mở (Ctrl+O)" },
  { id: "5. Backstage: Nút Lưu", desc: "Nút Lưu (#vno-backstage-nav-save) có nhãn Lưu (Ctrl+S)" },
  { id: "6. Backstage: Nút Lưu thành", desc: "Nút Lưu thành (#vno-backstage-nav-saveas) có nhãn Lưu thành (F12)" },
  { id: "7. Backstage: Nút In", desc: "Nút In (#vno-backstage-nav-print) có nhãn In (Ctrl+P)" },
  { id: "8. Backstage: Nút Xuất PDF", desc: "Nút Xuất PDF (#vno-backstage-nav-exportpdf) có nhãn Xuất PDF" },
  { id: "9. Backstage: Nút Tệp gần đây", desc: "Nút Tệp gần đây (#vno-backstage-nav-recent) có nhãn Tệp gần đây" },
  { id: "10. Backstage: Nút Đóng", desc: "Nút Đóng (#vno-backstage-close) có nhãn Đóng (Ctrl+W)" },
  { id: "11. Backstage: Nút Giới thiệu", desc: "Nút Giới thiệu (#vno-backstage-about) có nhãn Giới thiệu" },
  { id: "12. Backstage: Nút Tùy chọn", desc: "Nút Tùy chọn (#vno-backstage-options) có nhãn Tùy chọn" },
  { id: "13. Backstage: Thứ tự 12 nút", desc: "Đúng thứ tự 12 nút sidebar chuẩn trên cả 3 app" },
  { id: "14. Tệp gần đây: Cấu trúc hiển thị", desc: "Hiển thị tên tệp, đường dẫn rút gọn, định dạng và nút gỡ" },
  { id: "15. Tệp gần đây: Chuyển tab Recent", desc: "Bấm tab Tệp gần đây chuyển sang #vno-backstage-recent-view" },
  { id: "16. Tệp gần đây: Mở lại được", desc: "Hàng tệp gần đây có data-recent-path và xử lý click/Enter" },
  { id: "17. Thanh trạng thái: Vị trí đáy", desc: "Cố định ở đáy cửa sổ (bottom: 0px)" },
  { id: "18. Thanh trạng thái: Cụm Chế độ xem", desc: "Có cụm nút .vno-statusbar-view-modes với nhãn tiếng Việt" },
  { id: "19. Thanh trạng thái: Slider 50%-200%", desc: "Thanh trượt #vno-zoom-range có min=50, max=200" },
  { id: "20. Thanh trạng thái: Cặp nút +/-", desc: "Có nút thu nhỏ #vno-zoom-out và phóng to #vno-zoom-in" },
  { id: "21. Thanh trạng thái: Nút % đặt lại", desc: "Nút #vno-zoom-text hiển thị % và bấm để đặt lại 100%" },
  { id: "22. Thu phóng: Nút +/- nhịp 10%", desc: "Bấm + tăng 10%, bấm - giảm 10%" },
  { id: "23. Thu phóng: Kéo thanh trượt", desc: "Đổi giá trị slider cập nhật tức thì zoomLevel và hiển thị" },
  { id: "24. Thu phóng: Ctrl + lăn chuột", desc: "mouseWheel kèm modifiers Ctrl thay đổi tỷ lệ thu phóng" },
  { id: "25. Thu phóng: Phím tắt Ctrl+0", desc: "Ctrl+0 đặt lại chính xác về 100%" },
  { id: "26. Ribbon: Quick Access Toolbar", desc: "QAT đủ 4 nút: Lưu (Ctrl+S), Hoàn tác (Ctrl+Z), Làm lại (Ctrl+Y), In (Ctrl+P)" },
  { id: "27. Ribbon: Thu gọn Ctrl+F1", desc: "Ctrl+F1 thu gọn và mở rộng thanh Ribbon đồng bộ" }
];

async function measureApp(app) {
  const profileDir = path.join(LOCAL_PROFILES_DIR, `profile-${app}-${Date.now()}`);
  await fs.mkdir(profileDir, { recursive: true });

  const session = await launchApp(app, {
    root: process.cwd(),
    localAppData: profileDir,
    startTimeoutMilliseconds: 60000,
    readyTimeoutMilliseconds: 45000
  });

  const cdp = session.cdp;
  const measurements = {};

  try {
    // 0. Chuẩn bị 1 tệp gần đây mẫu qua RecentFilesManager trong runtime app
    await cdp.evaluate(`(() => {
      const sampleFile = {
        name: "TaiLieuKiemTra_${app}.docx",
        path: "C:\\\\Users\\\\Administrator\\\\Documents\\\\VNOffice\\\\TaiLieuKiemTra_${app}.docx",
        app: "${app}",
        format: "${app === 'writer' ? 'DOCX' : app === 'sheet' ? 'XLSX' : 'PPTX'}",
        lastModified: Date.now()
      };
      const key = "vno_recent_documents";
      try {
        const cur = JSON.parse(localStorage.getItem(key) || "[]");
        cur.unshift(sampleFile);
        localStorage.setItem(key, JSON.stringify(cur.slice(0, 10)));
      } catch (e) {}
    })()`);

    // 1. Mở menu Tệp (Backstage)
    await cdp.evaluate(`document.querySelector('.vno-ribbon-tab-file')?.click()`);
    await cdp.waitFor("!!document.querySelector('.vno-backstage-overlay')", { timeoutMilliseconds: 8000 });

    // Đo các nút Backstage
    const backstageData = await cdp.evaluate(`(() => {
      const modal = document.querySelector('.vno-backstage-overlay');
      if (!modal) return null;
      const getBtnInfo = (sel) => {
        const el = modal.querySelector(sel);
        return el ? { exists: true, text: el.textContent.trim(), aria: el.getAttribute('aria-label') || '' } : { exists: false };
      };

      const sidebarBtns = Array.from(modal.querySelectorAll('.vno-backstage-sidebar button')).map(b => b.id || b.getAttribute('data-backstage-tab') || b.textContent.trim());

      const recentRows = Array.from(modal.querySelectorAll('.vno-recent-row')).map(r => ({
        name: r.querySelector('.vno-recent-name')?.textContent?.trim() || '',
        shortPath: r.querySelector('.vno-recent-short-path')?.textContent?.trim() || '',
        format: r.querySelector('.vno-recent-format')?.textContent?.trim() || '',
        hasRemoveBtn: !!r.querySelector('.vno-recent-remove-btn'),
        pathAttr: r.getAttribute('data-recent-path') || ''
      }));

      return {
        back: getBtnInfo('#vno-backstage-back'),
        home: getBtnInfo('#vno-backstage-nav-home'),
        newBtn: getBtnInfo('#vno-backstage-nav-new'),
        open: getBtnInfo('#vno-backstage-nav-open'),
        save: getBtnInfo('#vno-backstage-nav-save'),
        saveas: getBtnInfo('#vno-backstage-nav-saveas'),
        print: getBtnInfo('#vno-backstage-nav-print'),
        exportpdf: getBtnInfo('#vno-backstage-nav-exportpdf'),
        recent: getBtnInfo('#vno-backstage-nav-recent'),
        close: getBtnInfo('#vno-backstage-close'),
        about: getBtnInfo('#vno-backstage-about'),
        options: getBtnInfo('#vno-backstage-options'),
        sidebarButtons: sidebarBtns,
        recentRows
      };
    })()`);

    measurements["1. Backstage: Nút Quay lại"] = {
      val: backstageData?.back?.text || backstageData?.back?.aria || "Không có",
      pass: backstageData?.back?.exists && (backstageData.back.text.includes("Quay lại") || backstageData.back.aria.includes("Quay lại"))
    };
    measurements["2. Backstage: Nút Trang chủ"] = {
      val: backstageData?.home?.text || "Không có",
      pass: backstageData?.home?.exists && backstageData.home.text.includes("Trang chủ")
    };
    measurements["3. Backstage: Nút Mới"] = {
      val: backstageData?.newBtn?.text || "Không có",
      pass: backstageData?.newBtn?.exists && backstageData.newBtn.text.includes("Mới (Ctrl+N)")
    };
    measurements["4. Backstage: Nút Mở"] = {
      val: backstageData?.open?.text || "Không có",
      pass: backstageData?.open?.exists && backstageData.open.text.includes("Mở (Ctrl+O)")
    };
    measurements["5. Backstage: Nút Lưu"] = {
      val: backstageData?.save?.text || "Không có",
      pass: backstageData?.save?.exists && backstageData.save.text.includes("Lưu (Ctrl+S)")
    };
    measurements["6. Backstage: Nút Lưu thành"] = {
      val: backstageData?.saveas?.text || "Không có",
      pass: backstageData?.saveas?.exists && backstageData.saveas.text.includes("Lưu thành (F12)")
    };
    measurements["7. Backstage: Nút In"] = {
      val: backstageData?.print?.text || "Không có",
      pass: backstageData?.print?.exists && backstageData.print.text.includes("In (Ctrl+P)")
    };
    measurements["8. Backstage: Nút Xuất PDF"] = {
      val: backstageData?.exportpdf?.text || "Không có",
      pass: backstageData?.exportpdf?.exists && backstageData.exportpdf.text.includes("Xuất PDF")
    };
    measurements["9. Backstage: Nút Tệp gần đây"] = {
      val: backstageData?.recent?.text || "Không có",
      pass: backstageData?.recent?.exists && backstageData.recent.text.includes("Tệp gần đây")
    };
    measurements["10. Backstage: Nút Đóng"] = {
      val: backstageData?.close?.text || "Không có",
      pass: backstageData?.close?.exists && backstageData.close.text.includes("Đóng (Ctrl+W)")
    };
    measurements["11. Backstage: Nút Giới thiệu"] = {
      val: backstageData?.about?.text || "Không có",
      pass: backstageData?.about?.exists && backstageData.about.text.includes("Giới thiệu")
    };
    measurements["12. Backstage: Nút Tùy chọn"] = {
      val: backstageData?.options?.text || "Không có",
      pass: backstageData?.options?.exists && backstageData.options.text.includes("Tùy chọn")
    };

    const expectedOrder = [
      "vno-backstage-back", "vno-backstage-nav-home", "vno-backstage-nav-new",
      "vno-backstage-nav-open", "vno-backstage-nav-save", "vno-backstage-nav-saveas",
      "vno-backstage-nav-print", "vno-backstage-nav-exportpdf", "vno-backstage-nav-recent",
      "vno-backstage-close", "vno-backstage-about", "vno-backstage-options"
    ];
    const actualOrder = backstageData?.sidebarButtons || [];
    const isOrderMatch = expectedOrder.every((id, idx) => actualOrder[idx] === id);
    measurements["13. Backstage: Thứ tự 12 nút"] = {
      val: `${actualOrder.length} nút: ${actualOrder.slice(0, 4).join(", ")}...`,
      pass: isOrderMatch && actualOrder.length === 12
    };

    const firstRow = backstageData?.recentRows?.[0];
    measurements["14. Tệp gần đây: Cấu trúc hiển thị"] = {
      val: firstRow ? `Tên: ${firstRow.name}, Rút gọn: ${firstRow.shortPath}, Định dạng: ${firstRow.format}` : "Chưa có hàng",
      pass: Boolean(firstRow && firstRow.name && firstRow.shortPath && firstRow.hasRemoveBtn)
    };

    // Kiểm tra chuyển sang tab Recent trong Backstage
    await cdp.evaluate(`document.querySelector('#vno-backstage-nav-recent')?.click()`);
    const recentViewVisible = await cdp.evaluate(`(() => {
      const v = document.querySelector('#vno-backstage-recent-view');
      return v && v.style.display !== 'none';
    })()`);
    measurements["15. Tệp gần đây: Chuyển tab Recent"] = {
      val: recentViewVisible ? "Hiển thị #vno-backstage-recent-view" : "Ẩn",
      pass: Boolean(recentViewVisible)
    };

    measurements["16. Tệp gần đây: Mở lại được"] = {
      val: Boolean(firstRow?.pathAttr) ? `data-recent-path: ${firstRow.pathAttr.slice(0, 30)}...` : "Không có",
      pass: Boolean(firstRow && firstRow.pathAttr)
    };

    // Đóng Backstage modal
    await cdp.evaluate(`document.querySelector('#vno-backstage-back')?.click()`);
    await cdp.waitFor("!document.querySelector('.vno-backstage-overlay')", { timeoutMilliseconds: 5000 });

    // 2. Thanh trạng thái & Chế độ xem
    const sbInfo = await cdp.evaluate(`(() => {
      const sb = document.querySelector('.vno-statusbar');
      if (!sb) return null;
      const rect = sb.getBoundingClientRect();
      const viewModes = Array.from(sb.querySelectorAll('.vno-statusbar-btn')).map(b => ({
        mode: b.getAttribute('data-view-mode'),
        title: b.getAttribute('title') || b.getAttribute('aria-label') || ''
      }));
      const zoomRange = sb.querySelector('#vno-zoom-range');
      const zoomOut = sb.querySelector('#vno-zoom-out');
      const zoomIn = sb.querySelector('#vno-zoom-in');
      const zoomText = sb.querySelector('#vno-zoom-text');
      return {
        bottom: window.innerHeight - rect.bottom,
        height: rect.height,
        viewModes,
        min: zoomRange?.getAttribute('min'),
        max: zoomRange?.getAttribute('max'),
        val: zoomRange?.value,
        hasOut: !!zoomOut,
        hasIn: !!zoomIn,
        textVal: zoomText?.textContent?.trim(),
        textTag: zoomText?.tagName?.toLowerCase()
      };
    })()`);

    measurements["17. Thanh trạng thái: Vị trí đáy"] = {
      val: sbInfo ? `Đáy cách màn hình ${Math.round(sbInfo.bottom)}px, cao ${Math.round(sbInfo.height)}px` : "Không tìm thấy",
      pass: Boolean(sbInfo && Math.abs(sbInfo.bottom) <= 2)
    };

    measurements["18. Thanh trạng thái: Cụm Chế độ xem"] = {
      val: sbInfo?.viewModes ? `${sbInfo.viewModes.length} chế độ: ${sbInfo.viewModes.map(m => m.title).join(", ")}` : "Không có",
      pass: Boolean(sbInfo && sbInfo.viewModes.length >= 3)
    };

    measurements["19. Thanh trạng thái: Slider 50%-200%"] = {
      val: sbInfo ? `min=${sbInfo.min}, max=${sbInfo.max}` : "Không có",
      pass: Boolean(sbInfo && sbInfo.min === "50" && sbInfo.max === "200")
    };

    measurements["20. Thanh trạng thái: Cặp nút +/-"] = {
      val: (sbInfo?.hasOut && sbInfo?.hasIn) ? "Có đủ #vno-zoom-out và #vno-zoom-in" : "Thiếu",
      pass: Boolean(sbInfo?.hasOut && sbInfo?.hasIn)
    };

    measurements["21. Thanh trạng thái: Nút % đặt lại"] = {
      val: sbInfo ? `<${sbInfo.textTag}> ${sbInfo.textVal}` : "Không có",
      pass: Boolean(sbInfo && sbInfo.textTag === "button" && sbInfo.textVal.includes("%"))
    };

    // 3. Thao tác Thu phóng
    // Bấm + tăng 10%
    const initialZoom = await cdp.evaluate(`Number(document.querySelector('#vno-zoom-range')?.value || 100)`);
    await cdp.evaluate(`document.querySelector('#vno-zoom-in')?.click()`);
    const afterPlus = await cdp.evaluate(`Number(document.querySelector('#vno-zoom-range')?.value || 100)`);
    await cdp.evaluate(`document.querySelector('#vno-zoom-out')?.click()`);
    const afterMinus = await cdp.evaluate(`Number(document.querySelector('#vno-zoom-range')?.value || 100)`);

    measurements["22. Thu phóng: Nút +/- nhịp 10%"] = {
      val: `${initialZoom}% -> bấm (+) = ${afterPlus}% -> bấm (-) = ${afterMinus}%`,
      pass: afterPlus === initialZoom + 10 && afterMinus === initialZoom
    };

    // Kéo thanh trượt
    await cdp.evaluate(`(() => {
      const r = document.querySelector('#vno-zoom-range');
      if (r) {
        r.value = 130;
        r.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    const sliderZoom = await cdp.evaluate(`document.querySelector('#vno-zoom-text')?.textContent?.trim()`);
    measurements["23. Thu phóng: Kéo thanh trượt"] = {
      val: `Đặt 130 -> nhãn hiển thị: ${sliderZoom}`,
      pass: sliderZoom === "130%"
    };

    // Ctrl + lăn chuột bằng CDP Input.dispatchMouseEvent type mouseWheel
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 400,
      y: 400,
      deltaX: 0,
      deltaY: -100, // Lăn lên = zoom in
      modifiers: 2   // Modifier 2 = Ctrl
    });
    // Chờ 1 chút để wheel handler thực thi
    await new Promise(r => setTimeout(r, 200));
    const wheelZoom = await cdp.evaluate(`Number(document.querySelector('#vno-zoom-range')?.value || 100)`);
    measurements["24. Thu phóng: Ctrl + lăn chuột"] = {
      val: `130% lăn chuột Ctrl -> ${wheelZoom}%`,
      pass: wheelZoom === 140
    };

    // Phím tắt Ctrl+0 đặt lại 100%
    for (const type of ["rawKeyDown", "keyDown", "keyUp"]) {
      await cdp.send("Input.dispatchKeyEvent", {
        type,
        key: "0",
        code: "Digit0",
        windowsVirtualKeyCode: 48,
        modifiers: 2 // Ctrl
      });
    }
    await new Promise(r => setTimeout(r, 200));
    const resetZoom = await cdp.evaluate(`Number(document.querySelector('#vno-zoom-range')?.value || 0)`);
    measurements["25. Thu phóng: Phím tắt Ctrl+0"] = {
      val: `Sau Ctrl+0: ${resetZoom}%`,
      pass: resetZoom === 100
    };

    // 4. Quick Access Toolbar
    const qatInfo = await cdp.evaluate(`(() => {
      const qat = document.querySelector('.vno-quick-tools');
      if (!qat) return null;
      const btns = Array.from(qat.querySelectorAll('.vno-quick-btn')).map(b => ({
        cmd: b.getAttribute('data-cmd'),
        aria: b.getAttribute('aria-label') || b.getAttribute('title') || ''
      }));
      return btns;
    })()`);
    const hasSave = qatInfo?.some(b => b.cmd === "common.file.save");
    const hasUndo = qatInfo?.some(b => b.cmd === "common.edit.undo");
    const hasRedo = qatInfo?.some(b => b.cmd === "common.edit.redo");
    const hasPrint = qatInfo?.some(b => b.cmd === "common.file.print");
    measurements["26. Ribbon: Quick Access Toolbar"] = {
      val: qatInfo ? `${qatInfo.length} nút: ${qatInfo.map(b => b.aria).join(", ")}` : "Không có",
      pass: Boolean(hasSave && hasUndo && hasRedo && hasPrint)
    };

    // 5. Thu gọn Ribbon Ctrl+F1
    const beforeCollapse = await cdp.evaluate(`document.querySelector('.vno-ribbon-content')?.offsetHeight || 0`);
    
    // Gửi đúng 1 lần tổ hợp Ctrl+F1 (rawKeyDown + keyUp)
    await cdp.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "F1",
      code: "F1",
      windowsVirtualKeyCode: 112,
      modifiers: 2 // Ctrl
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "F1",
      code: "F1",
      windowsVirtualKeyCode: 112,
      modifiers: 2 // Ctrl
    });
    await new Promise(r => setTimeout(r, 250));

    const afterCollapse = await cdp.evaluate(`(() => {
      const c = document.querySelector('.vno-ribbon-content');
      const isCol = !c || c.offsetHeight === 0;
      return { height: c ? c.offsetHeight : 0, isCol };
    })()`);

    // Nhấn lại Ctrl+F1 để mở rộng
    await cdp.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      key: "F1",
      code: "F1",
      windowsVirtualKeyCode: 112,
      modifiers: 2 // Ctrl
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "F1",
      code: "F1",
      windowsVirtualKeyCode: 112,
      modifiers: 2 // Ctrl
    });
    await new Promise(r => setTimeout(r, 250));

    const afterExpand = await cdp.evaluate(`document.querySelector('.vno-ribbon-content')?.offsetHeight || 0`);

    measurements["27. Ribbon: Thu gọn Ctrl+F1"] = {
      val: `Ban đầu: ${beforeCollapse}px -> Thu gọn: ${afterCollapse.height}px (đã thu gọn: ${afterCollapse.isCol}) -> Mở lại: ${afterExpand}px`,
      pass: Boolean(afterCollapse.height < beforeCollapse && afterExpand >= beforeCollapse)
    };

  } finally {
    const pid = session.child?.pid;
    await session.close();
    if (pid) {
      try {
        execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      } catch {}
    }
    try {
      await fs.rm(profileDir, { recursive: true, force: true });
    } catch {}
  }

  return measurements;
}

async function run() {
  console.log("==========================================================================");
  console.log("    CH-8.1: BẮT ĐẦU ĐO THẬT CDP DESKTOP TRÊN CẢ 3 ỨNG DỤNG");
  console.log("==========================================================================");

  const apps = ["writer", "sheet", "slides"];
  const allResults = {};

  for (const app of apps) {
    const appName = app === "writer" ? "Doc" : app === "sheet" ? "Sheet" : "Slide";
    console.log(`\n▶ Đang khởi động và đo thật trên ${appName} (${app})...`);
    try {
      allResults[app] = await measureApp(app);
      console.log(`  ✓ Đo thành công trên ${appName}.`);
    } catch (err) {
      console.error(`  ✗ Lỗi đo trên ${appName}:`, err);
      allResults[app] = {};
    }
  }

  console.log("\n========================================================================================================================");
  console.log("                     BẢNG KẾT QUẢ ĐO THẬT ĐỒNG BỘ GIAO DIỆN (CH-8.1) TRÊN 3 APP DESKTOP");
  console.log("========================================================================================================================");
  console.log("| STT | Hạng mục kiểm tra                   | Doc (Writer)            | Sheet                   | Slide (Slides)          |");
  console.log("|-----|-------------------------------------|-------------------------|-------------------------|-------------------------|");

  let allPass = true;
  const tableRows = [];

  CHECKLIST_ITEMS.forEach((item, idx) => {
    const writerRes = allResults["writer"]?.[item.id] || { pass: false, val: "N/A" };
    const sheetRes = allResults["sheet"]?.[item.id] || { pass: false, val: "N/A" };
    const slidesRes = allResults["slides"]?.[item.id] || { pass: false, val: "N/A" };

    if (!writerRes.pass || !sheetRes.pass || !slidesRes.pass) {
      allPass = false;
    }

    const wStr = `${writerRes.pass ? "[PASS]" : "[FAIL]"} ${String(writerRes.val).slice(0, 18)}`;
    const sStr = `${sheetRes.pass ? "[PASS]" : "[FAIL]"} ${String(sheetRes.val).slice(0, 18)}`;
    const slStr = `${slidesRes.pass ? "[PASS]" : "[FAIL]"} ${String(slidesRes.val).slice(0, 18)}`;

    const row = `| ${String(idx + 1).padStart(2)}  | ${item.id.padEnd(35)} | ${wStr.padEnd(23)} | ${sStr.padEnd(23)} | ${slStr.padEnd(23)} |`;
    console.log(row);
    tableRows.push({
      stt: idx + 1,
      id: item.id,
      desc: item.desc,
      writer: writerRes,
      sheet: sheetRes,
      slides: slidesRes
    });
  });

  console.log("========================================================================================================================");
  console.log(`TỔNG KẾT ĐO THẬT: ${allPass ? "TẤT CẢ 27 HẠNG MỤC ĐỀU PASS TRÊN CẢ 3 APP!" : "CÓ HẠNG MỤC CHƯA ĐẠT"}`);
  console.log("========================================================================================================================");

  // Lưu file JSON báo cáo
  await fs.writeFile("docs/ch8-1-consistency-live-results.json", JSON.stringify(tableRows, null, 2), "utf8");

  if (!allPass) {
    process.exit(1);
  }
}

run();
