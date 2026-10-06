// CDP export proof for D22. Word inspection/update is performed by PowerShell after this saves.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "vno-if-ref-"));
const docx = path.join(dir, "if-ref.docx");
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const adapter = "window.__vnoAppInstance.adapter";
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML='<p><a id="D22Heading" class="vno-bookmark" data-bookmark-name="D22Heading"></a>Heading target</p><p><span class="vno-merge-if" data-merge-if="City" data-op="equals" data-value="Hanoi" data-then="Xin chao" data-else="Kinh gui">Neu City equals Hanoi thi Xin chao nguoc lai Kinh gui</span></p><p><a href="#D22Heading" class="vno-cross-ref" data-xref-type="heading">Heading target</a></p>'; })()`);
  const saved = await ev(`globalUnoBridge.saveRealFileInPlace("writer",${adapter}._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  console.log(JSON.stringify({ path: docx, save: saved }));
  if (saved?.status !== "ok") process.exitCode = 1;
} finally { await session.close(); }
