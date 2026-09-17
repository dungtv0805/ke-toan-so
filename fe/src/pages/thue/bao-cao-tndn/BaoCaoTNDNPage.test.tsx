// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

/**
 * Trang này giờ là bản "Tình hình thực hiện nghĩa vụ" của Tổng quan bê sang:
 * ba nhóm THUẾ TNDN / THUẾ GTGT / THUẾ TNCN, bỏ nhóm bảo hiểm, nhưng giữ các ô
 * nhập điều chỉnh vì đây là chỗ duy nhất nhập được.
 *
 * Số trong bản giả lấy đúng hình dạng máy chủ trả về (mảng 4 quý + dòng lũy kế),
 * để lỗi ghép nguồn — nhóm GTGT/TNCN lấy từ API nghĩa vụ chính sách, nhóm TNDN
 * lấy từ API báo cáo TNDN — lộ ra ngay ở test.
 */

const { bao, dieuChinh, nghiaVu } = vi.hoisted(() => {
  // Máy chủ luôn trả đủ các chỉ tiêu cho cả 4 quý, kể cả quý chưa phát sinh.
  const q = (
    i: number,
    o: Record<string, number | number[]> = {},
  ) => ({
    quy: i + 1,
    dt511: 0, dt515: 0, dt711: 0,
    cp632: 0, cp641: 0, cp642: 0, cp811: 0,
    chiPhiKhongTru: 0,
    thuNhapMien: 0,
    loChuyen: 0,
    doanhThuLuyKe: 0,
    thueSuat: 0,
    tongChiPhi: 0,
    lnTruocThue: 0,
    thuNhapTinhThue: 0,
    thueTNDN: 0,
    lnSauThue: 0,
    cpKhongTruAuto: [0, 0, 0, 0],
    ...o,
  });
  return {
    bao: {
      nam: 2026,
      quy: [
        q(0),
        q(1),
        q(2),
        q(3),
      ],
      luyKe: {},
      dieuChinhBanDau: null,
    },
    dieuChinh: {
      nam: 2026,
      cpkdtDichVuHangHoa: [0, 0, 0, 0],
      cpkdtTscdCcdc: [0, 0, 0, 0],
      cpkdtNhanCong: [0, 0, 0, 0],
      cpkdtTaiChinhKhac: [0, 0, 0, 0],
      thuNhapMienThue: [0, 0, 0, 0],
      loDuocChuyen: [0, 0, 0, 0],
      thueTNCN: [0, 0, 1_000_000, 0],
      bhxh3383: [0, 0, 0, 0],
      bhyt3384: [0, 0, 0, 0],
      bhtn3386: [0, 0, 0, 0],
    },
    // Đúng cấu trúc BE dựng (buildNvcsSections): 4 nhóm, có cả BHXH.
    nghiaVu: {
      nam: 2026,
      sections: [
        { ma: 'TNDN', tieuDe: 'THUẾ TNDN', rows: [] },
        {
          ma: 'GTGT',
          tieuDe: 'THUẾ GTGT',
          rows: [
            { tt: '1', chiTieu: 'VAT còn kỳ trước', q1: 0, q2: 111, q3: 222, q4: 333, luyKe: 0 },
            { tt: '2', chiTieu: 'VAT bán ra', q1: 0, q2: 9_876_543, q3: 0, q4: 0, luyKe: 9_876_543 },
            { tt: '3', chiTieu: 'VAT mua vào', q1: 0, q2: 1_234_567, q3: 0, q4: 0, luyKe: 1_234_567 },
            { tt: '4', chiTieu: 'VAT còn phải nộp', q1: 0, q2: 8_641_976, q3: 0, q4: 0, luyKe: 8_641_976 },
          ],
        },
        {
          ma: 'TNCN',
          tieuDe: 'THUẾ TNCN',
          // 3.500.000 = 2.500.000 tự lấy từ Có TK 3335 + 1.000.000 nhập tay ở quý 3.
          rows: [{ tt: '1', chiTieu: 'Thuế TNCN phải nộp', q1: 0, q2: 0, q3: 3_500_000, q4: 0, luyKe: 3_500_000 }],
        },
        {
          ma: 'BHXH',
          tieuDe: 'BHXH',
          rows: [{ tt: '1', chiTieu: 'Bảo hiểm phải nộp', q1: 0, q2: 0, q3: 44_444_444, q4: 0, luyKe: 44_444_444 }],
        },
      ],
    },
  };
});

// Quý 2 có số thật, các quý khác để 0 — giống công ty mới phát sinh giữa năm.
bao.quy[1] = {
  ...bao.quy[1],
  dt511: 122_407_408,
  dt515: 349,
  cp642: 159_543_525,
  tongChiPhi: 159_543_525,
  lnTruocThue: -37_135_768,
  chiPhiKhongTru: 5_000_000,
  cpKhongTruAuto: [3_000_000, 0, 2_000_000, 0],
  thuNhapTinhThue: -32_135_768,
  thueTNDN: 0,
  lnSauThue: -37_135_768,
  thueSuat: 0.2,
};
bao.luyKe = {
  dt511: 330_074_890,
  dt515: 2_875,
  dt711: 0,
  cp632: 0,
  cp641: 0,
  cp642: 444_412_681,
  cp811: 0,
  tongChiPhi: 444_412_681,
  lnTruocThue: -114_334_916,
  chiPhiKhongTru: 5_000_000,
  cpKhongTruAuto: [3_000_000, 0, 2_000_000, 0],
  thuNhapTinhThue: -109_334_916,
  thueTNDN: 0,
  lnSauThue: -114_334_916,
  doanhThuLuyKe: 330_077_765,
  thueSuat: 0.2,
};

