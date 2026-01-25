import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import type { TaiKhoanResponse, NhatKyChungEntry } from '@app/dto';

export interface SoCaiEntry {
  ngay: Date;
  soPhieu: string;
  noiDung: string;
  no: number;
  co: number;
  soDu: number;
}

export interface LedgerReport {
  taiKhoan: { ma: string; ten: string; loai: string };
  soDuDauKy: number;
  entries: SoCaiEntry[];
  tongNo: number;
  tongCo: number;
  soDuCuoiKy: number;
}

export interface TrialBalanceEntry {
  ma: string;
  ten: string;
  noDauKy: number;
  coDauKy: number;
  noPhatSinh: number;
  coPhatSinh: number;
  noCuoiKy: number;
  coCuoiKy: number;
}

/**
 * Helper to extract taiKhoanNo from voucher entry
 * Supports both legacy field and new danhMuc structure
 */
function getTaiKhoanNo(v: NhatKyChungEntry): string {
  return v.taiKhoanNo || v.danhMuc?.taiKhoanNo?.ma || '';
}

/**
 * Helper to extract taiKhoanCo from voucher entry
 * Supports both legacy field and new danhMuc structure
 */
function getTaiKhoanCo(v: NhatKyChungEntry): string {
  return v.taiKhoanCo || v.danhMuc?.taiKhoanCo?.ma || '';
}

@Injectable()
export class SoCaiService {
  constructor(private readonly serviceClient: ServiceClient) {}

