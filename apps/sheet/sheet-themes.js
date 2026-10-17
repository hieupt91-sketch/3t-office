/**
 * VN Office — Hệ thống Chủ đề (Themes), Bảng màu (Colors) và Bộ phông chữ (Fonts)
 * Chuẩn tương thích Microsoft Excel 2016 OpenXML DrawingML (xl/theme/theme1.xml)
 */

export const SHEET_THEMES = [
  {
    id: "office",
    nameVi: "Office",
    nameEn: "Office",
    colorSchemeId: "office",
    fontSchemeId: "office",
    descriptionVi: "Bộ chủ đề mặc định tiêu chuẩn Office với phông Calibri và tông xanh dương chủ đạo",
    descriptionEn: "Default Office theme with Calibri and classic blue accent"
  },
  {
    id: "facet",
    nameVi: "Góc cạnh (Facet)",
    nameEn: "Facet",
    colorSchemeId: "facet",
    fontSchemeId: "centuryGothic",
    descriptionVi: "Phong cách hình khối hiện đại với tông xanh lục nhạt và phông Century Gothic",
    descriptionEn: "Modern geometric look with light green accents and Century Gothic font"
  },
  {
    id: "integral",
    nameVi: "Tích phân (Integral)",
    nameEn: "Integral",
    colorSchemeId: "integral",
    fontSchemeId: "centuryGothic",
    descriptionVi: "Tông màu doanh nghiệp trang trọng với xanh navy sâu và phông Century Gothic",
    descriptionEn: "Deep formal corporate navy blue palette with Century Gothic font"
  },
  {
    id: "ion",
    nameVi: "Ion",
    nameEn: "Ion",
    colorSchemeId: "ion",
    fontSchemeId: "centuryGothic",
    descriptionVi: "Tông màu tương phản cao năng động với phông chữ Century Gothic",
    descriptionEn: "Vibrant high-contrast palette with Century Gothic font"
  },
  {
    id: "organic",
    nameVi: "Hữu cơ (Organic)",
    nameEn: "Organic",
    colorSchemeId: "organic",
    fontSchemeId: "garamond",
    descriptionVi: "Sắc màu tự nhiên xanh lá ấm áp phối hợp cùng phông chữ Garamond cổ điển",
    descriptionEn: "Earthy warm natural greens paired with classic Garamond typography"
  },
  {
    id: "retrospect",
    nameVi: "Hồi tưởng (Retrospect)",
    nameEn: "Retrospect",
    colorSchemeId: "retrospect",
    fontSchemeId: "bookman",
    descriptionVi: "Tông màu hoài niệm trầm ấm với phông chữ Bookman Old Style",
    descriptionEn: "Subtle vintage muted tones with Bookman Old Style typography"
  },
  {
    id: "slice",
    nameVi: "Lát cắt (Slice)",
    nameEn: "Slice",
    colorSchemeId: "slice",
    fontSchemeId: "centuryGothic",
    descriptionVi: "Tông màu tươi sáng phong cách giao diện phẳng với phông Century Gothic",
    descriptionEn: "Crisp modern flat design colors with Century Gothic font"
  },
  {
    id: "wisp",
    nameVi: "Thoang thoảng (Wisp)",
    nameEn: "Wisp",
    colorSchemeId: "wisp",
    fontSchemeId: "calibri",
    descriptionVi: "Sắc màu dịu nhẹ tinh tế phối hợp cùng phông chữ Calibri chuẩn mực",
    descriptionEn: "Soft elegant pastel hues with versatile Calibri font"
  }
];

