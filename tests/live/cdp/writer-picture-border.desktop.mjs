// Writer: Định dạng Hình ảnh > Viền ảnh… (nét đứt 2,25 pt xanh), lưu DOCX; Word COM đọc Line của ảnh (word_picture_border_readback.ps1).
import fs from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.join(profile, "writer-picture-border.docx");
const dataUrl = "data:image/png;base64," + fs.readFileSync("E:\\VNOffice-profiles\\claude-slidetrans\\pic.png").toString("base64");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await sleep(1500);
  await cdp.evaluate(`(() => { const b = document.querySelector('.vno-writer-body'); b.innerHTML = '<p>Anh minh hoa: <img src="${dataUrl}" style="width:200px;height:120px"></p>'; b.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(500);
  await click(cdp, ".vno-writer-body img");
  await sleep(400);
  const opened = await cdp.evaluate(`(async () => { window.__vnoAppInstance.adapter.setPictureBorder(); await new Promise(r => setTimeout(r, 400)); return !!document.querySelector('#vno-tblb-style') && document.querySelector('#vno-tblb-title').textContent; })()`);
  check("Hộp thoại Viền ảnh mở khi chọn ảnh", opened === "Viền ảnh", String(opened));
  await cdp.evaluate(`(() => { const set = (id, v) => { const el = document.querySelector(id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }; set('#vno-tblb-type', 'all'); set('#vno-tblb-style', 'dashed'); set('#vno-tblb-width', '2.25'); set('#vno-tblb-color', '#0000ff'); })()`);
  await click(cdp, ".vno-dialog-ok-btn");
  await sleep(500);
  const border = await cdp.evaluate(`(() => { const s = document.querySelector('.vno-writer-body img').style; return s.borderWidth + ' ' + s.borderStyle + ' ' + s.borderColor; })()`);
  check("Ảnh có viền nét đứt xanh 3px", /3px/.test(border) && /dashed/.test(border) && /rgb\(0, 0, 255\)/.test(border), border);
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  check("Lưu DOCX", result?.status === "ok", JSON.stringify(result).slice(0, 100));
  console.log("OUT " + output);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
