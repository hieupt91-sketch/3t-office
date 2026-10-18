// Sheet: văn bản nhiều kiểu trong ô (rich text) lấy từ tệp - tên phông chứa dấu nháy/thẻ không được chèn thuộc tính hay thẻ vào ô.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-rte-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("sheet", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 3000));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  const EVIL = 'Arial" data-pwn="1" onmouseover="window.__pwned=1" x="';
  await ev(`(() => {
    const g = window.__vnoAppInstance.grid;
    g.setCellValue("A", 1, "abc");
    const item = g.cellsData.get("A1");
    item.richText = [{ text: "abc <b id=zz>x</b>", style: { fontFamily: ${JSON.stringify(EVIL)}, color: "#ff0000" } }];
    g.cellsData.set("A1", item);
    g._renderVirtualRows(g.currentStartRow || 1, g.currentEndRow || 40);
  })()`);
  await new Promise(r => setTimeout(r, 300));
  const info = JSON.parse(await ev(`JSON.stringify((() => { const td = document.querySelector('.vno-grid-cell[data-coord="A1"]'); const span = td && td.querySelector('span'); return { span: !!span, injected: !!(span && span.hasAttribute('data-pwn')), tag: !!document.querySelector('#zz'), text: td ? td.textContent : null }; })())`));
  check("Có ô rich text hiển thị", info.span === true, JSON.stringify(info));
  check("Tên phông chứa dấu nháy không chèn được thuộc tính", info.injected === false);
  check("Chữ có thẻ HTML hiện nguyên văn", info.tag === false && String(info.text).includes("<b id=zz>x</b>"), String(info.text));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
