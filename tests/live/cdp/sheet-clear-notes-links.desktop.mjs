// Kiểm thử CDP desktop cho Xóa ghi chú (Clear Comments) và Xóa siêu liên kết (Clear Hyperlinks).
import { launchApp } from "./session.mjs";
import { mouseClick, press, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
const session = await launchApp("sheet", { localAppData: profile });
const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`);
  ok ? pass++ : fail++;
};

const g = "window.__vnoAppInstance.grid";

try {
  await sleep(2500);

  // 1. Kiểm thử Xóa ghi chú (sheet.edit.clearComments)
  await ev(`(() => {
    const x = ${g};
    x.setCellValue('A', 1, 'Dữ liệu A1');
    x.setCellValue('B', 1, 12345);
    x.setCellValue('C', 1, 'Ngoài vùng');
    x.saveComment({ coord: 'A1', text: 'Ghi chú A1' });
    x.saveComment({ coord: 'B1', text: 'Ghi chú B1' });
    x.saveComment({ coord: 'C1', text: 'Ghi chú C1' });
    x.selectCell('A', 1);
    x.selectCell('B', 1, true);
    return true;
  })()`);

  // Thực thi lệnh xóa ghi chú qua command bus
  const clearCommentsResult = await ev(`window.globalCommandBus.execute("sheet.edit.clearComments")`);
  check("Lệnh sheet.edit.clearComments thực thi thành công", clearCommentsResult === true || typeof clearCommentsResult === "number");

  const commentsState = JSON.parse(await ev(`JSON.stringify((() => {
    const x = ${g};
    const c = x.commentsBySheet[x.activeSheet] || {};
    return {
      hasA1: Boolean(c.A1),
      hasB1: Boolean(c.B1),
      hasC1: Boolean(c.C1),
      c1Text: c.C1?.text || "",
      valA1: x.cellsData.get('A1')?.val,
      valB1: x.cellsData.get('B1')?.val
    };
  })())`));

  check("Ghi chú A1 và B1 đã bị xóa, C1 giữ nguyên", !commentsState.hasA1 && !commentsState.hasB1 && commentsState.hasC1, JSON.stringify(commentsState));
  check("Nội dung ô A1 và B1 được giữ nguyên sau khi xóa ghi chú", commentsState.valA1 === "Dữ liệu A1" && commentsState.valB1 === 12345, JSON.stringify(commentsState));

  // Hoàn tác kiểm thử
  await ev(`${g}.undo()`);
  const undoneComments = JSON.parse(await ev(`JSON.stringify((() => {
    const c = ${g}.commentsBySheet[${g}.activeSheet] || {};
    return { hasA1: Boolean(c.A1), hasB1: Boolean(c.B1) };
  })())`));
  check("Hoàn tác khôi phục lại ghi chú A1 và B1", undoneComments.hasA1 && undoneComments.hasB1, JSON.stringify(undoneComments));

  // 2. Kiểm thử Xóa siêu liên kết (sheet.edit.clearHyperlinks)
  await ev(`(() => {
    const x = ${g};
    x.setCellValue('A', 3, 'Trang chủ VN Office');
    x.setCellValue('B', 3, 'Hỗ trợ kỹ thuật');
    x.setCellValue('C', 3, 'Liên kết ngoài vùng');
    x.cellsData.get('A3').hyperlink = 'https://vnoffice.vn';
    x.cellsData.get('B3').hyperlink = 'mailto:hotro@vnoffice.vn';
    x.cellsData.get('C3').hyperlink = 'https://example.com';
    x.selectCell('A', 3);
    x.selectCell('B', 3, true);
    return true;
  })()`);

  const clearLinksResult = await ev(`window.globalCommandBus.execute("sheet.edit.clearHyperlinks")`);
  check("Lệnh sheet.edit.clearHyperlinks thực thi thành công", clearLinksResult === true || typeof clearLinksResult === "number");

  const linksState = JSON.parse(await ev(`JSON.stringify((() => {
    const x = ${g};
    return {
      hlA3: x.cellsData.get('A3')?.hyperlink || null,
      hlB3: x.cellsData.get('B3')?.hyperlink || null,
      hlC3: x.cellsData.get('C3')?.hyperlink || null,
      valA3: x.cellsData.get('A3')?.val,
      valB3: x.cellsData.get('B3')?.val
    };
  })())`));

  check("Siêu liên kết A3 và B3 đã gỡ bỏ, C3 giữ nguyên", linksState.hlA3 === null && linksState.hlB3 === null && linksState.hlC3 === "https://example.com", JSON.stringify(linksState));
  check("Văn bản hiển thị ô A3 và B3 giữ nguyên", linksState.valA3 === "Trang chủ VN Office" && linksState.valB3 === "Hỗ trợ kỹ thuật", JSON.stringify(linksState));

  // Hoàn tác kiểm thử
  await ev(`${g}.undo()`);
  const undoneLinks = JSON.parse(await ev(`JSON.stringify({
    hlA3: ${g}.cellsData.get('A3')?.hyperlink || null,
    hlB3: ${g}.cellsData.get('B3')?.hyperlink || null
  })`));
  check("Hoàn tác khôi phục lại siêu liên kết A3 và B3", undoneLinks.hlA3 === "https://vnoffice.vn" && undoneLinks.hlB3 === "mailto:hotro@vnoffice.vn", JSON.stringify(undoneLinks));

} finally {
  console.log(`SUMMARY ${pass}/${pass + fail} PASS, ${fail} FAIL`);
  if (fail > 0) process.exitCode = 1;
  try { await session.close(); } catch {}
}