export const SHEET_COLOR_PALETTES = {
  office: {
    id: "office",
    name: "Office",
    nameVi: "Office",
    nameEn: "Office",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "44546A",
      lt2: "E7E6E6",
      accent1: "4472C4",
      accent2: "ED7D31",
      accent3: "A5A5A5",
      accent4: "FFC000",
      accent5: "5B9BD5",
      accent6: "70AD47",
      hlink: "0563C1",
      folHlink: "954F72"
    }
  },
  office2007: {
    id: "office2007",
    name: "Office 2007 - 2010",
    nameVi: "Office 2007 - 2010",
    nameEn: "Office 2007 - 2010",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "1F497D",
      lt2: "EEECE1",
      accent1: "4F81BD",
      accent2: "C0504D",
      accent3: "9BBB59",
      accent4: "8064A2",
      accent5: "4BACC6",
      accent6: "F79646",
      hlink: "0000FF",
      folHlink: "800080"
    }
  },
  grayscale: {
    id: "grayscale",
    name: "Grayscale",
    nameVi: "Mức xám (Grayscale)",
    nameEn: "Grayscale",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "333333",
      lt2: "E0E0E0",
      accent1: "595959",
      accent2: "737373",
      accent3: "8C8C8C",
      accent4: "A6A6A6",
      accent5: "BFBFBF",
      accent6: "D9D9D9",
      hlink: "404040",
      folHlink: "666666"
    }
  },
  facet: {
    id: "facet",
    name: "Facet",
    nameVi: "Góc cạnh (Facet)",
    nameEn: "Facet",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "0D2228",
      lt2: "EBEDE9",
      accent1: "94C600",
      accent2: "71685A",
      accent3: "459BA8",
      accent4: "B98A00",
      accent5: "83A090",
      accent6: "7D6574",
      hlink: "B15600",
      folHlink: "703800"
    }
  },
  integral: {
    id: "integral",
    name: "Integral",
    nameVi: "Tích phân (Integral)",
    nameEn: "Integral",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "1B2631",
      lt2: "E5E7E9",
      accent1: "1B4F72",
      accent2: "78281F",
      accent3: "145A32",
      accent4: "6E2C00",
      accent5: "4A235A",
      accent6: "515A5A",
      hlink: "2874A6",
      folHlink: "6C3483"
    }
  },
  ion: {
    id: "ion",
    name: "Ion",
    nameVi: "Ion",
    nameEn: "Ion",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "2E3033",
      lt2: "E8EAED",
      accent1: "E84C3D",
      accent2: "E67E22",
      accent3: "F1C40F",
      accent4: "2ECC71",
      accent5: "3498DB",
      accent6: "9B59B6",
      hlink: "C0392B",
      folHlink: "8E44AD"
    }
  },
  organic: {
    id: "organic",
    name: "Organic",
    nameVi: "Hữu cơ (Organic)",
    nameEn: "Organic",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "3C3836",
      lt2: "EFE9E1",
      accent1: "688A28",
      accent2: "A94442",
      accent3: "3C763D",
      accent4: "8A6D3B",
      accent5: "31708F",
      accent6: "775253",
      hlink: "4E6A1E",
      folHlink: "6B2A29"
    }
  },
  retrospect: {
    id: "retrospect",
    name: "Retrospect",
    nameVi: "Hồi tưởng (Retrospect)",
    nameEn: "Retrospect",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "2F3A40",
      lt2: "E3E8EC",
      accent1: "697A8D",
      accent2: "8E6B88",
      accent3: "5B8C85",
      accent4: "B28867",
      accent5: "4C7280",
      accent6: "7C7866",
      hlink: "506070",
      folHlink: "6A4A65"
    }
  },
  slice: {
    id: "slice",
    name: "Slice",
    nameVi: "Lát cắt (Slice)",
    nameEn: "Slice",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "262626",
      lt2: "E0E0E0",
      accent1: "0078D7",
      accent2: "107C41",
      accent3: "D83B01",
      accent4: "FFB900",
      accent5: "B4009E",
      accent6: "008272",
      hlink: "0063B1",
      folHlink: "8661C5"
    }
  },
  wisp: {
    id: "wisp",
    name: "Wisp",
    nameVi: "Thoang thoảng (Wisp)",
    nameEn: "Wisp",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "2B333E",
      lt2: "E7EDF3",
      accent1: "4F81BD",
      accent2: "C0504D",
      accent3: "9BBB59",
      accent4: "8064A2",
      accent5: "4BACC6",
      accent6: "F79646",
      hlink: "0000FF",
      folHlink: "800080"
    }
  },
  blue: {
    id: "blue",
    name: "Blue",
    nameVi: "Xanh dương (Blue)",
    nameEn: "Blue",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "1A365D",
      lt2: "EBF8FF",
      accent1: "2B6CB0",
      accent2: "3182CE",
      accent3: "4299E1",
      accent4: "63B3ED",
      accent5: "90CDF4",
      accent6: "BEE3F8",
      hlink: "2C5282",
      folHlink: "1A365D"
    }
  },
  green: {
    id: "green",
    name: "Green",
    nameVi: "Xanh lá (Green)",
    nameEn: "Green",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "1C4532",
      lt2: "F0FFF4",
      accent1: "276749",
      accent2: "2F855A",
      accent3: "38A169",
      accent4: "48BB78",
      accent5: "68D391",
      accent6: "9AE6B4",
      hlink: "22543D",
      folHlink: "1C4532"
    }
  },
  red: {
    id: "red",
    name: "Red",
    nameVi: "Đỏ (Red)",
    nameEn: "Red",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "63171B",
      lt2: "FFF5F5",
      accent1: "9B2C2C",
      accent2: "C53030",
      accent3: "E53E3E",
      accent4: "F56565",
      accent5: "FEB2B2",
      accent6: "FED7D7",
      hlink: "742A2A",
      folHlink: "63171B"
    }
  },
  violet: {
    id: "violet",
    name: "Violet",
    nameVi: "Tím (Violet)",
    nameEn: "Violet",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "322659",
      lt2: "FAF5FF",
      accent1: "553C9A",
      accent2: "6B46C1",
      accent3: "805AD5",
      accent4: "9F7AEA",
      accent5: "B794F4",
      accent6: "D6BCFA",
      hlink: "44337A",
      folHlink: "322659"
    }
  },
  orange: {
    id: "orange",
    name: "Orange",
    nameVi: "Cam (Orange)",
    nameEn: "Orange",
    colors: {
      dk1: "000000",
      lt1: "FFFFFF",
      dk2: "652B19",
      lt2: "FFFAF0",
      accent1: "9C4221",
      accent2: "C05621",
      accent3: "DD6B20",
      accent4: "ED8936",
      accent5: "F6AD55",
      accent6: "FBD38D",
      hlink: "7B341E",
      folHlink: "652B19"
    }
  }
};

