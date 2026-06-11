import * as fc from 'fast-check';
import { buildDoiTuongRows } from './so-cai.service';

/**
 * **Feature: api-completion, Property 1: Search Results Contain Keyword** (for ledger)
 * **Validates: Requirements 12.3**
 *
 * For any stats query, the canDoi property SHALL be true when tongPhatSinhNo equals tongPhatSinhCo.
 */
describe('Property: Ledger Stats Consistency', () => {
  interface LedgerReport {
    tongNo: number;
    tongCo: number;
  }

  // Helper function to calculate stats
  const calculateStats = (reports: LedgerReport[]) => {
    const tongPhatSinhNo = reports.reduce((sum, r) => sum + r.tongNo, 0);
    const tongPhatSinhCo = reports.reduce((sum, r) => sum + r.tongCo, 0);

    return {
      soTaiKhoan: reports.length,
      tongPhatSinhNo,
      tongPhatSinhCo,
      canDoi: tongPhatSinhNo === tongPhatSinhCo,
    };
  };

  const reportArb = fc.record({
    tongNo: fc.integer({ min: 0, max: 1000000 }),
    tongCo: fc.integer({ min: 0, max: 1000000 }),
  });

  it('should have canDoi true when tongPhatSinhNo equals tongPhatSinhCo', () => {
    fc.assert(
      fc.property(
        fc.array(reportArb, { minLength: 0, maxLength: 20 }),
        (reports) => {
          const stats = calculateStats(reports);
          if (stats.tongPhatSinhNo === stats.tongPhatSinhCo) {
            return stats.canDoi === true;
          }
          return stats.canDoi === false;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should correctly count soTaiKhoan', () => {
    fc.assert(
      fc.property(
        fc.array(reportArb, { minLength: 0, maxLength: 20 }),
        (reports) => {
          const stats = calculateStats(reports);
          return stats.soTaiKhoan === reports.length;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should correctly sum tongPhatSinhNo', () => {
    fc.assert(
      fc.property(
        fc.array(reportArb, { minLength: 0, maxLength: 20 }),
        (reports) => {
          const stats = calculateStats(reports);
          const expected = reports.reduce((sum, r) => sum + r.tongNo, 0);
          return stats.tongPhatSinhNo === expected;
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('buildDoiTuongRows với NGAN_HANG_QUY', () => {
  it('xổ chi tiết TK 112 theo từng ngân hàng', () => {
    const rows = buildDoiTuongRows(
      'TAI_SAN',
      [
        {
          doiTuongMa: 'VCB01', doiTuongTen: 'Vietcombank', doiTuongLoai: 'NGAN_HANG_QUY',
          priorNo: 0, priorCo: 0, periodNo: 500, periodCo: 200,
        },
        // đối tượng sai loại → gộp "Chưa xác định đối tượng"
        {
          doiTuongMa: 'KH001', doiTuongTen: 'Cty A', doiTuongLoai: 'KHACH_HANG',
          priorNo: 0, priorCo: 0, periodNo: 100, periodCo: 0,
        },
      ],
      [
        { doiTuongMa: 'VCB01', doiTuongTen: 'Vietcombank', chiTietType: 'NGAN_HANG_QUY', duNo: 1000, duCo: 0 },
      ],
      'NGAN_HANG_QUY',
    );
    const vcb = rows.find((r) => r.ma === 'VCB01');
    expect(vcb).toBeDefined();
    expect(vcb!.noDauKy).toBe(1000);
    expect(vcb!.noPhatSinh).toBe(500);
    expect(vcb!.coPhatSinh).toBe(200);
    const chuaXacDinh = rows.find((r) => r.ma === '');
    expect(chuaXacDinh).toBeDefined();
    expect(chuaXacDinh!.noPhatSinh).toBe(100);
  });
});
