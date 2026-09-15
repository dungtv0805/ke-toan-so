import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Tooltip,
  Typography,
  Alert,
  Progress,
  Row,
  Col,
  message,
} from 'antd';
import {
  CloudDownloadOutlined,
  LoginOutlined,
  SettingOutlined,
  FileZipOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  UnorderedListOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useManHinh } from '@/hooks/useManHinh';
import { nutLenh } from '@/components/common/nutLenh';
import {
  hoaDonCongThueService,
  NHAN_TRANG_THAI,
  type CongTyCongThue,
  type LuotChay,
  type TrangThaiMuc,
  type TrangThaiPhien,
  type LuotTaiFile,
  type LuotTaoPdf,
  type TrangThaiMucFile,
  type HoaDonTho,
} from '@/services/hoaDonCongThueService';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const MAU_TRANG_THAI: Record<TrangThaiMuc, string> = {
  cho: 'default',
  dang_chay: 'processing',
  xong: 'success',
  can_captcha: 'warning',
  bo_qua: 'default',
  loi: 'error',
};

/**
 * Tải hóa đơn điện tử từ cổng Thuế.
 *
 * Nút thắt của màn hình này là CAPTCHA: cổng Thuế bắt nhập mã cho mỗi phiên
 * đăng nhập, nên mọi thứ chạm tới cổng đều phải đi qua một người ngồi đó. Thiết
 * kế vì thế xoay quanh việc gom captcha lại cho gọn thay vì giấu nó đi.
 */
