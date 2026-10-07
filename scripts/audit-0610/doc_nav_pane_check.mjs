// Acceptance cho Writer Navigation Pane trên app desktop thật (main.py + WebView2 CDP).
// Chạy: $env:VNO_CDP_LOCALAPPDATA='<thư mục riêng>'; node --experimental-websocket scripts/audit-0610/doc_nav_pane_check.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { click, insertText, press, sleep } from "../../tests/live/cdp/actions.mjs";

if (!process.env.VNO_CDP_LOCALAPPDATA) {
  throw new Error("Phải đặt VNO_CDP_LOCALAPPDATA riêng cho lần kiểm thử NAV1.");
}

const results = [];
const record = (name, pass, detail = "") => {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const { cdp } = session;
const evaluate = expression => cdp.evaluate(expression);

try {
  await evaluate(`(() => {
    localStorage.setItem('vno-locale', 'vi');
    localStorage.setItem('vno-writer-navigation-pane-open', '0');
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = [
      '<h1 id="nav-one">Tổng quan dự án</h1>',
      '<p>Nội dung mở đầu</p>',
      '<h2 id="nav-two">Kế hoạch triển khai</h2>',
      '<p data-vno-outline="3" id="nav-outline">Chi tiết thực hiện</p>',
      '<div class="vno-page-auto-gap" data-vno-auto-page-gap="true" contenteditable="false"></div>',
      '<h2 id="nav-three">Kết quả đánh giá</h2>',
      '<h1 id="nav-four">Kết luận</h1>'
    ].join('');
    const nav = window.__vnoAppInstance?.viewController?.navigationPane;
    nav?.setOpen(false, { persist:false, focus:false });
    nav?.refresh();
    return !!nav;
  })()`);
  await cdp.waitFor("window.__vnoAppInstance?.viewController?.navigationPane?.items?.length === 5", { timeoutMilliseconds: 10000 });

  const before = await evaluate(`(() => {
    const app=window.__vnoAppInstance, page=document.querySelector('.vno-writer-page'), viewport=document.querySelector('.vno-writer-viewport');
    return { pageWidth:page.getBoundingClientRect().width, viewportWidth:viewport.getBoundingClientRect().width, pages:app.adapter?._livePageCount||1 };
  })()`);
  await evaluate("window.__vnoAppInstance.shell.ribbonHost.selectTab('view')");
  await click(cdp, '[data-command-id="writer.view.navigationPane"]');
  await cdp.waitFor("!document.querySelector('.vno-writer-navigation-pane')?.hidden");
  const opened = await evaluate(`(() => {
    window.__vnoAppInstance.shell.ribbonHost.selectTab('view');
    const pane=document.querySelector('.vno-writer-navigation-pane'), page=document.querySelector('.vno-writer-page'), viewport=document.querySelector('.vno-writer-viewport'), button=document.querySelector('[data-command-id="writer.view.navigationPane"]');
    return { width:pane.getBoundingClientRect().width, pageWidth:page.getBoundingClientRect().width, viewportWidth:viewport.getBoundingClientRect().width, pressed:button?.getAttribute('aria-pressed') || String(window.__vnoAppInstance.viewController.navigationPane.commandBus.getState('writer.view.navigationPane')?.checked), pages:window.__vnoAppInstance.adapter?._livePageCount||1 };
  })()`);
  record("1. Nút toggle mở ngăn trái, thu viewport nhưng không đổi trang/ngắt trang", opened.pressed === "true" && opened.width >= 220 && opened.width <= 270 && opened.viewportWidth < before.viewportWidth && opened.pageWidth === before.pageWidth && opened.pages === before.pages, JSON.stringify({ before, opened }));

  const tree = await evaluate(`(() => [...document.querySelectorAll('.vno-writer-navigation-item')].map(row => ({
    text:row.querySelector('.vno-writer-navigation-item-title')?.textContent,
    level:row.getAttribute('aria-level'), expanded:row.getAttribute('aria-expanded'),
    page:row.querySelector('.vno-writer-navigation-page')?.textContent,
    title:row.querySelector('.vno-writer-navigation-item-title')?.title
  })))()`);
  record("2. Cây tiêu đề đúng cấp, tooltip và số trang ước lượng", tree.length === 5 && tree[0].level === "1" && tree[1].level === "2" && tree[2].level === "3" && tree[3].page === "2" && tree[1].title === "Kế hoạch triển khai", JSON.stringify(tree));

  await click(cdp, '.vno-writer-navigation-item[data-nav-id="vno-writer-nav-heading-2"] .vno-writer-navigation-item-title');
  const navigation = await evaluate(`(() => {
    const selection=getSelection(), anchor=selection.anchorNode?.nodeType===1?selection.anchorNode:selection.anchorNode?.parentElement;
    return { heading:anchor?.closest?.('h1,h2,h3,h4,h5,h6,[data-vno-outline]')?.id, active:document.querySelector('.vno-writer-navigation-item[aria-selected="true"] .vno-writer-navigation-item-title')?.textContent, bodyFocused:document.activeElement?.classList?.contains('vno-writer-body') };
  })()`);
  record("3. Bấm tiêu đề cuộn tới, đặt con trỏ đầu tiêu đề và tô sáng ngắn", navigation.heading === "nav-two" && navigation.active === "Kế hoạch triển khai" && navigation.bodyFocused, JSON.stringify(navigation));

  await evaluate(`(() => {
    const target=document.querySelector('#nav-three'), range=document.createRange(), selection=getSelection();
    range.selectNodeContents(target); range.collapse(true); selection.removeAllRanges(); selection.addRange(range);
    document.querySelector('.vno-writer-body').focus(); document.dispatchEvent(new Event('selectionchange')); return true;
  })()`);
  await sleep(100);
  const active = await evaluate("document.querySelector('.vno-writer-navigation-item[aria-selected=\"true\"] .vno-writer-navigation-item-title')?.textContent");
  record("4. Tiêu đề hiện tại theo con trỏ được chọn trong cây", active === "Kết quả đánh giá", String(active));

  await click(cdp, '.vno-writer-navigation-search');
  await evaluate(`(() => { const input=document.querySelector('.vno-writer-navigation-search'); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await insertText(cdp, "ke hoach");
  const filtered = await evaluate("[...document.querySelectorAll('.vno-writer-navigation-item-title')].map(x=>x.textContent)");
  record("5. Tìm không dấu lọc đúng tiêu đề có dấu", filtered.join("|") === "Tổng quan dự án|Kế hoạch triển khai", JSON.stringify(filtered));

  await evaluate(`(() => { const input=document.querySelector('.vno-writer-navigation-search'); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  await click(cdp, '[data-nav-action="collapse"]');
  const collapsedCount = await evaluate("document.querySelectorAll('.vno-writer-navigation-item').length");
  await click(cdp, '[data-nav-action="expand"]');
  const expandedCount = await evaluate("document.querySelectorAll('.vno-writer-navigation-item').length");
  record("6. Thu gọn/Mở rộng tất cả điều khiển đúng các nhánh", collapsedCount === 2 && expandedCount === 5, `collapsed=${collapsedCount}, expanded=${expandedCount}`);

  await evaluate("window.__vnoAppInstance.viewController.navigationPane.setOpen(false)");
  await evaluate("document.querySelector('.vno-writer-body').focus()");
  await press(cdp, "N", { ctrl: true, alt: true }, 400);
  const shortcutOpen = await evaluate("!document.querySelector('.vno-writer-navigation-pane').hidden");
  await click(cdp, '.vno-writer-navigation-item');
  await evaluate("document.querySelector('.vno-writer-navigation-item').focus()");
  await press(cdp, "End", {}, 40);
  const atEnd = await evaluate("document.activeElement?.querySelector?.('.vno-writer-navigation-item-title')?.textContent");
  await press(cdp, "Home", {}, 40);
  const atHome = await evaluate("document.activeElement?.querySelector?.('.vno-writer-navigation-item-title')?.textContent");
  await press(cdp, "ArrowDown", {}, 40);
  const afterDown = await evaluate("document.activeElement?.querySelector?.('.vno-writer-navigation-item-title')?.textContent");
  await press(cdp, "Enter", {}, 40);
  const enteredHeading = await evaluate("(getSelection().anchorNode?.nodeType===1?getSelection().anchorNode:getSelection().anchorNode?.parentElement)?.closest?.('h1,h2,h3,h4,h5,h6,[data-vno-outline]')?.id");
  await evaluate("document.querySelector('.vno-writer-navigation-search').focus()");
  await press(cdp, "Escape", {}, 40);
  const escapedToBody = await evaluate("document.activeElement?.classList?.contains('vno-writer-body')");
  const aria = await evaluate(`(() => { const tree=document.querySelector('[role="tree"]'), item=tree?.querySelector('[role="treeitem"]'); return { tree:!!tree, level:item?.getAttribute('aria-level'), expanded:item?.getAttribute('aria-expanded') }; })()`);
  record("7. Ctrl+Alt+N, ↑/↓/Home/End/Enter/Esc và ARIA tree hoạt động", shortcutOpen && atEnd === "Kết luận" && atHome === "Tổng quan dự án" && afterDown === "Kế hoạch triển khai" && enteredHeading === "nav-two" && escapedToBody && aria.tree && aria.level === "1" && aria.expanded === "true", JSON.stringify({ shortcutOpen, atEnd, atHome, afterDown, enteredHeading, escapedToBody, aria }));

  await evaluate(`(() => { const input=document.querySelector('.vno-writer-navigation-search'); input.value='khong ton tai'; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const noResults = await evaluate("document.querySelector('.vno-writer-navigation-status')?.textContent");
  await evaluate(`(() => { const body=document.querySelector('.vno-writer-body'); body.innerHTML='<p>Đoạn thường</p>'; window.__vnoAppInstance.viewController.navigationPane.refresh(); })()`);
  await cdp.waitFor("window.__vnoAppInstance.viewController.navigationPane.items.length === 0");
  await evaluate(`(() => { const input=document.querySelector('.vno-writer-navigation-search'); input.value=''; input.dispatchEvent(new Event('input',{bubbles:true})); })()`);
  const empty = await evaluate("document.querySelector('.vno-writer-navigation-status')?.textContent");
  record("8. Trạng thái không có tiêu đề và lọc không khớp rõ ràng", noResults === "Không có tiêu đề khớp." && empty.includes("Tài liệu chưa có tiêu đề"), JSON.stringify({ noResults, empty }));

  await evaluate(`(() => { document.documentElement.setAttribute('data-theme','dark'); const nav=window.__vnoAppInstance.viewController.navigationPane; nav.setOpen(true); return true; })()`);
  const dark = await evaluate(`(() => {
    const pane=document.querySelector('.vno-writer-navigation-pane'), style=getComputedStyle(pane);
    return { color:style.color, background:style.backgroundColor, visible:!pane.hidden && pane.getClientRects().length>0 };
  })()`);
  await evaluate("localStorage.setItem('vno-locale','en'); location.reload()").catch(() => {});
  await cdp.waitFor("!!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 30000 });
  await cdp.waitFor("!!window.__vnoAppInstance?.viewController?.navigationPane", { timeoutMilliseconds: 30000 });
  const english = await evaluate(`(() => { const nav=window.__vnoAppInstance.viewController.navigationPane; nav.setOpen(true,{persist:false,focus:false}); return { title:document.querySelector('.vno-writer-navigation-header strong')?.textContent, placeholder:document.querySelector('.vno-writer-navigation-search')?.placeholder }; })()`);
  record("9. Ngăn theo chế độ tối và song ngữ VI/EN", dark.visible && dark.color !== dark.background && english.title === "Navigation Pane" && english.placeholder === "Search document", JSON.stringify({ dark, english }));

  await evaluate("localStorage.setItem('vno-locale','vi'); localStorage.setItem('vno-writer-navigation-pane-open','0')");
} finally {
  await session.close();
}

const failed = results.filter(result => !result.pass);
console.log(`NAV1 RESULT: ${results.length - failed.length}/${results.length} PASS | ${failed.length} FAIL`);
if (failed.length) process.exitCode = 1;
