import { useLayoutEffect, useRef, useState } from "react";

// Chừa dưới đáy trang (padding của Content) + vài px đệm.
const BOTTOM_GAP = 20;
// Fallback khi chưa render xong DOM của antd Table.
const FALLBACK_HEADER_H = 33;
const FALLBACK_PAGINATION_H = 56;

/** Chiều cao thực chiếm chỗ của hàng phân trang (kể cả margin trên/dưới của antd). */
function paginationOuterHeight(el: HTMLElement): number {
  const pag = el.querySelector<HTMLElement>(".ant-pagination");
  if (!pag) return FALLBACK_PAGINATION_H;
  const cs = window.getComputedStyle(pag);
  return (
    pag.offsetHeight +
    parseFloat(cs.marginTop || "0") +
    parseFloat(cs.marginBottom || "0")
  );
}

/**
 * Chiều cao thân bảng = phần viewport còn lại tính từ đỉnh bảng, trừ đi header bảng
 * và hàng phân trang (ĐO TỪ DOM). Trước đây dùng `calc(100vh - 250px)` cứng nên chỉ cần
 * thêm một thanh ngang phía trên là phân trang bị tràn ra ngoài khung `overflow:hidden`.
 */
export function useTableBodyHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(400);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const recalc = () => {
      const top = el.getBoundingClientRect().top;
      const headerH =
        el.querySelector<HTMLElement>(".ant-table-header")?.offsetHeight ??
        FALLBACK_HEADER_H;
      const next = Math.max(
        200,
        Math.round(
          window.innerHeight -
            top -
            headerH -
            paginationOuterHeight(el) -
            BOTTOM_GAP,
        ),
      );
      // Chỉ set khi lệch đáng kể — tránh vòng lặp ResizeObserver.
      setHeight((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    };

    recalc();
    // Đo lại sau khi trình duyệt vẽ xong (font/scrollbar có thể đổi chiều cao header).
    const raf = requestAnimationFrame(recalc);
    const ro = new ResizeObserver(recalc);
    ro.observe(document.body);
    window.addEventListener("resize", recalc);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, []);

  return { ref, height };
}
