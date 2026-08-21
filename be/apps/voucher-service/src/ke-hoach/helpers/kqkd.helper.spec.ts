import { KqkdKeHoachReport } from '@app/dto';
import { buildKqkdKeHoach, DanhMucTraCuuKqkd, DongKeHoachKqkd } from './kqkd.helper';

const danhMucRong: DanhMucTraCuuKqkd = {
  sanPham: [],
  nhomSanPham: [],
  nhomKhoanMuc: [],
};

const danhMuc: DanhMucTraCuuKqkd = {
  sanPham: [
    { id: 'sp1', ma: 'SP01', ten: 'Bàn', nhom: 'NOI_THAT' },
    { id: 'sp2', ma: 'SP02', ten: 'Ghế', nhom: 'NOI_THAT' },
    { id: 'sp3', ma: 'SP03', ten: 'Đèn', nhom: 'DIEN' },
    { id: 'sp4', ma: 'SP04', ten: 'Lẻ' },
  ],
  nhomSanPham: [
    { id: 'n1', ma: 'NOI_THAT', ten: 'Nội thất' },
    { id: 'n2', ma: 'DIEN', ten: 'Điện' },
  ],
  nhomKhoanMuc: [
    { id: 'nk1', ma: 'NKM01', ten: 'Chi phí nhân sự' },
  ],
};

const dong = (p: Partial<DongKeHoachKqkd>): DongKeHoachKqkd => ({
  ngay: '2026-01-15T00:00:00.000Z',
  soTien: 0,
  ...p,
});

type Dong = KqkdKeHoachReport['dong'][number];

const timDong = (report: KqkdKeHoachReport, key: string): Dong | undefined => {
  const duyet = (ds: Dong[]): Dong | undefined => {
    for (const d of ds) {
      if (d.key === key) return d;
      const trong = d.con ? duyet(d.con) : undefined;
      if (trong) return trong;
    }
    return undefined;
  };
  return duyet(report.dong);
};

describe('buildKqkdKeHoach — gom theo tháng', () => {
  it('gom vào đúng tháng theo UTC', () => {
    const r = buildKqkdKeHoach(
      [
        dong({ ngay: '2026-03-01T00:00:00.000Z', soTien: 100, danhMuc: { taiKhoanCo: { ma: '511' } } }),
        dong({ ngay: '2026-12-31T00:00:00.000Z', soTien: 50, danhMuc: { taiKhoanCo: { ma: '511' } } }),
      ],
      danhMucRong,
      2026,
    );
    const i = timDong(r, '01')!;
    expect(i.thang[2]).toBe(100);  // T3, không phải T2
    expect(i.thang[11]).toBe(50);
    expect(i.thang).toHaveLength(12);
  });

  it('mọi dòng đều có đúng 12 số tháng kể cả khi không có dữ liệu', () => {
    const r = buildKqkdKeHoach([], danhMucRong, 2026);
    for (const d of r.dong) expect(d.thang).toHaveLength(12);
  });

  it('dòng cấp 1 và cấp 2 cũng luôn có đúng 12 số tháng', () => {
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 1000, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } }),
        dong({ soTien: 30, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
      ],
      danhMuc,
      2026,
    );
    const duyet = (ds: Dong[]): void => {
      for (const d of ds) {
        expect(d.thang).toHaveLength(12);
        if (d.con) duyet(d.con);
      }
    };
    duyet(r.dong);
  });
});

