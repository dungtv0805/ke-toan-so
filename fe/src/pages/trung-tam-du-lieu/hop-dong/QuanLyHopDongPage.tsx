import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Checkbox,
  Space,
  message,
  Divider,
  Typography,
  Select,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { FilterBar } from '@/components/common/FilterBar';
import type {
  TheoDoiHopDongRow,
  ThuTienHopDong,
  HoaDonBanRa,
  DoiTuong,
  SanPham,
} from '@/types';
import { theoDoiHopDongService } from '@/services/theoDoiHopDongService';
import { thuTienHopDongService } from '@/services/thuTienHopDongService';
import { hoaDonBanRaService } from '@/services/hoaDonBanRaService';
import { doiTuongService } from '@/services/doiTuongService';
import { sanPhamService } from '@/services/sanPhamService';
import {
  nhatKyChungService,
  type TongHopDonHang,
} from '@/services/nhatKyChungService';
import { THUE_SUAT_OPTIONS } from '@/services/taxService';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';
import GhiNhanDoanhThuSection from './GhiNhanDoanhThuSection';
import ThuTienDonHangModal from './ThuTienDonHangModal';
import TaoNhanhHopDongModal from './TaoNhanhHopDongModal';
import { SectionNav } from '@/components/layout/SectionNav';
import { BAN_HANG_NAV } from '@/config/sectionNavs';
import { KY_OPTIONS, trongKy, type BoLocThoiGian, type KyLoc } from './boLocThoiGian';
import { tongHopBaoCaoNhanh } from './baoCaoNhanh';

const { Text, Title } = Typography;

/**
 * Dòng bảng = đơn hàng (master-data) + số kế toán ghép từ chứng từ (voucher) + các số
 * suy ra. Ghép ở FE vì hai nguồn nằm ở hai service khác nhau.
 */
type DongBang = TheoDoiHopDongRow & {
  daThu: number;
  dtChuaThucHien: number;
  dtDaThucHien: number;
  daXuatHoaDon: number;
  chuaXuatHoaDon: number;
  conPhaiThu: number;
  /** Mốc so sánh doanh thu — giá trị trước thuế của đơn hàng. */
  mocDoanhThu: number;
};

/**
 * Ô dùng để so khớp bộ lọc cột — key trùng `key` của cột antd.
 * Cột "Chủ đầu tư" hiển thị TÊN (map từ id) nên lọc cũng phải khớp trên tên.
 */
const cellValue =
  (doiTuongMap: Record<string, string>, sanPhamMap: Record<string, string>) =>
  (r: DongBang, key: string): string | undefined => {
    switch (key) {
      case 'soHopDong':
        return r.soHopDong;
      case 'tenCongTrinh':
        return r.tenCongTrinh;
      case 'doiTuongId':
        return doiTuongMap[r.doiTuongId || ''];
      case 'sanPhamId':
        return sanPhamMap[r.sanPhamId || ''];
      default:
        return undefined;
    }
  };

