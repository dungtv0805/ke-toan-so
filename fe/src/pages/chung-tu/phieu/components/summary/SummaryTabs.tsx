import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { usePhieuState, usePhieuHandler } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";
import { TABLE_CONTAINER, TABLE_DENSITY } from "../../lib/tableStyles";
import { cn } from "@/lib/utils";
import { PhieuSummaryType } from "@/services/phieuService";

interface TabDef {
  type: PhieuSummaryType;
  label: string;
}

const SUMMARY_TABS: TabDef[] = [
  { type: "account", label: "Tài khoản" },
  { type: "team", label: "Đội" },
  { type: "employee", label: "Nhân viên" },
  { type: "project", label: "Dự án" },
  { type: "investor", label: "Chủ đầu tư" },
  { type: "product", label: "Sản phẩm" },
  { type: "cash-flow", label: "Dòng tiền" },
  { type: "management-group", label: "Nhóm QL" },
  { type: "promotion-group", label: "Nhóm KM" },
];

export function SummaryTabs() {
  const handler = usePhieuHandler();
  const [summaryData] = usePhieuState("summaryData", {} as Record<string, import("@/services/phieuService").PhieuSummaryItem[]>);
  const [summaryLoading] = usePhieuState("summaryLoading", {} as Record<string, boolean>);
  // Tabs đã từng nạp — nguồn sự thật ở handler để `refresh` (sau khi
  // thêm/sửa/xoá) reload đúng các tab này; tab chưa mở vẫn lazy-load.
  const [loadedTypes] = usePhieuState("summaryLoadedTypes", [] as PhieuSummaryType[]);

  const handleTabChange = (type: string) => {
    if (!loadedTypes.includes(type as PhieuSummaryType)) {
      handler.executeEvent("loadSummary", { type: type as PhieuSummaryType });
    }
  };

  // Load the first tab on mount (nếu chưa nạp)
  useEffect(() => {
    const firstType = SUMMARY_TABS[0].type;
    if (!loadedTypes.includes(firstType)) {
      handler.executeEvent("loadSummary", { type: firstType });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Tabs defaultValue={SUMMARY_TABS[0].type} onValueChange={handleTabChange}>
      <TabsList className="flex-wrap h-auto gap-1">
        {SUMMARY_TABS.map((tab) => (
          <TabsTrigger key={tab.type} value={tab.type}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {SUMMARY_TABS.map((tab) => {
        const rows = summaryData[tab.type] ?? [];
        const loading = summaryLoading[tab.type] ?? false;

        return (
          <TabsContent key={tab.type} value={tab.type}>
            <div className={cn(TABLE_CONTAINER, "mt-2")}>
              <Table className={cn(TABLE_DENSITY)}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên / Mã</TableHead>
                    <TableHead className="text-right">Phát sinh Nợ</TableHead>
                    <TableHead className="text-right">Phát sinh Có</TableHead>
                    <TableHead className="text-right">Số lượng</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground py-6"
                      >
                        Không có dữ liệu
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, idx) => (
                      <TableRow key={`${row.key}-${idx}`}>
                        <TableCell>{row.ten ?? row.key}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.phatSinhNo)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(row.phatSinhCo)}
                        </TableCell>
                        <TableCell className="text-right">{row.soLuong}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
