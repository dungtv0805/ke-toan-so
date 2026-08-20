import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Between } from 'typeorm';
import { ChungTu, LoaiChungTu } from '@app/entities';
import { CreateChungTuDto, UpdateChungTuDto } from '../dto';
import { VoucherNumberService, LoaiResolverService } from '../shared';
import { PaginatedResult } from '@app/dto';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { ChungTuQueryDto } from './dto/chung-tu-query.dto';
import { buildChungTuMongoQuery } from './helpers';
import { buildSummaryAggregation } from '../nhat-ky-chung/helpers';
import { SummaryType, SummaryItem } from '../nhat-ky-chung/dto';

/** Một nhóm phát sinh tiền: (mã TK, mã đối tượng[, bucket thời gian]). */
type NhomTien = {
  _id: { ma: string; dt: string; bucket?: number };
  ten?: string;
  dtTen?: string;
  dtLoai?: string;
  v: number;
};

/** Thu/chi của một nguồn tiền theo từng bucket + tồn đầu kỳ của riêng nó. */
type ChuoiTien = {
  /** Mã tài khoản ngân hàng; rỗng với hai dòng gom theo TK gốc. */
  ma: string;
  ten: string;
  soDuDauKy: number;
  series: { thang: number; thu: number; chi: number }[];
};

/**
 * Dashboard là báo cáo DÒNG TIỀN cho ban giám đốc, không phải sổ kế toán: dòng
 * phải là "tiền đang nằm ở đâu" (MB, ABBank, quỹ tiền mặt), không phải số hiệu
 * TK 1111/1121. Tiền không gắn vào tài khoản ngân hàng nào thì gom về hai dòng
 * dưới đây theo TK gốc, để tổng vẫn khớp thẻ KPI.
 */
const KHOA_TIEN_MAT = '#tien-mat';
const KHOA_TIEN_GUI = '#tien-gui';
const TEN_TIEN_MAT = 'Tiền mặt';
const TEN_TIEN_GUI = 'Tiền gửi (chưa gán tài khoản)';

type ThongTinNganHang = { ten: string; nganHang?: string; soTaiKhoan?: string };

/**
 * TODO: Các API cần thêm lại sau khi refactor:
 *
 * 1. submitForApproval(id) - NHAP → CHO_DUYET
 * 2. approve(id, nguoiDuyetId) - CHO_DUYET → DA_DUYET
 * 3. reject(id, nguoiDuyetId, rejectDto) - CHO_DUYET → TU_CHOI
 * 4. getPhieuThuStats() - Thống kê phiếu thu
 * 5. getPhieuChiStats() - Thống kê phiếu chi
 * 6. getNhatKyChungStats() - Thống kê nhật ký chung
 * 7. getSummaryByAccount() - Tổng hợp theo tài khoản
 * 8. getSummaryByTeam() - Tổng hợp theo đội
 * 9. getSummaryByEmployee() - Tổng hợp theo nhân viên
 * 10. getSummaryByProject() - Tổng hợp theo dự án
 * 11. getSummaryByChuDauTu() - Tổng hợp theo chủ đầu tư
 * 12. getSummaryBySanPham() - Tổng hợp theo sản phẩm
 * 13. getSummaryByDongTien() - Tổng hợp theo dòng tiền
 */

