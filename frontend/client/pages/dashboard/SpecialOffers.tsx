import {
  Plus,
  Save,
  Calendar,
  ChevronDown,
  Trash2,
  Info,
  Percent,
} from "lucide-react";

export default function SpecialOffers() {
  const offers = [
    {
      id: 1,
      name: "10% SUPL.OTAS",
      validFrom: "08/16/2025",
      validUntil: "09/16/2025",
      availableFromDays: "15",
      availableUntilDays: "30",
      type: "Percentage",
      value: "30",
    },
    {
      id: 2,
      name: "Summer Discount",
      validFrom: "08/18/2025",
      validUntil: "09/18/2025",
      availableFromDays: "30",
      availableUntilDays: "30",
      type: "Percentage",
      value: "30",
    },
    {
      id: 3,
      name: "",
      validFrom: "MM/DD/YYYY",
      validUntil: "MM/DD/YYYY",
      availableFromDays: "0",
      availableUntilDays: "0",
      type: "Percentage",
      value: "0",
      isPlaceholder: true,
    },
  ];

  const DateInput = ({
    value,
    placeholder,
  }: {
    value: string;
    placeholder?: boolean;
  }) => (
    <div className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded bg-white">
      <span
        className={`text-xs ${placeholder ? "text-gray-400" : "text-black"}`}
      >
        {value}
      </span>
      <Calendar size={17} className="text-black" />
    </div>
  );

  const TypeSelector = () => (
    <div className="flex items-center justify-between px-3 py-2 border border-gray-300 rounded bg-white">
      <div className="flex items-center gap-2">
        <Percent size={16} className="text-black" />
        <span className="text-xs text-black">Percentage</span>
      </div>
      <ChevronDown size={16} className="text-black" />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.25 23.75L23.75 6.25"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.75 12.5C10.8211 12.5 12.5 10.8211 12.5 8.75C12.5 6.67893 10.8211 5 8.75 5C6.67893 5 5 6.67893 5 8.75C5 10.8211 6.67893 12.5 8.75 12.5Z"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21.25 25C23.3211 25 25 23.3211 25 21.25C25 19.1789 23.3211 17.5 21.25 17.5C19.1789 17.5 17.5 19.1789 17.5 21.25C17.5 23.3211 19.1789 25 21.25 25Z"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <h2 className="text-3xl font-bold text-[#287CAC]">
                  Special Offers
                </h2>
                <p className="text-[#8A8E94] font-bold text-lg">
                  Manage your special offers and discounts
                </p>
              </div>
            </div>
          </div>

          {/* Offers Table */}
          <div className="mb-8">
            {/* Table Headers */}
            <div className="grid grid-cols-8 gap-4 mb-4 text-black/70 font-bold text-base">
              <div>Offer Name*</div>
              <div>Valid From*</div>
              <div>Valid Until*</div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span>Available From Days</span>
                  <Info size={17} className="text-gray-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span>Available Until Days</span>
                  <Info size={17} className="text-gray-600" />
                </div>
              </div>
              <div>Type</div>
              <div>Value*</div>
              <div></div>
            </div>

            {/* Table Rows */}
            <div className="space-y-2">
              {offers.map((offer, index) => (
                <div
                  key={offer.id}
                  className="grid grid-cols-8 gap-4 items-center"
                >
                  {/* Offer Name */}
                  <div>
                    <input
                      type="text"
                      value={offer.name}
                      placeholder={offer.isPlaceholder ? "Discount Name" : ""}
                      className={`w-full px-3 py-2 text-xs border border-gray-300 rounded ${
                        offer.isPlaceholder
                          ? "text-gray-400 placeholder-gray-400"
                          : "text-black"
                      }`}
                      readOnly
                    />
                  </div>

                  {/* Valid From */}
                  <div>
                    <DateInput
                      value={offer.validFrom}
                      placeholder={offer.isPlaceholder}
                    />
                  </div>

                  {/* Valid Until */}
                  <div>
                    <DateInput
                      value={offer.validUntil}
                      placeholder={offer.isPlaceholder}
                    />
                  </div>

                  {/* Available From Days */}
                  <div>
                    <input
                      type="text"
                      value={offer.availableFromDays}
                      className={`w-full px-3 py-2 text-xs text-center border border-gray-300 rounded ${
                        offer.isPlaceholder ? "text-gray-400" : "text-black"
                      }`}
                      readOnly
                    />
                  </div>

                  {/* Available Until Days */}
                  <div>
                    <input
                      type="text"
                      value={offer.availableUntilDays}
                      className={`w-full px-3 py-2 text-xs text-center border border-gray-300 rounded ${
                        offer.isPlaceholder ? "text-gray-400" : "text-black"
                      }`}
                      readOnly
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <TypeSelector />
                  </div>

                  {/* Value */}
                  <div>
                    <input
                      type="text"
                      value={offer.value}
                      className={`w-full px-3 py-2 text-xs text-center border border-gray-300 rounded ${
                        offer.isPlaceholder ? "text-gray-400" : "text-black"
                      }`}
                      readOnly
                    />
                  </div>

                  {/* Actions */}
                  <div>
                    <button className="w-full px-5 py-2 border border-red-500 bg-red-50 rounded flex items-center justify-center">
                      <Trash2 size={24} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-8">
            <button className="flex items-center gap-3 px-5 py-3 bg-[#C4D4F5] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-blue-100 transition-colors">
              <Plus size={24} />
              Add Offer
            </button>
            <button className="flex items-center gap-4 px-6 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              <Save size={24} />
              Save Special Offers
            </button>
          </div>

          {/* Created Offers Summary */}
          <div className="bg-[#F9FAFB] border border-[#EBEDF0] rounded-lg p-4 mb-8">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              Created Offers Summary
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-900 font-medium">10% SUPL.OTAS</span>
                <span className="text-gray-500"> — available from</span>
                <span className="text-gray-900"> 01/14/2025 to 02/13/2025</span>
              </p>
              <p>
                <span className="text-gray-900 font-medium">
                  Summer Discount
                </span>
                <span className="text-gray-500"> — available from</span>
                <span className="text-gray-900"> 05/31/2025 to 08/30/2025</span>
              </p>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Info size={25} className="text-[#294758]" />
            <h3 className="text-lg font-bold text-[#294758]">
              Tips for Creating Special Offers
            </h3>
          </div>
          <div className="text-black/60 leading-relaxed space-y-1">
            <p>
              • Define clear start and end dates to avoid overlapping promotions
            </p>
            <p>
              • Use descriptive names (e.g., Summer Discount, Weekend Deal) for
              easy identification
            </p>
            <p>
              • Combine fixed and percentage discounts strategically to attract
              different guests
            </p>
            <p>
              • Schedule offers in advance to align with holidays or local
              events
            </p>
            <p>
              • Keep discounts visible close to check-in dates to increase
              last-minute bookings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
