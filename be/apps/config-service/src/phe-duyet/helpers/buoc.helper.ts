import { BadRequestException } from '@nestjs/common';
import type { BuocCauHinh, BuocPheDuyet } from '@app/entities';

/**
 * Logic tuần tự của luồng phê duyệt — mục 5, 9, 11.
 *
 * Toàn bộ hàm ở đây là hàm thuần: nhận mảng bước, trả mảng bước MỚI. Không đọc
 * đồng hồ hệ thống (thời điểm luôn truyền vào) và không chạm database. Đây là
 * chỗ chứa mọi quy tắc dễ sai của tài liệu, nên phải test được mà không cần
 * dựng Mongo.
 */

export interface ThaoTacBuoc {
  thuTu: number;
  nguoiXuLyId?: string;
  nguoiXuLyTen?: string;
  yKien?: string;
  thoiDiem: Date;
}

export interface KetQuaApDung {
  buoc: BuocPheDuyet[];
  /** `thuTu` của bước vừa được mở. 0 = không còn bước nào chờ. */
  buocKeTiep: number;
  /** Đã duyệt xong mọi bước BẮT BUỘC — mục 5 bước 5. */
  hoanThanh: boolean;
}

/** Thời gian xử lý một vị trí — mục 9. Thiếu mốc thì trả undefined, không đoán. */
export function tinhThoiGianXuLyGiay(
  batDauCho?: Date,
  thoiDiemXuLy?: Date,
): number | undefined {
  if (!batDauCho || !thoiDiemXuLy) return undefined;
  return Math.round(
    (new Date(thoiDiemXuLy).getTime() - new Date(batDauCho).getTime()) / 1000,
  );
}

/** Tổng thời gian phê duyệt — mục 9: hoàn thành cấp cuối trừ lần gửi duyệt đầu tiên. */
export function tongThoiGianGiay(
  ngayGuiDuyet?: Date,
  ngayHoanThanh?: Date,
): number | undefined {
  return tinhThoiGianXuLyGiay(ngayGuiDuyet, ngayHoanThanh);
}

/** Bước đang đến lượt, nếu có. */
export function buocDangCho(buoc: BuocPheDuyet[]): BuocPheDuyet | undefined {
  return buoc.find((b) => b.trangThai === 'DANG_CHO');
}

/**
 * Sinh danh sách bước từ cấu hình loại nghiệp vụ — mục 5 bước 2 và 3.
 *
 * CHỈ bước đầu được mốc `batDauCho`. Mốc của cấp sau ghi khi cấp trước duyệt
 * xong (mục 5 bước 4) — ghi sẵn từ đây là thời gian chờ của cấp 2 bị tính cả
 * quãng cấp 1 còn đang cầm hồ sơ, báo cáo mục 15 sẽ đổ lỗi nhầm người.
 */
export function sinhBuocTuCauHinh(
  cauHinh: BuocCauHinh[],
  thoiDiemGui: Date,
  phienBan: number,
): BuocPheDuyet[] {
  return [...cauHinh]
    .sort((a, b) => a.thuTu - b.thuTu)
    .map((c, i) => ({
      thuTu: c.thuTu,
      viTriTen: c.viTriTen,
      batBuoc: c.batBuoc !== false,
      trangThai: i === 0 ? ('DANG_CHO' as const) : ('CHUA_DEN_LUOT' as const),
      ...(i === 0 ? { batDauCho: thoiDiemGui } : {}),
      phienBan,
    }));
}

function timBuocDangCho(buoc: BuocPheDuyet[], thuTu: number): number {
  const i = buoc.findIndex((b) => b.thuTu === thuTu);
  if (i < 0) {
    throw new BadRequestException(`Không có bước phê duyệt thứ ${thuTu}`);
  }
  if (buoc[i].trangThai !== 'DANG_CHO') {
    // Mục 6: cấp sau không được xử lý khi cấp trước chưa xong. Bước đã duyệt
    // rồi cũng rơi vào đây — chặn bấm hai lần khi mạng chậm.
    throw new BadRequestException(
      `Bước phê duyệt thứ ${thuTu} chưa đến lượt xử lý`,
    );
  }
  return i;
}

