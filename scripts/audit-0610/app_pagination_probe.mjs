// Read-only desktop/CDP probe for Writer pagination geometry. The JSON output
// intentionally contains no document text or HTML.
// Usage: node --experimental-websocket scripts/audit-0610/app_pagination_probe.mjs <document>
import { launchApp } from "../../tests/live/cdp/session.mjs";

const filePath = process.argv[2];
if (!filePath) throw new Error("Missing document path");

const session = await launchApp("writer", { filePath, startTimeoutMilliseconds: 120000 });
try {
  await session.cdp.waitFor(`(() => {
    const adapter = window.__vnoAppInstance?.adapter;
    const body = document.querySelector('.vno-writer-body');
    return !!adapter?._sourcePath && !!body && body.children.length > 0 &&
      Number.isFinite(adapter?._livePageCount) && adapter._livePageCount > 0 && !adapter?._paginating;
  })()`, { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  await new Promise(resolve => setTimeout(resolve, 5000));
  await session.cdp.waitFor("!window.__vnoAppInstance?.adapter?._paginating", { timeoutMilliseconds: 30000 });

  const result = await session.cdp.evaluate(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    const body = document.querySelector('.vno-writer-body');
    const children = [...body.children];
    const dim = adapter.getPageDimensions();
    const rectOf = element => {
      const rect = element.getBoundingClientRect();
      return {
        childIndex: children.indexOf(element),
        tag: element.tagName,
        topPx: Math.round(rect.top * 100) / 100,
        bottomPx: Math.round(rect.bottom * 100) / 100,
        heightPx: Math.round(rect.height * 100) / 100,
        marginTopPx: getComputedStyle(element).marginTop,
        breakBefore: getComputedStyle(element).breakBefore,
      };
    };
    return {
      pages: adapter._livePageCount,
      page: {
        widthPx: dim.widthPx,
        heightPx: dim.heightPx,
        topPx: dim.topPx,
        bottomPx: dim.bottomPx,
        usableHeightPx: adapter._getUsablePageHeight(dim),
      },
      zones: {
        headerHeightPx: adapter.headerDom?.offsetHeight || 0,
        footerHeightPx: adapter.footerDom?.offsetHeight || 0,
        bodyMarginTopPx: getComputedStyle(body).marginTop,
        bodyMarginBottomPx: getComputedStyle(body).marginBottom,
        footerParagraphs: [...(adapter.footerDom?.querySelectorAll('p, h1, h2, h3, h4, h5, h6') || [])].map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            heightPx: Math.round(rect.height * 100) / 100,
            fontSizePx: style.fontSize,
            fontFamily: style.fontFamily,
            lineHeightPx: style.lineHeight,
            lineHeightFactor: style.getPropertyValue('--vno-lh'),
            fontRatio: style.getPropertyValue('--vno-font-ratio'),
            marginTopPx: style.marginTop,
            marginBottomPx: style.marginBottom,
          };
        }),
      },
      gaps: [...body.querySelectorAll('[data-vno-auto-page-gap="true"]')].map(rectOf),
      blocksBeforeFirstThreeGaps: [...body.querySelectorAll('[data-vno-auto-page-gap="true"]')]
        .slice(0, 3)
        .map(gap => ({ gap: rectOf(gap), previous: gap.previousElementSibling ? rectOf(gap.previousElementSibling) : null, next: gap.nextElementSibling ? rectOf(gap.nextElementSibling) : null })),
    };
  })()`);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await session.close();
}
