import { useManHinh } from "./useManHinh";

/** Điện thoại (< 768px). Ngưỡng lấy từ `config/manHinh` — xem `useManHinh`. */
export function useIsMobile() {
  return useManHinh() === "mobile";
}
