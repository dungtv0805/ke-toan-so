import { describe, it, expect } from 'vitest';
import { nhanTrieu, nhanTrieuAbs, nhanLatCat } from './format';

describe('nhanTrieu — nhãn số trên biểu đồ, đơn vị triệu', () => {
  it('quy về triệu, có dấu nhóm nghìn', () => {
    expect(nhanTrieu(1_234_000_000)).toBe('1.234');
    expect(nhanTrieu(45_000_000)).toBe('45');
  });

  it('0 / null / undefined → rỗng, không vẽ số 0 khắp biểu đồ', () => {
    expect(nhanTrieu(0)).toBe('');
    expect(nhanTrieu(null)).toBe('');
    expect(nhanTrieu(undefined)).toBe('');
  });

  it('dưới 10 triệu giữ 1 chữ số thập phân — không nuốt số nhỏ thành 0', () => {
    expect(nhanTrieu(400_000)).toBe('0,4');
    expect(nhanTrieu(2_500_000)).toBe('2,5');
    // Từ 10 triệu trở lên thì làm tròn cho gọn.
    expect(nhanTrieu(12_400_000)).toBe('12');
  });

  it('số âm giữ dấu (cột chi vẽ ngược xuống)', () => {
    expect(nhanTrieu(-45_000_000)).toBe('-45');
    expect(nhanTrieuAbs(-45_000_000)).toBe('45');
  });
});

describe('nhanLatCat — nhãn ngoài biểu đồ tròn', () => {
  it('hiện cả phần trăm lẫn số tiền kèm đơn vị', () => {
    expect(nhanLatCat(450_000_000, 1_000_000_000)).toBe('45% · 450 tr');
  });

  it('lát nhỏ hơn 4% bỏ nhãn để chữ không chồng nhau', () => {
    expect(nhanLatCat(30_000_000, 1_000_000_000)).toBe('');
    expect(nhanLatCat(50_000_000, 1_000_000_000)).toBe('5% · 50 tr');
  });

  it('lát bằng 0 hoặc tổng bằng 0 → rỗng, không chia cho 0', () => {
    expect(nhanLatCat(0, 1_000_000)).toBe('');
    expect(nhanLatCat(1_000_000, 0)).toBe('');
    expect(nhanLatCat(undefined, undefined)).toBe('');
  });

  it('giá trị âm vẫn tính tỷ trọng theo trị tuyệt đối', () => {
    expect(nhanLatCat(-500_000_000, 1_000_000_000)).toBe('50% · -500 tr');
  });
});
