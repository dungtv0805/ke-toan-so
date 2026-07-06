import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiemDanhAn, DinhMucTienAn, CongThucDinhLuong } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { tinhTieuHao, tinhNganSach, tinhDonGiaBinhQuan, tinhChiPhiThuc, tinhHaoPhi } from '../engine/bep-an-engine';

@Injectable()
export class KiemSoatService {
  constructor(
    @InjectRepository(DiemDanhAn) private readonly diemDanhRepo: Repository<DiemDanhAn>,
    @InjectRepository(DinhMucTienAn) private readonly dinhMucRepo: Repository<DinhMucTienAn>,
    @InjectRepository(CongThucDinhLuong) private readonly congThucRepo: Repository<CongThucDinhLuong>,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tf() { const t = this.tenantContext.getCurrentTenantId(); return t ? { tenantId: t } : {}; }

  async chiPhi(tuNgay?: string, denNgay?: string, nguongPct?: number, authToken?: string) {
    // 1) Điểm danh trong kỳ (lọc theo ngày ở JS cho đơn giản)
    const allDiemDanh = await this.diemDanhRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const from = tuNgay ? new Date(tuNgay) : null;
    const to = denNgay ? new Date(denNgay) : null;
    const rows = allDiemDanh.filter((d) => {
      const n = new Date(d.ngay).getTime();
      return (!from || n >= from.getTime()) && (!to || n <= to.getTime());
    });

    // 2) Định mức + công thức
    const dinhMucList = await this.dinhMucRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const congThucList = await this.congThucRepo.find({ where: { isActive: true, ...this.tf() } as any });
    const congThucByCode: Record<string, any> = {};
    for (const c of congThucList) congThucByCode[c.code] = { chiTiet: c.chiTiet };

    // 3) Phiếu nhập kho (để định giá)
    const nhapRes = await this.serviceClient.get<any>('kho', '/phieu', {
      headers: authToken ? { Authorization: authToken } : undefined,
      query: { loaiPhieu: 'NHAP', limit: 1000 },
    });
    const nhapPhieu: any[] = nhapRes.success ? (nhapRes.data?.data ?? nhapRes.data ?? []) : [];
    const nhapChiTiet = nhapPhieu.flatMap((p) => (p.chiTiet ?? []).map((ct: any) => ({
      hangHoaMa: ct.hangHoaMa, soLuong: ct.soLuong, thanhTien: ct.thanhTien,
    })));

    // 4) Engine
    const tieuHao = tinhTieuHao(rows as any, congThucByCode);
    const donGiaBq = tinhDonGiaBinhQuan(nhapChiTiet);
    const chiPhiThuc = tinhChiPhiThuc(tieuHao, donGiaBq);
    const nganSach = tinhNganSach(rows as any, dinhMucList as any);
    const haoPhi = tinhHaoPhi(nganSach, chiPhiThuc, nguongPct ?? 0);

    return { nganSach, chiPhiThuc, ...haoPhi, tieuHao, canhBaoDinhGiaThieu: !nhapRes.success };
  }
}
