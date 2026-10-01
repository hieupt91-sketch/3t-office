import fs from "node:fs/promises";
import path from "node:path";
import { connectToPort } from "../../tests/live/cdp/client.mjs";

const [port, input, output] = process.argv.slice(2);
const expected = (await fs.realpath(input)).replaceAll("\\", "/").toLowerCase();
const cdp = await connectToPort(Number(port));
try {
  // The launch title already contains the file name while its blank grid is
  // still visible. The adapter publishes the source path after hydration.
  await cdp.waitFor(
    "String(window.__vnoAppInstance?.adapter?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase() === " + JSON.stringify(expected),
    { timeoutMilliseconds: 900000, intervalMilliseconds: 500 },
  );
  console.log("LOADED: " + path.basename(input));
  const result = await cdp.evaluate(
    "import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.saveAs'))",
    { timeoutMilliseconds: 1200000 },
  );
  const stat = await fs.stat(output);
  console.log("SAVE_DONE: " + Number(result === true) + " ERR:");
  console.log("EXISTS: True " + stat.size);
  if (result !== true || stat.size <= 0) throw new Error("Save As did not complete successfully.");
} catch (error) {
  console.error("FAIL " + (error?.stack || error));
  process.exitCode = 1;
} finally {
  await cdp.close();
}
