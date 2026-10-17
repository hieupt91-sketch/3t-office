import assert from "node:assert/strict";
import { WriterViewController } from "../../apps/writer/writer-view-controller.js";

export async function runWriterZoomWheelTests() {
  const results = [];
  try {
    const viewport = {
      clientWidth: 900,
      clientHeight: 800,
      style: { setProperty() {} },
      addEventListener(name, handler, options) {
        if (name === "wheel") {
          this.wheelHandler = handler;
          this.wheelOptions = options;
        }
      },
      removeEventListener(name, handler) {
        if (name === "wheel" && this.wheelHandler === handler) this.removedWheelHandler = handler;
      }
    };
    const classes = new Set();
    const container = {
      classList: {
        contains: name => classes.has(name),
        toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); },
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); }
      }
    };
    const zoomListeners = new Set();
    const shell = {
      zoomLevel: 100,
      subscribeZoom(listener) { zoomListeners.add(listener); return () => zoomListeners.delete(listener); },
      setZoomLevel(value) { this.zoomLevel = value; zoomListeners.forEach(listener => listener(value)); }
    };
    const controller = new WriterViewController({
      container,
      viewport,
      page: { style: {}, dataset: {}, offsetWidth: 794, offsetHeight: 1123, scrollHeight: 1123 },
      ruler: {},
      shell
    });
    let echoShellZoom = false;
    shell.onZoomChange = percent => controller.setZoom(percent / 100);
    const setZoomLevel = shell.setZoomLevel.bind(shell);
    shell.setZoomLevel = value => {
      setZoomLevel(value);
      if (echoShellZoom) {
        echoShellZoom = false;
        shell.onZoomChange(value);
      }
    };
    const oldWindow = globalThis.window;
    const oldDocument = globalThis.document;
    try {
      globalThis.window = { addEventListener() {}, removeEventListener() {} };
      globalThis.document = { addEventListener() {}, removeEventListener() {} };
      controller.attach();
      assert.equal(typeof viewport.wheelHandler, "function");
      assert.equal(viewport.wheelOptions.passive, false);
      let prevented = false;
      viewport.wheelHandler({ ctrlKey: false, deltaY: -100, preventDefault() { prevented = true; } });
      assert.equal(controller.zoomLevel, 1, "plain wheel must not zoom");
      assert.equal(prevented, false, "plain wheel must not be intercepted");
      viewport.wheelHandler({ ctrlKey: true, deltaY: -100, preventDefault() { prevented = true; } });
      assert.equal(controller.zoomLevel, 1.1, "Ctrl+wheel up must zoom in");
      assert.equal(shell.zoomLevel, 110, "Ctrl+wheel must update the shared zoom control");
      assert.equal(prevented, true, "Ctrl+wheel must suppress browser zoom");
      echoShellZoom = true;
      controller.pageWidth();
      assert.equal(classes.has("vno-writer-page-width"), true, "page-width fit marker must survive the AppShell zoom echo for resize refits");
      echoShellZoom = true;
      shell.setZoomLevel(125);
      assert.equal(controller.zoomLevel, 1.25, "shared zoom slider must update the Writer view controller");
      assert.equal(classes.has("vno-writer-page-width"), false, "manual shared zoom must leave page-width fit mode");
      viewport.wheelHandler({ ctrlKey: true, deltaY: 100, preventDefault() {} });
      assert.equal(controller.zoomLevel, 1.15, "Ctrl+wheel down must zoom out from the shared zoom value");
      assert.equal(shell.zoomLevel, 115, "Ctrl+wheel down must keep the zoom slider synchronized");
      assert.equal(controller.setZoom(5.25), 5, "Writer zoom must clamp to 500%");
      assert.equal(shell.zoomLevel, 500, "500% zoom must stay synchronized with the status control");
      controller.fitPage();
      assert.ok(controller.zoomLevel >= 0.1 && controller.zoomLevel <= 5, "Fit Page must use the supported zoom range");
      controller.multiplePages();
      assert.equal(classes.has("vno-writer-multiple-pages"), true, "Multiple Pages must set its view state");
      controller.destroy();
      assert.equal(viewport.removedWheelHandler, viewport.wheelHandler, "wheel listener must be removed on destroy");
      assert.equal(zoomListeners.size, 0, "zoom subscription must be removed on destroy");

      let desktopRequests = 0;
      let browserOpenCalls = 0;
      shell.requestNewDocumentWindow = async () => { desktopRequests += 1; return true; };
      globalThis.window.open = () => { browserOpenCalls += 1; return {}; };
      assert.equal(await controller.newWindow(), true, "desktop new-window request must succeed");
      assert.equal(desktopRequests, 1, "Writer must route New Window through AppShell");
      assert.equal(browserOpenCalls, 0, "desktop New Window must not call window.open directly");
    } finally {
      globalThis.window = oldWindow;
      globalThis.document = oldDocument;
    }
    results.push({ name: "Writer Ctrl+wheel zoom: direction, browser suppression, and listener cleanup", pass: true });
    results.push({ name: "Writer New Window: dùng cầu nối desktop thay vì window.open", pass: true });
  } catch (error) {
    results.push({ name: "Writer Ctrl+wheel zoom: direction, browser suppression, and listener cleanup", pass: false, error: error.stack || error.message });
    results.push({ name: "Writer New Window: dùng cầu nối desktop thay vì window.open", pass: false, error: error.stack || error.message });
  }
  return results;
}
