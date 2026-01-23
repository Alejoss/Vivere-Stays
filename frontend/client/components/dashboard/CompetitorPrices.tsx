import { useState, useEffect, useMemo } from "react";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { useTranslation } from "react-i18next";
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

function getOrdinal(n: number, locale: string = 'en') {
  // Spanish doesn't use ordinals
  if (locale === 'es') return '';
  
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
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [competitorData, setCompetitorData] = useState<CompetitorPriceForDate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize month names - only recalculate when language changes
  const monthNames = useMemo(() => [
    t('dashboard:calendar.months.january'),
    t('dashboard:calendar.months.february'),
    t('dashboard:calendar.months.march'),
    t('dashboard:calendar.months.april'),
    t('dashboard:calendar.months.may'),
    t('dashboard:calendar.months.june'),
    t('dashboard:calendar.months.july'),
    t('dashboard:calendar.months.august'),
    t('dashboard:calendar.months.september'),
    t('dashboard:calendar.months.october'),
    t('dashboard:calendar.months.november'),
    t('dashboard:calendar.months.december'),
  ], [t, i18n.language]);

  // Convert translated month name to month number (1-12)
  // This works regardless of language by finding the index in the translated array
  // Memoize this function to avoid recreating it on every render
  const getMonthNumber = useMemo(() => {
    return (monthName: string): number => {
      const index = monthNames.findIndex(name => name.toLowerCase() === monthName.toLowerCase());
      if (index === -1) {
        // Fallback: try English month names if translation doesn't match
        const englishMonths = ['january', 'february', 'march', 'april', 'may', 'june', 
                              'july', 'august', 'september', 'october', 'november', 'december'];
        const englishIndex = englishMonths.findIndex(name => name.toLowerCase() === monthName.toLowerCase());
        if (englishIndex !== -1) {
          return englishIndex + 1;
        }
        // Last resort: try Date parsing (only works for English)
        const parsed = new Date(`${monthName} 1, 2000`).getMonth() + 1;
        return isNaN(parsed) ? 1 : parsed; // Default to January if all fails
      }
      return index + 1; // +1 because months are 1-indexed
    };
  }, [monthNames]);

  useEffect(() => {
    console.log('[CompetitorPrices] useEffect triggered with:', { propertyId, selectedDate });
    if (!propertyId || !selectedDate) {
      console.log('[CompetitorPrices] Missing required props, skipping API call');
      return;
    }
    setLoading(true);
    setError(null);
    setCompetitorData([]);
    // Convert month name to number using locale-aware function
    const monthIndex = getMonthNumber(selectedDate.month);
    const checkinDate = `${selectedDate.year}-${monthIndex
      .toString()
      .padStart(2, "0")}-${selectedDate.day.toString().padStart(2, "0")}`;
    
    console.log('[CompetitorPrices] Making API call with:', { propertyId, checkinDate, monthIndex, monthName: selectedDate.month });
    
    dynamicPricingService
      .getCompetitorPricesForDate(propertyId, checkinDate)
      .then((data) => {
        console.log('[CompetitorPrices] API response received:', data);
        setCompetitorData(data);
      })
      .catch((error) => {
        console.error('[CompetitorPrices] API call failed:', error);
        const errorMsg = error?.response?.data?.message || error?.message || t('dashboard:competitorPrices.loadError', { defaultValue: 'Failed to load competitor prices' });
        setError(errorMsg);
      })
      .finally(() => {
        console.log('[CompetitorPrices] API call completed');
        setLoading(false);
      });
  }, [propertyId, selectedDate, getMonthNumber]);

  const handleUpdatePrice = async () => {
    if (!propertyId || !selectedDate) return;
    // Convert month name to number using locale-aware function
    const monthIndex = getMonthNumber(selectedDate.month);
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
    } catch (error: any) {
      console.error('[handleUpdatePrice] API error:', error);
      const errorMsg = error?.response?.data?.message || error?.message || t('dashboard:competitorPrices.updateError', { defaultValue: 'Failed to update price' });
      setError(errorMsg);
    }
  };

  // Format date - use ordinal for English, plain number for Spanish
  const formattedDate = i18n.language === 'es' 
    ? `${selectedDate.day} de ${selectedDate.month}`
    : `${selectedDate.month} ${selectedDate.day}${getOrdinal(selectedDate.day, i18n.language)}`;
  const occupancyValue = selectedDayPriceHistory && selectedDayPriceHistory.occupancy !== undefined && selectedDayPriceHistory.occupancy !== null
    ? Math.round(selectedDayPriceHistory.occupancy)
    : null;

  return (
    <div className="flex flex-col p-[23px] border border-hotel-border-light rounded-lg bg-white gap-6">
      {/* Date Display */}
      <div className="text-responsive-2xl font-bold text-[#287CAC] text-center mb-1">
        {formattedDate}
      </div>
      {/* Occupancy */}
      <div className="text-responsive-base font-semibold text-[#294758] mb-1 text-center">
        {occupancyValue !== null 
          ? t('dashboard:calendar.occupancyWithValue', { value: occupancyValue })
          : t('dashboard:calendar.occupancyNoData')}
      </div>
      {/* Competitor List */}
      <div className="flex flex-col mb-[20px]">
        {loading ? (
          <div className="text-center text-gray-500 py-4">Loading competitor prices...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-4">{error}</div>
        ) : competitorData.filter(c => c.sold_out || (c.price !== null && c.price !== undefined && c.price !== 0)).length === 0 ? (
          <div className="text-center text-gray-500 py-4">No competitor data</div>
        ) : (
          competitorData
            .filter((competitor) => competitor.sold_out || (competitor.price !== null && competitor.price !== undefined && competitor.price !== 0))
            .map((competitor, index, arr) => (
            <div
              key={competitor.id}
              className={`flex justify-between items-center py-[13px] px-[2px] ${
                index < arr.length - 1
                  ? "border-b-[1.5px] border-hotel-border-light"
                  : ""
              }`}
            >
              <span className="text-responsive-sm font-semibold text-[#294758]">
                {competitor.name}
              </span>
              <span className="text-responsive-sm font-semibold text-[#8A8E94]">
                {competitor.sold_out
                  ? t('dashboard:calendar.soldOut')
                  : (competitor.price !== null && competitor.price !== undefined
                      ? `$${competitor.price}`
                      : "--")}
              </span>
            </div>
          ))
        )}
      </div>
      {/* Suggested Price Section */}
      <div className="border border-blue-300 rounded-[9px] bg-blue-50 p-[15px] flex flex-col items-center gap-2">
        <div className="text-responsive-base font-semibold text-[#287CAC] mb-[11px] text-center">
          {t('dashboard:calendar.setPriceForThisDay')}
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
          {t('dashboard:calendar.updatePrice')}
        </button>
        
        {/* Cancel Button */}
        {onModalClose && (
          <button
            onClick={onModalClose}
            className="w-full py-[11px] bg-gray-500 hover:bg-gray-600 rounded-lg text-white text-responsive-sm font-medium transition-colors mt-2"
          >
            {t('common:buttons.cancel')}
          </button>
        )}
      </div>
    </div>
  );
}
