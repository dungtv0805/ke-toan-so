import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import fs from 'node:fs';
import { HoaDonCongThue } from '@app/entities';
import { pdfTuZip, coChromium } from './cong-thue/pdf';
import { ngayHomSau } from './ky';

export type TrangThaiMucPdf = 'cho' | 'xong' | 'bo_qua' | 'loi';

/** Một dòng cho MỘT hóa đơn, để giao diện chỉ đúng file nào hỏng. */
export interface MucPdf {
  soHoaDon: string;
  kyHieu: string;
  mstNguoiBan: string;
  ngayLap: string | null;
  trangThai: TrangThaiMucPdf;
  ghiChu: string | null;
}

export interface LuotTaoPdf {
  id: number;
  tenantId: string;
  mst: string;
  tuNgay: string;
  denNgay: string;
  trangThai: 'dang_chay' | 'xong';
  /** Số hóa đơn trong kỳ đã có file gốc — chỉ những hóa đơn này dựng được PDF. */
  tong: number;
  daXuLy: number;
  daTao: number;
  boQua: number;
  loi: Array<{ soHoaDon: string; message: string }>;
  /** Trạng thái TỪNG hóa đơn. Con số tổng không cho biết file nào hỏng. */
  muc: MucPdf[];
  batDauLuc: string;
  ketThucLuc: string | null;
}

/**
 * Dựng bản thể hiện PDF cho hóa đơn đã tải file gốc.
 *
 * CHẠY NỀN vì mỗi hóa đơn tốn khoảng một, hai giây cho Chromium khởi động và
 * dàn trang — trăm hóa đơn là vài phút, dài hơn hẳn 30 giây chờ của client.
 * Đây đúng bài học từ nút "File gốc" trước đây: làm đồng bộ thì trình duyệt báo
 * lỗi trong lúc máy chủ vẫn đang chạy ngon lành.
 *
 * PDF ghi cạnh file ZIP gốc, đổi đuôi .zip thành .pdf, nên lần sau mở lại là có
 * ngay không phải dựng lại.
 */
@Injectable()
export class TaoPdfService {
  private readonly logger = new Logger(TaoPdfService.name);

  constructor(
    @InjectRepository(HoaDonCongThue)
    private readonly hoaDonRepo: Repository<HoaDonCongThue>,
  ) {}

  private readonly luot = new Map<number, LuotTaoPdf>();
  private demId = 0;

  private duongDanPdf(zip: string): string {
    return zip.replace(/\.zip$/i, '.pdf');
  }

  /** Bắt đầu dựng PDF cho cả kỳ; trả về ngay, hỏi tiến độ bằng trangThai(id). */
  async batDau(
    tenantId: string,
    { mst, tuNgay, denNgay, taoLai = false }: { mst: string; tuNgay: string; denNgay: string; taoLai?: boolean },
  ): Promise<LuotTaoPdf> {
    const ds = await this.hoaDonCoFileGoc(mst, tuNgay, denNgay);

    const l: LuotTaoPdf = {
      id: ++this.demId,
      tenantId,
      mst,
      tuNgay,
      denNgay,
      trangThai: 'dang_chay',
      tong: ds.length,
      daXuLy: 0,
      daTao: 0,
      boQua: 0,
      loi: [],
      muc: ds.map((hd) => ({
        soHoaDon: String(hd.soHoaDon ?? ''),
        kyHieu: String(hd.kyHieu ?? ''),
        mstNguoiBan: String(hd.mstNguoiBan ?? ''),
        ngayLap: hd.ngayLap ? new Date(hd.ngayLap).toISOString().slice(0, 10) : null,
        trangThai: 'cho',
        ghiChu: null,
      })),
      batDauLuc: new Date().toISOString(),
      ketThucLuc: null,
    };
    this.luot.set(l.id, l);

    void this.chay(l, ds, taoLai);
    return l;
  }

  trangThai(id: number): LuotTaoPdf | null {
    return this.luot.get(Number(id)) ?? null;
  }

  ganNhat(tenantId: string, mst: string): LuotTaoPdf | null {
    let ket: LuotTaoPdf | null = null;
    for (const l of this.luot.values()) {
      if (l.tenantId === tenantId && l.mst === mst && (!ket || l.id > ket.id)) ket = l;
    }
    return ket;
  }

