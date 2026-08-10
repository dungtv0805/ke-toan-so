import { describe, it, expect } from 'vitest';
import type { TrialBalance } from '@/services/soCaiService';
import { tongTien, giaTriTonKho, tienTheoTaiKhoan, doiChieuCongNo } from './trialBalanceDerive';

const tk = (o: Partial<TrialBalance> & { taiKhoan: string }): TrialBalance => ({
  tenTaiKhoan: o.taiKhoan,
  soDuDauKyNo: 0,
  soDuDauKyCo: 0,
  phatSinhNo: 0,
  phatSinhCo: 0,
  soDuCuoiKyNo: 0,
  soDuCuoiKyCo: 0,
  ...o,
});

describe('tongTien', () => {
  it('cộng dư cuối kỳ của TK 111 và 112, trừ dư Có', () => {
    const tb = [
      tk({ taiKhoan: '1111', soDuCuoiKyNo: 300 }),
      tk({ taiKhoan: '1121', soDuCuoiKyNo: 500, soDuCuoiKyCo: 100 }),
      tk({ taiKhoan: '131', soDuCuoiKyNo: 9999 }),
    ];
    expect(tongTien(tb)).toBe(700);
  });

  it('không tính TK 113 (tiền đang chuyển)', () => {
    expect(tongTien([tk({ taiKhoan: '113', soDuCuoiKyNo: 400 })])).toBe(0);
  });

  it('mảng rỗng → 0', () => {
    expect(tongTien([])).toBe(0);
  });
});

describe('giaTriTonKho', () => {
  it('cộng dư cuối kỳ mọi TK bắt đầu bằng 15', () => {
    const tb = [
      tk({ taiKhoan: '152', soDuCuoiKyNo: 200 }),
      tk({ taiKhoan: '156', soDuCuoiKyNo: 300 }),
      tk({ taiKhoan: '1591', soDuCuoiKyCo: 50 }),
      tk({ taiKhoan: '211', soDuCuoiKyNo: 1000 }),
    ];
    expect(giaTriTonKho(tb)).toBe(450);
  });
});

describe('tienTheoTaiKhoan', () => {
  it('trả TK tiền kèm chi tiết từng quỹ/ngân hàng, TK cha đứng trước con', () => {
    const tb = [
      tk({
        taiKhoan: '1121',
        tenTaiKhoan: 'Tiền gửi ngân hàng',
        tenTaiKhoanNH: 'TK 1121 - Vietcombank',
        soDuDauKyNo: 1000,
        soDuDauKyCo: 100,
        phatSinhNo: 500,
        phatSinhCo: 200,
        soDuCuoiKyNo: 1300,
        soDuCuoiKyCo: 50,
        doiTuongChiTiet: [
          tk({ taiKhoan: 'VCB', tenTaiKhoan: 'Vietcombank', soDuDauKyNo: 1000, phatSinhNo: 500, phatSinhCo: 200, soDuCuoiKyNo: 1300 }),
        ],
      }),
    ];
    const rows = tienTheoTaiKhoan(tb);
    expect(rows.map((r) => r.ma)).toEqual(['1121', 'VCB']);
    // dư = Nợ − Có (quy ước TK dư Nợ), có cả hai vế Nợ/Có khác 0 để pin đúng công thức
    expect(rows[0].duDauKy).toBe(900); // 1000 - 100
    expect(rows[0].duCuoiKy).toBe(1250); // 1300 - 50
    // dòng cha ưu tiên tenTaiKhoanNH khi có, dòng con (quỹ/ngân hàng) không có tenTaiKhoanNH nên dùng tenTaiKhoan
    expect(rows[0].ten).toBe('TK 1121 - Vietcombank');
    expect(rows[1].ten).toBe('Vietcombank');
  });

  it('bỏ qua TK không phải tiền', () => {
    expect(tienTheoTaiKhoan([tk({ taiKhoan: '331', soDuCuoiKyCo: 100 })])).toEqual([]);
  });
});

