import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  InputNumber,
  DatePicker,
  Space,
  Typography,
  Breadcrumb,
  message,
  Alert,
  Input,
} from 'antd';
import { HomeOutlined, SaveOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { taiKhoanService } from '@/services/taiKhoanService';
import { soDuDauKyService } from '@/services/soDuDauKyService';
import { usePagePermission } from '@/hooks/usePagePermission';

const { Text } = Typography;

interface RowState {
  ma: string;
  ten: string;
  duNo: number;
  duCo: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('vi-VN').format(v || 0);

const SoDuDauKyPage: React.FC = () => {
  const { canEdit } = usePagePermission('/danh-muc/so-du-dau-ky');
  const [rows, setRows] = useState<RowState[]>([]);
  const [ngayApDung, setNgayApDung] = useState<Dayjs>(dayjs().startOf('year'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [accounts, opening] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        soDuDauKyService.getAll(),
      ]);
      const openingMap = new Map(
        opening.items.map((i) => [i.maTaiKhoan, i]),
      );
      const next: RowState[] = accounts
        .map((a) => {
          const o = openingMap.get(a.ma);
          return {
            ma: a.ma,
            ten: a.ten,
            duNo: o ? Number(o.duNo) || 0 : 0,
            duCo: o ? Number(o.duCo) || 0 : 0,
          };
        })
        .sort((a, b) => a.ma.localeCompare(b.ma));
      setRows(next);
      if (opening.ngayApDung) {
        setNgayApDung(dayjs(opening.ngayApDung));
      }
    } catch (e) {
      message.error('Không tải được dữ liệu số dư đầu kỳ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateRow = (ma: string, field: 'duNo' | 'duCo', value: number) => {
    setRows((prev) =>
      prev.map((r) => (r.ma === ma ? { ...r, [field]: value || 0 } : r)),
    );
  };

  const { tongNo, tongCo } = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        tongNo: acc.tongNo + (r.duNo || 0),
        tongCo: acc.tongCo + (r.duCo || 0),
      }),
      { tongNo: 0, tongCo: 0 },
    );
  }, [rows]);

  const canDoi = Math.round(tongNo * 100) === Math.round(tongCo * 100);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.ma.toLowerCase().includes(s) || r.ten.toLowerCase().includes(s),
    );
  }, [rows, search]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await soDuDauKyService.saveBulk({
        ngayApDung: ngayApDung.toISOString(),
        items: rows.map((r) => ({
          maTaiKhoan: r.ma,
          duNo: r.duNo || 0,
          duCo: r.duCo || 0,
        })),
      });
      if (!result.canDoi) {
        message.warning('Đã lưu — lưu ý tổng Nợ và tổng Có chưa cân đối');
      } else {
        message.success('Lưu số dư đầu kỳ thành công');
      }
    } catch (e) {
      message.error('Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { title: 'Mã TK', dataIndex: 'ma', width: 120 },
    { title: 'Tên tài khoản', dataIndex: 'ten' },
    {
      title: 'Dư Nợ đầu kỳ',
      dataIndex: 'duNo',
      width: 200,
      render: (_: number, record: RowState) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.duNo}
          disabled={!canEdit}
          min={0}
          formatter={(v) =>
            `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          }
          parser={(v) => Number((v || '').replace(/,/g, ''))}
          onChange={(v) => updateRow(record.ma, 'duNo', Number(v))}
        />
      ),
    },
    {
      title: 'Dư Có đầu kỳ',
      dataIndex: 'duCo',
      width: 200,
      render: (_: number, record: RowState) => (
        <InputNumber
          style={{ width: '100%' }}
          value={record.duCo}
          disabled={!canEdit}
          min={0}
          formatter={(v) =>
            `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
          }
          parser={(v) => Number((v || '').replace(/,/g, ''))}
          onChange={(v) => updateRow(record.ma, 'duCo', Number(v))}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Danh mục' },
          { title: 'Số dư đầu kỳ' },
        ]}
      />
      <Card
        title="Khai báo số dư đầu kỳ"
        extra={
          <Space>
            <Text>Ngày áp dụng:</Text>
            <DatePicker
              value={ngayApDung}
              format="DD/MM/YYYY"
              allowClear={false}
              disabled={!canEdit}
              onChange={(d) => d && setNgayApDung(d)}
            />
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!canEdit}
              onClick={handleSave}
            >
              Lưu
            </Button>
          </Space>
        }
      >
        {!canDoi && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Tổng Nợ (${formatCurrency(tongNo)}) ≠ Tổng Có (${formatCurrency(
              tongCo,
            )}) — số dư đầu kỳ chưa cân đối`}
          />
        )}
        <Input
          allowClear
          placeholder="Tìm theo mã hoặc tên tài khoản"
          prefix={<SearchOutlined />}
          style={{ width: 320, marginBottom: 16 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Table
          rowKey="ma"
          loading={loading}
          dataSource={filteredRows}
          columns={columns}
          pagination={false}
          scroll={{ y: 'calc(100vh - 360px)' }}
          size="small"
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
              </Table.Summary.Row>
            </Table.Summary>
          )}
        />
      </Card>
    </div>
  );
};

export default SoDuDauKyPage;
