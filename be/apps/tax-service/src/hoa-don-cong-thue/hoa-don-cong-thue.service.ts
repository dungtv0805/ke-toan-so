import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongTyCongThue, HoaDonCongThue } from '@app/entities';
import { buildHoaDonKey } from '../shared/tax-helpers';
import { PhienCongThueService } from './cong-thue/phien.service';
import { createTokenKeeper } from './cong-thue/token-keeper';
import { encrypt } from './cong-thue/crypto';
import * as gdt from './cong-thue/gdt-client';
import {
  NAMESPACES,
  INVOICE_TYPES,
  NHOM_THEO_NAMESPACE,
  CHIEU_THEO_TYPE,
  type Namespace,
  type InvoiceType,
} from './cong-thue/config';
import { cuaSoThang, ngayHomSau } from './ky';

const so = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export interface KetQuaDongBo {
  mst: string;
  tuNgay: string;
  denNgay: string;
  timThay: number;
  themMoi: number;
  capNhat: number;
  thieu: number;
  loi: Array<{ chieu: string; nhom: string; tuNgay: string; denNgay: string; message: string }>;
}

@Injectable()
export class HoaDonCongThueService {
  private readonly logger = new Logger(HoaDonCongThueService.name);

  constructor(
    @InjectRepository(CongTyCongThue)
    private readonly congTyRepo: Repository<CongTyCongThue>,
    @InjectRepository(HoaDonCongThue)
    private readonly hoaDonRepo: Repository<HoaDonCongThue>,
    private readonly phien: PhienCongThueService,
  ) {}

  // ----------------------------------------------------------- Công ty

  /**
   * Thêm hoặc sửa một mã số thuế.
   *
   * Mật khẩu là TÙY CHỌN. Truyền chuỗi rỗng khi sửa công ty đã có nghĩa là giữ
   * nguyên mật khẩu cũ, không phải xóa đi.
   */
  async luuCongTy(dto: {
    mst: string;
    tenCongTy?: string;
    tenDangNhap?: string;
    matKhau?: string | null;
    kyKeKhai?: string;
  }) {
    if (!dto.mst) throw new NotFoundException('Thiếu mã số thuế');

    const cu = await this.congTyRepo.findOne({ where: { mst: dto.mst } as any });
    const ban = cu ?? this.congTyRepo.create({ mst: dto.mst });

    ban.tenCongTy = dto.tenCongTy ?? ban.tenCongTy ?? '';
    ban.tenDangNhap = dto.tenDangNhap || ban.tenDangNhap || dto.mst;
    if (dto.kyKeKhai) ban.kyKeKhai = dto.kyKeKhai;
    if (dto.matKhau) {
      // Thiếu CONG_THUE_KEY là lỗi CẤU HÌNH máy chủ, không phải lỗi người nhập.
      // Để nguyên Error trần thì bộ lọc toàn cục biến nó thành 500 "An
      // unexpected error occurred" — kế toán chỉ thấy "lưu không được" và không
      // có cách nào tự biết phải làm gì.
      try {
        ban.matKhauMaHoa = encrypt(dto.matKhau);
      } catch {
        throw new ServiceUnavailableException(
          'Máy chủ chưa cấu hình khóa mã hóa mật khẩu cổng Thuế (CONG_THUE_KEY). ' +
            'Báo quản trị hệ thống. Trong lúc chờ, vẫn thêm được mã số thuế nếu bỏ trống ô mật khẩu.',
        );
      }
    }

    // TypeORM KHÔNG áp `default:` khi insert vào MongoDB — phải tự đặt, nếu
    // không cột nằm im ở null và mọi bộ lọc theo nó đều trượt.
    if (ban.isActive === undefined || ban.isActive === null) ban.isActive = true;
    if (ban.tuDongTai === undefined || ban.tuDongTai === null) ban.tuDongTai = false;
    if (!ban.gioChay) ban.gioChay = '07:00';
    if (!ban.soNgayKeoLai) ban.soNgayKeoLai = 7;
    if (!ban.kyKeKhai) ban.kyKeKhai = 'thang';

    const daLuu = await this.congTyRepo.save(ban);
    return this.khongLoMatKhau(daLuu);
  }

  async danhSachCongTy() {
    // Lọc ở tầng ứng dụng bằng `!== false` như các service khác trong repo này:
    // bản ghi cũ có thể chưa có cột isActive.
    const ds = await this.congTyRepo.find();
    return ds.filter((c) => c.isActive !== false).map((c) => this.khongLoMatKhau(c));
  }

