import type { LichSuPheDuyet } from '@app/entities';

/**
 * Báo cáo tốc độ xử lý — mục 15.
 *
 * Nguồn duy nhất là bảng `lich_su_phe_duyet`: mục 9 đã bắt mỗi bước lưu cả mốc
 * bắt đầu chờ lẫn mốc xử lý, và `thoiGianXuLyGiay` được chốt sẵn lúc ghi nên ở
 * đây chỉ còn gom nhóm.
 */

/** Ngưỡng "quá thời gian tiêu chuẩn" — 24 giờ. Chưa có cấu hình theo công ty. */
export const NGUONG_QUA_HAN_GIAY = 24 * 60 * 60;

export interface DongTocDo {
  ten: string;
  soLuong: number;
  tongGiay: number;
  trungBinhGiay: number;
  soQuaHan: number;
}

export interface KetQuaTocDo {
  theoViTri: DongTocDo[];
  theoNguoiDung: DongTocDo[];
  theoLoaiNghiepVu: DongTocDo[];
  /** Vị trí có thời gian xử lý trung bình cao nhất. */
  diemNghen?: string;
}

function gomTheo(
  ds: LichSuPheDuyet[],
  khoa: (d: LichSuPheDuyet) => string | undefined,
): DongTocDo[] {
  const map = new Map<string, DongTocDo>();

  for (const d of ds) {
    const ten = khoa(d);
    // Thời gian âm = đồng hồ lệch, không phải dữ liệu thật.
    if (!ten || d.thoiGianXuLyGiay === undefined || d.thoiGianXuLyGiay < 0) {
      continue;
    }

    const dong = map.get(ten) ?? {
      ten,
      soLuong: 0,
      tongGiay: 0,
      trungBinhGiay: 0,
      soQuaHan: 0,
    };
    dong.soLuong += 1;
    dong.tongGiay += d.thoiGianXuLyGiay;
    if (d.thoiGianXuLyGiay > NGUONG_QUA_HAN_GIAY) dong.soQuaHan += 1;
    map.set(ten, dong);
  }

  return [...map.values()]
    .map((d) => ({ ...d, trungBinhGiay: Math.round(d.tongGiay / d.soLuong) }))
    .sort((a, b) => b.trungBinhGiay - a.trungBinhGiay);
}

export function gomTocDo(ds: LichSuPheDuyet[]): KetQuaTocDo {
  const theoViTri = gomTheo(ds, (d) => d.viTriTen);
  return {
    theoViTri,
    theoNguoiDung: gomTheo(ds, (d) => d.nguoiXuLyTen ?? d.nguoiXuLyId),
    theoLoaiNghiepVu: gomTheo(ds, (d) => d.loaiNghiepVuMa),
    diemNghen: theoViTri[0]?.ten,
  };
}