function conBuocBatBuocChuaDuyet(buoc: BuocPheDuyet[]): boolean {
  return buoc.some((b) => b.batBuoc && b.trangThai !== 'DA_DUYET');
}

/**
 * Duyệt một bước — mục 5 bước 4.
 *
 * Ghi người duyệt + thời điểm xử lý TRƯỚC, rồi mới mở bước kế và ghi mốc bắt
 * đầu chờ của nó. Đúng thứ tự tài liệu mô tả.
 */
export function apDungDuyet(
  buoc: BuocPheDuyet[],
  thaoTac: ThaoTacBuoc,
): KetQuaApDung {
  const i = timBuocDangCho(buoc, thaoTac.thuTu);
  const ra = buoc.map((b) => ({ ...b }));

  ra[i] = {
    ...ra[i],
    trangThai: 'DA_DUYET',
    nguoiXuLyId: thaoTac.nguoiXuLyId,
    nguoiXuLyTen: thaoTac.nguoiXuLyTen,
    yKien: thaoTac.yKien,
    thoiDiemXuLy: thaoTac.thoiDiem,
    thoiGianXuLyGiay: tinhThoiGianXuLyGiay(ra[i].batDauCho, thaoTac.thoiDiem),
  };

  let buocKeTiep = 0;
  if (i + 1 < ra.length) {
    ra[i + 1] = {
      ...ra[i + 1],
      trangThai: 'DANG_CHO',
      batDauCho: thaoTac.thoiDiem,
    };
    buocKeTiep = ra[i + 1].thuTu;
  }

  return { buoc: ra, buocKeTiep, hoanThanh: !conBuocBatBuocChuaDuyet(ra) };
}

function dungLuong(
  buoc: BuocPheDuyet[],
  thaoTac: ThaoTacBuoc,
  trangThai: 'TRA_LAI' | 'TU_CHOI',
): KetQuaApDung {
  const i = timBuocDangCho(buoc, thaoTac.thuTu);
  const ra = buoc.map((b) => ({ ...b }));

  ra[i] = {
    ...ra[i],
    trangThai,
    nguoiXuLyId: thaoTac.nguoiXuLyId,
    nguoiXuLyTen: thaoTac.nguoiXuLyTen,
    yKien: thaoTac.yKien,
    thoiDiemXuLy: thaoTac.thoiDiem,
    thoiGianXuLyGiay: tinhThoiGianXuLyGiay(ra[i].batDauCho, thaoTac.thoiDiem),
  };

  // Không mở bước kế: cấp sau không bao giờ được thấy nghiệp vụ bị trả lại.
  return { buoc: ra, buocKeTiep: 0, hoanThanh: false };
}

/** Yêu cầu bổ sung / trả lại — mục 7. */
export function apDungTraLai(
  buoc: BuocPheDuyet[],
  thaoTac: ThaoTacBuoc,
): KetQuaApDung {
  return dungLuong(buoc, thaoTac, 'TRA_LAI');
}

/** Từ chối — mục 7. */
export function apDungTuChoi(
  buoc: BuocPheDuyet[],
  thaoTac: ThaoTacBuoc,
): KetQuaApDung {
  return dungLuong(buoc, thaoTac, 'TU_CHOI');
}

/**
 * Đặt lại luồng về cấp 1 — mục 11.
 *
 * Dùng khi nội dung trọng yếu bị sửa sau khi đã có cấp duyệt, hoặc khi người
 * lập gửi lại một nghiệp vụ bị trả lại. Xoá sạch người xử lý và mốc thời gian
 * cũ: "không được giữ phê duyệt cũ cho nội dung đã thay đổi". Vết duyệt cũ
 * không mất — nó nằm ở bảng `lich_su_phe_duyet`, bảng chỉ ghi thêm.
 */
export function datLaiTuDau(
  buoc: BuocPheDuyet[],
  thoiDiem: Date,
  phienBanMoi: number,
): BuocPheDuyet[] {
  return sinhBuocTuCauHinh(
    buoc.map((b) => ({
      thuTu: b.thuTu,
      viTriTen: b.viTriTen,
      batBuoc: b.batBuoc,
    })),
    thoiDiem,
    phienBanMoi,
  );
}
