import { useState } from "react";
import { Select, Radio, Tag, Typography } from "antd";
import {
  bangKeMuaVaoService,
  bangKeBanRaService,
  type BangKeRecord,
} from "@/services/taxService";
import {
  suyLoaiHoaDon,
  tongThanhToanHoaDon,
  type HoaDonGan,
  type LoaiHoaDon,
} from "../../hoaDonLienKet";

const { Text } = Typography;
const fmt = (n: number) => n.toLocaleString("vi-VN");

interface Props {
  loaiGiaoDich?: string;
  soTienChungTu: number;
  value: HoaDonGan[];
  onChange: (v: HoaDonGan[]) => void;
}

/**
 * Ô gán hóa đơn cho chứng từ. CHỈ gán số hóa đơn — mọi thông tin chi tiết
 * (ký hiệu, MST, giá trị, thuế suất) chỉ nhập và chỉ hiển thị ở bảng kê.
 */
export function HoaDonField({ loaiGiaoDich, soTienChungTu, value, onChange }: Props) {
  const [loai, setLoai] = useState<LoaiHoaDon>(suyLoaiHoaDon(loaiGiaoDich));
  const [goiY, setGoiY] = useState<BangKeRecord[]>([]);
  const [dangTim, setDangTim] = useState(false);

  const service = loai === "mua" ? bangKeMuaVaoService : bangKeBanRaService;

  const handleSearch = async (text: string) => {
    if (!text.trim()) return setGoiY([]);
    setDangTim(true);
    try {
      setGoiY(await service.timChuaLienKet(text.trim()));
    } finally {
      setDangTim(false);
    }
  };

  // Chọn từ gợi ý → gắn hóa đơn có sẵn. Gõ số lạ → hóa đơn mới, lưu chứng từ
  // xong mới tạo dòng nháp bên bảng kê (xem submit.handler).
  const handleChange = (soList: string[]) => {
    const cu = new Map(value.map((h) => [h.soHoaDon, h]));
    onChange(
      soList.map((so) => {
        const daCo = cu.get(so);
        if (daCo) return daCo;
        const tim = goiY.find((g) => g.soHoaDon === so);
        return tim
          ? { id: tim.id, soHoaDon: so, loai, tongThanhToan: tim.tongThanhToan }
          : { soHoaDon: so, loai };
      }),
    );
  };

  const tong = tongThanhToanHoaDon(value);
  const lech = tong > 0 && Math.round(tong) !== Math.round(soTienChungTu);

  return (
    <div className="nkc-field w-full">
      <label className="nkc-label">Hóa đơn</label>
      <div className="flex gap-2 items-start">
        <Radio.Group
          size="small"
          value={loai}
          onChange={(e) => setLoai(e.target.value)}
          options={[
            { label: "Mua vào", value: "mua" },
            { label: "Bán ra", value: "ban" },
          ]}
          optionType="button"
        />
        <Select
          mode="tags"
          className="flex-1"
          size="small"
          placeholder="Gõ số hóa đơn — chọn từ gợi ý hoặc thêm mới"
          value={value.map((h) => h.soHoaDon)}
          onSearch={handleSearch}
          onChange={handleChange}
          loading={dangTim}
          filterOption={false}
          options={goiY.map((g) => ({
            value: g.soHoaDon,
            label: `${g.soHoaDon} — ${g.ngayHoaDon?.slice(0, 10)} — ${
              g.tenNguoiBan || g.tenNguoiMua || ""
            } — ${fmt(g.tongThanhToan || 0)} đ`,
          }))}
        />
      </div>
      {value.length > 0 && (
        <div className="mt-1">
          <Text type="secondary" className="text-xs">
            {value.length} hóa đơn, tổng {fmt(tong)} đ
          </Text>
          {lech && (
            <Tag color="warning" className="ml-2">
              Lệch với số tiền chứng từ ({fmt(soTienChungTu)} đ)
            </Tag>
          )}
        </div>
      )}
    </div>
  );
}
