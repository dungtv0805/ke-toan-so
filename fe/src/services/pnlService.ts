import { BaoCaoPnL } from '@/types';
import { mockPnLData, pnlCategories, monthlyPnLData, MonthlyPnL, PnLCategory } from '@/mock-data/bao-cao';

export interface PnLSummary {
  tongDoanhThu: number;
  tongGiaVon: number;
  loiNhuanGop: number;
  tongChiPhiBanHang: number;
  tongChiPhiQuanLy: number;
  tongChiPhiTaiChinh: number;
  loiNhuanTruocThue: number;
  thue: number;
  loiNhuanSauThue: number;
  tyLeLoiNhuanGop: number;
  tyLeLoiNhuanRong: number;
}

export interface PnLGroupedData {
  category: PnLCategory;
  items: BaoCaoPnL[];
  subtotal: {
    thangTruoc: number;
    thangNay: number;
    luyKe: number;
    keHoach: number;
    chenhLech: number;
  };
}

export const pnlService = {
  getPnLData: async (): Promise<BaoCaoPnL[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockPnLData;
  },

  getGroupedPnLData: async (): Promise<PnLGroupedData[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return pnlCategories.map(category => {
      const items = mockPnLData.filter(item => category.items.includes(item.khoanMuc));
      const subtotal = items.reduce((acc, item) => ({
        thangTruoc: acc.thangTruoc + item.thangTruoc,
        thangNay: acc.thangNay + item.thangNay,
        luyKe: acc.luyKe + item.luyKe,
        keHoach: acc.keHoach + item.keHoach,
        chenhLech: acc.chenhLech + item.chenhLech,
      }), { thangTruoc: 0, thangNay: 0, luyKe: 0, keHoach: 0, chenhLech: 0 });
      
      return { category, items, subtotal };
    });
  },

  getMonthlyPnL: async (): Promise<MonthlyPnL[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return monthlyPnLData;
  },

  getSummary: async (period: 'thangNay' | 'thangTruoc' | 'luyKe'): Promise<PnLSummary> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const revenueCategories = pnlCategories.filter(c => c.type === 'revenue');
    const giaVonCategory = pnlCategories.find(c => c.key === 'gia_von');
    const chiPhiBanHangCategory = pnlCategories.find(c => c.key === 'chi_phi_ban_hang');
    const chiPhiQuanLyCategory = pnlCategories.find(c => c.key === 'chi_phi_quan_ly');
    const chiPhiTaiChinhCategory = pnlCategories.find(c => c.key === 'chi_phi_tai_chinh');
    
    const getTotal = (items: string[]) => {
      return mockPnLData
        .filter(item => items.includes(item.khoanMuc))
        .reduce((sum, item) => sum + item[period], 0);
    };
    
    const tongDoanhThu = revenueCategories.reduce((sum, cat) => sum + getTotal(cat.items), 0);
    const tongGiaVon = Math.abs(getTotal(giaVonCategory?.items || []));
    const loiNhuanGop = tongDoanhThu - tongGiaVon;
    const tongChiPhiBanHang = Math.abs(getTotal(chiPhiBanHangCategory?.items || []));
    const tongChiPhiQuanLy = Math.abs(getTotal(chiPhiQuanLyCategory?.items || []));
    const tongChiPhiTaiChinh = Math.abs(getTotal(chiPhiTaiChinhCategory?.items || []));
    const loiNhuanTruocThue = loiNhuanGop - tongChiPhiBanHang - tongChiPhiQuanLy - tongChiPhiTaiChinh;
    const thue = loiNhuanTruocThue > 0 ? loiNhuanTruocThue * 0.2 : 0;
    const loiNhuanSauThue = loiNhuanTruocThue - thue;
    
    return {
      tongDoanhThu,
      tongGiaVon,
      loiNhuanGop,
      tongChiPhiBanHang,
      tongChiPhiQuanLy,
      tongChiPhiTaiChinh,
      loiNhuanTruocThue,
      thue,
      loiNhuanSauThue,
      tyLeLoiNhuanGop: tongDoanhThu > 0 ? (loiNhuanGop / tongDoanhThu) * 100 : 0,
      tyLeLoiNhuanRong: tongDoanhThu > 0 ? (loiNhuanSauThue / tongDoanhThu) * 100 : 0,
    };
  },

  getYTDSummary: async (): Promise<{
    tongDoanhThu: number;
    tongChiPhi: number;
    loiNhuan: number;
    soThang: number;
  }> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const tongDoanhThu = monthlyPnLData.reduce((sum, m) => sum + m.doanhThu, 0);
    const tongChiPhi = monthlyPnLData.reduce((sum, m) => sum + m.giaVon + m.chiPhiBanHang + m.chiPhiQuanLy + m.chiPhiTaiChinh, 0);
    const loiNhuan = monthlyPnLData.reduce((sum, m) => sum + m.loiNhuanSauThue, 0);
    
    return {
      tongDoanhThu,
      tongChiPhi,
      loiNhuan,
      soThang: monthlyPnLData.length
    };
  }
};
