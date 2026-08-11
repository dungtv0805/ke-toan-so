import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Space,
  Popconfirm,
  message,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { FilterBar } from '@/components/common/FilterBar';
import type { HoaDonBanRa, TheoDoiHopDongRow } from '@/types';
import { hoaDonBanRaService } from '@/services/hoaDonBanRaService';
import { THUE_SUAT_OPTIONS, tinhTienThue } from '@/services/taxService';
import { theoDoiHopDongService } from '@/services/theoDoiHopDongService';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useBulkDelete } from '@/components/table/useBulkDelete';
import { useTableTitleConfig } from '@/components/glossary/useTableTitleConfig';
import { useFieldLabels } from '@/components/glossary/useFieldLabels';
import { useTableColumnFilters } from '@/components/table/useTableColumnFilters';

const { Text } = Typography;

/** Ô dùng để so khớp bộ lọc cột — key trùng `key` của cột antd. */
const cellValue = (r: HoaDonBanRa, key: string): string | undefined => {
  switch (key) {
    case 'soHoaDon':
      return r.soHoaDon;
    case 'soHopDong':
      return r.soHopDong;
    case 'tenCongTrinh':
      return r.tenCongTrinh;
    case 'donViMua':
      return r.donViMua;
    default:
      return undefined;
  }
};
const fmtCur = (v?: number) => (!v ? '-' : new Intl.NumberFormat('vi-VN').format(v));
const moneyProps = {
  className: 'w-full',
  formatter: (value?: string | number) => `${value ?? ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
  parser: (value?: string) => (value?.replace(/[^\d.-]/g, '') ?? '') as unknown as number,
};

interface FormVals {
  hopDongId: string;
  soHoaDon?: string;
  ngay?: Dayjs;
  noiDung?: string;
  donViMua?: string;
  tienHang?: number;
  thueSuat?: string;
  tienThue?: number;
  lan?: number;
  nam?: number;
  namHoaDon?: number;
}

export default function SoHoaDonBanRaPage() {
  const { canCreate, canEdit, canDelete } = usePagePermission('/trung-tam-du-lieu/hd-ban-ra');
  const [rows, setRows] = useState<HoaDonBanRa[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [hdList, setHdList] = useState<TheoDoiHopDongRow[]>([]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form] = Form.useForm<FormVals>();
  const tienHang = Form.useWatch('tienHang', form);
  const tienThue = Form.useWatch('tienThue', form);
  const tong = (Number(tienHang) || 0) + (Number(tienThue) || 0);

  // HoaDonBanRa khai báo `id?: string` nên dùng thẳng `{ id: string }` cho tham số kiểu của hook.
  const { rowSelection, bulkDeleteButton, clearSelection } = useBulkDelete<{ id: string }>({
    enabled: canDelete,
    itemLabel: 'hóa đơn',
    onDeleteBatch: (ids) => hoaDonBanRaService.deleteBatch(ids),
    onDone: () => load(),
  });

  const load = async () => {
    // Lựa chọn chỉ có hiệu lực trên tập dòng đang xem: tìm kiếm / tải lại đều bỏ chọn.
    clearSelection();
    setLoading(true);
    try {
      setRows(await hoaDonBanRaService.getList({ search: search || undefined }));
    } catch {
      message.error('Không tải được sổ hóa đơn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    theoDoiHopDongService.getList().then(setHdList).catch(() => {});
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModal = (r?: HoaDonBanRa) => {
    if (r) {
      setEditingId(r.id || null);
      form.setFieldsValue({
        hopDongId: r.hopDongId,
        soHoaDon: r.soHoaDon,
        ngay: r.ngay ? dayjs(r.ngay) : undefined,
        noiDung: r.noiDung,
        donViMua: r.donViMua,
        tienHang: r.tienHang,
        thueSuat: r.thueSuat,
        tienThue: r.tienThue,
        lan: r.lan,
        nam: r.nam,
        namHoaDon: r.namHoaDon,
      });
    } else {
      setEditingId(null);
      form.resetFields();
    }
    setOpen(true);
  };

  /**
   * Đổi tiền hàng hoặc thuế suất → tính lại tiền thuế (ghi đè). Sửa tay tiền thuế thì
   * giữ nguyên số sửa tay cho tới lần đụng lại một trong hai ô kia — hóa đơn hay lệch
   * vài đồng do làm tròn trên từng dòng hàng.
   */
  const onValuesChange = (changed: Partial<FormVals>, all: FormVals) => {
    if ('tienHang' in changed || 'thueSuat' in changed) {
      form.setFieldValue('tienThue', tinhTienThue(all.tienHang, all.thueSuat));
    }
  };

  const onHopDongChange = (id: string) => {
    const hd = hdList.find((h) => h.hopDongId === id);
    if (hd) form.setFieldsValue({ nam: hd.nam });
  };

  const save = async () => {
    const v = await form.validateFields();
    const hd = hdList.find((h) => h.hopDongId === v.hopDongId);
    const payload: Omit<HoaDonBanRa, 'id'> = {
      hopDongId: v.hopDongId,
      soHopDong: hd?.soHopDong,
      tenCongTrinh: hd?.tenCongTrinh,
      doiTuongId: hd?.doiTuongId,
      soHoaDon: v.soHoaDon,
      ngay: v.ngay?.format('YYYY-MM-DD'),
      noiDung: v.noiDung,
      donViMua: v.donViMua,
      tienHang: v.tienHang,
      thueSuat: v.thueSuat,
      tienThue: v.tienThue,
      tong: (Number(v.tienHang) || 0) + (Number(v.tienThue) || 0),
      lan: v.lan,
      nam: v.nam ?? hd?.nam,
      namHoaDon: v.namHoaDon,
    };
    try {
      if (editingId) await hoaDonBanRaService.update(editingId, payload);
      else await hoaDonBanRaService.create(payload);
      message.success('Đã lưu hóa đơn');
      setOpen(false);
      load();
    } catch {
      message.error('Lưu thất bại');
    }
  };

  const remove = async (id: string) => {
    try {
      await hoaDonBanRaService.remove(id);
      message.success('Đã xóa');
      load();
    } catch {
      message.error('Xóa thất bại');
    }
  };

  // Lọc theo cột ở header + cố định cột. Dữ liệu load hết về client nên lọc client-side;
  // bảng phẳng, không có dòng tổng → lọc thẳng trên mảng.
  const { filterable, matches, hasPinned } = useTableColumnFilters('trung-tam-du-lieu-hd-ban-ra');
  const viewRows = useMemo(() => rows.filter((r) => matches(r, cellValue)), [rows, matches]);

  // Đổi bộ lọc cột → tập dòng đang xem đổi theo (`matches` chỉ đổi khi bộ lọc đổi) → bỏ chọn.
  useEffect(() => {
    clearSelection();
  }, [matches, clearSelection]);

  const columns: ColumnsType<HoaDonBanRa> = [
    filterable<HoaDonBanRa>({
      title: 'Số HĐ',
      dataIndex: 'soHoaDon',
      key: 'soHoaDon',
      width: 90,
      align: 'center',
      render: (v) => v || '-',
    }),
    { title: 'Ngày', dataIndex: 'ngay', width: 110, render: (v) => (v ? dayjs(v).format('DD/MM/YYYY') : '-') },
    filterable<HoaDonBanRa>({
      title: 'Hợp đồng',
      dataIndex: 'soHopDong',
      key: 'soHopDong',
      width: 150,
      render: (v) => <Text strong>{v || '-'}</Text>,
    }),
    filterable<HoaDonBanRa>({
      title: 'Tên công trình',
      dataIndex: 'tenCongTrinh',
      key: 'tenCongTrinh',
      width: 200,
      ellipsis: true,
      render: (v) => v || '-',
    }),
    filterable<HoaDonBanRa>({
      title: 'Đơn vị mua',
      dataIndex: 'donViMua',
      key: 'donViMua',
      width: 180,
      ellipsis: true,
      render: (v) => v || '-',
    }),
    { title: 'Tiền hàng', dataIndex: 'tienHang', width: 130, align: 'right', render: (v) => fmtCur(v) },
    {
      title: 'Thuế suất',
      dataIndex: 'thueSuat',
      key: 'thueSuat',
      width: 110,
      align: 'center',
      render: (v: string) =>
        v ? <Tag>{THUE_SUAT_OPTIONS.find((o) => o.value === v)?.label ?? v}</Tag> : '-',
    },
    { title: 'Tiền thuế', dataIndex: 'tienThue', width: 120, align: 'right', render: (v) => fmtCur(v) },
    { title: 'Tổng', dataIndex: 'tong', width: 140, align: 'right', render: (v) => <Text type="success">{fmtCur(v)}</Text> },
    { title: 'Lần', dataIndex: 'lan', width: 60, align: 'center', render: (v) => v || '-' },
    {
      title: '',
      width: 90,
      align: 'center',
      render: (_, r) => (
        <Space size={4}>
          {canEdit && <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openModal(r)} />}
          {canDelete && (
            <Popconfirm title="Xóa hóa đơn này?" okText="Xóa" cancelText="Hủy" onConfirm={() => remove(r.id!)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const { columns: cfgColumns, settingsButton } = useTableTitleConfig('trungTamDuLieu.soHoaDonBanRa', columns);
  const fl = useFieldLabels('trungTamDuLieu.soHoaDonBanRa');

  const hdOptions = hdList.map((h) => ({
    value: h.hopDongId,
    label: `${h.soHopDong}${h.tenCongTrinh ? ' — ' + h.tenCongTrinh : ''}`,
  }));

  return (
    <div className="space-y-3">
      <Card className="shadow-sm">
        <FilterBar
          search={{ value: search, onChange: setSearch, onSearch: load, placeholder: 'Tìm số HĐ, công trình, đơn vị mua...', width: 320 }}
          onReset={() => { setSearch(''); load(); }}
          actions={<>{bulkDeleteButton}{canCreate && <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>Thêm hóa đơn</Button>}{settingsButton}</>}
        />
        <Table<HoaDonBanRa>
          columns={cfgColumns}
          dataSource={viewRows}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          size="small"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được.
          scroll={{ x: hasPinned ? 'max-content' : 1200 }}
          pagination={{ pageSize: 20, showTotal: (t) => `Tổng ${t} hóa đơn` }}
        />
      </Card>

      <Modal
        title={editingId ? 'Sửa hóa đơn' : 'Thêm hóa đơn'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={save}
        okText={editingId ? 'Cập nhật' : 'Thêm'}
        cancelText="Hủy"
        width={680}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          size="small"
          className="mt-2"
          onValuesChange={onValuesChange}
        >
          <Form.Item name="hopDongId" label={fl('hopDongId', 'Hợp đồng')} rules={[{ required: true, message: 'Chọn hợp đồng' }]}>
            <Select showSearch optionFilterProp="label" options={hdOptions} placeholder="Chọn hợp đồng" onChange={onHopDongChange} />
          </Form.Item>
          <Space size="large" className="flex">
            <Form.Item name="soHoaDon" label={fl('soHoaDon', 'Số hóa đơn')}>
              <Input />
            </Form.Item>
            <Form.Item name="ngay" label={fl('ngay', 'Ngày')}>
              <DatePicker format="DD/MM/YYYY" className="w-full" />
            </Form.Item>
            <Form.Item name="lan" label={fl('lan', 'Hóa đơn lần')}>
              <InputNumber min={1} className="w-full" />
            </Form.Item>
          </Space>
          <Form.Item name="donViMua" label={fl('donViMua', 'Đơn vị mua')}>
            <Input placeholder="Tên đơn vị mua" />
          </Form.Item>
          <Form.Item name="noiDung" label={fl('noiDung', 'Nội dung')}>
            <Input />
          </Form.Item>
          <Space size="large" className="flex">
            <Form.Item name="tienHang" label={fl('tienHang', 'Tiền hàng')}>
              <InputNumber {...moneyProps} style={{ width: 180 }} />
            </Form.Item>
            <Form.Item name="thueSuat" label={fl('thueSuat', 'Thuế suất')}>
              <Select options={THUE_SUAT_OPTIONS} allowClear placeholder="Chọn" style={{ width: 160 }} />
            </Form.Item>
            <Form.Item
              name="tienThue"
              label={fl('tienThue', 'Tiền thuế')}
              tooltip="Tự tính khi đổi tiền hàng hoặc thuế suất; vẫn sửa tay được"
            >
              <InputNumber {...moneyProps} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item label="Tổng">
              <Text strong type="success">{fmtCur(tong)}</Text>
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