describe('buildKqkdKeHoach — bậc thang chỉ tiêu', () => {
  const rows = [
    dong({ soTien: 1000, danhMuc: { taiKhoanNo: { ma: '131' }, taiKhoanCo: { ma: '511' } } }),
    dong({ soTien: 100, danhMuc: { taiKhoanNo: { ma: '521' }, taiKhoanCo: { ma: '131' } } }),
    dong({ soTien: 400, danhMuc: { taiKhoanNo: { ma: '632' }, taiKhoanCo: { ma: '156' } } }),
    dong({ soTien: 50, danhMuc: { taiKhoanNo: { ma: '641' }, taiKhoanCo: { ma: '331' } } }),
    dong({ soTien: 60, danhMuc: { taiKhoanNo: { ma: '642' }, taiKhoanCo: { ma: '331' } } }),
    dong({ soTien: 20, danhMuc: { taiKhoanNo: { ma: '635' }, taiKhoanCo: { ma: '112' } } }),
  ];

  it('dựng đủ 16 dòng cấp 0 theo đúng thứ tự của sheet', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(r.dong.map((d) => d.key)).toEqual([
      '01', '02', '11', '20', '21', '22', '25', '26',
      'IX', '30', '31', '32', '40', '50', 'XII', '60',
    ]);
    expect(r.dong.every((d) => d.cap === 0)).toBe(true);
  });

  it('gắn số La Mã đúng chỗ, ba dòng khác để trống', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(timDong(r, '01')!.soLaMa).toBe('I');
    expect(timDong(r, '20')!.soLaMa).toBe('IV');
    expect(timDong(r, 'IX')!.soLaMa).toBe('IX');
    expect(timDong(r, '60')!.soLaMa).toBe('XIII');
    expect(timDong(r, '31')!.soLaMa).toBeUndefined();
    expect(timDong(r, '32')!.soLaMa).toBeUndefined();
    expect(timDong(r, '40')!.soLaMa).toBeUndefined();
  });

  it('tính đúng lợi nhuận gộp, tổng chi phí và lợi nhuận thuần', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(timDong(r, '20')!.thang[0]).toBe(500);   // 1000 − 100 − 400
    expect(timDong(r, 'IX')!.thang[0]).toBe(130);   // 20 + 50 + 60
    expect(timDong(r, '30')!.thang[0]).toBe(370);   // 500 + (0 − 20) − (50 + 60)
    expect(timDong(r, '50')!.thang[0]).toBe(370);
    expect(timDong(r, '60')!.thang[0]).toBe(370);
  });

  it('doanhThuThuanNam là tổng 12 tháng của mã 10', () => {
    const r = buildKqkdKeHoach(rows, danhMucRong, 2026);
    expect(r.doanhThuThuanNam).toBe(900);
  });
});