  /** KHÔNG ném lỗi ra ngoài: không còn ai chờ request này, lỗi ghi vào lượt chạy. */
  private async chay(l: LuotTaoPdf, ds: HoaDonCongThue[], taoLai: boolean) {
    try {
      if (!coChromium()) {
        const message = 'Máy chủ chưa cài Chromium nên không dựng được PDF';
        l.loi.push({ soHoaDon: '', message });
        // Đánh dấu từng dòng thay vì để treo ở 'cho': người dùng phải thấy
        // được vì sao không dòng nào chạy.
        for (const m of l.muc) {
          m.trangThai = 'loi';
          m.ghiChu = message;
        }
        return;
      }

      for (let i = 0; i < ds.length; i++) {
        const hd = ds[i];
        const m = l.muc[i];
        try {
          const dich = this.duongDanPdf(hd.duongDanFileGoc);
          if (!taoLai && fs.existsSync(dich)) {
            l.boQua++;
            m.trangThai = 'bo_qua';
            m.ghiChu = 'Đã có bản PDF từ trước';
            continue;
          }
          fs.writeFileSync(dich, await pdfTuZip(hd.duongDanFileGoc));
          l.daTao++;
          m.trangThai = 'xong';
        } catch (err: any) {
          const message = err?.message ?? String(err);
          l.loi.push({ soHoaDon: String(hd.soHoaDon ?? ''), message });
          m.trangThai = 'loi';
          m.ghiChu = message;
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
        `Dựng PDF ${l.mst} (${l.tuNgay}..${l.denNgay}): tạo ${l.daTao}, bỏ qua ${l.boQua}` +
          `, trên tổng ${l.tong}` +
          (l.loi.length ? `, ${l.loi.length} lỗi: ${l.loi[0].message}` : ''),
      );
    }
  }

  /**
   * PDF của ĐÚNG MỘT hóa đơn, dựng ngay nếu chưa có.
   *
   * Làm đồng bộ được vì một hóa đơn chỉ tốn một, hai giây — vẫn nằm gọn trong
   * 30 giây chờ của client. Chỉ khi dựng cả kỳ mới cần chạy nền.
   */
  async pdfMotHoaDon(
    mst: string,
    khoa: { mstNguoiBan: string; kyHieu: string; soHoaDon: string },
  ): Promise<{ ten: string; noiDung: Buffer } | null> {
    const ds = await this.hoaDonRepo.find({ where: { mst } as any });
    const hd = ds.find(
      (x) =>
        x.isActive !== false &&
        String(x.mstNguoiBan ?? '') === khoa.mstNguoiBan &&
        String(x.kyHieu ?? '') === khoa.kyHieu &&
        String(x.soHoaDon ?? '') === khoa.soHoaDon,
    );
    if (!hd?.duongDanFileGoc || !fs.existsSync(hd.duongDanFileGoc)) return null;

    const pdf = this.duongDanPdf(hd.duongDanFileGoc);
    if (!fs.existsSync(pdf)) fs.writeFileSync(pdf, await pdfTuZip(hd.duongDanFileGoc));

    const ky = hd.ngayLap ? new Date(hd.ngayLap).toISOString().slice(0, 7) : 'khong-ro-ky';
    const an = (v: unknown) => String(v ?? 'khong-ro').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
    return {
      ten: `${ky}_${an(hd.chieu)}_${an(hd.mstNguoiBan)}_${an(hd.kyHieu)}_${an(hd.soHoaDon)}.pdf`,
      noiDung: fs.readFileSync(pdf),
    };
  }

  /** Các file PDF đã dựng trong kỳ, để gói lại cho người dùng tải về. */
  async danhSachPdf(
    mst: string,
    tuNgay: string,
    denNgay: string,
  ): Promise<Array<{ ten: string; duongDan: string }>> {
    const ds = await this.hoaDonCoFileGoc(mst, tuNgay, denNgay);

    return ds
      .map((hd) => ({ hd, pdf: this.duongDanPdf(hd.duongDanFileGoc) }))
      .filter((x) => fs.existsSync(x.pdf))
      .map(({ hd, pdf }) => {
        const ky = hd.ngayLap ? new Date(hd.ngayLap).toISOString().slice(0, 7) : 'khong-ro-ky';
        const an = (s: unknown) => String(s ?? 'khong-ro').replace(/[<>:"/\\|?*\x00-\x1f]/g, '-');
        return {
          ten: `${ky}_${an(hd.chieu)}_${an(hd.mstNguoiBan)}_${an(hd.kyHieu)}_${an(hd.soHoaDon)}.pdf`,
          duongDan: pdf,
        };
      });
  }

  private async hoaDonCoFileGoc(
    mst: string,
    tuNgay: string,
    denNgay: string,
  ): Promise<HoaDonCongThue[]> {
    return (await this.hoaDonRepo.find({ where: { mst } as any }))
      .filter((hd) => hd.isActive !== false)
      .filter((hd) => this.trongKhoang(hd, tuNgay, denNgay))
      .filter((hd) => Boolean(hd.duongDanFileGoc) && fs.existsSync(hd.duongDanFileGoc));
  }

  /** Chặn trên là "nhỏ hơn ngày hôm sau" để không bỏ sót hóa đơn lập ngày cuối kỳ. */
  private trongKhoang(hd: HoaDonCongThue, tuNgay: string, denNgay: string): boolean {
    if (!hd.ngayLap) return false;
    const n = new Date(hd.ngayLap);
    if (tuNgay && n < new Date(`${tuNgay}T00:00:00`)) return false;
    if (denNgay && n >= new Date(`${ngayHomSau(denNgay)}T00:00:00`)) return false;
    return true;
  }
}
