import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Lock, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePriceHistory, useMSPPriceHistory, useCompetitorAveragePriceHistory, useUserProperties } from "../../../shared/api/hooks";
import { getLocalStorageItem, setLocalStorageItem, getVivereConnection } from "../../../shared/localStorage";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { hasPMSConfigured } from "../../../shared/utils/pmsUtils";

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
const columnWidthClasses = "w-[50px] sm:w-[70px] md:w-[100px] lg:w-[125px] xl:w-[150px] 2xl:w-[175px]";
const cellHeightClasses = "h-[45px] sm:h-[55px] md:h-[75px] lg:h-[95px] xl:h-[110px] 2xl:h-[125px]";
const containerMinWidthClasses = "min-w-[350px] sm:min-w-[490px] md:min-w-[700px] lg:min-w-[875px] xl:min-w-[1050px] 2xl:min-w-[1225px]";

// Function to generate calendar data for any month/year
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

  let currentWeek: CalendarCell[] = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null);
  }

      // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    // Find price data for this day
    const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    if (isMSPMode) {
      // MSP mode: look for MSP data
      const mspData = mspPriceHistory.find(item => item.checkin_date === dateStr);
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
      const competitorAvgData = competitorAveragePriceHistory.find(item => item.checkin_date === dateStr);
      // Always get occupancy from price history for consistent coloring
      const priceData = priceHistory.find(item => item.checkin_date === dateStr);
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
      const priceData = priceHistory.find(item => item.checkin_date === dateStr);
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

function CalendarCell({
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
  return (
    <button
      onClick={onClick}
      className={`flex ${columnWidthClasses} ${cellHeightClasses} rounded-lg ${getOccupancyColor(occupancy)} p-[4px] sm:p-[6px] md:p-[8px] lg:p-[10px] xl:p-[12px] justify-center items-center hover:scale-105 transition-transform cursor-pointer relative ${highlight ? 'border-4 border-yellow-400 z-10' : ''}`}
    >
      {/* Lock icon at top right if overwrite is true (but not in MSP mode) */}
      {overwrite && !isNoMSP && (
        <span className="absolute top-0.5 right-0.5 text-white opacity-80">
          <Lock size={10} className="sm:w-3 sm:h-3 md:w-4 md:h-4" />
        </span>
      )}
      <div className="flex flex-col items-center gap-[2px] sm:gap-[3px] md:gap-[4px] text-white">
        <span className="text-responsive-xs font-normal leading-tight flex items-center gap-1">
          {isNoMSP && (
            <AlertTriangle size={8} className="sm:w-2 sm:h-2 md:w-3 md:h-3" />
          )}
          {price}
        </span>
        <span className="text-responsive-xs font-normal leading-tight">
          {day}
        </span>
      </div>
    </button>
  );
}

interface PriceCalendarProps {
  onDateClick: (day: number, month?: string, year?: string) => void;
  propertyId?: string; // Optional prop for when we know the property ID
  refreshKey?: number;
  onPriceOptionChange?: (option: string) => void;
}

export default function PriceCalendar({ onDateClick, propertyId, refreshKey, onPriceOptionChange }: PriceCalendarProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  
  // Month names array from translations
  const monthNames = [
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
  ];

  // Day headers from translations
  const dayHeaders = [
    t('dashboard:calendar.days.sun'),
    t('dashboard:calendar.days.mon'),
    t('dashboard:calendar.days.tue'),
    t('dashboard:calendar.days.wed'),
    t('dashboard:calendar.days.thu'),
    t('dashboard:calendar.days.fri'),
    t('dashboard:calendar.days.sat'),
  ];

  // Price options from translations
  const priceOptions = [
    t('dashboard:calendar.priceTypes.averageDailyRate'),
    t('dashboard:calendar.priceTypes.competitorAverage'),
    t('dashboard:calendar.priceTypes.msp'),
  ];
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(propertyId || null);
  const [propertyData, setPropertyData] = useState<any>(null);
  const [selectedPrice, setSelectedPrice] = useState(t('dashboard:calendar.priceTypes.averageDailyRate'));
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get user properties (only if no propertyId is provided)
  const { data: userPropertiesData, isLoading: propertiesLoading } = useUserProperties();
  
  // Determine current mode from selectedPrice
  const isMSPMode = selectedPrice === t('dashboard:calendar.priceTypes.msp');
  const isCompetitorAverageMode = selectedPrice === t('dashboard:calendar.priceTypes.competitorAverage');
  
  // Get price history for the selected property and month (always fetched for occupancy coloring)
  const { data: priceHistoryData, isLoading: priceHistoryLoading } = usePriceHistory(
    selectedPropertyId || '',
    currentYear,
    currentMonth + 1, // Convert to 1-indexed for API
    refreshKey // Pass refreshKey as a dependency
  );

  // Get MSP price history only when MSP mode is selected
  const { data: mspPriceHistoryData, isLoading: mspPriceHistoryLoading } = useMSPPriceHistory(
    selectedPropertyId || '',
    currentYear,
    currentMonth + 1, // Convert to 1-indexed for API
    refreshKey, // Pass refreshKey as a dependency
    isMSPMode // Only fetch when MSP mode is selected
  );

  // Get Competitor Average price history only when Competitor Average mode is selected
  const { data: competitorAveragePriceHistoryData, isLoading: competitorAveragePriceHistoryLoading } = useCompetitorAveragePriceHistory(
    selectedPropertyId || '',
    currentYear,
    currentMonth + 1, // Convert to 1-indexed for API
    refreshKey, // Pass refreshKey as a dependency
    isCompetitorAverageMode // Only fetch when Competitor Average mode is selected
  );

  // Fetch property data if not in localStorage
  useEffect(() => {
    async function fetchAndStorePropertyData(id: string) {
      try {
        const localKey = `property_${id}_info`;
        let data = getLocalStorageItem<any>(localKey);
        if (!data) {
          const response = await dynamicPricingService.getProperty(id);
          data = response;
          setLocalStorageItem(localKey, data);
        }
        setPropertyData(data);
      } catch (e) {
        console.error("Error fetching property data:", e);
      }
    }
    if (selectedPropertyId) {
      fetchAndStorePropertyData(selectedPropertyId);
    }
  }, [selectedPropertyId]);


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


  
  const calendarData = generateCalendarData(
    currentYear, 
    currentMonth, 
    priceHistoryData?.price_history || [],
    mspPriceHistoryData?.price_history || [],
    competitorAveragePriceHistoryData?.price_history || [],
    isMSPMode,
    isCompetitorAverageMode
  );

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day: number) => {
    onDateClick(day, monthNames[currentMonth], currentYear.toString());
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(monthIndex);
    setCurrentYear(tempYear);
    setShowMonthPicker(false);
  };

  const handlePriceOptionSelect = (option: string) => {
    setSelectedPrice(option);
    setIsDropdownOpen(false);
    if (onPriceOptionChange) {
      onPriceOptionChange(option);
    }
  };

  const toggleMonthPicker = () => {
    if (!showMonthPicker) {
      setTempYear(currentYear);
    }
    setShowMonthPicker(!showMonthPicker);
  };

  // Get today's date for highlighting
  const today = new Date();
  const isToday = (day: number) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  };

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

  // Determine if PMS is missing
  const hasPMS = hasPMSConfigured(propertyData);
  const isConnected = getVivereConnection();

  return (
    <div className="w-full max-w-none bg-white border border-hotel-border-light rounded-[9px] p-4 lg:p-[26px]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-[57px]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
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

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 ml-auto">
          {/* Navigation controls */}
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
                <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[280px]">
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
      </div>
      {/* Dynamic PMS warning */}
      {!isConnected && !hasPMS && (
        <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded">
          {t('dashboard:calendar.pmsWarning')}
        </div>
      )}

      {/* Calendar */}
      <div className={`flex flex-col gap-[8px] sm:gap-[12px] md:gap-[14px] overflow-x-auto`}>
        {/* Day Headers */}
        <div className={`flex items-center gap-[2px] sm:gap-1 ${containerMinWidthClasses}`}>
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
        <div className={`flex flex-col gap-[2px] sm:gap-1 ${containerMinWidthClasses}`}>
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex items-center gap-[2px] sm:gap-1">
              {week.map((cell, cellIndex) =>
                cell ? (
                  <CalendarCell
                    key={cell.day}
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
