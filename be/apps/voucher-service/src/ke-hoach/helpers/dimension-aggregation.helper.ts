/** Các chiều phân tích dùng chung cho báo cáo kế hoạch và báo cáo so sánh. */
export type KeHoachDimension =
  | 'account'
  | 'doi-tuong'
  | 'khoan-muc'
  | 'nhom-khoan-muc'
  | 'project'
  | 'investor'
  | 'product'
  | 'department'
  | 'team'
  | 'employee'
  | 'cash-flow'
  | 'management-group'
  | 'promotion-group';

export const KE_HOACH_DIMENSIONS: KeHoachDimension[] = [
  'account',
  'doi-tuong',
  'khoan-muc',
  'nhom-khoan-muc',
  'project',
  'investor',
  'product',
  'department',
  'team',
  'employee',
  'cash-flow',
  'management-group',
  'promotion-group',
];

/** Chiều gom thẳng theo một snapshot danh mục (có `ma` + `ten`). */
const DUONG_DAN: Partial<Record<KeHoachDimension, string>> = {
  'khoan-muc': 'danhMuc.khoanMuc',
  project: 'danhMuc.duAn',
  product: 'danhMuc.sanPham',
  department: 'danhMuc.boPhan',
  team: 'danhMuc.doi',
  employee: 'danhMuc.nhanVien',
  'cash-flow': 'danhMuc.dongTien',
  'management-group': 'danhMuc.nhomQuanLy',
  'promotion-group': 'danhMuc.nhomKhuyenMai',
};

export const layDuong = (dim: KeHoachDimension): string | undefined =>
  DUONG_DAN[dim];

// Doanh thu = phát sinh Có TK 5xx, chi phí = phát sinh Nợ TK 6xx —
// cùng quy tắc với `bao-cao.service.ts` của reporting-service.
const LA_DOANH_THU = {
  $regexMatch: {
    input: { $ifNull: ['$danhMuc.taiKhoanCo.ma', ''] },
    regex: '^5',
  },
};
const LA_CHI_PHI = {
  $regexMatch: {
    input: { $ifNull: ['$danhMuc.taiKhoanNo.ma', ''] },
    regex: '^6',
  },
};

const CHI_SO = {
  doanhThu: { $sum: { $cond: [LA_DOANH_THU, '$soTien', 0] } },
  chiPhi: { $sum: { $cond: [LA_CHI_PHI, '$soTien', 0] } },
  tong: { $sum: '$soTien' },
  soLuong: { $sum: 1 },
};

const CHIEU_RA = {
  $project: {
    _id: 0,
    key: '$_id',
    ten: 1,
    doanhThu: 1,
    chiPhi: 1,
    tong: 1,
    soLuong: 1,
  },
};

const SAP_XEP = { $sort: { tong: -1 } };

/** Gộp hai nhánh $facet thành một danh sách rồi cộng lại theo mã. */
const GOP_HAI_NHANH = (a: string, b: string): object[] => [
  { $project: { combined: { $concatArrays: [`$${a}`, `$${b}`] } } },
  { $unwind: '$combined' },
  { $replaceRoot: { newRoot: '$combined' } },
  {
    $group: {
      _id: '$_id',
      ten: { $first: '$ten' },
      doanhThu: { $sum: '$doanhThu' },
      chiPhi: { $sum: '$chiPhi' },
      tong: { $sum: '$tong' },
      soLuong: { $sum: '$soLuong' },
    },
  },
  { $match: { _id: { $ne: null } } },
  CHIEU_RA,
  SAP_XEP,
];

/**
 * Tài khoản: mỗi dòng đóng góp vào cả TK Nợ lẫn TK Có. Doanh thu chỉ tính ở bên Có
 * (TK 5xx), chi phí chỉ tính ở bên Nợ (TK 6xx) — đúng bản chất của chính tài khoản đó.
 */
