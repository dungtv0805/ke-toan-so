import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/** Chuẩn hóa số tiền từ chuỗi/ số Excel về number, hoặc null nếu không hợp lệ. */
export function normalizeAmount(raw: string | number | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;

  let s = String(raw).trim();
  if (s === "") return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (s === "" || s === "-") return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    // Dấu xuất hiện sau cùng là thập phân, dấu còn lại là ngăn cách nghìn
    const lastSep = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
    const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
    const decPart = s.slice(lastSep + 1).replace(/[.,]/g, "");
    s = `${intPart}.${decPart}`;
  } else if (hasComma) {
    const parts = s.split(",");
    // Nhiều phẩy, hoặc nhóm cuối đúng 3 chữ số → ngăn cách nghìn
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      s = s.replace(/,/g, "");
    } else {
      s = s.replace(",", ".");
    }
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length > 2 || parts[parts.length - 1].length === 3) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Chuẩn hóa ngày về 'YYYY-MM-DD', nhận DD/MM/YYYY hoặc Date; null nếu sai. */
export function normalizeDate(raw: string | Date | undefined | null): string | null {
  if (raw === undefined || raw === null) return null;

  if (raw instanceof Date) {
    const d = dayjs(raw);
    return d.isValid() ? d.format("YYYY-MM-DD") : null;
  }

  const s = String(raw).trim();
  if (s === "") return null;

  const d = dayjs(s, ["DD/MM/YYYY", "D/M/YYYY", "D/MM/YYYY", "DD/M/YYYY"], true);
  return d.isValid() ? d.format("YYYY-MM-DD") : null;
}
