import { ChevronDown, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import CompetitorPrices from "./CompetitorPrices";

const priceOptions = [
  "Recommended Price",
  "PMS Price",
  "Competitor Average",
  "MSP",
];

interface RightSidebarProps {
  selectedDate: { day: number; month: string; year: string } | null;
}

export default function RightSidebar({ selectedDate }: RightSidebarProps) {
  const [selectedPrice, setSelectedPrice] = useState("Recommended Price");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="w-full lg:w-[378px] flex flex-col gap-6 p-4 lg:pl-6 lg:pr-6 lg:mr-6">
      {/* Change Prices Button */}
      <div className="flex justify-end">
        <Link
          to="/dashboard/change-prices"
          className="px-[22px] py-[13px] bg-hotel-brand rounded-lg text-white text-[14px] font-medium hover:bg-hotel-brand-dark transition-colors"
        >
          Change Prices
        </Link>
      </div>

      {/* Price Type Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between w-full px-[15px] py-[13px] border border-hotel-border-light rounded-md bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="text-[14px] font-normal text-black">
            {selectedPrice}
          </span>
          <ChevronDown
            size={15}
            className={`text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-hotel-border-light rounded-md shadow-lg z-10">
            {priceOptions.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setSelectedPrice(option);
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-[15px] py-[13px] text-left text-[14px] font-normal hover:bg-gray-50 transition-colors ${
                  selectedPrice === option
                    ? "bg-blue-50 text-blue-700"
                    : "text-black"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Competitor Prices - Only show when date is selected */}
      {selectedDate && (
        <CompetitorPrices
          selectedDate={`${selectedDate.day}/${selectedDate.month === "August" ? "8" : "1"}/${selectedDate.year}`}
        />
      )}

      {/* Warning Messages */}
      <div className="flex flex-col gap-[6px]">
        {/* Profile Warning */}
        <div className="flex items-center gap-[7px] px-[25px] py-[17px] border border-hotel-warning-orange-border rounded-lg bg-hotel-warning-orange-bg">
          <AlertTriangle
            size={25}
            className="text-hotel-warning-orange flex-shrink-0"
          />
          <span className="text-[14px] font-medium text-hotel-warning-orange">
            Complete your profile to get better recommendations
          </span>
        </div>

        {/* MSP Warning */}
        <div className="flex items-center gap-[7px] px-[25px] py-[12px] border border-hotel-warning-red-border rounded-lg bg-hotel-warning-red-bg">
          <AlertTriangle
            size={25}
            className="text-hotel-warning-orange flex-shrink-0"
          />
          <span className="text-[14px] font-medium text-hotel-warning-orange">
            No MSP configured
          </span>
        </div>

        {/* PMS Warning */}
        <div className="flex items-center gap-[7px] px-[25px] py-[17px] border border-hotel-warning-blue-border rounded-lg bg-hotel-warning-blue-bg">
          <AlertTriangle
            size={25}
            className="text-hotel-warning-blue flex-shrink-0"
          />
          <span className="text-[14px] font-medium text-hotel-warning-blue">
            If the PMS is not connected (live mode), changes will not be
            reflected in the PMS.
          </span>
        </div>
      </div>
    </div>
  );
}
