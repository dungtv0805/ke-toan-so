/**
 * CHÍNH SÁCH LỖI CỦA FILE NÀY: **nuốt lỗi, trả giá trị mặc định** (0, `[]`,
 * `{}`). Mọi hàm dưới đây bọc lời gọi API trong `try/catch` rồi trả về giá trị
 * rỗng — cố ý giữ nguyên, KHÔNG đổi trong đợt sửa này.
 *
 * Hệ quả phải biết: API hỏng (mất mạng, 500, hết hạn token) thì bốn tab Tổng
 * quan · Dòng tiền · Kết quả kinh doanh · Công nợ **lặng lẽ hiện 0** thay vì
 * báo lỗi — người dùng không phân biệt được "công ty không có số liệu" với
 * "không tải được số liệu".
 *
 * `doanhSoService.ts` (tab Bán hàng) **cố ý làm khác**: ném lỗi ra để tab hiện
 * trạng thái lỗi thật. Đó không phải nhầm lẫn của một trong hai file — hai
 * chính sách cùng tồn tại có chủ đích; thống nhất chúng là việc của đợt sau.
 */
import { soQuyService } from './soQuyService';
import { balanceSheetService } from './balanceSheetService';
import { baoCaoReportService } from './baoCaoReportService';
import { congNoPhaiThuService } from './congNoPhaiThuService';
import { congNoPhaiTraService } from './congNoPhaiTraService';
import { phieuThuService, phieuChiService, type PhieuService } from './phieuService';
import { soCaiService, type TrialBalance } from './soCaiService';
import { kqkdService } from './kqkdService';
import type { KhoanPhaiThanhToan } from '@/pages/dashboard/lichThanhToan';

// ============ Types ============

export interface PnlSeriesPoint {
  thang: number;
  doanhThu: number;
  chiPhi: number;
  loiNhuan: number;
}

export interface CashSeriesPoint {
  thang: number;
  thu: number;
  chi: number;
  soDu: number;
}

/**
 * Chi tiết chuỗi dòng tiền theo từng TK tiền — nguồn cho tooltip "TK nào bao nhiêu
 * tiền" trên thẻ KPI. Giữ nguyên dạng CHUỖI (không gộp sẵn) vì dashboard cắt theo
 * khoảng tháng đang chọn; gộp sẵn ở đây là tooltip lệch với KPI ngay khi đổi kỳ.
 */
export interface CashAccountSeries {
  ma: string;
  ten: string;
  soDuDauKy: number;
  points: { thang: number; thu: number; chi: number }[];
}

export interface CashSeries {
  points: CashSeriesPoint[];
  taiKhoan: CashAccountSeries[];
}

export interface CongNoSeriesPoint {
  thang: number;
  tongPhaiThu: number;
  tongPhaiTra: number;
}

export interface CompositionSlice {
  ma: string;
  ten: string;
  soTien: number;
}

export interface BreakdownSlice {
  ten: string;
  soTien: number;
}

export interface PnlBreakdown {
  doanhThu: BreakdownSlice[];
  chiPhi: BreakdownSlice[];
}

export interface AgingBuckets {
  chuaDenHan: number;
  quaHan1_30: number;
  quaHan31_60: number;
  quaHan61_90: number;
  quaHanTren90: number;
}

export interface TopPartner {
  doiTuongId: string;
  doiTuongTen: string;
  conLai: number;
}

export interface OverdueRow {
  id: string;
  doiTuongTen: string;
  conLai: number;
  soNgayQuaHan: number;
  hanThanhToan?: string;
}

// ============ Helpers ============

