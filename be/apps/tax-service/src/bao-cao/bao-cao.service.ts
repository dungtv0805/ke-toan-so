import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { BangKeMuaVao, BangKeBanRa } from '@app/entities';
import { DieuChinhThueService } from '../dieu-chinh-thue/dieu-chinh-thue.service';
import {
  tinhThueSuatTNDN,
  tongVatTheoKy,
  tinhTNDNQuy,
  tinhTNDNLuyKe,
  TNDNQuyResult,
  boDongChoBoSung,
} from './tax-calc';
import { quyToRange, inDateRange } from '../shared/tax-helpers';
import { buildCpKhongTru } from './chi-phi-khong-tru.util';
import {
  buildNvcsSections,
  tinhNghiaVuTuSo,
  NghiaVuChinhSach,
  NghiaVuTuSo,
  NvcsVatQuy,
} from './nghia-vu-chinh-sach.util';

interface AggRow {
  ma: string;
  periodNo: number;
  periodCo: number;
}

export interface TNDNQuyData extends TNDNQuyResult {
  quy: number;
  dt511: number;
  dt515: number;
  dt711: number;
  cp632: number;
  cp641: number;
  cp642: number;
  cp811: number;
  chiPhiKhongTru: number;
  cpKhongTruAuto?: number[];
  thuNhapMien: number;
  loChuyen: number;
  doanhThuLuyKe: number;
  thueSuat: number;
}

