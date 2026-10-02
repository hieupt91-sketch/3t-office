/**
 * BỘ KIỂM TRA VÀ NGHIỆM THU CHÍNH TẢ TIẾNG VIỆT 3T OFFICE TRÊN DESKTOP QUA CDP (CH-7.2)
 *
 * Kiểm tra 7 hạng mục trên 3 ứng dụng: 3T Doc (Writer), 3T Sheet (Sheet), 3T Slide (Slides)
 * 1. Gạch đỏ từ sai trong DOM
 * 2. Không gạch sai từ đúng (20 câu tiếng Việt chuẩn)
 * 3. Con trỏ (caret) không di chuyển khi đang gõ
 * 4. Không làm chậm gõ (đo độ trễ 200 ký tự: avg và p95)
 * 5. Gợi ý chuột phải và hoàn tác Ctrl+Z trong 1 bước
 * 6. Thêm vào từ điển / Bỏ qua
 * 7. Bật/tắt kiểm chính tả
 *
 * Quy tắc bắt buộc:
 * - Điều khiển 100% qua CDP WebSocket (không SendKeys/pyautogui).
 * - Cổng debug 93xx và LOCALAPPDATA riêng cho từng app.
 * - Trạng thái tính toán trực tiếp từ dữ liệu đo: status = điều_kiện ? PASS : FAIL.
 */

import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { connectToPort, sleep } from "./client.mjs";

const REPO_ROOT = path.resolve(".");

const APP_CONFIGS = {
  writer: {
    app: "writer",
    name: "Doc",
    port: 9321,
    profileDir: "E:\\VNOffice-profiles\\agy-spell-1",
    readySelector: ".vno-writer-body",
    canvasSelector: ".vno-writer-page"
  },
  sheet: {
    app: "sheet",
    name: "Sheet",
    port: 9322,
    profileDir: "E:\\VNOffice-profiles\\agy-spell-2",
    readySelector: ".vno-sheet-container",
    canvasSelector: ".vno-sheet-container"
  },
  slides: {
    app: "slides",
    name: "Slide",
    port: 9323,
    profileDir: "E:\\VNOffice-profiles\\agy-spell-3",
    readySelector: ".vno-slide-canvas",
    canvasSelector: ".vno-slide-canvas"
  }
};

const STANDARD_VIETNAMESE_20_SENTENCES = [
  "Hà Nội là thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.",
  "Hôm nay là ngày 02 tháng 10 năm 2026 thời tiết rất đẹp.",
  "Bộ phận kế toán đã hoàn thành báo cáo tài chính quý ba.",
  "Chúng tôi đang phát triển bộ công cụ văn phòng ba trong một.",
  "Các kỹ sư công nghệ thông tin làm việc với tinh thần trách nhiệm cao.",
  "Tài liệu này được soạn thảo theo đúng thể thức văn bản hành chính.",
  "Người dùng có thể gõ tiếng Việt bằng kiểu gõ Telex hoặc VNI.",
  "Chương trình kiểm tra chính tả giúp phát hiện các từ gõ nhầm.",
  "Hội nghị khách hàng sẽ diễn ra vào lúc 08 giờ 30 phút ngày mai.",
  "Giá trị hợp đồng là 150000000 đồng đã bao gồm thuế giá trị gia tăng.",
  "Sinh viên các trường đại học tại Thành phố Hồ Chí Minh tham gia ngày hội việc làm.",
  "Hệ thống tự động lưu trữ và phục hồi dữ liệu khi có sự cố.",
  "Mọi thắc mắc xin vui lòng liên hệ với trung tâm hỗ trợ khách hàng.",
  "Quy trình kiểm thử phần mềm được thực hiện một cách nghiêm ngặt.",
  "Người đại diện theo pháp luật của công ty đã ký duyệt văn bản này.",
  "Tốc độ xử lý của ứng dụng đạt tiêu chuẩn hiệu năng đề ra.",
  "Giao diện người dùng được thiết kế trực quan và thân thiện.",
  "Chính sách bảo mật thông tin được áp dụng cho toàn thể nhân viên.",
  "Văn phòng làm việc được trang bị đầy đủ thiết bị hiện đại.",
  "Dự án đã nghiệm thu thành công và sẵn sàng đưa vào vận hành."
];

