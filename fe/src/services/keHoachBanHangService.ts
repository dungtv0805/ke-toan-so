import { ServiceBase } from './base/service-base';
import type { LoaiKeHoach } from './keHoachService';

/** Ảnh chụp một mục danh mục lúc lưu — giữ mã/tên để bảng đọc lại được. */
export interface MucDanhMucKeHoach {
  id: string;
  ma: string;
  ten: string;
}

export const SO_THANG = 12;

/** Chuẩn hoá về đúng 12 số — dòng cũ thiếu tháng thì bù 0. */
export const chuanHoaThang = (thang?: number[]): number[] =>
  Array.from({ length: SO_THANG }, (_, i) => Number(thang?.[i]) || 0);

export interface KeHoachBanHangDong {
  id: string;
  loaiKeHoach: LoaiKeHoach;
  nam: number;
  nhomSanPham: MucDanhMucKeHoach;
  sanPham: MucDanhMucKeHoach;
  luong: number;
  giaBinhQuan: number;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  ghiChu?: string;
}

export type KeHoachBanHangPayload = Omit<KeHoachBanHangDong, 'id'>;

/**
 * Sửa được mọi thứ trừ loại kế hoạch, năm và sản phẩm — ba trường đó là khoá
 * chống trùng. Đổi loại nghĩa là chuyển sang bảng khác, phải thêm dòng mới.
 */
export type KeHoachBanHangPatch = Partial<
  Omit<KeHoachBanHangPayload, 'loaiKeHoach' | 'nam' | 'sanPham'>
>;

/** Một lần bấm Lưu gửi hết dòng mới và dòng đã sửa. */
export interface KeHoachBanHangBatch {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  them: Omit<KeHoachBanHangPayload, 'nam' | 'loaiKeHoach'>[];
  sua: (KeHoachBanHangPatch & { id: string })[];
}

export interface KeHoachBanHangBatchKetQua {
  daThem: number;
  daSua: number;
}

interface DongResponse extends Omit<KeHoachBanHangDong, 'id' | 'thang'> {
  _id?: string;
  id?: string;
  thang?: number[];
}

class KeHoachBanHangService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach-ban-hang' });
  }

  private map(item: DongResponse): KeHoachBanHangDong {
    return {
      ...item,
      id: item.id ?? item._id ?? '',
      thang: chuanHoaThang(item.thang),
    } as KeHoachBanHangDong;
  }

  async layTheoNam(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<KeHoachBanHangDong[]> {
    const res = await this.get<DongResponse[]>({
      params: { nam, loaiKeHoach },
    });
    return (res ?? []).map((d) => this.map(d));
  }

  async taoMoi(payload: KeHoachBanHangPayload): Promise<KeHoachBanHangDong> {
    return this.map(await this.post<DongResponse>(payload));
  }

  async capNhat(
    id: string,
    payload: KeHoachBanHangPatch,
  ): Promise<KeHoachBanHangDong> {
    return this.map(
      await this.patch<DongResponse>(payload, { endpoint: `/${id}` }),
    );
  }

  async luuHangLoat(
    batch: KeHoachBanHangBatch,
  ): Promise<KeHoachBanHangBatchKetQua> {
    return this.post<KeHoachBanHangBatchKetQua>(batch, { endpoint: '/batch' });
  }

  async xoa(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const keHoachBanHangService = new KeHoachBanHangService();
