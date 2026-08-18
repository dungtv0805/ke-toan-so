import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select, Radio, Tag, Typography, Spin } from "antd";
import {
  bangKeMuaVaoService,
  bangKeBanRaService,
  type BangKeRecord,
} from "@/services/taxService";
import {
  suyLoaiHoaDon,
  tongThanhToanHoaDon,
  khoaHoaDon,
  type HoaDonGan,
  type LoaiHoaDon,
} from "../../hoaDonLienKet";

const { Text } = Typography;
const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Chờ người dùng ngừng gõ trước khi gọi API gợi ý. */
const DEBOUNCE_MS = 300;

interface Props {
  loaiGiaoDich?: string;
  soTienChungTu: number;
  value: HoaDonGan[];
  onChange: (v: HoaDonGan[]) => void;
}

/** Nhãn chip/gợi ý: số hóa đơn + đối tác để phân biệt hai hóa đơn TRÙNG SỐ. */
const nhanGoiY = (g: BangKeRecord) =>
  `${g.soHoaDon} — ${g.ngayHoaDon?.slice(0, 10)} — ${
    g.tenNguoiBan || g.tenNguoiMua || ""
  } — ${fmt(g.tongThanhToan || 0)} đ`;

/**
 * Ô gán hóa đơn cho chứng từ. CHỈ gán số hóa đơn — mọi thông tin chi tiết
 * (ký hiệu, MST, giá trị, thuế suất) chỉ nhập và chỉ hiển thị ở bảng kê.
 */
export function HoaDonField({ loaiGiaoDich, soTienChungTu, value, onChange }: Props) {
  const [loai, setLoai] = useState<LoaiHoaDon>(suyLoaiHoaDon(loaiGiaoDich));
  // Người dùng đã tự bấm Mua vào/Bán ra chưa. Chưa bấm thì ô bám theo loại giao
  // dịch — cần thiết vì FormHeader render TRƯỚC khi load-data set header (màn sửa)
  // và người tạo mới thường chọn Loại GD sau khi ô đã mount. Kẹt ở "Mua vào" là
  // ghi hóa đơn của phiếu thu sang bảng kê mua vào — sai bên tờ khai thuế.
  const [tuChon, setTuChon] = useState(false);
  const [goiY, setGoiY] = useState<BangKeRecord[]>([]);
  const [dangTim, setDangTim] = useState(false);
  const [loiGoiY, setLoiGoiY] = useState(false);

  useEffect(() => {
    if (tuChon) return;
    setLoai(suyLoaiHoaDon(loaiGiaoDich));
  }, [loaiGiaoDich, tuChon]);

  const service = loai === "mua" ? bangKeMuaVaoService : bangKeBanRaService;

  // Debounce gõ phím + chống race: mỗi lần bấm gõ tăng requestSeqRef, response
  // của request nào không còn là request mới nhất thì bị bỏ qua — tránh trả lời
  // chậm của lần gõ trước ghi đè gợi ý mới hơn khiến người dùng chọn nhầm hóa đơn.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = useCallback(
    (text: string) => {
      const seq = ++requestSeqRef.current;
      setDangTim(true);
      setLoiGoiY(false);
      service
        .timChuaLienKet(text)
        .then((res) => {
          if (!mountedRef.current || seq !== requestSeqRef.current) return;
          setGoiY(res);
        })
        .catch(() => {
          if (!mountedRef.current || seq !== requestSeqRef.current) return;
          // Lỗi API KHÁC "không tìm thấy": im lặng trả rỗng thì người dùng tưởng
          // hóa đơn chưa có và gõ tay tạo dòng trùng.
          setGoiY([]);
          setLoiGoiY(true);
        })
        .finally(() => {
          if (!mountedRef.current || seq !== requestSeqRef.current) return;
          setDangTim(false);
        });
    },
    [service],
  );

  const handleSearch = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = text.trim();
    if (!trimmed) {
      // Xoá ô tìm → hủy mọi request đang bay (tăng seq để response cũ bị bỏ qua).
      requestSeqRef.current++;
      setDangTim(false);
      setLoiGoiY(false);
      setGoiY([]);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), DEBOUNCE_MS);
  };

  // Khóa của Select là ĐỊNH DANH hóa đơn (id, hoặc "moi:<loại>:<số>"), KHÔNG phải
  // số hóa đơn — số hóa đơn chỉ duy nhất trong phạm vi một người bán, hai NCC trùng
  // số sẽ bị antd gộp làm một chip.
  const options = useMemo(() => {
    const map = new Map<string, { value: string; label: string }>();
    // Chip đang chọn phải có option riêng, nếu không antd hiển thị nguyên cái khóa.
    for (const h of value) {
      map.set(khoaHoaDon(h), {
        value: khoaHoaDon(h),
        label: h.tongThanhToan
          ? `${h.soHoaDon} — ${fmt(h.tongThanhToan)} đ`
          : h.soHoaDon,
      });
    }
    for (const g of goiY) {
      const k = khoaHoaDon({ id: g.id, soHoaDon: g.soHoaDon, loai });
      map.set(k, { value: k, label: nhanGoiY(g) });
    }
    return [...map.values()];
  }, [value, goiY, loai]);

  // Chọn từ gợi ý → gắn hóa đơn có sẵn. Gõ số lạ → hóa đơn mới, lưu chứng từ
  // xong mới tạo dòng nháp bên bảng kê (xem submit.handler).
  const handleChange = (khoaList: string[]) => {
    const cu = new Map(value.map((h) => [khoaHoaDon(h), h]));
    const theoKhoaGoiY = new Map(
      goiY.map((g) => [khoaHoaDon({ id: g.id, soHoaDon: g.soHoaDon, loai }), g]),
    );
    onChange(
      khoaList.map((khoa) => {
        const daCo = cu.get(khoa);
        if (daCo) return daCo;
        const tim = theoKhoaGoiY.get(khoa);
        if (tim) {
          return {
            id: tim.id,
            soHoaDon: tim.soHoaDon,
            loai,
            tongThanhToan: tim.tongThanhToan,
          };
        }
        // mode="tags": số vừa gõ tay chính là khóa antd trả về.
        return { soHoaDon: khoa.trim(), loai };
      }),
    );
  };

  const tong = tongThanhToanHoaDon(value);
  const lech = tong > 0 && Math.round(tong) !== Math.round(soTienChungTu);

  const notFound = dangTim ? (
    <Spin size="small" />
  ) : loiGoiY ? (
    <Text type="danger" className="text-xs">
      Không tra được danh sách hóa đơn — kiểm tra kết nối rồi gõ lại
    </Text>
  ) : (
    <Text type="secondary" className="text-xs">
      Không có hóa đơn chưa liên kết khớp — gõ số rồi Enter để thêm mới
    </Text>
  );

  return (
    <div className="nkc-field w-full">
      <label className="nkc-label">Hóa đơn</label>
      <div className="flex gap-2 items-start">
        <Radio.Group
          size="small"
          value={loai}
          onChange={(e) => {
            setTuChon(true);
            setLoai(e.target.value);
          }}
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
          value={value.map(khoaHoaDon)}
          onSearch={handleSearch}
          onChange={handleChange}
          loading={dangTim}
          filterOption={false}
          notFoundContent={notFound}
          options={options}
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
