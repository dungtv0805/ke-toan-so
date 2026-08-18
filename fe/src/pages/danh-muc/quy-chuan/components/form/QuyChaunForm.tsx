import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Input, Select, Row, Col, message } from 'antd';
import { z } from 'zod';
import { quyChauanService } from '@/services/quyChaunService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { khoanMucService } from '@/services/khoanMucService';
import { dongTienService } from '@/services/dongTienService';
import { nhomKhoanMucService, type NhomKhoanMuc } from '@/services/nhomKhoanMucService';
import { useQuyChaunHandler, useQuyChaunState } from '../../QuyChaunHandlerContext';
import { LoaiGiaoDich, HoSoChungTuRef, TaiKhoan, KhoanMuc, DongTien } from '@/types';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import {
  rangBuocQuyChuan,
  truongThieu,
  NHAN_TRUONG_QUY_CHUAN,
  type GiaTriPhanBo,
} from '../../rangBuoc';
import './QuyChaunForm.state';

const quyChaunSchema = z.object({
  loaiGiaoDich: z.string().min(1, 'Vui lòng chọn loại giao dịch'),
  nghiepVu: z.string().min(1, 'Vui lòng nhập nghiệp vụ').max(100, 'Nghiệp vụ không quá 100 ký tự'),
  taiKhoanNo: z.string().min(1, 'Vui lòng chọn tài khoản Nợ'),
  taiKhoanCo: z.string().min(1, 'Vui lòng chọn tài khoản Có'),
  moTa: z.string().max(255, 'Mô tả không quá 255 ký tự').optional().nullable(),
  // Bốn trường phân bổ: bắt buộc hay không là do fieldRules của TK Nợ/TK Có,
  // nên schema để tùy chọn và luật thật nằm ở `rangBuocQuyChuan`.
  nhomKhoanMuc: z.string().optional().nullable(),
  khoanMuc: z.string().optional().nullable(),
  dongTien: z.string().optional().nullable(),
  loaiChiPhi: z.enum(['CO_DINH', 'BIEN_DOI']).optional().nullable(),
});

const LOAI_CHI_PHI_OPTIONS = [
  { value: 'CO_DINH', label: 'Chi phí cố định' },
  { value: 'BIEN_DOI', label: 'Chi phí biến đổi' },
];

// Khoản mục không có route '/all' như các danh mục khác và getAll() chỉ trả 100 dòng —
// xin hẳn một trang lớn, cùng cách `completeSetSources.ts` đang làm cho màn Import.
const KHOAN_MUC_LIMIT = 10000;

