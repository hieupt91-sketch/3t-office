import { connectToPort, sleep } from "./client.mjs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export async function probe(port, expression, waitMilliseconds = 0) {
  const cdp = await connectToPort(Number(port));
  try {
    if (waitMilliseconds > 0) await sleep(Number(waitMilliseconds));
    return await cdp.evaluate(expression);
  } finally {
    await cdp.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [port, ...args] = process.argv.slice(2);
  const hasWait = args.length > 0 && /^\d+$/.test(args.at(-1));
  const waitMilliseconds = hasWait ? Number(args.pop()) : 0;
  const expression = args.join(" ") || "({title:document.title, url:location.href})";
  if (!port) {
    console.error("Usage: node --experimental-websocket tests/live/cdp/cdp_probe.mjs <port> [expression] [waitMs]");
    process.exitCode = 2;
  } else {
    try {
      console.log(JSON.stringify(await probe(port, expression, waitMilliseconds)));
    } catch (error) {
      console.error(String(error?.stack || error));
      process.exitCode = 1;
    }
  }
}
