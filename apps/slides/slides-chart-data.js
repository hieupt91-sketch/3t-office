/** Small dependency-free chart data normalization for 3T Slide. */

export const SLIDES_CHART_TYPES = ["bar", "line", "pie", "area"];

function numeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").trim().replace(/\s/g, "").replace(/[₫%]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeSlidesChart(chart = {}) {
  const type = SLIDES_CHART_TYPES.includes(chart.chartType || chart.type) ? (chart.chartType || chart.type) : "bar";
  const labels = Array.isArray(chart.labels) ? chart.labels.map((item, index) => String(item || `Mục ${index + 1}`)) : [];
  const data = Array.isArray(chart.data) ? chart.data.map(numeric) : [];
  const length = Math.max(labels.length, data.length);
  return {
    chartType: type,
    title: String(chart.title || "Biểu đồ dữ liệu"),
    labels: Array.from({ length }, (_, index) => labels[index] || `Mục ${index + 1}`),
    data: Array.from({ length }, (_, index) => data[index] ?? 0)
  };
}