export const SHEET_FONT_SCHEMES = {
  office: {
    id: "office",
    name: "Office",
    nameVi: "Office (Calibri Light / Calibri)",
    nameEn: "Office (Calibri Light / Calibri)",
    majorFont: "Calibri Light",
    minorFont: "Calibri"
  },
  office2007: {
    id: "office2007",
    name: "Office 2007 - 2010",
    nameVi: "Office 2007 - 2010 (Cambria / Calibri)",
    nameEn: "Office 2007 - 2010 (Cambria / Calibri)",
    majorFont: "Cambria",
    minorFont: "Calibri"
  },
  arial: {
    id: "arial",
    name: "Arial",
    nameVi: "Arial (Arial / Arial)",
    nameEn: "Arial (Arial / Arial)",
    majorFont: "Arial",
    minorFont: "Arial"
  },
  times: {
    id: "times",
    name: "Times New Roman",
    nameVi: "Times New Roman (Times / Times)",
    nameEn: "Times New Roman (Times / Times)",
    majorFont: "Times New Roman",
    minorFont: "Times New Roman"
  },
  georgia: {
    id: "georgia",
    name: "Georgia",
    nameVi: "Georgia (Georgia / Georgia)",
    nameEn: "Georgia (Georgia / Georgia)",
    majorFont: "Georgia",
    minorFont: "Georgia"
  },
  trebuchet: {
    id: "trebuchet",
    name: "Trebuchet MS",
    nameVi: "Trebuchet MS (Trebuchet / Trebuchet)",
    nameEn: "Trebuchet MS (Trebuchet / Trebuchet)",
    majorFont: "Trebuchet MS",
    minorFont: "Trebuchet MS"
  },
  centuryGothic: {
    id: "centuryGothic",
    name: "Century Gothic",
    nameVi: "Century Gothic (Gothic / Gothic)",
    nameEn: "Century Gothic (Gothic / Gothic)",
    majorFont: "Century Gothic",
    minorFont: "Century Gothic"
  },
  garamond: {
    id: "garamond",
    name: "Garamond",
    nameVi: "Garamond (Garamond / Garamond)",
    nameEn: "Garamond (Garamond / Garamond)",
    majorFont: "Garamond",
    minorFont: "Garamond"
  },
  bookman: {
    id: "bookman",
    name: "Bookman Old Style",
    nameVi: "Bookman Old Style (Bookman / Bookman)",
    nameEn: "Bookman Old Style (Bookman / Bookman)",
    majorFont: "Bookman Old Style",
    minorFont: "Bookman Old Style"
  },
  calibri: {
    id: "calibri",
    name: "Calibri",
    nameVi: "Calibri (Calibri / Calibri)",
    nameEn: "Calibri (Calibri / Calibri)",
    majorFont: "Calibri",
    minorFont: "Calibri"
  },
  beVietnamPro: {
    id: "beVietnamPro",
    name: "Be Vietnam Pro",
    nameVi: "Be Vietnam Pro (Be Vietnam Pro / Be Vietnam Pro)",
    nameEn: "Be Vietnam Pro (Be Vietnam Pro / Be Vietnam Pro)",
    majorFont: "Be Vietnam Pro",
    minorFont: "Be Vietnam Pro"
  }
};

