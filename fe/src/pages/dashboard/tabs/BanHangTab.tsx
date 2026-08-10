import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiseOutlined, PercentageOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons';
import KpiRow, { type KpiItem } from '../components/KpiRow';
import DoanhSoTheoThoiGianChart, { type GroupBy } from '../components/DoanhSoTheoThoiGianChart';
import DoanhSoTheoChieuChart from '../components/DoanhSoTheoChieuChart';
import { doanhSoService } from '@/services/doanhSoService';
import { tyLeSoCungKy } from '../soSanhCungKy';
import type { TabProps } from './TabProps';

const BanHangTab: React.FC<TabProps> = ({ year, startMonth, endMonth }) => {
  const [groupBy, setGroupBy] = useState<GroupBy>('thang');
  const [dimension, setDimension] = useState('nhan-vien');

  const { data, isLoading } = useQuery({
    queryKey: ['dash-doanh-so', year, startMonth, endMonth, groupBy, dimension],
    queryFn: () => doanhSoService.getDoanhSoTheo({ year, startMonth, endMonth, groupBy, dimension }),
  });

  const tong = data?.tong ?? 0;
  const tongCungKy = data?.tongCungKy ?? 0;
  const soDoiTuong = data?.theoChieu.length ?? 0;
  const tyLe = tyLeSoCungKy(tong, tongCungKy);

  const kpis: KpiItem[] = [
    { key: 'doanhSo', label: 'Doanh số kỳ này', value: tong, icon: <RiseOutlined /> },
    { key: 'cungKy', label: 'So cùng kỳ', value: tyLe ?? 0, format: 'phanTram', icon: <PercentageOutlined /> },
    { key: 'soDoiTuong', label: 'Số đối tượng có doanh số', value: soDoiTuong, format: 'soLuong', icon: <FileTextOutlined /> },
    { key: 'binhQuan', label: 'Doanh số bình quân', value: soDoiTuong ? tong / soDoiTuong : 0, icon: <DollarOutlined /> },
  ];

  return (
    <div className="space-y-3">
      <KpiRow items={kpis} loading={isLoading} />
      <DoanhSoTheoThoiGianChart
        data={data?.theoThoiGian ?? []}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        loading={isLoading}
      />
      <DoanhSoTheoChieuChart
        data={data?.theoChieu ?? []}
        dimension={dimension}
        onDimensionChange={setDimension}
        loading={isLoading}
      />
    </div>
  );
};

export default BanHangTab;
