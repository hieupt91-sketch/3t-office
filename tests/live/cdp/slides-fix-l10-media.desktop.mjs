import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";
import { createTinyMp3, createTinyMp4 } from "../../helpers/tiny-media.mjs";

const root = process.env.VNO_APP_ROOT;
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.VNO_FIX_L8_SOURCE || "E:\\VN OFice\\file test\\sample-3.pptx";
if (!root || !localAppData) throw new Error("Set VNO_APP_ROOT and VNO_CDP_LOCALAPPDATA.");
const file = path.join(localAppData, "fix-l10-media.pptx");
const videoFile = path.join(localAppData, "fix-l10-video.mp4");
const audioFile = path.join(localAppData, "fix-l10-audio.mp3");
const evidence = path.resolve("docs/tickets-0710/evidence/fix-l10/insert");
await fs.mkdir(localAppData, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
await fs.copyFile(source, file);
await fs.writeFile(videoFile, createTinyMp4());
await fs.writeFile(audioFile, createTinyMp3());
const session = await launchApp("slides", { root, filePath: file, localAppData, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const read = () => session.cdp.evaluate(`JSON.stringify((()=>{const c=window.__vnoAppInstance.adapter.canvas,s=c.slides[c.currentSlideIndex];return{slides:c.slides.length,index:c.currentSlideIndex,shapes:s.shapes.map(x=>({type:x.type,srcLength:String(x.src||"").length,sizeBytes:x.sizeBytes||null}))}})())`);
const screenshot = async name => {
  const result = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await fs.writeFile(path.join(evidence, `${name}.png`), Buffer.from(result.result.data, "base64"));
};
const waitForChooser = () => new Promise((resolve, reject) => {
  const listener = event => {
    let message;
    try { message = JSON.parse(String(event.data)); } catch { return; }
    if (message.method !== "Page.fileChooserOpened") return;
    clearTimeout(timer);
    session.cdp.socket.removeEventListener("message", listener);
    resolve(message.params);
  };
  const timer = setTimeout(() => {
    session.cdp.socket.removeEventListener("message", listener);
    reject(new Error("Timed out waiting for the CDP file chooser."));
  }, 15000);
  session.cdp.socket.addEventListener("message", listener);
});
const chooseFileAfterClick = async (commandId, filePath) => {
  const chooser = waitForChooser();
  await click(session.cdp, `[data-command-id="${commandId}"]`);
  const params = await chooser;
  if (!params.backendNodeId) throw new Error("The file chooser event omitted backendNodeId.");
  await session.cdp.send("DOM.setFileInputFiles", { files: [filePath], backendNodeId: params.backendNodeId });
};
const result = { file, videoFile, audioFile };
try {
  const normalized = file.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(()=>{const a=window.__vnoAppInstance?.adapter,p=String(a?._sourcePath||a?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return p===${JSON.stringify(normalized)}&&a?.canvas?.slides?.length>0})()`, { timeoutMilliseconds: 300000, intervalMilliseconds: 500 });
  await session.cdp.send("Page.enable");
  await session.cdp.send("Page.setInterceptFileChooserDialog", { enabled: true });
  await session.cdp.send("DOM.enable");
  await click(session.cdp, "#vno-ribbon-tab-insert");
  for (const [type, commandId, pathToFile] of [["video", "slides.media.insertVideo", videoFile], ["audio", "slides.media.insertAudio", audioFile]]) {
    try {
      await chooseFileAfterClick(commandId, pathToFile);
      await session.cdp.waitFor(`window.__vnoAppInstance.adapter.canvas.slides[0].shapes.some(x=>x.type===${JSON.stringify(type)})`, { timeoutMilliseconds: 30000 });
      result[type] = { selected: true, state: JSON.parse(await read()) };
      await screenshot(`media-${type}`);
    } catch (error) {
      result[type] = { selected: false, reason: error.message, state: JSON.parse(await read()) };
      await screenshot(`media-${type}-chooser-unavailable`);
    }
  }
  result.saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 600000 });
  if (!result.saved) throw new Error("Save returned false.");
  await fs.writeFile(path.join(evidence, "media-cdp-readback.json"), JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
  if (!result.video.selected || !result.audio.selected) process.exitCode = 1;
} finally { await session.close(); }