vi.mock('@/services/taxService', () => ({
  taxReportService: {
    getBaoCaoTNDN: vi.fn().mockResolvedValue(bao),
    getDieuChinh: vi.fn().mockResolvedValue(dieuChinh),
    getNghiaVuChinhSach: vi.fn().mockResolvedValue(nghiaVu),
    putDieuChinh: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/hooks/usePagePermission', () => ({
  usePagePermission: () => ({
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
  }),
}));

vi.mock('@/hooks/useManHinh', () => ({ useManHinh: () => 'desktop' }));

// antd 6 gọi matchMedia lúc dựng và dùng ResizeObserver để đo cột khi bảng có
// `scroll` — bảng này luôn đặt `scroll`. jsdom không có sẵn cả hai.
beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  (globalThis as unknown as Record<string, unknown>).ResizeObserver = w.ResizeObserver;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
});

import BaoCaoTNDNPage from './BaoCaoTNDNPage';

/** Dòng của bảng mang tên chỉ tiêu đã cho. */
const dong = (ten: string): HTMLElement => {
  const o = screen.getByText(ten).closest('tr');
  if (!o) throw new Error(`Không tìm thấy dòng "${ten}"`);
  return o as HTMLElement;
};

describe('BaoCaoTNDNPage', () => {
  it('dựng đủ ba nhóm và KHÔNG còn nhóm bảo hiểm', async () => {
    render(<BaoCaoTNDNPage />);

    await waitFor(() => expect(screen.getByText('THUẾ TNDN')).toBeTruthy());
    expect(screen.getByText('THUẾ GTGT')).toBeTruthy();
    expect(screen.getByText('THUẾ TNCN')).toBeTruthy();

    // Nhóm BHXH của API bị bỏ qua, và 3 ô nhập bảo hiểm cũ cũng không còn.
    expect(screen.queryByText('BHXH')).toBeNull();
    expect(screen.queryByText('Bảo hiểm phải nộp')).toBeNull();
    expect(screen.queryByText(/Bảo hiểm xã hội/)).toBeNull();
    expect(screen.queryByText(/Bảo hiểm thất nghiệp/)).toBeNull();
    expect(screen.queryByText('44.444.444')).toBeNull();
  });

  it('nhóm TNDN gộp doanh thu 511+515+711 như bảng ở Tổng quan', async () => {
    render(<BaoCaoTNDNPage />);
    await waitFor(() => expect(screen.getByText('Doanh thu thuần')).toBeTruthy());

    // Quý 2: 122.407.408 + 349 + 0; lũy kế: 330.074.890 + 2.875.
    const r = dong('Doanh thu thuần');
    expect(within(r).getByText('122.407.757')).toBeTruthy();
    expect(within(r).getByText('330.077.765')).toBeTruthy();

    // Các dòng cũ tách riêng 511/515/711 không còn nữa.
    expect(screen.queryByText('Doanh thu thuần bán hàng')).toBeNull();
    expect(screen.queryByText(/lãi tiền gửi/)).toBeNull();
  });

  it('nhóm GTGT lấy số thẳng từ API nghĩa vụ chính sách', async () => {
    render(<BaoCaoTNDNPage />);
    await waitFor(() => expect(screen.getByText('VAT bán ra')).toBeTruthy());

    // Mỗi dòng hiện số ở cả cột Quý 2 lẫn cột Lũy kế.
    expect(within(dong('VAT bán ra')).getAllByText('9.876.543').length).toBe(2);
    expect(within(dong('VAT mua vào')).getAllByText('1.234.567').length).toBe(2);
    expect(within(dong('VAT còn phải nộp')).getAllByText('8.641.976').length).toBe(2);
  });

  it('giữ ô nhập điều chỉnh, dòng Tổng lấy cả phần tự tính', async () => {
    render(<BaoCaoTNDNPage />);
    await waitFor(() => expect(screen.getByText('Chi phí không được trừ')).toBeTruthy());

    // Chi phí không được trừ: dòng tổng chỉ xem, 4 nhóm bên dưới là ô nhập.
    const rCp = dong('Chi phí dịch vụ, hàng hóa mua vào');
    expect(within(rCp).getAllByRole('spinbutton').length).toBe(4);
    expect(within(rCp).getAllByText('Tổng: 3.000.000').length).toBe(2); // quý 2 + lũy kế

    // Thuế TNCN cũng là ô nhập, "Tổng" = 2.500.000 tự lấy + 1.000.000 nhập tay.
    const rTncn = dong('Thuế TNCN phải nộp');
    expect(within(rTncn).getAllByRole('spinbutton').length).toBe(4);
    expect(within(rTncn).getAllByText('Tổng: 3.500.000').length).toBe(2);
  });
});
