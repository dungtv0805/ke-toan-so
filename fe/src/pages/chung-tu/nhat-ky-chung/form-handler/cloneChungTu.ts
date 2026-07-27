import dayjs, { Dayjs } from "dayjs";
import { v4 as uuidv4 } from "uuid";
import type { ChungTuHeader, ChungTuChiTiet } from "./sub-handler/init/init.state";

export interface CloneChungTuResult {
  header: ChungTuHeader;
  chiTietList: ChungTuChiTiet[];
}

/**
 * Chuyển dữ liệu chứng từ vừa load thành bản nháp cho chứng từ MỚI (nhân bản):
 * - bỏ số phiếu và id từng dòng để backend sinh mới khi createBatch
 * - đặt ngày phát sinh + ngày ghi sổ = ngày hiện tại
 * - giữ nguyên hạch toán, số tiền, nội dung và toàn bộ snapshot danh mục
 */
export function buildCloneFromLoaded(
  header: ChungTuHeader,
  chiTietList: ChungTuChiTiet[],
  today: Dayjs = dayjs(),
  genKey: () => string = uuidv4
): CloneChungTuResult {
  const { soPhieu: _soPhieu, ...restHeader } = header;

  return {
    header: { ...restHeader, ngay: today, ngayGhiSo: today },
    chiTietList: chiTietList.map(({ id: _id, ...chiTiet }) => ({
      ...chiTiet,
      key: genKey(),
    })),
  };
}
