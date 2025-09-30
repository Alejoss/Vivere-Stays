import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getDeltaClass, getOuterColor, getStaticWidths } from "@/components/analytics/utils";

export type KPIBar = {
  first: number;
  second: number;
  delta_pct: number | null;
};

export type KPIBarCardProps = {
  title: string;
  top: KPIBar; // Period-to-date vs STLY
  bottom: KPIBar; // Business on books vs STLY
};

export const KPIBarCard: React.FC<KPIBarCardProps> = ({ title, top, bottom }) => {
  return (
    <Card className="bg-white rounded-2xl border-0 w-full mt-0 shadow-[0_10px_30px_rgba(2,8,23,0.08),0_2px_8px_rgba(2,8,23,0.06)]">
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between text-gray-700">
          <div className="text-xl font-semibold">{title}</div>
        </div>
        <div className="h-[1px] bg-gray-300" />

        {/* Row 1: MTD vs STLY */}
        <div>
          <div className="flex items-center justify-between text-gray-600 mb-2">
            <div className="leading-tight">
              <div>Period to Date vs</div>
              <div>STLY</div>
            </div>
            <div className={`flex items-center gap-1 ${getDeltaClass(top.delta_pct)} font-semibold`}>
              {((top.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {(top.delta_pct ?? 0) > 0 ? '+' : ''}{top.delta_pct ?? 0}%
            </div>
          </div>
          {/* Primary bar value */}
          <div className="w-full bg-[#E8EEF1] rounded-sm">
            <div
              className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
              style={{ width: `${getStaticWidths(top.first, top.second).aWidth}%`, backgroundColor: getOuterColor(top.delta_pct ?? 0) }}
            >
              {top.first.toFixed(1)}
            </div>
          </div>
          {/* Benchmark bar */}
          <div
            className="mt-2 h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
            style={{ width: `${getStaticWidths(top.first, top.second).bWidth}%`, backgroundColor: '#C9D7DD' }}
          >
            {top.second.toFixed(1)}
          </div>
        </div>

        {/* Row 2: Forecast vs STLY */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-gray-600 mb-2">
            <div className="leading-tight">
              <div>Business on Books vs</div>
              <div>STLY</div>
            </div>
            <div className={`flex items-center gap-1 ${getDeltaClass(bottom.delta_pct)} font-semibold`}>
              {((bottom.delta_pct ?? 0) < 0) ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              {(bottom.delta_pct ?? 0) > 0 ? '+' : ''}{bottom.delta_pct ?? 0}%
            </div>
          </div>
          {/* Primary bar value */}
          <div className="w-full bg-[#E8EEF1] rounded-sm">
            <div
              className="h-5 rounded-sm flex items-center justify-end pr-4 text-white font-semibold"
              style={{ width: `${getStaticWidths(bottom.first, bottom.second).aWidth}%`, backgroundColor: getOuterColor(bottom.delta_pct ?? 0) }}
            >
              {bottom.first.toFixed(1)}
            </div>
          </div>
          {/* Benchmark bar */}
          <div
            className="mt-2 h-5 rounded-sm flex items-center justify-end pr-4 text-gray-700 font-semibold"
            style={{ width: `${getStaticWidths(bottom.first, bottom.second).bWidth}%`, backgroundColor: '#C9D7DD' }}
          >
            {bottom.second.toFixed(1)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