const HoaDonCongThuePage: React.FC = () => {
  const gon = useManHinh() === 'mobile';
  const navigate = useNavigate();

  const [congTy, setCongTy] = useState<CongTyCongThue[]>([]);
  const [phien, setPhien] = useState<TrangThaiPhien[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [congChan, setCongChan] = useState<{ dangBiChan: boolean; soPhutTruoc: number | null } | null>(null);

  const [khoang, setKhoang] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [luot, setLuot] = useState<LuotChay | null>(null);
  const hoiRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [captcha, setCaptcha] = useState<{ mst: string; sessionId: string; svg: string } | null>(null);
  const [maCaptcha, setMaCaptcha] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [moToken, setMoToken] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [luotFile, setLuotFile] = useState<LuotTaiFile | null>(null);
  const [dangTaiVe, setDangTaiVe] = useState<string | null>(null);
  const [xemHoaDon, setXemHoaDon] = useState<{ mst: string; ds: HoaDonTho[] } | null>(null);
  const [dangXemHoaDon, setDangXemHoaDon] = useState(false);
  // Hóa đơn đang xem ở khung bên phải + objectURL của bản PDF.
  const [dangChon, setDangChon] = useState<HoaDonTho | null>(null);
  const [urlPdf, setUrlPdf] = useState<string | null>(null);
  const [dangMoPdf, setDangMoPdf] = useState(false);
  const [dangXuatExcel, setDangXuatExcel] = useState<string | null>(null);
  const [luotPdf, setLuotPdf] = useState<LuotTaoPdf | null>(null);
  const hoiPdfRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hoiFileRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nap = useCallback(async () => {
    try {
      const [ds, ph] = await Promise.all([
        hoaDonCongThueService.danhSachCongTy(),
        hoaDonCongThueService.trangThaiPhien(),
      ]);
      setCongTy(ds ?? []);
      setPhien(ph ?? []);
      hoaDonCongThueService
        .tinhTrangCongThue()
        .then(setCongChan)
        .catch(() => undefined);
    } catch (e: any) {
      message.error(e?.message || 'Không tải được danh sách');
    } finally {
      setDangTai(false);
    }
  }, []);

  useEffect(() => {
    nap();
    hoaDonCongThueService.luotGanNhat().then(setLuot).catch(() => undefined);
  }, [nap]);

  /**
   * Khôi phục lượt tải file và lượt dựng PDF gần nhất khi mở lại trang.
   *
   * Không có bước này thì tải lại trang là bảng chi tiết biến mất, dù việc vẫn
   * đang chạy ở máy chủ — nhìn hệt như chưa từng bấm gì.
   */
  useEffect(() => {
    if (!congTy.length) return;
    for (const c of congTy) {
      hoaDonCongThueService
        .luotTaiFileGanNhat(c.mst)
        .then((l) => l && setLuotFile((cu) => (cu && cu.id >= l.id ? cu : l)))
        .catch(() => undefined);
      hoaDonCongThueService
        .luotTaoPdfGanNhat(c.mst)
        .then((l) => l && setLuotPdf((cu) => (cu && cu.id >= l.id ? cu : l)))
        .catch(() => undefined);
    }
  }, [congTy]);

  // Lượt chạy diễn ra ở phía máy chủ nên đóng tab không làm hỏng nó; ở đây chỉ
  // hỏi tiến độ cho tới khi xong.
  useEffect(() => {
    if (!luot || luot.trangThai !== 'dang_chay') {
      if (hoiRef.current) clearInterval(hoiRef.current);
      return;
    }
    hoiRef.current = setInterval(async () => {
      const moi = await hoaDonCongThueService.luotChay(luot.id).catch(() => null);
      if (moi) setLuot(moi);
    }, 2000);
    return () => {
      if (hoiRef.current) clearInterval(hoiRef.current);
    };
  }, [luot?.id, luot?.trangThai]);

  const daDangNhap = (mst: string) => phien.find((p) => p.mst === mst)?.daDangNhap ?? false;
  const tuNgay = () => khoang[0].format('YYYY-MM-DD');
  const denNgay = () => khoang[1].format('YYYY-MM-DD');

  async function moDangNhap(c: CongTyCongThue) {
    try {
      const r = await hoaDonCongThueService.dangNhap(c.mst);
      if (r.sessionId && r.captchaSvg) {
        setCaptcha({ mst: c.mst, sessionId: r.sessionId, svg: r.captchaSvg });
        setMaCaptcha('');
      }
    } catch (e: any) {
      message.error(e?.message || 'Không lấy được mã captcha');
    }
  }

  async function guiCaptcha() {
    if (!captcha || !maCaptcha.trim()) return;
    setDangGui(true);
    try {
      await hoaDonCongThueService.guiCaptcha(captcha.sessionId, maCaptcha.trim());
      const mst = captcha.mst;
      setCaptcha(null);
      await nap();
      message.success(`Đã đăng nhập ${mst}`);
    } catch (e: any) {
      message.error(e?.message || 'Sai mã captcha hoặc mật khẩu');
    } finally {
      setDangGui(false);
    }
  }

  /** Nhận token từ phiên trình duyệt của kế toán khi cổng chặn đăng nhập bằng máy. */
  async function guiToken() {
    if (!moToken || !token.trim()) return;
    setDangGui(true);
    try {
      await hoaDonCongThueService.datToken(moToken, token.trim());
      const mst = moToken;
      setMoToken(null);
      setToken('');
      await nap();
      message.success(`Đã nhận token cho ${mst}, dùng được khoảng một giờ`);
    } catch (e: any) {
      message.error(e?.message || 'Token không dùng được');
    } finally {
      setDangGui(false);
    }
  }

  async function taiHangLoat() {
    try {
      setLuot(await hoaDonCongThueService.taiHangLoat({ tuNgay: tuNgay(), denNgay: denNgay() }));
    } catch (e: any) {
      message.error(e?.message || 'Không bắt đầu được');
    }
  }

  /**
   * Tải file gốc: gói ZIP chứa XML có chữ ký số.
   *
   * Đây mới là bản gốc hợp pháp theo Nghị định 123/2020. Cổng Thuế KHÔNG có
   * endpoint PDF — bản PDF trên giao diện cổng là do trình duyệt tự dựng HTML
   * rồi in ra, nên không có file PDF nào để tải về.
   */
  async function taiFileGoc(c: CongTyCongThue) {
    try {
      // Trả về ngay một lượt chạy nền — không có gì để timeout.
      setLuotFile(await hoaDonCongThueService.taiFileGoc(c.mst, tuNgay(), denNgay()));
    } catch (e: any) {
      message.error(e?.message || 'Không bắt đầu tải được');
    }
  }

  /** Gói toàn bộ file gốc đã tải của kỳ thành một ZIP và lưu xuống máy. */
  async function taiVeMay(c: CongTyCongThue) {
    setDangTaiVe(c.mst);
    try {
      await hoaDonCongThueService.taiVeFileGoc(c.mst, tuNgay(), denNgay());
    } catch (e: any) {
      message.error(e?.message || 'Không tải về được');
    } finally {
      setDangTaiVe(null);
    }
  }

  /** Kết xuất Excel lấy thẳng từ cổng Thuế, cần phiên cổng còn hiệu lực. */
  async function xuatExcel(c: CongTyCongThue, chieu: 'mua-vao' | 'ban-ra') {
    setDangXuatExcel(c.mst);
    try {
      await hoaDonCongThueService.xuatExcel(c.mst, tuNgay(), denNgay(), chieu);
    } catch (e: any) {
      message.error(e?.message || 'Không kết xuất được Excel');
    } finally {
      setDangXuatExcel(null);
    }
  }

  /** Dựng PDF cho cả kỳ; chạy nền nên chỉ cần theo dõi tiến độ. */
  async function taoPdf(c: CongTyCongThue) {
    try {
      setLuotPdf(await hoaDonCongThueService.taoPdf(c.mst, tuNgay(), denNgay()));
    } catch (e: any) {
      message.error(e?.message || 'Không bắt đầu dựng PDF được');
    }
  }

  async function taiVePdf(c: CongTyCongThue) {
    try {
      await hoaDonCongThueService.taiVePdf(c.mst, tuNgay(), denNgay());
    } catch (e: any) {
      message.error(e?.message || 'Không tải được PDF');
    }
  }

  useEffect(() => {
    if (!luotPdf || luotPdf.trangThai !== 'dang_chay') {
      if (hoiPdfRef.current) clearInterval(hoiPdfRef.current);
      return;
    }
    hoiPdfRef.current = setInterval(async () => {
      const moi = await hoaDonCongThueService.luotTaoPdf(luotPdf.id).catch(() => null);
      if (!moi) return;
      setLuotPdf(moi);
      if (moi.trangThai === 'xong') {
        message.success(
          `Đã dựng ${moi.daTao} bản PDF` +
            (moi.boQua ? `, ${moi.boQua} bản đã có sẵn` : '') +
            (moi.loi.length ? `, ${moi.loi.length} lỗi` : ''),
        );
      }
    }, 2000);
    return () => {
      if (hoiPdfRef.current) clearInterval(hoiPdfRef.current);
    };
  }, [luotPdf?.id, luotPdf?.trangThai]);

  // Hỏi tiến độ tải file mỗi 2 giây cho tới khi xong.
  useEffect(() => {
    if (!luotFile || luotFile.trangThai !== 'dang_chay') {
      if (hoiFileRef.current) clearInterval(hoiFileRef.current);
      return;
    }
    hoiFileRef.current = setInterval(async () => {
      const moi = await hoaDonCongThueService.luotTaiFile(luotFile.id).catch(() => null);
      if (!moi) return;
      setLuotFile(moi);
      if (moi.trangThai === 'xong') {
        const mb = (moi.bytes / 1024 / 1024).toFixed(1);
        message.success(
          `${moi.mst}: tải ${moi.daTai} file gốc (${mb} MB)` +
            (moi.conLai ? `, còn ${moi.conLai} hóa đơn chưa tải` : '') +
            (moi.loi.length ? `, ${moi.loi.length} hóa đơn lỗi` : ''),
        );
      }
    }, 2000);
    return () => {
      if (hoiFileRef.current) clearInterval(hoiFileRef.current);
    };
  }, [luotFile?.id, luotFile?.trangThai]);

  const canCaptcha = (luot?.muc ?? []).filter((m) => m.trangThai === 'can_captcha');
  const xong = (luot?.muc ?? []).filter((m) => m.trangThai === 'xong').length;
  const tong = luot?.muc.length ?? 0;

  const cotCongTy = [
    {
      title: 'Mã số thuế',
      dataIndex: 'mst',
      width: 130,
      render: (v: string) => <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Text>,
    },
    { title: 'Công ty', dataIndex: 'tenCongTy', render: (v: string) => v || <Text type="secondary">—</Text> },
    {
      title: 'Phiên cổng Thuế',
      key: 'phien',
      width: 150,
      render: (_: unknown, c: CongTyCongThue) =>
        daDangNhap(c.mst) ? <Tag color="green">Đang kết nối</Tag> : <Tag color="orange">Chưa đăng nhập</Tag>,
    },
    {
      title: 'Lịch tải riêng',
      key: 'lich',
      width: 210,
      render: (_: unknown, c: CongTyCongThue) =>
        c.tuDongTai ? (
          <Text>{`${c.gioChay} hằng ngày, kéo lại ${c.soNgayKeoLai} ngày`}</Text>
        ) : (
          <Text type="secondary">Tắt</Text>
        ),
    },
    {
      title: '',
      key: 'thaoTac',
      width: 200,
      align: 'right' as const,
      render: (_: unknown, c: CongTyCongThue) => (
        <Space size={4}>
          <Button size="small" icon={<LoginOutlined />} onClick={() => moDangNhap(c)}>
            {daDangNhap(c.mst) ? 'Đăng nhập lại' : 'Đăng nhập'}
          </Button>
          <Tooltip title="Tải gói ZIP chứa XML có chữ ký số cho khoảng ngày đang chọn">
            <Button
              size="small"
              icon={<FileZipOutlined />}
              loading={luotFile?.mst === c.mst && luotFile.trangThai === 'dang_chay'}
              disabled={!daDangNhap(c.mst) || luotFile?.trangThai === 'dang_chay'}
              onClick={() => taiFileGoc(c)}
            >
              File gốc
            </Button>
          </Tooltip>
          <Tooltip title="Lưu về máy các file gốc đã tải của khoảng ngày đang chọn">
            <Button
              size="small"
              icon={<DownloadOutlined />}
              loading={dangTaiVe === c.mst}
              onClick={() => taiVeMay(c)}
            >
              Tải về máy
            </Button>
          </Tooltip>
          <Tooltip title="Kết xuất Excel do chính cổng Thuế sinh ra (hóa đơn mua vào)">
            <Button
              size="small"
              icon={<FileExcelOutlined />}
              loading={dangXuatExcel === c.mst}
              disabled={!daDangNhap(c.mst)}
              onClick={() => xuatExcel(c, 'mua-vao')}
            >
              Excel
            </Button>
          </Tooltip>
          <Tooltip title="Dùng khi cổng Thuế chặn đăng nhập bằng máy: dán token từ phiên trình duyệt">
            <Button size="small" icon={<KeyOutlined />} onClick={() => setMoToken(c.mst)}>
              Token
            </Button>
          </Tooltip>
          <Tooltip title="Xem danh sách hóa đơn của khoảng ngày đang chọn">
            <Button
              size="small"
              icon={<UnorderedListOutlined />}
              loading={dangXemHoaDon && xemHoaDon?.mst === c.mst}
              onClick={() => moDanhSachHoaDon(c)}
            >
              Hóa đơn
            </Button>
          </Tooltip>
          <Tooltip title="Dựng bản thể hiện PDF từ file gốc đã tải, rồi tải cả gói về máy">
            <Button
              size="small"
              icon={<FilePdfOutlined />}
              loading={luotPdf?.mst === c.mst && luotPdf.trangThai === 'dang_chay'}
              onClick={() => taoPdf(c)}
            >
              PDF
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  /** Mở danh sách hóa đơn của một công ty trong khoảng ngày đang chọn. */
  async function moDanhSachHoaDon(c: CongTyCongThue) {
    setDangXemHoaDon(true);
    try {
      const ds = await hoaDonCongThueService.hoaDon(c.mst, {
        tuNgay: tuNgay(),
        denNgay: denNgay(),
        limit: 500,
      });
      setXemHoaDon({ mst: c.mst, ds: ds ?? [] });
    } catch (e: any) {
      message.error(e?.message || 'Không tải được danh sách hóa đơn');
    } finally {
      setDangXemHoaDon(false);
    }
  }

  async function taiExcel(loai: 'tong-hop' | 'chi-tiet') {
    if (!xemHoaDon) return;
    const dong = message.loading('Đang kết xuất Excel…', 0);
    try {
      await hoaDonCongThueService.taiExcel(xemHoaDon.mst, tuNgay(), denNgay(), loai);
    } catch (e: any) {
      message.error(e?.message || 'Không kết xuất được Excel');
    } finally {
      dong();
    }
  }

  /**
   * Mở bản thể hiện của một hóa đơn ở khung bên phải.
   *
   * Thu hồi objectURL cũ trước khi tạo cái mới — mỗi bản PDF vài trăm KB, không
   * thu hồi thì lướt vài chục hóa đơn là trình duyệt phình bộ nhớ.
   */
  async function moXem(h: HoaDonTho) {
    if (!xemHoaDon) return;
    setDangChon(h);
    setDangMoPdf(true);
    try {
      const url = await hoaDonCongThueService.xemPdf(xemHoaDon.mst, {
        mstNguoiBan: String(h.mstNguoiBan ?? ''),
        kyHieu: String(h.kyHieu ?? ''),
        soHoaDon: String(h.soHoaDon ?? ''),
      });
      setUrlPdf((cu) => {
        if (cu) URL.revokeObjectURL(cu);
        return url;
      });
    } catch (e: any) {
      message.error(e?.message || 'Không xem được hóa đơn này');
      setUrlPdf(null);
    } finally {
      setDangMoPdf(false);
    }
  }

  useEffect(() => () => {
    if (urlPdf) URL.revokeObjectURL(urlPdf);
  }, [urlPdf]);

  /** Tải riêng một hóa đơn. MST lấy từ lượt chạy đang mở, không phải từ dòng. */
  async function taiLe(
    m: { mstNguoiBan: string; kyHieu: string; soHoaDon: string },
    loai: 'zip' | 'pdf',
  ) {
    const mst = xemHoaDon?.mst || luotFile?.mst || luotPdf?.mst;
    if (!mst) return;
    const dong = message.loading(loai === 'pdf' ? 'Đang dựng PDF...' : 'Đang tải...', 0);
    try {
      await hoaDonCongThueService.taiMotHoaDon(mst, m, loai);
    } catch (e: any) {
      message.error(e?.message || 'Không tải được hóa đơn này');
    } finally {
      dong();
    }
  }

  const MAU_MUC: Record<TrangThaiMucFile, string> = {
    cho: 'default',
    xong: 'success',
    bo_qua: 'default',
    loi: 'error',
  };
  const NHAN_MUC: Record<TrangThaiMucFile, string> = {
    cho: 'Chờ',
    xong: 'Xong',
    bo_qua: 'Bỏ qua',
    loi: 'Lỗi',
  };

  /**
   * Cột dùng chung cho bảng chi tiết của cả tải file gốc lẫn dựng PDF.
   * Con số tổng không cho biết hóa đơn nào hỏng — bảng này mới cho biết.
   */
  const cotMuc = [
    {
      title: 'Số hóa đơn',
      dataIndex: 'soHoaDon',
      width: 120,
      render: (v: string) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{v || '—'}</Text>,
    },
    { title: 'Ký hiệu', dataIndex: 'kyHieu', width: 100 },
    { title: 'MST người bán', dataIndex: 'mstNguoiBan', width: 130 },
    {
      title: 'Ngày lập',
      dataIndex: 'ngayLap',
      width: 110,
      render: (v: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      width: 110,
      render: (v: TrangThaiMucFile) => <Tag color={MAU_MUC[v]}>{NHAN_MUC[v]}</Tag>,
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghiChu',
      render: (v: string | null) =>
        v ? <Text type="secondary">{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Tải lẻ',
      key: 'taiLe',
      width: 150,
      align: 'right' as const,
      render: (_: unknown, m: { mstNguoiBan: string; kyHieu: string; soHoaDon: string }) => (
        <Space size={4}>
          <Tooltip title="Tải file gốc (ZIP chứa XML có chữ ký số) của riêng hóa đơn này">
            <Button size="small" icon={<FileZipOutlined />} onClick={() => taiLe(m, 'zip')}>
              XML
            </Button>
          </Tooltip>
          <Tooltip title="Tải bản thể hiện PDF của riêng hóa đơn này, dựng ngay nếu chưa có">
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => taiLe(m, 'pdf')}>
              PDF
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const tien = (v: number) => (v ?? 0).toLocaleString('vi-VN');

  /**
   * Danh sách hóa đơn kèm tình trạng file của TỪNG hóa đơn.
   * Đây mới là chỗ trả lời "cái nào lỗi, cái nào không".
   */
  const NHAN_TRANG_THAI_HD: Record<string, string> = {
    '1': 'Mới',
    '2': 'Thay thế',
    '3': 'Bị thay thế',
    '4': 'Điều chỉnh',
    '5': 'Đã cấp mã',
    '6': 'Bị điều chỉnh',
    '7': 'Đã hủy',
    '8': 'Xóa bỏ',
  };

  /** Danh sách hóa đơn: mỗi dòng xem/tải được ngay, không phải đi vòng. */
  const cotHoaDon = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      render: (_: unknown, __: HoaDonTho, i: number) => i + 1,
    },
    { title: 'Ký hiệu', dataIndex: 'kyHieu', width: 95 },
    {
      title: 'Số HĐ',
      dataIndex: 'soHoaDon',
      width: 95,
      render: (v: string) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{v || '—'}</Text>
      ),
    },
    {
      title: 'Ngày lập',
      dataIndex: 'ngayLap',
      width: 105,
      render: (v: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '—'),
    },
    {
      title: 'Thông tin người bán',
      key: 'nguoiBan',
      render: (_: unknown, h: HoaDonTho) => (
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>MST: {h.mstNguoiBan}</Text>
          <div>{h.tenNguoiBan || '—'}</div>
        </div>
      ),
    },
    {
      title: 'Chưa thuế',
      dataIndex: 'giaTriChuaThue',
      width: 120,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{tien(v)}</Text>,
    },
    {
      title: 'Tiền thuế',
      dataIndex: 'tienThue',
      width: 110,
      align: 'right' as const,
      render: (v: number) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{tien(v)}</Text>,
    },
    {
      title: 'Thanh toán',
      dataIndex: 'tongThanhToan',
      width: 130,
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ fontVariantNumeric: 'tabular-nums' }}>{tien(v)}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'trangThai',
      width: 115,
      render: (_: unknown, h: HoaDonTho) => {
        const ma = String((h as any).trangThaiXuLy ?? h.trangThai ?? '');
        const nhan = NHAN_TRANG_THAI_HD[ma] ?? (ma || '—');
        const mau = ma === '7' || ma === '8' ? 'red' : ma === '5' ? 'green' : 'default';
        return <Tag color={mau}>{nhan}</Tag>;
      },
    },
    {
      title: '',
      key: 'thaoTac',
      width: 170,
      align: 'right' as const,
      render: (_: unknown, h: HoaDonTho) => {
        const khoa = {
          mstNguoiBan: String(h.mstNguoiBan ?? ''),
          kyHieu: String(h.kyHieu ?? ''),
          soHoaDon: String(h.soHoaDon ?? ''),
        };
        const chua = !h.coFileGoc;
        return (
          <Space size={0}>
            <Tooltip title={chua ? 'Chưa tải bản gốc về máy chủ' : 'Tải bản gốc XML có chữ ký số'}>
              <Button size="small" type="link" disabled={chua}
                onClick={(e) => { e.stopPropagation(); taiLe(khoa, 'zip'); }}>
                XML
              </Button>
            </Tooltip>
            <Tooltip title={chua ? 'Chưa tải bản gốc về máy chủ' : 'Xem ngay ở khung bên phải'}>
              <Button size="small" type="link" disabled={chua}
                onClick={(e) => { e.stopPropagation(); moXem(h); }}>
                Xem
              </Button>
            </Tooltip>
            <Tooltip title={chua ? 'Chưa tải bản gốc về máy chủ' : 'Tải bản thể hiện PDF'}>
              <Button size="small" type="link" disabled={chua}
                onClick={(e) => { e.stopPropagation(); taiLe(khoa, 'pdf'); }}>
                PDF
              </Button>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const cotPhieuChay = [
    {
      title: 'Mã số thuế',
      dataIndex: 'mst',
      width: 130,
      render: (v: string) => <Text style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</Text>,
    },
    { title: 'Công ty', dataIndex: 'tenCongTy' },
    {
      title: 'Trạng thái',
      dataIndex: 'trangThai',
      width: 140,
      render: (v: TrangThaiMuc) => <Tag color={MAU_TRANG_THAI[v]}>{NHAN_TRANG_THAI[v]}</Tag>,
    },
    {
      title: 'Hóa đơn',
      dataIndex: 'timThay',
      width: 100,
      align: 'right' as const,
      render: (v: number) => (v ? v.toLocaleString('vi-VN') : '—'),
    },
    {
      title: 'Thêm mới',
      dataIndex: 'themMoi',
      width: 100,
      align: 'right' as const,
      render: (v: number) => (v ? v.toLocaleString('vi-VN') : '—'),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'ghiChu',
      render: (v: string) => (v ? <Text type="secondary">{v}</Text> : ''),
    },
  ];

  return (
    <div className="space-y-3">
      {congChan?.dangBiChan && (
        <Alert
          type="warning"
          showIcon
          message="Cổng Thuế đang chặn truy cập"
          description={
            <>
              Lần bị chặn gần nhất cách đây {congChan.soPhutTruoc} phút. Đây là tường lửa phía cổng
              Thuế, <Text strong>không phải lỗi phần mềm và không phải sai mật khẩu</Text> — đã kiểm
              chứng bằng trình duyệt thật với captcha thật, từ hai địa chỉ mạng khác nhau. Hãy ngừng
              bấm Đăng nhập khoảng 15–30 phút. Các chức năng không cần cổng (xem danh sách, kết xuất
              Excel, xem và tải file đã tải) vẫn dùng bình thường.
            </>
          }
        />
      )}
      <Card
        title="Hóa đơn cổng Thuế"
        extra={nutLenh(gon, 'Cấu hình mã số thuế', {
          icon: <SettingOutlined />,
          onClick: () => navigate('/cau-hinh/hoa-don-cong-thue'),
        })}
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <RangePicker
            value={khoang}
            format="DD/MM/YYYY"
            allowClear={false}
            onChange={(v) => v && setKhoang(v as [Dayjs, Dayjs])}
          />
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            loading={luot?.trangThai === 'dang_chay'}
            onClick={taiHangLoat}
            disabled={congTy.length === 0}
          >
            {`Tải ${congTy.length} mã số thuế`}
          </Button>
          {canCaptcha.length > 0 && luot && (
            <Button
              icon={<PlayCircleOutlined />}
              onClick={async () => {
                await hoaDonCongThueService.chayTiep(luot.id);
                const moi = await hoaDonCongThueService.luotChay(luot.id);
                if (moi) setLuot(moi);
              }}
            >
              {`Chạy tiếp ${canCaptcha.length} mã đã xác thực`}
            </Button>
          )}
        </Space>

        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Captcha là nút thắt, không phải tốc độ mạng"
          description="Mã nào chưa đăng nhập sẽ được xếp vào hàng chờ thay vì làm dừng cả lượt chạy. Đăng nhập xong thì bấm chạy tiếp cho đúng phần còn thiếu."
        />

        <Table
          rowKey="mst"
          size="small"
          loading={dangTai}
          dataSource={congTy}
          columns={cotCongTy}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Chưa khai báo mã số thuế nào — vào Cấu hình để thêm' }}
        />
      </Card>

      {xemHoaDon && (
        <Card
          styles={{ body: { padding: 12 } }}
          title={
            <Space wrap>
              <Text>Hóa đơn</Text>
              {/* Mỗi màn hình chỉ xem MỘT tài khoản thuế: trộn nhiều mã số thuế
                  vào một bảng là mời gọi nhầm lẫn khi đối chiếu tờ khai. */}
              <Select
                size="small"
                style={{ minWidth: 260 }}
                value={xemHoaDon.mst}
                onChange={(mst) => {
                  const c = congTy.find((x) => x.mst === mst);
                  if (c) moDanhSachHoaDon(c);
                }}
                options={congTy.map((c) => ({
                  value: c.mst,
                  label: c.tenCongTy ? `${c.mst} — ${c.tenCongTy}` : c.mst,
                }))}
              />
              <Text type="secondary">
                {`${khoang[0].format('DD/MM/YYYY')} – ${khoang[1].format('DD/MM/YYYY')}`}
              </Text>
            </Space>
          }
          extra={
            <Space wrap>
              <Tooltip title="Gói toàn bộ bản thể hiện PDF của kỳ thành một file ZIP">
                <Button
                  size="small"
                  icon={<FilePdfOutlined />}
                  onClick={() => taiVePdf({ mst: xemHoaDon.mst } as CongTyCongThue)}
                >
                  Tải PDF gốc hàng loạt
                </Button>
              </Tooltip>
              <Tooltip title="Một dòng một mặt hàng, đọc từ file XML gốc đã tải">
                <Button
                  size="small"
                  icon={<FileExcelOutlined />}
                  onClick={() => taiExcel('chi-tiet')}
                >
                  Tải Excel chi tiết
                </Button>
              </Tooltip>
              <Tooltip title="Một dòng một hóa đơn, kèm dòng cộng cuối bảng">
                <Button
                  size="small"
                  icon={<FileExcelOutlined />}
                  onClick={() => taiExcel('tong-hop')}
                >
                  Tải Excel tổng hợp
                </Button>
              </Tooltip>
              <Tooltip title="Tải các file XML bản gốc có chữ ký số">
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => taiVeMay({ mst: xemHoaDon.mst } as CongTyCongThue)}
                >
                  Tải XML
                </Button>
              </Tooltip>
              <Button size="small" onClick={() => setXemHoaDon(null)}>
                Đóng
              </Button>
            </Space>
          }
        >
          {/* Thanh đếm: nhìn một cái là biết còn thiếu bao nhiêu. */}
          <Space size="large" wrap style={{ marginBottom: 10 }}>
            <Text type="secondary">
              Tổng: <Text strong>{xemHoaDon.ds.length}</Text>
            </Text>
            <Text type="secondary">
              Có bản gốc: <Text strong>{xemHoaDon.ds.filter((h) => h.coFileGoc).length}</Text>
            </Text>
            <Text type="secondary">
              Có PDF: <Text strong>{xemHoaDon.ds.filter((h) => h.coPdf).length}</Text>
            </Text>
            <Text type="secondary">
              Máy tính tiền:{' '}
              <Text strong>{xemHoaDon.ds.filter((h) => h.nhom === 'may-tinh-tien').length}</Text>
            </Text>
          </Space>

          {/* Trái: danh sách. Phải: bản thể hiện của hóa đơn đang chọn. */}
          <Row gutter={12}>
            <Col xs={24} lg={13}>
              <Table
                rowKey={(h) => `${h.mstNguoiBan}_${h.kyHieu}_${h.soHoaDon}`}
                size="small"
                dataSource={xemHoaDon.ds}
                columns={cotHoaDon}
                pagination={xemHoaDon.ds.length > 15 ? { pageSize: 15, size: 'small' } : false}
                scroll={{ x: 'max-content' }}
                rowClassName={(h) =>
                  dangChon &&
                  h.mstNguoiBan === dangChon.mstNguoiBan &&
                  h.kyHieu === dangChon.kyHieu &&
                  String(h.soHoaDon) === String(dangChon.soHoaDon)
                    ? 'ant-table-row-selected'
                    : ''
                }
                onRow={(h) => ({
                  onClick: () => h.coFileGoc && moXem(h),
                  style: { cursor: h.coFileGoc ? 'pointer' : 'default' },
                })}
                locale={{
                  emptyText:
                    'Chưa có hóa đơn nào trong khoảng này. Bấm "Tải hàng loạt" để lấy từ cổng Thuế.',
                }}
              />
            </Col>

            <Col xs={24} lg={11}>
              <div
                style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 8,
                  height: 620,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: '#fafafa',
                }}
              >
                {dangMoPdf ? (
                  <Text type="secondary">Đang dựng bản thể hiện…</Text>
                ) : urlPdf ? (
                  <iframe
                    title="Bản thể hiện hóa đơn"
                    src={urlPdf}
                    style={{ width: '100%', height: '100%', border: 0 }}
                  />
                ) : (
                  <Text type="secondary" style={{ padding: 16, textAlign: 'center' }}>
                    Chọn một hóa đơn đã có bản gốc ở bên trái để xem bản thể hiện tại đây.
                  </Text>
                )}
              </div>
            </Col>
          </Row>
        </Card>
      )}

      <Modal
        open={Boolean(moToken)}
        title={`Dùng token từ trình duyệt — ${moToken ?? ''}`}
        onCancel={() => setMoToken(null)}
        onOk={guiToken}
        okText="Dùng token này"
        cancelText="Hủy"
        confirmLoading={dangGui}
        width={620}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="Khi nào cần dùng cách này"
          description={
            <>
              Cổng Thuế chặn đăng nhập tự động (báo &quot;Hệ thống phát hiện hành vi không hợp
              lệ&quot;) nhưng vẫn nhận token hợp lệ cho các thao tác lấy dữ liệu. Bạn đăng nhập bằng
              tay trên cổng rồi đưa token sang đây là làm việc tiếp được.
            </>
          }
        />
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          <Text>
            <Text strong>1.</Text> Mở{' '}
            <a href="https://hoadondientu.gdt.gov.vn/" target="_blank" rel="noreferrer">
              hoadondientu.gdt.gov.vn
            </a>{' '}
            và đăng nhập như bình thường.
          </Text>
          <Text>
            <Text strong>2.</Text> Nhấn <Text code>F12</Text> → tab <Text strong>Application</Text> →{' '}
            <Text strong>Local Storage</Text> → chọn địa chỉ cổng Thuế → tìm dòng{' '}
            <Text code>token</Text> và chép giá trị.
          </Text>
          <Text>
            <Text strong>3.</Text> Dán vào ô dưới đây.
          </Text>
          <Input.TextArea
            rows={4}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />
          <Text type="secondary">
            Token sống khoảng một giờ và chỉ nằm trong bộ nhớ máy chủ, không ghi xuống cơ sở dữ liệu.
          </Text>
        </Space>
      </Modal>

      {luotPdf && (
        <Card
          title={`Dựng bản thể hiện PDF — ${luotPdf.mst}`}
          extra={
            <Button
              size="small"
              type="primary"
              icon={<DownloadOutlined />}
              disabled={luotPdf.trangThai === 'dang_chay'}
              onClick={() => taiVePdf({ mst: luotPdf.mst } as CongTyCongThue)}
            >
              Tải gói PDF về máy
            </Button>
          }
        >
          <Progress
            percent={luotPdf.tong ? Math.round((luotPdf.daXuLy / luotPdf.tong) * 100) : 100}
            size="small"
            status={luotPdf.trangThai === 'dang_chay' ? 'active' : undefined}
          />
          <Text type="secondary">
            {`Đã dựng ${luotPdf.daTao}/${luotPdf.tong} bản`}
            {luotPdf.boQua ? ` · ${luotPdf.boQua} bản đã có sẵn` : ''}
            {luotPdf.loi.length ? ` · ${luotPdf.loi.length} lỗi` : ''}
          </Text>

          <Table
            rowKey={(m) => `${m.mstNguoiBan}_${m.kyHieu}_${m.soHoaDon}`}
            size="small"
            style={{ marginTop: 12 }}
            dataSource={luotPdf.muc}
            columns={cotMuc}
            pagination={luotPdf.muc.length > 20 ? { pageSize: 20, size: 'small' } : false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Không có hóa đơn nào đã tải file gốc trong khoảng này' }}
          />
        </Card>
      )}

      {luotFile && (
        <Card
          title={`Tải file gốc — ${luotFile.mst}`}
          extra={
            <Text type="secondary">
              {luotFile.trangThai === 'dang_chay' ? 'Đang tải' : 'Đã xong'} · {luotFile.tong} hóa đơn
              trong kỳ, {luotFile.boQua} đã có sẵn
            </Text>
          }
        >
          <Progress
            percent={luotFile.loNay ? Math.round((luotFile.daXuLy / luotFile.loNay) * 100) : 100}
            size="small"
            status={luotFile.trangThai === 'dang_chay' ? 'active' : undefined}
          />
          <Text type="secondary">
            {`Đã tải ${luotFile.daTai}/${luotFile.loNay} file · ${(luotFile.bytes / 1024 / 1024).toFixed(1)} MB`}
            {luotFile.conLai ? ` · còn ${luotFile.conLai} hóa đơn cho lượt sau` : ''}
            {luotFile.loi.length ? ` · ${luotFile.loi.length} lỗi` : ''}
          </Text>

          <Table
            rowKey={(m) => `${m.mstNguoiBan}_${m.kyHieu}_${m.soHoaDon}`}
            size="small"
            style={{ marginTop: 12 }}
            dataSource={luotFile.muc}
            columns={cotMuc}
            pagination={luotFile.muc.length > 20 ? { pageSize: 20, size: 'small' } : false}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'Không có hóa đơn nào cần tải trong khoảng này' }}
          />
        </Card>
      )}

      {luot && (
        <Card
          title="Phiếu chạy"
          extra={
            <Text type="secondary">
              {luot.trangThai === 'dang_chay' ? 'Đang chạy' : 'Đã xong'} · {luot.tuNgay} → {luot.denNgay}
            </Text>
          }
        >
          {tong > 0 && (
            <Progress
              percent={Math.round((xong / tong) * 100)}
              size="small"
              status={luot.trangThai === 'dang_chay' ? 'active' : undefined}
              style={{ marginBottom: 12 }}
            />
          )}
          <Table
            rowKey="mst"
            size="small"
            dataSource={luot.muc}
            columns={cotPhieuChay}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      )}

      <Card size="small">
        <Text type="secondary">
          <Text strong>File gốc là XML, không phải PDF.</Text> Nút “File gốc” tải gói ZIP chứa XML có
          chữ ký số — bản có giá trị pháp lý theo Nghị định 123/2020. Cổng Thuế không có endpoint PDF:
          bản PDF bạn thấy trên giao diện cổng là do trình duyệt tự dựng rồi in ra.
        </Text>
      </Card>

      <Modal
        open={Boolean(captcha)}
        title={`Nhập mã captcha — ${captcha?.mst ?? ''}`}
        onCancel={() => setCaptcha(null)}
        onOk={guiCaptcha}
        okText="Đăng nhập"
        cancelText="Hủy"
        confirmLoading={dangGui}
        okButtonProps={{ disabled: !maCaptcha.trim() }}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            Cổng Thuế yêu cầu mã này cho mỗi phiên đăng nhập. Token sống khoảng một giờ nên mỗi mã số
            thuế chỉ phải gõ một lần mỗi phiên làm việc.
          </Text>

          {/* SVG do máy chủ NGOÀI sinh ra: nhúng qua <img> chứ không đưa thẳng
              vào DOM, vì nội dung SVG có thể chứa script. */}
          {captcha && (
            <img
              alt="Mã captcha từ cổng Thuế"
              style={{
                width: '100%',
                height: 88,
                objectFit: 'contain',
                background: '#fff',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
              }}
              src={`data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(captcha.svg)))}`}
            />
          )}

          <Input
            autoFocus
            value={maCaptcha}
            placeholder="Gõ mã trong ảnh"
            onChange={(e) => setMaCaptcha(e.target.value)}
            onPressEnter={guiCaptcha}
          />
        </Space>
      </Modal>
    </div>
  );
};

export default HoaDonCongThuePage;
