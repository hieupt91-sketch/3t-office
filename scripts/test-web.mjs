import { run3tWebTests } from "../tests/unit/3t-web.test.js";

async function main() {
  const results = await run3tWebTests();
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`KET QUA 3T WEB: ${passed}/${results.length} PASS | ${failed} FAIL`);
  if (failed > 0) {
    console.error("Cac bai kiem tra that bai:");
    results.filter(r => !r.pass).forEach(f => console.error(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
