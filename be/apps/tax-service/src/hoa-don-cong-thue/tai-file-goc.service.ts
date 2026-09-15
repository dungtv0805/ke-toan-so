import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import fs from 'node:fs';
import path from 'node:path';
import { HoaDonCongThue } from '@app/entities';
import { PhienCongThueService } from './cong-thue/phien.service';
import { createTokenKeeper } from './cong-thue/token-keeper';
import * as gdt from './cong-thue/gdt-client';
import { ngayHomSau } from './ky';

const NHOM_NAMESPACE: Record<string, string> = {
  thuong: 'query',
  'may-tinh-tien': 'sco-query',
};

export interface KetQuaTaiFile {
  mst: string;
  tong: number;
  boQua: number;
  daTai: number;
  bytes: number;
  conLai: number;
  loi: Array<{ soHoaDon: string; message: string }>;
}

/**
 * Tải file gốc của hóa đơn: gói ZIP chứa XML có chữ ký số.
 *
 * ĐÂY LÀ BẢN GỐC theo nghĩa pháp lý. Cổng Thuế KHÔNG có endpoint PDF — đã kiểm
 * chứng bằng cách đọc hết 24 file bundle JavaScript công khai của cổng: chỉ có
 * export-xml và export-excel, không có export-pdf. Bản PDF trên giao diện cổng
 * là do chính trình duyệt dựng HTML rồi gọi window.print(). Điều này khớp với
 * Nghị định 123/2020: bản gốc hợp pháp của hóa đơn điện tử là file XML có chữ
 * ký số, PDF chỉ là bản thể hiện.
 *
 * Mỗi hóa đơn là MỘT request riêng tới cổng nên việc này không chạy kèm lúc
 * đồng bộ. Token sống khoảng một giờ còn vài trăm request thì lâu hơn thế, nên
 * TokenKeeper lo phần đăng nhập lại giữa chừng.
 */
@Injectable()
export class TaiFileGocService {
  private readonly logger = new Logger(TaiFileGocService.name);

  constructor(
    @InjectRepository(HoaDonCongThue)
    private readonly hoaDonRepo: Repository<HoaDonCongThue>,
    private readonly phien: PhienCongThueService,
  ) {}

  private get thuMucGoc(): string {
    return process.env.HOA_DON_DIR || '/app/logs/hoa-don';
  }

  /** Bỏ ký tự mà hệ tệp không cho phép trong tên file. */
  private an(s: unknown): string {
    return String(s ?? 'khong-ro').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
  }

  /**
   * Đường dẫn file, đặt tên theo bộ khóa tự nhiên của hóa đơn.
   * Tải lại sẽ ghi đè đúng file cũ thay vì sinh bản sao "(1)", "(2)".
   */
  private duongDan(hd: HoaDonCongThue): string {
    const ky = hd.ngayLap ? new Date(hd.ngayLap).toISOString().slice(0, 7) : 'khong-ro-ky';
    const ten = [this.an(hd.mstNguoiBan), this.an(hd.kyHieu), this.an(hd.soHoaDon)].join('_');
    return path.join(this.thuMucGoc, this.an(hd.mst), ky, this.an(hd.chieu), `${ten}.zip`);
  }

  private daCoFile(hd: HoaDonCongThue): boolean {
    return Boolean(hd.duongDanFileGoc) && fs.existsSync(hd.duongDanFileGoc);
  }

  /**
   * Tải file gốc cho các hóa đơn của một khoảng ngày.
   *
   * Bỏ qua hóa đơn đã có file, nên bấm lại nhiều lần chỉ tải phần còn thiếu.
   * Một hóa đơn lỗi không chặn những cái sau; cần captcha thì dừng hẳn thay vì
   * nện cổng hàng trăm request vô vọng.
   */
  async taiKhoang(
    tenantId: string,
    {
      mst,
      tuNgay,
      denNgay,
      gioiHan = 300,
      taiLai = false,
    }: { mst: string; tuNgay: string; denNgay: string; gioiHan?: number; taiLai?: boolean },
  ): Promise<KetQuaTaiFile> {
    const giuToken = createTokenKeeper({
      phien: {
        layToken: () => this.phien.layToken(tenantId, mst),
        boToken: () => this.phien.boToken(tenantId, mst),
      },
      mst,
    });

    const tatCa = (await this.hoaDonRepo.find({ where: { mst } as any }))
      .filter((hd) => hd.isActive !== false)
      .filter((hd) => this.trongKhoang(hd, tuNgay, denNgay));

    const canTai = taiLai ? tatCa : tatCa.filter((hd) => !this.daCoFile(hd));
    const lo = canTai.slice(0, gioiHan);

    const ketQua: KetQuaTaiFile = {
      mst,
      tong: tatCa.length,
      boQua: tatCa.length - canTai.length,
      daTai: 0,
      bytes: 0,
      conLai: canTai.length - lo.length,
      loi: [],
    };

    for (const hd of lo) {
      try {
        const dich = this.duongDan(hd);
        if (!taiLai && fs.existsSync(dich)) {
          hd.duongDanFileGoc = dich;
          await this.hoaDonRepo.save(hd);
          ketQua.boQua++;
          continue;
        }

        const buffer: Buffer = await giuToken.chay((token) =>
          gdt.downloadXml({
            token,
            namespace: NHOM_NAMESPACE[hd.nhom] ?? 'query',
            query: {
              nbmst: String(hd.mstNguoiBan ?? ''),
              khhdon: String(hd.kyHieu ?? ''),
              shdon: String(hd.soHoaDon ?? ''),
              khmshdon: String(hd.mauSo ?? ''),
            },
          }),
        );

        fs.mkdirSync(path.dirname(dich), { recursive: true });
        fs.writeFileSync(dich, buffer);

        hd.duongDanFileGoc = dich;
        await this.hoaDonRepo.save(hd);

        ketQua.daTai++;
        ketQua.bytes += buffer.length;
      } catch (err: any) {
        if (err?.code === 'CHUA_DANG_NHAP' || err?.code === 'CAN_MAT_KHAU') throw err;
        ketQua.loi.push({ soHoaDon: String(hd.soHoaDon ?? ''), message: err?.message ?? String(err) });
      }
    }

    return ketQua;
  }

  /** Bao nhiêu hóa đơn trong khoảng đã có file gốc trên đĩa. */
  async daTaiBaoNhieu(
    mst: string,
    tuNgay: string,
    denNgay: string,
  ): Promise<{ tong: number; daCoFile: number }> {
    const ds = (await this.hoaDonRepo.find({ where: { mst } as any }))
      .filter((hd) => hd.isActive !== false)
      .filter((hd) => this.trongKhoang(hd, tuNgay, denNgay));

    return { tong: ds.length, daCoFile: ds.filter((hd) => this.daCoFile(hd)).length };
  }

  /**
   * Chặn trên phải là "nhỏ hơn ngày hôm sau": ngày lập có cả phần giờ nên so
   * trực tiếp với ngày trần sẽ làm hóa đơn lập ngày cuối kỳ rơi khỏi danh sách.
   */
  private trongKhoang(hd: HoaDonCongThue, tuNgay: string, denNgay: string): boolean {
    if (!hd.ngayLap) return false;
    const n = new Date(hd.ngayLap);
    if (tuNgay && n < new Date(`${tuNgay}T00:00:00`)) return false;
    if (denNgay && n >= new Date(`${ngayHomSau(denNgay)}T00:00:00`)) return false;
    return true;
  }
}
