import {
  chayKetChuyen,
  dungBangSoDu,
  type DongDanhMucKetChuyen,
} from './ket-chuyen.engine';

const DANH_MUC: DongDanhMucKetChuyen[] = [
  { ma: '911-4212', thuTu: 99, taiKhoanTu: '911', taiKhoanDen: '4212', ben: 'HAI_BEN', dienGiai: 'Kết chuyển lãi lỗ' },
  { ma: '642-911', thuTu: 20, taiKhoanTu: '642', taiKhoanDen: '911', ben: 'NO', dienGiai: 'Kết chuyển chi phí QLDN' },
  { ma: '511-911', thuTu: 10, taiKhoanTu: '511', taiKhoanDen: '911', ben: 'CO', dienGiai: 'Kết chuyển doanh thu' },
];

describe('dungBangSoDu', () => {
  it('quy phát sinh về số dư: dương là dư Nợ, âm là dư Có', () => {
    const bang = dungBangSoDu(
      [
        { ma: '511', periodNo: 0, periodCo: 100 },
        { ma: '642', periodNo: 30, periodCo: 0 },
      ],
      [],
      false,
    );

    expect(bang['511']).toBe(-100);
    expect(bang['642']).toBe(30);
  });

  it('cộng số dư đầu kỳ khi được phép áp dụng', () => {
    const bang = dungBangSoDu(
      [{ ma: '511', periodNo: 0, periodCo: 100 }],
      [{ maTaiKhoan: '511', duNo: 0, duCo: 20 }],
      true,
    );

    expect(bang['511']).toBe(-120);
  });

  it('bỏ qua số dư đầu kỳ khi ngoài kỳ kết chuyển', () => {
    const bang = dungBangSoDu(
      [{ ma: '511', periodNo: 0, periodCo: 100 }],
      [{ maTaiKhoan: '511', duNo: 0, duCo: 20 }],
      false,
    );

    expect(bang['511']).toBe(-100);
  });
});

describe('chayKetChuyen', () => {
  it('kết chuyển doanh thu và chi phí rồi chốt lãi về TK đích', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': -100, '642': 30 });

    expect(kq.dong).toEqual([
      { maKetChuyen: '511-911', dienGiai: 'Kết chuyển doanh thu', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
      { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí QLDN', taiKhoanNo: '911', taiKhoanCo: '642', soTien: 30 },
      { maKetChuyen: '911-4212', dienGiai: 'Kết chuyển lãi lỗ', taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 70 },
    ]);
    expect(kq.laiLo).toBe(70);
    expect(kq.canhBao).toEqual([]);
  });

  it('lỗ thì đảo chiều bút toán chốt và trả lãi lỗ âm', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': -30, '642': 100 });

    expect(kq.dong[2]).toEqual({
      maKetChuyen: '911-4212',
      dienGiai: 'Kết chuyển lãi lỗ',
      taiKhoanNo: '4212',
      taiKhoanCo: '911',
      soTien: 70,
    });
    expect(kq.laiLo).toBe(-70);
  });

  it('khai ở TK tổng nhưng hạch toán ở TK con thì sinh một dòng cho mỗi TK con', () => {
    const kq = chayKetChuyen(DANH_MUC, { '6421': 20, '6422': 10 });

    expect(kq.dong.slice(0, 2)).toEqual([
      { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí QLDN', taiKhoanNo: '911', taiKhoanCo: '6421', soTien: 20 },
      { maKetChuyen: '642-911', dienGiai: 'Kết chuyển chi phí QLDN', taiKhoanNo: '911', taiKhoanCo: '6422', soTien: 10 },
    ]);
  });

  it('bỏ qua tài khoản dư ngược chiều với bên đã khai và cảnh báo phần còn treo', () => {
    const kq = chayKetChuyen(DANH_MUC, { '642': -5 });

    expect(kq.dong).toEqual([]);
    expect(kq.canhBao).toEqual([{ ma: '642', soTien: 5, ben: 'CO' }]);
  });

  it('cảnh báo tài khoản kết quả kinh doanh chưa được khai trong danh mục', () => {
    const kq = chayKetChuyen(DANH_MUC, { '641': 15 });

    expect(kq.canhBao).toEqual([{ ma: '641', soTien: 15, ben: 'NO' }]);
  });

  it('chạy lại khi không còn phát sinh thì không sinh dòng nào', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': 0, '642': 0, '911': 0 });

    expect(kq.dong).toEqual([]);
    expect(kq.laiLo).toBe(0);
  });

  it('không phụ thuộc thứ tự mảng đầu vào, chỉ theo thuTu', () => {
    const daoNguoc = [...DANH_MUC].reverse();
    const kq = chayKetChuyen(daoNguoc, { '511': -100, '642': 30 });

    expect(kq.dong.map((d) => d.maKetChuyen)).toEqual(['511-911', '642-911', '911-4212']);
  });

  it('bỏ qua dòng danh mục có tài khoản nguồn không phát sinh', () => {
    const kq = chayKetChuyen(DANH_MUC, { '511': -50 });

    expect(kq.dong.map((d) => d.maKetChuyen)).toEqual(['511-911', '911-4212']);
  });
});
