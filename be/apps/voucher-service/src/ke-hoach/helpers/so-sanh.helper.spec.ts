import { gomSoSanh, layChiTieu, DimensionRow } from './so-sanh.helper';

const dong = (p: Partial<DimensionRow> & { key: string }): DimensionRow => ({
  ten: undefined,
  doanhThu: 0,
  chiPhi: 0,
  tong: 0,
  soLuong: 0,
  ...p,
});

describe('layChiTieu', () => {
  it('lợi nhuận = doanh thu − chi phí', () => {
    const row = dong({ key: 'DA01', doanhThu: 100, chiPhi: 30 });
    expect(layChiTieu(row, 'loiNhuan')).toBe(70);
    expect(layChiTieu(row, 'doanhThu')).toBe(100);
    expect(layChiTieu(row, 'chiPhi')).toBe(30);
  });

  it('chỉ tiêu "tong" lấy tổng số tiền của dòng', () => {
    expect(layChiTieu(dong({ key: 'DA01', tong: 55 }), 'tong')).toBe(55);
  });
});

describe('gomSoSanh', () => {
  it('ghép kế hoạch và thực hiện theo MÃ, không theo tên', () => {
    const kh = [dong({ key: 'DA01', ten: 'Dự án A', doanhThu: 100 })];
    const th = [dong({ key: 'DA01', ten: 'Dự án A (đổi tên)', doanhThu: 80 })];

    const { rows } = gomSoSanh(kh, th, 'doanhThu');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: 'DA01',
      keHoach: 100,
      thucHien: 80,
      chenhLech: -20,
      tyLeDat: 80,
    });
  });

  it('hai mã khác nhau trùng tên vẫn là hai dòng riêng', () => {
    const kh = [
      dong({ key: 'DA01', ten: 'Dự án A', doanhThu: 100 }),
      dong({ key: 'DA02', ten: 'Dự án A', doanhThu: 50 }),
    ];
    const { rows } = gomSoSanh(kh, [], 'doanhThu');
    expect(rows.map((r) => r.key)).toEqual(['DA01', 'DA02']);
  });

  it('mã chỉ có ở thực hiện → kế hoạch = 0, không chia 0 mà trả tyLeDat null', () => {
    const th = [dong({ key: 'DA09', ten: 'Ngoài kế hoạch', chiPhi: 40 })];
    const { rows } = gomSoSanh([], th, 'chiPhi');
    expect(rows[0]).toMatchObject({
      key: 'DA09',
      ten: 'Ngoài kế hoạch',
      keHoach: 0,
      thucHien: 40,
      chenhLech: 40,
      tyLeDat: null,
    });
  });

  it('mã chỉ có ở kế hoạch → thực hiện = 0, tỷ lệ đạt 0%', () => {
    const kh = [dong({ key: 'DA05', ten: 'Chưa làm', doanhThu: 200 })];
    const { rows } = gomSoSanh(kh, [], 'doanhThu');
    expect(rows[0]).toMatchObject({ keHoach: 200, thucHien: 0, chenhLech: -200, tyLeDat: 0 });
  });

  it('lấy tên từ phía thực hiện khi kế hoạch không có tên', () => {
    const kh = [dong({ key: 'NV1', doanhThu: 10 })];
    const th = [dong({ key: 'NV1', ten: 'Nguyễn A', doanhThu: 10 })];
    expect(gomSoSanh(kh, th, 'doanhThu').rows[0].ten).toBe('Nguyễn A');
  });

  it('sắp xếp giảm dần theo trị tuyệt đối của kế hoạch', () => {
    const kh = [
      dong({ key: 'B', doanhThu: 10 }),
      dong({ key: 'A', doanhThu: 100 }),
      dong({ key: 'C', doanhThu: 50 }),
    ];
    expect(gomSoSanh(kh, [], 'doanhThu').rows.map((r) => r.key)).toEqual(['A', 'C', 'B']);
  });

  it('bỏ dòng cả hai phía đều bằng 0 theo chỉ tiêu đang xem', () => {
    const kh = [dong({ key: 'X', chiPhi: 10 }), dong({ key: 'Y', chiPhi: 0 })];
    const { rows } = gomSoSanh(kh, [], 'chiPhi');
    expect(rows.map((r) => r.key)).toEqual(['X']);
  });

  it('trả dòng tổng cộng', () => {
    const kh = [dong({ key: 'A', doanhThu: 100 }), dong({ key: 'B', doanhThu: 100 })];
    const th = [dong({ key: 'A', doanhThu: 60 })];
    expect(gomSoSanh(kh, th, 'doanhThu').tong).toEqual({
      keHoach: 200,
      thucHien: 60,
      chenhLech: -140,
      tyLeDat: 30,
    });
  });

  it('tổng cộng khi kế hoạch = 0 thì tyLeDat null', () => {
    const th = [dong({ key: 'A', doanhThu: 60 })];
    expect(gomSoSanh([], th, 'doanhThu').tong.tyLeDat).toBeNull();
  });
});