@Injectable()
export class ChungTuService {
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: MongoRepository<ChungTu>,
    private readonly voucherNumberService: VoucherNumberService,
    private readonly tenantContext: TenantContextService,
    private readonly loaiResolver: LoaiResolverService,
    private readonly serviceClient: ServiceClient,
  ) {}

  async findAllPaginated(
    loai: LoaiChungTu,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: ChungTu[]; meta: PaginatedResult<ChungTu>['meta'] }> {
    const { page = 1, limit = 15 } = query;
    const skip = (page - 1) * limit;

    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline: object[] = [
      { $match: mongoQuery },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalArr: [{ $count: 'count' }],
        },
      },
    ];
    const agg = await this.chungTuRepository.aggregate(pipeline).toArray();
    const facet = (agg[0] as { data: ChungTu[]; totalArr: { count: number }[] }) || { data: [], totalArr: [] };
    const total = facet.totalArr[0]?.count ?? 0;

    return {
      success: true,
      data: facet.data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStats(
    loai: LoaiChungTu,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: { tongSo: number; tongTien: number } }> {
    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline: object[] = [
      { $match: mongoQuery },
      { $group: { _id: null, tongSo: { $sum: 1 }, tongTien: { $sum: '$soTien' } } },
    ];
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    const s = (result[0] as { tongSo: number; tongTien: number }) || { tongSo: 0, tongTien: 0 };
    return { success: true, data: { tongSo: s.tongSo, tongTien: s.tongTien } };
  }

  async getSummary(
    loai: LoaiChungTu,
    type: SummaryType,
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: SummaryItem[] }> {
    const mongoQuery = buildChungTuMongoQuery(loai, query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const pipeline = buildSummaryAggregation(type, mongoQuery);
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    return { success: true, data: result as SummaryItem[] };
  }

  /**
   * Tỷ trọng tiền thu/chi theo mã dòng tiền, phân loại theo tài khoản tiền:
   * - thu: có dòng Nợ 111/112 (gồm TK con)
   * - chi: có dòng Có 111/112
   * Chỉ tính giao dịch có mã dòng tiền (bỏ qua nếu thiếu).
   *
   * Bút toán luân chuyển nội bộ (111 đối ứng 112) bị loại: nó thoả CẢ hai bộ lọc
   * nên vào luôn cả hai biểu đồ, phình lên chiếm phần lớn vòng tròn dù không có
   * đồng nào thu/chi ra ngoài doanh nghiệp.
   */
  async getCashFlowComposition(
    which: 'thu' | 'chi',
    query: ChungTuQueryDto,
  ): Promise<{ success: boolean; data: { ma: string; ten?: string; soTien: number }[] }> {
    const { startDate, endDate } = query;
    const match: Record<string, unknown> = {};
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) match.tenantId = tenantId;
    if (startDate || endDate) {
      const ngay: Record<string, Date> = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        ngay.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        ngay.$lte = e;
      }
      match.ngay = ngay;
    }
    // thu: tài khoản tiền (111/112) ghi Nợ; chi: ghi Có. Khớp cả TK con (^11[12]).
    const cashField = which === 'thu' ? 'danhMuc.taiKhoanNo.ma' : 'danhMuc.taiKhoanCo.ma';
    match[cashField] = { $regex: '^11[12]' };
    // Vế đối ứng cũng là TK tiền → luân chuyển nội bộ, bỏ. So 3 KÝ TỰ ĐẦU chứ
    // không so bằng: so bằng thì tiểu khoản 1111 / 1121 lọt lưới.
    const counterField = which === 'thu' ? 'danhMuc.taiKhoanCo.ma' : 'danhMuc.taiKhoanNo.ma';
    match[counterField] = { $not: /^(111|112)/ };
    match['danhMuc.dongTien.ma'] = { $exists: true, $ne: null };

    const pipeline: object[] = [
      { $match: match },
      {
        $group: {
          _id: '$danhMuc.dongTien.ma',
          ten: { $first: '$danhMuc.dongTien.ten' },
          soTien: { $sum: '$soTien' },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $project: { _id: 0, ma: '$_id', ten: 1, soTien: 1 } },
      { $sort: { soTien: -1 } },
    ];
    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    return {
      success: true,
      data: result as { ma: string; ten?: string; soTien: number }[],
    };
  }

  /**
   * Nhánh $facet gom phát sinh tiền theo (mã TK, mã đối tượng[, bucket]).
   *
   * Đối tượng của vế Nợ nằm ở `doiTuong`, của vế Có ở `doiTuong2` (dữ liệu cũ chỉ
   * có `doiTuong` → fallback) — ĐÚNG quy ước của `aggregateBalanceByDoiTuong`.
   * Lệch quy ước này là tooltip và bảng "Số dư theo tài khoản / quỹ" ra hai số
   * khác nhau cho cùng một quỹ/ngân hàng.
   *
   * Chứng từ không gắn đối tượng gom vào khoá rỗng, không bị loại — nhờ vậy
   * Σ dòng chi tiết luôn đúng bằng số của TK.
   */
  private nhanhTienTheoTaiKhoan(
    side: 'taiKhoanNo' | 'taiKhoanCo',
    bucket?: object,
  ): object[] {
    const doiTuong =
      side === 'taiKhoanNo'
        ? '$danhMuc.doiTuong'
        : { $ifNull: ['$danhMuc.doiTuong2', '$danhMuc.doiTuong'] };
    return [
      { $match: { [`danhMuc.${side}.ma`]: { $regex: '^11[12]' } } },
      { $addFields: { _dt: doiTuong } },
      {
        $group: {
          _id: {
            ma: `$danhMuc.${side}.ma`,
            dt: { $ifNull: ['$_dt.ma', ''] },
            ...(bucket ? { bucket } : {}),
          },
          ten: { $first: `$danhMuc.${side}.ten` },
          dtTen: { $first: '$_dt.ten' },
          dtLoai: { $first: '$_dt.loai' },
          v: { $sum: '$soTien' },
        },
      },
    ];
  }

  /**
   * Đối tượng của bút toán tiền thuộc về dòng nào trong báo cáo dòng tiền.
   *
   * Chỉ đối tượng THỰC SỰ là quỹ/ngân hàng mới được đứng thành dòng riêng. Chi
   * tiền mặt trả nhà cung cấp thì `doiTuong2` là NHÀ CUNG CẤP — không lọc là
   * "CHI NHÁNH CÔNG TY CP BE GROUP" hiện lên như một ngân hàng.
   *
   * Nhận diện bằng danh mục ngân hàng TRƯỚC, `loai` của snapshot chỉ là đường
   * phụ: snapshot chỉ giữ `loai[0]`, nên đối tượng vừa là khách hàng vừa là
   * ngân hàng sẽ mang loại "KHACH_HANG" và bị bỏ sót nếu chỉ soi loai.
   */
  private khoaNguonTien(
    maTaiKhoan: string,
    maDoiTuong: string,
    loaiDoiTuong: string | undefined,
    nganHangByMa: Map<string, ThongTinNganHang>,
  ): { khoa: string; ma: string; ten: string } {
    if (maDoiTuong && (nganHangByMa.has(maDoiTuong) || loaiDoiTuong === 'NGAN_HANG_QUY')) {
      return {
        khoa: maDoiTuong,
        ma: maDoiTuong,
        ten: nganHangByMa.get(maDoiTuong)?.ten || '',
      };
    }
    return maTaiKhoan.startsWith('111')
      ? { khoa: KHOA_TIEN_MAT, ma: '', ten: TEN_TIEN_MAT }
      : { khoa: KHOA_TIEN_GUI, ma: '', ten: TEN_TIEN_GUI };
  }

  /**
   * Số dư tiền tại thời điểm ngay TRƯỚC `before`, tách theo TỪNG NGUỒN TIỀN
   * (mỗi tài khoản ngân hàng một dòng, phần còn lại gom về tiền mặt / tiền gửi).
   *
   * = số dư đầu kỳ nhập tay (master-data /so-du-dau-ky) + phát sinh tiền của các
   * chứng từ trước mốc đó. Cùng công thức với `buildSoChiTiet` (reporting-service)
   * và `buildSoQuy` (cash-book-service) để ba báo cáo luôn khớp nhau.
   *
   * Trả map thay vì một số tổng để tồn đầu kỳ của từng dòng và của tổng đều dựng
   * từ CÙNG một nguồn: tổng chỉ là Σ map, không có đường tính thứ hai để lệch.
   */
  private async getCashOpeningByAccount(
    before: Date,
    tenantId: string | undefined,
    nganHangByMa: Map<string, ThongTinNganHang>,
    authToken?: string,
  ): Promise<Map<string, { ma: string; ten: string; soDu: number }>> {
    const opening = new Map<string, { ma: string; ten: string; soDu: number }>();
    const add = (
      maTaiKhoan: string,
      maDoiTuong: string,
      loaiDoiTuong: string | undefined,
      tenDuPhong: string,
      v: number,
    ) => {
      const { khoa, ma, ten } = this.khoaNguonTien(
        maTaiKhoan,
        maDoiTuong,
        loaiDoiTuong,
        nganHangByMa,
      );
      const cu = opening.get(khoa);
      if (cu) {
        cu.soDu += v;
        if (!cu.ten) cu.ten = ten || tenDuPhong;
      } else {
        opening.set(khoa, { ma, ten: ten || tenDuPhong, soDu: v });
      }
    };

    const openingRes = await this.serviceClient.getSoDuDauKyRaw(authToken);
    if (openingRes.success) {
      for (const row of openingRes.data?.items ?? []) {
        const ma = row.maTaiKhoan || '';
        if (!/^11[12]/.test(ma)) continue;
        add(
          ma,
          row.chiTietMa || '',
          row.chiTietType,
          row.chiTietTen || '',
          (Number(row.duNo) || 0) - (Number(row.duCo) || 0),
        );
      }
    }

    const match: Record<string, unknown> = { ngay: { $lt: before } };
    if (tenantId) match.tenantId = tenantId;

    const agg = (await this.chungTuRepository
      .aggregate([
        { $match: match },
        {
          $facet: {
            thu: this.nhanhTienTheoTaiKhoan('taiKhoanNo'),
            chi: this.nhanhTienTheoTaiKhoan('taiKhoanCo'),
          },
        },
      ])
      .toArray()) as { thu: NhomTien[]; chi: NhomTien[] }[];
    const facet = agg[0] || { thu: [], chi: [] };
    for (const g of facet.thu) {
      add(g._id.ma, g._id.dt || '', g.dtLoai, g.dtTen || '', g.v || 0);
    }
    for (const g of facet.chi) {
      add(g._id.ma, g._id.dt || '', g.dtLoai, g.dtTen || '', -(g.v || 0));
    }

    return opening;
  }

  /**
   * Dòng tiền theo tháng cho năm chọn: thu = Nợ 111/112, chi = Có 111/112 (gồm TK con),
   * tính trực tiếp bằng aggregation (không qua sổ quỹ phân trang). Lọc theo tenant.
   *
   * Trả kèm `soDuDauKy` — tồn quỹ tại đầu kỳ hiển thị. Thiếu nó thì FE cộng dồn
   * thu−chi từ 0 nên "Tồn" trên dashboard chỉ là chênh lệch thu chi trong kỳ,
   * âm ngay khi công ty tiêu vào số dư mang sang từ kỳ trước.
   *
   * Trả kèm `nguonTien` — cùng thu/chi/tồn đầu kỳ đó tách theo từng TÀI KHOẢN
   * NGÂN HÀNG (+ hai dòng gom tiền mặt / tiền gửi chưa gán), để dashboard rê chuột
   * lên thẻ KPI là thấy tiền đang nằm ở đâu. KHÔNG phát số hiệu TK kế toán:
   * người đọc là ban giám đốc, 1111/1121 không nói lên điều gì với họ.
   * `series` và `soDuDauKy` tổng được DẪN XUẤT từ `nguonTien` (Σ theo dòng), nên
   * hai mức luôn khớp nhau từng đồng ở mọi bucket.
   */
  async getCashFlowSeries(
    year: number,
    month?: number,
    authToken?: string,
  ): Promise<{
    success: boolean;
    data: {
      soDuDauKy: number;
      series: { thang: number; thu: number; chi: number }[];
      nguonTien: ChuoiTien[];
    };
  }> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    // month có giá trị → chia theo TUẦN trong tháng (Tuần 1–5); ngược lại theo 12 tháng.
    const weekly = !!month && month >= 1 && month <= 12;
    const periodStart = weekly
      ? new Date(year, month - 1, 1, 0, 0, 0, 0)
      : new Date(year, 0, 1, 0, 0, 0, 0);
    const match: Record<string, unknown> = {
      ngay: weekly
        ? {
            $gte: periodStart,
            $lte: new Date(year, month, 0, 23, 59, 59, 999),
          }
        : {
            $gte: periodStart,
            $lte: new Date(year, 11, 31, 23, 59, 59, 999),
          },
    };
    if (tenantId) match.tenantId = tenantId;

    // Khoá nhóm: tháng (1–12) hoặc tuần trong tháng (ceil(ngày/7) → 1–5).
    const bucket = weekly
      ? { $ceil: { $divide: [{ $dayOfMonth: '$ngay' }, 7] } }
      : { $month: '$ngay' };

    const pipeline: object[] = [
      { $match: match },
      {
        $facet: {
          thu: this.nhanhTienTheoTaiKhoan('taiKhoanNo', bucket),
          chi: this.nhanhTienTheoTaiKhoan('taiKhoanCo', bucket),
        },
      },
    ];
    const agg = (await this.chungTuRepository.aggregate(pipeline).toArray()) as {
      thu: NhomTien[];
      chi: NhomTien[];
    }[];
    const facet = agg[0] || { thu: [], chi: [] };
    const buckets = weekly ? 5 : 12;

    const nganHangRes = await this.serviceClient.getNganHang(authToken);
    const nganHangByMa = new Map<string, ThongTinNganHang>(
      (nganHangRes.success ? nganHangRes.data || [] : []).map((n) => [
        n.ma,
        { ten: n.ten, nganHang: n.nganHang, soTaiKhoan: n.soTaiKhoan },
      ]),
    );

    const openingByNguon = await this.getCashOpeningByAccount(
      periodStart,
      tenantId,
      nganHangByMa,
      authToken,
    );

    type ONguon = { ma: string; ten: string; thu: number[]; chi: number[] };
    const rows = new Map<string, ONguon>();
    const ensure = (khoa: string, ma: string, ten: string, tenDuPhong: string) => {
      let row = rows.get(khoa);
      if (!row) {
        row = {
          ma,
          ten: ten || tenDuPhong,
          thu: new Array<number>(buckets).fill(0),
          chi: new Array<number>(buckets).fill(0),
        };
        rows.set(khoa, row);
      } else if (!row.ten) {
        row.ten = ten || tenDuPhong;
      }
      return row;
    };
    const nap = (nhom: NhomTien[], key: 'thu' | 'chi') => {
      for (const g of nhom) {
        const i = (g._id?.bucket || 0) - 1;
        if (i < 0 || i >= buckets) continue;
        const { khoa, ma, ten } = this.khoaNguonTien(
          g._id.ma,
          g._id.dt || '',
          g.dtLoai,
          nganHangByMa,
        );
        ensure(khoa, ma, ten, g.dtTen || '')[key][i] += g.v || 0;
      }
    };
    nap(facet.thu, 'thu');
    nap(facet.chi, 'chi');
    // Tài khoản chỉ có tồn mang sang, không phát sinh trong kỳ — vẫn phải hiện,
    // vì tiền vẫn đang nằm ở đó.
    for (const [khoa, o] of openingByNguon) ensure(khoa, o.ma, o.ten, '');

    const nguonTien: ChuoiTien[] = Array.from(rows.entries())
      .map(([khoa, r]) => ({
        ma: r.ma,
        ten: r.ten,
        soDuDauKy: openingByNguon.get(khoa)?.soDu || 0,
        series: Array.from({ length: buckets }, (_, i) => ({
          thang: i + 1,
          thu: r.thu[i],
          chi: r.chi[i],
        })),
      }))
      .sort((a, b) => a.ma.localeCompare(b.ma) || a.ten.localeCompare(b.ten));

    const series = Array.from({ length: buckets }, (_, i) => ({
      thang: i + 1,
      thu: nguonTien.reduce((s, t) => s + t.series[i].thu, 0),
      chi: nguonTien.reduce((s, t) => s + t.series[i].chi, 0),
    }));
    const soDuDauKy = nguonTien.reduce((s, t) => s + t.soDuDauKy, 0);

    return { success: true, data: { soDuDauKy, series, nguonTien } };
  }

  async findAll(loai?: LoaiChungTu): Promise<ChungTu[]> {
    const where = loai ? { loai } : {};
    return this.chungTuRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    loai?: LoaiChungTu,
  ): Promise<ChungTu[]> {
    const where: any = {
      ngay: Between(startDate, endDate),
    };
    if (loai) where.loai = loai;
    return this.chungTuRepository.find({ where, order: { ngay: 'ASC' } });
  }

  async findOne(id: string): Promise<ChungTu> {
    const { ObjectId } = await import('mongodb');
    const chungTu = await this.chungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chungTu) {
      throw new NotFoundException(`Không tìm thấy chứng từ với ID ${id}`);
    }

    return chungTu;
  }

  async create(
    createDto: CreateChungTuDto,
    nguoiTaoId: string,
  ): Promise<ChungTu> {
    // Suy ra loai từ Loại giao dịch (nếu có cấu hình); nếu không → giữ loai theo endpoint.
    const loai = await this.loaiResolver.resolveLoai(
      createDto.danhMuc,
      createDto.loai,
    );
    const soPhieu = await this.voucherNumberService.generateVoucherNumber(loai);

    const chungTu = this.chungTuRepository.create({
      ...createDto,
      loai,
      ngay: new Date(createDto.ngay),
      soPhieu,
      nguoiTaoId,
    });

    return this.chungTuRepository.save(chungTu);
  }

  async update(id: string, updateDto: UpdateChungTuDto): Promise<ChungTu> {
    const chungTu = await this.findOne(id);

    if (updateDto.ngay) {
      chungTu.ngay = new Date(updateDto.ngay);
    }
    if (updateDto.soTien !== undefined) {
      chungTu.soTien = updateDto.soTien;
    }
    if (updateDto.noiDung !== undefined) {
      chungTu.noiDung = updateDto.noiDung;
    }
    if (updateDto.danhMuc !== undefined) {
      chungTu.danhMuc = updateDto.danhMuc;
      // Đổi danhMuc (loaiGiaoDich) → suy lại loai để không lệch với cấu hình.
      // Giữ loai hiện tại làm fallback khi cấu hình không đủ để suy luận.
      chungTu.loai = await this.loaiResolver.resolveLoai(
        updateDto.danhMuc,
        chungTu.loai,
      );
    }

    return this.chungTuRepository.save(chungTu);
  }

  async delete(id: string): Promise<void> {
    const chungTu = await this.findOne(id);
    await this.chungTuRepository.remove(chungTu);
  }

  async search(keyword: string, loai?: LoaiChungTu): Promise<ChungTu[]> {
    const vouchers = await this.findAll(loai);
    const lowerKeyword = keyword.toLowerCase();
    return vouchers.filter(
      (v) =>
        v.soPhieu.toLowerCase().includes(lowerKeyword) ||
        v.noiDung.toLowerCase().includes(lowerKeyword) ||
        v.danhMuc?.doiTuong?.ten?.toLowerCase().includes(lowerKeyword),
    );
  }

  async importPhieu(
    loai: LoaiChungTu,
    items: Omit<CreateChungTuDto, 'loai'>[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu[] }> {
    if (items.length === 0) return { success: true, data: [] };

    // Suy ra loai từng dòng theo Loại giao dịch; fallback = loai của endpoint import.
    const loaiByIndex = await Promise.all(
      items.map((item) => this.loaiResolver.resolveLoai(item.danhMuc, loai)),
    );

    // Gom index theo loai đã suy luận để đặt dải số phiếu đúng tiền tố (PT/PC/NK).
    const indicesByLoai = new Map<LoaiChungTu, number[]>();
    loaiByIndex.forEach((l, idx) => {
      const list = indicesByLoai.get(l) ?? [];
      list.push(idx);
      indicesByLoai.set(l, list);
    });

    const soPhieuByIndex: string[] = new Array(items.length);
    for (const [l, indices] of indicesByLoai) {
      const numbers = await this.voucherNumberService.generateVoucherNumbers(
        l,
        indices.length,
      );
      indices.forEach((origIdx, i) => {
        soPhieuByIndex[origIdx] = numbers[i];
      });
    }

    const chungTuList = items.map((item, idx) =>
      this.chungTuRepository.create({
        loai: loaiByIndex[idx],
        soTien: item.soTien,
        noiDung: item.noiDung,
        danhMuc: item.danhMuc,
        ghiChu: item.ghiChu,
        nguoiGiaoDich: item.nguoiGiaoDich,
        diaChi: item.diaChi,
        ngay: new Date(item.ngay),
        soPhieu: soPhieuByIndex[idx],
        nguoiTaoId,
      }),
    );

    const saved = await this.chungTuRepository.save(chungTuList);
    return { success: true, data: saved };
  }
}
