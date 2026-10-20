// Q36: adaptive ribbon must contain group contents, not only the outer panel, at narrow desktop widths.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const baseline = process.env.Q36_BASELINE === "1";
const output = path.resolve(process.env.Q36_SCREENSHOT_DIR || `docs/assets/q36-ui/ribbon-${baseline ? "before" : "after"}`);
await mkdir(output, { recursive: true });
const failures = [];
const check = (name, pass, detail = "") => {
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
  if (!pass) failures.push(name);
};

for (const app of ["writer", "sheet", "slides"]) {
  const session = await launchApp(app, { localAppData: `${profile}-${app}` });
  try {
    const { cdp } = session;
    await sleep(700);
    for (const [width, height] of [[1920, 1080], [1366, 768], [1280, 720], [1024, 600]]) {
      const target = await cdp.send("Browser.getWindowForTarget");
      await cdp.send("Browser.setWindowBounds", {
        windowId: target.result.windowId,
        bounds: { windowState: "normal", width, height },
      });
      await sleep(900);
      for (const theme of ["light", "dark"]) {
        await cdp.evaluate(`document.documentElement.dataset.theme = ${JSON.stringify(theme)}`);
        if (baseline) await cdp.evaluate("document.querySelectorAll('.vno-ribbon-group').forEach(group => group.classList.remove('vno-group-compact','vno-group-icon-only','vno-group-collapsed'))");
        await sleep(180);
        const metrics = await cdp.evaluate(`(() => {
          const panel = document.querySelector('.vno-ribbon-content');
          const groups = [...(panel?.querySelectorAll('.vno-ribbon-group') || [])];
          const visible = groups.filter(group => !group.classList.contains('vno-group-collapsed'));
          const spills = visible.filter(group => {
            const items = group.querySelector('.vno-ribbon-group-items');
            return items && items.scrollWidth > items.clientWidth + 1;
          }).map(group => ({ id: group.dataset.groupId, label: group.dataset.groupLabel,
            scroll: group.querySelector('.vno-ribbon-group-items').scrollWidth,
            client: group.querySelector('.vno-ribbon-group-items').clientWidth }));
          const rect = panel?.getBoundingClientRect();
          const font = document.querySelector('.vno-ribbon select[data-command-id$="font.family"]');
          return {
            viewport: { width: innerWidth, height: innerHeight },
            panel: { scroll: panel?.scrollWidth, client: panel?.clientWidth,
              overflowX: getComputedStyle(panel).overflowX, rectRight: rect?.right },
            groups: groups.length,
            collapsed: groups.filter(group => group.classList.contains('vno-group-collapsed')).length,
            fontWidth: font?.getBoundingClientRect().width || 0,
            spills
          };
        })()`);
        check(`${app} ${width}x${height} ${theme}: không cuộn ngang ribbon`, metrics.panel.scroll <= metrics.panel.client + 1, `${metrics.panel.scroll}/${metrics.panel.client}px`);
        check(`${app} ${width}x${height} ${theme}: nhóm hiển thị không tràn nội dung`, metrics.spills.length === 0, JSON.stringify(metrics.spills));
        if (width >= 1366) check(`${app} ${width}px ${theme}: bố cục rộng không tự thu gọn nhóm`, metrics.collapsed === 0, `${metrics.collapsed} nhóm thu gọn`);
        if (!baseline && width === 1024 && theme === "dark") check(`${app} 1024px: lệnh nhìn thấy hoặc có nút nhóm`, metrics.collapsed > 0 || metrics.spills.length === 0, `${metrics.collapsed} nhóm thu gọn; tràn=${metrics.spills.length}`);
        if (app === "writer" && width === 1024) check(`Writer 1024px ${theme}: tên phông không bị ép cụt`, metrics.fontWidth >= 130, `${metrics.fontWidth}px`);
        if (width !== 1920) {
          const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
          await writeFile(path.join(output, `${app}-${width}x${height}-${theme}.png`), Buffer.from(shot.result.data, "base64"));
        }
        console.log(`METRICS | Ribbon ${app} ${width}x${height} ${theme} | ${JSON.stringify(metrics)}`);
      }
    }

    if (!baseline) {
    const popover = await cdp.evaluate(`(() => {
      const button = document.querySelector('.vno-ribbon-group.vno-group-collapsed .vno-ribbon-group-collapsed-btn');
      if (!button) return null;
      button.click();
      const panel = document.querySelector('.vno-ribbon-group-popover');
      const rect = panel?.getBoundingClientRect();
      return { open: !!panel, buttons: panel?.querySelectorAll('button').length || 0,
        inside: !!rect && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight,
        rect: rect && { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom } };
    })()`);
    if (popover) {
      check(`${app} 1024px: menu nhóm truy cập được và nằm trong cửa sổ`, popover.open && popover.buttons > 0 && popover.inside, JSON.stringify(popover));
      const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
      await writeFile(path.join(output, `${app}-1024x600-group-menu.png`), Buffer.from(shot.result.data, "base64"));
    } else {
      const fit = await cdp.evaluate("[...document.querySelectorAll('.vno-ribbon-group:not(.vno-group-collapsed) .vno-ribbon-group-items')].every(items => items.scrollWidth <= items.clientWidth + 1)");
      check(`${app} 1024px: các lệnh vừa trong nhóm đang hiển thị`, fit);
    }
    }
  } finally {
    await session.close();
  }
}

if (failures.length) process.exit(1);
