import { buildStatsResponse } from './kiem-soat-stats.helper';

describe('buildStatsResponse', () => {
  it('bóc tách 4 nhóm kiểm soát từ dòng $group', () => {
    const stats = buildStatsResponse({
      tongSo: 10,
      tongPhatSinhNo: 400,
      tongPhatSinhCo: 600,
      tongGiaTri: 1000,
      hopLe_soLuong: 5,
      hopLe_giaTri: 500,
      chuaHopLe_soLuong: 2,
      chuaHopLe_giaTri: 200,
      khongHopLe_soLuong: 1,
      khongHopLe_giaTri: 100,
    });

    expect(stats.hopLe).toEqual({ soLuong: 5, giaTri: 500 });
    expect(stats.chuaHopLe).toEqual({ soLuong: 2, giaTri: 200 });
    expect(stats.khongHopLe).toEqual({ soLuong: 1, giaTri: 100 });
    // 10 - (5+2+1) = 2 bút toán chưa ai kiểm soát
    expect(stats.chuaKiemSoat).toEqual({ soLuong: 2, giaTri: 200 });
  });

  it('4 nhóm luôn cộng đúng bằng tổng, kể cả khi có trạng thái lạ', () => {
    // Dữ liệu cũ mang trạng thái ngoài 3 giá trị đã biết → aggregation không đếm vào
    // nhóm nào; phần dư phải rơi hết vào "chưa kiểm soát".
    const stats = buildStatsResponse({
      tongSo: 7,
      tongGiaTri: 700,
      hopLe_soLuong: 1,
      hopLe_giaTri: 100,
    });

    const soLuong =
      stats.hopLe.soLuong +
      stats.chuaHopLe.soLuong +
      stats.khongHopLe.soLuong +
      stats.chuaKiemSoat.soLuong;
    const giaTri =
      stats.hopLe.giaTri +
      stats.chuaHopLe.giaTri +
      stats.khongHopLe.giaTri +
      stats.chuaKiemSoat.giaTri;

    expect(soLuong).toBe(stats.tongSo);
    expect(giaTri).toBe(stats.tongGiaTri);
  });

  it('không có dòng nào (bộ lọc không khớp gì) → tất cả về 0', () => {
    const stats = buildStatsResponse(undefined);

    expect(stats.tongSo).toBe(0);
    expect(stats.tongGiaTri).toBe(0);
    expect(stats.hopLe).toEqual({ soLuong: 0, giaTri: 0 });
    expect(stats.chuaKiemSoat).toEqual({ soLuong: 0, giaTri: 0 });
  });
});
