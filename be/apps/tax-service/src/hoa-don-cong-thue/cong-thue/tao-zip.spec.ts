import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { taoZip } from './tao-zip';

/**
 * ZIP ở đây là tự viết nên không được tin nó chạy đúng: mọi test dưới đây đều
 * kiểm bằng `unzip` của hệ điều hành, tức đúng thứ người dùng sẽ mở file bằng.
 */
describe('taoZip', () => {
  let thuMuc: string;

  beforeEach(() => {
    thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'));
  });

  afterEach(() => {
    fs.rmSync(thuMuc, { recursive: true, force: true });
  });

  const ghi = (ten: string, noiDung: Buffer | string) => {
    const p = path.join(thuMuc, ten);
    fs.writeFileSync(p, noiDung);
    return p;
  };

  const gom = async (muc: Array<{ ten: string; duongDan: string }>): Promise<string> => {
    const dich = path.join(thuMuc, 'goi.zip');
    const phan: Buffer[] = [];
    for await (const c of taoZip(muc)) phan.push(c as Buffer);
    fs.writeFileSync(dich, Buffer.concat(phan));
    return dich;
  };

  it('tạo file ZIP mà unzip đọc được và toàn vẹn', async () => {
    const a = ghi('a.txt', 'nội dung một');
    const b = ghi('b.bin', Buffer.from([0, 1, 2, 250, 255]));
    const zip = await gom([
      { ten: 'thu-muc-1.txt', duongDan: a },
      { ten: 'thu-muc-2.bin', duongDan: b },
    ]);

    // -t kiểm CRC từng mục; sai CRC là unzip báo lỗi và thoát khác 0.
    const ra = execFileSync('unzip', ['-t', zip], { encoding: 'utf8' });
    expect(ra).toContain('No errors detected');
  });

  it('giải nén ra đúng nội dung ban đầu, kể cả file nhị phân', async () => {
    const goc = Buffer.from([0, 1, 2, 250, 255, 13, 10, 26]);
    const zip = await gom([{ ten: 'nhi-phan.bin', duongDan: ghi('x.bin', goc) }]);

    const ra = path.join(thuMuc, 'ra');
    execFileSync('unzip', ['-q', zip, '-d', ra]);
    expect(fs.readFileSync(path.join(ra, 'nhi-phan.bin'))).toEqual(goc);
  });

  it('giải nén ra đúng tên đã đặt', async () => {
    // Tên file gốc do danhSachFile() sinh ra chỉ gồm mã số thuế, ký hiệu, số
    // hóa đơn và kỳ — toàn ASCII. KHÔNG dựa vào tên có dấu: `unzip` bản kèm
    // macOS bỏ qua cờ UTF-8 và giải mã theo CP437, tên tiếng Việt sẽ hỏng dù
    // byte trong gói đúng chuẩn. Cờ UTF-8 vẫn được đặt cho Windows Explorer.
    const zip = await gom([
      { ten: '2026-09_mua-vao_0106769148_C26TVT_171.zip', duongDan: ghi('c.txt', 'x') },
    ]);
    const ra = path.join(thuMuc, 'ra-ten');
    execFileSync('unzip', ['-q', zip, '-d', ra]);
    expect(fs.readdirSync(ra)).toContain('2026-09_mua-vao_0106769148_C26TVT_171.zip');
  });

  it('bỏ qua file không đọc được thay vì làm hỏng cả gói', async () => {
    const zip = await gom([
      { ten: 'co-that.txt', duongDan: ghi('d.txt', 'giữ lại') },
      { ten: 'khong-ton-tai.txt', duongDan: path.join(thuMuc, 'khong-he-co') },
    ]);

    const ra = execFileSync('unzip', ['-l', zip], { encoding: 'utf8' });
    expect(ra).toContain('co-that.txt');
    expect(ra).not.toContain('khong-ton-tai.txt');
    expect(execFileSync('unzip', ['-t', zip], { encoding: 'utf8' })).toContain('No errors detected');
  });

  it('gói rỗng vẫn là file ZIP hợp lệ', async () => {
    const zip = await gom([]);
    // unzip trả mã 1 kèm "zipfile is empty" - hợp lệ, chỉ là không có mục nào.
    let ra = '';
    try {
      ra = execFileSync('unzip', ['-l', zip], { encoding: 'utf8' });
    } catch (e: any) {
      ra = String(e.stdout ?? '') + String(e.stderr ?? '');
    }
    expect(ra).toMatch(/empty|0 files|Length/i);
  });
});
