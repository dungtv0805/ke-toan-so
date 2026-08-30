import { ServiceBase } from './base/service-base';
import {
  chuanHoaThang,
  type MucDanhMucKeHoach,
} from './keHoachBanHangService';
import type { LoaiKeHoach } from './keHoachService';

/**
 * Chiều của một dòng tiền kế hoạch — do người lập chọn.
 *
 * KHÔNG suy được từ danh mục: `DongTien.loai` là Kinh doanh / Đầu tư / Tài chính
 * (phục vụ báo cáo lưu chuyển tiền tệ), không phải Thu / Chi.
 */
export type ChieuDongTien = 'THU' | 'CHI';

export const CHIEU_OPTIONS: { value: ChieuDongTien; label: string }[] = [
  { value: 'THU', label: 'Thu' },
  { value: 'CHI', label: 'Chi' },
];

export interface KeHoachDongTienDong {
  id: string;
  loaiKeHoach: LoaiKeHoach;
  nam: number;
  nhomDongTien: MucDanhMucKeHoach;
  dongTien: MucDanhMucKeHoach;
  chieu: ChieuDongTien;
  /** Cột "Giá trị/Mục tiêu". */
  giaTriMucTieu: number;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  /** Cột DIỄN GIẢI. */
  ghiChu?: string;
}

export type KeHoachDongTienPayload = Omit<KeHoachDongTienDong, 'id'>;

/** Sửa được mọi thứ trừ loại, năm và dòng tiền — ba trường đó là khoá chống trùng. */
export type KeHoachDongTienPatch = Partial<
  Omit<KeHoachDongTienPayload, 'loaiKeHoach' | 'nam' | 'dongTien'>
>;

export interface KeHoachDongTienBatch {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  them: Omit<KeHoachDongTienPayload, 'nam' | 'loaiKeHoach'>[];
  sua: (KeHoachDongTienPatch & { id: string })[];
}

export interface KeHoachBangBatchKetQua {
  daThem: number;
  daSua: number;
}

interface DongResponse extends Omit<KeHoachDongTienDong, 'id' | 'thang'> {
  _id?: string;
  id?: string;
  thang?: number[];
}

class KeHoachDongTienService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach-dong-tien' });
  }

  private map(item: DongResponse): KeHoachDongTienDong {
    return {
      ...item,
      id: item.id ?? item._id ?? '',
      thang: chuanHoaThang(item.thang),
    } as KeHoachDongTienDong;
  }

  async layTheoNam(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<KeHoachDongTienDong[]> {
    const res = await this.get<DongResponse[]>({
      params: { nam, loaiKeHoach },
    });
    return (res ?? []).map((d) => this.map(d));
  }

  async luuHangLoat(
    batch: KeHoachDongTienBatch,
  ): Promise<KeHoachBangBatchKetQua> {
    return this.post<KeHoachBangBatchKetQua>(batch, { endpoint: '/batch' });
  }

  async xoa(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }

  /** Tồn quỹ đầu năm — chưa khai thì BE trả 0. */
  async layTonDau(nam: number, loaiKeHoach: LoaiKeHoach): Promise<number> {
    const res = await this.get<{ soTien?: number }>({
      endpoint: '/ton-dau',
      params: { nam, loaiKeHoach },
    });
    return Number(res?.soTien) || 0;
  }

  async luuTonDau(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
    soTien: number,
  ): Promise<number> {
    const res = await this.put<{ soTien?: number }>(
      { nam, loaiKeHoach, soTien },
      { endpoint: '/ton-dau' },
    );
    return Number(res?.soTien) || 0;
  }
}

export const keHoachDongTienService = new KeHoachDongTienService();
