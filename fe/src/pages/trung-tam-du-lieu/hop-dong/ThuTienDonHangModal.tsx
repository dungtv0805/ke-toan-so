import { useEffect, useState } from 'react';
import {
  Button,
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
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import type { TaiKhoan, TaiKhoanNganHang, TheoDoiHopDongRow } from '@/types';
import { taiKhoanService } from '@/services/taiKhoanService';
import { nganHangService } from '@/services/nganHangService';
import { phieuThuService } from '@/services/phieuService';
import { thuTienHopDongService } from '@/services/thuTienHopDongService';
import { buildNganHangSnapshot } from '@/utils/snapshotBuilder';
import { TK_CHUA_THUC_HIEN } from './ghiNhanDoanhThu';
import { defaultTaiKhoan, loadDonHangSnapshots, taiKhoanSnapshot } from './donHangChungTu';

const { Text } = Typography;

/** TK tiền gửi ngân hàng — mặc định cho khoản thu của đơn hàng. */
const TK_TIEN_GUI = '112';

interface FormValues {
  ngay: Dayjs;
  soTien: number;
  taiKhoanNo: string;
  taiKhoanCo: string;
  nganHangId?: string;
  noiDung: string;
}

interface Props {
  hopDong: TheoDoiHopDongRow;
  /** Số khoản thu đã có — dùng đánh số "lần thu". */
  soLanDaThu: number;
  onCreated: () => void;
  /** Nút mở modal; mặc định là nút "+ Thu tiền". */
  renderTrigger?: (open: () => void) => React.ReactNode;
}

/**
 * Nút "+ Thu tiền" của đơn hàng: một thao tác ghi hai nơi —
 * 1) Phiếu thu Nợ 112 / Có 3387 (doanh thu chưa thực hiện) gắn sẵn đơn hàng
 * 2) Dòng trong Sổ thu tiền hợp đồng
 *
 * Phiếu thu tạo ra là phiếu thu thật, xem/in/sửa ở Chứng từ → Phiếu thu. Dùng nút
 * này thì KHÔNG nhập lại phiếu thu ở Chứng từ, tránh ghi trùng.
 */
export default function ThuTienDonHangModal({
  hopDong,
  soLanDaThu,
  onCreated,
  renderTrigger,
}: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [taiKhoanList, setTaiKhoanList] = useState<TaiKhoan[]>([]);
  const [nganHangList, setNganHangList] = useState<TaiKhoanNganHang[]>([]);
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    taiKhoanService.getLeafAccounts().then(setTaiKhoanList).catch(() => setTaiKhoanList([]));
    nganHangService.getAll().then(setNganHangList).catch(() => setNganHangList([]));
  }, []);

  const openModal = () => {
    form.setFieldsValue({
      ngay: dayjs(),
      soTien: undefined,
      taiKhoanNo: defaultTaiKhoan(taiKhoanList, TK_TIEN_GUI),
      taiKhoanCo: defaultTaiKhoan(taiKhoanList, TK_CHUA_THUC_HIEN),
      nganHangId: undefined,
      noiDung: `Thu tiền đơn hàng ${hopDong.soHopDong}`,
    } as FormValues);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    let phieuId = '';
    let soPhieu = '';
    try {
      const snap = await loadDonHangSnapshots(hopDong.hopDongId, hopDong.doiTuongId);
      const nganHang = nganHangList.find((n) => n.id === v.nganHangId);

      const phieu = await phieuThuService.create({
        ngay: v.ngay.format('YYYY-MM-DD'),
        soTien: v.soTien,
        noiDung: v.noiDung,
        danhMuc: {
          taiKhoanNo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanNo),
          taiKhoanCo: taiKhoanSnapshot(taiKhoanList, v.taiKhoanCo),
          hopDong: snap.hopDong,
          // Bên Nợ là TK tiền → đối tượng là quỹ/ngân hàng nhận tiền;
          // bên Có là công nợ đơn hàng → đối tượng là khách hàng.
          ...(nganHang ? { doiTuong: buildNganHangSnapshot(nganHang) } : {}),
          ...(snap.khachHang ? { doiTuong2: snap.khachHang } : {}),
        },
      });
      phieuId = phieu.id;
      soPhieu = phieu.soPhieu;

      await thuTienHopDongService.create({
        nam: v.ngay.year(),
        hopDongId: hopDong.hopDongId,
        soHopDong: hopDong.soHopDong,
        doiTuongId: hopDong.doiTuongId,
        tenKhachHang: snap.khachHang?.ten,
        noiDung: v.noiDung,
        soTien: v.soTien,
        ngay: v.ngay.format('YYYY-MM-DD'),
        lan: soLanDaThu + 1,
        ghiChu: `Chứng từ ${soPhieu}`,
      });

      message.success(`Đã thu tiền — phiếu ${soPhieu}`);
      setOpen(false);
      onCreated();
    } catch (e) {
      const err = e as { errorFields?: unknown; message?: string };
      if (err.errorFields) return;

      // Ghi được phiếu thu nhưng hỏng ở Sổ thu tiền → xóa phiếu để không lệch sổ.
      if (phieuId) {
        try {
          await phieuThuService.remove(phieuId);
          message.error('Không ghi được Sổ thu tiền, đã hủy phiếu thu vừa tạo. Vui lòng thử lại.');
        } catch {
          message.error(
            `Đã tạo phiếu thu ${soPhieu} nhưng không ghi được Sổ thu tiền. Kiểm tra lại ở Chứng từ → Phiếu thu.`,
          );
        }
        return;
      }
      message.error(err.message || 'Thu tiền thất bại');
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
      {renderTrigger ? (
        renderTrigger(openModal)
      ) : (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={openModal}>
          Thu tiền
        </Button>
      )}

      <Modal
        title={`Thu tiền — ${hopDong.soHopDong}`}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        confirmLoading={saving}
        okText="Thu tiền"
        cancelText="Hủy"
        destroyOnClose
      >
        <Form form={form} layout="vertical" size="small" className="mt-3">
          <Row gutter={12}>
            <Col span={10}>
              <Form.Item
                name="ngay"
                label="Ngày thu"
                rules={[{ required: true, message: 'Chọn ngày thu' }]}
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
                label="TK Nợ (tiền)"
                rules={[{ required: true, message: 'Chọn TK Nợ' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="taiKhoanCo"
                label="TK Có (doanh thu chưa thực hiện)"
                rules={[{ required: true, message: 'Chọn TK Có' }]}
              >
                <Select showSearch optionFilterProp="label" options={taiKhoanOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="nganHangId" label="Quỹ / Ngân hàng nhận tiền">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="— Không chọn —"
              options={nganHangList.map((n) => ({
                value: n.id,
                label: `${n.ma} - ${n.ten}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="noiDung"
            label="Nội dung"
            rules={[{ required: true, message: 'Nhập nội dung' }]}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 3 }} />
          </Form.Item>
          <Text type="secondary" className="text-xs">
            Tạo một phiếu thu gắn sẵn đơn hàng và một dòng trong Sổ thu tiền. Dùng nút
            này thì không nhập lại phiếu thu ở Chứng từ để tránh ghi trùng.
          </Text>
        </Form>
      </Modal>
    </>
  );
}