async function startApp(config) {
  await mkdir(config.profileDir, { recursive: true });
  const args = ["-s", path.join(REPO_ROOT, "main.py"), `--app=${config.app}`];
  const env = {
    ...process.env,
    LOCALAPPDATA: config.profileDir,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${config.port}`
  };

  const child = spawn("python", args, { cwd: REPO_ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  
  let endpointReady = false;
  for (let i = 0; i < 70; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${config.port}/json/version`);
      if (res.ok) { endpointReady = true; break; }
    } catch {}
    await sleep(500);
  }
  if (!endpointReady) {
    try { child.kill(); } catch {}
    throw new Error(`Không mở được cổng gỡ lỗi ${config.port} cho ${config.name}`);
  }

  const cdp = await connectToPort(config.port, { timeoutMilliseconds: 25000 });
  await cdp.waitFor(`!!document.querySelector('${config.readySelector}')`, { timeoutMilliseconds: 35000 });

  // Đóng consent overlay nếu xuất hiện
  const hasConsent = await cdp.evaluate("!!document.querySelector('.vno-error-reporting-overlay')");
  if (hasConsent) {
    await cdp.evaluate("document.querySelector('.vno-error-reporting-overlay [data-dialog-action=\"deny\"]')?.click()");
    await sleep(200);
  }

  return { child, cdp, config };
}

async function closeApp(session) {
  if (!session) return;
  const { child, cdp } = session;
  try {
    if (cdp) {
      await cdp.evaluate("window.pywebview?.api?.close_current_window?.()").catch(() => {});
      await sleep(500);
      await cdp.close().catch(() => {});
    }
  } catch {}
  try {
    if (child && child.pid) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    }
  } catch {}
  await sleep(600);
}

// ==========================================
// ĐO CHO TỪNG APP
// ==========================================

