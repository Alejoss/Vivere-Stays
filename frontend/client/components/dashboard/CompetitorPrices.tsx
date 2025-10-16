import { useState } from "react";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { useEffect } from "react";
import type { CompetitorPriceForDate } from "../../../shared/api/dynamic";

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
  onModalClose?: () => void;
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
  onModalClose,
  selectedDayPriceHistory,
}: CompetitorPricesProps) {
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [competitorData, setCompetitorData] = useState<CompetitorPriceForDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!propertyId || !selectedDate) return;
    setLoading(true);
    setError(null);
    setCompetitorData([]);
    // Convert month name to number
    const monthIndex = new Date(`${selectedDate.month} 1, 2000`).getMonth() + 1;
    const checkinDate = `${selectedDate.year}-${monthIndex
      .toString()
      .padStart(2, "0")}-${selectedDate.day.toString().padStart(2, "0")}`;
    dynamicPricingService
      .getCompetitorPricesForDate(propertyId, checkinDate)
      .then((data) => setCompetitorData(data))
      .catch(() => setError("Failed to load competitor prices"))
      .finally(() => setLoading(false));
  }, [propertyId, selectedDate]);

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
      // Close modal after successful update
      if (onModalClose) onModalClose();
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
      <div className="text-responsive-2xl font-bold text-[#287CAC] text-center mb-1">
        {formattedDate}
      </div>
      {/* Occupancy */}
      <div className="text-responsive-base font-semibold text-[#294758] mb-1 text-center">
        {occupancyValue !== null ? `Occupancy ${occupancyValue}%` : "Occupancy --"}
      </div>
      {/* Competitor List */}
      <div className="flex flex-col mb-[20px]">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading competitor prices...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : competitorData.length === 0 ? (
          <div className="text-center text-gray-500 py-4">No competitor data</div>
        ) : (
          competitorData.map((competitor, index) => (
            <div
              key={competitor.id}
              className={`flex justify-between items-center py-[13px] px-[2px] ${
                index < competitorData.length - 1
                  ? "border-b-[1.5px] border-hotel-border-light"
                  : ""
              }`}
            >
              <span className="text-responsive-sm font-semibold text-[#294758]">
                {competitor.name}
              </span>
              <span className="text-responsive-sm font-semibold text-[#8A8E94]">
                {competitor.price !== null && competitor.price !== undefined ? `$${competitor.price}` : "--"}
              </span>
            </div>
          ))
        )}
      </div>
      {/* Suggested Price Section */}
      <div className="border border-blue-300 rounded-[9px] bg-blue-50 p-[15px] flex flex-col items-center gap-2">
        <div className="text-responsive-base font-semibold text-[#287CAC] mb-[11px] text-center">
          Set price for this day
        </div>
        {/* Price Input */}
        <div className="relative w-full mb-[10px]">
          <div className="absolute left-[15px] top-1/2 transform -translate-y-1/2 text-responsive-base font-medium text-[#287CAC]">
            $
          </div>
          <input
            type="number"
            value={suggestedPrice}
            onChange={(e) => setSuggestedPrice(e.target.value)}
            placeholder={selectedDayPriceHistory ? selectedDayPriceHistory.price.toString() : "0"}
            className="w-full pl-[35px] pr-[15px] py-[11px] border border-blue-300 rounded-md bg-white text-responsive-base font-normal text-[#294758] focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Update Button */}
        <button
          onClick={handleUpdatePrice}
          className="w-full py-[11px] bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-responsive-sm font-medium transition-colors mt-2"
        >
          Update price
        </button>
        
        {/* Cancel Button */}
        {onModalClose && (
          <button
            onClick={onModalClose}
            className="w-full py-[11px] bg-gray-500 hover:bg-gray-600 rounded-lg text-white text-responsive-sm font-medium transition-colors mt-2"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
