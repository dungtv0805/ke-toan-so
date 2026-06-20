import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePhieuState, usePhieuConfig } from "../../PhieuHandlerContext";
import { formatCurrency } from "../../lib/format";

export function StatsCards() {
  const [stats] = usePhieuState("stats", { tongSo: 0, tongTien: 0 });
  const config = usePhieuConfig();

  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng số phiếu
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="text-2xl font-bold">{stats.tongSo}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1 pt-4">
          <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tổng tiền
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className={`text-2xl font-bold ${config.accentClass}`}>
            {formatCurrency(stats.tongTien)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
