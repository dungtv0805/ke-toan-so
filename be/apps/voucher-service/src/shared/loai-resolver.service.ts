import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import {
  LoaiGiaoDich,
  LoaiChungTuMaster,
  type DanhMuc,
  type LoaiChungTu,
  type PhanLoaiChungTu,
} from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  resolveLoaiFromConfig,
  resolveLoaiInfoFromConfig,
  type LoaiInfo,
} from './loai-resolver.helper';

type CachedConfig = {
  at: number;
  lgdToLct: Map<string, string>;
  lctToPhanLoai: Map<string, PhanLoaiChungTu>;
  /** Tên hiển thị theo mã — để snapshot vào `danhMuc` của chứng từ. */
  lgdToTen: Map<string, string>;
  lctToTen: Map<string, string>;
};

/** Thông tin đủ để snapshot một loại giao dịch vào chứng từ. */
export interface ThongTinLoaiGiaoDich {
  ma: string;
  ten: string;
  /** Loại chứng từ liên kết. Không có nếu loại giao dịch chưa khai `loaiChungTuMa`. */
  loaiChungTu?: { ma: string; ten: string };
  /** Phân loại của loại chứng từ liên kết. */
  phanLoai?: PhanLoaiChungTu;
}

/**
 * Suy ra `loai` (PHIEU_THU/PHIEU_CHI/KHAC) cho chứng từ từ cấu hình
 * Loại giao dịch → Loại chứng từ → phân loại.
 *
 * Đọc trực tiếp 2 collection cấu hình (cùng MongoDB, repository tự lọc theo tenant qua
 * TenantAwareProxy nên không cần gọi liên service). Cache theo tenant với TTL ngắn để
 * không truy vấn lặp khi import/batch nhiều dòng.
 */
@Injectable()
export class LoaiResolverService {
  private static readonly TTL_MS = 30_000;
  private readonly cache = new Map<string, CachedConfig>();

  constructor(
    @InjectRepository(LoaiGiaoDich)
    private readonly loaiGiaoDichRepo: MongoRepository<LoaiGiaoDich>,
    @InjectRepository(LoaiChungTuMaster)
    private readonly loaiChungTuRepo: MongoRepository<LoaiChungTuMaster>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private async getConfig(): Promise<CachedConfig> {
    const tenantId = this.tenantContext.getCurrentTenantId() ?? '__no_tenant__';
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.at < LoaiResolverService.TTL_MS) {
      return cached;
    }

    // Repository tự lọc theo tenant hiện tại.
    const [loaiGiaoDichList, loaiChungTuList] = await Promise.all([
      this.loaiGiaoDichRepo.find(),
      this.loaiChungTuRepo.find(),
    ]);

    const lgdToLct = new Map<string, string>();
    for (const lgd of loaiGiaoDichList) {
      if (lgd.ma && lgd.loaiChungTuMa) lgdToLct.set(lgd.ma, lgd.loaiChungTuMa);
    }
    const lctToPhanLoai = new Map<string, PhanLoaiChungTu>();
    for (const lct of loaiChungTuList) {
      if (lct.ma && lct.phanLoai) lctToPhanLoai.set(lct.ma, lct.phanLoai);
    }

    const lgdToTen = new Map<string, string>();
    for (const lgd of loaiGiaoDichList) {
      if (lgd.ma) lgdToTen.set(lgd.ma, lgd.ten ?? '');
    }
    const lctToTen = new Map<string, string>();
    for (const lct of loaiChungTuList) {
      if (lct.ma) lctToTen.set(lct.ma, lct.ten ?? '');
    }

    const entry: CachedConfig = {
      at: Date.now(),
      lgdToLct,
      lctToPhanLoai,
      lgdToTen,
      lctToTen,
    };
    this.cache.set(tenantId, entry);
    return entry;
  }

  /**
   * Trả về `loai` đã suy luận; nếu không đủ cấu hình → trả `fallbackLoai`.
   */
  async resolveLoai(
    danhMuc: DanhMuc | undefined | null,
    fallbackLoai: LoaiChungTu,
  ): Promise<LoaiChungTu> {
    // Không có loại giao dịch thì khỏi cần nạp cấu hình.
    if (!danhMuc?.loaiGiaoDich?.ma) return fallbackLoai;
    const { lgdToLct, lctToPhanLoai } = await this.getConfig();
    return resolveLoaiFromConfig(danhMuc, fallbackLoai, lgdToLct, lctToPhanLoai);
  }

  /**
   * Như {@link resolveLoai} nhưng trả thêm `maLoaiChungTu` để làm tiền tố số phiếu.
   */
  async resolveLoaiInfo(
    danhMuc: DanhMuc | undefined | null,
    fallbackLoai: LoaiChungTu,
  ): Promise<LoaiInfo> {
    if (!danhMuc?.loaiGiaoDich?.ma) return { loai: fallbackLoai };
    const { lgdToLct, lctToPhanLoai } = await this.getConfig();
    return resolveLoaiInfoFromConfig(
      danhMuc,
      fallbackLoai,
      lgdToLct,
      lctToPhanLoai,
    );
  }

  /**
   * Tra một loại giao dịch theo mã, kèm loại chứng từ liên kết.
   *
   * Trả `null` khi mã không có trong danh mục của công ty — caller phải chặn thay vì
   * ghi một snapshot rỗng vào chứng từ.
   */
  async layThongTinLoaiGiaoDich(
    ma: string,
  ): Promise<ThongTinLoaiGiaoDich | null> {
    if (!ma) return null;
    const { lgdToLct, lctToPhanLoai, lgdToTen, lctToTen } = await this.getConfig();
    if (!lgdToTen.has(ma)) return null;

    const lctMa = lgdToLct.get(ma);
    return {
      ma,
      ten: lgdToTen.get(ma) ?? '',
      loaiChungTu: lctMa ? { ma: lctMa, ten: lctToTen.get(lctMa) ?? '' } : undefined,
      phanLoai: lctMa ? lctToPhanLoai.get(lctMa) : undefined,
    };
  }
}
