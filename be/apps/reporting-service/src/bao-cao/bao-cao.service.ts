import type { NhatKyChungEntry, KqkdChiTieu, KqkdReport } from '@app/dto';
import { ServiceClient } from '@app/service-client';
import { Injectable } from '@nestjs/common';

export interface PnLEntry {
  ma: string;
  ten: string;
  soTien: number;
}

export interface PnLPeriodData {
  doanhThu: PnLEntry[];
  chiPhi: PnLEntry[];
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuan: number;
}

export interface PnLReport extends PnLPeriodData {
  kyTruoc: PnLPeriodData;
  kyHienTai: { startDate: string; endDate: string };
  kyTruocPeriod: { startDate: string; endDate: string };
}

export interface BalanceSheetEntry {
  ma: string;
  ten: string;
  soTien: number;
}

export interface BalanceSheetReport {
  taiSan: BalanceSheetEntry[];
  nguonVon: BalanceSheetEntry[];
  tongTaiSan: number;
  tongNguonVon: number;
  ratios: {
    currentRatio: number;
    debtToEquity: number;
  };
}

/**
 * Tính phần đóng góp của số dư đầu kỳ thủ công vào số dư 1 phía (Nợ/Có).
 * Phía NO (tài sản): duNo - duCo. Phía CO (nguồn vốn): duCo - duNo.
 */
export function openingNetForSide(
  opening: { duNo: number; duCo: number } | undefined,
  side: 'NO' | 'CO',
): number {
  if (!opening) return 0;
  return side === 'NO'
    ? opening.duNo - opening.duCo
    : opening.duCo - opening.duNo;
}

@Injectable()
export class BaoCaoService {
  constructor(private readonly serviceClient: ServiceClient) {}

  /**
   * Generate Profit & Loss report
   */
  async getPnL(
    startDate: Date,
    endDate: Date,
    periodType: 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
    authToken?: string,
    tenantId?: string,
  ): Promise<PnLReport> {
    const prevPeriod = this.getPreviousPeriod(startDate, endDate, periodType);

    const [vouchersHTRes, vouchersKTRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getNhatKyChung(
        prevPeriod.startDate.toISOString(),
        prevPeriod.endDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
    ]);

    const vouchersHT = vouchersHTRes.success ? vouchersHTRes.data || [] : [];
    const vouchersKT = vouchersKTRes.success ? vouchersKTRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    const revenueAccounts = accounts.filter((a) => a.ma?.startsWith('5'));
    const expenseAccounts = accounts.filter((a) => a.ma?.startsWith('6'));

    const buildPeriodData = (vouchers: NhatKyChungEntry[]): PnLPeriodData => {
      const doanhThu: PnLEntry[] = [];
      const chiPhi: PnLEntry[] = [];

      for (const account of revenueAccounts) {
        const amount = this.calculateAccountBalance(vouchers, account.ma, 'CO');
        if (amount !== 0) {
          doanhThu.push({ ma: account.ma, ten: account.ten, soTien: amount });
        }
      }

      for (const account of expenseAccounts) {
        const amount = this.calculateAccountBalance(vouchers, account.ma, 'NO');
        if (amount !== 0) {
          chiPhi.push({ ma: account.ma, ten: account.ten, soTien: amount });
        }
      }

      const tongDoanhThu = doanhThu.reduce((sum, e) => sum + e.soTien, 0);
      const tongChiPhi = chiPhi.reduce((sum, e) => sum + e.soTien, 0);

      return {
        doanhThu,
        chiPhi,
        tongDoanhThu,
        tongChiPhi,
        loiNhuan: tongDoanhThu - tongChiPhi,
      };
    };

    const currentData = buildPeriodData(vouchersHT);
    const previousData = buildPeriodData(vouchersKT);

    return {
      ...currentData,
      kyTruoc: previousData,
      kyHienTai: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kyTruocPeriod: {
        startDate: prevPeriod.startDate.toISOString(),
        endDate: prevPeriod.endDate.toISOString(),
      },
    };
  }

