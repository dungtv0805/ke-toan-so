import { mockBalanceSheetData, BalanceSheetData, BalanceSheetItem } from '@/mock-data/balance-sheet';

export interface BalanceSheetStats {
  tongTaiSan: number;
  tongNguonVon: number;
  taiSanNganHan: number;
  taiSanDaiHan: number;
  noPhaiTra: number;
  vonChuSoHuu: number;
  tyLeNoTrenVon: number;
  tyLeTaiSanNganHan: number;
  canDoi: boolean;
}

export interface BalanceSheetComparison {
  chiTieu: string;
  dauNam: number;
  cuoiKy: number;
  chenhLech: number;
  tyLe: number;
}

export const balanceSheetService = {
  getData: async (): Promise<BalanceSheetData> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockBalanceSheetData;
  },

  getStats: async (): Promise<BalanceSheetStats> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const data = mockBalanceSheetData;
    
    // Find section totals
    const taiSanNganHan = data.taiSan.find(i => i.ma === 'A')?.cuoiKy || 0;
    const taiSanDaiHan = data.taiSan.find(i => i.ma === 'B')?.cuoiKy || 0;
    const noPhaiTra = data.nguonVon.find(i => i.ma === 'C')?.cuoiKy || 0;
    const vonChuSoHuu = data.nguonVon.find(i => i.ma === 'D')?.cuoiKy || 0;
    
    return {
      tongTaiSan: data.tongTaiSan.cuoiKy,
      tongNguonVon: data.tongNguonVon.cuoiKy,
      taiSanNganHan,
      taiSanDaiHan,
      noPhaiTra,
      vonChuSoHuu,
      tyLeNoTrenVon: vonChuSoHuu > 0 ? (noPhaiTra / vonChuSoHuu) * 100 : 0,
      tyLeTaiSanNganHan: data.tongTaiSan.cuoiKy > 0 ? (taiSanNganHan / data.tongTaiSan.cuoiKy) * 100 : 0,
      canDoi: data.canDoi,
    };
  },

  getComparison: async (): Promise<BalanceSheetComparison[]> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const data = mockBalanceSheetData;
    
    const taiSanNganHanDauNam = data.taiSan.find(i => i.ma === 'A')?.dauNam || 0;
    const taiSanNganHanCuoiKy = data.taiSan.find(i => i.ma === 'A')?.cuoiKy || 0;
    const taiSanDaiHanDauNam = data.taiSan.find(i => i.ma === 'B')?.dauNam || 0;
    const taiSanDaiHanCuoiKy = data.taiSan.find(i => i.ma === 'B')?.cuoiKy || 0;
    const noPhaiTraDauNam = data.nguonVon.find(i => i.ma === 'C')?.dauNam || 0;
    const noPhaiTraCuoiKy = data.nguonVon.find(i => i.ma === 'C')?.cuoiKy || 0;
    const vonChuSoHuuDauNam = data.nguonVon.find(i => i.ma === 'D')?.dauNam || 0;
    const vonChuSoHuuCuoiKy = data.nguonVon.find(i => i.ma === 'D')?.cuoiKy || 0;
    
    const items: BalanceSheetComparison[] = [
      {
        chiTieu: 'Tài sản ngắn hạn',
        dauNam: taiSanNganHanDauNam,
        cuoiKy: taiSanNganHanCuoiKy,
        chenhLech: taiSanNganHanCuoiKy - taiSanNganHanDauNam,
        tyLe: taiSanNganHanDauNam > 0 ? ((taiSanNganHanCuoiKy - taiSanNganHanDauNam) / taiSanNganHanDauNam) * 100 : 0,
      },
      {
        chiTieu: 'Tài sản dài hạn',
        dauNam: taiSanDaiHanDauNam,
        cuoiKy: taiSanDaiHanCuoiKy,
        chenhLech: taiSanDaiHanCuoiKy - taiSanDaiHanDauNam,
        tyLe: taiSanDaiHanDauNam > 0 ? ((taiSanDaiHanCuoiKy - taiSanDaiHanDauNam) / taiSanDaiHanDauNam) * 100 : 0,
      },
      {
        chiTieu: 'Tổng tài sản',
        dauNam: data.tongTaiSan.dauNam,
        cuoiKy: data.tongTaiSan.cuoiKy,
        chenhLech: data.tongTaiSan.cuoiKy - data.tongTaiSan.dauNam,
        tyLe: data.tongTaiSan.dauNam > 0 ? ((data.tongTaiSan.cuoiKy - data.tongTaiSan.dauNam) / data.tongTaiSan.dauNam) * 100 : 0,
      },
      {
        chiTieu: 'Nợ phải trả',
        dauNam: noPhaiTraDauNam,
        cuoiKy: noPhaiTraCuoiKy,
        chenhLech: noPhaiTraCuoiKy - noPhaiTraDauNam,
        tyLe: noPhaiTraDauNam > 0 ? ((noPhaiTraCuoiKy - noPhaiTraDauNam) / noPhaiTraDauNam) * 100 : 0,
      },
      {
        chiTieu: 'Vốn chủ sở hữu',
        dauNam: vonChuSoHuuDauNam,
        cuoiKy: vonChuSoHuuCuoiKy,
        chenhLech: vonChuSoHuuCuoiKy - vonChuSoHuuDauNam,
        tyLe: vonChuSoHuuDauNam > 0 ? ((vonChuSoHuuCuoiKy - vonChuSoHuuDauNam) / vonChuSoHuuDauNam) * 100 : 0,
      },
      {
        chiTieu: 'Tổng nguồn vốn',
        dauNam: data.tongNguonVon.dauNam,
        cuoiKy: data.tongNguonVon.cuoiKy,
        chenhLech: data.tongNguonVon.cuoiKy - data.tongNguonVon.dauNam,
        tyLe: data.tongNguonVon.dauNam > 0 ? ((data.tongNguonVon.cuoiKy - data.tongNguonVon.dauNam) / data.tongNguonVon.dauNam) * 100 : 0,
      },
    ];
    
    return items;
  },

  getFinancialRatios: async (): Promise<Array<{
    name: string;
    value: number;
    description: string;
    status: 'good' | 'warning' | 'bad';
  }>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const stats = await balanceSheetService.getStats();
    const data = mockBalanceSheetData;
    
    // Get current assets and liabilities for ratios
    const tienVaTuongDuong = (data.taiSan.find(i => i.ma === 'I')?.cuoiKy || 0);
    const noNganHan = (data.nguonVon.find(i => i.ma === 'I.C')?.cuoiKy || 0);
    const taiSanNganHan = stats.taiSanNganHan;
    
    return [
      {
        name: 'Hệ số thanh toán hiện hành',
        value: noNganHan > 0 ? taiSanNganHan / noNganHan : 0,
        description: 'Tài sản ngắn hạn / Nợ ngắn hạn',
        status: (taiSanNganHan / noNganHan) >= 1.5 ? 'good' : (taiSanNganHan / noNganHan) >= 1 ? 'warning' : 'bad',
      },
      {
        name: 'Hệ số thanh toán nhanh',
        value: noNganHan > 0 ? tienVaTuongDuong / noNganHan : 0,
        description: 'Tiền và tương đương tiền / Nợ ngắn hạn',
        status: (tienVaTuongDuong / noNganHan) >= 1 ? 'good' : (tienVaTuongDuong / noNganHan) >= 0.5 ? 'warning' : 'bad',
      },
      {
        name: 'Tỷ lệ nợ trên vốn chủ sở hữu',
        value: stats.tyLeNoTrenVon,
        description: 'Nợ phải trả / Vốn chủ sở hữu (%)',
        status: stats.tyLeNoTrenVon <= 50 ? 'good' : stats.tyLeNoTrenVon <= 100 ? 'warning' : 'bad',
      },
      {
        name: 'Tỷ lệ tự tài trợ',
        value: stats.tongTaiSan > 0 ? (stats.vonChuSoHuu / stats.tongTaiSan) * 100 : 0,
        description: 'Vốn chủ sở hữu / Tổng tài sản (%)',
        status: (stats.vonChuSoHuu / stats.tongTaiSan) >= 0.5 ? 'good' : (stats.vonChuSoHuu / stats.tongTaiSan) >= 0.3 ? 'warning' : 'bad',
      },
    ];
  },
};

export type { BalanceSheetItem, BalanceSheetData };
