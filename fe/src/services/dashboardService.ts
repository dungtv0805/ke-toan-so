import { thongKeTongQuan, bieuDoThuChi, congNoQuaHan, chungTuGanDay } from '@/mock-data/dashboard';

export const dashboardService = {
  getThongKeTongQuan: async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    return thongKeTongQuan;
  },

  getBieuDoThuChi: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return bieuDoThuChi;
  },

  getCongNoQuaHan: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return congNoQuaHan;
  },

  getChungTuGanDay: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return chungTuGanDay;
  },
};
