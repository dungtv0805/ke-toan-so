import { describe, it, expect } from 'vitest';
import type { TaiKhoan } from '@/types';
import {
  rangBuocQuyChuan,
  truongThieu,
  NHAN_TRUONG_QUY_CHUAN,
  type GiaTriPhanBo,
} from './rangBuoc';

const tk = (ma: string, fieldRules?: TaiKhoan['fieldRules']): TaiKhoan =>
  ({ id: ma, ma, ten: `TK ${ma}`, capDo: 1, loai: 'CHI_PHI', nhom: 'NO', fieldRules }) as TaiKhoan;

describe('rangBuocQuyChuan — gộp mức của TK Nợ và TK Có', () => {
  it('không tài khoản nào khai thì không trường nào bị ràng buộc', () => {
    expect(rangBuocQuyChuan(tk('642'), tk('1111'))).toEqual({});
  });

  it('chỉ TK Nợ đặt Bắt buộc thì trường đó vẫn bắt buộc', () => {
    const rb = rangBuocQuyChuan(tk('642', { khoanMuc: 'BAT_BUOC' }), tk('1111'));
    expect(rb.khoanMuc).toBe('BAT_BUOC');
  });

  it('chỉ TK Có đặt Bắt buộc thì trường đó vẫn bắt buộc', () => {
    const rb = rangBuocQuyChuan(tk('642'), tk('1111', { dongTien: 'BAT_BUOC' }));
    expect(rb.dongTien).toBe('BAT_BUOC');
  });

  it('hai bên khác mức thì lấy mức nặng hơn (Bắt buộc thắng Cảnh báo)', () => {
    const rb = rangBuocQuyChuan(
      tk('642', { khoanMuc: 'CANH_BAO' }),
      tk('1111', { khoanMuc: 'BAT_BUOC' }),
    );
    expect(rb.khoanMuc).toBe('BAT_BUOC');
  });

  it('cả hai bên chỉ Cảnh báo thì giữ Cảnh báo', () => {
    const rb = rangBuocQuyChuan(
      tk('642', { loaiChiPhi: 'CANH_BAO' }),
      tk('1111', { loaiChiPhi: 'CANH_BAO' }),
    );
    expect(rb.loaiChiPhi).toBe('CANH_BAO');
  });

  it('bỏ qua các quy tắc không thuộc 4 trường phân bổ của quy chuẩn', () => {
    const rb = rangBuocQuyChuan(tk('642', { doiTuong: 'BAT_BUOC', duAn: 'BAT_BUOC' }), tk('1111'));
    expect(rb).toEqual({});
  });

  it('chưa chọn tài khoản thì không nổ, coi như chưa có ràng buộc', () => {
    expect(rangBuocQuyChuan(undefined, undefined)).toEqual({});
    expect(rangBuocQuyChuan(tk('642', { nhomKhoanMuc: 'BAT_BUOC' }), undefined).nhomKhoanMuc).toBe(
      'BAT_BUOC',
    );
  });
});

describe('truongThieu — trường bị ràng buộc mà chưa nhập', () => {
  const rb = { khoanMuc: 'BAT_BUOC', dongTien: 'CANH_BAO' } as const;

  it('trả về trường bắt buộc còn trống', () => {
    const gt: GiaTriPhanBo = {};
    expect(truongThieu(rb, gt, 'BAT_BUOC')).toEqual(['khoanMuc']);
  });

  it('chuỗi rỗng hoặc chỉ khoảng trắng vẫn tính là trống', () => {
    expect(truongThieu(rb, { khoanMuc: '   ' }, 'BAT_BUOC')).toEqual(['khoanMuc']);
  });

  it('đã nhập thì không còn thiếu', () => {
    expect(truongThieu(rb, { khoanMuc: 'KM01' }, 'BAT_BUOC')).toEqual([]);
  });

  it('lọc riêng mức Cảnh báo, không lẫn với Bắt buộc', () => {
    expect(truongThieu(rb, {}, 'CANH_BAO')).toEqual(['dongTien']);
  });

  it('mỗi trường đều có nhãn tiếng Việt để dựng câu thông báo', () => {
    expect(NHAN_TRUONG_QUY_CHUAN.khoanMuc).toBe('Khoản mục');
    expect(NHAN_TRUONG_QUY_CHUAN.nhomKhoanMuc).toBe('Nhóm khoản mục');
    expect(NHAN_TRUONG_QUY_CHUAN.dongTien).toBe('Dòng tiền');
    expect(NHAN_TRUONG_QUY_CHUAN.loaiChiPhi).toBe('Loại chi phí');
  });
});
