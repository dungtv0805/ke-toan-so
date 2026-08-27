import { TenantContextService } from '@app/core';
import { CauHinhKetChuyen, ChungTu, type DanhMuc, type DanhMucTaiKhoan } from '@app/entities';
import { ServiceClient } from '@app/service-client';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NhatKyChungService } from '../nhat-ky-chung/nhat-ky-chung.service';
import { LoaiResolverService, VoucherNumberService } from '../shared';
import { CreateKetChuyenDto } from './dto';
import {
  chayKetChuyen,
  dungBangSoDu,
  type DongDanhMucKetChuyen,
  type DongHachToan,
} from './ket-chuyen.engine';
import {
  dungCuaSoKetChuyen,
  gomLoKetChuyen,
  type LoKetChuyen,
} from './ket-chuyen.helper';

/**
 * Tiền tố số chứng từ dự phòng — Nghiệp vụ khác (NVK).
 *
 * Chỉ dùng khi lô không chọn Loại giao dịch, hoặc loại giao dịch được chọn chưa liên
 * kết Loại chứng từ. Có liên kết thì tiền tố lấy theo mã Loại chứng từ (mỗi công ty
 * một mã riêng — MasterCeo dùng `KC`), giống hệt chứng từ thường.
 */
const MA_LOAI_CHUNG_TU_DU_PHONG = 'NVK';

/** Ngày dạng dd/mm/yyyy cho thông báo lỗi gửi kế toán. */
const dinhDangNgay = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

export interface CanhBaoKetChuyen {
  ma: string;
  ten: string;
  soTien: number;
  ben: 'NO' | 'CO';
}

export interface KetQuaPreview {
  dong: DongHachToan[];
  canhBao: CanhBaoKetChuyen[];
  tongTien: number;
  laiLo: number;
}

