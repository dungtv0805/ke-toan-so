import { ServiceBase } from './base/service-base';

export type BangKeHoachNguon =
  | 'BAN_HANG'
  | 'NHAN_SU'
  | 'DONG_TIEN'
  | 'TAI_SAN'
  | 'NGUON_VON';

export interface TaiKhoanDinhKhoan {
  ma: string;
  ten: string;
  loai?: string;
  nhom?: string;
}

export interface CauHinhDinhKhoan {
  bang: BangKeHoachNguon;
  /** 'THU'/'CHI' cho Dòng tiền, nhóm nguồn vốn cho Nguồn vốn; bảng khác bỏ trống. */
  phanLoai?: string;
  taiKhoanNo: TaiKhoanDinhKhoan;
  taiKhoanCo: TaiKhoanDinhKhoan;
}

/** Nhãn hiển thị của từng dòng cấu hình, theo thứ tự bảng hiện trên màn hình. */
export const NHAN_DINH_KHOAN: { khoa: string; nhan: string }[] = [
  { khoa: 'BAN_HANG', nhan: 'Bán hàng' },
  { khoa: 'NHAN_SU', nhan: 'Nhân sự' },
  { khoa: 'TAI_SAN', nhan: 'Tài sản' },
  { khoa: 'DONG_TIEN:THU', nhan: 'Dòng tiền — Thu' },
  { khoa: 'DONG_TIEN:CHI', nhan: 'Dòng tiền — Chi' },
  { khoa: 'NGUON_VON:NO_PHAI_TRA', nhan: 'Nguồn vốn — Nợ phải trả' },
  { khoa: 'NGUON_VON:VON_CHU_SO_HUU', nhan: 'Nguồn vốn — Vốn chủ sở hữu' },
];

export const khoaDinhKhoan = (
  bang: string,
  phanLoai?: string | null,
): string => (phanLoai ? `${bang}:${phanLoai}` : bang);

class DinhKhoanKeHoachService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach-dinh-khoan' });
  }

  /** Lần đọc đầu tiên BE tự seed bộ mặc định cho công ty. */
  async lay(): Promise<CauHinhDinhKhoan[]> {
    return (await this.get<CauHinhDinhKhoan[]>()) ?? [];
  }

  async luu(items: CauHinhDinhKhoan[]): Promise<CauHinhDinhKhoan[]> {
    return (await this.put<CauHinhDinhKhoan[]>({ items })) ?? [];
  }
}

export const dinhKhoanKeHoachService = new DinhKhoanKeHoachService();
