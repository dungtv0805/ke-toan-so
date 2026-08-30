import {
  PHIEN_BAN_MAC_DINH,
  type BangKeHoachNguon,
  type DanhMuc,
  type DanhMucTaiKhoan,
  type KeHoachDong,
  type LoaiKeHoach,
} from '@app/entities';

const SO_THANG = 12;

/** Cặp tài khoản dùng để sinh bút toán cho một dòng nguồn. */
export interface CapTaiKhoan {
  taiKhoanNo: DanhMucTaiKhoan;
  taiKhoanCo: DanhMucTaiKhoan;
}

/** Một dòng bảng chi tiết, quy về hình tối thiểu mà engine cần. */
export interface NguonDongKeHoach {
  nguonLoai: BangKeHoachNguon;
  nguonId: string;
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  /** Cột DIỄN GIẢI. Rỗng thì nội dung bút toán lấy `tenMacDinh`. */
  ghiChu?: string;
  /** Tên cấp con của dòng, dùng khi không có diễn giải. */
  tenMacDinh: string;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  /** Khoá phụ để chọn cấu hình: 'THU'/'CHI' hoặc nhóm nguồn vốn. */
  phanLoai?: string;
  /** Các chiều phân tích gắn kèm mỗi bút toán (sản phẩm, bộ phận, dòng tiền…). */
  danhMuc?: DanhMuc;
}

/**
 * Sinh các bút toán kế hoạch của MỘT dòng nguồn — tối đa 12, mỗi tháng một.
 *
 * Thuần, không đụng kho: nhờ vậy quy tắc sinh kiểm được bằng unit test, còn
 * phần xoá-rồi-chèn-lại nằm gọn ở service.
 *
 * Tháng bằng 0 không sinh bút toán — kế hoạch phân bổ vào vài tháng là chuyện
 * thường, sinh đủ 12 dòng rỗng chỉ làm nặng báo cáo.
 */
export function sinhButToanKeHoach(
  nguon: NguonDongKeHoach,
  cap: CapTaiKhoan | undefined,
  nguoiTaoId: string,
): Partial<KeHoachDong>[] {
  // Chưa cấu hình định khoản cho bảng này thì không đoán bừa cặp Nợ/Có.
  if (!cap) return [];

  const ket: Partial<KeHoachDong>[] = [];
  for (let i = 0; i < SO_THANG; i += 1) {
    const soTien = Number(nguon.thang?.[i]) || 0;
    if (soTien === 0) continue;

    ket.push({
      loaiKeHoach: nguon.loaiKeHoach,
      phienBan: PHIEN_BAN_MAC_DINH,
      // Ngày 01 tháng tương ứng, theo UTC: `kqkd.helper` đọc tháng bằng
      // getUTCMonth(), đọc theo giờ VN sẽ đẩy 01/01 về tháng 12 năm trước.
      ngay: new Date(Date.UTC(nguon.nam, i, 1)),
      soTien,
      noiDung: nguon.ghiChu?.trim() || nguon.tenMacDinh,
      nguoiTaoId,
      nguonLoai: nguon.nguonLoai,
      nguonId: nguon.nguonId,
      danhMuc: {
        ...(nguon.danhMuc ?? {}),
        taiKhoanNo: cap.taiKhoanNo,
        taiKhoanCo: cap.taiKhoanCo,
      },
    });
  }
  return ket;
}

/** Khoá tra cứu cấu hình: bảng, kèm chiều phụ nếu bảng có nhiều chiều. */
export const khoaDinhKhoan = (bang: string, phanLoai?: string): string =>
  phanLoai ? `${bang}:${phanLoai}` : bang;

export interface DinhKhoanMacDinh {
  bang: BangKeHoachNguon;
  phanLoai?: string;
  taiKhoanNo: DanhMucTaiKhoan;
  taiKhoanCo: DanhMucTaiKhoan;
}

const tk = (ma: string, ten: string): DanhMucTaiKhoan => ({
  ma,
  ten,
  loai: '',
  nhom: '',
});

/**
 * Bộ định khoản mặc định — GIẢ ĐỊNH KỸ THUẬT để hệ thống chạy được ngay,
 * CHƯA được nghiệp vụ xác nhận.
 *
 * Tài liệu yêu cầu không quy định dòng kế hoạch sinh ra cặp Nợ/Có nào. Mỗi công
 * ty chỉnh lại ở màn hình cấu hình; sửa ở đây chỉ đổi giá trị khởi tạo.
 */
export const DINH_KHOAN_MAC_DINH: DinhKhoanMacDinh[] = [
  {
    bang: 'BAN_HANG',
    taiKhoanNo: tk('131', 'Phải thu của khách hàng'),
    taiKhoanCo: tk('511', 'Doanh thu bán hàng và cung cấp dịch vụ'),
  },
  {
    bang: 'NHAN_SU',
    taiKhoanNo: tk('642', 'Chi phí quản lý doanh nghiệp'),
    taiKhoanCo: tk('334', 'Phải trả người lao động'),
  },
  {
    bang: 'TAI_SAN',
    taiKhoanNo: tk('211', 'Tài sản cố định hữu hình'),
    taiKhoanCo: tk('331', 'Phải trả cho người bán'),
  },
  {
    bang: 'DONG_TIEN',
    phanLoai: 'THU',
    taiKhoanNo: tk('112', 'Tiền gửi ngân hàng'),
    taiKhoanCo: tk('131', 'Phải thu của khách hàng'),
  },
  {
    bang: 'DONG_TIEN',
    phanLoai: 'CHI',
    taiKhoanNo: tk('331', 'Phải trả cho người bán'),
    taiKhoanCo: tk('112', 'Tiền gửi ngân hàng'),
  },
  {
    bang: 'NGUON_VON',
    phanLoai: 'NO_PHAI_TRA',
    taiKhoanNo: tk('331', 'Phải trả cho người bán'),
    taiKhoanCo: tk('341', 'Vay và nợ thuê tài chính'),
  },
  {
    bang: 'NGUON_VON',
    phanLoai: 'VON_CHU_SO_HUU',
    taiKhoanNo: tk('112', 'Tiền gửi ngân hàng'),
    taiKhoanCo: tk('411', 'Vốn đầu tư của chủ sở hữu'),
  },
];