  /**
   * Generate Balance Sheet report
   */
  async getBalanceSheet(
    asOfDate: Date,
    authToken?: string,
    tenantId?: string,
  ): Promise<BalanceSheetReport> {
    const [vouchersRes, accountsRes, openingRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        '2000-01-01',
        asOfDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getTaiKhoan(authToken, tenantId),
      this.serviceClient.getSoDuDauKy(authToken, tenantId),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];
    const openingItems =
      openingRes.success && openingRes.data ? openingRes.data.items || [] : [];
    const openingMap = new Map<string, { duNo: number; duCo: number }>(
      openingItems.map((o) => [
        o.maTaiKhoan,
        { duNo: Number(o.duNo) || 0, duCo: Number(o.duCo) || 0 },
      ]),
    );

    const assetAccounts = accounts.filter(
      (a) => a.ma?.startsWith('1') || a.ma?.startsWith('2'),
    );
    const liabilityAccounts = accounts.filter(
      (a) => a.ma?.startsWith('3') || a.ma?.startsWith('4'),
    );

    const taiSan: BalanceSheetEntry[] = [];
    const nguonVon: BalanceSheetEntry[] = [];

    // Calculate assets (debit balance)
    for (const account of assetAccounts) {
      const amount = this.calculateAccountBalance(
        vouchers,
        account.ma,
        'NO',
        openingNetForSide(openingMap.get(account.ma), 'NO'),
      );
      if (amount !== 0) {
        taiSan.push({ ma: account.ma, ten: account.ten, soTien: amount });
      }
    }

    // Calculate liabilities & equity (credit balance)
    for (const account of liabilityAccounts) {
      const amount = this.calculateAccountBalance(
        vouchers,
        account.ma,
        'CO',
        openingNetForSide(openingMap.get(account.ma), 'CO'),
      );
      if (amount !== 0) {
        nguonVon.push({ ma: account.ma, ten: account.ten, soTien: amount });
      }
    }

    const tongTaiSan = taiSan.reduce((sum, e) => sum + e.soTien, 0);
    const tongNguonVon = nguonVon.reduce((sum, e) => sum + e.soTien, 0);

    // Calculate ratios
    const currentAssets = taiSan
      .filter((a) => a.ma.startsWith('1'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const currentLiabilities = nguonVon
      .filter((a) => a.ma.startsWith('31'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const totalDebt = nguonVon
      .filter((a) => a.ma.startsWith('3'))
      .reduce((sum, e) => sum + e.soTien, 0);
    const equity = nguonVon
      .filter((a) => a.ma.startsWith('4'))
      .reduce((sum, e) => sum + e.soTien, 0);

    return {
      taiSan,
      nguonVon,
      tongTaiSan,
      tongNguonVon,
      ratios: {
        currentRatio:
          currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
        debtToEquity: equity > 0 ? totalDebt / equity : 0,
      },
    };
  }

  /**
   * Generate KQKD (Income Statement) report
   */
  async getKqkd(
    startDate: Date,
    endDate: Date,
    periodType: 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
    authToken?: string,
    tenantId?: string,
  ): Promise<KqkdReport> {
    const prevPeriod = this.getPreviousPeriod(startDate, endDate, periodType);

    const [vouchersHTRes, vouchersKTRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
        tenantId,
      ),
      this.serviceClient.getNhatKyChung(
        prevPeriod.startDate.toISOString(),
        prevPeriod.endDate.toISOString(),
        authToken,
        tenantId,
      ),
    ]);

    const vouchersHT = vouchersHTRes.success ? vouchersHTRes.data || [] : [];
    const vouchersKT = vouchersKTRes.success ? vouchersKTRes.data || [] : [];

    // Current period indicators
    const m01_ht = this.sumByAccountPrefix(vouchersHT, '511', 'CO');
    const m02_ht = this.sumByAccountPrefix(vouchersHT, '521', 'NO');
    const m10_ht = m01_ht - m02_ht;
    const m11_ht = this.sumByAccountPrefix(vouchersHT, '632', 'NO');
    const m20_ht = m10_ht - m11_ht;
    const m21_ht = this.sumByAccountPrefix(vouchersHT, '515', 'CO');
    const m22_ht = this.sumByAccountPrefix(vouchersHT, '635', 'NO');
    const m25_ht = this.sumByAccountPrefix(vouchersHT, '641', 'NO');
    const m26_ht = this.sumByAccountPrefix(vouchersHT, '642', 'NO');
    const m30_ht = m20_ht + (m21_ht - m22_ht) - (m25_ht + m26_ht);
    const m31_ht = this.sumByAccountPrefix(vouchersHT, '711', 'CO');
    const m32_ht = this.sumByAccountPrefix(vouchersHT, '811', 'NO');
    const m40_ht = m31_ht - m32_ht;
    const m50_ht = m30_ht + m40_ht;
    const m51_ht = this.sumByAccountPrefix(vouchersHT, '8211', 'NO');
    const m52_ht = this.sumByAccountPrefix(vouchersHT, '8212', 'NO');
    const m60_ht = m50_ht - m51_ht - m52_ht;

    // Previous period indicators
    const m01_kt = this.sumByAccountPrefix(vouchersKT, '511', 'CO');
    const m02_kt = this.sumByAccountPrefix(vouchersKT, '521', 'NO');
    const m10_kt = m01_kt - m02_kt;
    const m11_kt = this.sumByAccountPrefix(vouchersKT, '632', 'NO');
    const m20_kt = m10_kt - m11_kt;
    const m21_kt = this.sumByAccountPrefix(vouchersKT, '515', 'CO');
    const m22_kt = this.sumByAccountPrefix(vouchersKT, '635', 'NO');
    const m25_kt = this.sumByAccountPrefix(vouchersKT, '641', 'NO');
    const m26_kt = this.sumByAccountPrefix(vouchersKT, '642', 'NO');
    const m30_kt = m20_kt + (m21_kt - m22_kt) - (m25_kt + m26_kt);
    const m31_kt = this.sumByAccountPrefix(vouchersKT, '711', 'CO');
    const m32_kt = this.sumByAccountPrefix(vouchersKT, '811', 'NO');
    const m40_kt = m31_kt - m32_kt;
    const m50_kt = m30_kt + m40_kt;
    const m51_kt = this.sumByAccountPrefix(vouchersKT, '8211', 'NO');
    const m52_kt = this.sumByAccountPrefix(vouchersKT, '8212', 'NO');
    const m60_kt = m50_kt - m51_kt - m52_kt;

    // Derived column helpers
    const dtThuan_ht = m10_ht;
    const dtThuan_kt = m10_kt;
    const tongCP_ht = m22_ht + m25_ht + m26_ht;
    const tongCP_kt = m22_kt + m25_kt + m26_kt;

    const pctDT = (v: number, dt: number): number | null =>
      dt !== 0 ? (v / dt) * 100 : null;
    const tyTrong = (v: number, tcp: number): number | null =>
      tcp !== 0 ? (v / tcp) * 100 : null;
    const bienDong = (ht: number, kt: number): number => ht - kt;
    const pctBD = (ht: number, kt: number): number | null =>
      kt !== 0 ? ((ht - kt) / Math.abs(kt)) * 100 : null;

    const buildRow = (
      ma: string,
      ten: string,
      ht: number,
      kt: number,
      isCalculated: boolean,
      isBold: boolean,
      hasTyTrong: boolean,
    ): KqkdChiTieu => ({
      ma,
      ten,
      kyHienTai: ht,
      phanTramDTThuan: pctDT(ht, dtThuan_ht),
      tyTrongChiPhi: hasTyTrong ? tyTrong(ht, tongCP_ht) : null,
      kyTruoc: kt,
      phanTramDTThuanKyTruoc: pctDT(kt, dtThuan_kt),
      tyTrongChiPhiKyTruoc: hasTyTrong ? tyTrong(kt, tongCP_kt) : null,
      bienDong: bienDong(ht, kt),
      phanTramBienDong: pctBD(ht, kt),
      isCalculated,
      isBold,
    });

    const chiTieu: KqkdChiTieu[] = [
      buildRow('01', 'Doanh thu bán hàng và cung cấp dịch vụ', m01_ht, m01_kt, false, false, false),
      buildRow('02', 'Các khoản giảm trừ doanh thu', m02_ht, m02_kt, false, false, false),
      buildRow('10', 'Doanh thu thuần về bán hàng và cung cấp dịch vụ', m10_ht, m10_kt, true, true, false),
      buildRow('11', 'Giá vốn hàng bán', m11_ht, m11_kt, false, false, false),
      buildRow('20', 'Lợi nhuận gộp về bán hàng và cung cấp dịch vụ', m20_ht, m20_kt, true, true, false),
      buildRow('21', 'Doanh thu hoạt động tài chính', m21_ht, m21_kt, false, false, false),
      buildRow('22', 'Chi phí tài chính', m22_ht, m22_kt, false, false, true),
      buildRow('25', 'Chi phí bán hàng', m25_ht, m25_kt, false, false, true),
      buildRow('26', 'Chi phí quản lý doanh nghiệp', m26_ht, m26_kt, false, false, true),
      buildRow('30', 'Lợi nhuận thuần từ hoạt động kinh doanh', m30_ht, m30_kt, true, true, false),
      buildRow('31', 'Thu nhập khác', m31_ht, m31_kt, false, false, false),
      buildRow('32', 'Chi phí khác', m32_ht, m32_kt, false, false, false),
      buildRow('40', 'Lợi nhuận khác', m40_ht, m40_kt, true, true, false),
      buildRow('50', 'Tổng lợi nhuận kế toán trước thuế', m50_ht, m50_kt, true, true, false),
      buildRow('51', 'Chi phí thuế TNDN hiện hành', m51_ht, m51_kt, false, false, false),
      buildRow('52', 'Chi phí thuế TNDN hoãn lại', m52_ht, m52_kt, false, false, false),
      buildRow('60', 'Lợi nhuận sau thuế thu nhập doanh nghiệp', m60_ht, m60_kt, true, true, false),
    ];

    return {
      chiTieu,
      kyHienTai: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      kyTruoc: {
        startDate: prevPeriod.startDate.toISOString(),
        endDate: prevPeriod.endDate.toISOString(),
      },
    };
  }

  private getPreviousPeriod(
    startDate: Date,
    endDate: Date,
    periodType: 'ngay' | 'thang' | 'quy' | 'nam' | 'tuyChon',
  ): { startDate: Date; endDate: Date } {
    const prevStart = new Date(startDate);
    const prevEnd = new Date(endDate);

    switch (periodType) {
      case 'ngay': {
        const prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        const prevEndDate = new Date(endDate);
        prevEndDate.setDate(prevEndDate.getDate() - 1);
        return { startDate: prevStartDate, endDate: prevEndDate };
      }
      case 'thang': {
        const prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
        const prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
        return { startDate: prevStartDate, endDate: prevEndDate };
      }
      case 'quy': {
        const prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 3, 1);
        const prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
        return { startDate: prevStartDate, endDate: prevEndDate };
      }
      case 'nam':
        prevStart.setFullYear(prevStart.getFullYear() - 1);
        prevEnd.setFullYear(prevEnd.getFullYear() - 1);
        break;
      case 'tuyChon': {
        const durationMs = endDate.getTime() - startDate.getTime();
        prevStart.setTime(startDate.getTime() - durationMs);
        prevEnd.setTime(endDate.getTime() - durationMs);
        break;
      }
    }

    return { startDate: prevStart, endDate: prevEnd };
  }

  private sumByAccountPrefix(
    vouchers: NhatKyChungEntry[],
    prefix: string,
    side: 'NO' | 'CO',
  ): number {
    let sum = 0;

    for (const v of vouchers) {
      if (side === 'NO') {
        const maTK = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
        if (maTK?.startsWith(prefix)) {
          sum += v.soTien;
        }
      } else {
        const maTK = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
        if (maTK?.startsWith(prefix)) {
          sum += v.soTien;
        }
      }
    }

    return sum;
  }

  private calculateAccountBalance(
    vouchers: NhatKyChungEntry[],
    maTaiKhoan: string,
    type: 'NO' | 'CO',
    openingNet = 0,
  ): number {
    let balance = openingNet;

    for (const v of vouchers) {
      const maTKNo = v.danhMuc?.taiKhoanNo?.ma ?? v.taiKhoanNo;
      const maTKCo = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;

      if (maTKNo === maTaiKhoan) {
        balance += type === 'NO' ? v.soTien : -v.soTien;
      }
      if (maTKCo === maTaiKhoan) {
        balance += type === 'CO' ? v.soTien : -v.soTien;
      }
    }

    return Math.max(0, balance);
  }
}
