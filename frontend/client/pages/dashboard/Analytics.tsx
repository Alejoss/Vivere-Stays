      import { Calendar as CalendarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as React from "react";
import { format } from "date-fns";
import { profilesService } from "../../../shared/api/profiles";
import { analyticsService } from "../../../shared/api/analytics";
import type { DateRange } from "react-day-picker";

const Gauge = ({
  value,
  innerValue = Math.max(0, Math.min(100, value - 15)),
  color = "#5E8DA0",
  innerColor = "#C9D7DD",
  centerText,
  subText,
  subTextColor,
}: {
  value: number;
  innerValue?: number; // percent 0..100
  color?: string;
  innerColor?: string;
  centerText?: string;
  subText?: string;
  subTextColor?: string;
}) => {
  const outerData = [{ name: "outer", value }];
  const innerData = [{ name: "inner", value: innerValue }];

  return (
    <div className="relative w-[230px] h-[230px] overflow-visible mx-auto">
      {/* Center label */}
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="flex flex-col items-center leading-tight">
          <div className="text-[18px] font-bold text-[#2A3B47]">
            {centerText ?? `${value}%`}
          </div>
          {subText ? (
            <div className="text-sm mt-0.5" style={{ color: subTextColor ?? innerColor }}>
              {subText}
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Outer ring */}
      <ChartContainer
        config={{ outer: { label: "Outer", color} }}
        className="absolute inset-0 overflow-visible"
        style={{ aspectRatio: "1 / 1", overflow: "visible" }}
      >
        <RadialBarChart
          width={230}
          height={230}
          cx="50%"
          cy="50%"
          innerRadius={74}
          outerRadius={90}
          barSize={14}
          data={outerData}
          startAngle={90}
          endAngle={-270}
          margin={{ top: 16, bottom: 16, left: 14, right: 14 }}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            background={{ fill: "#E8EEF1" }}
            cornerRadius={999}
            fill={color}
          />
        </RadialBarChart>
      </ChartContainer>

      {/* Inner ring */}
      <ChartContainer
        config={{ inner: { label: "Inner", color: innerColor } }}
        className="absolute inset-0 overflow-visible"
        style={{ aspectRatio: "1 / 1", overflow: "visible" }}
      >
        <RadialBarChart
          width={230}
          height={230}
          cx="50%"
          cy="50%"
          innerRadius={52}
          outerRadius={62}
          barSize={10}
          data={innerData}
          startAngle={120}
          endAngle={-240}
          margin={{ top: 16, bottom: 16, left: 14, right: 14 }}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar
            dataKey="value"
            background={{ fill: "#F0F4F6" }}
            cornerRadius={999}
            fill={innerColor}
          />
        </RadialBarChart>
      </ChartContainer>
    </div>
  );
};

export default function Analytics() {
  const [open, setOpen] = React.useState(false);
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [days, setDays] = React.useState<"7" | "3" | "1">("7");
  const [propertyId, setPropertyId] = React.useState<string | null>(null);
  const [pickupSeries, setPickupSeries] = React.useState<Array<{ name: string; value: number }>>([]);
  const [pickupSeriesAll, setPickupSeriesAll] = React.useState<Array<{ name: string; room_nights: number; bookings: number }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pickupTotals, setPickupTotals] = React.useState<{ current: number; stly: number; delta_pct: number | null }>({ current: 0, stly: 0, delta_pct: null });
  const [pickupTotalsAll, setPickupTotalsAll] = React.useState<{ room_nights: { current: number; stly: number; delta_pct: number | null }; bookings: { current: number; stly: number; delta_pct: number | null } }>({ room_nights: { current: 0, stly: 0, delta_pct: null }, bookings: { current: 0, stly: 0, delta_pct: null } });
  const [metric, setMetric] = React.useState<'all' | 'bookings' | 'room_nights'>('all');
  // Occupancy state from backend (left = period-to-date, right = forecast/Bob)
  const [mtd, setMtd] = React.useState<{ value: number; inner: number; benchmark: number; delta: number | null }>({ value: 0, inner: 0, benchmark: 0, delta: null });
  const [forecast, setForecast] = React.useState<{ value: number; inner: number; benchmark: number; delta: number | null }>({ value: 0, inner: 0, benchmark: 0, delta: null });
  // Summary charts (ADR, RevPAR, Revenue)
  const [charts, setCharts] = React.useState<{
    adr: { top: { first: number; second: number; delta_pct: number | null }; bottom: { first: number; second: number; delta_pct: number | null } };
    revpar: { top: { first: number; second: number; delta_pct: number | null }; bottom: { first: number; second: number; delta_pct: number | null } };
    revenue: { top: { first: number; second: number; delta_pct: number | null }; bottom: { first: number; second: number; delta_pct: number | null } };
  }>({
    adr: { top: { first: 0, second: 0, delta_pct: null }, bottom: { first: 0, second: 0, delta_pct: null } },
    revpar: { top: { first: 0, second: 0, delta_pct: null }, bottom: { first: 0, second: 0, delta_pct: null } },
    revenue: { top: { first: 0, second: 0, delta_pct: null }, bottom: { first: 0, second: 0, delta_pct: null } },
  });

  // Outer ring color based on variation vs last year
  const getOuterColor = (delta: number) => {
    if (delta > 0) return "#16a34a"; // green-600
    if (delta >= -10) return "#f59e0b"; // amber-500 (orange)
    return "#dc2626"; // red-600
  };
  const getDeltaClass = (delta?: number | null) => {
    const d = delta ?? 0;
    if (d > 0) return "text-green-600";
    if (d >= -10) return "text-amber-500";
    return "text-red-600";
  };
  // Static comparison widths: higher = 100%, lower = 85% (15% less)
  const getStaticWidths = (a: number, b: number) => {
    const aHigh = a >= b;
    return { aWidth: aHigh ? 100 : 85, bWidth: aHigh ? 85 : 100 };
  };
  const mtdOuterColor = getOuterColor(mtd.delta);
  const forecastOuterColor = getOuterColor(forecast.delta);

  // Fetch analytics (occupancy + summary charts) with optional date params
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
      if (sum?.charts) setCharts(sum.charts as any);

      // On first load only, sync the visible date range with backend-provided range
      if (firstLoadRef.current && occ.range?.from && occ.range?.to) {
        const fromDate = new Date(occ.range.from);
        const toDate = new Date(occ.range.to);
        if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
          setRange({ from: fromDate, to: toDate });
        }
        firstLoadRef.current = false;
      }
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
  };

  // Load occupancy on initial mount only (no date params; backend decides default)
  React.useEffect(() => {
    fetchAnalytics();
  }, []);

  // Load first available property once
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await profilesService.getUserProperties();
        const first = res.properties?.[0];
        if (active && first?.id) setPropertyId(first.id);
      } catch (e) {
        console.error("Failed to load user properties", e);
      }
    })();
    return () => { active = false; };
  }, []);

  // Fetch pickup series when days/metric change (backend auto-selects property)
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (metric === 'all') {
          const [rn, bk] = await Promise.all([
            analyticsService.getPickup({ days: parseInt(days, 10), value: 'room_nights' }),
            analyticsService.getPickup({ days: parseInt(days, 10), value: 'bookings' }),
          ]);
          if (!cancelled) {
            const byName: Record<string, { name: string; room_nights: number; bookings: number }> = {};
            rn.series.forEach((p: any) => { byName[p.name] = { name: p.name, room_nights: p.rooms_sold ?? 0, bookings: 0 }; });
            bk.series.forEach(p => {
              const existing = byName[p.name];
              if (existing) existing.bookings = (p as any).bookings_made ?? 0; else byName[p.name] = { name: p.name, room_nights: 0, bookings: (p as any).bookings_made ?? 0 };
            });
            // Transform: drop D-0, remap D-x -> D-(x+1), sort ascending
            const transformed = Object.values(byName)
              .filter(p => p.name !== 'D-0')
              .map(p => {
                const idx = parseInt(p.name.split('-')[1] || '0', 10);
                return { ...p, name: `D-${idx + 1}` };
              })
              .sort((a, b) => {
                const ai = parseInt(a.name.split('-')[1] || '0', 10);
                const bi = parseInt(b.name.split('-')[1] || '0', 10);
                return ai - bi;
              });
            setPickupSeriesAll(transformed);
            setPickupSeries([]);
            setPickupTotalsAll({ room_nights: rn.totals, bookings: bk.totals });
          }
        } else {
          const value = metric === 'bookings' ? 'bookings' : 'room_nights';
          const resp = await analyticsService.getPickup({ days: parseInt(days, 10), value });
          if (!cancelled) {
            // Transform: drop D-0, remap D-x -> D-(x+1), sort ascending
            const series = resp.series
              .filter((p: any) => p.name !== 'D-0')
              .map((p: any) => {
                const idx = parseInt((p.name.split('-')[1] || '0'), 10);
                const val = metric === 'bookings' ? (p.bookings_made ?? 0) : (p.rooms_sold ?? 0);
                return { name: `D-${idx + 1}`, value: val };
              })
              .sort((a, b) => {
                const ai = parseInt(a.name.split('-')[1] || '0', 10);
                const bi = parseInt(b.name.split('-')[1] || '0', 10);
                return ai - bi;
              });
            setPickupSeries(series);
            setPickupSeriesAll([]);
            setPickupTotals(resp.totals);
            // Reset combined totals when in single mode
            setPickupTotalsAll({ room_nights: { current: 0, stly: 0, delta_pct: null }, bookings: { current: 0, stly: 0, delta_pct: null } });
          }
        }
      } catch (e: any) {
        console.error("Failed to load pickup", e);
        if (!cancelled) setError(e?.error || "Failed to load pickup");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [days, metric]);

  const positive = "text-green-600";
  const negative = "text-red-600";

  return (
    <div className="p-6 pt-12">
      {/* Date Range (separate row) */}
      <div className="mb-4">
        <div className="text-lg font-semibold text-gray-700 mb-2">Date Range</div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="w-40 justify-start font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {range?.from ? format(range.from, "MMM d, yyyy") : "From"}
              </Button>
              <Button
                variant="outline"
                className="w-40 justify-start font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {range?.to ? format(range.to, "MMM d, yyyy") : "To"}
              </Button>
              <Button
                variant="default"
                className="ml-2"
                onClick={(e) => {
                  e.preventDefault();
                  const params: { from?: string; to?: string } = {};
                  if (range?.from && range?.to) {
                    params.from = format(range.from, 'yyyy-MM-dd');
                    params.to = format(range.to, 'yyyy-MM-dd');
                  }
                  fetchAnalytics(params);
                }}
              >
                Fetch
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0" sideOffset={8}>
            <Calendar
              mode="range"
              selected={range}
              onSelect={(r) => setRange(r)}
              numberOfMonths={2}
              defaultMonth={range?.from}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Cards grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 2xl:grid-cols-5">
        {/* Occupancy Card (left column, spans three rows) */}
        <Card className="bg-white rounded-2xl border-0 w-full mt-0 2xl:col-span-2 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between text-gray-700">
            <div className="text-[20px] font-semibold">Occupancy</div>
            {/* Removed repeated headline value */}
          </div>
          <div className="h-[1px] bg-gray-300 my-3" />

          {/* Gauges Row */}
          <div className="grid grid-cols-2 gap-10 flex items-center justify-center">
            {/* Period-to-Date */}
            <div className="flex flex-col items-center">
              <div className="text-gray-700 font-medium mb-3">Period-to-Date</div>
              <div className="relative scale-[1.0]">
                <Gauge
                  value={mtd.value}
                  innerValue={mtd.inner}
                  color={mtdOuterColor}
                  innerColor="#C9D7DD"
                  centerText={`${mtd.value}%`}
                  subText={`${mtd.benchmark}%`}
                  subTextColor="#C9D7DD"
                />
              </div>
              <div className={`flex items-center gap-1 ${mtd.delta < 0 ? negative : positive} font-semibold mt-1`}>
                {mtd.delta < 0 ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                {mtd.delta > 0 ? "+" : ""}{mtd.delta}%
              </div>
            </div>

            {/* Business on Books */}
            <div className="flex flex-col items-center">
              <div className="text-gray-700 font-medium mb-3">Business on Books</div>
              <div className="relative scale-[1.0]">
                <Gauge
                  value={forecast.value}
                  innerValue={forecast.inner}
                  color={forecastOuterColor}
                  innerColor="#D6DDE1"
                  centerText={`${forecast.value}%`}
                  subText={`${forecast.benchmark}%`}
                  subTextColor="#D6DDE1"
                />
              </div>
              <div className={`flex items-center gap-1 ${forecast.delta < 0 ? negative : positive} font-semibold mt-1`}>
                {forecast.delta < 0 ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
                {forecast.delta > 0 ? "+" : ""}{forecast.delta}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

        {/* KPI Cards */}
        <div className="contents 2xl:grid 2xl:col-span-3 2xl:grid-cols-2 2xl:gap-6">
          {/* Revenue Card (dynamic) */}
          <Card className="bg-white rounded-2xl border-0 w-full mt-0 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
        <CardContent className="p-3 space-y-3">
          {/* Header */}
          
          <div className="flex items-center justify-between text-gray-700">
            <div className="text-[20px] font-semibold">Revenue</div>
          </div>
          <div className="h-[1px] bg-gray-300" />

          {/* Row 1: MTD vs STLY */}
          <div>
            <div className="flex items-center justify-between text-gray-600 mb-2">
              <div className="leading-tight">
                <div>Monthly-to-date vs</div>
                <div>STLY</div>
              </div>
              <div className={`flex items-center gap-1 ${getDeltaClass(charts.revenue.top.delta_pct)} font-semibold`}>
                {((charts.revenue.top.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {(charts.revenue.top.delta_pct ?? 0) > 0 ? '+' : ''}{charts.revenue.top.delta_pct ?? 0}%
              </div>
            </div>
            {/* Primary bar value */}
            <div className="w-full bg-[#E8EEF1] rounded-sm">
              <div
                className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
                style={{ width: `${getStaticWidths(charts.revenue.top.first, charts.revenue.top.second).aWidth}%`, backgroundColor: getOuterColor(charts.revenue.top.delta_pct ?? 0) }}
              >
                {charts.revenue.top.first.toFixed(1)}
              </div>
            </div>
            {/* Benchmark bar */}
            <div
              className="mt-2 bg-[#EDEFF1] h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
              style={{ width: `${getStaticWidths(charts.revenue.top.first, charts.revenue.top.second).bWidth}%` }}
            >
              {charts.revenue.top.second.toFixed(1)}
            </div>
          </div>

          {/* Row 2: Forecast vs LY Actuals */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-gray-600 mb-2">
              <div className="leading-tight">
                <div>Business on Books vs</div>
                <div>STLY</div>
              </div>
              <div className={`flex items-center gap-1 ${getDeltaClass(charts.revenue.bottom.delta_pct)} font-semibold`}>
                {((charts.revenue.bottom.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {(charts.revenue.bottom.delta_pct ?? 0) > 0 ? '+' : ''}{charts.revenue.bottom.delta_pct ?? 0}%
              </div>
            </div>
            {/* Primary bar value */}
            <div className="w-full bg-[#E8EEF1] rounded-sm">
              <div
                className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
                style={{ width: `${getStaticWidths(charts.revenue.bottom.first, charts.revenue.bottom.second).aWidth}%`, backgroundColor: getOuterColor(charts.revenue.bottom.delta_pct ?? 0) }}
              >
                {charts.revenue.bottom.first.toFixed(1)}
              </div>
            </div>
            {/* Benchmark bar */}
            <div
              className="mt-2 bg-[#EDEFF1] h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
              style={{ width: `${getStaticWidths(charts.revenue.bottom.first, charts.revenue.bottom.second).bWidth}%` }}
            >
              {charts.revenue.bottom.second.toFixed(1)}
            </div>
          </div>
        </CardContent>
          </Card>

          {/* Average Daily Rate (ADR) Card - dynamic */}
          <Card className="bg-white rounded-2xl border-0 w-full mt-0 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
        <CardContent className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between text-gray-700">
            <div className="text-[20px] font-semibold">Average Daily Rate</div>
          </div>
          <div className="h-[1px] bg-gray-300" />

          {/* Row 1: MTD vs STLY */}
          <div>
            <div className="flex items-center justify-between text-gray-600 mb-2">
              <div className="leading-tight">
                <div>Monthly-to-date vs</div>
                <div>STLY</div>
              </div>
              <div className={`flex items-center gap-1 ${getDeltaClass(charts.adr.top.delta_pct)} font-semibold`}>
                {((charts.adr.top.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {(charts.adr.top.delta_pct ?? 0) > 0 ? '+' : ''}{charts.adr.top.delta_pct ?? 0}%
              </div>
            </div>
            {/* Primary bar value */}
            <div className="w-full bg-[#E8EEF1] rounded-sm">
              <div
                className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
                style={{ width: `${getStaticWidths(charts.adr.top.first, charts.adr.top.second).aWidth}%`, backgroundColor: getOuterColor(charts.adr.top.delta_pct ?? 0) }}
              >
                {charts.adr.top.first.toFixed(1)}
              </div>
            </div>
            {/* Benchmark bar */}
            <div
              className="mt-2 bg-[#EDEFF1] h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
              style={{ width: `${getStaticWidths(charts.adr.top.first, charts.adr.top.second).bWidth}%` }}
            >
              {charts.adr.top.second.toFixed(1)}
            </div>
          </div>

          {/* Row 2: Forecast vs LY Actuals */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-gray-600 mb-2">
              <div className="leading-tight">
                <div>Monthly forecast vs</div>
                <div>LY Actuals</div>
              </div>
              <div className={`flex items-center gap-1 ${getDeltaClass(charts.adr.bottom.delta_pct)} font-semibold`}>
                {((charts.adr.bottom.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {(charts.adr.bottom.delta_pct ?? 0) > 0 ? '+' : ''}{charts.adr.bottom.delta_pct ?? 0}%
              </div>
            </div>
            {/* Primary bar value */}
            <div className="w-full bg-[#E8EEF1] rounded-sm">
              <div
                className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
                style={{ width: `${getStaticWidths(charts.adr.bottom.first, charts.adr.bottom.second).aWidth}%`, backgroundColor: getOuterColor(charts.adr.bottom.delta_pct ?? 0) }}
              >
                {charts.adr.bottom.first.toFixed(1)}
              </div>
            </div>
            {/* Benchmark bar */}
            <div
              className="mt-2 bg-[#EDEFF1] h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
              style={{ width: `${getStaticWidths(charts.adr.bottom.first, charts.adr.bottom.second).bWidth}%` }}
            >
              {charts.adr.bottom.second.toFixed(1)}
            </div>
          </div>
        </CardContent>
          </Card>

          {/* RevPar Card - dynamic */}
          <Card className="bg-white rounded-2xl border-0 w-full mt-0 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
        <CardContent className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between text-gray-700">
            <div className="text-[20px] font-semibold">RevPar</div>
          </div>
          <div className="h-[1px] bg-gray-300" />

          {/* Row 1: MTD vs STLY */}
          <div>
            <div className="flex items-center justify-between text-gray-600 mb-2">
              <div className="leading-tight">
                <div>Monthly-to-date vs</div>
                <div>STLY</div>
              </div>
              <div className={`flex items-center gap-1 ${getDeltaClass(charts.revpar.top.delta_pct)} font-semibold`}>
                {((charts.revpar.top.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {(charts.revpar.top.delta_pct ?? 0) > 0 ? '+' : ''}{charts.revpar.top.delta_pct ?? 0}%
              </div>
            </div>
            {/* Primary bar value */}
            <div className="w-full bg-[#E8EEF1] rounded-sm">
              <div
                className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
                style={{ width: `${getStaticWidths(charts.revpar.top.first, charts.revpar.top.second).aWidth}%`, backgroundColor: getOuterColor(charts.revpar.top.delta_pct ?? 0) }}
              >
                {charts.revpar.top.first.toFixed(1)}
              </div>
            </div>
            {/* Benchmark bar */}
            <div
              className="mt-2 bg-[#EDEFF1] h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
              style={{ width: `${getStaticWidths(charts.revpar.top.first, charts.revpar.top.second).bWidth}%` }}
            >
              {charts.revpar.top.second.toFixed(1)}
            </div>
          </div>

          {/* Row 2: Forecast vs LY Actuals */}
          <div className="pt-2">
            <div className="flex items-center justify-between text-gray-600 mb-2">
              <div className="leading-tight">
                <div>Monthly forecast vs</div>
                <div>LY Actuals</div>
              </div>
              <div className={`flex items-center gap-1 ${getDeltaClass(charts.revpar.bottom.delta_pct)} font-semibold`}>
                {((charts.revpar.bottom.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                {(charts.revpar.bottom.delta_pct ?? 0) > 0 ? '+' : ''}{charts.revpar.bottom.delta_pct ?? 0}%
              </div>
            </div>
            {/* Primary bar value */}
            <div className="w-full bg-[#E8EEF1] rounded-sm">
              <div
                className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
                style={{ width: `${getStaticWidths(charts.revpar.bottom.first, charts.revpar.bottom.second).aWidth}%`, backgroundColor: getOuterColor(charts.revpar.bottom.delta_pct ?? 0) }}
              >
                {charts.revpar.bottom.first.toFixed(1)}
              </div>
            </div>
            {/* Benchmark bar */}
            <div
              className="mt-2 bg-[#EDEFF1] h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
              style={{ width: `${getStaticWidths(charts.revpar.bottom.first, charts.revpar.bottom.second).bWidth}%` }}
            >
              {charts.revpar.bottom.second.toFixed(1)}
            </div>
          </div>
        </CardContent>
          </Card>
        </div>

        {/* Pickup Card (Full-width new row) */}
        <Card className="bg-white rounded-2xl border-0 w-full mt-6 col-span-1 md:col-span-2 2xl:col-span-5 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
        <CardContent className="p-5 space-y-4">
          {/* Header */}
          <div className="text-[20px] font-semibold text-gray-700">Pickup</div>
          <div className="h-[1px] bg-gray-300" />

          {/* Sub header */}
          <div className="text-[#5E8DA0] text-sm">Pickup last {days === "7" ? "7" : days === "3" ? "3" : "1"} {days === "1" ? "day" : "days"} {metric === 'all' ? '(All)' : metric === 'bookings' ? '(Bookings)' : '(Room nights)'}</div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Select value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
              <SelectTrigger className="w-40 h-8 rounded-full text-sm">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="bookings">Bookings</SelectItem>
                <SelectItem value="room_nights">Room nights</SelectItem>
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={(v) => setDays(v as typeof days)}>
              <SelectTrigger className="w-32 h-8 rounded-full text-sm">
                <SelectValue placeholder="7 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="1">1 day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-[1px] bg-gray-300" />

          {/* Line chart */}
          <ChartContainer config={{}} className="w-full h-44">
            {metric === 'all' ? (
              <LineChart data={pickupSeriesAll} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                {/* Room nights current (blue) */}
                <Line type="monotone" dataKey="room_nights" name="Room nights" stroke="#4B86A1" strokeWidth={2} dot={{ r: 3 }} />
                {/* Bookings current (orange) */}
                <Line type="monotone" dataKey="bookings" name="Bookings" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            ) : (
              <LineChart data={pickupSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                {/* single series (blue) */}
                <Line type="monotone" dataKey="value" stroke="#4B86A1" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            )}
          </ChartContainer>

          {/* Metrics */}
          <div className="space-y-4">
            {error ? (
              <div className="text-red-600 text-sm">{error}</div>
            ) : null}
            {loading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : metric === 'all' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <div className="text-gray-600">Room nights sold</div>
                  <div className="text-[#2E8BC0] text-[22px] font-semibold leading-tight">{pickupTotalsAll.room_nights.current}</div>
                  <div className={`${getDeltaClass(pickupTotalsAll.room_nights.delta_pct)} text-sm font-semibold flex items-center gap-1`}>
                    {pickupTotalsAll.room_nights.delta_pct !== null ? `${pickupTotalsAll.room_nights.delta_pct > 0 ? "+" : ""}${pickupTotalsAll.room_nights.delta_pct}%` : "—"}
                    <span className="font-normal text-gray-600">vs STLY</span>
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Bookings made</div>
                  <div className="text-[#2E8BC0] text-[22px] font-semibold leading-tight">{pickupTotalsAll.bookings.current}</div>
                  <div className={`${getDeltaClass(pickupTotalsAll.bookings.delta_pct)} text-sm font-semibold flex items-center gap-1`}>
                    {pickupTotalsAll.bookings.delta_pct !== null ? `${pickupTotalsAll.bookings.delta_pct > 0 ? "+" : ""}${pickupTotalsAll.bookings.delta_pct}%` : "—"}
                    <span className="font-normal text-gray-600">vs STLY</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-gray-600">{metric === 'bookings' ? 'Bookings made' : 'Room nights sold'}</div>
                <div className="text-[#2E8BC0] text-[22px] font-semibold leading-tight">{pickupTotals.current}</div>
                <div className={`${getDeltaClass(pickupTotals.delta_pct)} text-sm font-semibold flex items-center gap-1`}>
                  {pickupTotals.delta_pct !== null ? `${pickupTotals.delta_pct > 0 ? "+" : ""}${pickupTotals.delta_pct}%` : "—"}
                  <span className="font-normal text-gray-600">vs STLY</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
