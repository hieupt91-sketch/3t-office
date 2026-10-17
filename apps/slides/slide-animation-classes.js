// Bảng hiệu ứng hoạt hình Slides theo 3 nhóm giống PowerPoint: VÀO (entrance), NHẤN MẠNH (emphasis), THOÁT (exit).
// Mô hình: mỗi đối tượng có một `animation = { type, duration, delay, start, order }`; nhóm suy ra từ `type`
// nên tài liệu cũ (chỉ có hiệu ứng vào) đọc/ghi không đổi.

export const ANIMATION_CLASSES = ["entrance", "emphasis", "exit"];

export const ANIMATION_EFFECTS = [
  { id: "fadeIn", cls: "entrance", name: "Mờ dần", keyframe: "vnoAnimFadeIn", presetId: "ooo-entrance-fade-in", aliases: ["fade"] },
  { id: "flyIn", cls: "entrance", name: "Bay vào", keyframe: "vnoAnimFlyIn", presetId: "ooo-entrance-fly-in", subType: "from-bottom", aliases: ["fly"] },
  { id: "zoomIn", cls: "entrance", name: "Thu phóng vào", keyframe: "vnoAnimZoomIn", presetId: "ooo-entrance-zoom", aliases: ["zoom"] },
  { id: "bounceIn", cls: "entrance", name: "Nảy vào", keyframe: "vnoAnimBounceIn", presetId: "ooo-entrance-bounce", aliases: ["bounce"] },
  { id: "slideLeft", cls: "entrance", name: "Trượt từ trái", keyframe: "vnoAnimSlideLeft", presetId: "ooo-entrance-wipe", subType: "from-left", aliases: ["slide"] },
  { id: "spin", cls: "emphasis", name: "Xoay tròn", keyframe: "vnoAnimSpin", presetId: "ooo-emphasis-spin" },
  { id: "growShrink", cls: "emphasis", name: "Phóng to / thu nhỏ", keyframe: "vnoAnimGrowShrink", presetId: "ooo-emphasis-grow-and-shrink" },
  { id: "fadeOut", cls: "exit", name: "Mờ dần ra", keyframe: "vnoAnimFadeOut", presetId: "ooo-exit-fade-out" },
  { id: "flyOut", cls: "exit", name: "Bay ra", keyframe: "vnoAnimFlyOut", presetId: "ooo-exit-fly-out", subType: "to-bottom" },
  { id: "zoomOut", cls: "exit", name: "Thu nhỏ ra", keyframe: "vnoAnimZoomOut", presetId: "ooo-exit-zoom" },
  { id: "disappear", cls: "exit", name: "Biến mất", keyframe: "vnoAnimDisappear", presetId: "ooo-exit-disappear" }
];

const BY_ID = new Map();
for (const effect of ANIMATION_EFFECTS) {
  BY_ID.set(effect.id, effect);
  (effect.aliases || []).forEach((alias) => BY_ID.set(alias, effect));
}

export function animationEffect(type) {
  return BY_ID.get(String(type || "")) || null;
}

/** "entrance" | "emphasis" | "exit"; kiểu lạ hoặc "none" -> null. */
export function animationClassOf(type) {
  return animationEffect(type)?.cls || null;
}

export function animationEffectsOfClass(cls) {
  return ANIMATION_EFFECTS.filter((effect) => effect.cls === cls);
}

export function animationKeyframeName(type) {
  return animationEffect(type)?.keyframe || "vnoAnimFadeIn";
}

/**
 * CSS inline cho một hiệu ứng khi phát.
 * - VÀO: ẩn sẵn (opacity 0) rồi hiện dần và giữ trạng thái cuối.
 * - NHẤN MẠNH: đối tượng hiện sẵn, chạy xong trở lại nguyên trạng (không ẩn/hiện).
 * - THOÁT: đối tượng hiện sẵn từ đầu, sau hiệu ứng thì ẩn hẳn.
 */
export function animationInlineCss(type, duration, delay) {
  const effect = animationEffect(type);
  if (!effect) return "";
  const dur = Number(duration) > 0 ? Number(duration) : 500;
  const del = Number(delay) > 0 ? Number(delay) : 0;
  if (effect.cls === "emphasis") {
    return `animation:${effect.keyframe} ${dur}ms ease-in-out ${del}ms both;`;
  }
  if (effect.cls === "exit") {
    return `animation:${effect.keyframe} ${dur}ms ease-in ${del}ms forwards;`;
  }
  return `opacity:0;animation:${effect.keyframe} ${dur}ms ease-out ${del}ms forwards;`;
}

/** Từ presentation:preset-class + preset-id của ODF/FODP sang kiểu hiệu ứng của VN (hoặc null). */
export function animationTypeFromPreset(presetClass, presetId) {
  const id = String(presetId || "").toLowerCase();
  const cls = String(presetClass || "").toLowerCase();
  if (!id) return null;
  if (cls === "exit") {
    if (id.includes("fly")) return "flyOut";
    if (id.includes("zoom") || id.includes("shrink")) return "zoomOut";
    if (id.includes("fade")) return "fadeOut";
    if (id.includes("disappear") || id.includes("appear")) return "disappear";
    return null;
  }
  if (cls === "emphasis") {
    if (id.includes("spin")) return "spin";
    if (id.includes("grow")) return "growShrink";
    return null;
  }
  if (id.includes("fly-in")) return "flyIn";
  if (id.includes("zoom")) return "zoomIn";
  if (id.includes("bounce")) return "bounceIn";
  if (id.includes("wipe") || id.includes("peek-in")) return "slideLeft";
  if (id.includes("fade-in") || id.endsWith("fade") || id.includes("appear")) return "fadeIn";
  return null;
}
