import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Lock, AlertTriangle } from "lucide-react";
import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { usePriceHistory, useMSPPriceHistory, useCompetitorAveragePriceHistory, useUserProperties, useProperty } from "../../../shared/api/hooks";
import { dynamicPricingService } from "../../../shared/api/dynamic";

type CalendarCell = {
  day: number;
  price: string;
  occupancy: string;
  overwrite: boolean;
  isNoMSP?: boolean; // Flag to indicate when to show "No MSP" with warning
} | null;

// Month names now come from translations
// Function to get the first day of the month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Function to get the number of days in a month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Shared responsive sizing so headers and cells stay aligned across breakpoints
// Mobile: ~42px per column × 7 = 294px + gaps (~12px) = ~306px (fits in ~320-375px screens)
// Desktop: Reduced widths for narrower screens to prevent horizontal scrolling
const columnWidthClasses = "w-[42px] sm:w-[70px] md:w-[85px] lg:w-[110px] xl:w-[130px] 2xl:w-[150px]";
const cellHeightClasses = "h-[40px] sm:h-[55px] md:h-[75px] lg:h-[95px] xl:h-[110px] 2xl:h-[125px]";
const containerMinWidthClasses = "min-w-[294px] sm:min-w-[490px] md:min-w-[595px] lg:min-w-[770px] xl:min-w-[910px] 2xl:min-w-[1050px]";

// Optimized: Create price history maps for O(1) lookups instead of O(n) find operations
const createPriceHistoryMap = (
  priceHistory: Array<{ checkin_date: string; price: number; occupancy_level: string; overwrite: boolean }>
): Map<string, { price: number; occupancy_level: string; overwrite: boolean }> => {
  const map = new Map();
  for (const item of priceHistory) {
    map.set(item.checkin_date, {
      price: item.price,
      occupancy_level: item.occupancy_level,
      overwrite: item.overwrite,
    });
  }
  return map;
};

// Function to generate calendar data for any month/year (optimized with Map lookups)
const generateCalendarData = (
  year: number,
  month: number,
  priceHistory: Array<{ checkin_date: string; price: number; occupancy_level: string; overwrite: boolean }> = [],
  mspPriceHistory: Array<{ checkin_date: string; price: number; occupancy_level: string; overwrite: boolean }> = [],
  competitorAveragePriceHistory: Array<{ checkin_date: string; price: number; occupancy_level: string; overwrite: boolean }> = [],
  isMSPMode: boolean = false,
  isCompetitorAverageMode: boolean = false
): CalendarCell[][] => {
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInMonth = getDaysInMonth(year, month);
  const weeks: CalendarCell[][] = [];

  // Create maps for O(1) lookups instead of O(n) find operations
  const priceHistoryMap = createPriceHistoryMap(priceHistory);
  const mspPriceHistoryMap = createPriceHistoryMap(mspPriceHistory);
  const competitorAveragePriceHistoryMap = createPriceHistoryMap(competitorAveragePriceHistory);

  let currentWeek: CalendarCell[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }

  // Pre-calculate month string for date formatting
  const monthStr = (month + 1).toString().padStart(2, '0');

  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    // Generate date string once per day
    const dayStr = day.toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;
    
    if (isMSPMode) {
      // MSP mode: look for MSP data
      const mspData = mspPriceHistoryMap.get(dateStr);
      if (mspData) {
        currentWeek.push({
          day,
          price: `$${mspData.price}`,
          occupancy: mspData.occupancy_level,
          overwrite: false, // MSP doesn't have overwrite concept
          isNoMSP: false,
        });
      } else {
        // No MSP data for this date
        currentWeek.push({
          day,
          price: "No MSP",
          occupancy: "medium", // Default occupancy
          overwrite: false,
          isNoMSP: true,
        });
      }
    } else if (isCompetitorAverageMode) {
      // Competitor Average mode: look for competitor average data
      const competitorAvgData = competitorAveragePriceHistoryMap.get(dateStr);
      // Always get occupancy from price history for consistent coloring
      const priceData = priceHistoryMap.get(dateStr);
      const occupancyLevel = priceData ? priceData.occupancy_level : "medium";
      
      if (competitorAvgData) {
        currentWeek.push({
          day,
          price: `$${competitorAvgData.price}`,
          occupancy: occupancyLevel, // Use occupancy from price history for consistent coloring
          overwrite: false, // Competitor average doesn't have overwrite concept
          isNoMSP: false,
        });
      } else {
        // No competitor average data for this date, but still show occupancy coloring
        currentWeek.push({
          day,
          price: "No Data",
          occupancy: occupancyLevel, // Use occupancy from price history for consistent coloring
          overwrite: false,
          isNoMSP: false,
        });
      }
    } else {
      // Regular price mode: look for price history data
      const priceData = priceHistoryMap.get(dateStr);
      currentWeek.push({
        day,
        price: priceData ? `$${priceData.price}` : "$0", // Default price if no data
        occupancy: priceData ? priceData.occupancy_level : "medium", // Default occupancy if no data
        overwrite: priceData ? priceData.overwrite : false,
        isNoMSP: false,
      });
    }
    // If the week is complete (7 days), start a new week
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill the last week with null values if needed
  while (currentWeek.length > 0 && currentWeek.length < 7) {
    currentWeek.push(null);
  }

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
};

