import { launchApp } from "./session.mjs";
const file = process.env.OPEN_FILE;
const t0 = Date.now();
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 300000, readyTimeoutMilliseconds: 300000 });
const tLaunch = Date.now() - t0;
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 300", { timeoutMilliseconds: 300000, intervalMilliseconds: 100 });
  console.log("OPEN_MS launch=" + tLaunch + " tong_den_khi_co_noi_dung=" + (Date.now() - t0));
} finally { await session.close(); }