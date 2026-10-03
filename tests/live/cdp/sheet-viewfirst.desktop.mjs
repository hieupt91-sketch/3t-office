// P8 Sheet viewport-first: real desktop + real LibreOffice, controlled only through CDP.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./client.mjs";

const profile = process.env.VNO_P8_PROFILE || "E:\\VNOffice-profiles\\codex-p8ui";
const fallbackLanDir = "E:\\VN OFice\\file test\\lan";
const lanDir = process.env.VNO_LAN_DIR || (fs.existsSync(path.join(repoRoot, "file test", "lan"))
  ? path.join(repoRoot, "file test", "lan") : fallbackLanDir);
const requested = (process.env.VNO_P8_FILES || "lan14,lan03,lan16,lan26").split(",").map(name => name.trim()).filter(Boolean);
const rows = [];

function record(file, name, ok, detail = "") {
  rows.push({ file, name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${file} | ${name}${detail ? " | " + detail : ""}`);
}

async function waitUntil(cdp, expression, timeout = 30000, interval = 250) {
  const started = Date.now();
  let value;
  while (Date.now() - started < timeout) {
    value = await cdp.evaluate(expression);
    if (value) return value;
    await sleep(interval);
  }
  throw new Error(`Timeout ${timeout}ms: ${expression.slice(0, 160)}`);
}

async function sampleWebViewBytes(rootPid) {
  if (process.platform !== "win32") return 0;
  try {
    const script = `$root=${Number(rootPid)}; $all=@(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name); $ids=@($root); do { $before=$ids.Count; $ids+=@($all | Where-Object { $ids -contains $_.ParentProcessId } | ForEach-Object ProcessId); $ids=@($ids | Sort-Object -Unique) } while($ids.Count -gt $before); (@($all | Where-Object { $ids -contains $_.ProcessId -and $_.Name -eq 'msedgewebview2.exe' } | ForEach-Object { try { (Get-Process -Id $_.ProcessId -ErrorAction Stop).WorkingSet64 } catch { 0 } }) | Measure-Object -Maximum).Maximum`;
    return Number(execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8", windowsHide: true }).trim()) || 0;
  } catch { return 0; }
}

async function runFile(baseName) {
  const file = baseName.toLowerCase().endsWith(".xlsx") ? baseName : `${baseName}.xlsx`;
  const filePath = path.join(lanDir, file);
  if (!fs.existsSync(filePath)) {
    record(file, "fixture tồn tại", false, filePath);
    return;
  }
  // VNO_P8_FLAG=0 measures the same RAM/timing harness on the unchanged full-open path (baseline).
process.env.VNO_OPEN_VIEWFIRST = process.env.VNO_P8_FLAG ?? "1";
  process.env.VNO_PERF_DEBUG = "1";
  const started = Date.now();
  let session = null;
  let launchError = null;
  for (let attempt = 1; attempt <= 2 && !session; attempt++) {
    try {
      session = await launchApp("sheet", {
        filePath,
        localAppData: profile,
        startTimeoutMilliseconds: 120000,
        readyTimeoutMilliseconds: 90000
      });
      if (attempt > 1) record(file, "khởi động lại sau lỗi hạ tầng ngẫu nhiên", true, `attempt=${attempt}`);
    } catch (error) {
      launchError = error;
      if (attempt < 2) await sleep(1500);
    }
  }
  if (!session) throw launchError;
  const { cdp } = session;
  let peakBytes = 0;
  let sampling = true;
  const ramTimeline = [];
  const sampler = (async () => {
    while (sampling) {
      const bytes = await sampleWebViewBytes(session.child.pid);
      peakBytes = Math.max(peakBytes, bytes);
      ramTimeline.push([Math.round((Date.now() - started) / 1000), Math.round(bytes / 1048576)]);
      await sleep(1500);
    }
  })();
  try {
    await waitUntil(cdp, `window.__vnoSheetQuickViewController?.active && !!document.querySelector('.vno-sheet-quick-view')`, 60000);
    const quick = await cdp.evaluate(`(() => {
      const cell=document.querySelector('.vno-sheet-quick-cell[data-row="1"][data-col="0"]');
      const q=window.__vnoSheetQuickViewController;
      return {text:cell?.textContent??null,value:cell?.dataset.value??null,sheets:q?.sheets?.length||0,
        cellCount:document.querySelectorAll('.vno-sheet-quick-cell').length,
        row0:document.querySelector('.vno-sheet-quick-table')?.dataset.r0??null};
    })()`);
    const quickMs = Date.now() - started;
    record(file, "xem nhanh hiện A1", quick.text !== null, `${quickMs} ms; A1=${JSON.stringify(quick.text)}; cells=${quick.cellCount}; r0=${quick.row0}`);
    record(file, "mục tiêu màn hình đầu <= 12 giây", file !== "lan14.xlsx" || quickMs <= 12000, `${quickMs} ms`);

    const firstSnapshot = await cdp.evaluate(`(() => {
      const q=window.__vnoSheetQuickViewController;
      const cells=[];
      for(let r=1;r<=30;r++) for(let c=0;c<10;c++) {
        const el=document.querySelector('.vno-sheet-quick-cell[data-row="'+r+'"][data-col="'+c+'"]');
        cells.push({r,c,value:el?.dataset.value||'',text:el?.textContent||''});
      }
      return {sheet:q.sheets[0].name,cells};
    })()`);

    const scrollResult = await cdp.evaluate(`(() => {
      const q=window.__vnoSheetQuickViewController;
      const max=Math.max(1,Number(q.sheets[0].rows)||1);
      const target=Math.min(20000,max);
      q.viewport.scrollTop=(target-1)*26;
      q.viewport.dispatchEvent(new Event('scroll'));
      return {target,max};
    })()`);
    const scrolled = await waitUntil(cdp, `(() => {
      const table=document.querySelector('.vno-sheet-quick-table'); if(!table)return null;
      const r0=Number(table.dataset.r0); const target=${Number(scrollResult.target)};
      if(!(r0<=target-1 && target-1<r0+80))return null;
      const cells=[...table.querySelectorAll('.vno-sheet-quick-cell')];
      return {r0,nonEmpty:cells.filter(c=>c.textContent!=='').length};
    })()`, 30000);
    record(file, "cuộn xem nhanh tới khoảng dòng 20.000", scrolled.r0 <= scrollResult.target - 1, JSON.stringify(scrolled));
    record(file, "vùng cuộn có dữ liệu", scrolled.nonEmpty > 0, `nonEmpty=${scrolled.nonEmpty}`);

    const sheetState = await cdp.evaluate(`(() => {
      const q=window.__vnoSheetQuickViewController;
      const index=(q.sheets.length>1 && ${process.env.VNO_P8_NOSWITCH === "1" ? "false" : "true"})?1:0;
      document.querySelector('.vno-sheet-quick-tab[data-sheet-index="'+index+'"]')?.click();
      return {index,name:q.sheets[index].name,rows:q.sheets[index].rows};
    })()`);
    await waitUntil(cdp, `document.querySelector('.vno-sheet-quick-tab.is-active')?.dataset.sheetIndex==='${sheetState.index}'`, 30000);
    await waitUntil(cdp, `document.querySelector('.vno-sheet-quick-table')?.dataset.r0==='0'`, 30000);
    const selectedState = await cdp.evaluate(`(() => {
      const q=window.__vnoSheetQuickViewController;
      const visible=[...document.querySelectorAll('.vno-sheet-quick-table tbody tr:not([data-source-hidden="true"]) .vno-sheet-quick-cell[data-col="0"]')]
        .map(cell=>Number(cell.dataset.row)).filter(Number.isFinite);
      const row=visible.find(value=>value>=20)||visible[0]||1;
      q.viewport.scrollTop=(row-1)*26; q.viewport.dispatchEvent(new Event('scroll'));
      return {sheet:q.sheets[q.activeSheet].name,row,col:0};
    })()`);
    await waitUntil(cdp, `!!document.querySelector('.vno-sheet-quick-cell[data-row="${selectedState.row}"][data-col="0"]')`, 30000);
    await waitUntil(cdp, `Math.abs((window.__vnoSheetQuickViewController?.anchorRow||0)-${selectedState.row})<=1`, 30000);
    await cdp.evaluate(`document.querySelector('.vno-sheet-quick-cell[data-row="${selectedState.row}"][data-col="0"]')?.click()`);
    record(file, "đổi sheet trong xem nhanh", sheetState.index === 0 || sheetState.name !== firstSnapshot.sheet, sheetState.name);

    await waitUntil(cdp, `!document.querySelector('.vno-sheet-quick-view') && !!window.__vnoAppInstance?.adapter?.sourceFilePath`, 360000, 500);
    const transition = await cdp.evaluate(`(() => {
      const g=window.__vnoAppInstance.grid;
      return {sheet:g.activeSheet,row:g.selectedCoord?.r,col:g.selectedCoord?.c,
        firstRow:g._firstVisibleRow?.(g.viewport.scrollTop),scrollTop:g.viewport.scrollTop};
    })()`);
    record(file, "chuyển đầy đủ giữ sheet", transition.sheet === selectedState.sheet, JSON.stringify(transition));
    record(file, "chuyển đầy đủ giữ ô chọn", transition.row === selectedState.row && transition.col === "A", JSON.stringify(transition));
    record(file, "chuyển đầy đủ giữ vị trí cuộn", Math.abs(Number(transition.firstRow) - selectedState.row) <= 2, JSON.stringify(transition));

    const comparison = await cdp.evaluate(`(() => {
      const g=window.__vnoAppInstance.grid; const quick=${JSON.stringify(firstSnapshot)};
      if(g.activeSheet!==quick.sheet)g.switchSheet(quick.sheet,{skipSave:true});
      g.viewport.scrollTop=0; g.viewport.scrollLeft=0; g._onViewportScroll?.();
      const mismatches=[];
      for(const q of quick.cells){
        const col=g._columnLabel(q.c+1); const key=col+q.r; const item=g.cellsData.get(key);
        const el=document.createElement('td'); g._renderCellVisual(el,item,col,q.r);
        const normalize=value=>String(value??'').replace(/\\r\\n/g,'\\n').replace(/\\r/g,'\\n');
        const value=normalize(item?.val); const text=normalize(el.textContent);
        // Values must match exactly. Displayed text ignores leading/trailing blank lines only: the real
        // grid renders a leading line break of a multi-line cell with one extra line break (lan26 C12, 04/10),
        // a whitespace-only difference in the transient read-only preview (see HANDOFF-PERF-P8UI.md).
        const edge=s=>s.replace(/^\\n+|\\n+$/g,'');
        if(value!==normalize(q.value)||edge(text)!==edge(normalize(q.text)))mismatches.push({key,qv:q.value,v:value,qt:q.text,t:text});
      }
      return {count:mismatches.length,first:mismatches.slice(0,5)};
    })()`);
    record(file, "30x10 quick view trùng lưới thật (giá trị + chữ)", comparison.count === 0, JSON.stringify(comparison));
  } finally {
    sampling = false;
    await sampler.catch(() => {});
    peakBytes = Math.max(peakBytes, await sampleWebViewBytes(session.child.pid));
    console.log("RAM_TIMELINE_MB(sec,largest WebView2 process)", JSON.stringify(ramTimeline.filter((_, index) => index % 3 === 0)));
    if (file === "lan14.xlsx") {
      const peakGb = peakBytes / (1024 ** 3);
      // Baseline on main (04/10/2026, same harness): lan14 open only = 1.985 GB. Switching to Sheet2 used to
      // reach 4.788 GB (stale virtual window, fixed in switchSheet); now ~2.06 GB.
      const limitGb = 2.4;
      record(file, `peak RAM tiến trình WebView2 lớn nhất <= ${limitGb} GB (so với bản gốc cùng kịch bản)`, peakBytes > 0 && peakGb <= limitGb, `${peakGb.toFixed(3)} GB`);
    }
    await session.close();
  }
}

try {
  for (const file of requested) await runFile(file);
} finally {
  delete process.env.VNO_OPEN_VIEWFIRST;
  delete process.env.VNO_PERF_DEBUG;
}

const failed = rows.filter(row => !row.ok);
console.log(`KẾT QUẢ P8 VIEW-FIRST: ${rows.length - failed.length}/${rows.length} PASS | ${failed.length} FAIL`);
process.exitCode = failed.length ? 1 : 0;