describe('doiChieuCongNo', () => {
  it('loại "thu": lấy TK 131/136/138, tăng = phát sinh Nợ', () => {
    const tb = [
      tk({
        taiKhoan: '131',
        doiTuongChiTiet: [
          tk({ taiKhoan: 'KH01', tenTaiKhoan: 'Công ty A', soDuDauKyNo: 100, phatSinhNo: 500, phatSinhCo: 300, soDuCuoiKyNo: 300 }),
        ],
      }),
      tk({ taiKhoan: '331', doiTuongChiTiet: [tk({ taiKhoan: 'NCC01', tenTaiKhoan: 'NCC B', soDuCuoiKyCo: 700 })] }),
    ];
    const rows = doiChieuCongNo(tb, 'thu');
    expect(rows).toEqual([
      { doiTuong: 'Công ty A', duDauKy: 100, phatSinhTang: 500, phatSinhGiam: 300, duCuoiKy: 300 },
    ]);
  });

  it('loại "tra": lấy TK 331/336/338, tăng = phát sinh Có, số dư lấy bên Có', () => {
    const tb = [
      tk({
        taiKhoan: '331',
        doiTuongChiTiet: [
          tk({ taiKhoan: 'NCC01', tenTaiKhoan: 'NCC B', soDuDauKyCo: 200, phatSinhNo: 100, phatSinhCo: 600, soDuCuoiKyCo: 700 }),
        ],
      }),
    ];
    expect(doiChieuCongNo(tb, 'tra')).toEqual([
      { doiTuong: 'NCC B', duDauKy: 200, phatSinhTang: 600, phatSinhGiam: 100, duCuoiKy: 700 },
    ]);
  });

  it('gộp cùng một đối tượng xuất hiện ở nhiều tài khoản', () => {
    const tb = [
      tk({ taiKhoan: '131', doiTuongChiTiet: [tk({ taiKhoan: 'KH01', tenTaiKhoan: 'A', phatSinhNo: 100, soDuCuoiKyNo: 100 })] }),
      tk({ taiKhoan: '138', doiTuongChiTiet: [tk({ taiKhoan: 'KH01', tenTaiKhoan: 'A', phatSinhNo: 50, soDuCuoiKyNo: 50 })] }),
    ];
    const rows = doiChieuCongNo(tb, 'thu');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ doiTuong: 'A', phatSinhTang: 150, duCuoiKy: 150 });
  });

  it('hai đối tượng khác mã nhưng trùng tên hiển thị → hai dòng riêng (gộp theo mã, không theo tên)', () => {
    const tb = [
      tk({
        taiKhoan: '131',
        doiTuongChiTiet: [
          tk({ taiKhoan: 'KH01', tenTaiKhoan: 'Công ty ABC', phatSinhNo: 100, soDuCuoiKyNo: 100 }),
          tk({ taiKhoan: 'KH02', tenTaiKhoan: 'Công ty ABC', phatSinhNo: 200, soDuCuoiKyNo: 200 }),
        ],
      }),
    ];
    const rows = doiChieuCongNo(tb, 'thu');
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.doiTuong === 'Công ty ABC')).toBe(true);
    expect(rows.map((r) => r.duCuoiKy).sort((a, b) => a - b)).toEqual([100, 200]);
  });

  it('cùng một mã nhưng tên ghi lệch giữa hai tài khoản → gộp một dòng, hiển thị tên xuất hiện đầu tiên', () => {
    const tb = [
      tk({ taiKhoan: '131', doiTuongChiTiet: [tk({ taiKhoan: 'KH01', tenTaiKhoan: 'Cty A (chi nhánh 1)', phatSinhNo: 100, soDuCuoiKyNo: 100 })] }),
      tk({ taiKhoan: '138', doiTuongChiTiet: [tk({ taiKhoan: 'KH01', tenTaiKhoan: 'Cty A', phatSinhNo: 50, soDuCuoiKyNo: 50 })] }),
    ];
    const rows = doiChieuCongNo(tb, 'thu');
    expect(rows).toHaveLength(1);
    // tên hiển thị lấy từ lần xuất hiện đầu tiên của mã 'KH01' trong mảng tb (TK 131 đứng trước 138)
    expect(rows[0]).toMatchObject({ doiTuong: 'Cty A (chi nhánh 1)', phatSinhTang: 150, duCuoiKy: 150 });
  });

  it('TK công nợ không có doiTuongChiTiet → bỏ qua, không ném lỗi', () => {
    expect(doiChieuCongNo([tk({ taiKhoan: '131', soDuCuoiKyNo: 500 })], 'thu')).toEqual([]);
  });

  it('sắp xếp giảm dần theo số dư cuối kỳ', () => {
    const tb = [
      tk({
        taiKhoan: '131',
        doiTuongChiTiet: [
          tk({ taiKhoan: 'A', tenTaiKhoan: 'A', soDuCuoiKyNo: 100 }),
          tk({ taiKhoan: 'B', tenTaiKhoan: 'B', soDuCuoiKyNo: 900 }),
        ],
      }),
    ];
    expect(doiChieuCongNo(tb, 'thu').map((r) => r.doiTuong)).toEqual(['B', 'A']);
  });
});