export const QuyChaunForm: React.FC = () => {
  const handler = useQuyChaunHandler();
  const fl = useFieldLabels('danhMuc.quyChuan');
  const [modalVisible] = useQuyChaunState('modalVisible', false);
  const [editingRecord] = useQuyChaunState('editingRecord', null);
  const [formLoading] = useQuyChaunState('formLoading', false);
  const [loaiGiaoDichList] = useQuyChaunState('loaiGiaoDichList', [] as LoaiGiaoDich[]);
  const [hoSoChungTuList] = useQuyChaunState('hoSoChungTuList', [] as HoSoChungTuRef[]);
  const [form] = Form.useForm();
  const [taiKhoanList, setTaiKhoanList] = useState<TaiKhoan[]>([]);
  const [khoanMucList, setKhoanMucList] = useState<KhoanMuc[]>([]);
  const [nhomKhoanMucList, setNhomKhoanMucList] = useState<NhomKhoanMuc[]>([]);
  const [dongTienList, setDongTienList] = useState<DongTien[]>([]);

  // Load danh mục khi mở modal
  useEffect(() => {
    if (!modalVisible) return;
    taiKhoanService.getLeafAccounts().then(setTaiKhoanList).catch(() => setTaiKhoanList([]));
    khoanMucService
      .getPaginated({ limit: KHOAN_MUC_LIMIT })
      .then((r) => setKhoanMucList(r.data))
      .catch(() => setKhoanMucList([]));
    nhomKhoanMucService.getAll().then(setNhomKhoanMucList).catch(() => setNhomKhoanMucList([]));
    dongTienService.getAll().then(setDongTienList).catch(() => setDongTienList([]));
  }, [modalVisible]);

  useEffect(() => {
    if (modalVisible && editingRecord) {
      form.setFieldsValue({
        ...editingRecord,
        hoSoChungTu: editingRecord.hoSoChungTu?.map((h) => h.ma),
      });
    } else if (modalVisible) {
      form.resetFields();
    }
  }, [modalVisible, editingRecord, form]);

  const taiKhoanOptions = useMemo(
    () => taiKhoanList.map((tk) => ({ value: tk.ma, label: `${tk.ma} - ${tk.ten}` })),
    [taiKhoanList],
  );

  // Ràng buộc tính lại ngay khi đổi tài khoản, không đợi bấm Lưu.
  const taiKhoanNo = Form.useWatch('taiKhoanNo', form) as string | undefined;
  const taiKhoanCo = Form.useWatch('taiKhoanCo', form) as string | undefined;
  const nhomDangChon = Form.useWatch('nhomKhoanMuc', form) as string | undefined;

  const rangBuoc = useMemo(() => {
    const byMa = new Map(taiKhoanList.map((tk) => [tk.ma, tk]));
    return rangBuocQuyChuan(
      taiKhoanNo ? byMa.get(taiKhoanNo) : undefined,
      taiKhoanCo ? byMa.get(taiKhoanCo) : undefined,
    );
  }, [taiKhoanList, taiKhoanNo, taiKhoanCo]);

  const batBuoc = (truong: keyof typeof NHAN_TRUONG_QUY_CHUAN) =>
    rangBuoc[truong] === 'BAT_BUOC';

  const nhomKhoanMucOptions = useMemo(
    () => nhomKhoanMucList.map((n) => ({ value: n.ma, label: `${n.ma} - ${n.ten}` })),
    [nhomKhoanMucList],
  );

  // Chọn nhóm thì danh sách khoản mục chỉ còn khoản mục thuộc nhóm đó.
  // Dữ liệu cũ có bản ghi lưu `nhom` bằng id thay vì mã (xem KhoanMucPage.getNhomLabel),
  // nên dò khớp cả hai, nếu không những khoản mục đó sẽ biến mất khỏi danh sách.
  const khoanMucOptions = useMemo(() => {
    const nhom = nhomKhoanMucList.find((n) => n.ma === nhomDangChon);
    const danhSach = nhomDangChon
      ? khoanMucList.filter((km) => km.nhom === nhomDangChon || (nhom && km.nhom === nhom.id))
      : khoanMucList;
    return danhSach.map((km) => ({ value: km.ma, label: `${km.ma} - ${km.ten}` }));
  }, [khoanMucList, nhomKhoanMucList, nhomDangChon]);

  const dongTienOptions = useMemo(
    () => dongTienList.map((dt) => ({ value: dt.ma, label: `${dt.ma} - ${dt.ten}` })),
    [dongTienList],
  );

  const handleCancel = () => {
    handler.executeEvent('closeModal', {});
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      const result = quyChaunSchema.safeParse(values);
      if (!result.success) {
        message.error(result.error.errors[0].message);
        return;
      }

      const giaTri = values as GiaTriPhanBo;
      const thieuBatBuoc = truongThieu(rangBuoc, giaTri, 'BAT_BUOC');
      if (thieuBatBuoc.length) {
        message.error(
          `Tài khoản đã chọn yêu cầu bắt buộc nhập: ${thieuBatBuoc
            .map((t) => NHAN_TRUONG_QUY_CHUAN[t])
            .join(', ')}`,
        );
        return;
      }

      const thieuCanhBao = truongThieu(rangBuoc, giaTri, 'CANH_BAO');
      if (thieuCanhBao.length) {
        const proceed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: 'Cảnh báo thiếu thông tin',
            content: `TK ${values.taiKhoanNo} / ${values.taiKhoanCo} khuyến nghị nhập: ${thieuCanhBao
              .map((t) => NHAN_TRUONG_QUY_CHUAN[t])
              .join(', ')}`,
            okText: 'Vẫn lưu',
            cancelText: 'Quay lại',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          });
        });
        if (!proceed) return;
      }

      const isDuplicate = await quyChauanService.duplicateCheck(
        values.loaiGiaoDich,
        values.nghiepVu,
        editingRecord?.id
      );
      if (isDuplicate) {
        message.error('Nghiệp vụ này đã tồn tại cho loại giao dịch đã chọn');
        return;
      }

      const hoSoRefs = (values.hoSoChungTu || []).map((ma: string) => {
        const h = hoSoChungTuList.find((x) => x.ma === ma);
        return { id: h?.id ?? '', ma, ten: h?.ten ?? ma };
      });
      const payload = { ...values, hoSoChungTu: hoSoRefs };

      if (editingRecord) {
        await handler.executeEvent('update', { id: editingRecord.id, data: payload });
      } else {
        await handler.executeEvent('create', payload);
      }
    } catch (error) {
      // Form validation error handled by antd
    }
  };

  // Build options from loaiGiaoDichList
  const loaiGiaoDichOptions = loaiGiaoDichList.map((item: LoaiGiaoDich) => ({
    value: item.ma,
    label: item.ten,
  }));

  return (
    <Modal
      title={editingRecord ? 'Sửa quy chuẩn hạch toán' : 'Thêm quy chuẩn hạch toán'}
      open={modalVisible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      okText={editingRecord ? 'Cập nhật' : 'Thêm mới'}
      cancelText="Hủy"
      confirmLoading={formLoading}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="loaiGiaoDich" label={fl('loaiGiaoDich', 'Loại giao dịch')} rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Chọn loại giao dịch"
            options={loaiGiaoDichOptions}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
          />
        </Form.Item>
        <Form.Item name="nghiepVu" label={fl('nghiepVu', 'Nghiệp vụ')} rules={[{ required: true, max: 100 }]}>
          <Input placeholder="Ví dụ: Thu tiền bán hàng" />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="taiKhoanNo" label={fl('taiKhoanNo', 'Tài khoản Nợ')} rules={[{ required: true }]}>
              <Select showSearch placeholder="Chọn TK Nợ" options={taiKhoanOptions} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="taiKhoanCo" label={fl('taiKhoanCo', 'Tài khoản Có')} rules={[{ required: true }]}>
              <Select showSearch placeholder="Chọn TK Có" options={taiKhoanOptions} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="nhomKhoanMuc"
              label={fl('nhomKhoanMuc', NHAN_TRUONG_QUY_CHUAN.nhomKhoanMuc)}
              rules={[{ required: batBuoc('nhomKhoanMuc'), message: 'Tài khoản đã chọn bắt buộc nhập nhóm khoản mục' }]}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn nhóm khoản mục"
                options={nhomKhoanMucOptions}
                optionFilterProp="label"
                // Đổi nhóm thì khoản mục đang chọn có thể lệch nhóm — xoá đi để
                // không lưu ra cặp nhóm/khoản mục không khớp nhau.
                onChange={() => form.setFieldValue('khoanMuc', undefined)}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="khoanMuc"
              label={fl('khoanMuc', NHAN_TRUONG_QUY_CHUAN.khoanMuc)}
              rules={[{ required: batBuoc('khoanMuc'), message: 'Tài khoản đã chọn bắt buộc nhập khoản mục' }]}
            >
              <Select
                showSearch
                allowClear
                placeholder={nhomDangChon ? 'Chọn khoản mục trong nhóm' : 'Chọn khoản mục'}
                options={khoanMucOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="dongTien"
              label={fl('dongTien', NHAN_TRUONG_QUY_CHUAN.dongTien)}
              rules={[{ required: batBuoc('dongTien'), message: 'Tài khoản đã chọn bắt buộc nhập dòng tiền' }]}
            >
              <Select
                showSearch
                allowClear
                placeholder="Chọn dòng tiền"
                options={dongTienOptions}
                optionFilterProp="label"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="loaiChiPhi"
              label={fl('loaiChiPhi', NHAN_TRUONG_QUY_CHUAN.loaiChiPhi)}
              rules={[{ required: batBuoc('loaiChiPhi'), message: 'Tài khoản đã chọn bắt buộc nhập loại chi phí' }]}
            >
              <Select allowClear placeholder="Chọn loại chi phí" options={LOAI_CHI_PHI_OPTIONS} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="moTa" label={fl('moTa', 'Mô tả')} rules={[{ max: 255 }]}>
          <Input.TextArea rows={3} placeholder="Mô tả chi tiết về quy chuẩn hạch toán này" />
        </Form.Item>
        <Form.Item name="hoSoChungTu" label="Biên tập hồ sơ">
          <Select
            mode="multiple"
            showSearch
            placeholder="Chọn hồ sơ chứng từ..."
            options={hoSoChungTuList.map((h) => ({ value: h.ma, label: h.ten }))}
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};
