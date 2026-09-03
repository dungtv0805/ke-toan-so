import { describe, expect, it } from 'vitest';
import { mucOptionsTheoNhom, nhomCuaMuc, nhomOptions } from './nhomTuDanhMuc';

const NHOM = [
  { ma: 'T', ten: 'Thu' },
  { ma: 'C', ten: 'Chi' },
];

const MUC = [
  { id: '1', ma: 'T03', ten: 'Thu nợ khách hàng', nhom: 'T' },
  { id: '2', ma: 'C01', ten: 'Chi lương', nhom: 'C' },
];

describe('nhomOptions', () => {
  it('dựng option từ danh mục nhóm khi danh mục có dữ liệu', () => {
    expect(nhomOptions(NHOM, MUC)).toEqual([
      { value: 'C', label: 'C - Chi' },
      { value: 'T', label: 'T - Thu' },
    ]);
  });

  /**
   * Đúng cảnh trong ảnh chụp màn hình: danh mục Nhóm dòng tiền rỗng nên ô
   * "Chọn nhóm" hiện "Trống", trong khi danh mục Dòng tiền vẫn có dữ liệu và
   * mỗi dòng mang sẵn mã nhóm.
   */
  it('suy ra nhóm từ danh mục con khi danh mục nhóm rỗng', () => {
    expect(nhomOptions([], MUC)).toEqual([
      { value: 'C', label: 'C' },
      { value: 'T', label: 'T' },
    ]);
  });

  it('gộp cả hai nguồn, danh mục nhóm thắng về tên hiển thị', () => {
    expect(nhomOptions([{ ma: 'T', ten: 'Thu' }], MUC)).toEqual([
      { value: 'C', label: 'C' },
      { value: 'T', label: 'T - Thu' },
    ]);
  });

  it('khử trùng theo MÃ, không theo tên — hai nhóm trùng tên khác mã giữ cả hai', () => {
    const nhom = [
      { ma: 'T1', ten: 'Thu' },
      { ma: 'T2', ten: 'Thu' },
    ];
    expect(nhomOptions(nhom, [])).toEqual([
      { value: 'T1', label: 'T1 - Thu' },
      { value: 'T2', label: 'T2 - Thu' },
    ]);
  });

  it('bỏ qua mục chưa gắn nhóm — không sinh option rỗng', () => {
    const muc = [
      { id: '1', ma: 'X', ten: 'Chưa gắn' },
      { id: '2', ma: 'Y', ten: 'Trống', nhom: '' },
      { id: '3', ma: 'Z', ten: 'Có nhóm', nhom: 'C' },
    ];
    expect(nhomOptions([], muc)).toEqual([{ value: 'C', label: 'C' }]);
  });

  it('sắp theo nhãn tiếng Việt, "Nhóm 2" đứng trước "Nhóm 10"', () => {
    const nhom = [
      { ma: 'N10', ten: 'Nhóm 10' },
      { ma: 'N2', ten: 'Nhóm 2' },
    ];
    expect(nhomOptions(nhom, []).map((o) => o.value)).toEqual(['N2', 'N10']);
  });

  it('không sửa mảng gốc', () => {
    const nhom = [
      { ma: 'B', ten: 'Bê' },
      { ma: 'A', ten: 'A' },
    ];
    nhomOptions(nhom, []);
    expect(nhom.map((n) => n.ma)).toEqual(['B', 'A']);
  });
});

describe('nhomCuaMuc', () => {
  it('trả mã nhóm của mục được chọn', () => {
    expect(nhomCuaMuc(MUC, '1')).toBe('T');
  });

  it('trả chuỗi rỗng khi mục không có nhóm hoặc không tìm thấy', () => {
    expect(nhomCuaMuc(MUC, 'khong-co')).toBe('');
    expect(nhomCuaMuc([{ id: '9', ma: 'X', ten: 'X' }], '9')).toBe('');
  });
});

describe('mucOptionsTheoNhom', () => {
  it('gom mục vào đúng nhóm, nhãn nhóm lấy từ danh mục Nhóm', () => {
    expect(mucOptionsTheoNhom(NHOM, MUC)).toEqual([
      {
        label: 'C - Chi',
        options: [{ value: '2', label: 'C01 - Chi lương' }],
      },
      {
        label: 'T - Thu',
        options: [{ value: '1', label: 'T03 - Thu nợ khách hàng' }],
      },
    ]);
  });

  /** Danh mục Nhóm rỗng vẫn phải gom được — mã trần còn hơn dồn hết vào một rổ. */
  it('hiện mã trần khi nhóm chưa khai ở danh mục Nhóm', () => {
    expect(mucOptionsTheoNhom([], MUC).map((g) => g.label)).toEqual(['C', 'T']);
  });

  it('mục chưa gắn nhóm dồn vào rổ cuối cùng', () => {
    const muc = [
      { id: '1', ma: 'X', ten: 'Chưa gắn' },
      { id: '2', ma: 'C01', ten: 'Chi lương', nhom: 'C' },
    ];
    const nhom = mucOptionsTheoNhom(NHOM, muc);
    expect(nhom.map((g) => g.label)).toEqual(['C - Chi', '(Chưa gán nhóm)']);
    expect(nhom[1].options).toEqual([{ value: '1', label: 'X - Chưa gắn' }]);
  });

  it('gom theo MÃ — hai nhóm trùng tên khác mã không bị nhập một', () => {
    const nhom = [
      { ma: 'T1', ten: 'Thu' },
      { ma: 'T2', ten: 'Thu' },
    ];
    const muc = [
      { id: '1', ma: 'A', ten: 'A', nhom: 'T1' },
      { id: '2', ma: 'B', ten: 'B', nhom: 'T2' },
    ];
    expect(mucOptionsTheoNhom(nhom, muc)).toEqual([
      { label: 'T1 - Thu', options: [{ value: '1', label: 'A - A' }] },
      { label: 'T2 - Thu', options: [{ value: '2', label: 'B - B' }] },
    ]);
  });

  it('nhóm không có mục nào thì không hiện rổ rỗng', () => {
    expect(mucOptionsTheoNhom(NHOM, []).length).toBe(0);
  });

  it('sắp nhóm và mục theo nhãn tiếng Việt', () => {
    const nhom = [
      { ma: 'N10', ten: 'Nhóm 10' },
      { ma: 'N2', ten: 'Nhóm 2' },
    ];
    const muc = [
      { id: '1', ma: 'B', ten: 'Bê', nhom: 'N2' },
      { id: '2', ma: 'A', ten: 'A', nhom: 'N2' },
      { id: '3', ma: 'C', ten: 'Xê', nhom: 'N10' },
    ];
    const kq = mucOptionsTheoNhom(nhom, muc);
    expect(kq.map((g) => g.label)).toEqual(['N2 - Nhóm 2', 'N10 - Nhóm 10']);
    expect(kq[0].options.map((o) => o.value)).toEqual(['2', '1']);
  });
});
