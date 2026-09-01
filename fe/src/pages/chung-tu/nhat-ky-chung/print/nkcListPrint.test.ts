import { describe, expect, it } from 'vitest';
import type { NhatKyChung } from '@/types';
import {
  buildNkcListHtml,
  chonCotIn,
  COT_IN_MAC_DINH,
} from './nkcListPrint';

const dong = (p: Partial<NhatKyChung> = {}): NhatKyChung =>
  ({
    id: '1',
    ngay: '2026-08-29T00:00:00.000Z',
    ngayGhiSo: '2026-08-29T00:00:00.000Z',
    soPhieu: 'PC001',
    dienGiai: 'BHXH Tháng 8',
    taiKhoanNo: '334',
    taiKhoanCo: '3383',
    soTien: 1_500_000,
    danhMuc: {
      doiTuong: { ma: 'DT01', ten: 'Trần Thị Mỹ Ngọc' },
      khoanMuc: { ma: 'KM07', ten: 'Bảo hiểm', nhom: 'NKM1' },
    },
    ...p,
  }) as NhatKyChung;

describe('chonCotIn', () => {
  it('giữ đúng thứ tự cột người dùng đang thấy trên bảng', () => {
    const cot = chonCotIn(['soTien', 'dienGiai', 'soPhieu']);
    expect(cot.map((c) => c.key)).toEqual(['soTien', 'dienGiai', 'soPhieu']);
  });

  /** Bảng có cột thao tác / tick chọn — không phải cột dữ liệu, không in. */
  it('bỏ cột không in được thay vì sinh cột trống', () => {
    expect(chonCotIn(['soPhieu', 'action', 'kiemSoat', 'soTien']).map((c) => c.key)).toEqual(
      ['soPhieu', 'soTien'],
    );
  });

  it('không truyền gì thì dùng bộ cột mặc định', () => {
    expect(chonCotIn().map((c) => c.key)).toEqual(COT_IN_MAC_DINH);
    expect(chonCotIn([]).map((c) => c.key)).toEqual(COT_IN_MAC_DINH);
  });

  it('lọc sạch hết cũng quay về bộ mặc định, không in bảng rỗng cột', () => {
    expect(chonCotIn(['action']).map((c) => c.key)).toEqual(COT_IN_MAC_DINH);
  });
});

describe('buildNkcListHtml', () => {
  it('chỉ in đúng những cột được yêu cầu', () => {
    const html = buildNkcListHtml([dong()], { cot: ['soPhieu', 'soTien'] });
    expect(html).toContain('<th>Số CT</th>');
    expect(html).toContain('PC001');
    expect(html).toContain('1.500.000');
    // Cột không chọn thì không được lọt vào bản in.
    expect(html).not.toContain('Diễn giải');
    expect(html).not.toContain('BHXH Tháng 8');
  });

  /** Đúng yêu cầu trong ảnh: in được cả đối tượng, khoản mục để đối chiếu. */
  it('in được các cột phía sau như đối tượng và khoản mục', () => {
    const html = buildNkcListHtml([dong()], {
      cot: ['soPhieu', 'doiTuong', 'khoanMuc', 'soTien'],
    });
    expect(html).toContain('Trần Thị Mỹ Ngọc');
    expect(html).toContain('Bảo hiểm');
  });

  it('tra tên nhóm khoản mục qua danh mục truyền vào', () => {
    const html = buildNkcListHtml([dong()], {
      cot: ['nhomKhoanMuc'],
      nhomKhoanMucList: [{ ma: 'NKM1', ten: 'Chi phí nhân sự' }],
    });
    expect(html).toContain('Chi phí nhân sự');
  });

  it('cộng tổng tiền và đặt đúng dưới cột Số tiền', () => {
    const html = buildNkcListHtml([dong(), dong({ soTien: 500_000 })], {
      cot: ['soPhieu', 'soTien'],
    });
    expect(html).toContain('Cộng 2 bút toán');
    expect(html).toContain('2.000.000');
  });

  it('không có cột Số tiền thì vẫn in được, chỉ đếm số bút toán', () => {
    const html = buildNkcListHtml([dong()], { cot: ['soPhieu'] });
    expect(html).toContain('Cộng 1 bút toán');
  });

  it('thu nhỏ cỡ chữ khi in nhiều cột để vừa khổ giấy', () => {
    const it6 = buildNkcListHtml([dong()], { cot: ['soPhieu', 'soTien'] });
    const nhieu = buildNkcListHtml([dong()], {
      cot: [
        'ngay', 'ngayGhiSo', 'soPhieu', 'loaiGiaoDich', 'nghiepVu', 'dienGiai',
        'taiKhoanNo', 'taiKhoanCo', 'soTien', 'doiTuongMa', 'doiTuong',
        'doiTuong2Ma', 'doiTuong2', 'duAn', 'sanPham', 'boPhan', 'khoanMuc',
        'dongTien', 'hopDong', 'ghiChu',
      ],
    });
    const co = (h: string) => Number(/font-size: (\d+)px; color: #000/.exec(h)![1]);
    expect(co(nhieu)).toBeLessThan(co(it6));
  });

  it('chèn thoát ký tự HTML trong dữ liệu người dùng nhập', () => {
    const html = buildNkcListHtml([dong({ dienGiai: '<script>x</script>' })], {
      cot: ['dienGiai'],
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('giữ nguyên tiêu đề, tên công ty và khoảng ngày lọc', () => {
    const html = buildNkcListHtml([dong()], {
      tenCongTy: 'CÔNG TY MASTER CEO',
      tuNgay: '2026-01-01',
      denNgay: '2026-12-31',
    });
    expect(html).toContain('CÔNG TY MASTER CEO');
    expect(html).toContain('Sổ nhật ký chung');
    expect(html).toContain('Từ ngày 01/01/2026 đến ngày 31/12/2026');
  });
});
