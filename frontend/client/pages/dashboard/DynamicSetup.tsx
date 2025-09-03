import {
  Plus,
  Save,
  ChevronDown,
  TrendingUp,
  Percent,
  DollarSign,
  Users,
  Clock,
  Trash2,
} from "lucide-react";

export default function DynamicSetup() {
  const rules = [
    {
      id: 1,
      incrementType: "Percentage",
      occupancyLevel: ">100% (70%+)",
      leadTime: ">60 days (60+ days)",
      value: "135",
      incrementIcon: Percent,
    },
    {
      id: 2,
      incrementType: "Percentage",
      occupancyLevel: "50% (30-50%)",
      leadTime: "14 days (7-14 days)",
      value: "50",
      incrementIcon: Percent,
    },
    {
      id: 3,
      incrementType: "Percentage",
      occupancyLevel: "30% (0-30%)",
      leadTime: "7 days (3-7 days)",
      value: "20",
      incrementIcon: Percent,
    },
    {
      id: 4,
      incrementType: "Additional",
      occupancyLevel: "Select occupacy",
      leadTime: "Select lead time",
      value: "0",
      incrementIcon: DollarSign,
      isPlaceholder: true,
    },
  ];

  const IncrementTypeSelector = ({
    type,
    icon: Icon,
  }: {
    type: string;
    icon: any;
  }) => (
    <div className="flex items-center justify-between px-3 py-[10px] border border-gray-300 rounded bg-white min-w-[140px]">
      <div className="flex items-center gap-[10px]">
        <Icon size={16} className="text-black" />
        <span className="text-xs text-black">{type}</span>
      </div>
      <ChevronDown size={16} className="text-black rotate-90" />
    </div>
  );

  const OccupancySelector = ({
    level,
    isPlaceholder,
  }: {
    level: string;
    isPlaceholder?: boolean;
  }) => (
    <div className="flex items-center justify-between px-3 py-[9px] border border-gray-300 rounded bg-white min-w-[177px]">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-black" />
        <span
          className={`text-xs ${isPlaceholder ? "text-black" : "text-black"}`}
        >
          {level}
        </span>
      </div>
      <ChevronDown size={16} className="text-black rotate-90" />
    </div>
  );

  const LeadTimeSelector = ({
    time,
    isPlaceholder,
  }: {
    time: string;
    isPlaceholder?: boolean;
  }) => (
    <div className="flex items-center justify-between px-3 py-[9px] border border-gray-300 rounded bg-white min-w-[217px]">
      <div className="flex items-center gap-2">
        <Clock size={18} className="text-black" />
        <span
          className={`text-xs ${isPlaceholder ? "text-black" : "text-black"}`}
        >
          {time}
        </span>
      </div>
      <ChevronDown size={16} className="text-black rotate-90" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp size={34} className="text-[#287CAC]" />
            <h2 className="text-3xl font-bold text-[#287CAC]">
              Dynamic Set Up
            </h2>
          </div>

          {/* Rules Table */}
          <div className="mb-8">
            {/* Table Headers */}
            <div className="grid grid-cols-5 gap-6 mb-4 text-[#494951] font-semibold text-base">
              <div>Increment Type</div>
              <div>Occupancy Level</div>
              <div>Lead Time - Until</div>
              <div>Increment Value</div>
              <div></div>
            </div>

            {/* Divider Line */}
            <div className="w-full h-px bg-hotel-divider mb-5"></div>

            {/* Table Rows */}
            <div className="space-y-5">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  className="grid grid-cols-5 gap-6 items-center"
                >
                  {/* Increment Type */}
                  <div>
                    <IncrementTypeSelector
                      type={rule.incrementType}
                      icon={rule.incrementIcon}
                    />
                  </div>

                  {/* Occupancy Level */}
                  <div>
                    <OccupancySelector
                      level={rule.occupancyLevel}
                      isPlaceholder={rule.isPlaceholder}
                    />
                  </div>

                  {/* Lead Time */}
                  <div>
                    <LeadTimeSelector
                      time={rule.leadTime}
                      isPlaceholder={rule.isPlaceholder}
                    />
                  </div>

                  {/* Increment Value */}
                  <div>
                    <input
                      type="text"
                      value={rule.value}
                      className={`w-full px-3 py-[11px] text-xs border border-gray-300 rounded bg-white ${
                        rule.isPlaceholder ? "text-black" : "text-black"
                      } min-w-[234px]`}
                      readOnly
                    />
                  </div>

                  {/* Actions */}
                  <div>
                    <button className="px-3 py-[10px] border border-gray-300 rounded bg-white text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors min-w-[80px] flex items-center justify-center">
                      <Trash2 size={20} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-8">
            <button className="flex items-center gap-3 px-7 py-3 bg-[#C4D4F5] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-blue-100 transition-colors">
              <Plus size={24} />
              Add Rule
            </button>
            <button className="flex items-center gap-5 px-9 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              <Save size={24} />
              Save Rule
            </button>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-8 mt-8">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-[#294758]">How It Works</h3>
          </div>
          <div className="text-black/60 leading-relaxed space-y-3">
            <p>
              The system automatically creates occupancy and lead time ranges
              from your threshold values and applies increments based on current
              conditions.
            </p>
            <p className="text-xs">
              Example: At 50% occupancy (30-50% range) with 7 days lead time
              (3-7 days range): $20 additional charge
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