@Injectable()
export class BaoCaoService {
  constructor(
    @InjectRepository(BangKeMuaVao)
    private readonly muaVaoRepo: Repository<BangKeMuaVao>,
    @InjectRepository(BangKeBanRa)
    private readonly banRaRepo: Repository<BangKeBanRa>,
    private readonly dieuChinhService: DieuChinhThueService,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  private sumByPrefix(
    rows: AggRow[],
    prefix: string,
    field: 'periodNo' | 'periodCo',
  ): number {
    return rows
      .filter((r) => r.ma?.startsWith(prefix))
      .reduce((s, r) => s + (Number(r[field]) || 0), 0);
  }

  /** Lấy phát sinh tài khoản theo từng quý của năm (gọi voucher-service). */
  private async aggByQuy(nam: number, authToken?: string): Promise<AggRow[][]> {
    const calls = [1, 2, 3, 4].map((q) => {
      const { start, end } = quyToRange(q, nam);
      const endInclusive = new Date(end.getTime() - 1);
      return this.serviceClient.aggregateBalance(
        start.toISOString(),
        endInclusive.toISOString(),
        authToken,
      );
    });
    const responses = await Promise.all(calls);
    return responses.map((res) => (res?.success ? res.data || [] : []));
  }

  /** Tính dữ liệu TNDN cho 4 quý + lũy kế. */
  async baoCaoTNDN(
    nam: number,
    authToken?: string,
    aggSan?: AggRow[][],
  ): Promise<{ nam: number; quy: TNDNQuyData[]; luyKe: TNDNQuyData }> {
    const [aggQuarters, dieuChinh, autoRes] = await Promise.all([
      aggSan ?? this.aggByQuy(nam, authToken),
      this.dieuChinhService.getOrDefault(nam),
      this.serviceClient.aggregateNonDeductible(nam, authToken),
    ]);

    const arr = (f: string, i: number): number =>
      Number(((dieuChinh as any)[f] || [])[i]) || 0;

    // Chi phí không được trừ = auto (từ chứng từ kiểm soát) + điều chỉnh tay.
    const cp = buildCpKhongTru(
      autoRes?.success ? autoRes.data || [] : [],
      dieuChinh as any,
    );

    let doanhThuLuyKe = 0;
    const quy: TNDNQuyData[] = aggQuarters.map((rows, i) => {
      const dt511 = this.sumByPrefix(rows, '511', 'periodCo');
      const dt515 = this.sumByPrefix(rows, '515', 'periodCo');
      const dt711 = this.sumByPrefix(rows, '711', 'periodCo');
      const cp632 = this.sumByPrefix(rows, '632', 'periodNo');
      const cp641 = this.sumByPrefix(rows, '641', 'periodNo');
      const cp642 = this.sumByPrefix(rows, '642', 'periodNo');
      const cp811 = this.sumByPrefix(rows, '811', 'periodNo');

      // tổng đã bao gồm cả điều chỉnh tay (tránh cộng tay hai lần).
      const chiPhiKhongTru = cp.tongPerQuy[i];
      const thuNhapMien = arr('thuNhapMienThue', i);
      const loChuyen = arr('loDuocChuyen', i);

      doanhThuLuyKe += dt511 + dt515 + dt711;
      const thueSuat = tinhThueSuatTNDN(doanhThuLuyKe);

      const r = tinhTNDNQuy({
        dt511,
        dt515,
        dt711,
        cp632,
        cp641,
        cp642,
        cp811,
        chiPhiKhongTru,
        thuNhapMien,
        loChuyen,
        thueSuat,
      });

      return {
        quy: i + 1,
        dt511,
        dt515,
        dt711,
        cp632,
        cp641,
        cp642,
        cp811,
        chiPhiKhongTru,
        cpKhongTruAuto: cp.perQuy[i],
        thuNhapMien,
        loChuyen,
        doanhThuLuyKe,
        thueSuat,
        ...r,
      };
    });

    const sum = (sel: (q: TNDNQuyData) => number): number =>
      quy.reduce((s, q) => s + sel(q), 0);

    // Lũy kế = quyết toán năm: thuế tính 1 lần trên thu nhập tính thuế cả năm
    // (lỗ quý này bù trừ lãi quý khác) với thuế suất theo doanh thu cả năm.
    // Vì vậy thuế lũy kế có thể khác tổng thuế tạm tính 4 quý.
    const thueSuatNam = tinhThueSuatTNDN(doanhThuLuyKe);
    const thuNhapTinhThueNam = sum((q) => q.thuNhapTinhThue);
    const lnTruocThueNam = sum((q) => q.lnTruocThue);
    const namResult = tinhTNDNLuyKe({
      lnTruocThue: lnTruocThueNam,
      thuNhapTinhThue: thuNhapTinhThueNam,
      thueSuat: thueSuatNam,
    });

    const luyKe: TNDNQuyData = {
      quy: 0,
      dt511: sum((q) => q.dt511),
      dt515: sum((q) => q.dt515),
      dt711: sum((q) => q.dt711),
      cp632: sum((q) => q.cp632),
      cp641: sum((q) => q.cp641),
      cp642: sum((q) => q.cp642),
      cp811: sum((q) => q.cp811),
      chiPhiKhongTru: sum((q) => q.chiPhiKhongTru),
      cpKhongTruAuto: [0, 1, 2, 3].map((n) =>
        cp.perQuy.reduce((s, nhomArr) => s + (nhomArr[n] || 0), 0),
      ),
      thuNhapMien: sum((q) => q.thuNhapMien),
      loChuyen: sum((q) => q.loChuyen),
      doanhThuLuyKe,
      thueSuat: thueSuatNam,
      tongChiPhi: sum((q) => q.tongChiPhi),
      lnTruocThue: lnTruocThueNam,
      thuNhapTinhThue: thuNhapTinhThueNam,
      thueTNDN: namResult.thueTNDN,
      lnSauThue: namResult.lnSauThue,
    };

    return { nam, quy, luyKe };
  }

  /**
   * Thuế TNCN và bảo hiểm phải nộp của 4 quý, lấy từ phát sinh bên CÓ trên sổ
   * (3335 / 3383+3384+3386) — xem `tinhNghiaVuTuSo`.
   */
  private nghiaVuTuSoTheoQuy(aggQuarters: AggRow[][]): NghiaVuTuSo[] {
    return aggQuarters.map((rows) => tinhNghiaVuTuSo(rows));
  }

  /** Ma trận rút gọn báo cáo nghĩa vụ chính sách (TNDN/GTGT/TNCN/BHXH) theo quý + lũy kế. */
  async nghiaVuChinhSach(
    nam: number,
    authToken?: string,
  ): Promise<NghiaVuChinhSach> {
    const aggQuarters = await this.aggByQuy(nam, authToken);
    const [tndn, muaVaoAll, banRaAll, dieuChinh] = await Promise.all([
      this.baoCaoTNDN(nam, authToken, aggQuarters),
      this.muaVaoRepo.find({ where: this.getTenantFilter() as any }),
      this.banRaRepo.find({ where: this.getTenantFilter() as any }),
      this.dieuChinhService.getOrDefault(nam),
    ]);
    const auto = this.nghiaVuTuSoTheoQuy(aggQuarters);

    const vatPerQuy: NvcsVatQuy[] = [1, 2, 3, 4].map((q) => {
      const range = quyToRange(q, nam);
      const muaVao = muaVaoAll.filter(
        (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
      );
      const banRa = banRaAll.filter(
        (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
      );
      const vatDauVao = tongVatTheoKy(boDongChoBoSung(muaVao));
      const vatDauRa = tongVatTheoKy(boDongChoBoSung(banRa));
      return {
        vatDauVao,
        vatDauRa,
        vatPhaiNop: Math.max(0, vatDauRa - vatDauVao),
        vatConKhauTru: Math.max(0, vatDauVao - vatDauRa),
      };
    });

    return {
      nam,
      sections: buildNvcsSections(tndn, vatPerQuy, dieuChinh as any, {
        thueTNCN: auto.map((x) => x.thueTNCN),
        baoHiem: auto.map((x) => x.baoHiem),
      }),
    };
  }

  /** Tổng hợp thuế GTGT + nghĩa vụ ngân sách cho một kỳ. */
  async tongHop(nam: number, quy: number | undefined, authToken?: string) {
    const range = quy
      ? quyToRange(quy, nam)
      : {
          start: new Date(Date.UTC(nam, 0, 1)),
          end: new Date(Date.UTC(nam + 1, 0, 1)),
        };

    const aggQuarters = await this.aggByQuy(nam, authToken);
    const [muaVaoAll, banRaAll, tndn, dieuChinh] = await Promise.all([
      this.muaVaoRepo.find({ where: this.getTenantFilter() as any }),
      this.banRaRepo.find({ where: this.getTenantFilter() as any }),
      this.baoCaoTNDN(nam, authToken, aggQuarters),
      this.dieuChinhService.getOrDefault(nam),
    ]);
    const auto = this.nghiaVuTuSoTheoQuy(aggQuarters);

    const muaVao = muaVaoAll.filter(
      (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
    );
    const banRa = banRaAll.filter(
      (i) => i.isActive !== false && inDateRange(i.ngayHoaDon, range),
    );

    const muaVaoDayDu = boDongChoBoSung(muaVao);
    const banRaDayDu = boDongChoBoSung(banRa);
    const soHoaDonChoBoSung =
      muaVao.length - muaVaoDayDu.length + (banRa.length - banRaDayDu.length);

    const vatDauVao = tongVatTheoKy(muaVaoDayDu);
    const vatDauRa = tongVatTheoKy(banRaDayDu);
    const vatPhaiNop = Math.max(0, vatDauRa - vatDauVao);
    const vatConKhauTru = Math.max(0, vatDauVao - vatDauRa);

    // Nghĩa vụ ngân sách: nếu chọn quý → lấy đúng quý; nếu cả năm → tổng 4 quý.
    const idxs = quy ? [quy - 1] : [0, 1, 2, 3];
    const sumDC = (f: string): number =>
      idxs.reduce(
        (s, i) => s + (Number(((dieuChinh as any)[f] || [])[i]) || 0),
        0,
      );
    // Số từ sổ của kỳ đang xem — cùng nguồn với báo cáo nghĩa vụ chính sách
    // để hai màn không lệch nhau; mỗi loại bảo hiểm về đúng dòng tài khoản.
    const sumAuto = (sel: (x: NghiaVuTuSo) => number): number =>
      idxs.reduce((s, i) => s + (auto[i] ? sel(auto[i]) : 0), 0);
    const tndnTamTinh = quy
      ? tndn.quy[quy - 1]?.thueTNDN || 0
      : tndn.luyKe.thueTNDN;

    return {
      nam,
      quy: quy ?? null,
      vatDauVao,
      vatDauRa,
      vatPhaiNop,
      vatConKhauTru,
      soHoaDonChoBoSung,
      nghiaVuNganSach: {
        thueTNDN: tndnTamTinh,
        vatPhaiNop,
        thueTNCN: sumAuto((x) => x.thueTNCN) + sumDC('thueTNCN'),
        bhxh: sumAuto((x) => x.bhxh) + sumDC('bhxh3383'),
        bhyt: sumAuto((x) => x.bhyt) + sumDC('bhyt3384'),
        bhtn: sumAuto((x) => x.bhtn) + sumDC('bhtn3386'),
      },
    };
  }
}
