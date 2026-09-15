import fs from 'node:fs';
import { Readable } from 'node:stream';

/**
 * Gói nhiều file trên đĩa thành MỘT file ZIP để tải về.
 *
 * Tự viết thay vì thêm thư viện vì dự án không có sẵn gói nén nào, mà thêm gói
 * runtime vào container này là một cái bẫy đã gây sự cố thật (xem skill
 * db-deploy: `npm install` gói mới xóa mất các gói `--no-save` cài trước đó).
 *
 * Dùng phương thức "store" — chép nguyên không nén. Đây là lựa chọn ĐÚNG chứ
 * không phải đi tắt: mỗi file bên trong vốn đã là một file ZIP của cổng Thuế,
 * nén lại lần nữa chỉ tốn CPU mà không giảm được mấy byte.
 *
 * Mỗi lần chỉ giữ MỘT file trong bộ nhớ: đọc, ghi ra luồng, rồi bỏ. Một kỳ vài
 * trăm hóa đơn vẫn không làm phình bộ nhớ tiến trình.
 */

const BANG_CRC = (() => {
  const b = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    b[i] = c >>> 0;
  }
  return b;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = BANG_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Giờ/ngày kiểu MS-DOS mà định dạng ZIP dùng. */
function gioNgayDos(d: Date): { gio: number; ngay: number } {
  return {
    gio: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2) & 0x1f),
    ngay: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

export interface MucZip {
  /** Tên hiển thị bên trong file ZIP. */
  ten: string;
  /** Đường dẫn thật trên đĩa. Bỏ trống nếu đã có sẵn `noiDung`. */
  duongDan?: string;
  /** Nội dung có sẵn trong bộ nhớ, dùng cho file vừa tải về chưa ghi ra đĩa. */
  noiDung?: Buffer;
}

/**
 * @returns luồng đọc phát ra nội dung một file ZIP hợp lệ.
 *   File không đọc được thì BỎ QUA, không làm hỏng cả gói — thà thiếu một hóa
 *   đơn còn hơn trả về file ZIP vỡ mà người dùng không mở được cái nào.
 */
export function taoZip(muc: MucZip[]): Readable {
  return Readable.from(
    (async function* () {
      const thuMuc: Buffer[] = [];
      let viTri = 0;
      let dem = 0;

      for (const m of muc) {
        let noiDung: Buffer;
        let sua: Date;
        if (m.noiDung) {
          noiDung = m.noiDung;
          sua = new Date();
        } else {
          try {
            noiDung = fs.readFileSync(m.duongDan as string);
            sua = fs.statSync(m.duongDan as string).mtime;
          } catch {
            continue;
          }
        }

        const ten = Buffer.from(m.ten, 'utf8');
        const crc = crc32(noiDung);
        const { gio, ngay } = gioNgayDos(sua);
        // Bit 11 = tên file mã hóa UTF-8, để tên có dấu không bị vỡ.
        const co = 0x0800;

        const dau = Buffer.alloc(30);
        dau.writeUInt32LE(0x04034b50, 0);
        dau.writeUInt16LE(20, 4);
        dau.writeUInt16LE(co, 6);
        dau.writeUInt16LE(0, 8); // 0 = store
        dau.writeUInt16LE(gio, 10);
        dau.writeUInt16LE(ngay, 12);
        dau.writeUInt32LE(crc, 14);
        dau.writeUInt32LE(noiDung.length, 18);
        dau.writeUInt32LE(noiDung.length, 22);
        dau.writeUInt16LE(ten.length, 26);
        dau.writeUInt16LE(0, 28);

        const mucThuMuc = Buffer.alloc(46);
        mucThuMuc.writeUInt32LE(0x02014b50, 0);
        mucThuMuc.writeUInt16LE(20, 4);
        mucThuMuc.writeUInt16LE(20, 6);
        mucThuMuc.writeUInt16LE(co, 8);
        mucThuMuc.writeUInt16LE(0, 10);
        mucThuMuc.writeUInt16LE(gio, 12);
        mucThuMuc.writeUInt16LE(ngay, 14);
        mucThuMuc.writeUInt32LE(crc, 16);
        mucThuMuc.writeUInt32LE(noiDung.length, 20);
        mucThuMuc.writeUInt32LE(noiDung.length, 24);
        mucThuMuc.writeUInt16LE(ten.length, 28);
        mucThuMuc.writeUInt16LE(0, 30); // extra
        mucThuMuc.writeUInt16LE(0, 32); // comment
        mucThuMuc.writeUInt16LE(0, 34); // đĩa bắt đầu
        mucThuMuc.writeUInt16LE(0, 36); // thuộc tính trong
        mucThuMuc.writeUInt32LE(0, 38); // thuộc tính ngoài
        mucThuMuc.writeUInt32LE(viTri, 42);
        thuMuc.push(Buffer.concat([mucThuMuc, ten]));

        yield Buffer.concat([dau, ten]);
        yield noiDung;

        viTri += dau.length + ten.length + noiDung.length;
        dem++;
      }

      const batDauThuMuc = viTri;
      let coThuMuc = 0;
      for (const t of thuMuc) {
        coThuMuc += t.length;
        yield t;
      }

      const ket = Buffer.alloc(22);
      ket.writeUInt32LE(0x06054b50, 0);
      ket.writeUInt16LE(0, 4);
      ket.writeUInt16LE(0, 6);
      ket.writeUInt16LE(dem, 8);
      ket.writeUInt16LE(dem, 10);
      ket.writeUInt32LE(coThuMuc, 12);
      ket.writeUInt32LE(batDauThuMuc, 16);
      ket.writeUInt16LE(0, 20);
      yield ket;
    })(),
  );
}
