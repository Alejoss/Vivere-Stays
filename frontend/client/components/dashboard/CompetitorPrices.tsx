import { useState } from "react";
import { dynamicPricingService } from "../../../shared/api/dynamic";

interface Competitor {
  name: string;
  price: number;
}

const competitorData: Competitor[] = [
  { name: "Villa Maria", price: 64 },
  { name: "Yedrada Alojamientos", price: 63 },
  { name: "Hotel la canela", price: 63 },
  { name: "Hostal mainz", price: 72 },
];

interface PriceHistoryEntry {
  checkin_date: string;
  price: number;
  occupancy_level: 'low' | 'medium' | 'high';
  overwrite: boolean;
  occupancy: number;
}

interface CompetitorPricesProps {
  selectedDate?: { day: number; month: string; year: string };
  propertyId?: string;
  onPriceUpdate?: () => void;
  selectedDayPriceHistory?: PriceHistoryEntry | null;
}

function getOrdinal(n: number) {
  if (n > 3 && n < 21) return "th";
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

export default function CompetitorPrices({
  selectedDate = { day: 1, month: "January", year: "2025" },
  propertyId,
  onPriceUpdate,
  selectedDayPriceHistory,
}: CompetitorPricesProps) {
  const [suggestedPrice, setSuggestedPrice] = useState("66");

  const handleUpdatePrice = async () => {
    if (!propertyId || !selectedDate) return;
    // Convert month name to number
    const monthIndex = new Date(`${selectedDate.month} 1, 2000`).getMonth() + 1;
    const checkinDate = `${selectedDate.year}-${monthIndex
      .toString()
      .padStart(2, "0")}-${selectedDate.day.toString().padStart(2, "0")}`;
    console.log('[handleUpdatePrice] propertyId:', propertyId, 'checkinDate:', checkinDate, 'suggestedPrice:', suggestedPrice);
    try {
      const response = await dynamicPricingService.updateOverwritePrice(
        propertyId,
        checkinDate,
        Number(suggestedPrice)
      );
      console.log('[handleUpdatePrice] API response:', response);
      if (onPriceUpdate) onPriceUpdate();
    } catch (error) {
      console.error('[handleUpdatePrice] API error:', error);
    }
  };

  // Format date as "August 23rd"
  const formattedDate = `${selectedDate.month} ${selectedDate.day}${getOrdinal(selectedDate.day)}`;
  const occupancyValue = selectedDayPriceHistory ? Math.round(selectedDayPriceHistory.occupancy) : null;

  return (
    <div className="flex flex-col p-[23px] border border-hotel-border-light rounded-lg bg-white gap-6">
      {/* Date Display */}
      <div className="text-[2rem] font-bold text-hotel-brand text-center mb-2">
        {formattedDate}
      </div>
      {/* Occupancy */}
      <div className="text-[15px] font-bold text-gray-700 mb-[20px] text-center">
        {occupancyValue !== null ? `Occupancy ${occupancyValue}%` : "Occupancy --"}
      </div>
      {/* Competitor List */}
      <div className="flex flex-col mb-[20px]">
        {competitorData.map((competitor, index) => (
          <div
            key={competitor.name}
            className={`flex justify-between items-center py-[13px] px-[2px] ${
              index < competitorData.length - 1
                ? "border-b-[1.5px] border-hotel-border-light"
                : ""
            }`}
          >
            <span className="text-[14px] font-semibold text-black">
              {competitor.name}
            </span>
            <span className="text-[15px] font-semibold text-gray-600">
              $ {competitor.price}
            </span>
          </div>
        ))}
      </div>
      {/* Suggested Price Section */}
      <div className="border border-blue-300 rounded-[9px] bg-blue-50 p-[15px] flex flex-col items-center gap-2">
        <div className="text-[15px] font-semibold text-blue-700 mb-[11px] text-center">
          Set price for this day
        </div>
        {/* Price Input */}
        <div className="relative w-full mb-[10px]">
          <div className="absolute left-[15px] top-1/2 transform -translate-y-1/2 text-[17px] font-medium text-blue-700">
            $
          </div>
          <input
            type="number"
            value={suggestedPrice}
            onChange={(e) => setSuggestedPrice(e.target.value)}
            className="w-full pl-[35px] pr-[15px] py-[11px] border border-blue-300 rounded-md bg-white text-[16px] font-normal text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Update Button */}
        <button
          onClick={handleUpdatePrice}
          className="w-full py-[11px] bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-[14px] font-medium transition-colors mt-2"
        >
          Update price
        </button>
      </div>
    </div>
  );
}
