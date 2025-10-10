import * as React from "react";
import { useTranslation } from "react-i18next";
import { analyticsService } from "../../../shared/api/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { getDeltaClass } from "@/components/analytics/utils";

type Days = "3" | "7" | "15";
type Metric = "bookings" | "room_nights";

export default function AnalyticsPickup() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [days, setDays] = React.useState<Days>("7");
  const [metric, setMetric] = React.useState<Metric>("room_nights");
  const [series, setSeries] = React.useState<Array<{ name: string; value: number; stly: number }>>([]);
  const [totals, setTotals] = React.useState<{ current: number; stly: number; delta_pct: number | null }>({ current: 0, stly: 0, delta_pct: null });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const value = metric === 'bookings' ? 'bookings' : 'room_nights';
        const resp = await analyticsService.getPickup({ days: parseInt(days, 10), value });
        if (!cancelled) {
          // Transform: drop D-0 when days > 1, remap D-x -> D-(x+1), sort ascending
          const transformed = resp.series
            .filter((p: any) => !(resp.days > 1 && p.name === 'D-0'))
            .map((p: any) => {
              const idx = parseInt((p.name.split('-')[1] || '0'), 10);
              const val = metric === 'bookings' ? (p.bookings_made ?? 0) : (p.rooms_sold ?? 0);
              const stlyVal = p.stly ?? 0;
              return { name: `D-${idx + 1}`, value: val, stly: stlyVal };
            })
            .sort((a, b) => {
              const ai = parseInt(a.name.split('-')[1] || '0', 10);
              const bi = parseInt(b.name.split('-')[1] || '0', 10);
              return ai - bi;
            });
          setSeries(transformed);
          setTotals(resp.totals);
        }
      } catch (e: any) {
        console.error("Failed to load pickup", e);
        if (!cancelled) setError(t('dashboard:analytics.pickup.loadError', { defaultValue: 'Failed to load pickup data' }));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [days, metric]);

  return (
    <div className="p-6 pt-12">
      <div className="grid gap-6 grid-cols-1">
        <Card className="bg-white rounded-2xl border-0 w-full mt-0 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
          <CardContent className="p-5 space-y-4">
            {/* Header */}
            <div className="text-xl font-semibold text-gray-700">{t('dashboard:analytics.pickup.title', { defaultValue: 'Pickup' })}</div>
            <div className="h-[1px] bg-gray-300" />

            {/* Sub header */}
            <div className="text-[#5E8DA0] text-sm">
              {t('dashboard:analytics.pickup.subtitle', { days, metric: metric === 'bookings' ? `(${t('dashboard:analytics.pickup.bookings')})` : `(${t('dashboard:analytics.pickup.roomNights')})`, defaultValue: `Pickup last ${days} days ${metric === 'bookings' ? '(Bookings)' : '(Room nights)'}` })}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <Select value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
                <SelectTrigger className="w-40 h-8 rounded-full text-sm">
                  <SelectValue placeholder="Metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bookings">{t('dashboard:analytics.pickup.bookings', { defaultValue: 'Bookings' })}</SelectItem>
                  <SelectItem value="room_nights">{t('dashboard:analytics.pickup.roomNights', { defaultValue: 'Room nights' })}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={days} onValueChange={(v) => setDays(v as typeof days)}>
                <SelectTrigger className="w-32 h-8 rounded-full text-sm">
                  <SelectValue placeholder="7 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">{t('dashboard:analytics.pickup.threeDays', { defaultValue: '3 days' })}</SelectItem>
                  <SelectItem value="7">{t('dashboard:analytics.pickup.sevenDays', { defaultValue: '7 days' })}</SelectItem>
                  <SelectItem value="15">{t('dashboard:analytics.pickup.fifteenDays', { defaultValue: '15 days' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-[1px] bg-gray-300" />

            {/* Line chart */}
            <ChartContainer config={{}} className="w-full h-44">
              <LineChart data={series} margin={{ top: 8, right: 12, left: 40, bottom: 0 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => value.toString()}
                  domain={[0, (dataMax: number) => Math.max(dataMax, 5)]}
                />
                {/* Current */}
                <Line type="monotone" dataKey="value" stroke="#4B86A1" strokeWidth={2} dot={{ r: series.length === 1 ? 5 : 4, fill: "#4B86A1" }} connectNulls={false} />
                {/* STLY */}
                <Line type="monotone" dataKey="stly" stroke="#C9D7DD" strokeWidth={2} dot={{ r: series.length === 1 ? 5 : 4, fill: "#C9D7DD" }} connectNulls={false} />
              </LineChart>
            </ChartContainer>

            {/* Metrics */}
            <div className="space-y-4">
              {error ? (
                <div className="text-red-600 text-sm">{error}</div>
              ) : null}
              {loading ? (
                <div className="text-gray-500 text-sm">Loading...</div>
              ) : (
                <div>
                  <div className="text-gray-600">{metric === 'bookings' ? 'Bookings made' : 'Room nights sold'}</div>
                  <div className="text-[#2E8BC0] text-2xl font-semibold leading-tight">{totals.current}</div>
                  <div className={`${getDeltaClass(totals.delta_pct)} text-sm font-semibold flex items-center gap-1`}>
                    {totals.delta_pct !== null ? `${totals.delta_pct > 0 ? "+" : ""}${totals.delta_pct}%` : "-"}
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