  /** Xóa mật khẩu đã lưu, chuyển công ty sang chế độ nhập lại mỗi phiên. */
  async quenMatKhau(mst: string) {
    const c = await this.congTyRepo.findOne({ where: { mst } as any });
    if (!c) throw new NotFoundException(`Không có MST ${mst}`);
    c.matKhauMaHoa = null as any;
    await this.congTyRepo.save(c);
    return this.khongLoMatKhau(c);
  }

  /** Lịch tải riêng của từng công ty. */
  async datLich(
    mst: string,
    dto: { tuDongTai?: boolean; gioChay?: string; soNgayKeoLai?: number },
  ) {
    const c = await this.congTyRepo.findOne({ where: { mst } as any });
    if (!c) throw new NotFoundException(`Không có MST ${mst}`);

    if (dto.tuDongTai !== undefined) c.tuDongTai = dto.tuDongTai;
    if (dto.gioChay) c.gioChay = dto.gioChay;
    if (dto.soNgayKeoLai) c.soNgayKeoLai = dto.soNgayKeoLai;

    // Máy không tự đăng nhập thay người được: không lưu mật khẩu thì lịch chạy
    // sẽ dừng ở bước captcha, bật lên chỉ tạo ra kỳ vọng sai.
    if (c.tuDongTai && !c.matKhauMaHoa) {
      throw new NotFoundException(
        `MST ${mst} không lưu mật khẩu nên không tự tải theo lịch được. Lưu mật khẩu trước, hoặc để tải tay.`,
      );
    }

    await this.congTyRepo.save(c);
    return this.khongLoMatKhau(c);
  }

  /** Bản ghi an toàn để trả ra API: KHÔNG chứa mật khẩu dù đã mã hóa. */
  private khongLoMatKhau(c: CongTyCongThue) {
    return {
      id: c._id ? c.id : null,
      mst: c.mst,
      tenCongTy: c.tenCongTy,
      tenDangNhap: c.tenDangNhap,
      kyKeKhai: c.kyKeKhai,
      coLuuMatKhau: Boolean(c.matKhauMaHoa),
      tuDongTai: c.tuDongTai,
      gioChay: c.gioChay,
      soNgayKeoLai: c.soNgayKeoLai,
      lanChayCuoi: c.lanChayCuoi,
    };
  }

  // ---------------------------------------------------------- Đồng bộ

  /**
   * Kéo hóa đơn của một mã số thuế trong khoảng ngày.
   *
   * Một kỳ "đầy đủ" nằm rải ở 4 chỗ trên cổng Thuế: mua vào / bán ra × hóa đơn
   * thường / hóa đơn máy tính tiền. Bỏ sót nhóm máy tính tiền là lỗi hay gặp
   * nhất khi tự viết công cụ, và không có dấu hiệu gì báo cho biết.
   *
   * Khoảng ngày còn được cắt theo THÁNG, nên đơn vị công việc nhỏ nhất là một ô
   * (tháng × chiều × nhóm). Hỏng một ô không làm mất các ô khác.
   */
  async dongBo(
    tenantId: string,
    { mst, tuNgay, denNgay }: { mst: string; tuNgay: string; denNgay: string },
  ): Promise<KetQuaDongBo> {
    const giuToken = createTokenKeeper({
      phien: {
        layToken: () => this.phien.layToken(tenantId, mst),
        boToken: () => this.phien.boToken(tenantId, mst),
      },
      mst,
    });

    const ketQua: KetQuaDongBo = {
      mst,
      tuNgay,
      denNgay,
      timThay: 0,
      themMoi: 0,
      capNhat: 0,
      thieu: 0,
      loi: [],
    };

    for (const cuaSo of cuaSoThang(tuNgay, denNgay)) {
      const search = gdt.buildSearch({
        from: gdt.toPortalDate(cuaSo.tuNgay),
        to: gdt.toPortalDate(cuaSo.denNgay),
      });

      for (const type of INVOICE_TYPES) {
        for (const namespace of NAMESPACES) {
          try {
            const { items, total } = await giuToken.chay((token) =>
              gdt.listAllInvoices({ token, namespace, type, search }),
            );

            const luu = await this.luuNhieu(mst, type, namespace, items);
            ketQua.timThay += items.length;
            ketQua.themMoi += luu.themMoi;
            ketQua.capNhat += luu.capNhat;

            // Cổng báo có bao nhiêu, ta lấy được bao nhiêu. Lệch nghĩa là vòng
            // lật trang đứt giữa chừng - kiểu mất dữ liệu KHÔNG ném ra lỗi nào.
            ketQua.thieu += Math.max(0, (Number(total) || 0) - items.length);
          } catch (err: any) {
            // Cần người nhập captcha thì mọi ô còn lại cũng hỏng y hệt: dừng
            // sớm để lớp trên xếp mã số thuế này vào hàng chờ.
            if (err?.code === 'CHUA_DANG_NHAP' || err?.code === 'CAN_MAT_KHAU') throw err;
            ketQua.loi.push({
              chieu: CHIEU_THEO_TYPE[type],
              nhom: NHOM_THEO_NAMESPACE[namespace],
              ...cuaSo,
              message: err?.message ?? String(err),
            });
          }
        }
      }
    }

    return ketQua;
  }

