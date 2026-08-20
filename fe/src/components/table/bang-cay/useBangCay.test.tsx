// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBangCay } from "./useBangCay";

interface BanGhi {
  id: string;
  nhom: string;
  ten: string;
}

const DU_LIEU: BanGhi[] = [
  { id: "1", nhom: "NS", ten: "Lương cơ bản" },
  { id: "2", nhom: "NS", ten: "Lương KPI" },
  { id: "3", nhom: "VP", ten: "Văn phòng phẩm" },
];

const DANH_MUC = [
  { ma: "NS", ten: "Nhân sự" },
  { ma: "VP", ten: "Văn phòng" },
];

const COT = [{ title: "Tên", dataIndex: "ten", key: "ten", width: 200 }];

/**
 * `layMa` và `cot` thường được viết thẳng trong JSX nên là object/hàm MỚI sau
 * mỗi lần render. Nếu hook lấy chúng làm dependency thì dữ liệu cây dựng lại
 * liên tục, effect "mở sẵn mọi nhóm" chạy lại và bung nhóm ngay sau khi người
 * dùng vừa thu — thu nhóm thành ra bấm không ăn.
 */
const dungHook = () =>
  renderHook(() =>
    useBangCay<BanGhi>({
      khoaLuu: "test.cheDoXem",
      danhSach: DU_LIEU,
      danhMuc: DANH_MUC,
      layMa: (r) => r.nhom, // hàm mới mỗi render — CỐ Ý
      cot: [...COT], // mảng mới mỗi render — CỐ Ý
      donVi: "khoản mục",
    })
  );

describe("useBangCay", () => {
  beforeEach(() => localStorage.clear());

  it("gom đúng nhóm và mở sẵn tất cả ở lần dựng đầu", () => {
    const { result } = dungHook();

    expect(result.current.duLieuCay).toHaveLength(2);
    expect(result.current.expandable.expandedRowKeys).toEqual(["nhom:NS", "nhom:VP"]);
  });

  it("thu một nhóm rồi render lại thì nhóm đó VẪN đóng", () => {
    const { result, rerender } = dungHook();

    act(() => result.current.expandable.onExpandedRowsChange(["nhom:VP"]));
    expect(result.current.expandable.expandedRowKeys).toEqual(["nhom:VP"]);

    rerender();
    rerender();

    expect(result.current.expandable.expandedRowKeys).toEqual(["nhom:VP"]);
  });

  it("thu HẾT các nhóm cũng không bị bung lại", () => {
    const { result, rerender } = dungHook();

    act(() => result.current.expandable.onExpandedRowsChange([]));
    rerender();

    expect(result.current.expandable.expandedRowKeys).toEqual([]);
  });

  it("dữ liệu đổi sang nhóm khác thì mở sẵn nhóm mới", () => {
    const { result, rerender } = renderHook(
      ({ ds }) =>
        useBangCay<BanGhi>({
          khoaLuu: "test.cheDoXem",
          danhSach: ds,
          danhMuc: DANH_MUC,
          layMa: (r) => r.nhom,
          cot: [...COT],
          donVi: "khoản mục",
        }),
      { initialProps: { ds: [DU_LIEU[0]] } }
    );

    expect(result.current.expandable.expandedRowKeys).toEqual(["nhom:NS"]);

    rerender({ ds: [DU_LIEU[2]] });

    expect(result.current.expandable.expandedRowKeys).toEqual(["nhom:VP"]);
  });

  it("chỉ gắn class tô nền cho dòng NHÓM, dòng con để trơn", () => {
    const { result } = dungHook();
    const nhom = result.current.duLieuCay[0];
    const con = (nhom as { children?: BanGhi[] }).children![0];

    expect(result.current.rowClassName(nhom)).toBe("hang-nhom-cay");
    expect(result.current.rowClassName(con as never)).toBe("");
  });

  it("mặc định là dạng cây, đổi chế độ thì nhớ lại", () => {
    const { result } = dungHook();
    expect(result.current.laCay).toBe(true);

    act(() => result.current.doiCheDo("danhSach"));

    expect(result.current.laCay).toBe(false);
    expect(localStorage.getItem("test.cheDoXem")).toBe("danhSach");
  });
});
