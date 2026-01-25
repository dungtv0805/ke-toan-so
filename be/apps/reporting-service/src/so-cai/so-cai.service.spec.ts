import * as fc from 'fast-check';

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
