import { docXml, timTatCa, chuCon, so } from './doc-xml';

/** Mẫu rút gọn nhưng giữ NGUYÊN cấu trúc file thật của cổng Thuế. */
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<HDon>
  <DLHDon Id="data">
    <TTChung>
      <KHHDon>C26TVT</KHHDon>
      <SHDon>00000171</SHDon>
      <NLap>2026-09-09</NLap>
    </TTChung>
    <NDHDon>
      <NBan><Ten>CÔNG TY A &amp; B</Ten><MST>0106769148</MST></NBan>
      <DSHHDVu>
        <HHDVu>
          <TChat>1</TChat><STT>1</STT>
          <THHDVu>Dịch vụ &lt;thí nghiệm&gt;</THHDVu>
          <DVTinh>Gói</DVTinh><SLuong>2</SLuong><DGia>1000</DGia>
          <ThTien>92592593</ThTien><TSuat>8%</TSuat>
        </HHDVu>
        <HHDVu>
          <STT>2</STT><THHDVu>Hàng hóa khác</THHDVu><ThTien>1000</ThTien><TSuat>KCT</TSuat>
        </HHDVu>
      </DSHHDVu>
      <TToan><TgTCThue>92592593</TgTCThue><TgTThue>7407407</TgTThue></TToan>
    </NDHDon>
  </DLHDon>
  <DSCKS><NBan><ds:Signature><ds:SignatureValue>abc</ds:SignatureValue></ds:Signature></NBan></DSCKS>
</HDon>`;

describe('docXml', () => {
  const goc = docXml(XML);

  it('đọc đúng gốc và các nút lồng nhau', () => {
    expect(goc.ten).toBe('HDon');
    expect(timTatCa(goc, 'HHDVu')).toHaveLength(2);
  });

  it('lấy được chữ của nút con trực tiếp', () => {
    const tt = timTatCa(goc, 'TTChung')[0];
    expect(chuCon(tt, 'KHHDon')).toBe('C26TVT');
    expect(chuCon(tt, 'SHDon')).toBe('00000171');
    expect(chuCon(tt, 'KhongCo')).toBe('');
  });

  it('giải mã thực thể XML trong nội dung', () => {
    expect(chuCon(timTatCa(goc, 'NBan')[0], 'Ten')).toBe('CÔNG TY A & B');
    expect(chuCon(timTatCa(goc, 'HHDVu')[0], 'THHDVu')).toBe('Dịch vụ <thí nghiệm>');
  });

  it('bỏ tiền tố namespace nên tìm được thẻ chữ ký', () => {
    expect(timTatCa(goc, 'SignatureValue')).toHaveLength(1);
  });

  it('dòng hàng hóa thiếu trường thì trả chuỗi rỗng chứ không vỡ', () => {
    const h2 = timTatCa(goc, 'HHDVu')[1];
    expect(chuCon(h2, 'DVTinh')).toBe('');
    expect(chuCon(h2, 'THHDVu')).toBe('Hàng hóa khác');
  });

  it('so() đổi chữ sang số, chịu được rỗng và thuế suất dạng chữ', () => {
    expect(so('92592593')).toBe(92592593);
    expect(so('8%')).toBe(8);
    expect(so('')).toBe(0);
    expect(so('KCT')).toBe(0);
  });

  it('thẻ tự đóng không làm lệch cây', () => {
    const g = docXml('<a><b/><c>x</c></a>');
    expect(g.con.map((c) => c.ten)).toEqual(['b', 'c']);
    expect(chuCon(g, 'c')).toBe('x');
  });
});
