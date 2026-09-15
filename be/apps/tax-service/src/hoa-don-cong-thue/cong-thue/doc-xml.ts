/**
 * Bộ đọc XML tối giản, đủ dùng cho hóa đơn điện tử của cổng Thuế.
 *
 * Không thêm thư viện: dự án không có sẵn bộ đọc XML nào, mà thêm gói npm vào
 * container này là cái bẫy đã gây sự cố thật (xem skill db-deploy). File hóa
 * đơn do máy sinh, cấu trúc cố định và không có DTD hay thực thể tự định nghĩa,
 * nên một bộ đọc nhỏ là đủ và kiểm chứng được.
 *
 * KHÔNG dùng cho XML từ nguồn tùy ý.
 */

export interface Nut {
  ten: string;
  chu: string;
  con: Nut[];
}

const THUC_THE: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
};

function giaiMa(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (tron, m: string) => {
    if (m[0] === '#') {
      const ma = m[1] === 'x' || m[1] === 'X' ? parseInt(m.slice(2), 16) : parseInt(m.slice(1), 10);
      return Number.isFinite(ma) ? String.fromCodePoint(ma) : tron;
    }
    return THUC_THE[m] ?? tron;
  });
}

/** Bỏ tiền tố namespace: 'ds:Signature' -> 'Signature'. */
const bocTen = (t: string) => t.split(':').pop() as string;

export function docXml(xml: string): Nut {
  const goc: Nut = { ten: '#goc', chu: '', con: [] };
  const ngan: Nut[] = [goc];

  // Bỏ khai báo <?...?>, chú thích <!--...-->, DOCTYPE và CDATA giữ nguyên chữ.
  const s = xml
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_m, t: string) =>
      t.replace(/&/g, '&amp;').replace(/</g, '&lt;'),
    );

  const the = /<\s*(\/?)\s*([^\s/>]+)([^>]*?)(\/?)\s*>/g;
  let m: RegExpExecArray | null;
  let viTri = 0;

  while ((m = the.exec(s)) !== null) {
    const chu = s.slice(viTri, m.index);
    if (chu.trim()) ngan[ngan.length - 1].chu += giaiMa(chu);
    viTri = the.lastIndex;

    const dong = m[1] === '/';
    const tuDong = m[4] === '/';
    const ten = bocTen(m[2]);

    if (dong) {
      if (ngan.length > 1) ngan.pop();
      continue;
    }
    const nut: Nut = { ten, chu: '', con: [] };
    ngan[ngan.length - 1].con.push(nut);
    if (!tuDong) ngan.push(nut);
  }

  return goc.con[0] ?? goc;
}

/** Duyệt toàn cây, trả về mọi nút mang tên này. */
export function timTatCa(nut: Nut, ten: string): Nut[] {
  const ket: Nut[] = [];
  const di = (n: Nut) => {
    if (n.ten === ten) ket.push(n);
    n.con.forEach(di);
  };
  di(nut);
  return ket;
}

/** Chữ của nút con trực tiếp mang tên này, '' nếu không có. */
export function chuCon(nut: Nut, ten: string): string {
  return nut.con.find((c) => c.ten === ten)?.chu.trim() ?? '';
}

/** Chữ thành số; '' hoặc không phải số thì trả 0 — dùng cho cột tiền trong Excel. */
export function so(v: string): number {
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