// Day headers now come from translations
// Price options now come from translations

const getOccupancyColor = (occupancy: string) => {
  switch (occupancy) {
    case "low":
      return "bg-hotel-occupancy-low";
    case "medium":
      return "bg-hotel-occupancy-medium";
    case "high":
      return "bg-hotel-occupancy-high";
    default:
      return "bg-gray-400";
  }
};

// Memoized CalendarCell component to prevent unnecessary re-renders
const CalendarCell = memo(function CalendarCell({
  day,
  price,
  occupancy,
  overwrite,
  onClick,
  highlight = false,
  isNoMSP = false,
}: {
  day: number;
  price: string;
  occupancy: string;
  overwrite: boolean;
  onClick: () => void;
  highlight?: boolean;
  isNoMSP?: boolean;
}) {
  const occupancyColor = useMemo(() => getOccupancyColor(occupancy), [occupancy]);
  
  return (
    <button
      onClick={onClick}
      className={`flex ${columnWidthClasses} ${cellHeightClasses} rounded-lg ${occupancyColor} p-[2px] sm:p-[6px] md:p-[8px] lg:p-[10px] xl:p-[12px] justify-center items-center hover:scale-105 transition-transform cursor-pointer relative ${highlight ? 'border-2 sm:border-4 border-yellow-400 z-10' : ''}`}
    >
      {/* Lock icon at top right if overwrite is true (but not in MSP mode) */}
      {overwrite && !isNoMSP && (
        <span className="absolute top-0.5 right-0.5 text-white opacity-80">
          <Lock size={10} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </span>
      )}
      <div className="flex flex-col items-center gap-[2px] sm:gap-[3px] md:gap-[4px] text-white">
        <span className="text-xs md:text-2xl font-normal leading-tight">
          {day}
        </span>
        <span className="text-xs md:text-2xl font-bold leading-tight flex items-center gap-1">
          {isNoMSP && (
            <AlertTriangle size={8} className="sm:w-2 sm:h-2 md:w-5 md:h-5 lg:w-6 lg:h-6" />
          )}
          {price}
        </span>
      </div>
    </button>
  );
});

interface PriceCalendarProps {
  onDateClick: (day: number, month?: string, year?: string) => void;
  propertyId?: string; // Optional prop for when we know the property ID
  refreshKey?: number;
  onPriceOptionChange?: (option: string) => void;
}

