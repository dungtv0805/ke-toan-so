import type { NhatKyChungEntry } from '@app/dto';
import { ServiceClient } from '@app/service-client';
import { Injectable } from '@nestjs/common';

export interface PnLEntry {
  ma: string;
  ten: string;
  soTien: number;
}

export interface PnLReport {
  doanhThu: PnLEntry[];
  chiPhi: PnLEntry[];
  tongDoanhThu: number;
  tongChiPhi: number;
  loiNhuan: number;
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

@Injectable()
export class BaoCaoService {
  constructor(private readonly serviceClient: ServiceClient) {}

  /**
   * Generate Profit & Loss report
   */
  async getPnL(
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<PnLReport> {
    const [vouchersRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        startDate.toISOString(),
        endDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    // Revenue accounts typically start with 5xx
    // Expense accounts typically start with 6xx
    const revenueAccounts = accounts.filter((a) => a.ma.startsWith('5'));
    const expenseAccounts = accounts.filter((a) => a.ma.startsWith('6'));

    const doanhThu: PnLEntry[] = [];
    const chiPhi: PnLEntry[] = [];

    // Calculate revenue
    for (const account of revenueAccounts) {
      const amount = this.calculateAccountBalance(vouchers, account.ma, 'CO');
      if (amount !== 0) {
        doanhThu.push({ ma: account.ma, ten: account.ten, soTien: amount });
      }
    }

    // Calculate expenses
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
  }

  /**
   * Generate Balance Sheet report
   */
  async getBalanceSheet(
    asOfDate: Date,
    authToken?: string,
  ): Promise<BalanceSheetReport> {
    const [vouchersRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(
        '2000-01-01',
        asOfDate.toISOString(),
        authToken,
      ),
      this.serviceClient.getTaiKhoan(authToken),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    // Asset accounts typically start with 1xx, 2xx
    // Liability accounts typically start with 3xx
    // Equity accounts typically start with 4xx
    const assetAccounts = accounts.filter(
      (a) => a.ma.startsWith('1') || a.ma.startsWith('2'),
    );
    const liabilityAccounts = accounts.filter(
      (a) => a.ma.startsWith('3') || a.ma.startsWith('4'),
    );

    const taiSan: BalanceSheetEntry[] = [];
    const nguonVon: BalanceSheetEntry[] = [];

    // Calculate assets (debit balance)
    for (const account of assetAccounts) {
      const amount = this.calculateAccountBalance(vouchers, account.ma, 'NO');
      if (amount !== 0) {
        taiSan.push({ ma: account.ma, ten: account.ten, soTien: amount });
      }
    }

    // Calculate liabilities & equity (credit balance)
    for (const account of liabilityAccounts) {
      const amount = this.calculateAccountBalance(vouchers, account.ma, 'CO');
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

  private calculateAccountBalance(
    vouchers: NhatKyChungEntry[],
    maTaiKhoan: string,
    type: 'NO' | 'CO',
  ): number {
    let balance = 0;

    for (const v of vouchers) {
      if (v.taiKhoanNo === maTaiKhoan) {
        balance += type === 'NO' ? v.soTien : -v.soTien;
      }
      if (v.taiKhoanCo === maTaiKhoan) {
        balance += type === 'CO' ? v.soTien : -v.soTien;
      }
    }

    return Math.max(0, balance);
  }
}
