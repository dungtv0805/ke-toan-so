import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card, Table, Button, InputNumber, DatePicker, Select, Space,
  Typography, Breadcrumb, message, Alert, Popconfirm,
} from 'antd';
import { HomeOutlined, SaveOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { taiKhoanService } from '@/services/taiKhoanService';
import { soDuDauKyService } from '@/services/soDuDauKyService';
import { doiTuongService } from '@/services/doiTuongService';
import { nganHangService } from '@/services/nganHangService';
import { usePagePermission } from '@/hooks/usePagePermission';
import {
  CHI_TIET_LABEL, DOI_TUONG_LOAI, validateRows,
  type ChiTietLoai, type SoDuRow,
} from './chiTietConfig';

const { Text } = Typography;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

interface DoiTuongOption { value: string; label: string; ma: string; ten: string; }

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}-${Date.now()}`;

const SoDuDauKyPage: React.FC = () => {
  const { canEdit } = usePagePermission('/danh-muc/so-du-dau-ky');
  const [rows, setRows] = useState<SoDuRow[]>([]);
  const [accounts, setAccounts] = useState<
    { ma: string; ten: string; chiTietTheo?: ChiTietLoai }[]
  >([]);
  const [ngayApDung, setNgayApDung] = useState<Dayjs>(dayjs().startOf('year'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // cache options doi tuong theo loai
  const [optCache, setOptCache] = useState<Record<string, DoiTuongOption[]>>({});

  const accountMap = useMemo(() => {
    const m = new Map<string, { ma: string; ten: string; chiTietTheo?: ChiTietLoai }>();
    accounts.forEach((a) => m.set(a.ma, a));
    return m;
  }, [accounts]);

  const loadOptions = useCallback(
    async (loai: ChiTietLoai): Promise<DoiTuongOption[]> => {
      if (optCache[loai]) return optCache[loai];
      let opts: DoiTuongOption[] = [];
      if (loai === 'NGAN_HANG_QUY') {
        const list = await nganHangService.getAll();
        opts = list.map((n) => ({
          value: n.id, label: `${n.ma} - ${n.ten}`, ma: n.ma, ten: n.ten,
        }));
      } else {
        const dtLoai = DOI_TUONG_LOAI[loai] as
          'KHACH_HANG' | 'NHA_CUNG_CAP' | 'NHAN_VIEN' | 'NHA_THAU';
        const list = await doiTuongService.getByLoai(dtLoai);
        opts = list.map((d) => ({
          value: d.id, label: `${d.ma} - ${d.ten}`, ma: d.ma, ten: d.ten,
        }));
      }
      setOptCache((p) => ({ ...p, [loai]: opts }));
      return opts;
    },
    [optCache],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, opening] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        soDuDauKyService.getAll(),
      ]);
      const accList = accs.map((a) => ({
        ma: a.ma, ten: a.ten,
        chiTietTheo: a.chiTietTheo as ChiTietLoai | undefined,
      }));
      setAccounts(accList);
      const accLookup = new Map(accList.map((a) => [a.ma, a]));
      const nextRows: SoDuRow[] = opening.items.map((i) => ({
        key: newKey(),
        maTaiKhoan: i.maTaiKhoan,
        tenTaiKhoan: accLookup.get(i.maTaiKhoan)?.ten ?? '',
        chiTietTheo:
          (i.chiTietType as ChiTietLoai | undefined) ??
          accLookup.get(i.maTaiKhoan)?.chiTietTheo,
        chiTietId: i.chiTietId,
        chiTietMa: i.chiTietMa,
        chiTietTen: i.chiTietTen,
        duNo: Number(i.duNo) || 0,
        duCo: Number(i.duCo) || 0,
      }));
      setRows(nextRows);
      if (opening.ngayApDung) setNgayApDung(dayjs(opening.ngayApDung));
    } catch (e) {
      message.error('Không tải được dữ liệu số dư đầu kỳ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const patchRow = (key: string, patch: Partial<SoDuRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const handleSelectAccount = (key: string, ma: string) => {
    const acc = accountMap.get(ma);
    patchRow(key, {
      maTaiKhoan: ma,
      tenTaiKhoan: acc?.ten ?? '',
      chiTietTheo: acc?.chiTietTheo,
      chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined,
    });
    if (acc?.chiTietTheo) loadOptions(acc.chiTietTheo);
  };

  const handleSelectDoiTuong = (key: string, loai: ChiTietLoai, id: string) => {
    const opt = (optCache[loai] || []).find((o) => o.value === id);
    patchRow(key, { chiTietId: id, chiTietMa: opt?.ma, chiTietTen: opt?.ten });
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        key: newKey(), maTaiKhoan: '', tenTaiKhoan: '', chiTietTheo: undefined,
        chiTietId: undefined, chiTietMa: undefined, chiTietTen: undefined, duNo: 0, duCo: 0,
      },
    ]);

  const removeRow = (key: string) =>
    setRows((prev) => prev.filter((r) => r.key !== key));

  const { tongNo, tongCo } = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ tongNo: acc.tongNo + (r.duNo || 0), tongCo: acc.tongCo + (r.duCo || 0) }),
        { tongNo: 0, tongCo: 0 },
      ),
    [rows],
  );
  const canDoi = Math.round(tongNo * 100) === Math.round(tongCo * 100);

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })),
    [accounts],
  );

  const handleSave = async () => {
    const check = validateRows(rows);
    if (!check.ok) { message.error(check.message); return; }
    setSaving(true);
    try {
      const result = await soDuDauKyService.saveBulk({
        ngayApDung: ngayApDung.toISOString(),
        items: rows.map((r) => ({
          maTaiKhoan: r.maTaiKhoan,
          duNo: r.duNo || 0,
          duCo: r.duCo || 0,
          chiTietType: r.chiTietTheo,
          chiTietId: r.chiTietId,
          chiTietMa: r.chiTietMa,
          chiTietTen: r.chiTietTen,
        })),
      });
      if (!result.canDoi) message.warning('Đã lưu — lưu ý tổng Nợ và tổng Có chưa cân đối');
      else message.success('Lưu số dư đầu kỳ thành công');
    } catch (e) {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const numberInput = (record: SoDuRow, field: 'duNo' | 'duCo') => (
    <InputNumber
      style={{ width: '100%' }}
      value={record[field]}
      disabled={!canEdit}
      min={0}
      formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      parser={(v) => Number((v || '').replace(/,/g, ''))}
      onChange={(v) => patchRow(record.key, { [field]: Number(v) || 0 })}
    />
  );

  const columns = [
    {
      title: 'Tài khoản', dataIndex: 'maTaiKhoan', width: 280,
      render: (_: string, record: SoDuRow) => (
        <Select
          style={{ width: '100%' }}
          showSearch optionFilterProp="label"
          placeholder="Chọn tài khoản"
          disabled={!canEdit}
          value={record.maTaiKhoan || undefined}
          options={accountOptions}
          onChange={(v) => handleSelectAccount(record.key, v)}
        />
      ),
    },
    {
      title: 'Chi tiết theo đối tượng', dataIndex: 'chiTietId', width: 300,
      render: (_: string, record: SoDuRow) => {
        if (!record.chiTietTheo) return <Text type="secondary">—</Text>;
        const opts = optCache[record.chiTietTheo] || [];
        return (
          <Select
            style={{ width: '100%' }}
            showSearch optionFilterProp="label"
            placeholder={`Chọn ${CHI_TIET_LABEL[record.chiTietTheo]}`}
            disabled={!canEdit}
            value={record.chiTietId}
            options={opts}
            onFocus={() => loadOptions(record.chiTietTheo!)}
            onChange={(v) => handleSelectDoiTuong(record.key, record.chiTietTheo!, v)}
          />
        );
      },
    },
    { title: 'Dư Nợ đầu kỳ', dataIndex: 'duNo', width: 180,
      render: (_: number, r: SoDuRow) => numberInput(r, 'duNo') },
    { title: 'Dư Có đầu kỳ', dataIndex: 'duCo', width: 180,
      render: (_: number, r: SoDuRow) => numberInput(r, 'duCo') },
    {
      title: '', dataIndex: 'op', width: 50,
      render: (_: unknown, record: SoDuRow) => (
        <Popconfirm title="Xoá dòng này?" onConfirm={() => removeRow(record.key)}
          disabled={!canEdit}>
          <Button type="text" danger icon={<DeleteOutlined />} disabled={!canEdit} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Danh mục' },
          { title: 'Số dư đầu kỳ' },
        ]} />
      <Card
        title="Khai báo số dư đầu kỳ"
        extra={
          <Space>
            <Text>Ngày áp dụng:</Text>
            <DatePicker value={ngayApDung} format="DD/MM/YYYY" allowClear={false}
              disabled={!canEdit} onChange={(d) => d && setNgayApDung(d)} />
            <Button type="primary" icon={<SaveOutlined />} loading={saving}
              disabled={!canEdit} onClick={handleSave}>Lưu</Button>
          </Space>
        }>
        {!canDoi && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }}
            message={`Tổng Nợ (${formatCurrency(tongNo)}) ≠ Tổng Có (${formatCurrency(tongCo)}) — số dư đầu kỳ chưa cân đối`} />
        )}
        <Button icon={<PlusOutlined />} onClick={addRow} disabled={!canEdit}
          style={{ marginBottom: 16 }}>Thêm dòng</Button>
        <Table
          rowKey="key" loading={loading} dataSource={rows} columns={columns}
          pagination={false} scroll={{ y: 'calc(100vh - 380px)' }} size="small"
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={2}>
                  <Text strong>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1}>
                  <Text strong>{formatCurrency(tongNo)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2}>
                  <Text strong type={canDoi ? undefined : 'danger'}>
                    {formatCurrency(tongCo)}
                  </Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} />
              </Table.Summary.Row>
            </Table.Summary>
          )} />
      </Card>
    </div>
  );
};

export default SoDuDauKyPage;