function computeDelta(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

// ============ Service ============

export const dashboardService = {
  /** Doanh thu/chi phí/lợi nhuận theo tháng (12) hoặc theo tuần nếu truyền month. */
  async getPnlSeries(year: number, month?: number): Promise<PnlSeriesPoint[]> {
    try {
      const data = await baoCaoReportService.getPnlSeries(year, month);
      return data.map((p) => ({
        thang: p.thang,
        doanhThu: p.doanhThu ?? 0,
        chiPhi: p.chiPhi ?? 0,
        loiNhuan: p.loiNhuan ?? 0,
      }));
    } catch {
      return [];
    }
  },

  /** Tỷ trọng doanh thu/chi phí theo tài khoản trong khoảng kỳ. */
  async getPnlBreakdownByRange(year: number, startMonth: number, endMonth: number): Promise<PnlBreakdown> {
    try {
      const start = new Date(year, startMonth - 1, 1).toISOString();
      const end = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      const pnl = await baoCaoReportService.getPnl({ startDate: start, endDate: end, periodType: 'tuyChon' });
      return {
        doanhThu: (pnl.doanhThu ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
        chiPhi: (pnl.chiPhi ?? []).map((e) => ({ ten: e.ten, soTien: e.soTien })),
      };
    } catch {
      return { doanhThu: [], chiPhi: [] };
    }
  },

  /** Tỷ trọng lợi nhuận theo chiều (đối tượng/dự án/đội/sản phẩm) trong khoảng kỳ. */
  async getLoiNhuanBreakdown(
    year: number,
    startMonth: number,
    endMonth: number,
    dimension: string,
  ): Promise<BreakdownSlice[]> {
    try {
      const startDate = new Date(year, startMonth - 1, 1).toISOString();
      const endDate = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      return await baoCaoReportService.getLoiNhuanByDimension(startDate, endDate, dimension);
    } catch {
      return [];
    }
  },

  /** Tỷ trọng tiền thu/chi theo loại dòng tiền (cash-flow) trong khoảng kỳ. */
  async getCashCompositionByRange(
    which: 'thu' | 'chi',
    year: number,
    startMonth: number,
    endMonth: number,
  ): Promise<BreakdownSlice[]> {
    try {
      const startDate = new Date(year, startMonth - 1, 1).toISOString();
      const endDate = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      const service: PhieuService = which === 'thu' ? phieuThuService : phieuChiService;
      const rows = await service.getCashFlowComposition(which, { startDate, endDate });
      return rows
        .map((r) => ({ ten: r.ten ?? r.ma, soTien: Math.abs(r.soTien || 0) }))
        .filter((r) => r.soTien > 0);
    } catch {
      return [];
    }
  },

  /**
   * Dòng tiền theo tháng (hoặc theo tuần nếu truyền month): thu=Nợ 111/112, chi=Có 111/112.
   *
   * Số dư luỹ kế bắt đầu từ TỒN ĐẦU KỲ, không phải 0 — nếu không, "Tồn" hiển thị
   * chênh lệch thu chi trong kỳ và ra âm ngay khi công ty tiêu vào số dư mang sang.
   */
  async getCashSeries(year: number, month?: number): Promise<CashSeries> {
    const buckets = month ? 5 : 12;
    const rong = (): CashSeriesPoint[] =>
      Array.from({ length: buckets }, (_, i) => ({ thang: i + 1, thu: 0, chi: 0, soDu: 0 }));
    try {
      const { soDuDauKy, series, taiKhoan } = await phieuThuService.getCashFlowSeries(year, month);
      const by = new Map(series.map((r) => [r.thang, r]));
      let soDu = soDuDauKy;
      const points = Array.from({ length: buckets }, (_, i) => {
        const r = by.get(i + 1);
        const thu = r?.thu || 0;
        const chi = r?.chi || 0;
        soDu += thu - chi;
        return { thang: i + 1, thu, chi, soDu };
      });
      return {
        points,
        taiKhoan: taiKhoan.map((tk) => {
          const byTk = new Map(tk.series.map((r) => [r.thang, r]));
          return {
            ma: tk.ma,
            ten: tk.ten || '',
            soDuDauKy: tk.soDuDauKy || 0,
            points: Array.from({ length: buckets }, (_, i) => ({
              thang: i + 1,
              thu: byTk.get(i + 1)?.thu || 0,
              chi: byTk.get(i + 1)?.chi || 0,
            })),
          };
        }),
      };
    } catch {
      return { points: rong(), taiKhoan: [] };
    }
  },

  /** Bảng cân đối phát sinh của kỳ — nguồn cho KPI tiền/tồn kho và bảng đối chiếu. */
  async getTrialBalance(year: number, startMonth: number, endMonth: number): Promise<TrialBalance[]> {
    try {
      const start = new Date(year, startMonth - 1, 1).toISOString();
      const end = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      return await soCaiService.getTrialBalance(start, end);
    } catch {
      return [];
    }
  },

  /** Toàn bộ chỉ tiêu KQKD của kỳ, tra theo mã ('01', '11', '20', ...). */
  async getKqkdChiTieu(
    year: number,
    startMonth: number,
    endMonth: number,
  ): Promise<Record<string, number>> {
    try {
      const startDate = new Date(year, startMonth - 1, 1).toISOString();
      const endDate = new Date(year, endMonth, 0, 23, 59, 59, 999).toISOString();
      const report = await kqkdService.getData({ startDate, endDate, periodType: 'tuyChon' });
      const out: Record<string, number> = {};
      for (const c of report.chiTieu) out[c.ma] = c.kyHienTai;
      // BE chưa trả `ebitda` (FE lên trước BE) thì KHÔNG đặt khoá — để tab hiện
      // "—". Gán 0 sẽ ra một số 0 ₫ nằm giữa bảy con số đúng, kèm tooltip tự tin
      // giải thích công thức: kế toán đọc thành "công ty không có EBITDA".
      if (report.ebitda) out.ebitda = report.ebitda.kyHienTai;
      return out;
    } catch {
      return {};
    }
  },

  /**
   * Số dư công nợ phải thu/phải trả lũy kế đến cuối mỗi kỳ (tháng, hoặc tuần nếu truyền month).
   * Nguồn: số dư Nợ/Có của các TK có gán đối tượng (KH/NCC/nhà thầu/NV).
   */
  async getCongNoSeries(year: number, month?: number): Promise<CongNoSeriesPoint[]> {
    try {
      const rows = await baoCaoReportService.getCongNoSeries(year, month);
      return rows.map((r) => ({
        thang: r.thang,
        tongPhaiThu: r.phaiThu ?? 0,
        tongPhaiTra: r.phaiTra ?? 0,
      }));
    } catch {
      return [];
    }
  },

  /** Cơ cấu tài sản (top-level groups của balance sheet). */
  async getAssetComposition(): Promise<CompositionSlice[]> {
    try {
      const stats = await balanceSheetService.getStats();
      return [
        { ma: 'NH', ten: 'Tài sản ngắn hạn', soTien: stats.taiSanNganHan },
        { ma: 'DH', ten: 'Tài sản dài hạn', soTien: stats.taiSanDaiHan },
      ].filter((s) => s.soTien !== 0);
    } catch {
      return [];
    }
  },

  /** Cơ cấu nguồn vốn. */
  async getSourceComposition(): Promise<CompositionSlice[]> {
    try {
      const stats = await balanceSheetService.getStats();
      return [
        { ma: 'NPT', ten: 'Nợ phải trả', soTien: stats.noPhaiTra },
        { ma: 'VCSH', ten: 'Vốn chủ sở hữu', soTien: stats.vonChuSoHuu },
      ].filter((s) => s.soTien !== 0);
    } catch {
      return [];
    }
  },

  /** Tuổi nợ phải thu (5 nhóm). */
  async getArAging(): Promise<AgingBuckets> {
    try {
      return await congNoPhaiThuService.getAgingReport();
    } catch {
      return { chuaDenHan: 0, quaHan1_30: 0, quaHan31_60: 0, quaHan61_90: 0, quaHanTren90: 0 };
    }
  },

  /** Tuổi nợ phải trả (5 nhóm). */
  async getApAging(): Promise<AgingBuckets> {
    try {
      return await congNoPhaiTraService.getAgingReport();
    } catch {
      return { chuaDenHan: 0, quaHan1_30: 0, quaHan31_60: 0, quaHan61_90: 0, quaHanTren90: 0 };
    }
  },

  /** Top 5 khách hàng còn phải thu. */
  async getTopReceivables(): Promise<TopPartner[]> {
    try {
      const data = await congNoPhaiThuService.getSummaryByCustomer();
      return data
        .map((d) => ({
          doiTuongId: d.doiTuongId,
          doiTuongTen: d.doiTuongTen || d.doiTuongId,
          conLai: d.conLai || 0,
        }))
        .sort((a, b) => b.conLai - a.conLai)
        .slice(0, 5);
    } catch {
      return [];
    }
  },

  /** Top 5 NCC còn phải trả. */
  async getTopPayables(): Promise<TopPartner[]> {
    try {
      const data = await congNoPhaiTraService.getSummaryBySupplier();
      return data
        .map((d) => ({
          doiTuongId: d.doiTuongId,
          doiTuongTen: d.doiTuongTen || d.doiTuongId,
          conLai: d.conLai || 0,
        }))
        .sort((a, b) => b.conLai - a.conLai)
        .slice(0, 5);
    } catch {
      return [];
    }
  },

  /** Công nợ phải thu quá hạn. */
  async getOverdueAr(): Promise<OverdueRow[]> {
    try {
      const data = await congNoPhaiThuService.getQuaHan();
      return data
        .map((d) => ({
          id: d.id || d._id || '',
          doiTuongTen: d.doiTuongTen || d.doiTuongId || '',
          conLai: d.conLai || 0,
          soNgayQuaHan: d.soNgayQuaHan || 0,
          hanThanhToan: d.hanThanhToan,
        }))
        .sort((a, b) => b.soNgayQuaHan - a.soNgayQuaHan);
    } catch {
      return [];
    }
  },

  /** Công nợ phải trả quá hạn. */
  async getOverdueAp(): Promise<OverdueRow[]> {
    try {
      const data = await congNoPhaiTraService.getQuaHan();
      return data
        .map((d) => ({
          id: d.id || d._id || '',
          doiTuongTen: d.doiTuongTen || d.doiTuongId || '',
          conLai: d.conLai || 0,
          soNgayQuaHan: d.soNgayQuaHan || 0,
          hanThanhToan: d.hanThanhToan,
        }))
        .sort((a, b) => b.soNgayQuaHan - a.soNgayQuaHan);
    } catch {
      return [];
    }
  },

  /**
   * Toàn bộ khoản phải thu / phải trả còn dư, kèm hạn thanh toán.
   * `/payable/phai-thu` và `/payable/phai-tra` gọi findAll() nên trả đủ bản ghi,
   * không phân trang.
   */
  async getKhoanPhaiThanhToan(loai: 'thu' | 'tra'): Promise<KhoanPhaiThanhToan[]> {
    try {
      const rows =
        loai === 'thu'
          ? await congNoPhaiThuService.getAll()
          : await congNoPhaiTraService.getAll();
      return rows.map((r) => ({ hanThanhToan: r.hanThanhToan, conLai: r.conLai }));
    } catch {
      return [];
    }
  },
};
