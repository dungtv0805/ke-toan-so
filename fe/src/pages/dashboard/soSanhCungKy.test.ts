import { describe, it, expect } from 'vitest';
import { tyLeSoCungKy } from './soSanhCungKy';

describe('tyLeSoCungKy', () => {
  it('tăng 25%', () => {
    expect(tyLeSoCungKy(1250, 1000)).toBe(25);
  });

  it('giảm 50%', () => {
    expect(tyLeSoCungKy(500, 1000)).toBe(-50);
  });

  it('cùng kỳ bằng 0 → null, không chia cho 0', () => {
    expect(tyLeSoCungKy(1000, 0)).toBeNull();
  });

  it('cả hai bằng 0 → null', () => {
    expect(tyLeSoCungKy(0, 0)).toBeNull();
  });

  it('cùng kỳ âm: lấy trị tuyệt đối làm mẫu số', () => {
    expect(tyLeSoCungKy(0, -200)).toBe(100);
  });

  it('không đổi → 0', () => {
    expect(tyLeSoCungKy(800, 800)).toBe(0);
  });
});
