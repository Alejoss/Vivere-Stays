import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getOuterColor } from "@/components/analytics/utils";
import { ChartContainer } from "@/components/ui/chart";
import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

export type OccupancyGauge = {
  value: number;
  inner: number;
  benchmark: number;
  delta: number | null;
};

export type OccupancyCardProps = {
  mtd: OccupancyGauge; // Period to date
  forecast: OccupancyGauge; // Business on books
};

// Inline Gauge implementation (previously separate component)
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
          <div className="text-lg font-bold text-[#2A3B47]">
            {centerText ?? `${value}%`}
          </div>
          {subText ? (
            <div className="text-base font-bold mt-0.5" style={{ color: subTextColor ?? innerColor }}>
              {subText}
            </div>
          ) : null}
        </div>
      </div>

      {/* Outer ring */}
      <ChartContainer
        config={{ outer: { label: "Outer", color } }}
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

export const OccupancyCard: React.FC<OccupancyCardProps> = ({ mtd, forecast }) => {
  const mtdOuterColor = getOuterColor(mtd.delta ?? 0);
  const forecastOuterColor = getOuterColor(forecast.delta ?? 0);

  const positive = "text-green-600";
  const negative = "text-red-600";

  return (
    <Card className="bg-white rounded-2xl border-0 w-full mt-0 2xl:col-span-2 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between text-gray-700">
          <div className="text-xl font-semibold">Occupancy</div>
        </div>
        <div className="h-[1px] bg-gray-300 my-3" />

        {/* Gauges Row */}
        <div className="grid grid-cols-2 gap-10 flex items-center justify-center">
          {/* Period-to-Date */}
          <div className="flex flex-col items-center">
            <div className="text-gray-700 font-semibold mb-3">Period-to-Date</div>
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
            <div className={`flex items-center gap-1 ${(mtd.delta ?? 0) < 0 ? negative : positive} font-semibold mt-1`}>
              {(mtd.delta ?? 0) < 0 ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              {(mtd.delta ?? 0) > 0 ? "+" : ""}{mtd.delta ?? 0}%
            </div>
          </div>

          {/* Business on Books */}
          <div className="flex flex-col items-center">
            <div className="text-gray-700 font-semibold mb-3">Business on Books</div>
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
            <div className={`flex items-center gap-1 ${(forecast.delta ?? 0) < 0 ? negative : positive} font-semibold mt-1`}>
              {(forecast.delta ?? 0) < 0 ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
              {(forecast.delta ?? 0) > 0 ? "+" : ""}{forecast.delta ?? 0}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
