/**
 * Pack a real PPTX that contains DrawingML SmartArt (ppt/diagrams/*).
 * Does NOT call any VN Office serializer. Shell (theme/master/layout) is
 * reused from sample-slides.pptx; diagram parts live in src/smartart-pptx/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createZip, listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = path.join(root, "tests", "fixtures", "real-office-samples");
const srcDir = path.join(fixtureDir, "src", "smartart-pptx");
const shellPptx = path.join(fixtureDir, "sample-slides.pptx");

const SLIDE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Title 1"/>
          <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
          <p:nvPr><p:ph type="title"/></p:nvPr>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p><a:r><a:rPr lang="vi-VN" sz="2800" b="1"/><a:t>Quy trình xử lý hồ sơ</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:graphicFrame>
        <p:nvGraphicFramePr>
          <p:cNvPr id="4" name="QuyTrinhHoSo"/>
          <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
          <p:nvPr/>
        </p:nvGraphicFramePr>
        <p:xfrm>
          <a:off x="838200" y="1371600"/>
          <a:ext cx="8229600" cy="3657600"/>
        </p:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/diagram">
            <dgm:relIds xmlns:dgm="http://schemas.openxmlformats.org/drawingml/2006/diagram" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:dm="rId2" r:lo="rId3" r:qs="rId4" r:cs="rId5"/>
          </a:graphicData>
        </a:graphic>
      </p:graphicFrame>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>
`;

const SLIDE_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramData" Target="../diagrams/data1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramLayout" Target="../diagrams/layout1.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramQuickStyle" Target="../diagrams/quickStyle1.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/diagramColors" Target="../diagrams/colors1.xml"/>
  <Relationship Id="rId6" Type="http://schemas.microsoft.com/office/2007/relationships/diagramDrawing" Target="../diagrams/drawing1.xml"/>
</Relationships>
`;

const PRESENTATION_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId2"/></p:sldMasterIdLst>
  <p:sldIdLst><p:sldId id="256" r:id="rId3"/></p:sldIdLst>
  <p:sldSz cx="10080625" cy="5670550"/>
  <p:notesSz cx="7559675" cy="10691813"/>
</p:presentation>
`;

const PRESENTATION_RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps" Target="presProps.xml"/>
</Relationships>
`;

const CORE_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Quy trình xử lý hồ sơ</dc:title>
  <dc:creator>VN Office fixture</dc:creator>
</cp:coreProperties>
`;

const APP_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>VN Office fixture packer</Application>
  <Slides>1</Slides>
  <PresentationFormat>On-screen Show (16:9)</PresentationFormat>
</Properties>
`;

function requireSrc(name) {
  const full = path.join(srcDir, name);
  if (!fs.existsSync(full)) throw new Error(`Missing SmartArt part ${full}`);
  return fs.readFileSync(full);
}

export function packSlidesSmartartPptx(destPath = path.join(fixtureDir, "sample-slides-smartart.pptx")) {
  if (!fs.existsSync(shellPptx)) throw new Error(`Missing shell PPTX ${shellPptx}`);
  const shellNames = new Set(listZipEntries(shellPptx).map((entry) => entry.name));
  const copyFromShell = [
    "ppt/theme/theme1.xml",
    "ppt/slideMasters/slideMaster1.xml",
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    "ppt/slideLayouts/slideLayout1.xml",
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    "ppt/presProps.xml",
    "_rels/.rels"
  ];
  for (const name of copyFromShell) {
    if (!shellNames.has(name)) throw new Error(`sample-slides.pptx is missing ${name}`);
  }

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
  <Override PartName="/ppt/diagrams/data1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.diagramData+xml"/>
  <Override PartName="/ppt/diagrams/layout1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.diagramLayout+xml"/>
  <Override PartName="/ppt/diagrams/quickStyle1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.diagramStyle+xml"/>
  <Override PartName="/ppt/diagrams/colors1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.diagramColors+xml"/>
  <Override PartName="/ppt/diagrams/drawing1.xml" ContentType="application/vnd.ms-office.drawingml.diagramDrawing+xml"/>
</Types>`;

  const entries = [
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: readZipEntry(shellPptx, "_rels/.rels") },
    { name: "docProps/core.xml", data: CORE_XML },
    { name: "docProps/app.xml", data: APP_XML },
    { name: "ppt/presentation.xml", data: PRESENTATION_XML },
    { name: "ppt/_rels/presentation.xml.rels", data: PRESENTATION_RELS },
    { name: "ppt/presProps.xml", data: readZipEntry(shellPptx, "ppt/presProps.xml") },
    { name: "ppt/theme/theme1.xml", data: readZipEntry(shellPptx, "ppt/theme/theme1.xml") },
    { name: "ppt/slideMasters/slideMaster1.xml", data: readZipEntry(shellPptx, "ppt/slideMasters/slideMaster1.xml") },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: readZipEntry(shellPptx, "ppt/slideMasters/_rels/slideMaster1.xml.rels") },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: readZipEntry(shellPptx, "ppt/slideLayouts/slideLayout1.xml") },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: readZipEntry(shellPptx, "ppt/slideLayouts/_rels/slideLayout1.xml.rels") },
    { name: "ppt/slides/slide1.xml", data: SLIDE_XML },
    { name: "ppt/slides/_rels/slide1.xml.rels", data: SLIDE_RELS },
    { name: "ppt/diagrams/data1.xml", data: requireSrc("data1.xml") },
    { name: "ppt/diagrams/layout1.xml", data: requireSrc("layout1.xml") },
    { name: "ppt/diagrams/quickStyle1.xml", data: requireSrc("quickStyle1.xml") },
    { name: "ppt/diagrams/colors1.xml", data: requireSrc("colors1.xml") },
    { name: "ppt/diagrams/drawing1.xml", data: requireSrc("drawing1.xml") }
  ];

  const zip = createZip(entries);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, zip);
  return destPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dest = packSlidesSmartartPptx();
  console.log("packed", dest, fs.statSync(dest).size, "bytes");
}
