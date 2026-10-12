import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
const corpus = process.env.VNO_DOCX_CORPUS;
if (!profile || !corpus) throw new Error("VNO_CDP_LOCALAPPDATA and VNO_DOCX_CORPUS are required.");
const names = ["d01.docx", "d02.docx", "d06.docx", "d07.docx", "d13.docx", "d20.docx", "d24.docx"];
const rows = [];

for (const name of names) {
  const session = await launchApp("writer", {
    filePath: path.join(corpus, name),
    localAppData: path.join(profile, "count-corpus", path.basename(name, ".docx")),
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000,
  });
  try {
    const stats = await session.cdp.evaluate("window.__vnoAppInstance.adapter.getWordCountStats({preferSelection:false})");
    rows.push({ name, ...stats });
    console.log(JSON.stringify(rows[rows.length - 1]));
  } finally {
    await session.close();
  }
}
await fs.writeFile(path.join(profile, "fix-t12-app-word-count.json"), JSON.stringify(rows, null, 2), "utf8");
