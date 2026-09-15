import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { taoXlsx, chuCot } from './tao-xlsx';

/**
 * .xlsx ở đây là tự viết nên không được tin: mọi test đều mở file bằng công cụ
 * bên ngoài (unzip) và đọc XML bên trong, thay vì tự nhận định là đúng.
 */
describe('taoXlsx', () => {
  let thuMuc: string;

  beforeEach(() => {
    thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'xlsx-test-'));
  });
  afterEach(() => {
    fs.rmSync(thuMuc, { recursive: true, force: true });
  });

  const ghiVaGiaiNen = async (sheets: Parameters<typeof taoXlsx>[0]) => {
    const f = path.join(thuMuc, 'a.xlsx');
    fs.writeFileSync(f, await taoXlsx(sheets));
    const ra = path.join(thuMuc, 'ra');
    execFileSync('unzip', ['-q', f, '-d', ra]);
    return { f, ra };
  };

  it('chuCot đổi số thứ tự thành chữ cột đúng kiểu Excel', () => {
    expect(chuCot(0)).toBe('A');
    expect(chuCot(25)).toBe('Z');
    expect(chuCot(26)).toBe('AA');
    expect(chuCot(51)).toBe('AZ');
    expect(chuCot(52)).toBe('BA');
  });

  it('tạo file ZIP hợp lệ, có đủ các phần Excel bắt buộc', async () => {
    const { f, ra } = await ghiVaGiaiNen([{ ten: 'Tổng hợp', hang: [['A'], [1]] }]);
    expect(execFileSync('unzip', ['-t', f], { encoding: 'utf8' })).toContain('No errors detected');
    for (const p of [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/worksheets/sheet1.xml',
    ]) {
      expect(fs.existsSync(path.join(ra, p))).toBe(true);
    }
  });

  it('số ghi thành ô số, chữ ghi thành ô chữ', async () => {
    const { ra } = await ghiVaGiaiNen([{ ten: 'S', hang: [['Tên', 'Tiền'], ['Bút bi', 15000]] }]);
    const xml = fs.readFileSync(path.join(ra, 'xl/worksheets/sheet1.xml'), 'utf8');
    expect(xml).toContain('<c r="B2"><v>15000</v></c>');
    expect(xml).toContain('t="inlineStr"');
    expect(xml).toContain('Bút bi');
  });

  it('thoát ký tự XML để tên hàng có & < > không làm hỏng file', async () => {
    const { f, ra } = await ghiVaGiaiNen([
      { ten: 'S', hang: [['Dịch vụ A&B <đặc biệt>']] },
    ]);
    expect(execFileSync('unzip', ['-t', f], { encoding: 'utf8' })).toContain('No errors detected');
    const xml = fs.readFileSync(path.join(ra, 'xl/worksheets/sheet1.xml'), 'utf8');
    expect(xml).toContain('A&amp;B &lt;đặc biệt&gt;');
    expect(xml).not.toContain('<đặc biệt>');
  });

  it('cắt tên sheet quá dài và bỏ ký tự Excel cấm', async () => {
    const { ra } = await ghiVaGiaiNen([
      { ten: 'Chi tiết/hàng hóa: rất dài rất dài rất dài rất dài', hang: [['x']] },
    ]);
    const wb = fs.readFileSync(path.join(ra, 'xl/workbook.xml'), 'utf8');
    const ten = /name="([^"]+)"/.exec(wb)?.[1] ?? '';
    expect(ten.length).toBeLessThanOrEqual(31);
    expect(ten).not.toMatch(/[:\\/?*[\]]/);
  });

  it('nhiều sheet thì mỗi sheet một file riêng', async () => {
    const { ra } = await ghiVaGiaiNen([
      { ten: 'Tổng hợp', hang: [['a']] },
      { ten: 'Chi tiết', hang: [['b']] },
    ]);
    expect(fs.existsSync(path.join(ra, 'xl/worksheets/sheet2.xml'))).toBe(true);
    expect(fs.readFileSync(path.join(ra, 'xl/workbook.xml'), 'utf8')).toContain('Chi tiết');
  });

  it('ô rỗng thì bỏ hẳn, không ghi ô trống vô nghĩa', async () => {
    const { ra } = await ghiVaGiaiNen([{ ten: 'S', hang: [['a', null, undefined, '', 'b']] }]);
    const xml = fs.readFileSync(path.join(ra, 'xl/worksheets/sheet1.xml'), 'utf8');
    expect(xml).toContain('r="A1"');
    expect(xml).toContain('r="E1"');
    expect(xml).not.toContain('r="B1"');
  });
});
