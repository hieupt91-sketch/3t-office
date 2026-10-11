// Read-only D25b probe: launch the real desktop app and capture live-page breaks through CDP.
// Usage: node --experimental-websocket scripts/audit-0610/d24_live_pagination_probe.mjs <d24.docx> <out.json>
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const file = path.resolve(process.argv[2] || "E:\\VN OFice\\file test\\landocx\\d24.docx");
const out = path.resolve(process.argv[3] || "E:\\VNOffice-profiles\\d25b\\d24-app-layout.json");
let session;
try {
  session = await launchApp("writer", { filePath: file });
  await session.cdp.waitFor(`(() => {
    const a = window.__vnoAppInstance?.adapter;
    const body = document.querySelector('.vno-writer-body');
    return !!a?._sourcePath && !!body && body.children.length > 0 &&
      Number.isFinite(a._livePageCount) && a._livePageCount > 1 && !a._paginating;
  })()`, { timeoutMilliseconds: 600000, intervalMilliseconds: 1000 });
  // Let web fonts, images, and the debounced natural repagination settle.
  await new Promise(resolve => setTimeout(resolve, 8000));
  await session.cdp.waitFor("!window.__vnoAppInstance?.adapter?._paginating", { timeoutMilliseconds: 30000 });

  const result = await session.cdp.evaluate(`(() => {
    const a = window.__vnoAppInstance?.adapter;
    const body = document.querySelector('.vno-writer-body');
    const pageEl = document.querySelector('.vno-writer-page');
    const gaps = Array.from(body.querySelectorAll('[data-vno-auto-page-gap="true"]'));
    const all = Array.from(body.querySelectorAll('*'));
    const pageByElement = new Map();
    let page = 1;
    for (const el of all) {
      if (el.getAttribute?.('data-vno-auto-page-gap') === 'true') { page++; continue; }
      pageByElement.set(el, page);
    }
    const round = value => Number.isFinite(Number(value)) ? Math.round(Number(value) * 100) / 100 : null;
    const rect = el => {
      const r = el.getBoundingClientRect();
      const b = body.getBoundingClientRect();
      return { top: round(r.top - b.top + body.scrollTop), left: round(r.left - b.left + body.scrollLeft), width: round(r.width), height: round(r.height), bottom: round(r.bottom - b.top + body.scrollTop) };
    };
    const text = (el, limit = 180) => (el?.innerText || el?.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, limit);
    const attrs = el => Object.fromEntries(Array.from(el.attributes || []).filter(x => x.name.startsWith('data-vno-') || ['style', 'class'].includes(x.name)).map(x => [x.name, x.value]));
    const describe = el => el ? { tag: el.tagName, page: pageByElement.get(el) || null, rect: rect(el), text: text(el), attrs: attrs(el) } : null;

    const directChildren = Array.from(body.children).filter(el => el.getAttribute?.('data-vno-auto-page-gap') !== 'true').map((el, index) => {
      const cs = getComputedStyle(el);
      return {
        index,
        ...describe(el),
        marginTopPx: round(parseFloat(cs.marginTop) || 0),
        marginBottomPx: round(parseFloat(cs.marginBottom) || 0),
        lineHeightPx: round(parseFloat(cs.lineHeight)),
        fontSizePx: round(parseFloat(cs.fontSize)),
        keepNext: el.getAttribute('data-vno-keep-next'),
        tableCount: el.querySelectorAll('table').length + (el.tagName === 'TABLE' ? 1 : 0),
        imageCount: el.querySelectorAll('img').length,
        floatCount: el.querySelectorAll('[data-vno-float]').length,
        htmlStart: el.outerHTML.slice(0, 800)
      };
    });
    const breakRows = gaps.map((gap, index) => {
      const next = gap.nextElementSibling;
      return {
        index: index + 1,
        pageAfter: index + 2,
        soft: gap.getAttribute('data-vno-soft-break') === 'true',
        parentTag: gap.parentElement?.tagName || null,
        parentDirectIndex: directChildren.findIndex(row => {
          const node = Array.from(body.children).filter(x => x.getAttribute?.('data-vno-auto-page-gap') !== 'true')[row.index];
          return node === gap.parentElement || node?.contains(gap);
        }),
        gap: describe(gap),
        next: describe(next)
      };
    });
    const images = Array.from(body.querySelectorAll('img')).map((el, index) => ({
      index: index + 1,
      ...describe(el),
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      parent: describe(el.parentElement),
      directBlockIndex: Array.from(body.children).findIndex(block => block === el || block.contains(el))
    }));
    const floats = Array.from(body.querySelectorAll('[data-vno-float]')).map((el, index) => ({
      index: index + 1,
      ...describe(el),
      parent: describe(el.parentElement),
      directBlockIndex: Array.from(body.children).findIndex(block => block === el || block.contains(el))
    }));
    const tables = Array.from(body.querySelectorAll('table')).map((el, index) => ({
      index: index + 1,
      ...describe(el),
      rows: Array.from(el.rows || []).map((row, rowIndex) => ({ rowIndex: rowIndex + 1, ...describe(row), cantSplit: row.getAttribute('data-vno-cant-split') }))
    }));
    const sections = Array.from(body.querySelectorAll('.vno-section-break')).map((el, index) => ({ index: index + 1, ...describe(el), sectionId: el.getAttribute('data-vno-section-id') }));
    const pageStyle = pageEl ? getComputedStyle(pageEl) : null;
    return {
      source: a?._sourcePath || null,
      measuredAt: new Date().toISOString(),
      localAppData: ${JSON.stringify(session.localAppData)},
      livePageCount: a?._livePageCount,
      gapCount: gaps.length,
      pageSetup: a?.pageSetup,
      sectionPageSetups: a?.sectionPageSetups,
      bodyRect: rect(body),
      pageRect: pageEl ? rect(pageEl) : null,
      pageCss: pageStyle ? { paddingTop: pageStyle.paddingTop, paddingBottom: pageStyle.paddingBottom, minHeight: pageStyle.minHeight } : null,
      breaks: breakRows,
      directChildren,
      sections,
      tables,
      images,
      floats
    };
  })()`);
  // Causal check in the disposable session only: Word says section 3 begins on
  // the last page. Move its marker (and generated blank carrier) before the last
  // content block, then let the same production paginator run once more. Nothing
  // is saved back to the source document.
  const counterfactual = await session.cdp.evaluate(`(async () => {
    const a = window.__vnoAppInstance?.adapter;
    const body = document.querySelector('.vno-writer-body');
    const marker = body?.querySelector('[data-vno-section-id="section-3"]');
    const spacer = marker?.nextElementSibling;
    const content = Array.from(body?.children || []).filter(el =>
      el.getAttribute?.('data-vno-auto-page-gap') !== 'true' && el !== marker && el !== spacer);
    const last = content.at(-1);
    const usable = setup => {
      const original = a.pageSetup;
      a.pageSetup = setup;
      const value = a._getUsablePageHeight(a.getPageDimensions());
      a.pageSetup = original;
      return Math.round(value * 100) / 100;
    };
    const usableBySection = Object.fromEntries(Object.entries(a.sectionPageSetups || {}).map(([id, setup]) => [id, usable(setup)]));
    if (!marker || !last) return { error: 'section-3 marker or final block not found', usableBySection };
    if (spacer && spacer.tagName === 'P' && !(spacer.textContent || '').trim()) spacer.remove();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    a._recomputeLivePagination();
    const withoutSyntheticSpacer = {
      livePageCount: a._livePageCount,
      gapCount: body.querySelectorAll('[data-vno-auto-page-gap="true"]').length
    };
    // Import replaces the target paragraph's page break with the section marker.
    last.style.pageBreakBefore = '';
    last.style.breakBefore = '';
    body.insertBefore(marker, last);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    a._recomputeLivePagination();
    return {
      livePageCount: a._livePageCount,
      gapCount: body.querySelectorAll('[data-vno-auto-page-gap="true"]').length,
      usableBySection,
      withoutSyntheticSpacer,
      section3NextText: (marker.nextElementSibling?.nextElementSibling?.innerText || marker.nextElementSibling?.nextElementSibling?.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 180)
    };
  })()`);
  result.counterfactualMarkerAtWordBoundary = counterfactual;
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(result, null, 2) + "\n", "utf8");
  console.log(`OK pages=${result.livePageCount} gaps=${result.gapCount} blocks=${result.directChildren.length} images=${result.images.length} out=${out}`);
  console.log(`LOCALAPPDATA=${session.localAppData}`);
} finally {
  await session?.close().catch(() => {});
}