export const DEFAULT_SHEET_THEME = {
  themeId: "office",
  themeName: "Office Theme",
  colorSchemeId: "office",
  fontSchemeId: "office",
  colorScheme: SHEET_COLOR_PALETTES.office,
  fontScheme: SHEET_FONT_SCHEMES.office
};

export function resolveTheme(themeOrId) {
  if (!themeOrId) return { ...DEFAULT_SHEET_THEME };
  if (typeof themeOrId === "string") {
    const found = SHEET_THEMES.find(t => t.id === themeOrId);
    if (found) {
      return {
        themeId: found.id,
        themeName: found.nameEn,
        colorSchemeId: found.colorSchemeId,
        fontSchemeId: found.fontSchemeId,
        colorScheme: SHEET_COLOR_PALETTES[found.colorSchemeId] || SHEET_COLOR_PALETTES.office,
        fontScheme: SHEET_FONT_SCHEMES[found.fontSchemeId] || SHEET_FONT_SCHEMES.office
      };
    }
    if (SHEET_COLOR_PALETTES[themeOrId]) {
      return {
        themeId: "custom",
        themeName: "Custom Theme",
        colorSchemeId: themeOrId,
        fontSchemeId: "office",
        colorScheme: SHEET_COLOR_PALETTES[themeOrId],
        fontScheme: SHEET_FONT_SCHEMES.office
      };
    }
  }
  const themeId = themeOrId.themeId || "custom";
  const found = SHEET_THEMES.find(t => t.id === themeId);
  const colorId = themeOrId.colorSchemeId || found?.colorSchemeId || "office";
  const fontId = themeOrId.fontSchemeId || found?.fontSchemeId || "office";
  return {
    themeId,
    themeName: themeOrId.themeName || found?.nameEn || "Custom Theme",
    colorSchemeId: colorId,
    fontSchemeId: fontId,
    colorScheme: themeOrId.colorScheme || SHEET_COLOR_PALETTES[colorId] || SHEET_COLOR_PALETTES.office,
    fontScheme: themeOrId.fontScheme || SHEET_FONT_SCHEMES[fontId] || SHEET_FONT_SCHEMES.office
  };
}

/**
 * Tạo nội dung XML xl/theme/theme1.xml chuẩn OpenXML DrawingML
 */
