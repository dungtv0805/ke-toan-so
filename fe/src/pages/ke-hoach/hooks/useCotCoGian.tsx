import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnsType } from "antd/es/table";
import {
  docRongDaLuu,
  ghiRongDaLuu,
  rongMoi,
  type RongTheoCot,
} from "./rongCot";

/**
 * Cho phép kéo giãn cột của bảng kế hoạch, SỐNG CHUNG ĐƯỢC với cột ghim.
 *
 * Vì sao không dùng lại `useTableColumnResize` (Nhật ký chung, tab Chi tiết):
 * hook đó sửa thẳng DOM theo *chỉ số cột*, trong khi `fixed: "left"` của antd
 * tính `left: Npx` lúc **render React**. Kéo giãn một cột ghim bằng DOM thì
 * antd không biết để tính lại offset, hàng tiêu đề trườn lệch khỏi thân bảng —
 * đúng lỗi đã khiến hai lần thử ghim cột ở Nhật ký chung phải gỡ bỏ.
 *
 * Ở đây bề rộng nằm trong state React: kéo xong antd render lại và tự tính lại
 * offset của mọi cột sticky.
 *
 * Bề rộng lưu theo KEY cột, không theo chỉ số — thêm/bớt cột về sau không làm
 * lệch bề rộng đã lưu, khỏi phải bump phiên bản khoá lưu.
 */
export function useCotCoGian<T>(
  khoa: string,
  cot: ColumnsType<T>,
): ColumnsType<T> {
  const [rong, setRong] = useState<RongTheoCot>(() => docRongDaLuu(khoa));

  // Bản sao đồng bộ để trình xử lý chuột đọc được giá trị mới nhất mà không
  // phải gắn lại listener sau mỗi lần render.
  const rongRef = useRef(rong);
  rongRef.current = rong;

  const keoRef = useRef<{ key: string; x: number; rongDau: number } | null>(
    null,
  );
  const khungRef = useRef<number | null>(null);

  const ketThuc = useCallback(() => {
    keoRef.current = null;
    if (khungRef.current !== null) {
      cancelAnimationFrame(khungRef.current);
      khungRef.current = null;
    }
    document.body.classList.remove("kh-dang-keo-cot");
    ghiRongDaLuu(khoa, rongRef.current);
  }, [khoa]);

  // Rời trang giữa lúc đang kéo thì phải gỡ khoá con trỏ, nếu không cả ứng dụng
  // kẹt ở con trỏ col-resize.
  useEffect(() => () => document.body.classList.remove("kh-dang-keo-cot"), []);

  const batDauKeo = useCallback(
    (key: string, rongHienTai: number) => (e: React.PointerEvent) => {
      // Chặn antd hiểu nhầm là bấm để sắp xếp cột.
      e.preventDefault();
      e.stopPropagation();

      keoRef.current = { key, x: e.clientX, rongDau: rongHienTai };
      document.body.classList.add("kh-dang-keo-cot");

      const diChuyen = (ev: PointerEvent) => {
        const keo = keoRef.current;
        if (!keo) return;
        // Gộp về một lần cập nhật mỗi khung hình: mỗi lần setState là render
        // lại cả bảng, chạy theo từng sự kiện chuột sẽ giật.
        if (khungRef.current !== null) cancelAnimationFrame(khungRef.current);
        khungRef.current = requestAnimationFrame(() => {
          khungRef.current = null;
          setRong((truoc) => ({
            ...truoc,
            [keo.key]: rongMoi(keo.rongDau, ev.clientX - keo.x),
          }));
        });
      };

      const nha = () => {
        window.removeEventListener("pointermove", diChuyen);
        ketThuc();
      };

      window.addEventListener("pointermove", diChuyen);
      window.addEventListener("pointerup", nha, { once: true });
      window.addEventListener("pointercancel", nha, { once: true });
    },
    [ketThuc],
  );

  /** Nhấp đúp vào tay kéo: trả cột về bề rộng mặc định — lối thoát khi lỡ kéo hỏng. */
  const datLaiCot = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setRong((truoc) => {
        const sau = { ...truoc };
        delete sau[key];
        ghiRongDaLuu(khoa, sau);
        return sau;
      });
    },
    [khoa],
  );

  return useMemo(() => {
    const apDung = (cols: ColumnsType<T>): ColumnsType<T> =>
      cols.map((c) => {
        // Cột nhóm (Quý / Tháng): tự nó không có bề rộng, kéo giãn ở cột con.
        if ("children" in c && Array.isArray(c.children)) {
          return { ...c, children: apDung(c.children as ColumnsType<T>) };
        }

        const key = String(c.key ?? "");
        const rongGoc = Number(c.width);
        // Không khai key hoặc không khai width thì không neo được bề rộng vào
        // đâu cả — để nguyên, còn hơn kéo ra một cột nhảy lung tung.
        if (!key || !Number.isFinite(rongGoc)) return c;
        // Cột không có nhãn (cột nút xoá) — kéo giãn vô nghĩa.
        if (c.title === "" || c.title === undefined) return c;
        // `title` dạng hàm do antd tự gọi kèm tham số; không bọc được.
        if (typeof c.title === "function") return { ...c, width: rong[key] ?? rongGoc };

        const rongHienTai = rong[key] ?? rongGoc;
        return {
          ...c,
          width: rongHienTai,
          title: (
            <span className="kh-o-tieu-de">
              {c.title as React.ReactNode}
              <span
                className="kh-tay-keo"
                role="separator"
                aria-orientation="vertical"
                aria-label="Kéo để đổi độ rộng cột"
                onPointerDown={batDauKeo(key, rongHienTai)}
                onDoubleClick={datLaiCot(key)}
                onClick={(e) => e.stopPropagation()}
              />
            </span>
          ),
        };
      });

    return apDung(cot);
  }, [cot, rong, batDauKeo, datLaiCot]);
}