@Injectable()
export class KetChuyenService {
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: Repository<ChungTu>,
    @InjectRepository(CauHinhKetChuyen)
    private readonly cauHinhRepository: Repository<CauHinhKetChuyen>,
    private readonly loaiResolver: LoaiResolverService,
    private readonly nhatKyChungService: NhatKyChungService,
    private readonly voucherNumberService: VoucherNumberService,
    private readonly serviceClient: ServiceClient,
    private readonly tenantContext: TenantContextService,
  ) {}

  private get tenantId() {
    return this.tenantContext.getCurrentTenantId();
  }

  async preview(denNgay: string, authToken?: string): Promise<KetQuaPreview> {
    const { dauNam, ngayKetThuc } = dungCuaSoKetChuyen(denNgay);

    const [danhMucRes, taiKhoanRes, soDuDauKyRes, phatSinhRes] = await Promise.all([
      this.serviceClient.getTaiKhoanKetChuyen(authToken, this.tenantId),
      this.serviceClient.getTaiKhoan(authToken, this.tenantId),
      this.serviceClient.getSoDuDauKy(authToken, this.tenantId),
      this.nhatKyChungService.aggregateBalance(dauNam, ngayKetThuc, this.tenantId),
    ]);

    // Danh mục lỗi trông y hệt "không có gì để kết chuyển" (0 dòng) nếu không chặn ở
    // đây — người dùng dễ hiểu nhầm là đã kết chuyển xong.
    if (!danhMucRes.success) {
      throw new ServiceUnavailableException(
        'Không tải được danh mục tài khoản kết chuyển',
      );
    }

    const danhMuc: DongDanhMucKetChuyen[] = (danhMucRes.data || [])
      .filter((d) => d.isActive !== false && d.loai === 'XAC_DINH_KQKD')
      .map((d) => ({
        ma: d.ma,
        thuTu: Number(d.thuTu) || 0,
        taiKhoanTu: d.taiKhoanTu,
        taiKhoanDen: d.taiKhoanDen,
        ben: d.ben,
        dienGiai: d.dienGiai,
      }));

    const taiKhoan = taiKhoanRes.success ? taiKhoanRes.data || [] : [];
    const tenTheoMa = new Map(taiKhoan.map((t) => [t.ma, t.ten]));

    // Số dư đầu kỳ nhập tay chỉ tính khi ngày áp dụng rơi vào chính kỳ kết chuyển này;
    // ngày áp dụng thuộc năm cũ nghĩa là phần đó đã được kết chuyển ở năm trước.
    const ngayApDung = soDuDauKyRes.success ? soDuDauKyRes.data?.ngayApDung : null;
    const apDungSoDuDauKy =
      !!ngayApDung &&
      new Date(ngayApDung) >= dauNam &&
      new Date(ngayApDung) <= ngayKetThuc;

    const phatSinh = (phatSinhRes.success ? phatSinhRes.data || [] : []).map((p) => ({
      ma: p.ma,
      periodNo: p.periodNo,
      periodCo: p.periodCo,
    }));

    const bangSoDu = dungBangSoDu(
      phatSinh,
      soDuDauKyRes.success ? soDuDauKyRes.data?.items || [] : [],
      apDungSoDuDauKy,
    );

    const ketQua = chayKetChuyen(danhMuc, bangSoDu);

    return {
      dong: ketQua.dong,
      canhBao: ketQua.canhBao.map((c) => ({
        ...c,
        ten: tenTheoMa.get(c.ma) ?? '',
      })),
      tongTien: ketQua.dong.reduce((t, d) => t + d.soTien, 0),
      laiLo: ketQua.laiLo,
    };
  }

  async create(
    dto: CreateKetChuyenDto,
    nguoiTaoId: string,
    authToken?: string,
  ): Promise<{ soPhieu: string; soDong: number }> {
    // Cửa sổ kết chuyển dựng bằng đúng hàm mà `preview` dùng, nên hai chỗ không lệch
    // mốc. Kiểm TRƯỚC mọi thứ khác: ghi sổ là hành động khó hoàn tác, mà lô rơi ngoài
    // cửa sổ thì TK 5/6/7/8 của kỳ đó không bao giờ sạch, chốt chặn double-submit
    // không bao giờ kích hoạt và mỗi lần Lưu lại nhân bản toàn bộ lô vào sai kỳ.
    const { dauNam, ngayKetThuc } = dungCuaSoKetChuyen(dto.denNgay);
    const { ngayKetThuc: mocHachToan } = dungCuaSoKetChuyen(dto.ngayHachToan);
    if (mocHachToan < dauNam || mocHachToan > ngayKetThuc) {
      throw new BadRequestException(
        `Ngày hạch toán ${dinhDangNgay(mocHachToan)} nằm ngoài kỳ kết chuyển ` +
          `${dinhDangNgay(dauNam)} - ${dinhDangNgay(ngayKetThuc)}. ` +
          'Hãy sửa Ngày hạch toán về trong kỳ, hoặc đổi lại Kết chuyển đến ngày.',
      );
    }

    const taiKhoanRes = await this.serviceClient.getTaiKhoan(authToken, this.tenantId);
    if (!taiKhoanRes.success) {
      // Ném trước khi ghi bất cứ thứ gì: thiếu danh mục tài khoản thì snapshot
      // lưu vào chứng từ sẽ rỗng ({ ten: '', loai: '', nhom: '' }) vĩnh viễn, không
      // ai quay lại sửa được.
      throw new ServiceUnavailableException(
        'Không tải được danh mục tài khoản, chưa ghi sổ kết chuyển',
      );
    }

    // Chốt chặn double-submit (double-click / retry sau timeout): chạy lại preview
    // ngay trước khi ghi sổ. Không re-derive số tiền — người dùng có thể đã sửa số
    // tiền trên form — chỉ chặn khi rõ ràng không còn gì để kết chuyển, hoặc dòng
    // gửi lên tham chiếu một mã danh mục không còn khớp preview hiện tại.
    const kqPreview = await this.preview(dto.denNgay, authToken);
    if (kqPreview.dong.length === 0) {
      throw new BadRequestException(
        'Không còn số dư nào để kết chuyển đến ngày này. Nếu muốn lập lại, hãy xóa chứng từ kết chuyển cũ trước.',
      );
    }
    const maHopLe = new Set(kqPreview.dong.map((d) => d.maKetChuyen));
    const dongMaLa = dto.dong.find((d) => !maHopLe.has(d.maKetChuyen));
    if (dongMaLa) {
      throw new BadRequestException(
        `Mã kết chuyển không hợp lệ: ${dongMaLa.maKetChuyen}`,
      );
    }

    const taiKhoanTheoMa = new Map(
      (taiKhoanRes.data || []).map((t) => [t.ma, t]),
    );

    // Bảng cân đối kế toán duyệt tài khoản TỪ danh mục và khớp mã CHÍNH XÁC, nên một
    // dòng ghi vào mã lạ (`'4212 '` thừa dấu cách, `'4121'` gõ nhầm) không đóng góp vào
    // đâu cả → BCĐKT lệch đúng bằng lợi nhuận. Chặn trước khi sinh số chứng từ để
    // không đốt oan một số trong dải NVK.
    const maLa = [
      ...new Set(
        dto.dong
          .flatMap((d) => [d.taiKhoanNo, d.taiKhoanCo])
          .filter((ma) => !taiKhoanTheoMa.has(ma)),
      ),
    ];
    if (maLa.length > 0) {
      throw new BadRequestException(
        `Tài khoản không có trong danh mục tài khoản: ${maLa.join(', ')}. ` +
          'Hãy khai các tài khoản này vào danh mục Tài khoản rồi lấy lại dữ liệu.',
      );
    }

    // Tra loại giao dịch TRƯỚC khi sinh số phiếu: mã lạ mà vẫn sinh số thì đốt oan một
    // số trong dải, y như trường hợp tài khoản lạ ở trên.
    const thongTinLoaiGD = dto.loaiGiaoDichMa
      ? await this.loaiResolver.layThongTinLoaiGiaoDich(dto.loaiGiaoDichMa)
      : null;
    if (dto.loaiGiaoDichMa && !thongTinLoaiGD) {
      throw new BadRequestException(
        `Loại giao dịch không có trong danh mục: ${dto.loaiGiaoDichMa}. ` +
          'Hãy khai vào danh mục Loại giao dịch rồi chọn lại.',
      );
    }

    const soPhieu = await this.voucherNumberService.generateVoucherNumber('KHAC', {
      // Loại giao dịch chưa liên kết Loại chứng từ thì không có mã nào để làm tiền tố —
      // rơi về NVK thay vì sinh số phiếu không có tiền tố.
      maLoaiChungTu: thongTinLoaiGD?.loaiChungTu?.ma ?? MA_LOAI_CHUNG_TU_DU_PHONG,
      date: new Date(dto.ngayChungTu),
    });

    // Mã lạ đã bị chặn ở trên nên `tk` luôn tồn tại; `?? ''` chỉ để phòng bản ghi danh
    // mục thiếu trường, không phải để nuốt mã sai.
    const snapshot = (ma: string): DanhMucTaiKhoan => {
      const tk = taiKhoanTheoMa.get(ma);
      return {
        ma,
        ten: tk?.ten ?? '',
        loai: tk?.loai ?? '',
        nhom: tk?.nhom ?? '',
      };
    };

    // `loai` của chứng từ kết chuyển luôn là KHAC, KHÔNG suy từ phân loại của loại
    // chứng từ: công ty trỏ nhầm loại GD kết chuyển sang một loại chứng từ phân loại
    // THU/CHI thì bút toán kết chuyển sẽ chui vào sổ quỹ / phiếu thu chi.
    const danhMucLoai: Pick<DanhMuc, 'loaiGiaoDich' | 'loaiChungTu'> = thongTinLoaiGD
      ? {
          loaiGiaoDich: { ma: thongTinLoaiGD.ma, ten: thongTinLoaiGD.ten },
          ...(thongTinLoaiGD.loaiChungTu
            ? { loaiChungTu: thongTinLoaiGD.loaiChungTu }
            : {}),
        }
      : {};

    const rows = dto.dong.map((d) =>
      this.chungTuRepository.create({
        loai: 'KHAC' as const,
        soPhieu,
        ngay: new Date(dto.ngayHachToan),
        ngayGhiSo: new Date(dto.ngayChungTu),
        soTien: d.soTien,
        noiDung: d.dienGiai || dto.dienGiai,
        ghiChu: dto.dienGiai,
        danhMuc: {
          taiKhoanNo: snapshot(d.taiKhoanNo),
          taiKhoanCo: snapshot(d.taiKhoanCo),
          ...danhMucLoai,
        },
        nguon: 'KET_CHUYEN' as const,
        maKetChuyen: d.maKetChuyen,
        nguoiTaoId,
      }),
    );

    await this.chungTuRepository.save(rows);

    // Ghi sổ xong mới lưu mặc định: lô bị từ chối (ngày ngoài kỳ, tài khoản lạ) không
    // được phép đổi cấu hình của công ty. Lỗi ở bước này cũng không được làm hỏng kết
    // quả ghi sổ — chứng từ đã nằm trong sổ rồi.
    if (thongTinLoaiGD) {
      await this.luuCauHinh(thongTinLoaiGD.ma).catch(() => undefined);
    }

    return { soPhieu, soDong: rows.length };
  }

  /**
   * Cấu hình kết chuyển của công ty hiện tại. Chưa từng lưu → trả object rỗng.
   */
  async layCauHinh(): Promise<{ loaiGiaoDichMa?: string }> {
    const row = await this.cauHinhRepository.findOne({ where: {} as any });
    return row?.loaiGiaoDichMa ? { loaiGiaoDichMa: row.loaiGiaoDichMa } : {};
  }

  /**
   * Ghi đè mặc định của công ty. Mỗi tenant chỉ giữ MỘT bản ghi — repository đã tự lọc
   * theo tenant nên `findOne({})` không thể chạm sang công ty khác.
   */
  async luuCauHinh(loaiGiaoDichMa: string): Promise<{ loaiGiaoDichMa: string }> {
    const row = await this.cauHinhRepository.findOne({ where: {} as any });
    if (row) {
      row.loaiGiaoDichMa = loaiGiaoDichMa;
      await this.cauHinhRepository.save(row);
    } else {
      await this.cauHinhRepository.save(
        this.cauHinhRepository.create({ loaiGiaoDichMa }),
      );
    }
    return { loaiGiaoDichMa };
  }

  async list(): Promise<LoKetChuyen[]> {
    const rows = await this.chungTuRepository.find({
      where: { nguon: 'KET_CHUYEN' } as any,
    });
    return gomLoKetChuyen(rows);
  }

  async remove(soPhieu: string): Promise<{ deleted: number }> {
    // Điều kiện `nguon` để không lỡ tay xóa chứng từ nhập tay trùng số phiếu.
    const kq = await this.chungTuRepository.delete({
      soPhieu,
      nguon: 'KET_CHUYEN',
    } as any);

    if (!kq.affected) {
      throw new NotFoundException(`Không tìm thấy chứng từ kết chuyển ${soPhieu}`);
    }
    return { deleted: kq.affected };
  }
}
