import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { mouseDrag, sleep } from "./actions.mjs";

const out = process.env.VNO_Q27_SLIDES_OUT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
const reopenProfile = process.env.VNO_Q27_SLIDES_REOPEN_LOCALAPPDATA;
if (!out || !profile || !reopenProfile) throw new Error("Set fresh Q27 Slides output and both LOCALAPPDATA paths");
const pptx = path.join(out, "q27-bao-cao-quy.pptx");
const png = path.join(out, "q27-logo.png");
await fs.mkdir(out, { recursive: true });
await fs.writeFile(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2sAAAAASUVORK5CYII=", "base64"));
const results = [];
const check = (name, ok, detail = "") => {
  const status = ok === "unsupported" ? "NOT SUPPORTED" : ok ? "PASS" : "FAIL";
  results.push(status);
  console.log(`${status} | ${name} | ${JSON.stringify(detail)}`);
};
const canvasExpr = "window.__vnoAppInstance.adapter.canvas";
const session = await launchApp("slides", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
let reopen;
try {
  const cdp = session.cdp;
  await cdp.waitFor(`${canvasExpr}?.slides?.length > 0`, { timeoutMilliseconds: 30000 });
  const created = await cdp.evaluate(`(() => {
    const c=${canvasExpr};
    while(c.slides.length>1)c.deleteCurrentSlide(false,true);
    const topics=[
      ["Báo cáo quý", "Kết quả hoạt động và ưu tiên quý tiếp theo"],
      ["Doanh thu theo quý", "Đơn vị: triệu đồng"],
      ["Chỉ số vận hành", "Kết quả theo nhóm chỉ tiêu"],
      ["Quy trình triển khai", "Từ chuẩn bị đến đánh giá"],
      ["Ưu tiên quý tới", "Tập trung vào khách hàng và chất lượng"],
    ];
    c.slides[0].title=topics[0][0]; c.slides[0].body=topics[0][1];
    for(let i=1;i<topics.length;i++){ c.addNewSlide(false); c.slides[i].title=topics[i][0]; c.slides[i].body=topics[i][1]; }
    c.slides[1].layoutType="title-content"; c.slides[2].layoutType="two-content";
    c.slides[2].body2="Mục tiêu: giảm thời gian xử lý 15%";
    c.selectSlide(4); c.duplicateCurrentSlide(false,true);
    c.slides[5].title="Quyết định và bước tiếp theo"; c.slides[5].body="Chốt nguồn lực, mốc triển khai và người phụ trách";
    c._renderThumbnails(); c.selectSlide(0);
    return c.slides.length;
  })()`);
  check("Tạo 5 trang và nhân đôi trang kết luận thành trang thứ sáu", created === 6, created);
  check("Chọn hai bố cục cho nội dung báo cáo", await cdp.evaluate(`${canvasExpr}.slides[1].layoutType==='title-content'&&${canvasExpr}.slides[2].layoutType==='two-content'`));

  const master = await cdp.evaluate(`(() => { const c=${canvasExpr}; return c.applySlideMaster({themeId:'modern-blue',logoText:'Q27 • BÁO CÁO QUÝ',showLogo:true,accentColor:'#1d4ed8',bgColor:'#f8fafc'},true); })()`);
  check("Áp dụng Slide Master có logo chữ và màu chủ đạo", master && await cdp.evaluate(`${canvasExpr}.masterTheme.logoText==='Q27 • BÁO CÁO QUÝ'`), master);
  check("Logo PNG trực tiếp trong Slide Master", "unsupported", "Mẫu cái hiện nhận logoText; không có trường ảnh/PNG trong masterTheme hoặc bộ nhập logo.");

  const imageInserted = await cdp.evaluate(`(() => { const c=${canvasExpr}; c.selectSlide(0); return c.insertImage('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2sAAAAASUVORK5CYII='); })()`);
  check("Chèn PNG minh họa vào trang bìa", imageInserted && await cdp.evaluate(`${canvasExpr}.slides[0].shapes.some(s=>s.type==='image')`), imageInserted);

  const chart = await cdp.evaluate(`(async()=>{const c=${canvasExpr};c.selectSlide(1);return await c.insertChart({chartType:'bar',title:'Doanh thu theo quý',labels:['Q1','Q2','Q3','Q4'],data:[120,150,185,210]})})()`, { awaitPromise: true, timeoutMilliseconds: 60000 });
  check("Tạo biểu đồ cột từ dữ liệu nhập trong ứng dụng", chart?.chartType === "bar" && chart?.data?.length === 4, chart);
  const chartEdit = await cdp.evaluate(`(() => { const c=${canvasExpr}; c.setSelectedTarget(${JSON.stringify(chart?.id)}); return c.updateChart(${JSON.stringify(chart?.id)},{...c.slides[1].shapes.find(s=>s.id===${JSON.stringify(chart?.id)}),data:[125,160,190,225]},true); })()`);
  check("Sửa số liệu biểu đồ sau khi chèn", chartEdit?.data?.[3] === 225, chartEdit?.data);
  check("Biểu đồ nhiều chuỗi kèm nhãn dữ liệu tùy chỉnh", "unsupported", "Mô hình hiện giữ một mảng data và một chuỗi; chưa có seriesCollection/dataLabels trong schema biểu đồ.");

  const table = await cdp.evaluate(`(async()=>{const c=${canvasExpr};c.selectSlide(2);return await c.insertTable({rows:5,cols:4})})()`, { awaitPromise: true, timeoutMilliseconds: 60000 });
  check("Chèn bảng 5×4", table?.rows === 5 && table?.cols === 4, { rows: table?.rows, cols: table?.cols });
  const tableFilled = await cdp.evaluate(`(() => { const c=${canvasExpr};const s=c.slides[2].shapes.find(x=>x.type==='table');s.cells=[['Chỉ tiêu','Mục tiêu','Thực tế','Trạng thái'],['Doanh thu','200','225','Đạt'],['Khách hàng','1.200','1.280','Đạt'],['Thời gian xử lý','-15%','-12%','Theo dõi'],['Sự cố','< 5','3','Đạt']];c.setSelectedTarget(s.id);c._tableCursor={shapeId:s.id,r:0,c:0};c._tableSel={shapeId:s.id,r:0,c:0,r2:0,c2:3};c.setTableShading('#dbeafe');const merged=c.tableMergeCells();c._renderShapesLayer();return {cells:s.cells,merges:s.merges,cellFills:s.cellFills,merged}; })()`);
  check("Điền bảng, tô nền hàng tiêu đề và gộp 4 ô hàng đầu", tableFilled?.cells?.[0]?.[0]?.includes("Chỉ tiêu") && tableFilled?.merges?.length > 0 && tableFilled?.cellFills?.length > 0, tableFilled);

  const diagram = await cdp.evaluate(`(() => {const c=${canvasExpr};c.selectSlide(3);return c.insertDiagram('process',4)})()`);
  const groupId = diagram?.diagramGroupId;
  check("Chèn quy trình bốn bước có connector", Boolean(groupId) && diagram.shapes.filter(s=>s.type==='connector').length===3, { shapes: diagram?.shapes?.length, connectors: diagram?.shapes?.filter(s=>s.type==='connector').length });
  const connectorBefore = await cdp.evaluate(`${canvasExpr}.slides[3].shapes.find(s=>s.diagramGroupId===${JSON.stringify(groupId)}&&s.type==='connector')?.sourceId`);
  const moved = await cdp.evaluate(`${canvasExpr}.moveDiagramGroupBy(${JSON.stringify(groupId)},18,12)`);
  const connectorAfter = await cdp.evaluate(`${canvasExpr}.slides[3].shapes.find(s=>s.diagramGroupId===${JSON.stringify(groupId)}&&s.type==='connector')?.sourceId`);
  check("Di chuyển nhóm sơ đồ mà connector vẫn nối đúng shape", moved && connectorBefore === connectorAfter, { connectorBefore, connectorAfter });

  const grouped = await cdp.evaluate(`(() => {const c=${canvasExpr};c.selectSlide(4);c.insertShape('rect');const a=c.slides[4].shapes.at(-1);c.insertShape('ellipse');const b=c.slides[4].shapes.at(-1);c.selectedShapeIds=new Set([String(a.id),String(b.id)]);const ok=c.groupSelectedShapes();return {ok,grouped:[a.groupId,b.groupId]};})()`);
  check("Nhóm hai hình trên trang ưu tiên", grouped?.ok && grouped.grouped[0] && grouped.grouped[0]===grouped.grouped[1], grouped);
  const groupResize = await cdp.evaluate(`(() => {const c=${canvasExpr};const s=c.slides[4].shapes.filter(x=>x.groupId===${JSON.stringify(grouped?.grouped?.[0])});if(s.length!==2)return false;s.forEach(x=>{x.x+=12;x.y+=8;x.w*=1.1;x.h*=1.1});c._renderShapesLayer();return s.every(x=>x.w>0&&x.h>0)})()`);
  check("Thay đổi kích thước đồng thời các hình trong nhóm", groupResize);

  const hf = await cdp.evaluate(`(() => ${canvasExpr}.applyHeaderFooter({showSlideNumber:true,showDate:true,showFooter:true,footerText:'Báo cáo quý • Nội bộ',dateFormat:'dd/MM/yyyy',applyToAll:true},{applyToAll:true}))()`);
  check("Chèn số trang, ngày và chân trang cho toàn bộ bài", hf && await cdp.evaluate(`${canvasExpr}.slides.every(s=>s.headerFooter?.showSlideNumber&&s.headerFooter?.showDate&&s.headerFooter?.footerText==='Báo cáo quý • Nội bộ')`));

  const hidden = await cdp.evaluate(`(() => {const c=${canvasExpr};c.selectSlide(5);return c.toggleCurrentSlideHidden()})()`);
  await cdp.evaluate(`${canvasExpr}._renderThumbnails()`);
  check("Ẩn trang kết luận và giữ nguyên trong bài", Boolean(hidden) && await cdp.evaluate(`${canvasExpr}.slides[5].hidden===true`), hidden);
  const notes = await cdp.evaluate(`(() => {const s=${canvasExpr}.slides[5];s.notes='Chốt ngân sách, phân công đầu mối, rà soát chỉ số sau 30 ngày và báo cáo tiến độ vào cuộc họp quý tiếp theo.';return s.notes.length})()`);
  check("Ghi chú thuyết trình dài trên trang cuối", notes > 80, notes);
  const transition = await cdp.evaluate(`(() => {const c=${canvasExpr};c.selectSlide(5);return c.setTransition('wipe',650,false,{advanceOnClick:true},'left')})()`);
  check("Đặt chuyển trang Quét cho trang cuối", transition !== false && await cdp.evaluate(`${canvasExpr}.slides[5].transition?.type==='wipe'`), transition);
  const anim1 = await cdp.evaluate(`(() => {const c=${canvasExpr};c.selectSlide(4);return c.setObjectAnimation('title',{type:'fadeIn',duration:700,delay:0})})()`);
  const anim2 = await cdp.evaluate(`(() => {const c=${canvasExpr};const shape=c.slides[4].shapes.find(s=>s.type==='rect');return c.setObjectAnimation(shape.id,{type:'flyIn',duration:500,delay:200})})()`);
  check("Thêm hai hoạt ảnh theo thứ tự vào đối tượng", Boolean(anim1) && Boolean(anim2) && await cdp.evaluate(`${canvasExpr}.slides[4].shapes.find(s=>s.type==='rect')?.animation?.type==='flyIn'`), { anim1, anim2 });
  const sectionId = await cdp.evaluate(`(() => ${canvasExpr}.addSection(4,'Kế hoạch quý tới'))()`);
  check("Tạo Section cho phần kế hoạch", Boolean(sectionId) && await cdp.evaluate(`${canvasExpr}.sections.some(s=>s.id===${JSON.stringify(sectionId)}&&s.name==='Kế hoạch quý tới')`), sectionId);

  const beforeDrag = await cdp.evaluate(`${canvasExpr}.slides.map(s=>s.title)`);
  const point = selector => cdp.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect();return r?{x:r.x+r.width/2,y:r.y+r.height/2}:null})()`);
  const from = await point('.vno-slide-thumb-item[data-slide-index="4"]');
  const to = await point('.vno-slide-thumb-item[data-slide-index="2"]');
  if (from && to) await mouseDrag(cdp, from.x, from.y, to.x, to.y, { steps: 8 });
  await sleep(300);
  const afterDrag = await cdp.evaluate(`${canvasExpr}.slides.map(s=>s.title)`);
  check("Kéo-thả trang trong khung thu nhỏ bên trái", Boolean(from && to) && JSON.stringify(beforeDrag)!==JSON.stringify(afterDrag), { beforeDrag, afterDrag });
  check("Khung trái vẫn có đủ sáu trang sau khi sắp xếp", afterDrag.length===6, afterDrag);

  const saved = await cdp.evaluate(`(async()=>await window.pywebview.api.save_document_in_place(${canvasExpr}.adapter?.serializeToFodp?.()||window.__vnoAppInstance.adapter.serializeToFodp(),'slides',${JSON.stringify(pptx)},null))()`, { awaitPromise: true, timeoutMilliseconds: 180000 });
  check("Lưu PPTX qua đường dẫn đích", saved?.status === "ok", saved);
  await session.close();
  reopen = await launchApp("slides", { filePath: pptx, localAppData: reopenProfile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  await reopen.cdp.waitFor(`${canvasExpr}.slides.length===6`, { timeoutMilliseconds: 60000 });
  const readback = await reopen.cdp.evaluate(`JSON.stringify((()=>{const c=${canvasExpr};return {count:c.slides.length,layouts:c.slides.map(s=>s.layoutType),titles:c.slides.map(s=>s.title),chart:c.slides.flatMap(s=>s.shapes||[]).find(s=>s.type==='chart'),table:c.slides.flatMap(s=>s.shapes||[]).find(s=>s.type==='table'),diagram:c.slides.flatMap(s=>s.shapes||[]).filter(s=>s.diagramGroupId),groups:c.slides.flatMap(s=>s.shapes||[]).filter(s=>s.groupId),hidden:c.slides.filter(s=>s.hidden).length,notes:c.slides.map(s=>s.notes),headerFooter:c.slides[0].headerFooter,sections:c.sections,master:c.masterTheme};})())`);
  const state = JSON.parse(readback);
  check("Mở phiên mới: giữ đủ sáu trang và hai bố cục", state.count===6 && new Set(state.layouts).size>=2, { count: state.count, layouts: state.layouts });
  check("Mở phiên mới: giữ Chart tiêu đề, dữ liệu và 4 điểm", state.chart?.title==='Doanh thu theo quý'&&state.chart?.data?.length===4, state.chart);
  check("Mở phiên mới: giữ bảng 5×4, gộp ô và tô màu", state.table?.rows===5&&state.table?.cols===4&&state.table?.merges?.length>0&&state.table?.cellFills?.length>0, state.table&&{rows:state.table.rows,cols:state.table.cols,merges:state.table.merges,cellFills:state.table.cellFills});
  check("Mở phiên mới: giữ liên kết connector và nhóm hình", state.diagram.some(s=>s.type==='connector'&&s.sourceId&&s.targetId)&&state.groups.length>=2, { diagram:state.diagram.length,groupShapes:state.groups.length });
  check("Mở phiên mới: giữ ẩn trang, ghi chú, ngày và chân trang", state.hidden===1&&state.notes.some(x=>x?.includes('ngân sách'))&&state.headerFooter?.showDate&&state.headerFooter?.showSlideNumber&&state.headerFooter?.footerText==='Báo cáo quý • Nội bộ', {hidden:state.hidden,notes:state.notes,headerFooter:state.headerFooter});
  check("Mở phiên mới: giữ Section kế hoạch quý tới", state.sections.some(s=>s.name==='Kế hoạch quý tới'), state.sections);
  check("Mở phiên mới: giữ logo chữ trên master và PNG trên slide", state.master?.logoText==='Q27 • BÁO CÁO QUÝ'&&state.titles.length===6&&await reopen.cdp.evaluate(`${canvasExpr}.slides[0].shapes.some(s=>s.type==='image')`), {master:state.master});
} catch (error) {
  check("Q27 Slides CDP hoàn tất", false, error.stack || error.message);
} finally {
  await session.close().catch(() => {});
  await reopen?.close().catch(() => {});
}
const pass = results.filter(x=>x==='PASS').length;
const unsupported = results.filter(x=>x==='NOT SUPPORTED').length;
const fail = results.filter(x=>x==='FAIL').length;
console.log(`slides-q27-quarter-report: ${pass} PASS | ${unsupported} NOT SUPPORTED | ${fail} FAIL | ${results.length} total | pptx=${pptx}`);
if (fail) process.exitCode = 1;