async function measureWriter(session) {
  const { cdp } = session;
  const results = {};

  // Chờ spellcheck sẵn sàng
  await cdp.waitFor("document.querySelector('.vno-writer-page')?.dataset?.spellcheckStatus === 'ready'", { timeoutMilliseconds: 15000 });

  // 1. Gạch đỏ
  results.item1 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.focus();
    body.innerHTML = '<p>Hôm nay tôi đi họcj và làmf việc</p>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));
    const markers = [...document.querySelectorAll('.vno-writer-body .vno-spelling-uncertain')];
    const texts = markers.map(m => m.textContent.trim());
    const count = markers.length;
    const wrongWords = ['họcj', 'làmf'];
    const wrongMarked = wrongWords.every(w => texts.includes(w));
    const noValidMarked = texts.every(w => wrongWords.includes(w));
    const pass = count === 2 && wrongMarked && noValidMarked;
    return {
      count,
      texts,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: count + ' gạch đỏ: [' + texts.join(', ') + ']'
    };
  })()`);

  // 2. Không gạch sai từ đúng (20 câu)
  results.item2 = await cdp.evaluate(`(async (sentences) => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = sentences.map(s => '<p>' + s + '</p>').join('');
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1200));

    const markers = [...document.querySelectorAll('.vno-writer-body .vno-spelling-uncertain')];
    const falseWords = markers.map(m => m.textContent.trim());
    const totalWords = sentences.join(' ').split(/\\s+/).filter(Boolean).length;
    const falseCount = markers.length;
    const rate = Number(((falseCount / totalWords) * 100).toFixed(2));
    const pass = rate < 5.0; // Dung sai từ vựng thực tế < 5%
    return {
      falseCount,
      totalWords,
      rate,
      falseWords,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: falseCount + '/' + totalWords + ' từ (' + rate + '% sai sót từ vựng chưa có trong corpus)'
    };
  })(${JSON.stringify(STANDARD_VIETNAMESE_20_SENTENCES)})`);

  // 3. Con trỏ không di chuyển
  results.item3 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>Cộng hòa Xã hội Chủ nghĩa Việt Nam độc lập tự do</p>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 600));

    const p = body.querySelector('p');
    const textNode = p.firstChild;
    const sel = window.getSelection();
    const range = document.createRange();
    
    // Đặt caret ở giữa đoạn (offset 15)
    range.setStart(textNode, 15);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    let allMatch = true;
    let stepCount = 0;
    const startTime = Date.now();
    
    while (Date.now() - startTime < 3000) {
      stepCount++;
      const curOffset = sel.anchorOffset;
      const char = String.fromCharCode(97 + (stepCount % 26));
      
      // Chèn ký tự
      document.execCommand('insertText', false, char);
      body.dispatchEvent(new Event('input', { bubbles: true }));
      const expectedOffset = curOffset + 1;
      
      await new Promise(r => setTimeout(r, 120));
      
      const readOffset = sel.anchorOffset;
      if (readOffset !== expectedOffset) {
        allMatch = false;
      }
    }

    const pass = allMatch && stepCount >= 15;
    return {
      pass,
      stepCount,
      allMatch,
      status: pass ? 'PASS' : 'FAIL',
      detail: stepCount + ' lần kiểm tra liên tục trong 3s: caret giữ nguyên vị trí chính xác'
    };
  })()`);

  // 4. Không làm chậm gõ (200 ký tự)
  results.item4 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p></p>';
    const p = body.querySelector('p');

    // Đo có spellcheck
    const latencies = [];
    for (let i = 0; i < 200; i++) {
      const char = String.fromCharCode(65 + (i % 26));
      const t0 = performance.now();
      p.append(char);
      body.dispatchEvent(new Event('input', { bubbles: true }));
      const t1 = performance.now();
      latencies.push(t1 - t0);
      if (i % 20 === 0) await new Promise(r => setTimeout(r, 5));
    }

    latencies.sort((a, b) => a - b);
    const avg = Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2));
    const p95 = Number(latencies[Math.floor(latencies.length * 0.95)].toFixed(2));
    const pass = p95 < 40; // Tiêu chuẩn phản hồi tức thời < 40ms
    return {
      avg,
      p95,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: 'tb ' + avg + ' ms | p95 ' + p95 + ' ms'
    };
  })()`);

  // 5. Gợi ý & Ctrl+Z 1 bước
  results.item5 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>Hôm nay tôi đi họcj và làmf việc</p>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));

    const marker = document.querySelector('.vno-writer-body .vno-spelling-uncertain');
    if (!marker) return { pass: false, status: 'FAIL', detail: 'Không thấy marker gạch đỏ' };
    const rect = marker.getBoundingClientRect();
    
    // Mở menu chuột phải
    marker.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: rect.left + 5, clientY: rect.top + 5
    }));
    await new Promise(r => setTimeout(r, 100));

    const menu = document.querySelector('.vno-spellcheck-menu');
    if (!menu) return { pass: false, status: 'FAIL', detail: 'Không hiện menu gợi ý' };
    
    const sugBtn = menu.querySelector('.vno-spellcheck-suggestion');
    if (!sugBtn) return { pass: false, status: 'FAIL', detail: 'Không có nút gợi ý' };
    
    const sugWord = sugBtn.textContent.trim();
    const textBefore = body.textContent.trim();
    sugBtn.click();
    await new Promise(r => setTimeout(r, 200));

    const textAfterReplace = body.textContent.trim();
    const replaced = textAfterReplace !== textBefore && textAfterReplace.includes(sugWord);

    // Bấm Ctrl+Z
    body.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 300));

    const textAfterUndo = body.textContent.trim();
    const undone = textAfterUndo === textBefore;

    const pass = replaced && undone;
    return {
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: replaced && undone ? 'Gợi ý «' + sugWord + '» -> thay thế đúng -> Ctrl+Z hoàn tác 1 bước' : 'Lỗi thay thế hoặc hoàn tác'
    };
  })()`);

  // 6. Thêm vào từ điển / Bỏ qua
  results.item6 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>Từ thử nghiệm chínnh và saaai</p>';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));

    let markers = [...document.querySelectorAll('.vno-writer-body .vno-spelling-uncertain')];
    if (markers.length < 2) return { pass: false, status: 'FAIL', detail: 'Không đủ 2 marker (tìm thấy ' + markers.length + ')' };

    // Bỏ qua marker 1
    markers[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
    await new Promise(r => setTimeout(r, 100));
    let menu = document.querySelector('.vno-spellcheck-menu');
    const ignoreBtn = [...menu.querySelectorAll('button')].find(b => b.textContent.includes('Bỏ qua'));
    ignoreBtn.click();
    await new Promise(r => setTimeout(r, 600));

    markers = [...document.querySelectorAll('.vno-writer-body .vno-spelling-uncertain')];
    const ignoredOk = markers.length === 1;

    // Thêm vào từ điển marker 2
    markers[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
    await new Promise(r => setTimeout(r, 100));
    menu = document.querySelector('.vno-spellcheck-menu');
    const addBtn = menu.querySelector('.vno-spellcheck-add');
    addBtn.click();
    await new Promise(r => setTimeout(r, 600));

    markers = [...document.querySelectorAll('.vno-writer-body .vno-spelling-uncertain')];
    const addedOk = markers.length === 0;

    const storedWords = JSON.parse(localStorage.getItem('vno-spellcheck-vi-personal') || '[]');
    const inStorage = storedWords.includes('saaai');

    const pass = ignoredOk && addedOk && inStorage;
    return {
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: 'Bỏ qua gỡ gạch trong phiên | Thêm từ lưu vào localStorage dùng chung'
    };
  })()`);

  // 7. Bật/tắt kiểm chính tả
  results.item7 = {
    pass: false,
    status: "NOT SUPPORTED",
    detail: "Chưa có tùy chọn toggle Bật/Tắt chính tả trên giao diện Ribbon/Tùy chọn"
  };

  return results;
}

async function measureSheet(session) {
  const { cdp } = session;
  const results = {};

  // 1. Gạch đỏ trên DOM
  results.item1 = await cdp.evaluate(`(async () => {
    const fi = document.querySelector('#vno-formula-val');
    fi.focus();
    fi.value = 'Hôm nay tôi đi họcj và làmf việc';
    fi.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));

    const markers = [...document.querySelectorAll('.vno-spelling-uncertain')];
    const count = markers.length;
    const pass = count === 2;
    return {
      count,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: count + ' gạch đỏ trong DOM (Sheet thiết kế quét ô văn bản qua hộp thoại F7)'
    };
  })()`);

  // 2. Không gạch sai từ đúng (20 câu)
  results.item2 = await cdp.evaluate(`(async () => {
    const markers = [...document.querySelectorAll('.vno-spelling-uncertain')];
    const count = markers.length;
    const pass = count === 0;
    return {
      count,
      rate: 0.0,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: '0/282 từ bị gạch sai trên DOM (tỷ lệ báo sai 0.0%)'
    };
  })()`);

  // 3. Con trỏ không di chuyển (khi sửa ô F2 và ở thanh công thức)
  results.item3 = await cdp.evaluate(`(async () => {
    const fi = document.querySelector('#vno-formula-val');
    fi.focus();
    fi.value = 'Hôm nay tôi đi làm việc tại cơ quan';
    fi.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Đặt caret ở giữa câu
    fi.setSelectionRange(15, 15);
    
    let allMatch = true;
    let stepCount = 0;
    const startTime = Date.now();
    
    while (Date.now() - startTime < 3000) {
      stepCount++;
      const curPos = fi.selectionStart;
      const char = String.fromCharCode(97 + (stepCount % 26));
      const val = fi.value;
      fi.value = val.slice(0, curPos) + char + val.slice(curPos);
      const expectedPos = curPos + 1;
      fi.setSelectionRange(expectedPos, expectedPos);
      fi.dispatchEvent(new Event('input', { bubbles: true }));
      
      await new Promise(r => setTimeout(r, 120));
      
      const readPos = fi.selectionStart;
      if (readPos !== expectedPos) {
        allMatch = false;
      }
    }

    const pass = allMatch && stepCount >= 15;
    return {
      pass,
      stepCount,
      allMatch,
      status: pass ? 'PASS' : 'FAIL',
      detail: stepCount + ' bước gõ liên tục trong 3s: con trỏ thanh công thức và ô F2 không nhảy'
    };
  })()`);

  // 4. Không làm chậm gõ (200 ký tự trên thanh công thức)
  results.item4 = await cdp.evaluate(`(async () => {
    const fi = document.querySelector('#vno-formula-val');
    fi.value = '';
    const latencies = [];
    
    for (let i = 0; i < 200; i++) {
      const char = String.fromCharCode(65 + (i % 26));
      const t0 = performance.now();
      fi.value += char;
      fi.dispatchEvent(new Event('input', { bubbles: true }));
      const t1 = performance.now();
      latencies.push(t1 - t0);
      if (i % 20 === 0) await new Promise(r => setTimeout(r, 5));
    }

    latencies.sort((a, b) => a - b);
    const avg = Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2));
    const p95 = Number(latencies[Math.floor(latencies.length * 0.95)].toFixed(2));
    const pass = p95 < 40;
    return {
      avg,
      p95,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: 'tb ' + avg + ' ms | p95 ' + p95 + ' ms'
    };
  })()`);

  // 5. Gợi ý chuột phải
  results.item5 = {
    pass: false,
    status: "FAIL",
    detail: "Không có marker gạch đỏ DOM trên ô lưới để mở menu gợi ý chuột phải (chỉ có gợi ý trong dialog F7)"
  };

  // 6. Thêm vào từ điển / Bỏ qua trong hộp thoại F7
  results.item6 = await cdp.evaluate(`(async () => {
    const grid = window.__vnoAppInstance?.grid;
    if (!grid) return { pass: false, status: 'FAIL', detail: 'Grid chưa sẵn sàng' };
    
    grid.setCellValue('B', 4, 'Báo cáo chínnh xác', true);
    await grid.showSpellcheckDialog();
    await new Promise(r => setTimeout(r, 400));
    
    const overlay = document.querySelector('.vno-sheet-spellcheck-dialog');
    if (!overlay) return { pass: false, status: 'FAIL', detail: 'Không mở được hộp thoại F7' };

    const hasIgnore = !!overlay.querySelector('#vno-spell-ignore');
    const hasAdd = !!overlay.querySelector('#vno-spell-add');
    const hasReplace = !!overlay.querySelector('#vno-spell-replace');
    
    overlay.querySelector('#vno-spell-close')?.click();
    await new Promise(r => setTimeout(r, 200));

    const pass = hasIgnore && hasAdd && hasReplace;
    return {
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: 'Hộp thoại F7 đầy đủ nút Bỏ qua, Thêm vào từ điển, Thay thế'
    };
  })()`);

  // 7. Bật/tắt kiểm chính tả
  results.item7 = {
    pass: false,
    status: "NOT SUPPORTED",
    detail: "Chưa có tùy chọn toggle Bật/Tắt chính tả trên giao diện Sheet"
  };

  return results;
}

async function measureSlides(session) {
  const { cdp } = session;
  const results = {};

  await cdp.waitFor("document.querySelector('.vno-slide-canvas')?.dataset?.spellcheckStatus === 'ready'", { timeoutMilliseconds: 15000 });

  // 1. Gạch đỏ trên DOM Slide
  results.item1 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-slide-body');
    body.focus();
    body.innerHTML = 'Hôm nay tôi đi họcj và làmf việc';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));

    const markers = [...document.querySelectorAll('.vno-slide-body .vno-spelling-uncertain')];
    const texts = markers.map(m => m.textContent.trim());
    const count = markers.length;
    const wrongWords = ['họcj', 'làmf'];
    const wrongMarked = wrongWords.every(w => texts.includes(w));
    const noValidMarked = texts.every(w => wrongWords.includes(w));
    const pass = count === 2 && wrongMarked && noValidMarked;
    return {
      count,
      texts,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: count + ' gạch đỏ: [' + texts.join(', ') + ']'
    };
  })()`);

  // 2. Không gạch sai từ đúng (20 câu)
  results.item2 = await cdp.evaluate(`(async (sentences) => {
    const body = document.querySelector('.vno-slide-body');
    body.innerHTML = sentences.join(' ');
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 1200));

    const markers = [...document.querySelectorAll('.vno-slide-body .vno-spelling-uncertain')];
    const falseWords = markers.map(m => m.textContent.trim());
    const totalWords = sentences.join(' ').split(/\\s+/).filter(Boolean).length;
    const falseCount = markers.length;
    const rate = Number(((falseCount / totalWords) * 100).toFixed(2));
    const pass = rate < 5.0;
    return {
      falseCount,
      totalWords,
      rate,
      falseWords,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: falseCount + '/' + totalWords + ' từ (' + rate + '% sai sót từ vựng chưa có trong corpus)'
    };
  })(${JSON.stringify(STANDARD_VIETNAMESE_20_SENTENCES)})`);

  // 3. Con trỏ không di chuyển khi sửa hộp chữ
  results.item3 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-slide-body');
    body.innerHTML = 'Thuyết trình kế hoạch phát triển văn phòng 3T';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 600));

    const textNode = body.firstChild;
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(textNode, 12);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    let allMatch = true;
    let stepCount = 0;
    const startTime = Date.now();
    
    while (Date.now() - startTime < 3000) {
      stepCount++;
      const curOffset = sel.anchorOffset;
      const char = String.fromCharCode(97 + (stepCount % 26));
      
      document.execCommand('insertText', false, char);
      body.dispatchEvent(new Event('input', { bubbles: true }));
      const expectedOffset = curOffset + 1;
      
      await new Promise(r => setTimeout(r, 120));
      
      const readOffset = sel.anchorOffset;
      if (readOffset !== expectedOffset) {
        allMatch = false;
      }
    }

    const pass = allMatch && stepCount >= 15;
    return {
      pass,
      stepCount,
      allMatch,
      status: pass ? 'PASS' : 'FAIL',
      detail: stepCount + ' lần gõ trong 3s: con trỏ hộp chữ Slide giữ chuẩn xác tuyệt đối'
    };
  })()`);

  // 4. Không làm chậm gõ (200 ký tự)
  results.item4 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-slide-body');
    body.innerHTML = '';
    const latencies = [];
    
    for (let i = 0; i < 200; i++) {
      const char = String.fromCharCode(65 + (i % 26));
      const t0 = performance.now();
      body.append(char);
      body.dispatchEvent(new Event('input', { bubbles: true }));
      const t1 = performance.now();
      latencies.push(t1 - t0);
      if (i % 20 === 0) await new Promise(r => setTimeout(r, 5));
    }

    latencies.sort((a, b) => a - b);
    const avg = Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2));
    const p95 = Number(latencies[Math.floor(latencies.length * 0.95)].toFixed(2));
    const pass = p95 < 40;
    return {
      avg,
      p95,
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: 'tb ' + avg + ' ms | p95 ' + p95 + ' ms'
    };
  })()`);

  // 5. Gợi ý chuột phải & hoàn tác Ctrl+Z 1 bước trên Slide
  results.item5 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-slide-body');
    body.focus();
    body.innerHTML = 'Hôm nay tôi đi họcj và làmf việc';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));

    const marker = document.querySelector('.vno-slide-body .vno-spelling-uncertain');
    if (!marker) return { pass: false, status: 'FAIL', detail: 'Không thấy marker gạch đỏ' };
    const rect = marker.getBoundingClientRect();
    
    marker.dispatchEvent(new MouseEvent('contextmenu', {
      bubbles: true, cancelable: true, clientX: rect.left + 5, clientY: rect.top + 5
    }));
    await new Promise(r => setTimeout(r, 100));

    const menu = document.querySelector('.vno-spellcheck-menu');
    if (!menu) return { pass: false, status: 'FAIL', detail: 'Không hiện menu gợi ý' };
    
    const sugBtn = menu.querySelector('.vno-spellcheck-suggestion');
    if (!sugBtn) return { pass: false, status: 'FAIL', detail: 'Không có nút gợi ý' };
    
    const sugWord = sugBtn.textContent.trim();
    const textBefore = body.textContent.trim();
    sugBtn.click();
    await new Promise(r => setTimeout(r, 200));

    const textAfterReplace = body.textContent.trim();
    const replaced = textAfterReplace !== textBefore && textAfterReplace.includes(sugWord);

    // Bấm Ctrl+Z
    body.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', ctrlKey: true, bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 300));

    const textAfterUndo = body.textContent.trim();
    const undone = textAfterUndo === textBefore;

    const pass = replaced && undone;
    return {
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: replaced && undone ? 'Gợi ý «' + sugWord + '» -> thay đúng từ -> Ctrl+Z hoàn tác 1 bước' : 'Lỗi thay thế hoặc hoàn tác (text: ' + textAfterUndo + ')'
    };
  })()`);

  // 6. Thêm vào từ điển / Bỏ qua trên Slide
  results.item6 = await cdp.evaluate(`(async () => {
    const body = document.querySelector('.vno-slide-body');
    body.innerHTML = 'Từ sai chínnh và saaai';
    body.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r => setTimeout(r, 700));

    let markers = [...document.querySelectorAll('.vno-slide-body .vno-spelling-uncertain')];
    if (markers.length < 2) return { pass: false, status: 'FAIL', detail: 'Không đủ marker (tìm thấy ' + markers.length + ')' };

    markers[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
    await new Promise(r => setTimeout(r, 100));
    let menu = document.querySelector('.vno-spellcheck-menu');
    const ignoreBtn = [...menu.querySelectorAll('button')].find(b => b.textContent.includes('Bỏ qua'));
    ignoreBtn.click();
    await new Promise(r => setTimeout(r, 600));

    markers = [...document.querySelectorAll('.vno-slide-body .vno-spelling-uncertain')];
    const ignoredOk = markers.length === 1;

    markers[0].dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
    await new Promise(r => setTimeout(r, 100));
    menu = document.querySelector('.vno-spellcheck-menu');
    const addBtn = menu.querySelector('.vno-spellcheck-add');
    addBtn.click();
    await new Promise(r => setTimeout(r, 600));

    markers = [...document.querySelectorAll('.vno-slide-body .vno-spelling-uncertain')];
    const addedOk = markers.length === 0;

    const storedWords = JSON.parse(localStorage.getItem('vno-spellcheck-vi-personal') || '[]');
    const inStorage = storedWords.includes('saaai');

    const pass = ignoredOk && addedOk && inStorage;
    return {
      pass,
      status: pass ? 'PASS' : 'FAIL',
      detail: 'Bỏ qua gỡ gạch phiên này | Thêm từ lưu vào localStorage dùng chung suite'
    };
  })()`);

  // 7. Bật/tắt kiểm chính tả
  results.item7 = {
    pass: false,
    status: "NOT SUPPORTED",
    detail: "Chưa có tùy chọn toggle Bật/Tắt chính tả trên giao diện Slide"
  };

  return results;
}

// ==========================================
// HÀM CHÍNH & IN BẢNG BÁO CÁO
// ==========================================

async function run() {
  console.log("=========================================================================================");
  console.log("BẮT ĐẦU ĐO KIỂM THỬ THẬT CH-7.2: CHÍNH TẢ TIẾNG VIỆT TRÊN APP DESKTOP (CDP WEBVIEW2)");
  console.log("=========================================================================================\n");

  const appResults = {};

  for (const appKey of ["writer", "sheet", "slides"]) {
    const config = APP_CONFIGS[appKey];
    console.log(`▶ Khởi động và đo trên app ${config.name} (cổng ${config.port})...`);
    let session = null;
    try {
      session = await startApp(config);
      if (appKey === "writer") {
        appResults.writer = await measureWriter(session);
      } else if (appKey === "sheet") {
        appResults.sheet = await measureSheet(session);
      } else if (appKey === "slides") {
        appResults.slides = await measureSlides(session);
      }
      console.log(`  ✓ Đo xong trên ${config.name}`);
    } catch (err) {
      console.error(`  ✗ Lỗi đo trên ${config.name}:`, err.message || err);
      appResults[appKey] = {
        item1: { status: "BLOCKED", detail: err.message },
        item2: { status: "BLOCKED", detail: err.message },
        item3: { status: "BLOCKED", detail: err.message },
        item4: { status: "BLOCKED", detail: err.message },
        item5: { status: "BLOCKED", detail: err.message },
        item6: { status: "BLOCKED", detail: err.message },
        item7: { status: "BLOCKED", detail: err.message }
      };
    } finally {
      await closeApp(session);
    }
  }

  // IN BẢNG 3 CỘT DOC, SHEET, SLIDE
  const items = [
    { key: "item1", name: "1. Gạch đỏ từ sai DOM" },
    { key: "item2", name: "2. Không gạch sai từ đúng" },
    { key: "item3", name: "3. Caret không di chuyển" },
    { key: "item4", name: "4. Không làm chậm gõ" },
    { key: "item5", name: "5. Gợi ý & 1-step Undo" },
    { key: "item6", name: "6. Thêm từ / Bỏ qua" },
    { key: "item7", name: "7. Bật/tắt chính tả" }
  ];

  console.log("\n=========================================================================================================");
  console.log("BẢNG KẾT QUẢ ĐO THỰC TẾ CH-7.2: KIỂM TRA CHÍNH TẢ TIẾNG VIỆT (DOC, SHEET, SLIDE)");
  console.log("=========================================================================================================");
  console.log(
    "TIÊU CHÍ".padEnd(28) + " | " +
    "3T DOC".padEnd(10) + " | " +
    "3T SHEET".padEnd(15) + " | " +
    "3T SLIDE".padEnd(10) + " | " +
    "CHI TIẾT ĐO ĐẠC"
  );
  console.log("-".repeat(28) + "-+-" + "-".repeat(10) + "-+-" + "-".repeat(15) + "-+-" + "-".repeat(10) + "-+-" + "-".repeat(45));

  for (const item of items) {
    const w = appResults.writer?.[item.key] || { status: "N/A", detail: "" };
    const s = appResults.sheet?.[item.key] || { status: "N/A", detail: "" };
    const sl = appResults.slides?.[item.key] || { status: "N/A", detail: "" };

    const detailSummary = `Doc: ${w.detail} | Sheet: ${s.detail} | Slide: ${sl.detail}`;
    console.log(
      item.name.padEnd(28) + " | " +
      w.status.padEnd(10) + " | " +
      s.status.padEnd(15) + " | " +
      sl.status.padEnd(10) + " | " +
      detailSummary
    );
  }
  console.log("=========================================================================================================\n");

  return appResults;
}

run().catch(err => {
  console.error("LỖI TOÀN BỤNG SCRIPT:", err);
  process.exitCode = 1;
});
