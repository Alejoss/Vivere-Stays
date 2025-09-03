import { Plus, Save, ChevronDown, Percent, Trash2 } from "lucide-react";

export default function AvailableRates() {
  const rates = [
    {
      id: 1,
      roomId: "ROOM001",
      roomName: "Standard Double",
      rateId: "RATE001",
      rateName: "Flexible Rate",
      rateCategory: "Flexible",
      calculationType: "Percentage",
      calculationValue: "0",
      enabled: true,
      featured: true,
    },
    {
      id: 2,
      roomId: "ROOM002",
      roomName: "Deluxe Room",
      rateId: "RATE002",
      rateName: "Premium Rate",
      rateCategory: "Non-refundable",
      calculationType: "Percentage",
      calculationValue: "20",
      enabled: false,
    },
    {
      id: 3,
      roomId: "ROOM003",
      roomName: "Suite",
      rateId: "RATE003",
      rateName: "Luxury Rate",
      rateCategory: "Advance Purchase",
      calculationType: "Percentage",
      calculationValue: "25",
      enabled: false,
    },
    {
      id: 4,
      roomId: "ROOM004",
      roomName: "Room Name",
      rateId: "RATE004",
      rateName: "Rate Name",
      rateCategory: "Advance Purchase",
      calculationType: "Percentage",
      calculationValue: "0",
      enabled: false,
      placeholder: true,
    },
  ];

  const CategorySelector = ({
    category,
    hasDropdown = false,
  }: {
    category: string;
    hasDropdown?: boolean;
  }) => (
    <div className="flex items-center justify-between px-4 py-2 border border-hotel-divider rounded bg-white">
      <span className="text-sm font-normal text-black">{category}</span>
      {hasDropdown && (
        <ChevronDown size={16} className="text-black rotate-90" />
      )}
    </div>
  );

  const CalculationTypeSelector = ({ type }: { type: string }) => (
    <div className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white">
      <div className="flex items-center gap-2">
        <Percent size={16} className="text-black" />
        <span className="text-xs text-black">{type}</span>
      </div>
      <ChevronDown size={16} className="text-black rotate-90" />
    </div>
  );

  const ToggleSwitch = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: () => void;
  }) => (
    <div
      className={`relative w-14 h-7 rounded-full cursor-pointer transition-colors ${
        enabled ? "bg-hotel-brand-dark" : "bg-gray-300"
      }`}
      onClick={onChange}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
          enabled ? "translate-x-7" : "translate-x-0.5"
        }`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <svg
              width="34"
              height="34"
              viewBox="0 0 34 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M27.4219 14.8906H13.7109V22.8416H12.2506V20.1389C12.2489 18.6077 11.6399 17.1396 10.5571 16.0569C9.47436 14.9741 8.00632 14.365 6.47506 14.3633H3.16406V10.1445H1.05469V32.8203H3.16406V29.6732L30.5859 29.8926V32.8203H32.6953V20.1641C32.6937 18.7659 32.1376 17.4255 31.149 16.4369C30.1604 15.4483 28.82 14.8922 27.4219 14.8906ZM3.16406 16.4727H6.47506C7.44704 16.4738 8.37891 16.8604 9.06621 17.5477C9.75351 18.235 10.1401 19.1668 10.1412 20.1388V22.8415H3.16406V16.4727ZM30.5859 27.7831L3.16406 27.5638V24.951H30.5859V27.7831ZM30.5859 22.8416H15.8203V17H27.4219C28.2607 17.001 29.065 17.3346 29.6581 17.9278C30.2513 18.521 30.585 19.3252 30.5859 20.1641V22.8416Z"
                fill="#287CAC"
              />
            </svg>
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Available Rates
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                Price variations depending on room type.
              </p>
            </div>
          </div>

          {/* Rates Table */}
          <div className="mb-8">
            {/* Table Headers */}
            <div className="grid grid-cols-8 gap-4 mb-4 text-[#375A7D] font-bold text-base">
              <div>Room ID</div>
              <div>Room Name</div>
              <div>Rate ID</div>
              <div>Rate Name</div>
              <div>Rate Category</div>
              <div>Calculation Type</div>
              <div>Calculation Value</div>
              <div>Select as Base</div>
            </div>

            {/* Divider Line */}
            <div className="w-full h-px bg-hotel-divider mb-5"></div>

            {/* Table Rows */}
            <div className="space-y-3">
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className="grid grid-cols-8 gap-4 items-center"
                >
                  {/* Room ID */}
                  <div>
                    <div
                      className={`px-3 py-2 text-sm font-normal border rounded ${
                        rate.featured
                          ? "bg-hotel-brand-dark text-white border-hotel-brand-dark"
                          : "bg-white text-black border-hotel-divider"
                      } ${rate.placeholder ? "text-gray-500" : ""}`}
                    >
                      {rate.roomId}
                    </div>
                  </div>

                  {/* Room Name */}
                  <div>
                    <div
                      className={`px-3 py-2 text-sm font-normal border rounded ${
                        rate.featured
                          ? "bg-hotel-brand-dark text-white border-hotel-brand-dark"
                          : "bg-white text-black border-hotel-divider"
                      } ${rate.placeholder ? "text-gray-500" : ""}`}
                    >
                      {rate.roomName}
                    </div>
                  </div>

                  {/* Rate ID */}
                  <div>
                    <div
                      className={`px-3 py-2 text-sm font-normal border rounded ${
                        rate.featured
                          ? "bg-hotel-brand-dark text-white border-hotel-brand-dark"
                          : "bg-white text-black border-hotel-divider"
                      } ${rate.placeholder ? "text-gray-500" : ""}`}
                    >
                      {rate.rateId}
                    </div>
                  </div>

                  {/* Rate Name */}
                  <div>
                    <div
                      className={`px-3 py-2 text-sm font-normal border rounded ${
                        rate.featured
                          ? "bg-hotel-brand-dark text-white border-hotel-brand-dark"
                          : "bg-white text-black border-hotel-divider"
                      } ${rate.placeholder ? "text-gray-500" : ""}`}
                    >
                      {rate.rateName}
                    </div>
                  </div>

                  {/* Rate Category */}
                  <div>
                    {rate.featured ? (
                      <div className="flex items-center justify-between px-3 py-2 bg-hotel-brand-dark text-white border border-hotel-brand-dark rounded">
                        <span className="text-sm font-normal">
                          {rate.rateCategory}
                        </span>
                        <ChevronDown
                          size={16}
                          className="text-white rotate-90"
                        />
                      </div>
                    ) : (
                      <CategorySelector
                        category={rate.rateCategory}
                        hasDropdown={!rate.placeholder}
                      />
                    )}
                  </div>

                  {/* Calculation Type */}
                  <div>
                    {rate.featured ? (
                      <div className="flex items-center justify-between px-3 py-2 bg-hotel-brand-dark text-white border border-hotel-brand-dark rounded">
                        <div className="flex items-center gap-2">
                          <Percent size={16} className="text-white" />
                          <span className="text-xs">
                            {rate.calculationType}
                          </span>
                        </div>
                        <ChevronDown
                          size={16}
                          className="text-white rotate-90"
                        />
                      </div>
                    ) : (
                      <CalculationTypeSelector type={rate.calculationType} />
                    )}
                  </div>

                  {/* Calculation Value */}
                  <div>
                    <input
                      type="text"
                      value={rate.calculationValue}
                      className={`w-full px-3 py-2 text-sm text-center border rounded ${
                        rate.featured
                          ? "bg-hotel-brand-dark text-white border-hotel-brand-dark"
                          : "bg-white text-black border-hotel-divider"
                      } ${rate.placeholder ? "text-gray-500" : ""}`}
                    />
                  </div>

                  {/* Select */}
                  <div className="flex items-center justify-center">
                    <ToggleSwitch enabled={rate.enabled} onChange={() => {}} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center mb-8">
            <button className="flex items-center gap-5 px-7 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              <Save size={24} />
              Save
            </button>
          </div>
        </div>

        {/* Algorithm Info Section */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-[#294758] mb-3">
            Algorithm checks for changes on this tab: Daily at 9am
          </h3>
          <div className="text-black/60 text-base leading-relaxed">
            <p className="mb-4">
              The Available Rates worksheet defines how different room rates are
              calculated and displayed.
            </p>
            <p className="mb-2">
              <strong>How It Works Together:</strong>
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                • Room Setup → Each room is linked to a base rate ID and a rate
                name for identification.
              </li>
              <li>
                • Rate Categories → Rates are classified (e.g., Flexible,
                Non-refundable, Advance Purchase).
              </li>
              <li>
                • Calculation Type → Define if the adjustment is a fixed amount
                or a percentage.
              </li>
              <li>
                • Calculation Value → Numeric adjustment applied to the base
                rate.
              </li>
              <li>
                • Activation → Switch controls which rates are active and
                visible.
              </li>
              <li>
                • Final Available Rates → Produces the list of active rates that
                will be shown to users.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