const fmtCur = (v?: number) =>
  v == null
    ? '0'
    : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const moneyProps = {
  className: 'w-full',
  formatter: (value?: string | number) =>
    `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  parser: (value?: string) => (value?.replace(/[^\d.-]/g, '') ?? '') as unknown as number,
};

/** Vùng cuộn dọc của app (MainLayout <Content>) — dùng cho header dính của bảng. */
const getScrollContainer = (): HTMLElement | Window =>
  document.querySelector<HTMLElement>('.ant-layout-content') || window;

const NAM_HIEN_TAI = dayjs().year();
const NAM_OPTIONS = Array.from({ length: 16 }, (_, i) => {
  const y = 2022 + i;
  return { value: y, label: `Năm ${y}` };
});

interface ScalarForm {
  phuTrachHoSo?: string;
  trangThaiHoSo?: string;
  quyetToan?: { so?: string; ngay?: Dayjs; giaTri?: number };
  baoHanhTheoDoi?: {
    giaTri?: number;
    soNgay?: number;
    ngayGiaiToaBL?: Dayjs;
    trangThai?: string;
  };
  giamTru?: number;
  tinhTrangHoSo?: {
    hd?: boolean;
    nt1?: boolean;
    nt2?: boolean;
    ntSuDung?: boolean;
    thanhLy?: boolean;
    namQuyetToan?: number;
  };
  ghiChu?: string;
}

export default function QuanLyHopDongPage() {
  const { canEdit } = usePagePermission('/trung-tam-du-lieu/hop-dong');
  // Tạo nhanh ghi vào danh mục Hợp đồng → xin quyền "thêm" của chính danh mục đó.
  const { canCreate: canCreateHopDong } = usePagePermission('/danh-muc/hop-dong');
  const fl = useFieldLabels('trungTamDuLieu.hopDong');

  const [rows, setRows] = useState<TheoDoiHopDongRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [doiTuongMap, setDoiTuongMap] = useState<Record<string, string>>({});
  const [sanPhamList, setSanPhamList] = useState<SanPham[]>([]);
  const [tongHop, setTongHop] = useState<Record<string, TongHopDonHang>>({});

  const [search, setSearch] = useState('');
  const [loc, setLoc] = useState<BoLocThoiGian>({ nam: NAM_HIEN_TAI, ky: 'CA_NAM' });
  const [khachHang, setKhachHang] = useState<string | undefined>();
  const [sanPham, setSanPham] = useState<string | undefined>();
  const [donHang, setDonHang] = useState<string | undefined>();

  // Drawer editor
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<TheoDoiHopDongRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<ScalarForm>();
  const [receipts, setReceipts] = useState<ThuTienHopDong[]>([]);
  const [invoices, setInvoices] = useState<HoaDonBanRa[]>([]);
  const quyetToanGiaTri = Form.useWatch(['quyetToan', 'giaTri'], form);

  const loadList = async () => {
    setLoading(true);
    try {
      setRows(await theoDoiHopDongService.getList());
    } catch {
      message.error('Không tải được dữ liệu theo dõi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doiTuongService
      .getAll()
      .then((list: DoiTuong[]) => {
        const map: Record<string, string> = {};
        list.forEach((d) => {
          map[d.id] = d.ten;
        });
        setDoiTuongMap(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    sanPhamService.getAll().then(setSanPhamList).catch(() => setSanPhamList([]));
  }, []);

  const sanPhamMap = useMemo(() => {
    const m: Record<string, string> = {};
    sanPhamList.forEach((sp) => {
      m[sp.id] = sp.ten;
    });
    return m;
  }, [sanPhamList]);

  // Tải một lần; mọi bộ lọc chạy client-side nên không cần gọi lại API.
  useEffect(() => {
    loadList();
  }, []);

  // Số kế toán phụ thuộc năm đang lọc (cột theo tháng), nên nạp lại khi đổi năm.
  const loadTongHop = useCallback(async (nam: number) => {
    try {
      const res = await nhatKyChungService.getTongHopDonHang(nam);
      const m: Record<string, TongHopDonHang> = {};
      res.theoDonHang.forEach((t) => {
        m[t.soHopDong] = t;
      });
      setTongHop(m);
    } catch {
      message.error('Không tải được số liệu chứng từ theo đơn hàng');
    }
  }, []);

  useEffect(() => {
    loadTongHop(loc.nam);
  }, [loc.nam, loadTongHop]);

  const loadReceipts = (hopDongId: string) =>
    thuTienHopDongService.getList({ hopDongId }).then(setReceipts).catch(() => {});

  const openEditor = async (row: TheoDoiHopDongRow) => {
    setCurrent(row);
    setOpen(true);
    form.resetFields();
    setReceipts([]);
    setInvoices([]);
    // Đã thanh toán / Đã trả hóa đơn: tự cộng từ Sổ thu tiền + Sổ HĐ bán ra
    loadReceipts(row.hopDongId);
    hoaDonBanRaService.getList({ hopDongId: row.hopDongId }).then(setInvoices).catch(() => {});
    try {
      const t = await theoDoiHopDongService.getByHopDongId(row.hopDongId);
      if (t) {
        form.setFieldsValue({
          phuTrachHoSo: t.phuTrachHoSo,
          trangThaiHoSo: t.trangThaiHoSo,
          quyetToan: t.quyetToan
            ? {
                so: t.quyetToan.so,
                ngay: t.quyetToan.ngay ? dayjs(t.quyetToan.ngay) : undefined,
                giaTri: t.quyetToan.giaTri,
              }
            : undefined,
          baoHanhTheoDoi: t.baoHanhTheoDoi
            ? {
                giaTri: t.baoHanhTheoDoi.giaTri,
                soNgay: t.baoHanhTheoDoi.soNgay,
                ngayGiaiToaBL: t.baoHanhTheoDoi.ngayGiaiToaBL
                  ? dayjs(t.baoHanhTheoDoi.ngayGiaiToaBL)
                  : undefined,
                trangThai: t.baoHanhTheoDoi.trangThai,
              }
            : undefined,
          giamTru: t.giamTru,
          tinhTrangHoSo: t.tinhTrangHoSo,
          ghiChu: t.ghiChu,
        });
      }
    } catch {
      message.error('Không tải được dữ liệu hợp đồng');
    }
  };

  const daThanhToan = useMemo(
    () => receipts.reduce((s, d) => s + (Number(d.soTien) || 0), 0),
    [receipts],
  );
  const daTraHoaDon = useMemo(
    () => invoices.reduce((s, d) => s + (Number(d.tong) || 0), 0),
    [invoices],
  );
  const conLai = useMemo(() => {
    const base = Number(quyetToanGiaTri) || Number(current?.giaTriSauThue) || 0;
    return base - daThanhToan;
  }, [quyetToanGiaTri, current, daThanhToan]);

  const handleSave = async () => {
    if (!current) return;
    const v = await form.validateFields();
    setSaving(true);
    try {
      await theoDoiHopDongService.upsert(current.hopDongId, {
        phuTrachHoSo: v.phuTrachHoSo,
        trangThaiHoSo: v.trangThaiHoSo,
        quyetToan: v.quyetToan
          ? {
              so: v.quyetToan.so,
              ngay: v.quyetToan.ngay?.format('YYYY-MM-DD'),
              giaTri: v.quyetToan.giaTri,
            }
          : undefined,
        baoHanhTheoDoi: v.baoHanhTheoDoi
          ? {
              giaTri: v.baoHanhTheoDoi.giaTri,
              soNgay: v.baoHanhTheoDoi.soNgay,
              ngayGiaiToaBL: v.baoHanhTheoDoi.ngayGiaiToaBL?.format('YYYY-MM-DD'),
              trangThai: v.baoHanhTheoDoi.trangThai,
            }
          : undefined,
        giamTru: v.giamTru,
        tinhTrangHoSo: v.tinhTrangHoSo,
        ghiChu: v.ghiChu,
      });
      message.success('Đã lưu theo dõi hợp đồng');
      setOpen(false);
      loadList();
    } catch (e) {
      const err = e as { errorFields?: unknown };
      if (!err.errorFields) message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  // Danh sách load hết về client (BE không lọc) nên mọi bộ lọc chạy thẳng trên mảng:
  // lọc theo cột ở header, theo kỳ thời gian, và 3 bộ lọc trên thanh công cụ.
  const { filterable, matches, hasPinned } = useTableColumnFilters('trung-tam-du-lieu-hop-dong');

  const fullRows = useMemo<DongBang[]>(
    () =>
      rows.map((r) => {
        const t = tongHop[r.soHopDong];
        const doanhSo = Number(r.giaTriSauThue) || 0;
        const daXuatHoaDon = Number(r.daTraHoaDon) || 0;
        return {
          ...r,
          daThu: t?.daThu ?? 0,
          dtChuaThucHien: t?.dtChuaThucHien ?? 0,
          dtDaThucHien: t?.dtDaThucHien ?? 0,
          daXuatHoaDon,
          chuaXuatHoaDon: doanhSo - daXuatHoaDon,
          conPhaiThu: doanhSo - (t?.daThu ?? 0),
          mocDoanhThu: Number(r.giaTriTruocThue) || doanhSo - (Number(r.tienThue) || 0),
        };
      }),
    [rows, tongHop],
  );

  const viewRows = useMemo(() => {
    const getValue = cellValue(doiTuongMap, sanPhamMap);
    const tuKhoa = search.trim().toLowerCase();
    return fullRows.filter((r) => {
      if (!matches(r, getValue)) return false;
      if (!trongKy(r, loc)) return false;
      if (khachHang && r.doiTuongId !== khachHang) return false;
      if (sanPham && (r.sanPhamId || '') !== (sanPham === 'CHUA_CHON' ? '' : sanPham))
        return false;
      if (donHang && r.soHopDong !== donHang) return false;
      if (tuKhoa && !`${r.soHopDong} ${r.tenCongTrinh}`.toLowerCase().includes(tuKhoa))
        return false;
      return true;
    });
  }, [fullRows, matches, doiTuongMap, sanPhamMap, loc, khachHang, sanPham, donHang, search]);

  // Thẻ báo cáo nhanh cộng trên đúng tập dòng đang hiển thị, không phải tổng toàn bộ.
  const baoCao = useMemo(() => tongHopBaoCaoNhanh(viewRows), [viewRows]);

  // Số HĐ có thể trùng giữa các bản ghi cũ — Select không chịu được option trùng value.
  const donHangOptions = useMemo(
    () =>
      [...new Set(rows.map((r) => r.soHopDong).filter(Boolean))]
        .sort()
        .map((so) => ({ value: so, label: so })),
    [rows],
  );

  const columns: ColumnsType<DongBang> = [
    filterable<DongBang>({
      title: 'Số HĐ',
      dataIndex: 'soHopDong',
      key: 'soHopDong',
      width: 130,
      fixed: 'left',
      render: (v) => <Text strong>{v}</Text>,
    }),
    {
      title: 'Ngày HĐ',
      dataIndex: 'ngayKy',
      key: 'ngayKy',
      width: 110,
      align: 'center',
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '-'),
    },
    filterable<DongBang>({
      title: 'Tên công trình',
      dataIndex: 'tenCongTrinh',
      key: 'tenCongTrinh',
      width: 220,
      ellipsis: true,
    }),
    filterable<DongBang>({
      title: 'Chủ đầu tư',
      dataIndex: 'doiTuongId',
      key: 'doiTuongId',
      width: 160,
      ellipsis: true,
      render: (v: string) => doiTuongMap[v] || '-',
    }),
    filterable<DongBang>({
      title: 'Sản phẩm',
      dataIndex: 'sanPhamId',
      key: 'sanPhamId',
      width: 150,
      ellipsis: true,
      render: (v: string) => sanPhamMap[v] || '-',
    }),
    { title: 'Doanh số', dataIndex: 'giaTriSauThue', key: 'giaTriSauThue', width: 140, align: 'right', render: (v) => fmtCur(v) },
    { title: 'Tiền thuế', dataIndex: 'tienThue', key: 'tienThue', width: 120, align: 'right', render: (v) => fmtCur(v) },
    {
      title: 'DT chưa TH',
      dataIndex: 'dtChuaThucHien',
      key: 'dtChuaThucHien',
      width: 130,
      align: 'right',
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{fmtCur(v)}</Text>,
    },
    {
      title: 'DT đã TH',
      dataIndex: 'dtDaThucHien',
      key: 'dtDaThucHien',
      width: 130,
      align: 'right',
      render: (v: number) => <Text type="success">{fmtCur(v)}</Text>,
    },
    {
      title: 'Đã thu',
      dataIndex: 'daThu',
      key: 'daThu',
      width: 130,
      align: 'right',
      render: (v: number) => <Text type="success">{fmtCur(v)}</Text>,
    },
    {
      title: 'Còn phải thu',
      dataIndex: 'conPhaiThu',
      key: 'conPhaiThu',
      width: 140,
      align: 'right',
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{fmtCur(v)}</Text>,
    },
    { title: 'Đã xuất HĐ', dataIndex: 'daXuatHoaDon', key: 'daXuatHoaDon', width: 140, align: 'right', render: (v) => fmtCur(v) },
    {
      title: 'Chưa xuất HĐ',
      dataIndex: 'chuaXuatHoaDon',
      key: 'chuaXuatHoaDon',
      width: 140,
      align: 'right',
      render: (v: number) => <Text type={v > 0 ? 'warning' : undefined}>{fmtCur(v)}</Text>,
    },
    {
      title: 'Quyết toán',
      key: 'quyetToan',
      width: 140,
      align: 'right',
      render: (_, r) => fmtCur(r.tracking?.quyetToan?.giaTri),
    },
    // Không gắn lọc: cột này vốn không có `key`. Thêm key để lọc sẽ đưa nó vào "Chọn cột",
    // và người dùng từng lưu lựa chọn cột sẽ bị mất cột này cho tới khi tự tick lại.
    { title: 'Phụ trách', width: 130, ellipsis: true, render: (_, r) => r.tracking?.phuTrachHoSo || '-' },
    {
      title: '',
      key: 'action',
      width: 90,
      fixed: 'right',
      align: 'center',
      render: (_, r) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => openEditor(r)}>
          Theo dõi
        </Button>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('trungTamDuLieu.hopDong', columns);

  // Danh sách khoản thu (read-only, từ Sổ thu tiền)
  const receiptCols: ColumnsType<ThuTienHopDong> = [
    { title: 'Ngày', dataIndex: 'ngay', width: 100, render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-') },
    { title: 'Nội dung', dataIndex: 'noiDung', ellipsis: true, render: (v) => v || '-' },
    { title: 'Lần', dataIndex: 'lan', width: 50, align: 'center', render: (v) => v || '-' },
    { title: 'Số tiền', dataIndex: 'soTien', width: 130, align: 'right', render: (v) => fmtCur(v) },
  ];
  const invoiceCols: ColumnsType<HoaDonBanRa> = [
    { title: 'Số HĐ', dataIndex: 'soHoaDon', width: 70, align: 'center', render: (v) => v || '-' },
    { title: 'Ngày', dataIndex: 'ngay', width: 100, render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-') },
    { title: 'Đơn vị mua', dataIndex: 'donViMua', ellipsis: true, render: (v) => v || '-' },
    { title: 'Tổng', dataIndex: 'tong', width: 130, align: 'right', render: (v) => fmtCur(v) },
  ];

  return (
    <div className="space-y-3">
      <SectionNav items={BAN_HANG_NAV} />

      <Row gutter={[12, 12]}>
        {[
          { title: 'Doanh số', value: baoCao.doanhSo, color: '#1677ff' },
          { title: 'DT chưa thực hiện', value: baoCao.dtChuaThucHien, color: '#fa8c16' },
          { title: 'DT đã thực hiện', value: baoCao.dtDaThucHien, color: '#52c41a' },
          { title: 'Tiền thuế', value: baoCao.tienThue, color: '#722ed1' },
          { title: 'Tiền đã thu', value: baoCao.daThu, color: '#52c41a' },
          { title: 'Còn phải thu', value: baoCao.conPhaiThu, color: '#fa8c16' },
          { title: 'Đã xuất hóa đơn', value: baoCao.daXuatHoaDon, color: '#1677ff' },
          { title: 'Chưa xuất hóa đơn', value: baoCao.chuaXuatHoaDon, color: '#fa8c16' },
        ].map((c) => (
          <Col xs={12} sm={12} md={6} key={c.title}>
            <Card className="stat-card" size="small">
              <Statistic
                title={c.title}
                value={c.value}
                formatter={(v) => fmtCur(Number(v))}
                valueStyle={{ fontSize: 18, color: c.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="shadow-sm">
        <FilterBar
          search={{
            value: search,
            onChange: setSearch,
            placeholder: 'Tìm theo số HĐ, tên công trình...',
            width: 260,
          }}
          onReset={() => {
            setSearch('');
            setLoc({ nam: NAM_HIEN_TAI, ky: 'CA_NAM' });
            setKhachHang(undefined);
            setSanPham(undefined);
            setDonHang(undefined);
          }}
          filters={
            <>
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Khách hàng"
                style={{ width: 180 }}
                value={khachHang}
                onChange={setKhachHang}
                options={Object.entries(doiTuongMap).map(([id, ten]) => ({
                  value: id,
                  label: ten,
                }))}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Sản phẩm"
                style={{ width: 170 }}
                value={sanPham}
                onChange={setSanPham}
                options={[
                  { value: 'CHUA_CHON', label: '(Chưa chọn sản phẩm)' },
                  ...sanPhamList.map((sp) => ({
                    value: sp.id,
                    label: `${sp.ma} - ${sp.ten}`,
                  })),
                ]}
              />
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Đơn hàng"
                style={{ width: 170 }}
                value={donHang}
                onChange={setDonHang}
                options={donHangOptions}
              />
              <Select
                style={{ width: 120 }}
                value={loc.nam}
                onChange={(v) => setLoc((p) => ({ ...p, nam: v }))}
                options={NAM_OPTIONS}
              />
              <Select
                style={{ width: 180 }}
                value={loc.ky}
                onChange={(v: KyLoc) => setLoc((p) => ({ ...p, ky: v }))}
                options={KY_OPTIONS}
              />
              {loc.ky === 'TUY_CHON' && (
                <DatePicker.RangePicker
                  format="DD/MM/YYYY"
                  onChange={(d) =>
                    setLoc((p) => ({
                      ...p,
                      tuNgay: d?.[0]?.format('YYYY-MM-DD'),
                      denNgay: d?.[1]?.format('YYYY-MM-DD'),
                    }))
                  }
                />
              )}
            </>
          }
          actions={
            <>
              {settingsButton}
              {canCreateHopDong && <TaoNhanhHopDongModal onCreated={loadList} />}
            </>
          }
        />

        <Table<DongBang>
          columns={cfgColumns}
          dataSource={viewRows}
          rowKey="hopDongId"
          loading={loading}
          size="small"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được.
          scroll={{ x: hasPinned ? 'max-content' : 1500 }}
          // Header dính khi cuộn dọc. Vùng cuộn của app là <Content> trong MainLayout
          // (overflow:auto), KHÔNG phải window → phải trỏ getContainer vào đó.
          sticky={{ offsetHeader: 0, getContainer: getScrollContainer }}
          pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} hợp đồng` }}
        />
      </Card>

      <Drawer
        title={current ? `Theo dõi: ${current.soHopDong}` : 'Theo dõi hợp đồng'}
        open={open}
        onClose={() => setOpen(false)}
        width={760}
        extra={
          canEdit && (
            <Button type="primary" loading={saving} onClick={handleSave}>
              Lưu
            </Button>
          )
        }
      >
        {current && (
          <div className="space-y-2">
            {/* Thông tin HĐ (chỉ đọc) */}
            <Card size="small" className="bg-gray-50">
              <Row gutter={12}>
                <Col span={12}><Text type="secondary">Tên công trình:</Text> {current.tenCongTrinh}</Col>
                <Col span={6}><Text type="secondary">Giá trị:</Text> {fmtCur(current.giaTriSauThue)}</Col>
                <Col span={6}><Text type="secondary">Chủ đầu tư:</Text> {doiTuongMap[current.doiTuongId || ''] || '-'}</Col>
              </Row>
            </Card>

            <Form form={form} layout="vertical" size="small">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="phuTrachHoSo" label={fl('phuTrachHoSo', 'Phụ trách hồ sơ')}>
                    <Input placeholder="Tên người phụ trách" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="trangThaiHoSo" label={fl('trangThaiHoSo', 'Trạng thái hồ sơ')}>
                    <Input placeholder="VD: Đang theo dõi" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Quyết toán</Divider>
              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item name={['quyetToan', 'so']} label="Số quyết toán">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['quyetToan', 'ngay']} label="Ngày">
                    <DatePicker format="DD/MM/YYYY" className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name={['quyetToan', 'giaTri']} label="Giá trị quyết toán">
                    <InputNumber {...moneyProps} addonAfter="VNĐ" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">Bảo hành theo dõi</Divider>
              <Row gutter={12}>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'giaTri']} label="Giá trị BH">
                    <InputNumber {...moneyProps} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'soNgay']} label="Số ngày">
                    <InputNumber className="w-full" min={0} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'ngayGiaiToaBL']} label="Ngày giải tỏa BL">
                    <DatePicker format="DD/MM/YYYY" className="w-full" />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name={['baoHanhTheoDoi', 'trangThai']} label="Trạng thái">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="giamTru" label={fl('giamTru', 'Giảm trừ')}>
                <InputNumber {...moneyProps} addonAfter="VNĐ" style={{ width: 240 }} />
              </Form.Item>

              <Divider orientation="left">Các khoản thu</Divider>
              <div className="mb-2 flex items-center justify-between gap-2">
                <Text type="secondary" className="text-xs">
                  Thu tiền tại đây sẽ tạo phiếu thu Nợ 112 / Có 3387 gắn sẵn đơn hàng và ghi vào Sổ thu tiền.
                </Text>
                {canEdit && (
                  <ThuTienDonHangModal
                    hopDong={current}
                    soLanDaThu={receipts.length}
                    onCreated={() => loadReceipts(current.hopDongId)}
                  />
                )}
              </div>
              <Table size="small" rowKey={(r) => r.id || ''} columns={receiptCols} dataSource={receipts} pagination={false} locale={{ emptyText: 'Chưa có khoản thu' }} />

              <Divider orientation="left">Hóa đơn bán ra</Divider>
              <Table size="small" rowKey={(r) => r.id || ''} columns={invoiceCols} dataSource={invoices} pagination={false} locale={{ emptyText: 'Chưa có hóa đơn' }} />

              <Divider orientation="left">Ghi nhận doanh thu</Divider>
              <GhiNhanDoanhThuSection
                key={current.hopDongId}
                hopDong={current}
                canEdit={canEdit}
                daThanhToan={daThanhToan}
              />

              <Divider orientation="left">Tình trạng hồ sơ</Divider>
              <Space wrap size="large">
                <Form.Item name={['tinhTrangHoSo', 'hd']} valuePropName="checked" noStyle><Checkbox>HĐ</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'nt1']} valuePropName="checked" noStyle><Checkbox>NT1</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'nt2']} valuePropName="checked" noStyle><Checkbox>NT2</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'ntSuDung']} valuePropName="checked" noStyle><Checkbox>NT đưa vào sử dụng</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'thanhLy']} valuePropName="checked" noStyle><Checkbox>Thanh lý</Checkbox></Form.Item>
                <Form.Item name={['tinhTrangHoSo', 'namQuyetToan']} label="Năm QT" className="mb-0">
                  <InputNumber min={1900} max={2200} controls={false} />
                </Form.Item>
              </Space>

              <Form.Item name="ghiChu" label={fl('ghiChu', 'Ghi chú')} className="mt-3">
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
            </Form>

            {/* Tổng tự tính */}
            <Card size="small">
              <Row gutter={12}>
                <Col span={8}><Title level={5} className="!mb-0">Đã thanh toán: <Text type="success">{fmtCur(daThanhToan)}</Text></Title></Col>
                <Col span={8}><Title level={5} className="!mb-0">Đã trả hóa đơn: {fmtCur(daTraHoaDon)}</Title></Col>
                <Col span={8}><Title level={5} className="!mb-0">Còn lại: <Text type="warning">{fmtCur(conLai)}</Text></Title></Col>
              </Row>
            </Card>
          </div>
        )}
      </Drawer>
    </div>
  );
}
