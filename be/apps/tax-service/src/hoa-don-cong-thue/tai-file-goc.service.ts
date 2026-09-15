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

export interface LuotTaiFile {
  id: number;
  tenantId: string;
  mst: string;
  tuNgay: string;
  denNgay: string;
  trangThai: 'dang_chay' | 'xong';
  /** Tổng số hóa đơn trong khoảng. */
  tong: number;
  /** Đã xử lý bao nhiêu trong lô lần này — dùng để vẽ thanh tiến độ. */
  daXuLy: number;
  /** Kích thước lô lần này (tổng trừ phần đã có file). */
  loNay: number;
  daTai: number;
  boQua: number;
  bytes: number;
  conLai: number;
  loi: Array<{ soHoaDon: string; message: string }>;
  batDauLuc: string;
  ketThucLuc: string | null;
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

  /** Các lượt tải đang/đã chạy, giữ trong bộ nhớ tiến trình như phiếu chạy. */
  private readonly luot = new Map<number, LuotTaiFile>();
  private demId = 0;

  /**
   * Bắt đầu tải file gốc cho một khoảng ngày.
   *
   * TRẢ VỀ NGAY, việc tải diễn ra ở nền. Đây không phải chuyện tiện lợi mà là
   * bắt buộc: cổng Thuế bị giới hạn 300ms giữa các request, nên 300 hóa đơn
   * mất ít nhất 90 giây — trong khi client chỉ chờ 30 giây (API_CONFIG.TIMEOUT).
   * Làm đồng bộ thì trình duyệt báo lỗi trong lúc server vẫn đang tải, người
   * dùng không biết đường nào mà lần.
   *
   * Giao diện hỏi tiến độ bằng trangThai(id).
   */
  async batDau(
    tenantId: string,
    {
      mst,
      tuNgay,
      denNgay,
      gioiHan = 500,
      taiLai = false,
    }: { mst: string; tuNgay: string; denNgay: string; gioiHan?: number; taiLai?: boolean },
  ): Promise<LuotTaiFile> {
    const tatCa = (await this.hoaDonRepo.find({ where: { mst } as any }))
      .filter((hd) => hd.isActive !== false)
      .filter((hd) => this.trongKhoang(hd, tuNgay, denNgay));

    const canTai = taiLai ? tatCa : tatCa.filter((hd) => !this.daCoFile(hd));
    const lo = canTai.slice(0, gioiHan);

    const l: LuotTaiFile = {
      id: ++this.demId,
      tenantId,
      mst,
      tuNgay,
      denNgay,
      trangThai: 'dang_chay',
      tong: tatCa.length,
      daXuLy: 0,
      loNay: lo.length,
      daTai: 0,
      boQua: tatCa.length - canTai.length,
      bytes: 0,
      conLai: canTai.length - lo.length,
      loi: [],
      batDauLuc: new Date().toISOString(),
      ketThucLuc: null,
    };
    this.luot.set(l.id, l);

    void this.chay(l, lo, taiLai);
    return l;
  }

  trangThai(id: number): LuotTaiFile | null {
    return this.luot.get(Number(id)) ?? null;
  }

  /** Lượt tải file gần nhất của một mã số thuế, để giao diện mở lại đúng chỗ. */
  ganNhat(tenantId: string, mst: string): LuotTaiFile | null {
    let ket: LuotTaiFile | null = null;
    for (const l of this.luot.values()) {
      if (l.tenantId === tenantId && l.mst === mst && (!ket || l.id > ket.id)) ket = l;
    }
    return ket;
  }

  /**
   * Vòng tải thật. KHÔNG BAO GIỜ ném lỗi ra ngoài — lỗi ghi vào lượt chạy để
   * giao diện đọc, vì không còn ai đang chờ request này nữa.
   */
  private async chay(l: LuotTaiFile, lo: HoaDonCongThue[], taiLai: boolean) {
    try {
      const giuToken = createTokenKeeper({
        phien: this.phien.boGiuToken(l.tenantId, l.mst),
        mst: l.mst,
      });

      for (const hd of lo) {
        try {
          const dich = this.duongDan(hd);
          if (!taiLai && fs.existsSync(dich)) {
            hd.duongDanFileGoc = dich;
            await this.hoaDonRepo.save(hd);
            l.boQua++;
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

          l.daTai++;
          l.bytes += buffer.length;
        } catch (err: any) {
          // Cần người nhập captcha thì mọi hóa đơn còn lại cũng hỏng y hệt:
          // dừng hẳn thay vì nện cổng thêm hàng trăm request vô vọng.
          if (err?.code === 'CHUA_DANG_NHAP' || err?.code === 'CAN_MAT_KHAU') {
            l.loi.push({ soHoaDon: '', message: 'Phiên cổng Thuế đã hết, cần đăng nhập lại' });
            break;
          }
          l.loi.push({
            soHoaDon: String(hd.soHoaDon ?? ''),
            message: err?.message ?? String(err),
          });
        } finally {
          l.daXuLy++;
        }
      }
    } catch (err: any) {
      l.loi.push({ soHoaDon: '', message: err?.message ?? String(err) });
    } finally {
      l.trangThai = 'xong';
      l.ketThucLuc = new Date().toISOString();
      this.logger.log(
        `Tải file gốc ${l.mst} (${l.tuNgay}..${l.denNgay}): ` +
          `${l.daTai}/${l.loNay} file, ${(l.bytes / 1024 / 1024).toFixed(1)} MB, ` +
          `bỏ qua ${l.boQua}, còn lại ${l.conLai}` +
          (l.loi.length ? `, ${l.loi.length} lỗi: ${l.loi[0].message}` : ''),
      );
    }
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
