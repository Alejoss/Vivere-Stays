import { Plus, Save, ChevronDown, Calendar, Info, Trash2 } from "lucide-react";

export default function LengthOfStay() {
  const setupRules = [
    {
      id: 1,
      from: "08/16/2025",
      to: "08/16/2025",
      restrictionDay: "Monday",
      losValue: "2",
    },
    {
      id: 2,
      from: "08/16/2025",
      to: "08/16/2025",
      restrictionDay: "Tuesday",
      losValue: "2",
    },
    {
      id: 3,
      from: "08/16/2025",
      to: "08/16/2025",
      restrictionDay: "Wednesday",
      losValue: "1",
    },
    {
      id: 4,
      from: "08/16/2025",
      to: "08/16/2025",
      restrictionDay: "Saturday",
      losValue: "2",
    },
  ];

  const reductionRules = [
    {
      id: 1,
      leadTime: ">60 days (60+ days)",
      occupancy: "30% (0-30%)",
      losFrom: "4",
    },
    {
      id: 2,
      leadTime: "14 days (7-14 days)",
      occupancy: "50% (30-50%)",
      losFrom: "3",
    },
    {
      id: 3,
      leadTime: "7 days (3-7 days)",
      occupancy: ">100% (70%+)",
      losFrom: "2",
    },
    {
      id: 4,
      leadTime: "7 days (3-7 days)",
      occupancy: ">100% (70%+)",
      losFrom: "2",
    },
  ];

  const DateInput = ({ value }: { value: string }) => (
    <div className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded bg-white min-w-[228px]">
      <span className="text-xs text-black">{value}</span>
      <Calendar size={17} className="text-black" />
    </div>
  );

  const WeekdaySelector = ({
    day,
    hasDropdown = false,
  }: {
    day: string;
    hasDropdown?: boolean;
  }) => (
    <div className="flex items-center justify-between px-4 py-2 border border-hotel-divider rounded bg-white min-w-[150px]">
      <span className="text-sm font-semibold text-gray-900">{day}</span>
      {hasDropdown && (
        <ChevronDown size={16} className="text-black rotate-90" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <Calendar size={34} className="text-[#287CAC]" />
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Length of Stay
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                Price adjustments based on weekdays.
              </p>
            </div>
          </div>

          {/* Algorithm Info Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-[#294758] mb-3">
              Algorithm checks for changes on this tab: Daily at 9am
            </h3>
            <div className="text-black/60 text-base leading-relaxed">
              <p className="mb-4">
                The Dynamic LOS worksheet contains two sets of rules that work
                together to calculate the Length of Stay (LOS) requirements.
              </p>
              <p className="mb-2">
                <strong>How It Works Together:</strong>
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  • Competitor Analysis → The system checks how many competitors
                  apply LOS &gt; 1 for each date.
                </li>
                <li>
                  • Day Preferences → Weekday-specific LOS rules are applied
                  within the chosen date range.
                </li>
                <li>
                  • Combination → The system takes the larger value between
                  competitor-driven LOS and weekday LOS rules.
                </li>
                <li>
                  • Reduction → If lead time and occupancy thresholds are met,
                  the LOS is reduced.
                </li>
                <li>
                  • Final LOS → Produces the recommended LOS for each date.
                </li>
              </ul>
            </div>
          </div>

          {/* LOS Setup Rules */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-black mb-6">
              LOS Setup Rules
            </h3>

            {/* Competitors LOS Section */}
            <div className="mb-6 overflow-hidden rounded-lg border border-[#D0DFE6] max-w-2xl">
              <div className="grid grid-cols-2 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 border-r border-[#D0DFE6]">
                  <span className="text-base font-semibold">
                    Competitors LOS
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">Value</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 border-r border-t border-[#D0DFE6] flex items-center gap-2">
                  <span className="text-base font-semibold">
                    Number of Competitors
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-[#EFF6FF] p-4 border-t border-[#D0DFE6]">
                  <input
                    type="text"
                    value="2"
                    className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 border-r border-t border-[#D0DFE6] flex items-center gap-2">
                  <span className="text-base font-semibold">
                    LOS Aggregation Method
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-[#EFF6FF] p-4 border-t border-[#D0DFE6]">
                  <div className="flex items-center justify-between px-4 py-2 border border-hotel-divider rounded bg-white">
                    <span className="text-sm font-semibold text-gray-900">
                      Minimum
                    </span>
                    <ChevronDown size={16} className="text-black rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Rules Table */}
            <div className="overflow-hidden rounded-lg border border-[#D0DFE6] mb-6">
              {/* Table Headers */}
              <div className="grid grid-cols-5 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">From</span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">To</span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">
                    Restriction Day
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">
                    LOS Value
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold text-center"></span>
                </div>
              </div>

              {/* Table Rows */}
              {setupRules.map((rule, index) => (
                <div key={rule.id} className="grid grid-cols-5 gap-0">
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <DateInput value={rule.from} />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <DateInput value={rule.to} />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <WeekdaySelector
                      day={rule.restrictionDay}
                      hasDropdown={index < 2}
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="text"
                      value={rule.losValue}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                      readOnly
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6] flex justify-center">
                    <Trash2 size={24} className="text-red-500" />
                  </div>
                </div>
              ))}
            </div>

            <button className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Add LOS Set Up Rule
            </button>
          </div>

          {/* Example Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-[#294758] mb-3">Example</h3>
            <div className="text-black/60 text-base leading-relaxed">
              <p>
                If at least 3 competitors show an LOS restriction → apply
                competitor LOS.
              </p>
              <p>
                If Monday and Tuesday require 2 nights → apply weekday rule.
              </p>
              <p>
                The system takes the larger value between competitor-driven LOS
                and weekday LOS rules.
              </p>
            </div>
          </div>

          {/* LOS Reduction Rules */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-black mb-6">
              LOS Reduction Rules
            </h3>

            {/* Reduction Rules Table */}
            <div className="overflow-hidden rounded-lg border border-[#D0DFE6] mb-6">
              {/* Table Headers */}
              <div className="grid grid-cols-4 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">
                    Lead Time - Until
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">
                    Occupancy - Until
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">LOS - From</span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold text-center"></span>
                </div>
              </div>

              {/* Table Rows */}
              {reductionRules.map((rule) => (
                <div key={rule.id} className="grid grid-cols-4 gap-0">
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="text"
                      value={rule.leadTime}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                      readOnly
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="text"
                      value={rule.occupancy}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                      readOnly
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="text"
                      value={rule.losFrom}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                      readOnly
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6] flex justify-center">
                    <Trash2 size={24} className="text-red-500" />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                Add Reduction Rule
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Reduction Logic Info */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-[#294758] mb-3">
            Reduction Logic
          </h3>
          <div className="text-black/60 text-base leading-relaxed">
            <p>
              <strong>Example:</strong> If lead time ≤ 7 days and occupancy ≤
              50% → reduce LOS by 1 night.
            </p>
            <p>
              When conditions match, the LOS is automatically reduced by 1 night
              from the calculated value.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
