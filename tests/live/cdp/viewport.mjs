// Doi kich thuoc vung nhin cua app desktop qua CDP (chi ha tang test).
// WebView2 (Windows) ho tro Browser.setWindowBounds. QtWebEngine (macOS, PYWEBVIEW_GUI=qt) tra loi
// thanh cong nhung KHONG doi kich thuoc cua so (MAC-6, do 25/10/2026: 1920x942 truoc va sau).
// Khi do thay kich thuoc khong doi, chuyen sang Emulation.setDeviceMetricsOverride va bao ro mode.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function unwrap(response) {
  return response && response.result !== undefined ? response.result : response;
}

async function readViewport(cdp) {
  const text = await cdp.evaluate("window.innerWidth + 'x' + window.innerHeight");
  const [width, height] = String(text).split("x").map(Number);
  return { width, height, text: String(text) };
}

/**
 * @param {{send: Function, evaluate: Function}} cdp
 * @param {number} width
 * @param {number} height
 * @param {{settleMilliseconds?: number}} [options]
 * @returns {Promise<{mode: "window"|"emulated"|"reset", viewport: string, windowError?: string}>}
 */
export async function resizeViewport(cdp, width, height, options = {}) {
  const settle = options.settleMilliseconds ?? 800;
  if (width === 0 && height === 0) {
    await cdp.send("Emulation.clearDeviceMetricsOverride", {}, 15000);
    await sleep(settle);
    return { mode: "reset", viewport: (await readViewport(cdp)).text };
  }
  const target = { width: width || 1366, height: height || 768 };
  let windowError = "";
  try {
    const win = unwrap(await cdp.send("Browser.getWindowForTarget", {}, 15000));
    await cdp.send("Browser.setWindowBounds", {
      windowId: win.windowId,
      bounds: { windowState: "normal", width: target.width, height: target.height },
    }, 15000);
  } catch (error) {
    windowError = String(error && error.message || error);
  }
  await sleep(settle);
  const before = await readViewport(cdp);
  // Cua so that co vien/thanh tieu de nen innerWidth nho hon width mot chut; chap nhan lech 64px.
  if (Math.abs(before.width - target.width) <= 64 && Math.abs(before.height - target.height) <= 160) {
    return { mode: "window", viewport: before.text, ...(windowError ? { windowError } : {}) };
  }
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: target.width, height: target.height, deviceScaleFactor: 0, mobile: false,
  }, 15000);
  await sleep(settle);
  const after = await readViewport(cdp);
  return { mode: "emulated", viewport: after.text, ...(windowError ? { windowError } : {}) };
}
