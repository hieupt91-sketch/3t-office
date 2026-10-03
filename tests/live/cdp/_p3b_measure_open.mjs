import path from "node:path";
import { launchApp } from "./session.mjs";

const files = process.argv.slice(2).map(value => path.resolve(value));
if (!files.length) throw new Error("Pass one or more DOCX paths");

const rows = [];
for (const filePath of files) {
  for (let run = 1; run <= 3; run += 1) {
    const started = performance.now();
    const session = await launchApp("writer", {
      filePath,
      localAppData: process.env.LOCALAPPDATA,
      startTimeoutMilliseconds: 120000,
      readyTimeoutMilliseconds: 240000,
    });
    try {
      await session.cdp.waitFor(
        "window.__vnoStartupEvents?.some(e => e.name === 'document_open_complete') === true",
        { timeoutMilliseconds: 240000, pollMilliseconds: 100 },
      );
      const milliseconds = performance.now() - started;
      rows.push({ file: path.basename(filePath), run, milliseconds });
      console.log(`OPEN_MEASURE file=${path.basename(filePath)} run=${run} milliseconds=${milliseconds.toFixed(1)}`);
    } finally {
      await session.close();
    }
  }
}
for (const file of new Set(rows.map(row => row.file))) {
  const values = rows.filter(row => row.file === file).map(row => row.milliseconds).sort((a, b) => a - b);
  console.log(`OPEN_MEDIAN file=${file} milliseconds=${values[Math.floor(values.length / 2)].toFixed(1)} values=${values.map(v => v.toFixed(1)).join(',')}`);
}
