import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Input,
  DatePicker,
  Space,
  Tag,
  Tooltip,
  Typography,
  Alert,
  Progress,
  message,
} from 'antd';
import {
  CloudDownloadOutlined,
  LoginOutlined,
  SettingOutlined,
  FileZipOutlined,
  PlayCircleOutlined,
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

  const [khoang, setKhoang] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [luot, setLuot] = useState<LuotChay | null>(null);
  const hoiRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [captcha, setCaptcha] = useState<{ mst: string; sessionId: string; svg: string } | null>(null);
  const [maCaptcha, setMaCaptcha] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [luotFile, setLuotFile] = useState<LuotTaiFile | null>(null);
  const hoiFileRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nap = useCallback(async () => {
    try {
      const [ds, ph] = await Promise.all([
        hoaDonCongThueService.danhSachCongTy(),
        hoaDonCongThueService.trangThaiPhien(),
      ]);
      setCongTy(ds ?? []);
      setPhien(ph ?? []);
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
        </Space>
      ),
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
