import React, { useMemo } from 'react';
import { Tag } from 'antd';
import type { LoaiGiaoDich } from '@/types';
import { useQuyChaunState } from '../../QuyChaunHandlerContext';
import './QuyChaunStats.state';

/**
 * Một hàng thống kê gọn thay cho năm thẻ to chiếm nửa màn hình.
 *
 * Đếm theo danh mục Loại giao dịch THẬT của công ty (stats.theoLoai), không
 * theo bốn mã cứng PHIEU_THU/PHIEU_CHI/BAO_CO/BAO_NO — công ty đặt loại giao
 * dịch riêng thì bốn thẻ cũ đứng trơ số 0 trong khi tổng là 46.
 */
export const QuyChaunStats: React.FC = () => {
  const [stats] = useQuyChaunState('stats', null);
  const [loaiGiaoDichList] = useQuyChaunState('loaiGiaoDichList', [] as LoaiGiaoDich[]);

  const nhom = useMemo(() => {
    const theoLoai = stats?.theoLoai ?? {};
    // Bám thứ tự danh mục, rồi vét nốt mã có dữ liệu mà danh mục không khai.
    const trongDanhMuc = loaiGiaoDichList
      .filter((l) => theoLoai[l.ma])
      .map((l) => ({ ma: l.ma, ten: l.ten, color: l.color || 'default', soLuong: theoLoai[l.ma] }));
    const maDaCo = new Set(trongDanhMuc.map((n) => n.ma));
    const laVo = Object.entries(theoLoai)
      .filter(([ma, n]) => n > 0 && !maDaCo.has(ma))
      .map(([ma, n]) => ({
        ma,
        ten: ma || '(Chưa gán loại giao dịch)',
        color: 'default',
        soLuong: n,
      }));
    return [...trongDanhMuc, ...laVo];
  }, [stats, loaiGiaoDichList]);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      <span className="whitespace-nowrap">
        <span className="text-muted-foreground">Tổng quy chuẩn: </span>
        <span className="text-base font-semibold text-primary">{stats?.tongQuyChuan ?? 0}</span>
      </span>
      {nhom.map((n) => (
        <span key={n.ma} className="whitespace-nowrap text-muted-foreground">
          <Tag color={n.color} className="!mr-1">
            {n.soLuong}
          </Tag>
          {n.ten}
        </span>
      ))}
    </div>
  );
};
