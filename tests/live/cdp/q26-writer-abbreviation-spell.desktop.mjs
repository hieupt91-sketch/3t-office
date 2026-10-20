import { launchApp } from "./session.mjs";
import path from "node:path";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
const source = process.env.Q26_SOURCE_DOCX;
if (!profile || !source) throw new Error("Set a fresh VNO_CDP_LOCALAPPDATA and Q26_SOURCE_DOCX.");
const session = await launchApp("writer", { filePath: source, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const expected = source.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; return String(a?._sourcePath||a?.sourceFilePath||'').replace(/\\\\/g,'/').toLowerCase()===${JSON.stringify(expected)}; })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const result = await session.cdp.evaluate(`(() => {
    const checker=window.__vnoAppInstance?.spellcheckController?.checker;
    const words='Ủy ban nhân dân UBND; công ty TNHH; Nghị định 30/2020/NĐ-CP.';
    return {available:!!checker,issues:checker?.checkText(words)||[],known:{UBND:checker?.isKnown('UBND'),TNHH:checker?.isKnown('TNHH'),ND:checker?.isKnown('NĐ'),CP:checker?.isKnown('CP')}};
  })()`);
  const pass = result.available && result.issues.length === 0 && Object.values(result.known).every(Boolean);
  console.log(`${pass ? "PASS" : "FAIL"} | Từ viết tắt và viện dẫn văn bản không bị báo sai | ${JSON.stringify(result)}`);
  if (!pass) process.exitCode = 1;
} finally { await session.close().catch(() => {}); }