function pipelineTaiKhoan(match: Record<string, unknown>): object[] {
  return [
    { $match: match },
    {
      $facet: {
        ben_no: [
          { $match: { 'danhMuc.taiKhoanNo.ma': { $ne: null } } },
          {
            $group: {
              _id: '$danhMuc.taiKhoanNo.ma',
              ten: { $first: '$danhMuc.taiKhoanNo.ten' },
              doanhThu: { $sum: 0 },
              chiPhi: { $sum: { $cond: [LA_CHI_PHI, '$soTien', 0] } },
              tong: { $sum: '$soTien' },
              soLuong: { $sum: 1 },
            },
          },
        ],
        ben_co: [
          { $match: { 'danhMuc.taiKhoanCo.ma': { $ne: null } } },
          {
            $group: {
              _id: '$danhMuc.taiKhoanCo.ma',
              ten: { $first: '$danhMuc.taiKhoanCo.ten' },
              doanhThu: { $sum: { $cond: [LA_DOANH_THU, '$soTien', 0] } },
              chiPhi: { $sum: 0 },
              tong: { $sum: '$soTien' },
              soLuong: { $sum: 1 },
            },
          },
        ],
      },
    },
    ...GOP_HAI_NHANH('ben_no', 'ben_co'),
  ];
}

/** Đối tượng: dòng ghi cả ĐT Nợ và ĐT Có, mỗi bên là một bucket. */
function pipelineDoiTuong(match: Record<string, unknown>): object[] {
  const nhanh = (field: string) => [
    { $match: { [`danhMuc.${field}.ma`]: { $ne: null } } },
    {
      $group: {
        _id: `$danhMuc.${field}.ma`,
        ten: { $first: `$danhMuc.${field}.ten` },
        ...CHI_SO,
      },
    },
  ];
  return [
    { $match: match },
    { $facet: { dt_no: nhanh('doiTuong'), dt_co: nhanh('doiTuong2') } },
    ...GOP_HAI_NHANH('dt_no', 'dt_co'),
  ];
}

/** Chủ đầu tư nằm ở `danhMuc.chuDauTu` hoặc lồng trong `danhMuc.duAn`. */
function pipelineChuDauTu(match: Record<string, unknown>): object[] {
  return [
    { $match: match },
    {
      $addFields: {
        cdtMa: { $ifNull: ['$danhMuc.chuDauTu.ma', '$danhMuc.duAn.chuDauTuMa'] },
        cdtTen: {
          $ifNull: ['$danhMuc.chuDauTu.ten', '$danhMuc.duAn.chuDauTuTen'],
        },
      },
    },
    { $group: { _id: '$cdtMa', ten: { $first: '$cdtTen' }, ...CHI_SO } },
    { $match: { _id: { $ne: null } } },
    CHIEU_RA,
    SAP_XEP,
  ];
}

/** Nhóm khoản mục là một chuỗi trên danh mục khoản mục — mã cũng là tên. */
function pipelineNhomKhoanMuc(match: Record<string, unknown>): object[] {
  return [
    { $match: match },
    {
      $group: {
        _id: '$danhMuc.khoanMuc.nhom',
        ten: { $first: '$danhMuc.khoanMuc.nhom' },
        ...CHI_SO,
      },
    },
    { $match: { _id: { $nin: [null, ''] } } },
    CHIEU_RA,
    SAP_XEP,
  ];
}

/**
 * Pipeline gom số tiền theo một chiều phân tích. Dùng cho CẢ hai collection
 * (`ke_hoach` và `chung_tu`) nên số kế hoạch và số thực hiện luôn cùng cách tính.
 */
export function buildDimensionPipeline(
  dimension: KeHoachDimension,
  match: Record<string, unknown>,
): object[] {
  if (dimension === 'account') return pipelineTaiKhoan(match);
  if (dimension === 'doi-tuong') return pipelineDoiTuong(match);
  if (dimension === 'investor') return pipelineChuDauTu(match);
  if (dimension === 'nhom-khoan-muc') return pipelineNhomKhoanMuc(match);

  const duong = DUONG_DAN[dimension];
  if (!duong) throw new Error(`Chiều phân tích không hợp lệ: ${dimension}`);

  return [
    { $match: match },
    {
      $group: {
        _id: `$${duong}.ma`,
        ten: { $first: `$${duong}.ten` },
        ...CHI_SO,
      },
    },
    { $match: { _id: { $ne: null } } },
    CHIEU_RA,
    SAP_XEP,
  ];
}
