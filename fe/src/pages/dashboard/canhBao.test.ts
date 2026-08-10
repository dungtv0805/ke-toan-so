import { describe, it, expect } from 'vitest';
import { tinhCanhBao } from './canhBao';

const trong = { quaHanThu: [], quaHanTra: [], taiKhoanTien: [], loiNhuanSauThue: 0 };

const qh = (doiTuongTen: string, conLai: number, soNgayQuaHan: number) => ({
  id: doiTuongTen,
  doiTuongTen,
  conLai,
  soNgayQuaHan,
});

const tkTien = (ma: string, duCuoiKy: number) => ({
  ma,
  ten: ma,
  duDauKy: 0,
  phatSinhNo: 0,
  phatSinhCo: 0,
  duCuoiKy,
});

describe('tinhCanhBao', () => {
  it('không có gì bất thường → mảng rỗng', () => {
    expect(tinhCanhBao(trong)).toEqual([]);
  });

  it('mỗi khoản quá hạn là một cảnh báo, phải thu trỏ về trang phải thu', () => {
    const out = tinhCanhBao({ ...trong, quaHanThu: [qh('Công ty A', 500, 12)] });
    expect(out).toHaveLength(1);
    expect(out[0].loai).toBe('CONG_NO_QUA_HAN');
    expect(out[0].duong).toBe('/cong-no/phai-thu');
    expect(out[0].moTa).toContain('Công ty A');
    expect(out[0].moTa).toContain('12');
  });

  it('phải trả quá hạn trỏ về trang phải trả', () => {
    const out = tinhCanhBao({ ...trong, quaHanTra: [qh('NCC B', 800, 5)] });
    expect(out[0].duong).toBe('/cong-no/phai-tra');
  });

  it('bỏ qua khoản quá hạn 0 ngày (chưa thực sự quá hạn)', () => {
    expect(tinhCanhBao({ ...trong, quaHanThu: [qh('A', 100, 0)] })).toEqual([]);
  });

  it('mỗi TK tiền âm là một cảnh báo', () => {
    const out = tinhCanhBao({
      ...trong,
      taiKhoanTien: [tkTien('1111', -50), tkTien('1121', 900)],
    });
    expect(out).toHaveLength(1);
    expect(out[0].loai).toBe('TIEN_AM');
    expect(out[0].moTa).toContain('1111');
    expect(out[0].duong).toBe('/so-quy');
  });

  it('TK tiền số dư bằng 0 không phải cảnh báo', () => {
    expect(tinhCanhBao({ ...trong, taiKhoanTien: [tkTien('1111', 0)] })).toEqual([]);
  });

  it('lợi nhuận sau thuế âm đếm đúng một lần', () => {
    const out = tinhCanhBao({ ...trong, loiNhuanSauThue: -1000 });
    expect(out).toHaveLength(1);
    expect(out[0].loai).toBe('LOI_NHUAN_AM');
    expect(out[0].duong).toBe('/bao-cao/tai-chinh');
  });

  it('lợi nhuận bằng 0 không phải cảnh báo', () => {
    expect(tinhCanhBao({ ...trong, loiNhuanSauThue: 0 })).toEqual([]);
  });

  it('gộp cả ba loại, quá hạn xếp trước', () => {
    const out = tinhCanhBao({
      quaHanThu: [qh('A', 100, 3)],
      quaHanTra: [qh('B', 200, 9)],
      taiKhoanTien: [tkTien('1111', -1)],
      loiNhuanSauThue: -5,
    });
    expect(out).toHaveLength(4);
    expect(out.map((c) => c.loai)).toEqual([
      'CONG_NO_QUA_HAN',
      'CONG_NO_QUA_HAN',
      'TIEN_AM',
      'LOI_NHUAN_AM',
    ]);
  });
});
