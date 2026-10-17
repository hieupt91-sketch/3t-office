// Writer: hộp thoại Hình khối có thêm hình dựng sẵn (sao, trái tim, ...); lưu DOCX thành hình tự động chuẩn.
// Cần VNO_CDP_LOCALAPPDATA. Kết quả đọc lại bằng scripts/audit-0610/word_shape_presets_readback.ps1.
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.join(profile, "writer-shape-presets.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const insert = async (id) => {
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.shape.insert"]');
  await cdp.waitFor("!!document.querySelector('.vno-shape-card')", { timeoutMilliseconds: 10000 });
  await cdp.evaluate(`document.querySelector('.vno-shape-card[data-shape-type="${id}"]').scrollIntoView({ block: "center" })`);
  await sleep(200);
  await click(cdp, `.vno-shape-card[data-shape-type="${id}"]`);
  await click(cdp, ".vno-dialog-overlay .vno-dialog-ok-btn");
  await sleep(500);
};
try {
  for (const id of ["star5", "heart", "hexagon"]) await insert(id);
  const types = JSON.parse(await cdp.evaluate("JSON.stringify(window.__vnoAppInstance.adapter.shapes.map(s => s.type || s.shapeType))"));
  check("Chèn 3 hình dựng sẵn từ hộp thoại", types.join(",") === "star5,heart,hexagon", types.join(","));
  const svg = await cdp.evaluate("document.querySelectorAll('.vno-writer-shape svg path, [data-shape-id] svg path').length");
  check("Trang vẽ hình bằng SVG", svg >= 3, String(svg));
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  check("Lưu DOCX", result?.status === "ok", JSON.stringify(result).slice(0, 120));
  console.log("OUT " + output);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
