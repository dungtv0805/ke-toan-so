import type { LichSuPheDuyet } from '@app/entities';
import { gomTocDo, NGUONG_QUA_HAN_GIAY } from './toc-do.helper';

const dong = (over: Partial<LichSuPheDuyet>): LichSuPheDuyet =>
  ({
    quyTrinhId: 'q1',
    loaiDoiTuong: 'CHUNG_TU',
    doiTuongId: 'd1',
    loaiNghiepVuMa: 'TT_NCC',
    thuTu: 1,
    viTriTen: 'Kiểm soát kế toán',
    nguoiXuLyId: 'u1',
    nguoiXuLyTen: 'Chị B',
    ketQua: 'DUYET',
    phienBan: 1,
    thoiGianXuLyGiay: 3600,
    ...over,
  }) as LichSuPheDuyet;

describe('gomTocDo — mục 15', () => {
  it('trung bình theo vị trí', () => {
    const kq = gomTocDo([
      dong({ viTriTen: 'Giám đốc', thoiGianXuLyGiay: 7200 }),
      dong({ viTriTen: 'Giám đốc', thoiGianXuLyGiay: 3600 }),
      dong({ viTriTen: 'Kiểm soát kế toán', thoiGianXuLyGiay: 1800 }),
    ]);
    const gd = kq.theoViTri.find((x) => x.ten === 'Giám đốc');
    expect(gd).toMatchObject({ soLuong: 2, trungBinhGiay: 5400 });
    expect(kq.theoViTri.find((x) => x.ten === 'Kiểm soát kế toán')?.trungBinhGiay).toBe(1800);
  });

  it('trung bình theo người dùng và theo loại nghiệp vụ', () => {
    const kq = gomTocDo([
      dong({ nguoiXuLyTen: 'Chị B', thoiGianXuLyGiay: 600 }),
      dong({ nguoiXuLyTen: 'Anh C', nguoiXuLyId: 'u2', thoiGianXuLyGiay: 1200 }),
      dong({ loaiNghiepVuMa: 'THU_KH', thoiGianXuLyGiay: 300 }),
    ]);
    expect(kq.theoNguoiDung).toHaveLength(2);
    expect(kq.theoLoaiNghiepVu.map((x) => x.ten).sort()).toEqual(['THU_KH', 'TT_NCC']);
  });

  it('chỉ tính dòng ĐÃ xử lý xong — dòng gửi duyệt không có thời gian thì bỏ qua', () => {
    const kq = gomTocDo([
      dong({ ketQua: 'GUI_DUYET', thoiGianXuLyGiay: undefined, viTriTen: undefined }),
      dong({ thoiGianXuLyGiay: 1000 }),
    ]);
    expect(kq.theoViTri).toHaveLength(1);
    expect(kq.theoViTri[0].soLuong).toBe(1);
  });

  it('đếm số lần quá ngưỡng tiêu chuẩn — "quá thời gian tiêu chuẩn" mục 15', () => {
    const kq = gomTocDo([
      dong({ thoiGianXuLyGiay: NGUONG_QUA_HAN_GIAY + 1 }),
      dong({ thoiGianXuLyGiay: 60 }),
    ]);
    expect(kq.theoViTri[0].soQuaHan).toBe(1);
  });

  it('xếp vị trí chậm nhất lên đầu — mục 15 đòi chỉ ra điểm nghẽn', () => {
    const kq = gomTocDo([
      dong({ viTriTen: 'Nhanh', thoiGianXuLyGiay: 60 }),
      dong({ viTriTen: 'Chậm', thoiGianXuLyGiay: 86400 }),
    ]);
    expect(kq.theoViTri[0].ten).toBe('Chậm');
    expect(kq.diemNghen).toBe('Chậm');
  });

  it('không có dữ liệu thì trả về rỗng chứ không vỡ', () => {
    expect(gomTocDo([])).toEqual({
      theoViTri: [],
      theoNguoiDung: [],
      theoLoaiNghiepVu: [],
      diemNghen: undefined,
    });
  });

  it('bỏ qua thời gian âm — đồng hồ lệch giữa các máy chủ không được kéo trung bình xuống', () => {
    const kq = gomTocDo([
      dong({ thoiGianXuLyGiay: -500 }),
      dong({ thoiGianXuLyGiay: 1000 }),
    ]);
    expect(kq.theoViTri[0].soLuong).toBe(1);
    expect(kq.theoViTri[0].trungBinhGiay).toBe(1000);
  });
});
