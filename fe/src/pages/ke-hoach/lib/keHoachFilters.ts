import type { Dayjs } from "dayjs";
import type { KeHoachFilters, LoaiKeHoach } from "@/services/keHoachService";

/**
 * Gom bộ lọc hiện hành từ state — dùng chung cho lưới nhập liệu và báo cáo so sánh
 * để hai bên không bao giờ lệch điều kiện.
 */
export function buildFilters(get: (key: string) => unknown): KeHoachFilters {
  const range = get("dateRange") as [Dayjs, Dayjs] | undefined;
  const phienBan = get("phienBan") as string | undefined;
  const search = get("searchText") as string | undefined;
  return {
    loaiKeHoach: (get("loaiKeHoach") as LoaiKeHoach) || "KE_HOACH",
    ...(phienBan ? { phienBan } : {}),
    ...(search ? { search } : {}),
    ...(range?.[0] ? { startDate: range[0].format("YYYY-MM-DD") } : {}),
    ...(range?.[1] ? { endDate: range[1].format("YYYY-MM-DD") } : {}),
  };
}
