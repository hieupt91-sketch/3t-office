/**
 * 3T Office — Startup Splash Screen Controller
 * Điều khiển màn hình khởi động mượt mà, tự động ẩn khi giao diện sẵn sàng.
 */

const APP_NAMES = {
  writer: "3T Doc",
  sheet: "3T Sheet",
  slides: "3T Slide"
};

export function getSplashScreenElement() {
  return document.getElementById("vno-splash-screen");
}

export function setSplashApp(appKind) {
  const badge = document.getElementById("vno-splash-app-name");
  if (!badge) return;
  const normalized = (appKind || "writer").toLowerCase();
  const displayName = APP_NAMES[normalized] || "3T Doc";
  badge.textContent = displayName;
  badge.setAttribute("data-app", normalized);
}

export function setSplashStatus(statusText) {
  const statusEl = document.getElementById("vno-splash-status-text");
  if (statusEl && statusText) {
    statusEl.textContent = statusText;
  }
}

let _splashHidden = false;

export function hideSplashScreen(delayMs = 0) {
  if (_splashHidden) return;
  const splash = getSplashScreenElement();
  if (!splash) return;

  const doHide = () => {
    splash.classList.add("is-hidden");
    splash.setAttribute("aria-busy", "false");
    _splashHidden = true;
    setTimeout(() => {
      splash.style.display = "none";
      splash.hidden = true;
    }, 400);
  };

  if (delayMs > 0) {
    setTimeout(doHide, delayMs);
  } else {
    // Để 1 frame repaint cuối cùng đảm bảo giao diện app đã render xong
    requestAnimationFrame(() => {
      requestAnimationFrame(doHide);
    });
  }
}

export function showSplashScreen(appKind, statusText = "Đang khởi động…") {
  const splash = getSplashScreenElement();
  if (!splash) return;
  _splashHidden = false;
  splash.hidden = false;
  splash.style.display = "flex";
  splash.classList.remove("is-hidden");
  splash.setAttribute("aria-busy", "true");
  if (appKind) setSplashApp(appKind);
  if (statusText) setSplashStatus(statusText);
}
