import { getLocale } from "../i18n/i18n.js";

const VI_MONTHS = [
  "tháng 1", "tháng 2", "tháng 3", "tháng 4", "tháng 5", "tháng 6",
  "tháng 7", "tháng 8", "tháng 9", "tháng 10", "tháng 11", "tháng 12"
];
const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatDateTime(date = new Date(), format = "dd/MM/yyyy") {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const dd = pad(d.getDate());
  const MM = pad(d.getMonth() + 1);
  const yyyy = String(d.getFullYear());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const isEn = getLocale() === "en";
  switch (format) {
    case "dd/MM/yyyy HH:mm":
      return `${dd}/${MM}/${yyyy} ${HH}:${mm}`;
    case "d MMMM yyyy":
      return isEn
        ? `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${yyyy}`
        : `${d.getDate()} ${VI_MONTHS[d.getMonth()]} năm ${yyyy}`;
    case "yyyy-MM-dd":
      return `${yyyy}-${MM}-${dd}`;
    case "HH:mm":
      return `${HH}:${mm}`;
    case "dd/MM/yyyy":
    default:
      return `${dd}/${MM}/${yyyy}`;
  }
}