  /**
   * Ghi một lô hóa đơn, chống trùng bằng khóa tự nhiên.
   *
   * Tải lại cùng một kỳ nhiều lần sẽ CẬP NHẬT chứ không nhân bản: hóa đơn bị
   * thay thế hay điều chỉnh về sau cần được ghi đè bằng bản mới nhất.
   */
  private async luuNhieu(
    mst: string,
    type: InvoiceType,
    namespace: Namespace,
    items: gdt.HoaDonTho[],
  ): Promise<{ themMoi: number; capNhat: number }> {
    const chieu = CHIEU_THEO_TYPE[type];
    const nhom = NHOM_THEO_NAMESPACE[namespace];
    let themMoi = 0;
    let capNhat = 0;

    for (const hd of items) {
      const khoa = [
        mst,
        chieu,
        nhom,
        buildHoaDonKey(String(hd.shdon ?? ''), String(hd.khhdon ?? ''), String(hd.nbmst ?? '')),
        String(hd.khmshdon ?? ''),
      ].join('|');

      const cu = await this.hoaDonRepo.findOne({ where: { khoaHoaDon: khoa } as any });
      const ban = cu ?? this.hoaDonRepo.create({ khoaHoaDon: khoa, mst, chieu, nhom });

      ban.mstNguoiBan = hd.nbmst ?? null as any;
      ban.tenNguoiBan = hd.nbten ?? null as any;
      ban.mstNguoiMua = hd.nmmst ?? null as any;
      ban.tenNguoiMua = hd.nmten ?? null as any;
      ban.mauSo = hd.khmshdon != null ? String(hd.khmshdon) : (null as any);
      ban.kyHieu = hd.khhdon ?? (null as any);
      ban.soHoaDon = hd.shdon != null ? String(hd.shdon) : (null as any);
      ban.ngayLap = hd.tdlap ? new Date(hd.tdlap) : (null as any);
      ban.giaTriChuaThue = so(hd.tgtcthue);
      ban.tienThue = so(hd.tgtthue);
      ban.tongThanhToan = so(hd.tgtttbso);
      ban.trangThai = hd.tthai != null ? String(hd.tthai) : (null as any);
      ban.trangThaiXuLy = hd.ttxly != null ? String(hd.ttxly) : (null as any);
      ban.duLieuGoc = JSON.stringify(hd);
      ban.daTaiLuc = new Date();
      if (ban.isActive === undefined || ban.isActive === null) ban.isActive = true;

      await this.hoaDonRepo.save(ban);
      cu ? capNhat++ : themMoi++;
    }

    return { themMoi, capNhat };
  }

  // --------------------------------------------------------- Truy vấn

  async timHoaDon(q: {
    mst: string;
    chieu?: string;
    tuNgay?: string;
    denNgay?: string;
    limit?: number;
  }) {
    const where: Record<string, unknown> = { mst: q.mst };
    if (q.chieu) where.chieu = q.chieu;

    const tatCa = await this.hoaDonRepo.find({
      where: where as any,
      take: q.limit ?? 500,
      order: { ngayLap: 'DESC' } as any,
    });
    const ds = tatCa.filter((hd) => hd.isActive !== false);

    // Lọc ngày ở tầng ứng dụng: chặn trên phải là "nhỏ hơn ngày hôm sau", nếu
    // không hóa đơn lập ngày cuối kỳ sẽ rơi khỏi kết quả.
    const tu = q.tuNgay ? new Date(`${q.tuNgay}T00:00:00`) : null;
    const den = q.denNgay ? new Date(`${ngayHomSau(q.denNgay)}T00:00:00`) : null;

    return ds.filter((hd) => {
      if (!hd.ngayLap) return !tu && !den;
      const n = new Date(hd.ngayLap);
      if (tu && n < tu) return false;
      if (den && n >= den) return false;
      return true;
    });
  }
}