export function generateThemeXml(themeConfig = DEFAULT_SHEET_THEME) {
  const resolved = resolveTheme(themeConfig);
  const themeName = resolved.themeName || "Office Theme";
  const clr = resolved.colorScheme;
  const fnt = resolved.fontScheme;
  const c = clr.colors;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" name="${escapeXml(themeName)}">
  <a:themeElements>
    <a:clrScheme name="${escapeXml(clr.name || clr.id || "Office")}">
      <a:dk1>
        <a:sysClr val="windowText" lastClr="${c.dk1}"/>
      </a:dk1>
      <a:lt1>
        <a:sysClr val="window" lastClr="${c.lt1}"/>
      </a:lt1>
      <a:dk2>
        <a:srgbClr val="${c.dk2}"/>
      </a:dk2>
      <a:lt2>
        <a:srgbClr val="${c.lt2}"/>
      </a:lt2>
      <a:accent1>
        <a:srgbClr val="${c.accent1}"/>
      </a:accent1>
      <a:accent2>
        <a:srgbClr val="${c.accent2}"/>
      </a:accent2>
      <a:accent3>
        <a:srgbClr val="${c.accent3}"/>
      </a:accent3>
      <a:accent4>
        <a:srgbClr val="${c.accent4}"/>
      </a:accent4>
      <a:accent5>
        <a:srgbClr val="${c.accent5}"/>
      </a:accent5>
      <a:accent6>
        <a:srgbClr val="${c.accent6}"/>
      </a:accent6>
      <a:hlink>
        <a:srgbClr val="${c.hlink}"/>
      </a:hlink>
      <a:folHlink>
        <a:srgbClr val="${c.folHlink}"/>
      </a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="${escapeXml(fnt.name || fnt.id || "Office")}">
      <a:majorFont>
        <a:latin typeface="${escapeXml(fnt.majorFont || "Calibri Light")}"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="${escapeXml(fnt.minorFont || "Calibri")}"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="${escapeXml(themeName)}">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="300000"/></a:schemeClr></a:gs>
            <a:gs pos="35000"><a:schemeClr val="phClr"><a:tint val="37000"/><a:satMod val="220000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="15000"/><a:satMod val="131000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="16200000" scaled="1"/>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:shade val="100000"/><a:satMod val="130000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:tint val="50000"/><a:satMod val="350000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="16200000" scaled="0"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/><a:satMod val="105000"/></a:schemeClr></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst><a:outerShdw blurRad="40000" dist="20000" dir="5400000" rotWithShape="0"><a:srgbClr val="000000"><a:alpha val="38000"/></a:srgbClr></a:outerShdw></a:effectLst></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="40000"/><a:satMod val="350000"/></a:schemeClr></a:gs><a:gs pos="40000"><a:schemeClr val="phClr"><a:tint val="45000"/><a:shade val="99000"/><a:satMod val="350000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="20000"/><a:satMod val="255000"/></a:schemeClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="-80000" r="50000" b="180000"/></a:path></a:gradFill>
        <a:gradFill rotWithShape="1"><a:gsLst><a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="80000"/><a:satMod val="300000"/></a:schemeClr></a:gs><a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="30000"/><a:satMod val="200000"/></a:schemeClr></a:gs></a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path></a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;
}

/**
 * Phân tích nội dung XML theme1.xml để trích xuất màu sắc và phông chữ
 */
