import { readFile } from "node:fs/promises";

async function main() {
  const raw = await readFile("scripts/audit-0610/.audit-cache-results.json", "utf8");
  const data = JSON.parse(raw);
  
  for (const file of ["lan02.xlsx", "lan04.xlsx", "lan26.xlsx", "lan06.xlsx"]) {
    const item = data[file];
    if (!item) {
      console.log(`No data for ${file}`);
      continue;
    }
    console.log(`\n=================== ${file} (Total: ${item.evaluated}, Matched: ${item.matched}, Mismatched: ${item.mismatched}) ===================`);
    const groups = {};
    for (const m of item.mismatches) {
      // Classify reason
      let reasonType = "sai giá trị";
      const appStr = String(m.appVal ?? "");
      const cacheStr = String(m.cacheVal ?? "");
      if (appStr.startsWith("#") && !cacheStr.startsWith("#")) {
        reasonType = "sai kiểu / lỗi không đáng có";
      } else if (!appStr.startsWith("#") && cacheStr.startsWith("#")) {
        reasonType = "lỗi không lan truyền";
      } else if (appStr === "#NAME?") {
        reasonType = "hàm thiếu";
      } else if (typeof m.appVal !== typeof m.cacheVal) {
        reasonType = "sai kiểu";
      }

      const key = `${m.func} | ${reasonType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    }
    for (const [k, list] of Object.entries(groups)) {
      console.log(`Group [${k}]: ${list.length} ô`);
      for (const ex of list.slice(0, 5)) {
        console.log(`   ${ex.sheet}!${ex.coord}: formula="${ex.formula}" | cache="${ex.cacheVal}" (${ex.cacheType}) | app="${ex.appVal}"`);
      }
    }
  }
}

main().catch(console.error);
