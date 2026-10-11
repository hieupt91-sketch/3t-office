export function slugBookmarkName(name) {
  const slug = String(name || "bookmark")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "bookmark";
}