export function parseThemeXml(xmlText) {
  if (!xmlText || typeof xmlText !== "string") return null;

  const themeNameMatch = xmlText.match(/<a:theme\b[^>]*\bname=["']([^"']+)["']/i);
  const themeName = themeNameMatch ? themeNameMatch[1] : "Office Theme";

  const clrSchemeMatch = xmlText.match(/<a:clrScheme\b[^>]*\bname=["']([^"']+)["']/i);
  const colorSchemeName = clrSchemeMatch ? clrSchemeMatch[1] : "Office";

  const extractClr = (tag) => {
    const block = xmlText.match(new RegExp(`<a:${tag}\\b[^>]*>([\\s\\S]*?)<\\/a:${tag}>`, "i"))?.[1] || "";
    const srgb = block.match(/<a:srgbClr\b[^>]*\bval=["']([0-9a-fA-F]{6})["']/i)?.[1];
    if (srgb) return srgb.toUpperCase();
    const lastClr = block.match(/<a:sysClr\b[^>]*\blastClr=["']([0-9a-fA-F]{6})["']/i)?.[1];
    if (lastClr) return lastClr.toUpperCase();
    const sysVal = block.match(/<a:sysClr\b[^>]*\bval=["']([^"']+)["']/i)?.[1];
    if (sysVal === "windowText") return "000000";
    if (sysVal === "window") return "FFFFFF";
    return "000000";
  };

  const colors = {
    dk1: extractClr("dk1"),
    lt1: extractClr("lt1"),
    dk2: extractClr("dk2"),
    lt2: extractClr("lt2"),
    accent1: extractClr("accent1"),
    accent2: extractClr("accent2"),
    accent3: extractClr("accent3"),
    accent4: extractClr("accent4"),
    accent5: extractClr("accent5"),
    accent6: extractClr("accent6"),
    hlink: extractClr("hlink"),
    folHlink: extractClr("folHlink")
  };

  const fontSchemeMatch = xmlText.match(/<a:fontScheme\b[^>]*\bname=["']([^"']+)["']/i);
  const fontSchemeName = fontSchemeMatch ? fontSchemeMatch[1] : "Office";

  const majorFontMatch = xmlText.match(/<a:majorFont\b[^>]*>[\s\S]*?<a:latin\b[^>]*\btypeface=["']([^"']+)["']/i);
  const minorFontMatch = xmlText.match(/<a:minorFont\b[^>]*>[\s\S]*?<a:latin\b[^>]*\btypeface=["']([^"']+)["']/i);

  const majorFont = majorFontMatch ? majorFontMatch[1] : "Calibri Light";
  const minorFont = minorFontMatch ? minorFontMatch[1] : "Calibri";

  // Nhận diện theme ID khớp nếu có
  let matchedThemeId = "custom";
  for (const t of SHEET_THEMES) {
    const pal = SHEET_COLOR_PALETTES[t.colorSchemeId];
    if (pal && pal.colors.accent1.toUpperCase() === colors.accent1) {
      matchedThemeId = t.id;
      break;
    }
  }

  let matchedColorPaletteId = "custom";
  for (const [id, pal] of Object.entries(SHEET_COLOR_PALETTES)) {
    if (pal.colors.accent1.toUpperCase() === colors.accent1 && pal.colors.accent2.toUpperCase() === colors.accent2) {
      matchedColorPaletteId = id;
      break;
    }
  }

  let matchedFontSchemeId = "custom";
  for (const [id, fnt] of Object.entries(SHEET_FONT_SCHEMES)) {
    if (fnt.minorFont.toLowerCase() === minorFont.toLowerCase()) {
      matchedFontSchemeId = id;
      break;
    }
  }

  return {
    themeId: matchedThemeId,
    themeName,
    colorSchemeId: matchedColorPaletteId,
    fontSchemeId: matchedFontSchemeId,
    colorScheme: {
      id: matchedColorPaletteId,
      name: colorSchemeName,
      colors
    },
    fontScheme: {
      id: matchedFontSchemeId,
      name: fontSchemeName,
      majorFont,
      minorFont
    }
  };
}

/**
 * Chuyển đổi mã hex và tỉ lệ tint/shade sang hex màu mới
 */
function tintOrShade(hex, percent) {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  let newR, newG, newB;
  if (percent > 0) {
    // Tint: blend với trắng (255)
    newR = Math.round(r + (255 - r) * percent);
    newG = Math.round(g + (255 - g) * percent);
    newB = Math.round(b + (255 - b) * percent);
  } else {
    // Shade: blend với đen (0)
    const factor = 1 + percent; // e.g. percent = -0.25 -> factor = 0.75
    newR = Math.round(r * factor);
    newG = Math.round(g * factor);
    newB = Math.round(b * factor);
  }

  const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Sinh ma trận 10 cột x 6 hàng cho bảng chọn màu chuẩn Excel Theme Color Picker
 * Hàng 0: 10 màu gốc (lt1, dk1, lt2, dk2, accent1..6)
 * Hàng 1..5: 5 cấp độ sáng/tối (tints và shades)
 */
export function getThemeColorPickerMatrix(colors) {
  const base10 = [
    colors.lt1 || "FFFFFF",
    colors.dk1 || "000000",
    colors.lt2 || "EEECE1",
    colors.dk2 || "1F497D",
    colors.accent1 || "4F81BD",
    colors.accent2 || "C0504D",
    colors.accent3 || "9BBB59",
    colors.accent4 || "8064A2",
    colors.accent5 || "4BACC6",
    colors.accent6 || "F79646"
  ];

  // Các hệ số sắc độ chuẩn của Excel 2016
  const shadeFactors = [
    [0.8, -0.05, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8],
    [0.6, -0.15, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
    [0.4, -0.25, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4],
    [-0.1, -0.35, -0.1, -0.25, -0.25, -0.25, -0.25, -0.25, -0.25, -0.25],
    [-0.25, -0.5, -0.25, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5]
  ];

  const rows = [];
  rows.push(base10.map(hex => `#${hex.toUpperCase()}`));

  for (let r = 0; r < 5; r++) {
    const row = [];
    for (let c = 0; c < 10; c++) {
      row.push(tintOrShade(base10[c], shadeFactors[r][c]));
    }
    rows.push(row);
  }

  return rows;
}

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
