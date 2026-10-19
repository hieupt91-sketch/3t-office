import { launchApp } from "./session.mjs";
import { click, typeText } from "./actions.mjs";
import path from "node:path";

const image = process.env.VNO_AUDIT_IMAGE;
if (!image) throw new Error("Set VNO_AUDIT_IMAGE to a PNG file.");
const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await click(cdp, ".vno-writer-body p");
  await typeText(cdp, "Image insertion probe");
  await click(cdp, "#vno-ribbon-tab-insert");
  await cdp.send("Page.enable");
  await cdp.send("Page.setInterceptFileChooserDialog", { enabled: true });
  const chooser = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for file chooser")), 10000);
    const listener = event => {
      const message = JSON.parse(String(event.data));
      if (message.method !== "Page.fileChooserOpened") return;
      clearTimeout(timer);
      cdp.socket.removeEventListener("message", listener);
      resolve(message.params);
    };
    cdp.socket.addEventListener("message", listener);
  });
  await click(cdp, 'button[data-command-id="writer.image.insert"]');
  const opened = await chooser;
  await cdp.send("DOM.setFileInputFiles", { files: [path.resolve(image)], backendNodeId: opened.backendNodeId });
  await cdp.waitFor("document.querySelector('.vno-writer-body img')?.complete", { timeoutMilliseconds: 15000 });
  const result = await cdp.evaluate(`(() => {
    const image = document.querySelector('.vno-writer-body img');
    const paragraph = image?.closest('p');
    return {width:image?.getBoundingClientRect().width, height:image?.getBoundingClientRect().height,
      intrinsicWidth:image?.naturalWidth, htmlWidth:Number(image?.getAttribute('width')),
      paragraphAlign:paragraph ? (paragraph.style.textAlign || getComputedStyle(paragraph).textAlign) : "",
      bodyWidth:document.querySelector('.vno-writer-body').clientWidth};
  })()`);
  const checks = [
    ["Image fits the printable body width", result.htmlWidth > 0 && result.htmlWidth <= result.bodyWidth],
    ["Inserted image is centered", result.paragraphAlign === "center"],
  ];
  for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  console.log(JSON.stringify(result));
  if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
} finally { await session.close(); }
