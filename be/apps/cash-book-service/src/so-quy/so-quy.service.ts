import { Injectable } from '@nestjs/common';
import { ServiceClient } from '@app/service-client';
import type { NhatKyChungEntry } from '@app/dto';
import {
  buildSoQuy,
  type OpeningRow,
  type SoQuyEntry,
} from './so-quy.helper';

export type { SoQuyEntry } from './so-quy.helper';

export interface MonthlyReport {
  month: number;
  year: number;
  soDuDauKy: number;
  tongThu: number;
  tongChi: number;
  soDuCuoiKy: number;
  entries: SoQuyEntry[];
}

export interface CashBookStats {
  tonDauKy: number;
  tongThu: number;
  tongChi: number;
  tonCuoiKy: number;
  soPhieuThu: number;
  soPhieuChi: number;
}

@Injectable()
export class SoQuyService {
  constructor(private readonly serviceClient: ServiceClient) {}

  /**
   * Nạp toàn bộ chứng từ + số dư đầu kỳ nhập tay.
   *
   * Luôn lấy TẤT CẢ chứng từ (không lọc theo kỳ ở tầng HTTP) vì tồn đầu kỳ cần
   * phát sinh của các kỳ trước. `getNhatKyChung` tự phân trang — bản cũ gọi
   * thẳng `/nhat-ky-chung` không truyền limit nên chỉ nhận 15 chứng từ đầu.
   */
  private async load(
    authToken?: string,
  ): Promise<{ vouchers: NhatKyChungEntry[]; opening: OpeningRow[] }> {
    const [vouchersRes, openingRes] = await Promise.all([
      this.serviceClient.getNhatKyChung(undefined, undefined, authToken),
      this.serviceClient.getSoDuDauKyRaw(authToken),
    ]);

    return {
      vouchers: vouchersRes.success ? (vouchersRes.data ?? []) : [],
      opening: openingRes.success ? (openingRes.data?.items ?? []) : [],
    };
  }

  /**
   * Sổ quỹ toàn bộ thời gian, số dư luỹ kế bắt đầu từ số dư đầu kỳ.
   */
  async getSoQuy(authToken?: string): Promise<SoQuyEntry[]> {
    const { vouchers, opening } = await this.load(authToken);
    return buildSoQuy(vouchers, opening).entries;
  }

  async getByDateRange(
    startDate: Date,
    endDate: Date,
    authToken?: string,
  ): Promise<SoQuyEntry[]> {
    const { vouchers, opening } = await this.load(authToken);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return buildSoQuy(vouchers, opening, startDate, end).entries;
  }

  async getByMonth(
    month: number,
    year: number,
    authToken?: string,
  ): Promise<MonthlyReport> {
    const { vouchers, opening } = await this.load(authToken);
    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const r = buildSoQuy(vouchers, opening, startOfMonth, endOfMonth);

    return {
      month,
      year,
      soDuDauKy: r.tonDauKy,
      tongThu: r.tongThu,
      tongChi: r.tongChi,
      soDuCuoiKy: r.tonCuoiKy,
      entries: r.entries,
    };
  }

  async getStats(authToken?: string): Promise<CashBookStats> {
    const { vouchers, opening } = await this.load(authToken);
    const r = buildSoQuy(vouchers, opening);

    return {
      tonDauKy: r.tonDauKy,
      tongThu: r.tongThu,
      tongChi: r.tongChi,
      tonCuoiKy: r.tonCuoiKy,
      soPhieuThu: r.soPhieuThu,
      soPhieuChi: r.soPhieuChi,
    };
  }

  /**
   * Tìm theo số phiếu/nội dung. Lọc trên sổ đã dựng nên số dư luỹ kế của dòng
   * giữ nguyên giá trị trong sổ đầy đủ.
   */
  async search(keyword: string, authToken?: string): Promise<SoQuyEntry[]> {
    const entries = await this.getSoQuy(authToken);
    const lower = keyword.toLowerCase();
    return entries.filter(
      (e) =>
        e.soPhieu.toLowerCase().includes(lower) ||
        (e.noiDung || '').toLowerCase().includes(lower),
    );
  }

  async getDailySummary(
    authToken?: string,
  ): Promise<{ ngay: string; thu: number; chi: number; soDu: number }[]> {
    const entries = await this.getSoQuy(authToken);

    const dailyMap = new Map<
      string,
      { thu: number; chi: number; soDu: number }
    >();

    for (const entry of entries) {
      const dateKey = new Date(entry.ngay).toISOString().split('T')[0];
      const existing = dailyMap.get(dateKey) || { thu: 0, chi: 0, soDu: 0 };
      existing.thu += entry.thu;
      existing.chi += entry.chi;
      existing.soDu = entry.soDu; // số dư cuối cùng trong ngày
      dailyMap.set(dateKey, existing);
    }

    return Array.from(dailyMap.entries())
      .map(([ngay, data]) => ({ ngay, ...data }))
      .sort((a, b) => a.ngay.localeCompare(b.ngay));
  }
}