describe('buildKqkdKeHoach — cây nhóm sản phẩm', () => {
  const rows = [
    dong({ soTien: 1000, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } }),
    dong({ soTien: 300, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP03', ten: 'Đèn' } } }),
    dong({ soTien: 400, danhMuc: { taiKhoanNo: { ma: '632' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } }),
    dong({ soTien: 100, danhMuc: { taiKhoanNo: { ma: '521' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } }),
  ];

  it('bung doanh thu theo nhóm sản phẩm, lấy tên nhóm từ danh mục', () => {
    const r = buildKqkdKeHoach(rows, danhMuc, 2026);
    const con = timDong(r, '01')!.con!;
    expect(con.map((c) => [c.ten, c.thang[0]])).toEqual([
      ['Điện', 300],
      ['Nội thất', 1000],
    ]);
    expect(con.every((c) => c.cap === 1)).toBe(true);
  });

  it('lợi nhuận gộp của một nhóm = doanh thu − giảm trừ − giá vốn', () => {
    const r = buildKqkdKeHoach(rows, danhMuc, 2026);
    const noiThat = timDong(r, '20:NOI_THAT')!;
    expect(noiThat.thang[0]).toBe(500);  // 1000 − 100 − 400
  });

  it('sản phẩm không gắn nhóm vào "Chưa phân nhóm", dòng không có sản phẩm vào "Không phân bổ sản phẩm", cả hai xếp cuối', () => {
    const r = buildKqkdKeHoach(
      [
        ...rows,
        dong({ soTien: 7, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP04', ten: 'Lẻ' } } }),
        dong({ soTien: 9, danhMuc: { taiKhoanCo: { ma: '511' } } }),
      ],
      danhMuc,
      2026,
    );
    expect(timDong(r, '01')!.con!.map((c) => c.ten)).toEqual([
      'Điện', 'Nội thất', 'Chưa phân nhóm', 'Không phân bổ sản phẩm',
    ]);
  });

  it('sản phẩm không có trong danh mục coi như chưa phân nhóm, không rơi mất số', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 55, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP_LA', ten: 'Lạ' } } })],
      danhMuc,
      2026,
    );
    expect(timDong(r, '01')!.thang[0]).toBe(55);
    expect(timDong(r, '01')!.con!.find((c) => c.ten === 'Chưa phân nhóm')!.thang[0]).toBe(55);
  });

  it('hai sản phẩm TRÙNG TÊN khác MÃ ở hai nhóm khác nhau không bị gộp', () => {
    const dm: DanhMucTraCuuKqkd = {
      sanPham: [
        { ma: 'A1', ten: 'Combo', nhom: 'G1' },
        { ma: 'A2', ten: 'Combo', nhom: 'G2' },
      ],
      nhomSanPham: [
        { ma: 'G1', ten: 'Nhóm 1' },
        { ma: 'G2', ten: 'Nhóm 2' },
      ],
      nhomKhoanMuc: [],
    };
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 10, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'A1', ten: 'Combo' } } }),
        dong({ soTien: 20, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'A2', ten: 'Combo' } } }),
      ],
      dm,
      2026,
    );
    expect(timDong(r, '01')!.con!.map((c) => [c.ten, c.thang[0]])).toEqual([
      ['Nhóm 1', 10],
      ['Nhóm 2', 20],
    ]);
  });

  it('rổ vét luôn xếp CUỐI dù có mã nhóm bắt đầu bằng ký tự tiếng Việt có dấu', () => {
    const dm: DanhMucTraCuuKqkd = {
      sanPham: [
        { ma: 'SPA', ten: 'A', nhom: 'A_NHOM' },
        { ma: 'SPD', ten: 'D', nhom: 'Đ01' },
      ],
      nhomSanPham: [
        { ma: 'A_NHOM', ten: 'Nhóm A' },
        // Mã bắt đầu bằng 'Đ' (U+0110) — lớn hơn '~' (U+007E) trong so sánh UTF-16,
        // nên comparator dựa vào bảng mã sẽ xếp nhóm này SAU cả hai rổ vét.
        { ma: 'Đ01', ten: 'Đồ gỗ' },
      ],
      nhomKhoanMuc: [],
    };
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 1, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SPA', ten: 'A' } } }),
        dong({ soTien: 2, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SPD', ten: 'D' } } }),
        // Sản phẩm không có trong danh mục -> "Chưa phân nhóm".
        dong({ soTien: 3, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP_LA', ten: 'Lạ' } } }),
        // Dòng không chọn sản phẩm -> "Không phân bổ sản phẩm".
        dong({ soTien: 4, danhMuc: { taiKhoanCo: { ma: '511' } } }),
      ],
      dm,
      2026,
    );
    const ten = timDong(r, '01')!.con!.map((c) => c.ten);
    expect(ten.slice(-2)).toEqual(['Chưa phân nhóm', 'Không phân bổ sản phẩm']);
  });
});

describe('buildKqkdKeHoach — cây khoản mục', () => {
  it('bung chi phí bán hàng thành nhóm khoản mục rồi tới khoản mục', () => {
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 30, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
        dong({ soTien: 20, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM02', ten: 'Thưởng', nhom: 'NKM01' } } }),
      ],
      danhMuc,
      2026,
    );
    const nhom = timDong(r, '25:NKM01')!;
    expect(nhom.ten).toBe('Chi phí nhân sự');
    expect(nhom.cap).toBe(1);
    expect(nhom.thang[0]).toBe(50);
    expect(nhom.con!.map((c) => [c.key, c.ten, c.cap, c.thang[0]])).toEqual([
      ['25:NKM01:KM01', 'Lương', 2, 30],
      ['25:NKM01:KM02', 'Thưởng', 2, 20],
    ]);
  });

  it('chi phí bán hàng và chi phí quản lý không lẫn cây của nhau', () => {
    const r = buildKqkdKeHoach(
      [
        dong({ soTien: 30, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
        dong({ soTien: 8, danhMuc: { taiKhoanNo: { ma: '642' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
      ],
      danhMuc,
      2026,
    );
    expect(timDong(r, '25:NKM01')!.thang[0]).toBe(30);
    expect(timDong(r, '26:NKM01')!.thang[0]).toBe(8);
  });

  it('khớp nhóm khoản mục cả khi giá trị lưu là id thay vì mã', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 12, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'nk1' } } })],
      danhMuc,
      2026,
    );
    expect(timDong(r, '25')!.con![0].ten).toBe('Chi phí nhân sự');
  });

  it('dòng không chọn khoản mục vào rổ riêng, không có cấp 2', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 5, danhMuc: { taiKhoanNo: { ma: '641' } } })],
      danhMuc,
      2026,
    );
    const con = timDong(r, '25')!.con!;
    expect(con).toHaveLength(1);
    expect(con[0].ten).toBe('Không phân bổ khoản mục');
    expect(con[0].con).toBeUndefined();
  });
});

