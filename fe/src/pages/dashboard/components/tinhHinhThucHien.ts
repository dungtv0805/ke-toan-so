import type { SeriesRow } from "@/services/keHoachService";

export interface MucSoSanh {
  keHoach: number;
  thucHien: number;
  chenhLech: number;
  /** % thực hiện trên kế hoạch; 100 khi cả hai bằng 0, 0 khi phát sinh ngoài kế hoạch. */
  tyLeDat: number;
  chuaCoKeHoach: boolean;
}

export interface TinhHinhThucHien {
  doanhThu: MucSoSanh;
  chiPhi: MucSoSanh;
  loiNhuan: MucSoSanh;
}

const cong = (series: SeriesRow[], key: keyof Omit<SeriesRow, "thang">) =>
  series.reduce((sum, p) => sum + (p[key] || 0), 0);

const so = (keHoach: number, thucHien: number): MucSoSanh => ({
  keHoach,
  thucHien,
  chenhLech: thucHien - keHoach,
  // Không chia cho 0. Kế hoạch 0 mà thực hiện cũng 0 thì chênh lệch bằng 0 —
  // bám đúng kế hoạch, tức 100%; chỉ khi có phát sinh ngoài kế hoạch mới về 0%.
  // Trị tuyệt đối để lợi nhuận kế hoạch âm vẫn ra tỷ lệ có nghĩa.
  tyLeDat:
    keHoach === 0
      ? thucHien === 0
        ? 100
        : 0
      : (thucHien / Math.abs(keHoach)) * 100 * Math.sign(keHoach),
  chuaCoKeHoach: keHoach === 0,
});

/**
 * Gộp chuỗi KẾ HOẠCH và chuỗi THỰC HIỆN (cùng shape `pnl-series`) thành ba mục
 * doanh thu / chi phí / lợi nhuận cho 3 gauge "Tình hình thực hiện".
 */
export function tinhTinhHinhThucHien(
  keHoach: SeriesRow[],
  thucHien: SeriesRow[],
): TinhHinhThucHien {
  return {
    doanhThu: so(cong(keHoach, "doanhThu"), cong(thucHien, "doanhThu")),
    chiPhi: so(cong(keHoach, "chiPhi"), cong(thucHien, "chiPhi")),
    loiNhuan: so(cong(keHoach, "loiNhuan"), cong(thucHien, "loiNhuan")),
  };
}
