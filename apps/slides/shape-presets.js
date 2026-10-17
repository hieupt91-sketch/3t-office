/**
 * Thư viện hình dựng sẵn của Slides (tên trùng bộ hình OOXML: triangle, diamond, star5...).
 * Mỗi hình có đường vẽ trong hệ tọa độ 0–100 (kéo giãn theo khung hình) để vẽ trong trình soạn thảo; khi lưu, hình đi qua
 * `geomType = "ooxml-<id>"` nên LibreOffice ghi đúng hình tự động của PowerPoint (đã đối chiếu AutoShapeType bằng COM).
 */
export const SHAPE_PRESETS = [
  { id: "roundRect", label: "Hình chữ nhật bo góc", css: { borderRadius: "16%" } },
  { id: "triangle", label: "Tam giác cân", path: "M50 0 L100 100 L0 100 Z" },
  { id: "rtTriangle", label: "Tam giác vuông", path: "M0 0 L100 100 L0 100 Z" },
  { id: "diamond", label: "Hình thoi", path: "M50 0 L100 50 L50 100 L0 50 Z" },
  { id: "parallelogram", label: "Hình bình hành", path: "M25 0 L100 0 L75 100 L0 100 Z" },
  { id: "trapezoid", label: "Hình thang", path: "M20 0 L80 0 L100 100 L0 100 Z" },
  { id: "pentagon", label: "Ngũ giác", path: "M50 0 L100 38 L81 100 L19 100 L0 38 Z" },
  { id: "hexagon", label: "Lục giác", path: "M25 0 L75 0 L100 50 L75 100 L25 100 L0 50 Z" },
  { id: "star5", label: "Sao 5 cánh", path: "M50 0 L61 38 L100 38 L69 61 L80 100 L50 77 L20 100 L31 61 L0 38 L39 38 Z" },
  { id: "plus", label: "Dấu cộng", path: "M33 0 L67 0 L67 33 L100 33 L100 67 L67 67 L67 100 L33 100 L33 67 L0 67 L0 33 L33 33 Z" },
  { id: "rightArrow", label: "Mũi tên phải", path: "M0 30 L60 30 L60 0 L100 50 L60 100 L60 70 L0 70 Z" },
  { id: "leftArrow", label: "Mũi tên trái", path: "M100 30 L40 30 L40 0 L0 50 L40 100 L40 70 L100 70 Z" },
  { id: "upArrow", label: "Mũi tên lên", path: "M30 100 L30 40 L0 40 L50 0 L100 40 L70 40 L70 100 Z" },
  { id: "downArrow", label: "Mũi tên xuống", path: "M30 0 L70 0 L70 60 L100 60 L50 100 L0 60 L30 60 Z" },
  { id: "heart", label: "Hình trái tim", path: "M50 90 C10 60 0 35 15 15 C30 0 47 8 50 25 C53 8 70 0 85 15 C100 35 90 60 50 90 Z" },
  { id: "wedgeRectCallout", label: "Chú thích chữ nhật", path: "M0 0 L100 0 L100 70 L40 70 L20 100 L25 70 L0 70 Z" }
];

const BY_ID = new Map(SHAPE_PRESETS.map((preset) => [preset.id, preset]));

/** Hình dựng sẵn ứng với geomType ("ooxml-triangle" hoặc "triangle"); không có thì trả null. */
export function presetOf(geomType) {
  const id = String(geomType || "").replace(/^ooxml-/i, "");
  return BY_ID.get(id) || null;
}

export function presetGeomType(id) {
  return BY_ID.has(id) ? `ooxml-${id}` : null;
}

/** Thêm hình vẽ (SVG) của hình dựng sẵn vào phần tử; trả true nếu đã vẽ bằng SVG (khi đó phần tử bỏ nền/viền CSS). */
export function renderPresetGeometry(el, shape, preset) {
  if (!preset?.path || typeof document === "undefined") return false;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "vno-shape-geometry");
  svg.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;";
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", preset.path);
  path.setAttribute("fill", shape.fill || shape.color || "#3b82f6");
  const stroke = shape.stroke || shape.strokeColor;
  if (stroke) {
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", String(shape.strokeWidth || 1));
    path.setAttribute("vector-effect", "non-scaling-stroke");
    const dash = String(shape.strokeDash || "");
    if (shape.strokeDash || shape.strokeKind === "dash") path.setAttribute("stroke-dasharray", /^Dot$/i.test(dash) ? "1 3" : "8 4");
  }
  svg.appendChild(path);
  el.insertBefore(svg, el.firstChild);
  return true;
}
