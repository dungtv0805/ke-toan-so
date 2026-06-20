import { doiTuongService } from '@/services/doiTuongService';
import {
  SoChiTietReport,
  soChiTietTaiKhoanService,
} from '@/services/soChiTietTaiKhoanService';
import { taiKhoanService } from '@/services/taiKhoanService';
import { AccountBookOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  Breadcrumb,
  Button,
  Card,
  DatePicker,
  Empty, message,
  Select,
  Space,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AccountReportBlock from './AccountReportBlock';
import ColumnChooser from './ColumnChooser';
import {
  buildAntdColumns, loadVisibleKeys, saveVisibleKeys,
} from './columnRegistry';
import { parseReportParams } from './reportParams';

const { RangePicker } = DatePicker;

const SoChiTietTaiKhoanPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [accountOptions, setAccountOptions] = useState<{ value: string; label: string }[]>([]);
  const [doiTuongOptions, setDoiTuongOptions] = useState<{ value: string; label: string }[]>([]);
  const [maTaiKhoans, setMaTaiKhoans] = useState<string[]>([]);
  const [maDoiTuong, setMaDoiTuong] = useState<string>();
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);
  const [reports, setReports] = useState<SoChiTietReport[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() => loadVisibleKeys());

  useEffect(() => {
    (async () => {
      try {
        const [accs, dts] = await Promise.all([
          taiKhoanService.getAll(),
          doiTuongService.getAll(),
        ]);
        setAccountOptions(accs.map((a) => ({ value: a.ma, label: `${a.ma} - ${a.ten}` })));
        setDoiTuongOptions(dts.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}` })));
      } catch (error) {
        console.error('Error loading danh mục:', error);
        message.error('Không tải được danh mục tài khoản / đối tượng');
      }
    })();
  }, []);

  // Mở từ link (vd drill-down từ báo cáo tài chính): đọc query param và tự tải.
  useEffect(() => {
    const p = parseReportParams(searchParams.get.bind(searchParams));
    if (!p.maTaiKhoan) return;

    const start = p.startDate && dayjs(p.startDate).isValid()
      ? dayjs(p.startDate)
      : dayjs().startOf('month');
    const end = p.endDate && dayjs(p.endDate).isValid()
      ? dayjs(p.endDate)
      : dayjs().endOf('month');

    // Phản ánh lựa chọn lên bộ lọc để người dùng thấy đang xem gì.
    setMaTaiKhoans([p.maTaiKhoan]);
    if (p.maDoiTuong) setMaDoiTuong(p.maDoiTuong);
    setRange([start, end]);

    // Tải trực tiếp từ param (tránh đọc state chưa cập nhật).
    (async () => {
      setLoading(true);
      try {
        const data = await soChiTietTaiKhoanService.getReport(
          [p.maTaiKhoan as string],
          start.startOf('day').toDate(),
          end.endOf('day').toDate(),
          p.maDoiTuong,
        );
        setReports(data);
      } catch (error) {
        console.error('Error loading sổ chi tiết:', error);
        message.error('Không tải được sổ chi tiết tài khoản');
      } finally {
        setLoading(false);
      }
    })();
    // Chỉ chạy một lần lúc mount theo param ban đầu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onChangeVisible = (keys: string[]) => {
    setVisibleKeys(keys);
    saveVisibleKeys(keys);
  };

  const columns = useMemo(() => buildAntdColumns(visibleKeys), [visibleKeys]);
  const scrollX = useMemo(
    () => Math.max(1100, visibleKeys.length * 130),
    [visibleKeys],
  );

  const allSelected =
    accountOptions.length > 0 && maTaiKhoans.length === accountOptions.length;

  const loadReport = async () => {
    if (maTaiKhoans.length === 0 || !range) return;
    setLoading(true);
    try {
      const data = await soChiTietTaiKhoanService.getReport(
        allSelected ? 'all' : maTaiKhoans,
        range[0].startOf('day').toDate(),
        range[1].endOf('day').toDate(),
        maDoiTuong,
      );
      setReports(data);
    } catch (error) {
      console.error('Error loading sổ chi tiết:', error);
      message.error('Không tải được sổ chi tiết tài khoản');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          { href: '/', title: <HomeOutlined /> },
          { title: 'Báo cáo' },
          { title: 'Sổ chi tiết tài khoản' },
        ]}
      />
      <Card
        title={<Space><AccountBookOutlined /><span>Sổ chi tiết tài khoản</span></Space>}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={loadReport}
            disabled={maTaiKhoans.length === 0}
          >
            Làm mới
          </Button>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            allowClear={false}
          />
          <Select
            mode="multiple"
            showSearch
            placeholder="Chọn tài khoản (bắt buộc)"
            style={{ minWidth: 320, maxWidth: 520 }}
            options={accountOptions}
            value={maTaiKhoans}
            onChange={setMaTaiKhoans}
            maxTagCount="responsive"
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <Button onClick={() => setMaTaiKhoans(accountOptions.map((o) => o.value))}>
            Chọn tất cả
          </Button>
          <Select
            showSearch allowClear placeholder="Đối tượng (tùy chọn)"
            style={{ width: 280 }} options={doiTuongOptions}
            value={maDoiTuong} onChange={setMaDoiTuong}
            filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())}
          />
          <ColumnChooser visibleKeys={visibleKeys} onChange={onChangeVisible} />
          <Button type="primary" onClick={loadReport} disabled={maTaiKhoans.length === 0}>
            Xem
          </Button>
        </Space>

        {reports ? (
          reports.length === 0 ? (
            <Empty description="Không có dữ liệu cho tài khoản và kỳ đã chọn" />
          ) : (
            <>
              <div style={{ textAlign: 'center', fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
                SỔ CHI TIẾT TÀI KHOẢN
              </div>
              {reports.map((rep) => (
                <AccountReportBlock
                  key={rep.taiKhoan.ma}
                  report={rep}
                  columns={loading ? [] : columns}
                  scrollX={scrollX}
                />
              ))}
            </>
          )
        ) : (
          <Empty description="Chọn tài khoản và kỳ rồi bấm Xem" />
        )}
      </Card>
      <style>{`.sct-summary-row { background:#fafafa; font-weight:600; }`}</style>
    </div>
  );
};

export default SoChiTietTaiKhoanPage;
