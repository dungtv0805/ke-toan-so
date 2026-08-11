import { useEffect, useState } from 'react';
import {
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { SanPham, TaiKhoan, TheoDoiHopDongRow } from '@/types';
import { nhatKyChungService } from '@/services/nhatKyChungService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { sanPhamService } from '@/services/sanPhamService';
import { buildSanPhamSnapshot } from '@/utils/snapshotBuilder';
import { defaultTaiKhoan, loadDonHangSnapshots, taiKhoanSnapshot } from './donHangChungTu';

const { Text } = Typography;

interface FormValues {
  ngay: Dayjs;
  soTien: number;
  taiKhoanNo: string;
  taiKhoanCo: string;
  noiDung: string;
}

interface Props {
  hopDong: TheoDoiHopDongRow;
  /** Mã chuẩn của TK Nợ; khớp chính xác trước, không có thì lấy TK con đầu tiên. */
  tkNoPrefix: string;
  tkCoPrefix: string;
  tieuDe: string;
  soTienMacDinh?: number;
  dienGiaiMacDinh: string;
  /** Nút mở modal do nơi gọi vẽ — bảng dùng chip, Drawer dùng nút. */
  renderTrigger: (open: () => void) => React.ReactNode;
  onCreated: () => void;
}

/**
 * Modal sinh một bút toán Nhật ký chung gắn sẵn đơn hàng, khách hàng và sản phẩm.
 * Dùng chung cho "Ghi nhận doanh thu" (Nợ 131 / Có 3387) và "Kết chuyển doanh thu"
 * (Nợ 3387 / Có 511) — hai việc chỉ khác cặp tài khoản và chữ hiển thị.
 */
export default function ButToanDonHangModal({
  hopDong,
  tkNoPrefix,
  tkCoPrefix,
  tieuDe,
  soTienMacDinh,
  dienGiaiMacDinh,
  renderTrigger,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taiKhoanList, setTaiKhoanList] = useState<TaiKhoan[]>([]);
  const [sanPhamList, setSanPhamList] = useState<SanPham[]>([]);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    taiKhoanService.getLeafAccounts().then(setTaiKhoanList).catch(() => setTaiKhoanList([]));
    sanPhamService.getAll().then(setSanPhamList).catch(() => setSanPhamList([]));
  }, []);

  const openModal = () => {
    form.setFieldsValue({
      ngay: dayjs(),
      soTien: soTienMacDinh && soTienMacDinh > 0 ? Math.round(soTienMacDinh) : undefined,
      taiKhoanNo: defaultTaiKhoan(taiKhoanList, tkNoPrefix),
      taiKhoanCo: defaultTaiKhoan(taiKhoanList, tkCoPrefix),
      noiDung: dienGiaiMacDinh,
    } as FormValues);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      const snap = await loadDonHangSnapshots(hopDong.hopDongId, hopDong.doiTuongId);
      const sp = sanPhamList.find((s) => s.id === hopDong.sanPhamId);

      await nhatKyChungService.create({
        loai: 'KHAC',
        ngay: v.ngay.format('YYYY-MM-DD'),
        ngayGhiSo: v.ngay.format('YYYY-MM-DD'),
        soTien: v.soTien,
        noiDung: v.noiDung,
        danhMuc: {
          taiKhoanNo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanNo),
          taiKhoanCo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanCo),
          hopDong: snap.hopDong,
          ...(sp ? { sanPham: buildSanPhamSnapshot(sp) } : {}),
          // Cả hai bên đều là công nợ/doanh thu của khách hàng này
          ...(snap.khachHang
            ? { doiTuong: snap.khachHang, doiTuong2: snap.khachHang }
            : {}),
        },
      });
      message.success(`${tieuDe} thành công`);
      setOpen(false);
      onCreated();
    } catch (e) {
      const err = e as { errorFields?: unknown; message?: string };
      if (!err.errorFields) message.error(err.message || `${tieuDe} thất bại`);
    } finally {
      setSaving(false);
    }
  };

  const taiKhoanOptions = taiKhoanList.map((tk) => ({
    value: tk.ma,
    label: `${tk.ma} - ${tk.ten}`,
  }));

  return (
    <>
      {renderTrigger(openModal)}

      <Modal
        title={`${tieuDe} — ${hopDong.soHopDong}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Lưu bút toán"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-3">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item
                name="ngay"
                label="Ngày"
                rules={[{ required: true, message: 'Chọn ngày' }]}
                tooltip="Doanh thu lên báo cáo theo tháng của ngày này"
              >
                <DatePicker format="DD/MM/YYYY" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={14}>
              <Form.Item
                name="soTien"
                label="Số tiền"
                rules={[{ required: true, message: 'Nhập số tiền' }]}
              >
                <InputNumber<number>
                  className="w-full"
                  min={1}
                  controls={false}
                  formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(v) => Number(`${v}`.replace(/,/g, ''))}
                  addonAfter="VNĐ"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="taiKhoanNo"
                label="TK Nợ"
                rules={[{ required: true, message: 'Chọn TK Nợ' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taiKhoanCo"
                label="TK Có"
                rules={[{ required: true, message: 'Chọn TK Có' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="noiDung"
            label="Diễn giải"
            rules={[{ required: true, message: 'Nhập diễn giải' }]}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
          </Form.Item>
          <Text type="secondary" className="text-xs">
            Hệ thống tạo một chứng từ Nhật ký chung gắn sẵn đơn hàng, khách hàng và sản
            phẩm. Sửa hoặc xóa tại Chứng từ → Nhật ký chung.
          </Text>
        </Form>
      </Modal>
    </>
  );
}
