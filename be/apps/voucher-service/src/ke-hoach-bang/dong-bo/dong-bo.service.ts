import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import {
  CauHinhDinhKhoanKeHoach,
  KeHoachDong,
  type BangKeHoachNguon,
  type DanhMucTaiKhoan,
} from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  DINH_KHOAN_MAC_DINH,
  khoaDinhKhoan,
  sinhButToanKeHoach,
  type CapTaiKhoan,
  type NguonDongKeHoach,
} from './dinh-khoan.helper';

/** Tài khoản do màn hình cấu hình gửi lên — `loai`/`nhom` có thể trống. */
export interface TaiKhoanVao {
  ma: string;
  ten: string;
  loai?: string;
  nhom?: string;
}

export interface CauHinhDinhKhoanVao {
  bang: BangKeHoachNguon;
  phanLoai?: string;
  taiKhoanNo: TaiKhoanVao;
  taiKhoanCo: TaiKhoanVao;
}

/** Bù chuỗi rỗng cho `loai`/`nhom` — `DanhMucTaiKhoan` đòi cả bốn trường. */
const chuanHoaTaiKhoan = (tk: TaiKhoanVao): DanhMucTaiKhoan => ({
  ma: tk.ma,
  ten: tk.ten,
  loai: tk.loai ?? '',
  nhom: tk.nhom ?? '',
});

/**
 * Đồng bộ bảng chi tiết → Chi tiết hạch toán kế hoạch (collection `ke_hoach`).
 *
 * Cách đồng bộ là XOÁ RỒI CHÈN LẠI theo `nguonId`: idempotent, chạy lại cho
 * cùng kết quả, và xử lý được cả trường hợp một tháng đổi từ có số về 0 (dòng
 * cũ phải biến mất, không chỉ đổi giá trị).
 *
 * Ranh giới an toàn: chỉ đụng vào dòng CÓ `nguonId`. Dòng người dùng tự nhập ở
 * tab Chi tiết không có trường này nên không bao giờ bị xoá.
 */
@Injectable()
export class DongBoHachToanKeHoachService {
  constructor(
    @InjectRepository(KeHoachDong)
    private readonly repo: MongoRepository<KeHoachDong>,
    @InjectRepository(CauHinhDinhKhoanKeHoach)
    private readonly cauHinhRepo: MongoRepository<CauHinhDinhKhoanKeHoach>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private theoTenant(where: Record<string, unknown>): Record<string, unknown> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) where.tenantId = tenantId;
    return where;
  }

  /** Sinh lại toàn bộ bút toán của các dòng nguồn truyền vào. */
  async dongBo(
    nguon: NguonDongKeHoach[],
    nguoiTaoId: string,
  ): Promise<{ daSinh: number }> {
    if (nguon.length === 0) return { daSinh: 0 };

    const cauHinh = await this.bangCauHinh();
    await this.xoaTheoNguon(
      nguon[0].nguonLoai,
      nguon.map((n) => n.nguonId),
    );

    const moi = nguon.flatMap((n) =>
      sinhButToanKeHoach(
        n,
        cauHinh.get(khoaDinhKhoan(n.nguonLoai, n.phanLoai)),
        nguoiTaoId,
      ),
    );
    if (moi.length === 0) return { daSinh: 0 };

    const tenantId = this.tenantContext.getCurrentTenantId();
    await this.repo.save(moi.map((d) => this.repo.create({ ...d, tenantId })));
    return { daSinh: moi.length };
  }

  async xoaTheoNguon(
    nguonLoai: BangKeHoachNguon,
    nguonIds: string[],
  ): Promise<void> {
    if (nguonIds.length === 0) return;
    await this.repo.deleteMany(
      this.theoTenant({ nguonLoai, nguonId: { $in: nguonIds } }),
    );
  }

  /**
   * Cấu hình định khoản của công ty. Lần đầu chưa có gì thì seed bộ mặc định —
   * để hệ thống chạy được ngay, nghiệp vụ chỉnh sau ở màn hình cấu hình.
   */
  async layCauHinh(): Promise<CauHinhDinhKhoanKeHoach[]> {
    const dangCo = await this.cauHinhRepo.find({ where: this.theoTenant({}) });
    if (dangCo.length > 0) return dangCo;

    const tenantId = this.tenantContext.getCurrentTenantId();
    const seed = DINH_KHOAN_MAC_DINH.map((c) =>
      this.cauHinhRepo.create({ ...c, tenantId }),
    );
    await this.cauHinhRepo.save(seed);
    return seed;
  }

  /** Ghi đè toàn bộ cấu hình — màn hình cấu hình gửi cả bảng một lần. */
  async luuCauHinh(
    items: CauHinhDinhKhoanVao[],
  ): Promise<CauHinhDinhKhoanKeHoach[]> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const dangCo = await this.cauHinhRepo.find({ where: this.theoTenant({}) });
    const theoKhoa = new Map(
      dangCo.map((c) => [khoaDinhKhoan(c.bang, c.phanLoai), c]),
    );

    const luu = items.map((item) => {
      const chuanHoa = {
        bang: item.bang,
        phanLoai: item.phanLoai,
        taiKhoanNo: chuanHoaTaiKhoan(item.taiKhoanNo),
        taiKhoanCo: chuanHoaTaiKhoan(item.taiKhoanCo),
      };
      const cu = theoKhoa.get(khoaDinhKhoan(item.bang, item.phanLoai));
      if (cu) return Object.assign(cu, chuanHoa);
      return this.cauHinhRepo.create({ ...chuanHoa, tenantId });
    });

    await this.cauHinhRepo.save(luu);
    return luu;
  }

  private async bangCauHinh(): Promise<Map<string, CapTaiKhoan>> {
    const cauHinh = await this.layCauHinh();
    return new Map(
      cauHinh.map((c) => [
        khoaDinhKhoan(c.bang, c.phanLoai),
        { taiKhoanNo: c.taiKhoanNo, taiKhoanCo: c.taiKhoanCo },
      ]),
    );
  }
}
