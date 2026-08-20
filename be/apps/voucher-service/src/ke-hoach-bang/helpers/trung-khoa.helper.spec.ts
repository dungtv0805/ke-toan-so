import { kiemTraTrungKhoa } from './trung-khoa.helper';

const hienCo = [
  { id: 'a', khoa: 'SP1' },
  { id: 'b', khoa: 'SP2' },
];

describe('kiemTraTrungKhoa', () => {
  it('payload sạch thì không báo gì', () => {
    expect(
      kiemTraTrungKhoa({ hienCo, them: ['SP3'], sua: [] }),
    ).toEqual({ trung: [], idKhongTonTai: [] });
  });

  it('bắt dòng thêm mới trùng dòng đã có trong kho', () => {
    expect(
      kiemTraTrungKhoa({ hienCo, them: ['SP2'], sua: [] }).trung,
    ).toEqual(['SP2']);
  });

  it('bắt hai dòng thêm mới trùng nhau trong cùng payload', () => {
    expect(
      kiemTraTrungKhoa({ hienCo, them: ['SP9', 'SP9'], sua: [] }).trung,
    ).toEqual(['SP9']);
  });

  it('bắt việc sửa dòng A thành trùng khoá dòng B', () => {
    expect(
      kiemTraTrungKhoa({ hienCo, them: [], sua: [{ id: 'a', khoa: 'SP2' }] })
        .trung,
    ).toEqual(['SP2']);
  });

  it('sửa mà giữ nguyên khoá của chính nó thì hợp lệ', () => {
    expect(
      kiemTraTrungKhoa({ hienCo, them: [], sua: [{ id: 'a', khoa: 'SP1' }] })
        .trung,
    ).toEqual([]);
  });

  it('sửa không đổi khoá thì hợp lệ', () => {
    expect(
      kiemTraTrungKhoa({ hienCo, them: [], sua: [{ id: 'a' }] }).trung,
    ).toEqual([]);
  });

  it('đổi chỗ khoá giữa hai dòng vẫn hợp lệ', () => {
    expect(
      kiemTraTrungKhoa({
        hienCo,
        them: [],
        sua: [
          { id: 'a', khoa: 'SP2' },
          { id: 'b', khoa: 'SP1' },
        ],
      }).trung,
    ).toEqual([]);
  });

  it('giải phóng khoá cũ thì dòng mới dùng lại được', () => {
    expect(
      kiemTraTrungKhoa({
        hienCo,
        them: ['SP1'],
        sua: [{ id: 'a', khoa: 'SP7' }],
      }).trung,
    ).toEqual([]);
  });

  it('báo id không tồn tại', () => {
    const kq = kiemTraTrungKhoa({
      hienCo,
      them: [],
      sua: [{ id: 'khong-co', khoa: 'SP5' }],
    });
    expect(kq.idKhongTonTai).toEqual(['khong-co']);
  });

  it('mỗi khoá trùng chỉ liệt kê một lần', () => {
    expect(
      kiemTraTrungKhoa({ hienCo, them: ['SP5', 'SP5', 'SP5'], sua: [] }).trung,
    ).toEqual(['SP5']);
  });
});
