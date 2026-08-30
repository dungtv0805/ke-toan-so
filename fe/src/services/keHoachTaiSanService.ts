import { ServiceBase } from './base/service-base';
import {
  chuanHoaThang,
  type MucDanhMucKeHoach,
} from './keHoachBanHangService';
import type { LoaiKeHoach } from './keHoachService';
import type { KeHoachBangBatchKetQua } from './keHoachDongTienService';

export interface KeHoachTaiSanDong {
  id: string;
  loaiKeHoach: LoaiKeHoach;
  nam: number;
  /** Cấp cha — cột hiển thị mang nhãn "Nơi sử dụng". */
  boPhan: MucDanhMucKeHoach;
  /** Gõ tự do: master-data không có danh mục tài sản. */
  maTaiSan: string;
  tenTaiSan?: string;
  soLuong: number;
  giaBinhQuan: number;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  /** Cột DIỄN GIẢI. */
  ghiChu?: string;
}

export type KeHoachTaiSanPayload = Omit<KeHoachTaiSanDong, 'id'>;

/** Sửa được cả nơi sử dụng lẫn mã tài sản — chỉ khoá loại kế hoạch và năm. */
export type KeHoachTaiSanPatch = Partial<
  Omit<KeHoachTaiSanPayload, 'loaiKeHoach' | 'nam'>
>;

export interface KeHoachTaiSanBatch {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  them: Omit<KeHoachTaiSanPayload, 'nam' | 'loaiKeHoach'>[];
  sua: (KeHoachTaiSanPatch & { id: string })[];
}

interface DongResponse extends Omit<KeHoachTaiSanDong, 'id' | 'thang'> {
  _id?: string;
  id?: string;
  thang?: number[];
}

class KeHoachTaiSanService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach-tai-san' });
  }

  private map(item: DongResponse): KeHoachTaiSanDong {
    return {
      ...item,
      id: item.id ?? item._id ?? '',
      thang: chuanHoaThang(item.thang),
    } as KeHoachTaiSanDong;
  }

  async layTheoNam(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<KeHoachTaiSanDong[]> {
    const res = await this.get<DongResponse[]>({
      params: { nam, loaiKeHoach },
    });
    return (res ?? []).map((d) => this.map(d));
  }

  async luuHangLoat(
    batch: KeHoachTaiSanBatch,
  ): Promise<KeHoachBangBatchKetQua> {
    return this.post<KeHoachBangBatchKetQua>(batch, { endpoint: '/batch' });
  }

  async xoa(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const keHoachTaiSanService = new KeHoachTaiSanService();
