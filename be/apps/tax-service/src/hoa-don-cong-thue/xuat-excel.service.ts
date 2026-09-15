import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HoaDonCongThue } from '@app/entities';
import { taoXlsx, type Sheet } from './cong-thue/tao-xlsx';
import { docXml, timTatCa, chuCon, so } from './cong-thue/doc-xml';
import { ngayHomSau, ngayVN } from './ky';

const chay = promisify(execFile);

const CHIEU: Record<string, string> = { 'mua-vao': 'Mua vào', 'ban-ra': 'Bán ra' };
const NHOM: Record<string, string> = { thuong: 'Thường', 'may-tinh-tien': 'Máy tính tiền' };

/** Mã trạng thái xử lý của cổng Thuế, để người đọc Excel không phải tra số. */
const TRANG_THAI: Record<string, string> = {
  '1': 'Mới',
  '2': 'Thay thế',
  '3': 'Bị thay thế',
  '4': 'Điều chỉnh',
  '5': 'Đã cấp mã',
  '6': 'Bị điều chỉnh',
  '7': 'Đã hủy',
  '8': 'Hóa đơn xóa bỏ',
};

/**
 * Kết xuất Excel từ dữ liệu ĐÃ TẢI VỀ, không gọi lại cổng Thuế.
 *
 * Làm offline là có chủ ý: cổng giới hạn nhịp truy cập và có lúc chặn thẳng
 * bằng tường lửa. Bảng kê thì kế toán mở đi mở lại nhiều lần trong ngày, không
 * có lý do gì mỗi lần lại đi hỏi cổng.
 *
 *  - Tổng hợp: một dòng một hóa đơn, lấy từ cơ sở dữ liệu.
 *  - Chi tiết: một dòng một mặt hàng, đọc từ file XML gốc đã tải.
 */
@Injectable()
export class XuatExcelService {
  private readonly logger = new Logger(XuatExcelService.name);

  constructor(
    @InjectRepository(HoaDonCongThue)
    private readonly hoaDonRepo: Repository<HoaDonCongThue>,
  ) {}

  async tongHop(mst: string, tuNgay: string, denNgay: string): Promise<Buffer> {
    const ds = await this.trongKy(mst, tuNgay, denNgay);

    const hang: Sheet['hang'] = [
      [
        'STT', 'Ký hiệu', 'Số hóa đơn', 'Ngày lập', 'MST người bán', 'Tên người bán',
        'MST người mua', 'Tên người mua', 'Chưa thuế', 'Tiền thuế', 'Thanh toán',
        'Chiều', 'Nhóm', 'Trạng thái', 'Đã tải bản gốc',
      ],
    ];

    ds.forEach((hd, i) => {
      hang.push([
        i + 1,
        hd.kyHieu ?? '',
        hd.soHoaDon ?? '',
        this.ngay(hd.ngayLap),
        hd.mstNguoiBan ?? '',
        hd.tenNguoiBan ?? '',
        hd.mstNguoiMua ?? '',
        hd.tenNguoiMua ?? '',
        Number(hd.giaTriChuaThue ?? 0),
        Number(hd.tienThue ?? 0),
        Number(hd.tongThanhToan ?? 0),
        CHIEU[hd.chieu] ?? hd.chieu ?? '',
        NHOM[hd.nhom] ?? hd.nhom ?? '',
        TRANG_THAI[String(hd.trangThaiXuLy ?? '')] ?? String(hd.trangThaiXuLy ?? ''),
        hd.duongDanFileGoc && fs.existsSync(hd.duongDanFileGoc) ? 'Có' : 'Chưa',
      ]);
    });

    // Dòng cộng cuối: kế toán nào cũng cần con số này để đối chiếu tờ khai.
    if (ds.length) {
      hang.push([
        '', '', '', '', '', '', '', 'CỘNG',
        ds.reduce((t, h) => t + Number(h.giaTriChuaThue ?? 0), 0),
        ds.reduce((t, h) => t + Number(h.tienThue ?? 0), 0),
        ds.reduce((t, h) => t + Number(h.tongThanhToan ?? 0), 0),
      ]);
    }

    this.logger.log(`Excel tổng hợp ${mst} (${tuNgay}..${denNgay}): ${ds.length} hóa đơn`);
    return taoXlsx([{ ten: 'Tổng hợp', hang }]);
  }

