import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ChoToiDuyetHandlerProvider,
  useChoToiDuyetHandler,
} from "./ChoToiDuyetHandlerContext";
import { DanhSachChoDuyet } from "./components/danh-sach/DanhSachChoDuyet";
import { ChiTietDrawer } from "./components/chi-tiet/ChiTietDrawer";

function ChoToiDuyetPageInner() {
  const handler = useChoToiDuyetHandler();
  const [searchParams] = useSearchParams();
  const idTuThongBao = searchParams.get("id");

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  // Thông báo (mục 13) dẫn thẳng tới nghiệp vụ qua `?id=` — mở luôn ngăn kéo
  // chi tiết thay vì bắt người dùng dò lại trong danh sách.
  useEffect(() => {
    if (idTuThongBao) handler.executeEvent("moChiTiet", { id: idTuThongBao });
  }, [handler, idTuThongBao]);

  return (
    <div className="space-y-3">
      <DanhSachChoDuyet />
      <ChiTietDrawer />
    </div>
  );
}

const ChoToiDuyetPage: React.FC = () => (
  <ChoToiDuyetHandlerProvider>
    <ChoToiDuyetPageInner />
  </ChoToiDuyetHandlerProvider>
);

export default ChoToiDuyetPage;
