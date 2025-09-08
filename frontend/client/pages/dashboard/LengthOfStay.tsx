import { Plus, Save, ChevronDown, Calendar, Info, Trash2 } from "lucide-react";
import { useState } from "react";

export default function LengthOfStay() {
  // Lead time categories from DpDynamicIncrementsV2
  const leadTimeCategories = [
    { value: '0-1', label: '0-1 days' },
    { value: '1-3', label: '1-3 days' },
    { value: '3-7', label: '3-7 days' },
    { value: '7-14', label: '7-14 days' },
    { value: '14-30', label: '14-30 days' },
    { value: '30-45', label: '30-45 days' },
    { value: '45-60', label: '45-60 days' },
    { value: '60+', label: '60+ days' },
  ];

  // Occupancy categories from DpDynamicIncrementsV2
  const occupancyCategories = [
    { value: '0-30', label: '0-30%' },
    { value: '30-50', label: '30-50%' },
    { value: '50-70', label: '50-70%' },
    { value: '70-80', label: '70-80%' },
    { value: '80-90', label: '80-90%' },
    { value: '90-100', label: '90-100%' },
    { value: '100+', label: '100%+' },
  ];

  // Weekday options
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // LOS aggregation methods
  const aggregationMethods = [
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
  ];

  // State management
  const [setupRules, setSetupRules] = useState([
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
  ]);

  const [reductionRules, setReductionRules] = useState([
    {
      id: 1,
      leadTime: "60+",
      occupancy: "0-30",
      losFrom: "4",
    },
    {
      id: 2,
      leadTime: "7-14",
      occupancy: "30-50",
      losFrom: "3",
    },
    {
      id: 3,
      leadTime: "3-7",
      occupancy: "100+",
      losFrom: "2",
    },
    {
      id: 4,
      leadTime: "3-7",
      occupancy: "100+",
      losFrom: "2",
    },
  ]);

  const [competitorCount, setCompetitorCount] = useState("2");
  const [aggregationMethod, setAggregationMethod] = useState("min");

  // Helper functions
  const addSetupRule = () => {
    const newRule = {
      id: Math.max(...setupRules.map(r => r.id)) + 1,
      from: "08/16/2025",
      to: "08/16/2025",
      restrictionDay: "Monday",
      losValue: "1",
    };
    setSetupRules([...setupRules, newRule]);
  };

  const removeSetupRule = (id: number) => {
    setSetupRules(setupRules.filter(rule => rule.id !== id));
  };

  const updateSetupRule = (id: number, field: string, value: string) => {
    setSetupRules(setupRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const addReductionRule = () => {
    const newRule = {
      id: Math.max(...reductionRules.map(r => r.id)) + 1,
      leadTime: "0-1",
      occupancy: "0-30",
      losFrom: "1",
    };
    setReductionRules([...reductionRules, newRule]);
  };

  const removeReductionRule = (id: number) => {
    setReductionRules(reductionRules.filter(rule => rule.id !== id));
  };

  const updateReductionRule = (id: number, field: string, value: string) => {
    setReductionRules(reductionRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving LOS configuration:', {
      competitorCount,
      aggregationMethod,
      setupRules,
      reductionRules
    });
  };


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
                    type="number"
                    value={competitorCount}
                    onChange={(e) => setCompetitorCount(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                    min="1"
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
                  <select
                    value={aggregationMethod}
                    onChange={(e) => setAggregationMethod(e.target.value)}
                    className="w-full px-4 py-2 border border-hotel-divider rounded bg-white text-sm font-semibold text-gray-900"
                  >
                    {aggregationMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
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
                  <span className="text-base font-semibold text-center">Actions</span>
                </div>
              </div>

              {/* Table Rows */}
              {setupRules.map((rule, index) => (
                <div key={rule.id} className="grid grid-cols-5 gap-0">
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="date"
                      value={rule.from}
                      onChange={(e) => updateSetupRule(rule.id, 'from', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="date"
                      value={rule.to}
                      onChange={(e) => updateSetupRule(rule.id, 'to', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <select
                      value={rule.restrictionDay}
                      onChange={(e) => updateSetupRule(rule.id, 'restrictionDay', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                    >
                      {weekdays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="number"
                      value={rule.losValue}
                      onChange={(e) => updateSetupRule(rule.id, 'losValue', e.target.value)}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                      min="1"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6] flex justify-center">
                    <button
                      onClick={() => removeSetupRule(rule.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={addSetupRule}
              className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              <Plus size={20} />
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
                    Lead Time
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">
                    Occupancy
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">LOS</span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold text-center">Actions</span>
                </div>
              </div>

              {/* Table Rows */}
              {reductionRules.map((rule) => (
                <div key={rule.id} className="grid grid-cols-4 gap-0">
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <select
                      value={rule.leadTime}
                      onChange={(e) => updateReductionRule(rule.id, 'leadTime', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                    >
                      {leadTimeCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <select
                      value={rule.occupancy}
                      onChange={(e) => updateReductionRule(rule.id, 'occupancy', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white"
                    >
                      {occupancyCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="number"
                      value={rule.losFrom}
                      onChange={(e) => updateReductionRule(rule.id, 'losFrom', e.target.value)}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white"
                      min="1"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6] flex justify-center">
                    <button
                      onClick={() => removeReductionRule(rule.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button 
                onClick={addReductionRule}
                className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                <Plus size={20} />
                Add Reduction Rule
              </button>
              <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                <Save size={20} />
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