describe('buildKqkdKeHoach — danh mục hỏng', () => {
  it('danh mục rỗng vẫn cho số đúng ở dòng cấp 0', () => {
    const r = buildKqkdKeHoach(
      [dong({ soTien: 1000, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SP01', ten: 'Bàn' } } })],
      danhMucRong,
      2026,
    );
    expect(timDong(r, '01')!.thang[0]).toBe(1000);
    expect(timDong(r, '01')!.con![0].ten).toBe('Chưa phân nhóm');
  });

  it('bản khoản mục: mã nhóm khoản mục không tra ra vẫn gom về MỘT "Chưa phân nhóm" duy nhất, xếp sau nhóm thật và trước rổ "Không phân bổ khoản mục"', () => {
    const r = buildKqkdKeHoach(
      [
        // Hai mã nhóm khoản mục KHÁC NHAU, cả hai đều không có trong danh mục.
        dong({ soTien: 5, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KMX', ten: 'X', nhom: 'NHOM_LA_1' } } }),
        dong({ soTien: 3, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KMY', ten: 'Y', nhom: 'NHOM_LA_2' } } }),
        // Một nhóm khoản mục tra ra bình thường.
        dong({ soTien: 10, danhMuc: { taiKhoanNo: { ma: '641' }, khoanMuc: { ma: 'KM01', ten: 'Lương', nhom: 'NKM01' } } }),
        // Dòng không chọn khoản mục -> rổ "Không phân bổ khoản mục".
        dong({ soTien: 7, danhMuc: { taiKhoanNo: { ma: '641' } } }),
      ],
      danhMuc,
      2026,
    );

    // Số ở dòng cấp 0 vẫn đúng: không rơi mất đồng nào.
    expect(timDong(r, '25')!.thang[0]).toBe(25);

    const con = timDong(r, '25')!.con!;
    const tenCon = con.map((c) => c.ten);

    // Chỉ MỘT dòng "Chưa phân nhóm" dù có hai mã không tra ra khác nhau.
    expect(tenCon.filter((t) => t === 'Chưa phân nhóm')).toHaveLength(1);
    const chuaPhanNhom = con.find((c) => c.ten === 'Chưa phân nhóm')!;
    expect(chuaPhanNhom.thang[0]).toBe(8); // 5 + 3, gộp chung một rổ

    // Hai rổ vét luôn xếp CUỐI, sau nhóm thật.
    expect(tenCon.slice(-2)).toEqual(['Chưa phân nhóm', 'Không phân bổ khoản mục']);
  });

  it('bản sản phẩm: sản phẩm tra ra nhưng mã nhóm của nó không có trong danh mục nhóm -> "Chưa phân nhóm", không hiện mã thô làm tên', () => {
    const dm: DanhMucTraCuuKqkd = {
      sanPham: [{ ma: 'SPX', ten: 'X', nhom: 'NHOM_LA' }],
      nhomSanPham: [{ ma: 'KHAC', ten: 'Khác' }], // không có 'NHOM_LA'
      nhomKhoanMuc: [],
    };
    const r = buildKqkdKeHoach(
      [dong({ soTien: 55, danhMuc: { taiKhoanCo: { ma: '511' }, sanPham: { ma: 'SPX', ten: 'X' } } })],
      dm,
      2026,
    );
    const con = timDong(r, '01')!.con!;
    expect(con).toHaveLength(1);
    expect(con[0].ten).toBe('Chưa phân nhóm'); // không phải 'NHOM_LA'
    expect(con[0].thang[0]).toBe(55);
  });
});
