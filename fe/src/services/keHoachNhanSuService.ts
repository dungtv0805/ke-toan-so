import { ServiceBase } from './base/service-base';
import {
  chuanHoaThang,
  type MucDanhMucKeHoach,
} from './keHoachBanHangService';

/** Sáu loại chi phí nhân sự — cố định, khớp cột LCHINH…THUONGCN của sheet. */
export interface ChiPhiNhanSu {
  luongChinh: number;
  luongKpi: number;
  thuongDoanhSo: number;
  baoHiem: number;
  daoTao: number;
  thuongCongNhan: number;
}

/** Sáu cột chi phí, đúng thứ tự sheet. */
export const CHI_PHI_NHAN_SU_COLS: { key: keyof ChiPhiNhanSu; nhan: string }[] = [
  { key: 'luongChinh', nhan: 'Lương chính' },
  { key: 'luongKpi', nhan: 'Lương KPI' },
  { key: 'thuongDoanhSo', nhan: 'Thưởng doanh số' },
  { key: 'baoHiem', nhan: 'Bảo hiểm' },
  { key: 'daoTao', nhan: 'Đào tạo' },
  { key: 'thuongCongNhan', nhan: 'Thưởng công nhân' },
];

export const chiPhiRong = (): ChiPhiNhanSu => ({
  luongChinh: 0,
  luongKpi: 0,
  thuongDoanhSo: 0,
  baoHiem: 0,
  daoTao: 0,
  thuongCongNhan: 0,
});

/** Bù 0 cho khoá thiếu — dòng cũ có thể chưa có đủ 6 loại chi phí. */
export const chuanHoaChiPhi = (chiPhi?: Partial<ChiPhiNhanSu>): ChiPhiNhanSu => {
  const kq = chiPhiRong();
  for (const { key } of CHI_PHI_NHAN_SU_COLS) {
    kq[key] = Number(chiPhi?.[key]) || 0;
  }
  return kq;
};

/** CỘNG của một dòng = tổng 6 loại chi phí. */
export const tongChiPhi = (chiPhi: ChiPhiNhanSu): number =>
  CHI_PHI_NHAN_SU_COLS.reduce((s, c) => s + (Number(chiPhi[c.key]) || 0), 0);

export interface KeHoachNhanSuDong {
  id: string;
  nam: number;
  boPhan: MucDanhMucKeHoach;
  maViTri: string;
  tenChucVu?: string;
  chiPhi: ChiPhiNhanSu;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  ghiChu?: string;
}

export type KeHoachNhanSuPayload = Omit<KeHoachNhanSuDong, 'id'>;

/** Sửa được cả bộ phận lẫn mã vị trí — chỉ khoá năm. */
export type KeHoachNhanSuPatch = Partial<Omit<KeHoachNhanSuPayload, 'nam'>>;

interface DongResponse
  extends Omit<KeHoachNhanSuDong, 'id' | 'thang' | 'chiPhi'> {
  _id?: string;
  id?: string;
  thang?: number[];
  chiPhi?: Partial<ChiPhiNhanSu>;
}

class KeHoachNhanSuService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach-nhan-su' });
  }

  private map(item: DongResponse): KeHoachNhanSuDong {
    return {
      ...item,
      id: item.id ?? item._id ?? '',
      thang: chuanHoaThang(item.thang),
      chiPhi: chuanHoaChiPhi(item.chiPhi),
    } as KeHoachNhanSuDong;
  }

  async layTheoNam(nam: number): Promise<KeHoachNhanSuDong[]> {
    const res = await this.get<DongResponse[]>({ params: { nam } });
    return (res ?? []).map((d) => this.map(d));
  }

  async taoMoi(payload: KeHoachNhanSuPayload): Promise<KeHoachNhanSuDong> {
    return this.map(await this.post<DongResponse>(payload));
  }

  async capNhat(
    id: string,
    payload: KeHoachNhanSuPatch,
  ): Promise<KeHoachNhanSuDong> {
    return this.map(
      await this.patch<DongResponse>(payload, { endpoint: `/${id}` }),
    );
  }

  async xoa(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const keHoachNhanSuService = new KeHoachNhanSuService();