  /**
   * Chi tiết hàng hóa, đọc từ XML gốc.
   *
   * Hóa đơn chưa tải bản gốc thì KHÔNG bỏ lặng: vẫn ra một dòng ghi rõ "Chưa
   * tải bản gốc" để người đọc biết bảng kê còn thiếu chỗ nào, thay vì tưởng hóa
   * đơn đó không có hàng hóa.
   */
  async chiTiet(mst: string, tuNgay: string, denNgay: string): Promise<Buffer> {
    const ds = await this.trongKy(mst, tuNgay, denNgay);

    const hang: Sheet['hang'] = [
      [
        'STT', 'Ký hiệu', 'Số hóa đơn', 'Ngày lập', 'MST người bán', 'Tên người bán',
        'STT dòng', 'Tên hàng hóa, dịch vụ', 'Đơn vị tính', 'Số lượng', 'Đơn giá',
        'Thành tiền', 'Thuế suất', 'Ghi chú',
      ],
    ];

    let stt = 0;
    let thieuBanGoc = 0;

    for (const hd of ds) {
      const chung = [
        hd.kyHieu ?? '',
        hd.soHoaDon ?? '',
        this.ngay(hd.ngayLap),
        hd.mstNguoiBan ?? '',
        hd.tenNguoiBan ?? '',
      ];

      const dong = await this.dongHangHoa(hd);
      if (!dong) {
        thieuBanGoc++;
        hang.push([++stt, ...chung, '', '', '', '', '', '', '', 'Chưa tải bản gốc']);
        continue;
      }
      if (!dong.length) {
        hang.push([++stt, ...chung, '', '', '', '', '', '', '', 'Bản gốc không có dòng hàng hóa']);
        continue;
      }

      for (const d of dong) {
        hang.push([
          ++stt, ...chung,
          d.stt, d.ten, d.donVi,
          d.soLuong || null, d.donGia || null, d.thanhTien || null,
          d.thueSuat, '',
        ]);
      }
    }

    this.logger.log(
      `Excel chi tiết ${mst} (${tuNgay}..${denNgay}): ${ds.length} hóa đơn, ${stt} dòng` +
        (thieuBanGoc ? `, ${thieuBanGoc} hóa đơn chưa tải bản gốc` : ''),
    );
    return taoXlsx([{ ten: 'Chi tiết', hang }]);
  }

  /** @returns null nếu chưa có bản gốc; [] nếu có bản gốc nhưng không đọc được dòng nào. */
  private async dongHangHoa(hd: HoaDonCongThue) {
    if (!hd.duongDanFileGoc || !fs.existsSync(hd.duongDanFileGoc)) return null;

    const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'hd-xml-'));
    try {
      await chay('unzip', ['-q', '-o', hd.duongDanFileGoc, '-d', thuMuc], { timeout: 30_000 });
      const f = path.join(thuMuc, 'invoice.xml');
      if (!fs.existsSync(f)) return [];

      return timTatCa(docXml(fs.readFileSync(f, 'utf8')), 'HHDVu').map((n) => ({
        stt: chuCon(n, 'STT'),
        ten: chuCon(n, 'THHDVu'),
        donVi: chuCon(n, 'DVTinh'),
        soLuong: so(chuCon(n, 'SLuong')),
        donGia: so(chuCon(n, 'DGia')),
        thanhTien: so(chuCon(n, 'ThTien')),
        thueSuat: chuCon(n, 'TSuat'),
      }));
    } catch (err: any) {
      this.logger.warn(`Không đọc được XML ${hd.soHoaDon}: ${err?.message ?? err}`);
      return [];
    } finally {
      fs.rmSync(thuMuc, { recursive: true, force: true });
    }
  }

  /** 'dd/MM/yyyy' theo giờ Việt Nam — xem ngayVN() để biết vì sao không dùng UTC. */
  private ngay(v: Date | string | null | undefined): string {
    const s = ngayVN(v);
    return s ? s.split('-').reverse().join('/') : '';
  }

  private async trongKy(mst: string, tuNgay: string, denNgay: string): Promise<HoaDonCongThue[]> {
    const tu = tuNgay ? new Date(`${tuNgay}T00:00:00`) : null;
    const den = denNgay ? new Date(`${ngayHomSau(denNgay)}T00:00:00`) : null;

    return (await this.hoaDonRepo.find({ where: { mst } as any }))
      .filter((hd) => hd.isActive !== false)
      .filter((hd) => {
        if (!hd.ngayLap) return !tu && !den;
        const n = new Date(hd.ngayLap);
        if (tu && n < tu) return false;
        if (den && n >= den) return false;
        return true;
      })
      .sort((a, b) => new Date(a.ngayLap ?? 0).getTime() - new Date(b.ngayLap ?? 0).getTime());
  }
}