export default function PriceCalendar({ onDateClick, propertyId, refreshKey, onPriceOptionChange }: PriceCalendarProps) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const queryClient = useQueryClient();
  
  // Memoize translation arrays - only recalculate when language changes
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

  // Memoize day headers
  const dayHeaders = useMemo(() => [
    t('dashboard:calendar.days.sun'),
    t('dashboard:calendar.days.mon'),
    t('dashboard:calendar.days.tue'),
    t('dashboard:calendar.days.wed'),
    t('dashboard:calendar.days.thu'),
    t('dashboard:calendar.days.fri'),
    t('dashboard:calendar.days.sat'),
  ], [t, i18n.language]);

  // Memoize price options
  const priceOptions = useMemo(() => [
    t('dashboard:calendar.priceTypes.averageDailyRate'),
    t('dashboard:calendar.priceTypes.competitorAverage'),
    t('dashboard:calendar.priceTypes.msp'),
  ], [t, i18n.language]);

  // Memoize default price option
  const defaultPriceOption = useMemo(() => t('dashboard:calendar.priceTypes.averageDailyRate'), [t, i18n.language]);
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(propertyId || null);
  const [selectedPrice, setSelectedPrice] = useState(defaultPriceOption);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Use React Query hook for property data instead of manual useEffect + localStorage
  const { data: propertyData } = useProperty(selectedPropertyId || '');

  // Get user properties (only if no propertyId is provided)
  const { data: userPropertiesData, isLoading: propertiesLoading } = useUserProperties();
  
  // Memoize mode detection to avoid recalculation
  const mspPriceOption = useMemo(() => t('dashboard:calendar.priceTypes.msp'), [t, i18n.language]);
  const competitorAveragePriceOption = useMemo(() => t('dashboard:calendar.priceTypes.competitorAverage'), [t, i18n.language]);
  
  // Determine current mode from selectedPrice (memoized)
  const isMSPMode = useMemo(() => selectedPrice === mspPriceOption, [selectedPrice, mspPriceOption]);
  const isCompetitorAverageMode = useMemo(() => selectedPrice === competitorAveragePriceOption, [selectedPrice, competitorAveragePriceOption]);
  
  // Memoize API month parameter (1-indexed)
  const apiMonth = useMemo(() => currentMonth + 1, [currentMonth]);
  
  // Get price history for the selected property and month (always fetched for occupancy coloring)
  const { data: priceHistoryData, isLoading: priceHistoryLoading, isError: priceHistoryError } = usePriceHistory(
    selectedPropertyId || '',
    currentYear,
    apiMonth,
    refreshKey // Pass refreshKey as a dependency
  );

  // Get MSP price history only when MSP mode is selected
  const { data: mspPriceHistoryData, isLoading: mspPriceHistoryLoading } = useMSPPriceHistory(
    selectedPropertyId || '',
    currentYear,
    apiMonth,
    refreshKey, // Pass refreshKey as a dependency
    isMSPMode // Only fetch when MSP mode is selected
  );

  // Get Competitor Average price history only when Competitor Average mode is selected
  const { data: competitorAveragePriceHistoryData, isLoading: competitorAveragePriceHistoryLoading } = useCompetitorAveragePriceHistory(
    selectedPropertyId || '',
    currentYear,
    apiMonth,
    refreshKey, // Pass refreshKey as a dependency
    isCompetitorAverageMode // Only fetch when Competitor Average mode is selected
  );


  // Set the first property as selected when properties are loaded (only if no propertyId is provided)
  useEffect(() => {
    if (!propertyId && userPropertiesData?.properties && userPropertiesData.properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(userPropertiesData.properties[0].id);
    }
  }, [userPropertiesData, selectedPropertyId, propertyId]);

  // Update selectedPropertyId when propertyId prop changes
  useEffect(() => {
    if (propertyId && propertyId !== selectedPropertyId) {
      setSelectedPropertyId(propertyId);
    }
  }, [propertyId, selectedPropertyId]);

  // Update selectedPrice when defaultPriceOption changes (language change)
  useEffect(() => {
    if (selectedPrice === mspPriceOption || selectedPrice === competitorAveragePriceOption) {
      // Keep current selection if it's a valid option
      return;
    }
    // Reset to default if current selection doesn't match any option (e.g., after language change)
    setSelectedPrice(defaultPriceOption);
  }, [defaultPriceOption, mspPriceOption, competitorAveragePriceOption, selectedPrice]);

  // Prefetch adjacent months in the background for smoother navigation
  useEffect(() => {
    if (!selectedPropertyId) return;

    // Calculate previous and next month/year
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    // Prefetch previous month price history
    queryClient.prefetchQuery({
      queryKey: ['dynamic-pricing', 'price-history', selectedPropertyId, prevYear, prevMonth + 1, refreshKey],
      queryFn: () => dynamicPricingService.getPriceHistory(selectedPropertyId, prevYear, prevMonth + 1),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Prefetch next month price history
    queryClient.prefetchQuery({
      queryKey: ['dynamic-pricing', 'price-history', selectedPropertyId, nextYear, nextMonth + 1, refreshKey],
      queryFn: () => dynamicPricingService.getPriceHistory(selectedPropertyId, nextYear, nextMonth + 1),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [selectedPropertyId, currentYear, currentMonth, refreshKey, queryClient]);

  // Memoize calendar data generation - only recalculate when dependencies change
  const calendarData = useMemo(() => {
    return generateCalendarData(
      currentYear, 
      currentMonth, 
      priceHistoryData?.price_history || [],
      mspPriceHistoryData?.price_history || [],
      competitorAveragePriceHistoryData?.price_history || [],
      isMSPMode,
      isCompetitorAverageMode
    );
  }, [
    currentYear,
    currentMonth,
    priceHistoryData?.price_history,
    mspPriceHistoryData?.price_history,
    competitorAveragePriceHistoryData?.price_history,
    isMSPMode,
    isCompetitorAverageMode
  ]);

  // Memoize navigation handlers with useCallback
  const goToPreviousMonth = useCallback(() => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 0) {
        setCurrentYear(prevYear => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 11) {
        setCurrentYear(prevYear => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
  }, []);

  // Memoize date click handler
  const handleDateClick = useCallback((day: number) => {
    onDateClick(day, monthNames[currentMonth], currentYear.toString());
  }, [onDateClick, monthNames, currentMonth, currentYear]);

  // Memoize month select handler
  const handleMonthSelect = useCallback((monthIndex: number) => {
    setCurrentMonth(monthIndex);
    setCurrentYear(tempYear);
    setShowMonthPicker(false);
  }, [tempYear]);

  // Memoize price option select handler
  const handlePriceOptionSelect = useCallback((option: string) => {
    setSelectedPrice(option);
    setIsDropdownOpen(false);
    if (onPriceOptionChange) {
      onPriceOptionChange(option);
    }
  }, [onPriceOptionChange]);

  // Memoize month picker toggle
  const toggleMonthPicker = useCallback(() => {
    setShowMonthPicker(prev => {
      if (!prev) {
        setTempYear(currentYear);
      }
      return !prev;
    });
  }, [currentYear]);

  // Memoize today's date to avoid recreating on every render
  const today = useMemo(() => new Date(), []);
  
  // Memoize isToday function
  const isToday = useCallback((day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  }, [today, currentMonth, currentYear]);

  // Show loading state while fetching properties (only if no propertyId is provided)
  if (!propertyId && propertiesLoading) {
    return (
      <div className="w-full max-w-none bg-white border border-hotel-border-light rounded-[9px] p-4 lg:p-[26px]">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#294758] mx-auto mb-4"></div>
            <p className="text-responsive-base text-[#485567]">{t('dashboard:calendar.loadingProperties')}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no properties (only if no propertyId is provided)
  if (!propertyId && (!userPropertiesData?.properties || userPropertiesData.properties.length === 0)) {
    return (
      <div className="w-full max-w-none bg-white border border-hotel-border-light rounded-[9px] p-4 lg:p-[26px]">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-responsive-base text-[#485567]">{t('dashboard:calendar.noPropertiesFound')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none bg-white border border-hotel-border-light rounded-[9px] p-4 lg:p-[26px]">
      {/* Header */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 lg:items-center gap-4 mb-[57px]">
        {/* Left side: Title, Dropdown, Property Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:justify-start">
          <h2 className="text-responsive-xl font-bold text-[#294758]">{t('dashboard:calendar.title')}</h2>
          
          {/* Price Type Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center justify-between px-[15px] py-[13px] border border-hotel-border-light rounded-md bg-white hover:bg-gray-50 transition-colors w-full sm:min-w-[180px]"
            >
              <span className="text-responsive-sm font-normal text-[#294758]">
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
                    onClick={() => handlePriceOptionSelect(option)}
                    className={`w-full px-[15px] py-[13px] text-left text-responsive-sm font-normal hover:bg-gray-50 transition-colors ${
                      selectedPrice === option
                        ? "bg-blue-50 text-blue-700"
                        : "text-[#294758]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Selector - only show if no propertyId is provided */}
          {!propertyId && userPropertiesData?.properties && (
            <select
              value={selectedPropertyId || ''}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="px-3 py-2 border border-[#E7E7EA] rounded-[5px] bg-white text-black w-full sm:w-auto"
            >
              {userPropertiesData.properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Center: Month Picker Navigation */}
        <div className="flex justify-center lg:justify-center">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Navigation buttons */}
            <button
              onClick={goToPreviousMonth}
              className="flex items-center justify-center w-[45px] h-[38px] border border-[#E7E7EA] rounded-[5px] bg-white hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={12} className="text-black" />
            </button>

            {/* Month/Year display - Clickable with responsive width */}
            <div className="relative">
              <button
                onClick={toggleMonthPicker}
                className="flex items-center justify-center gap-1 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors w-[140px] sm:w-[180px]"
              >
                <span className="text-responsive-lg font-semibold text-[#294758]">
                  {monthNames[currentMonth]} {currentYear}
                </span>
                <ChevronUp
                  size={16}
                  className={`text-black transition-transform ${showMonthPicker ? "rotate-180" : ""}`}
                />
              </button>

              {/* Month/Year Picker Dropdown */}
              {showMonthPicker && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[280px]">
                  {/* Year Selector */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={() => setTempYear(tempYear - 1)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-lg font-semibold">{tempYear}</span>
                    <button
                      onClick={() => setTempYear(tempYear + 1)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Month Grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {monthNames.map((month, index) => (
                      <button
                        key={month}
                        onClick={() => handleMonthSelect(index)}
                        className={`p-2 text-sm rounded hover:bg-blue-50 transition-colors ${
                          index === currentMonth && tempYear === currentYear
                            ? "bg-blue-100 text-blue-700 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>

                  {/* Close button */}
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => setShowMonthPicker(false)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      {t('common:buttons.close')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={goToNextMonth}
              className="flex items-center justify-center w-[45px] h-[38px] border border-[#E7E7EA] rounded-[5px] bg-white hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={12} className="text-black" />
            </button>
          </div>
        </div>

        {/* Right side: Empty spacer to balance the layout */}
        <div className="hidden lg:block"></div>
      </div>

      {/* Error/Loading for price history */}
      {priceHistoryLoading && (
        <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-800 rounded">
          {t('dashboard:calendar.loadingPrices', 'Loading prices...')}
        </div>
      )}
      {priceHistoryError && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-800 rounded">
          {t('dashboard:calendar.errorLoadingPrices', 'Failed to load prices. Please try again.')}
        </div>
      )}

      {/* Calendar */}
      <div className={`flex flex-col gap-[8px] sm:gap-[12px] md:gap-[14px] overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0`}>
        {/* Day Headers */}
        <div className={`flex items-center gap-[1px] sm:gap-1 ${containerMinWidthClasses}`}>
          {dayHeaders.map((day) => (
            <div
              key={day}
              className={`flex ${columnWidthClasses} justify-center items-center py-1`}
            >
              <span className="text-responsive-sm font-medium text-[#8A8E94]">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className={`flex flex-col gap-[1px] sm:gap-1 ${containerMinWidthClasses}`}>
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex items-center gap-[1px] sm:gap-1">
              {week.map((cell, cellIndex) =>
                cell ? (
                  <CalendarCell
                    key={`${currentYear}-${currentMonth}-${cell.day}`}
                    day={cell.day}
                    price={cell.price}
                    occupancy={cell.occupancy}
                    overwrite={cell.overwrite}
                    onClick={() => handleDateClick(cell.day)}
                    highlight={isToday(cell.day)}
                    isNoMSP={cell.isNoMSP}
                  />
                ) : (
                  <div
                    key={`empty-${weekIndex}-${cellIndex}`}
                    className={`${columnWidthClasses} ${cellHeightClasses}`}
                  />
                ),
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] bg-hotel-occupancy-low" />
            <span className="text-responsive-sm font-normal text-[#294758]">
              {t('dashboard:calendar.occupancyLevels.low')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] bg-hotel-occupancy-medium" />
            <span className="text-responsive-sm font-normal text-[#294758]">
              {t('dashboard:calendar.occupancyLevels.medium')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] bg-hotel-occupancy-high" />
            <span className="text-responsive-sm font-normal text-[#294758]">
              {t('dashboard:calendar.occupancyLevels.high')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
