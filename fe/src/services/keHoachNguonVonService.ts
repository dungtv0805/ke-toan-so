import { ServiceBase } from './base/service-base';
import { chuanHoaThang } from './keHoachBanHangService';
import type { LoaiKeHoach } from './keHoachService';
import type { KeHoachBangBatchKetQua } from './keHoachDongTienService';

/** Hai nhóm nguồn vốn tối thiểu theo tài liệu — cố định, không có danh mục. */
export type NhomNguonVon = 'NO_PHAI_TRA' | 'VON_CHU_SO_HUU';

export const NHOM_NGUON_VON_OPTIONS: {
  value: NhomNguonVon;
  label: string;
}[] = [
  { value: 'NO_PHAI_TRA', label: 'NỢ PHẢI TRẢ' },
  { value: 'VON_CHU_SO_HUU', label: 'VỐN CHỦ SỞ HỮU' },
];

export const nhanNhomNguonVon = (nhom: NhomNguonVon): string =>
  NHOM_NGUON_VON_OPTIONS.find((n) => n.value === nhom)?.label ?? nhom;

export interface KeHoachNguonVonDong {
  id: string;
  loaiKeHoach: LoaiKeHoach;
  nam: number;
  nhom: NhomNguonVon;
  maChiTieu: string;
  tenChiTieu?: string;
  /** Số dư tại 01/01 — gốc để cộng ra số dư từng kỳ. */
  soDuDauNam: number;
  /** Cột "Giá trị/Mục tiêu" — mục tiêu biến động cả năm. */
  giaTriMucTieu: number;
  /** Đúng 12 phần tử, chỉ số 0 là T1. Là BIẾN ĐỘNG, cho phép âm. */
  thang: number[];
  /** Cột DIỄN GIẢI. */
  ghiChu?: string;
}

export type KeHoachNguonVonPayload = Omit<KeHoachNguonVonDong, 'id'>;

export type KeHoachNguonVonPatch = Partial<
  Omit<KeHoachNguonVonPayload, 'loaiKeHoach' | 'nam'>
>;

export interface KeHoachNguonVonBatch {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  them: Omit<KeHoachNguonVonPayload, 'nam' | 'loaiKeHoach'>[];
  sua: (KeHoachNguonVonPatch & { id: string })[];
}

interface DongResponse extends Omit<KeHoachNguonVonDong, 'id' | 'thang'> {
  _id?: string;
  id?: string;
  thang?: number[];
}

class KeHoachNguonVonService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach-nguon-von' });
  }

  private map(item: DongResponse): KeHoachNguonVonDong {
    return {
      ...item,
      id: item.id ?? item._id ?? '',
      thang: chuanHoaThang(item.thang),
    } as KeHoachNguonVonDong;
  }

  async layTheoNam(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<KeHoachNguonVonDong[]> {
    const res = await this.get<DongResponse[]>({
      params: { nam, loaiKeHoach },
    });
    return (res ?? []).map((d) => this.map(d));
  }

  async luuHangLoat(
    batch: KeHoachNguonVonBatch,
  ): Promise<KeHoachBangBatchKetQua> {
    return this.post<KeHoachBangBatchKetQua>(batch, { endpoint: '/batch' });
  }

  async xoa(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const keHoachNguonVonService = new KeHoachNguonVonService();
