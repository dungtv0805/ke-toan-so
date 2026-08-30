import { laButToanKhauHao, loaiTruKhauHao } from './loai-tru-khau-hao';

const bt = (
  khoanMucTen: string | undefined,
  tkNo?: string,
  tkCo?: string,
) => ({
  soTien: 100,
  danhMuc: {
    ...(tkNo ? { taiKhoanNo: { ma: tkNo } } : {}),
    ...(tkCo ? { taiKhoanCo: { ma: tkCo } } : {}),
    ...(khoanMucTen ? { khoanMuc: { ma: 'KM', ten: khoanMucTen } } : {}),
  },
});

describe('laButToanKhauHao', () => {
  it('nhận diện khoản mục Khấu hao đi kèm TK 214 bên Có', () => {
    expect(laButToanKhauHao(bt('Khấu hao TSCĐ', '642', '2141'))).toBe(true);
  });

  it('nhận diện cả khi 214 nằm bên Nợ', () => {
    expect(laButToanKhauHao(bt('Chi phí khấu hao', '2141', '211'))).toBe(true);
  });

  it('bỏ dấu và không phân biệt hoa thường khi so tên khoản mục', () => {
    expect(laButToanKhauHao(bt('KHAU HAO tai san', '642', '2141'))).toBe(true);
  });

  it('có TK 214 nhưng khoản mục KHÔNG phải khấu hao thì không loại', () => {
    // Tài liệu yêu cầu điều kiện VÀ, không phải HOẶC.
    expect(laButToanKhauHao(bt('Thanh lý tài sản', '2141', '211'))).toBe(false);
  });

  it('khoản mục là khấu hao nhưng không dính 214 thì không loại', () => {
    expect(laButToanKhauHao(bt('Khấu hao', '642', '335'))).toBe(false);
  });

  it('không có khoản mục thì không loại', () => {
    expect(laButToanKhauHao(bt(undefined, '642', '2141'))).toBe(false);
  });

  it('đọc được tài khoản ở dạng phẳng của Nhật ký chung', () => {
    expect(
      laButToanKhauHao({
        soTien: 100,
        taiKhoanNo: '6424',
        taiKhoanCo: '2141',
        danhMuc: { khoanMuc: { ma: 'KM', ten: 'Khấu hao' } },
      }),
    ).toBe(true);
  });

  it('2141 và 2147 đều là tài khoản cấp con của 214', () => {
    expect(laButToanKhauHao(bt('Khấu hao', '642', '2147'))).toBe(true);
  });

  it('2140-something không tồn tại nhưng 21 thì KHÔNG được nhận nhầm', () => {
    expect(laButToanKhauHao(bt('Khấu hao', '642', '211'))).toBe(false);
  });
});

describe('loaiTruKhauHao', () => {
  it('bỏ đúng các bút toán khấu hao, giữ nguyên phần còn lại', () => {
    const rows = [
      bt('Khấu hao TSCĐ', '642', '2141'),
      bt('Lương', '642', '334'),
      bt('Khấu hao', '6427', '2143'),
    ];
    const con = loaiTruKhauHao(rows);
    expect(con).toHaveLength(1);
    expect(con[0].danhMuc.khoanMuc!.ten).toBe('Lương');
  });

  it('không có bút toán khấu hao thì trả nguyên danh sách', () => {
    const rows = [bt('Lương', '642', '334')];
    expect(loaiTruKhauHao(rows)).toHaveLength(1);
  });

  it('danh sách rỗng vẫn chạy', () => {
    expect(loaiTruKhauHao([])).toEqual([]);
  });
});
