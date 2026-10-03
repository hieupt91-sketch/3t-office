/**
 * Khởi động sớm engine tài liệu do main.py sở hữu để thời gian dựng LibreOffice
 * chồng lấp với bootstrap giao diện. Không đổi giao thức hay vòng đời worker.
 */
export function scheduleDocumentEngineWarmup(options = {}) {
  const target = options.target || globalThis;
  const getApi = options.getApi || (() => target.pywebview?.api);
  const defer = options.setTimeoutFn || target.setTimeout?.bind(target) || setTimeout;
  if (target.__VNO_OPEN_LEGACY === true) {
    return scheduleDocumentEngineWarmupLegacy({ target, getApi, defer });
  }

  let waitingForBridge = false;
  const start = () => {
    const api = getApi();
    if (!api?.start_document_engine) {
      if (!waitingForBridge) {
        waitingForBridge = true;
        target.addEventListener?.("pywebviewready", start, { once: true });
      }
      return false;
    }
    Promise.resolve(api.start_document_engine()).catch(() => {});
    return true;
  };
  start();
  return { mode: "early", start };
}

// superseded by P4 - xoa chi khi chu so huu duyet
export function scheduleDocumentEngineWarmupLegacy({ target, getApi, defer }) {
  let scheduled = false;
  const start = () => {
    const api = getApi();
    if (!api?.start_document_engine) {
      target.addEventListener?.("pywebviewready", start, { once: true });
      return false;
    }
    Promise.resolve(api.start_document_engine()).catch(() => {});
    return true;
  };
  const afterFirstInput = (event) => {
    if (scheduled || !event.isTrusted) return;
    scheduled = true;
    for (const eventName of ["pointerdown", "keydown", "paste", "drop"]) {
      target.document?.removeEventListener?.(eventName, afterFirstInput, true);
    }
    defer(start, 250);
  };
  for (const eventName of ["pointerdown", "keydown", "paste", "drop"]) {
    target.document?.addEventListener?.(eventName, afterFirstInput, true);
  }
  return { mode: "legacy", start, afterFirstInput };
}
