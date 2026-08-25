import { TenantContextService } from '@app/core';
import { ChungTu, type DanhMucTaiKhoan } from '@app/entities';
import { ServiceClient } from '@app/service-client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NhatKyChungService } from '../nhat-ky-chung/nhat-ky-chung.service';
import { VoucherNumberService } from '../shared';
import { CreateKetChuyenDto } from './dto';
import {
  chayKetChuyen,
  dungBangSoDu,
  type DongDanhMucKetChuyen,
  type DongHachToan,
} from './ket-chuyen.engine';
import { gomLoKetChuyen, type LoKetChuyen } from './ket-chuyen.helper';

/** Tiền tố số chứng từ kết chuyển — Nghiệp vụ khác (NVK). */
const MA_LOAI_CHUNG_TU = 'NVK';

export interface CanhBaoKetChuyen {
  ma: string;
  ten: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export interface KetQuaPreview {
  dong: DongHachToan[];
  canhBao: CanhBaoKetChuyen[];
  tongTien: number;
  laiLo: number;
}

@Injectable()
export class KetChuyenService {
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: Repository<ChungTu>,
    private readonly nhatKyChungService: NhatKyChungService,
    private readonly voucherNumberService: VoucherNumberService,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get tenantId() {
    return this.tenantContext.getCurrentTenantId();
  }

  async preview(denNgay: string, authToken?: string): Promise<KetQuaPreview> {
    const ngayKetThuc = new Date(denNgay);
    const dauNam = new Date(ngayKetThuc.getFullYear(), 0, 1);

    const [danhMucRes, taiKhoanRes, soDuDauKyRes, phatSinhRes] = await Promise.all([
      this.serviceClient.getTaiKhoanKetChuyen(authToken, this.tenantId),
      this.serviceClient.getTaiKhoan(authToken, this.tenantId),
      this.serviceClient.getSoDuDauKy(authToken, this.tenantId),
      this.nhatKyChungService.aggregateBalance(dauNam, ngayKetThuc, this.tenantId),
    ]);

    const danhMuc: DongDanhMucKetChuyen[] = (danhMucRes.success ? danhMucRes.data || [] : [])
      .filter((d) => d.isActive !== false && d.loai === 'XAC_DINH_KQKD')
      .map((d) => ({
        ma: d.ma,
        thuTu: Number(d.thuTu) || 0,
        taiKhoanTu: d.taiKhoanTu,
        taiKhoanDen: d.taiKhoanDen,
        ben: d.ben,
        dienGiai: d.dienGiai,
      }));

    const taiKhoan = taiKhoanRes.success ? taiKhoanRes.data || [] : [];
    const tenTheoMa = new Map(taiKhoan.map((t) => [t.ma, t.ten]));

    // Số dư đầu kỳ nhập tay chỉ tính khi ngày áp dụng rơi vào chính kỳ kết chuyển này;
    // ngày áp dụng thuộc năm cũ nghĩa là phần đó đã được kết chuyển ở năm trước.
    const ngayApDung = soDuDauKyRes.success ? soDuDauKyRes.data?.ngayApDung : null;
    const apDungSoDuDauKy =
      !!ngayApDung &&
      new Date(ngayApDung) >= dauNam &&
      new Date(ngayApDung) <= ngayKetThuc;

    const phatSinh = (phatSinhRes.success ? phatSinhRes.data || [] : []).map((p) => ({
      ma: p.ma,
      periodNo: p.periodNo,
      periodCo: p.periodCo,
    }));

    const bangSoDu = dungBangSoDu(
      phatSinh,
      soDuDauKyRes.success ? soDuDauKyRes.data?.items || [] : [],
      apDungSoDuDauKy,
    );

    const ketQua = chayKetChuyen(danhMuc, bangSoDu);

    return {
      dong: ketQua.dong,
      canhBao: ketQua.canhBao.map((c) => ({
        ...c,
        ten: tenTheoMa.get(c.ma) ?? '',
      })),
      tongTien: ketQua.dong.reduce((t, d) => t + d.soTien, 0),
      laiLo: ketQua.laiLo,
    };
  }

  async create(
    dto: CreateKetChuyenDto,
    nguoiTaoId: string,
    authToken?: string,
  ): Promise<{ soPhieu: string; soDong: number }> {
    const soPhieu = await this.voucherNumberService.generateVoucherNumber('KHAC', {
      maLoaiChungTu: MA_LOAI_CHUNG_TU,
      date: new Date(dto.ngayChungTu),
    });

    const taiKhoanRes = await this.serviceClient.getTaiKhoan(authToken, this.tenantId);
    const taiKhoanTheoMa = new Map(
      (taiKhoanRes.success ? taiKhoanRes.data || [] : []).map((t) => [t.ma, t]),
    );

    const snapshot = (ma: string): DanhMucTaiKhoan => {
      const tk = taiKhoanTheoMa.get(ma);
      return {
        ma,
        ten: tk?.ten ?? '',
        loai: tk?.loai ?? '',
        nhom: tk?.nhom ?? '',
      };
    };

    const rows = dto.dong.map((d) =>
      this.chungTuRepository.create({
        loai: 'KHAC' as const,
        soPhieu,
        ngay: new Date(dto.ngayHachToan),
        ngayGhiSo: new Date(dto.ngayChungTu),
        soTien: d.soTien,
        noiDung: d.dienGiai || dto.dienGiai,
        ghiChu: dto.dienGiai,
        danhMuc: {
          taiKhoanNo: snapshot(d.taiKhoanNo),
          taiKhoanCo: snapshot(d.taiKhoanCo),
        },
        nguon: 'KET_CHUYEN' as const,
        maKetChuyen: d.maKetChuyen,
        nguoiTaoId,
      }),
    );

    await this.chungTuRepository.save(rows);

    return { soPhieu, soDong: rows.length };
  }

  async list(): Promise<LoKetChuyen[]> {
    const rows = await this.chungTuRepository.find({
      where: { nguon: 'KET_CHUYEN' } as any,
    });
    return gomLoKetChuyen(rows);
  }

  async remove(soPhieu: string): Promise<{ deleted: number }> {
    // Điều kiện `nguon` để không lỡ tay xóa chứng từ nhập tay trùng số phiếu.
    const kq = await this.chungTuRepository.delete({
      soPhieu,
      nguon: 'KET_CHUYEN',
    } as any);

    if (!kq.affected) {
      throw new NotFoundException(`Không tìm thấy chứng từ kết chuyển ${soPhieu}`);
    }
    return { deleted: kq.affected };
  }
}