  /**
   * Get general ledger for a specific account
   */
  async getLedger(
    maTaiKhoan: string,
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<LedgerReport> {
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

    const account = accounts.find((a) => a.ma === maTaiKhoan);
    if (!account) {
      return {
        taiKhoan: { ma: maTaiKhoan, ten: 'Unknown', loai: 'NO' },
        soDuDauKy: 0,
        entries: [],
        tongNo: 0,
        tongCo: 0,
        soDuCuoiKy: 0,
      };
    }

    // Filter vouchers that affect this account
    const relevantVouchers = vouchers.filter(
      (v) => getTaiKhoanNo(v) === maTaiKhoan || getTaiKhoanCo(v) === maTaiKhoan,
    );

    // Calculate running balance based on account type
    const entries: SoCaiEntry[] = [];
    let soDu = 0;
    let tongNo = 0;
    let tongCo = 0;

    const sorted = [...relevantVouchers].sort(
      (a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
    );

    for (const v of sorted) {
      const no = getTaiKhoanNo(v) === maTaiKhoan ? v.soTien : 0;
      const co = getTaiKhoanCo(v) === maTaiKhoan ? v.soTien : 0;

      // For debit accounts (NO): balance increases with debits
      // For credit accounts (CO): balance increases with credits
      if (account.loai === 'NO') {
        soDu = soDu + no - co;
      } else {
        soDu = soDu + co - no;
      }

      tongNo += no;
      tongCo += co;

      entries.push({
        ngay: new Date(v.ngay),
        soPhieu: v.soPhieu,
        noiDung: v.noiDung,
        no,
        co,
        soDu,
      });
    }

    return {
      taiKhoan: { ma: account.ma, ten: account.ten, loai: account.loai },
      soDuDauKy: 0,
      entries,
      tongNo,
      tongCo,
      soDuCuoiKy: soDu,
    };
  }

  /**
   * Get all ledger entries across all accounts
   */
  async getAll(authToken?: string): Promise<LedgerReport[]> {
    const [vouchersRes, accountsRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(undefined, undefined, authToken),
      this.serviceClient.getTaiKhoan(authToken),
    ]);

    const vouchers = vouchersRes.success ? vouchersRes.data || [] : [];
    const accounts = accountsRes.success ? accountsRes.data || [] : [];

    const reports: LedgerReport[] = [];

    for (const account of accounts) {
      const relevantVouchers = vouchers.filter(
        (v) =>
          getTaiKhoanNo(v) === account.ma || getTaiKhoanCo(v) === account.ma,
      );

      if (relevantVouchers.length === 0) continue;

      const entries: SoCaiEntry[] = [];
      let soDu = 0;
      let tongNo = 0;
      let tongCo = 0;

      const sorted = [...relevantVouchers].sort(
        (a, b) => new Date(a.ngay).getTime() - new Date(b.ngay).getTime(),
      );

      for (const v of sorted) {
        const no = getTaiKhoanNo(v) === account.ma ? v.soTien : 0;
        const co = getTaiKhoanCo(v) === account.ma ? v.soTien : 0;

        if (account.loai === 'NO') {
          soDu = soDu + no - co;
        } else {
          soDu = soDu + co - no;
        }

        tongNo += no;
        tongCo += co;

        entries.push({
          ngay: new Date(v.ngay),
          soPhieu: v.soPhieu,
          noiDung: v.noiDung,
          no,
          co,
          soDu,
        });
      }

      reports.push({
        taiKhoan: { ma: account.ma, ten: account.ten, loai: account.loai },
        soDuDauKy: 0,
        entries,
        tongNo,
        tongCo,
        soDuCuoiKy: soDu,
      });
    }

    return reports;
  }

  /**
   * Get summary by account
   */
  async getSummaryByAccount(authToken?: string): Promise<
    {
      ma: string;
      ten: string;
      soDuDauKy: number;
      phatSinh: number;
      soDuCuoiKy: number;
    }[]
  > {
    const reports = await this.getAll(authToken);
    return reports.map((r) => ({
      ma: r.taiKhoan.ma,
      ten: r.taiKhoan.ten,
      soDuDauKy: r.soDuDauKy,
      phatSinh: r.tongNo + r.tongCo,
      soDuCuoiKy: r.soDuCuoiKy,
    }));
  }

  /**
   * Get ledger statistics
   */
  async getStats(authToken?: string): Promise<{
    soTaiKhoan: number;
    tongPhatSinhNo: number;
    tongPhatSinhCo: number;
    canDoi: boolean;
  }> {
    const reports = await this.getAll(authToken);
    const tongPhatSinhNo = reports.reduce((sum, r) => sum + r.tongNo, 0);
    const tongPhatSinhCo = reports.reduce((sum, r) => sum + r.tongCo, 0);

    return {
      soTaiKhoan: reports.length,
      tongPhatSinhNo,
      tongPhatSinhCo,
      canDoi: tongPhatSinhNo === tongPhatSinhCo,
    };
  }

  /**
   * Generate trial balance report
   */
  async getTrialBalance(
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<{ entries: TrialBalanceEntry[]; totals: TrialBalanceEntry }> {
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

    const balances = new Map<
      string,
      { no: number; co: number; account: TaiKhoanResponse }
    >();

    // Initialize all accounts
    for (const account of accounts) {
      balances.set(account.ma, { no: 0, co: 0, account });
    }

    // Aggregate voucher amounts
    for (const v of vouchers) {
      const tkNo = getTaiKhoanNo(v);
      const tkCo = getTaiKhoanCo(v);

      if (tkNo) {
        const noBalance = balances.get(tkNo);
        if (noBalance) {
          noBalance.no += v.soTien;
        }
      }

      if (tkCo) {
        const coBalance = balances.get(tkCo);
        if (coBalance) {
          coBalance.co += v.soTien;
        }
      }
    }

    // Build trial balance entries
    const entries: TrialBalanceEntry[] = [];
    let totalNo = 0;
    let totalCo = 0;

    for (const [ma, data] of balances) {
      if (data.no === 0 && data.co === 0) continue;

      const noCuoiKy = data.account.loai === 'NO' ? data.no - data.co : 0;
      const coCuoiKy = data.account.loai === 'CO' ? data.co - data.no : 0;

      entries.push({
        ma,
        ten: data.account.ten,
        noDauKy: 0,
        coDauKy: 0,
        noPhatSinh: data.no,
        coPhatSinh: data.co,
        noCuoiKy: Math.max(0, noCuoiKy),
        coCuoiKy: Math.max(0, coCuoiKy),
      });

      totalNo += data.no;
      totalCo += data.co;
    }

    // Sort by account code
    entries.sort((a, b) => a.ma.localeCompare(b.ma));

    return {
      entries,
      totals: {
        ma: '',
        ten: 'Tổng cộng',
        noDauKy: 0,
        coDauKy: 0,
        noPhatSinh: totalNo,
        coPhatSinh: totalCo,
        noCuoiKy: totalNo,
        coCuoiKy: totalCo,
      },
    };
  }
}
