import React from 'react';
import { SectionNav } from '@/components/layout/SectionNav';
import { KHO_NAV } from '@/config/sectionNavs';
import ComingSoon from '@/pages/ComingSoon';

/**
 * Trang nhóm hàng trong kho (Hàng hóa / Nguyên vật liệu / Dụng cụ / Văn phòng phẩm).
 * Nội dung chi tiết chưa làm, nhưng vẫn giữ thanh ngang Nhập/Xuất/Chuyển/Kiểm kê kho
 * để đây là lối vào các phiếu kho sau khi bỏ chúng khỏi dropdown sidebar.
 */
const KhoNhomHangPage: React.FC = () => (
  <div className="flex h-full flex-col gap-3">
    <SectionNav items={KHO_NAV} />
    <div className="flex-1">
      <ComingSoon />
    </div>
  </div>
);

export default KhoNhomHangPage;
