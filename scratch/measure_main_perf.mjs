import { launchApp } from "../tests/live/cdp/session.mjs";

async function measure() {
  const session = await launchApp("sheet");
  try {
    const cdp = session.cdp;
    await cdp.send("Performance.enable");
    const metrics = await cdp.send("Performance.getMetrics");
    const paintEntries = await cdp.evaluate("JSON.stringify(window.performance.getEntriesByType('paint'))");
    const navEntries = await cdp.evaluate("JSON.stringify(window.performance.getEntriesByType('navigation'))");
    console.log("PAINT_ENTRIES:", paintEntries);
    console.log("METRICS:", JSON.stringify(metrics.metrics.filter(m => ["JSHeapUsedSize", "JSHeapTotalSize", "FirstMeaningfulPaint", "DomCounters", "Nodes"].includes(m.name))));
  } finally {
    await session.close();
  }
}

measure().catch(console.error);
