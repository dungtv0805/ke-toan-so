import { useState } from "react";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePhieuState, usePhieuHandler } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";
import { ChungTu } from "@/types";

export function PhieuTable() {
  const handler = usePhieuHandler();
  const [data] = usePhieuState("data", [] as ChungTu[]);
  const [loading] = usePhieuState("loading", false);
  const [pagination] = usePhieuState("pagination", {
    total: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  });
  const [, setViewModalPhieu] = usePhieuState("viewModalPhieu", null);
  const [, setEditingPhieu] = usePhieuState("editingPhieu", null);
  const [, setFormModalOpen] = usePhieuState("formModalOpen", false);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const ok = await handler.executeEvent("deletePhieu", { id });
      if (ok) {
        toast.success("Đã xóa phiếu");
      } else {
        toast.error("Xóa thất bại");
      }
    } catch {
      toast.error("Xóa thất bại");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrev = () => {
    const currentPage = pagination?.page ?? 1;
    if (currentPage > 1) {
      handler.executeEvent("loadPage", { page: currentPage - 1 });
    }
  };

  const handleNext = () => {
    const currentPage = pagination?.page ?? 1;
    const totalPages = pagination?.totalPages ?? 0;
    if (currentPage < totalPages) {
      handler.executeEvent("loadPage", { page: currentPage + 1 });
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Số phiếu</TableHead>
              <TableHead>Ngày</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Đối tượng</TableHead>
              <TableHead>TK Nợ</TableHead>
              <TableHead>TK Có</TableHead>
              <TableHead className="text-right">Số tiền</TableHead>
              <TableHead className="text-center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Không có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.soPhieu}</TableCell>
                  <TableCell>
                    {row.ngay ? dayjs(row.ngay).format("DD/MM/YYYY") : "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {row.noiDung}
                  </TableCell>
                  <TableCell>
                    {row.danhMuc?.doiTuong?.ten ?? "-"}
                  </TableCell>
                  <TableCell>
                    {row.danhMuc?.taiKhoanNo?.ma ?? "-"}
                  </TableCell>
                  <TableCell>
                    {row.danhMuc?.taiKhoanCo?.ma ?? "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.soTien)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => setViewModalPhieu(row)}
                      >
                        Xem
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditingPhieu(row);
                          setFormModalOpen(true);
                        }}
                      >
                        Sửa
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                            disabled={deletingId === row.id}
                          >
                            Xóa
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                            <AlertDialogDescription>
                              Bạn có chắc chắn muốn xóa phiếu{" "}
                              <strong>{row.soPhieu}</strong>? Hành động này
                              không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(row.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Tổng: <strong>{pagination?.total ?? 0}</strong> phiếu
          {pagination && pagination.totalPages > 1 && (
            <> | Trang <strong>{pagination.page}</strong> /{" "}
            <strong>{pagination.totalPages}</strong></>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            disabled={!pagination || pagination.page <= 1}
            onClick={handlePrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            disabled={
              !pagination || pagination.page >= pagination.totalPages
            }
            onClick={handleNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
