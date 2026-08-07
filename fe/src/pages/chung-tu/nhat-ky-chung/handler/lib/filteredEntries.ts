import {
  nhatKyChungService,
  GetEntriesParams,
} from "@/services/nhatKyChungService";
import { NhatKyChung } from "@/types";

type GetState = (key: string) => unknown;

/**
 * Dựng params từ bộ lọc đang áp trên màn hình — dùng chung cho Xuất Excel và In,
 * để bản xuất/bản in luôn khớp đúng cái người dùng đang xem.
 */
export function buildFilterParams(getState: GetState): GetEntriesParams {
  const searchText = (getState("searchText") as string) || "";
  const dateRange = getState("dateRange") as
    | [{ format: (f: string) => string }, { format: (f: string) => string }]
    | null;
  const filterLoaiChungTu = getState("filterLoaiChungTu") as string | undefined;
  const filterAccount = getState("filterAccount") as string | undefined;
  const filterTaiKhoanCo = getState("filterTaiKhoanCo") as string | undefined;
  const filterDoiTuong = getState("filterDoiTuong") as string | undefined;
  const filterDuAn = getState("filterDuAn") as string | undefined;
  const filterBoPhan = getState("filterBoPhan") as string | undefined;

  const params: GetEntriesParams = {};
  if (searchText) params.search = searchText;
  if (dateRange && dateRange[0] && dateRange[1]) {
    params.startDate = dateRange[0].format("YYYY-MM-DD");
    params.endDate = dateRange[1].format("YYYY-MM-DD");
  }
  if (filterLoaiChungTu)
    params.loai = filterLoaiChungTu as GetEntriesParams["loai"];
  if (filterAccount) params.taiKhoanNo = filterAccount;
  if (filterTaiKhoanCo) params.taiKhoanCo = filterTaiKhoanCo;
  if (filterDoiTuong) params.doiTuong = filterDoiTuong;
  if (filterDuAn) params.duAn = filterDuAn;
  if (filterBoPhan) params.boPhan = filterBoPhan;

  return params;
}

/** Lấy TOÀN BỘ bút toán khớp bộ lọc (API phân trang → gọi lần lượt từng trang). */
export async function fetchAllEntries(
  params: GetEntriesParams,
): Promise<NhatKyChung[]> {
  const PAGE_SIZE = 100;
  const all: NhatKyChung[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await nhatKyChungService.getEntries({
      ...params,
      page: currentPage,
      limit: PAGE_SIZE,
    });
    all.push(...response.data);
    totalPages = response.meta.totalPages;
    currentPage++;
  } while (currentPage <= totalPages);

  return all;
}
