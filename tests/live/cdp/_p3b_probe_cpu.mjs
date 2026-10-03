import fs from "node:fs/promises";
import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const filePath = process.argv[2];
const outputPath = process.argv[3] || ".p3b-cpu-profile.json";
if (!filePath) throw new Error("Usage: node _p3b_probe_cpu.mjs <docx> [output.json]");

const started = performance.now();
const session = await launchApp("writer", {
  filePath,
  localAppData: process.env.LOCALAPPDATA,
  startTimeoutMilliseconds: 120000,
  readyTimeoutMilliseconds: 120000,
});

try {
  const { cdp } = session;
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 100 });
  await cdp.send("Profiler.start");
  await cdp.waitFor(
    "window.__vnoStartupEvents?.some(e => e.name === 'document_open_complete') === true",
    { timeoutMilliseconds: 240000, pollMilliseconds: 100 },
  );
  await sleep(250);
  const stopped = await cdp.send("Profiler.stop", {}, 30000);
  const profile = stopped.result?.profile || stopped.profile;
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const totals = new Map();
  for (let i = 0; i < profile.samples.length; i += 1) {
    const node = nodes.get(profile.samples[i]);
    if (!node) continue;
    const frame = node.callFrame || {};
    const key = `${frame.functionName || "(anonymous)"} @ ${frame.url || ""}:${(frame.lineNumber ?? -1) + 1}`;
    totals.set(key, (totals.get(key) || 0) + (profile.timeDeltas[i] || 0));
  }
  const top = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)
    .map(([frame, microseconds]) => ({ frame, milliseconds: microseconds / 1000 }));
  const result = {
    filePath,
    wallMilliseconds: performance.now() - started,
    profileStartTime: profile.startTime,
    profileEndTime: profile.endTime,
    top,
  };
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`PROFILE_OK wall_ms=${result.wallMilliseconds.toFixed(1)} output=${outputPath}`);
  for (const row of top.slice(0, 25)) console.log(`${row.milliseconds.toFixed(1)}\t${row.frame}`);
} finally {
  await session.close();
}
