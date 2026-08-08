import {
  nhatKyChungService,
  GetEntriesParams,
} from "@/services/nhatKyChungService";
import { NhatKyChung } from "@/types";
import { NKC_FILTER_PARAMS, NKC_FILTER_STATE_KEYS } from "./nkcFilters";

type GetState = (key: string) => unknown;

/**
 * Dựng params từ bộ lọc đang áp trên màn hình — dùng chung cho danh sách bút toán,
 * các báo cáo tổng hợp, Xuất Excel và In, để mọi thứ luôn khớp đúng cái người dùng
 * đang xem.
 */
export function buildFilterParams(getState: GetState): GetEntriesParams {
  const params: Record<string, string> = {};

  const searchText = (getState("searchText") as string) || "";
  if (searchText) params.search = searchText;

  const dateRange = getState("dateRange") as
    | [{ format: (f: string) => string }, { format: (f: string) => string }]
    | null;
  if (dateRange && dateRange[0] && dateRange[1]) {
    params.startDate = dateRange[0].format("YYYY-MM-DD");
    params.endDate = dateRange[1].format("YYYY-MM-DD");
  }

  for (const stateKey of NKC_FILTER_STATE_KEYS) {
    const value = getState(stateKey) as string | undefined;
    if (value) params[NKC_FILTER_PARAMS[stateKey]] = value;
  }

  return params as GetEntriesParams;
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
