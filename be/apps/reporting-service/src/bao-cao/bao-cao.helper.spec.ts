import { openingNetForSide } from './bao-cao.service';

describe('openingNetForSide', () => {
  it('undefined opening → 0', () => {
    expect(openingNetForSide(undefined, 'NO')).toBe(0);
    expect(openingNetForSide(undefined, 'CO')).toBe(0);
  });

  it('phía NO (tài sản): net = duNo - duCo', () => {
    expect(openingNetForSide({ duNo: 1000000, duCo: 0 }, 'NO')).toBe(1000000);
    expect(openingNetForSide({ duNo: 1000000, duCo: 200000 }, 'NO')).toBe(800000);
  });

  it('phía CO (nguồn vốn): net = duCo - duNo', () => {
    expect(openingNetForSide({ duNo: 0, duCo: 500000 }, 'CO')).toBe(500000);
    expect(openingNetForSide({ duNo: 100000, duCo: 500000 }, 'CO')).toBe(400000);
  });
});
