import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "../live/cdp/session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturesDir = path.join(root, "tests", "fixtures", "q83-numbering");
const outputFile = path.join(fixturesDir, "vn_writer_cdp_results.json");
const wordOracleFile = path.join(fixturesDir, "word_oracle_results.json");
const localAppData = "E:\\VNOffice-briefs\\tmp\\q83\\lad";

const files = fs.readdirSync(fixturesDir)
  .filter(f => f.endsWith(".docx"))
  .sort();

const compareOnly = process.argv.includes("--compare-only");
const results = compareOnly && fs.existsSync(outputFile)
  ? JSON.parse(fs.readFileSync(outputFile, "utf8"))
  : {};

if (!compareOnly) {
  for (const file of files) {
    const filePath = path.join(fixturesDir, file);
    console.log(`\n========================================`);
    console.log(`Measuring VN Writer via CDP: ${file}`);
    console.log(`========================================`);

    const session = await launchApp("writer", {
      root,
      filePath,
      localAppData,
      startTimeoutMilliseconds: 60000,
      readyTimeoutMilliseconds: 60000,
    });

    try {
      const cdp = session.cdp;
      // Wait for body to contain non-empty content
      await cdp.waitFor(
        "(() => { const b = document.querySelector('.vno-writer-body'); return b && b.textContent.replace(/\\s+/g, ' ').trim().length > 5; })()",
        { timeoutMilliseconds: 45000 }
      );

      const paraData = await cdp.evaluate(`(() => {
        const body = document.querySelector(".vno-writer-body");
        // Find all list items (and standalone paragraphs if any)
        const lis = Array.from(body.querySelectorAll("li"));
        
        const toRoman = (num) => {
          const lookup = { m:1000, cm:900, d:500, cd:400, c:100, xc:90, l:50, xl:40, x:10, ix:9, v:5, iv:4, i:1 };
          let roman = '';
          for (let i in lookup) {
            while (num >= lookup[i]) { roman += i; num -= lookup[i]; }
          }
          return roman;
        };

        const toAlpha = (num) => {
          let str = '';
          let n = num;
          while (n > 0) {
            let rem = (n - 1) % 26;
            str = String.fromCharCode(97 + rem) + str;
            n = Math.floor((n - 1) / 26);
          }
          return str || 'a';
        };

        return lis.map((li, idx) => {
          // In nested lists, li.textContent includes child lis. Get direct text before child list:
          let directText = "";
          for (const node of li.childNodes) {
            if (node.nodeType === 3) directText += node.textContent;
            else if (node.nodeType === 1 && !['OL', 'UL'].includes(node.tagName)) directText += node.textContent;
          }
          const text = (directText || li.textContent).replace(/\\s+/g, " ").trim();
          const value = li.value;
          const style = window.getComputedStyle(li);
          const listStyleType = style.listStyleType || "";
          const isParen = li.classList.contains("vno-list-suffix-paren");
          
          let label = "";
          if (listStyleType === "decimal") {
            label = isParen ? (value + ")") : (value + ".");
          } else if (listStyleType === "lower-alpha") {
            label = isParen ? (toAlpha(value) + ")") : (toAlpha(value) + ".");
          } else if (listStyleType === "lower-roman") {
            label = isParen ? (toRoman(value) + ")") : (toRoman(value) + ".");
          } else if (listStyleType === "none") {
            label = "";
          } else {
            label = value + ".";
          }

          return {
            Index: idx + 1,
            Text: text,
            ListValue: value,
            ListString: label,
            ListStyleType: listStyleType,
            HasParenSuffix: isParen
          };
        });
      })()`);

      results[file] = paraData;
      console.log(`Measured ${paraData.length} items in ${file}.`);
    } finally {
      await session.close();
    }
  }

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), "utf8");
  console.log(`\nAll VN Writer CDP measurements saved to: ${outputFile}`);
}

// Compare with Word Oracle
if (fs.existsSync(wordOracleFile)) {
  const raw = fs.readFileSync(wordOracleFile, "utf8").replace(/^\uFEFF/, "");
  const wordData = JSON.parse(raw);
  console.log("\n========================================================");
  console.log("=== COMPARISON TABLE: WORD 2016 vs VN WRITER (CDP) ===");
  console.log("========================================================");

  let totalParas = 0;
  let matchingParas = 0;

  for (const file of Object.keys(wordData).sort()) {
    console.log(`\nFile: ${file}`);
    console.log("| Index | Paragraph Text | Word ListString | Word Value | Writer ListString | Writer Value | Match? |");
    console.log("|-------|----------------|-----------------|------------|-------------------|--------------|--------|");

    const wParas = wordData[file] || [];
    const vParas = results[file] || [];

    for (let i = 0; i < wParas.length; i++) {
      totalParas++;
      const wp = wParas[i];
      // match by index or text
      const vp = vParas[i] || {};
      const match = (wp.ListString === vp.ListString || wp.ListValue === vp.ListValue);
      if (match) matchingParas++;

      console.log(`| ${wp.Index} | ${wp.Text} | '${wp.ListString}' | ${wp.ListValue} | '${vp.ListString || ""}' | ${vp.ListValue ?? ""} | ${match ? "MATCH" : "MISMATCH"} |`);
    }
  }

  console.log(`\nTotal matched: ${matchingParas}/${totalParas}`);
}
