import * as React from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";

import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { OccupancyCard, type OccupancyGauge } from "@/components/analytics/OccupancyCard";
import { KPIBarCard, type KPIBar } from "@/components/analytics/KPIBarCard";
import { analyticsService } from "../../../shared/api/analytics";

type ChartsState = {
  adr: { top: KPIBar; bottom: KPIBar };
  revpar: { top: KPIBar; bottom: KPIBar };
  revenue: { top: KPIBar; bottom: KPIBar };
};

export default function AnalyticsPerformance() {
  const [range, setRange] = React.useState<DateRange | undefined>(() => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { from: lastMonth, to: today };
  });

  const [mtd, setMtd] = React.useState<OccupancyGauge>({ value: 0, inner: 0, benchmark: 0, delta: null });
  const [forecast, setForecast] = React.useState<OccupancyGauge>({ value: 0, inner: 0, benchmark: 0, delta: null });
  const [charts, setCharts] = React.useState<ChartsState>({
    adr: { top: { first: 0, second: 0, delta_pct: null }, bottom: { first: 0, second: 0, delta_pct: null } },
    revpar: { top: { first: 0, second: 0, delta_pct: null }, bottom: { first: 0, second: 0, delta_pct: null } },
    revenue: { top: { first: 0, second: 0, delta_pct: null }, bottom: { first: 0, second: 0, delta_pct: null } },
  });

  const firstLoadRef = React.useRef(true);

  const fetchAnalytics = async (params?: { from?: string; to?: string }) => {
    try {
      const [occ, sum] = await Promise.all([
        analyticsService.getOccupancy(params),
        analyticsService.getSummary(params ?? {}),
      ]);

      const left = occ.occupancy.left;
      const right = occ.occupancy.right;
      setMtd({ value: left.outer ?? 0, inner: left.inner ?? 0, benchmark: left.inner ?? 0, delta: left.delta_pct ?? null });
      setForecast({ value: right.outer ?? 0, inner: right.inner ?? 0, benchmark: right.inner ?? 0, delta: right.delta_pct ?? null });
      if (sum?.charts) setCharts(sum.charts as unknown as ChartsState);

      // Sync initial range to backend-provided range (once)
      if (firstLoadRef.current && occ.range?.from && occ.range?.to) {
        const fromDate = new Date(occ.range.from);
        const toDate = new Date(occ.range.to);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          setRange({ from: fromDate, to: toDate });
        }
        firstLoadRef.current = false;
      }
    } catch (e) {
      console.error("Failed to load performance analytics", e);
    }
  };

  // Initial load
  React.useEffect(() => {
    fetchAnalytics();
  }, []);

  // Debounced fetch on range change
  React.useEffect(() => {
    if (!range?.from || !range?.to) return;
    const id = setTimeout(() => {
      fetchAnalytics({
        from: format(range.from!, "yyyy-MM-dd"),
        to: format(range.to!, "yyyy-MM-dd"),
      });
    }, 250);
    return () => clearTimeout(id);
  }, [range?.from, range?.to]);

  return (
    <div className="p-6 pt-12">
      <DateRangePicker range={range} onChange={setRange} />

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 2xl:grid-cols-5">
        {/* Occupancy */}
        <OccupancyCard mtd={mtd} forecast={forecast} />

        {/* KPI Cards */}
        <div className="contents 2xl:grid 2xl:col-span-3 2xl:grid-cols-2 2xl:gap-6">
          <KPIBarCard title="Revenue" top={charts.revenue.top} bottom={charts.revenue.bottom} />
          <KPIBarCard title="Average Daily Rate" top={charts.adr.top} bottom={charts.adr.bottom} />
          <KPIBarCard title="RevPAR" top={charts.revpar.top} bottom={charts.revpar.bottom} />
        </div>
      </div>
    </div>
  );
}
