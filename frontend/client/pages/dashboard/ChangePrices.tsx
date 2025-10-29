import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useUserProperties, usePriceHistory } from "../../../shared/api/hooks";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { CompetitorWeeklyPricesResponse } from '../../../shared/api/dynamic';

// Sample data for the week view
const weeklyData = {
  dates: [
    { day: "Mon", date: "28" },
    { day: "Tue", date: "29" },
    { day: "Wed", date: "30" },
    { day: "Thu", date: "31" },
    { day: "Fri", date: "01" },
    { day: "Sat", date: "02" },
    { day: "Sun", date: "03" },
  ],
  competitors: [
    {
      name: "Occupancy (%)",
      values: ["25%", "45%", "60%", "35%", "80%", "75%", "55%"],
      type: "occupancy",
    },
    {
      name: "Villa Maria",
      values: ["$56", "$56", "$56", "$56", "$56", "$56", "$56"],
      type: "price",
    },
    {
      name: "Hotel La Canela",
      values: ["$56", "$56", "$56", "$56", "$56", "$56", "$56"],
      type: "price",
    },
    {
      name: "Hostal Mainz",
      values: ["$56", "$56", "$56", "$56", "$56", "$56", "$56"],
      type: "price",
    },
    {
      name: "Competitor Avg",
      values: ["$56", "$56", "$56", "$56", "$56", "$56", "$56"],
      type: "price",
    },
  ],
  yourPrices: ["56", "56", "56", "56", "56", "56", "56"],
};

const getOccupancyColor = (value: string) => {
  const percent = parseInt(value);
  if (percent <= 35) return "bg-blue-200 text-blue-800";
  if (percent <= 69) return "bg-yellow-200 text-yellow-800";
  return "bg-green-200 text-green-600";
};

const getWeekStartDate = (year: number, week: number) => {
  // January 4th is always in week 1 of the year
  const jan4 = new Date(year, 0, 4);
  const jan4DayOfWeek = jan4.getDay() || 7; // Convert Sunday (0) to 7
  // Find Monday of week 1
  const week1Monday = new Date(
    jan4.getTime() - (jan4DayOfWeek - 1) * 24 * 60 * 60 * 1000,
  );
  // Calculate the start date of the requested week
  const weekStart = new Date(
    week1Monday.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000,
  );
  return weekStart;
};

const generateWeekDates = (week: number) => {
  const weekStart = getWeekStartDate(2025, week);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return {
      day: dayNames[i], // ISO week starts on Monday
      date: date.getDate().toString().padStart(2, "0"),
      fullDate: date,
    };
  });
};

function WeeklyPriceOverview({
  currentWeek,
  setCurrentWeek,
  propertyId,
  refreshKey,
  onPriceChange,
}: {
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
  propertyId?: string;
  refreshKey?: number;
  onPriceChange?: () => void;
}): React.JSX.Element {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const [competitorData, setCompetitorData] = useState<CompetitorWeeklyPricesResponse | null>(null);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorError, setCompetitorError] = useState<string | null>(null);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [localPrices, setLocalPrices] = useState<{ [key: string]: string }>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mobileDayIndex, setMobileDayIndex] = useState(0); // Track which 3-day window we're showing
  
  // Touch/swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  // Calculate week dates
  const weekDates = generateWeekDates(currentWeek);
  const weekYear = 2025; // Hardcoded for now
  const weekMonth = weekDates[0]?.fullDate.getMonth() + 1; // 1-indexed

  // Compute the Monday of the week for the backend
  const weekStartDate = weekDates[0]?.fullDate;
  const weekStartDateStr = weekStartDate
    ? `${weekStartDate.getFullYear()}-${(weekStartDate.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${weekStartDate.getDate().toString().padStart(2, '0')}`
    : '';

  // Get price history for the property (similar to PriceCalendar)
  const { data: priceHistoryData, isLoading: priceHistoryLoading } = usePriceHistory(
    propertyId || '',
    weekYear,
    weekMonth, // Convert to 1-indexed for API
    refreshKey
  );

  // Debug: Log the price history data
  if (priceHistoryData && priceHistoryData.price_history) {
    console.log('[ChangePrices] priceHistoryData:', priceHistoryData);
    console.log('[ChangePrices] Week dates:', competitorData?.dates);
    // Log a few sample price entries
    if (competitorData?.dates && competitorData.dates.length > 0) {
      const sampleDate = competitorData.dates[0];
      const samplePrice = priceHistoryData.price_history.find((entry: any) => entry.checkin_date === sampleDate);
      console.log('[ChangePrices] Sample price for', sampleDate, ':', samplePrice);
    }
  }

  // Debug: Log success message state
  console.log('[WeeklyPriceOverview] Current successMsg state:', successMsg);

  // Reset local prices when data refreshes
  useEffect(() => {
    setLocalPrices({});
    setMobileDayIndex(0); // Reset mobile view to first 3 days
    // Don't clear success message - let it stay visible for user to see
  }, [refreshKey]);

  useEffect(() => {
    if (!propertyId || !weekStartDateStr) return;
    setCompetitorLoading(true);
    setCompetitorError(null);
    setCompetitorData(null);
    dynamicPricingService
      .getCompetitorWeeklyPrices(propertyId, weekStartDateStr)
      .then((data) => {
        setCompetitorData(data);
      })
      .catch((err) => {
        setCompetitorError(t('dashboard:changePrices.loadError', { defaultValue: 'Failed to load competitor data' }));
      })
      .finally(() => setCompetitorLoading(false));
  }, [propertyId, weekStartDateStr, refreshKey]);

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showMonthDropdown && !target.closest('.month-dropdown-container')) {
        setShowMonthDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMonthDropdown]);

  // Handle window resize to reset mobile view when switching to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileDayIndex(0); // Reset to show all days on desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle price change (local state only)
  const handlePriceChange = (index: number, newValue: string) => {
    const date = competitorData?.dates[index];
    if (!date) return;
    
    // Update local state only
    setLocalPrices(prev => ({
      ...prev,
      [date]: newValue
    }));
  };

  // Handle price change when user finishes editing (on blur)
  const handlePriceBlur = async (index: number) => {
    if (!propertyId) return;
    const date = competitorData?.dates[index];
    if (!date) return;
    
    const newValue = localPrices[date];
    console.log('[WeeklyPriceOverview] handlePriceBlur - index:', index, 'date:', date, 'newValue:', newValue);
    
    // Check if there's actually a change in value
    const priceData = priceHistoryData?.price_history?.find(
      (entry: any) => entry.checkin_date === date
    );
    const originalPrice = priceData ? priceData.price.toString() : "200";
    
    if (!newValue || newValue === "" || newValue === originalPrice) {
      console.log('[WeeklyPriceOverview] No change detected or empty value, skipping update');
      return;
    }
    
    const dateObj = weekDates[index]?.fullDate;
    if (!dateObj) return;
    const dateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
    
    try {
      console.log('[WeeklyPriceOverview] Updating price for', dateStr, 'from', originalPrice, 'to', newValue);
      await dynamicPricingService.updateOverwritePrice(propertyId, dateStr, Number(newValue));
      console.log("Price changed successfully for", dateStr, "to", newValue);
      
      // Create success message with day name and date
      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const dayName = dayNames[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]; // Convert to Monday=0 format
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthName = monthNames[dateObj.getMonth()];
      const dayOfMonth = dateObj.getDate();
      
      const successMessage = `The price for ${dayName} ${dayOfMonth} of ${monthName} was changed to $${newValue}`;
      console.log('[WeeklyPriceOverview] Setting success message:', successMessage);
      setSuccessMsg(successMessage);
      
      // Trigger a refresh of the price history data
      if (onPriceChange) {
        onPriceChange();
      }
    } catch (e) {
      console.error("Failed to change price for", dateStr, ":", e);
      alert(t('dashboard:changePrices.updateError', { defaultValue: 'Failed to change price' }));
      // Revert the local state to the original value
      setLocalPrices(prev => ({
        ...prev,
        [date]: originalPrice
      }));
    }
  };

  if (!propertyId) {
    return <div className="p-8 text-center text-red-600">{t('common:messages.noPropertySelected')}</div>;
  }
  if (competitorLoading || priceHistoryLoading) {
    return <div className="p-8 text-center">{t('dashboard:changePrices.loadingCompetitors')}</div>;
  }
  if (competitorError) {
    return <div className="p-8 text-center text-red-600">{competitorError}</div>;
  }

  // If no competitor data or empty
  if (!competitorData || !competitorData.competitors || competitorData.competitors.length === 0) {
    return <div className="p-8 text-center text-gray-500">{t('dashboard:changePrices.noCompetitorData')}</div>;
  }

  const goToPreviousWeek = () => {
    setCurrentWeek(Math.max(1, currentWeek - 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(Math.min(53, currentWeek + 1));
  };

  // Mobile navigation functions
  const goToPreviousDays = () => {
    const maxIndex = window.innerWidth >= 768 ? 2 : 4; // Tablet: max index 2 (shows days 2,3,4,5,6), Mobile: max index 4 (shows days 4,5,6)
    setMobileDayIndex(Math.max(0, mobileDayIndex - 1));
  };

  const goToNextDays = () => {
    const maxIndex = window.innerWidth >= 768 ? 2 : 4; // Tablet: max index 2 (shows days 2,3,4,5,6), Mobile: max index 4 (shows days 4,5,6)
    setMobileDayIndex(Math.min(maxIndex, mobileDayIndex + 1));
  };

  // Get visible days based on screen size and mobile index
  const getVisibleDays = () => {
    if (!competitorData?.dates) return [];
    
    // On desktop (lg+), show all 7 days
    if (window.innerWidth >= 1024) {
      return competitorData.dates.map((date, index) => ({ date, index }));
    }
    
    // On tablet (md+), show 5 days starting from mobileDayIndex
    if (window.innerWidth >= 768) {
      return competitorData.dates
        .slice(mobileDayIndex, mobileDayIndex + 5)
        .map((date, originalIndex) => ({ 
          date, 
          index: mobileDayIndex + originalIndex 
        }));
    }
    
    // On mobile, show 3 days starting from mobileDayIndex
    return competitorData.dates
      .slice(mobileDayIndex, mobileDayIndex + 3)
      .map((date, originalIndex) => ({ 
        date, 
        index: mobileDayIndex + originalIndex 
      }));
  };

  const visibleDays = getVisibleDays();

  // Touch event handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsSwiping(false);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50; // Minimum swipe distance
    const isRightSwipe = distance < -50;

    const maxIndex = window.innerWidth >= 768 ? 2 : 4;
    if (isLeftSwipe && mobileDayIndex < maxIndex) {
      // Swipe left - go to next days
      setMobileDayIndex(prev => Math.min(maxIndex, prev + 1));
    } else if (isRightSwipe && mobileDayIndex > 0) {
      // Swipe right - go to previous days
      setMobileDayIndex(prev => Math.max(0, prev - 1));
    }

    setIsSwiping(false);
  };

  // Prevent page scroll during swipe
  const handleTouchStartPrevent = (e: React.TouchEvent) => {
    handleTouchStart(e);
    // Only prevent default if we're on mobile
    if (window.innerWidth < 1024) {
      e.preventDefault();
    }
  };

  // Get the month name for the current week
  const getCurrentMonthYear = (week: number) => {
    const weekStart = getWeekStartDate(2025, week);
    const midWeek = new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000); // Wednesday

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    return `${monthNames[midWeek.getMonth()]} ${midWeek.getFullYear()}`;
  };

  // Get the first week of a specific month in 2025
  const getFirstWeekOfMonth = (monthIndex: number) => {
    // Find the first day of the month
    const firstDay = new Date(2025, monthIndex, 1);

    // Find which ISO week this falls into
    for (let week = 1; week <= 53; week++) {
      const weekStart = getWeekStartDate(2025, week);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      if (firstDay >= weekStart && firstDay <= weekEnd) {
        return week;
      }
    }
    return 1; // fallback
  };

  // Handle month selection
  const handleMonthSelect = (monthIndex: number) => {
    const firstWeek = getFirstWeekOfMonth(monthIndex);
    setCurrentWeek(firstWeek);
    setShowMonthDropdown(false);
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="w-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-hotel-brand rounded-t-lg p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="hidden lg:block text-white" size={20} />
          <span className="hidden lg:block text-white text-xl font-bold">
            {t('dashboard:changePrices.weeklyOverview', { defaultValue: 'Weekly Price Overview' })}
          </span>
        </div>
        <div className="flex items-center justify-center lg:justify-end gap-6">
          <button
            onClick={goToPreviousWeek}
            className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            disabled={currentWeek <= 1}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-6 py-3 bg-white/90 rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm">
            <span className="text-hotel-brand text-base font-bold">
              {t('dashboard:changePrices.week', { defaultValue: 'Week' })} {currentWeek}
            </span>
          </div>
          <button
            onClick={goToNextWeek}
            className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            disabled={currentWeek >= 53}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Month/Year Dropdown */}
      <div className="px-6 py-4 bg-hotel-brand relative month-dropdown-container flex justify-center lg:justify-start">
        <button
          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
          className="flex items-center gap-2 px-6 py-3 bg-white/90 rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm text-hotel-brand text-xl font-bold hover:bg-white transition-colors"
        >
          <span>{getCurrentMonthYear(currentWeek)}</span>
          <div
            className={`w-5 h-5 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 13L13 7L5 7L9 13Z" />
            </svg>
          </div>
        </button>

        {/* Month/Year Dropdown content */}
        {showMonthDropdown && (
          <div className="absolute top-full left-6 right-6 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-60 overflow-y-auto">
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2">
                {monthNames.map((month, index) => (
                  <button
                    key={index}
                    onClick={() => handleMonthSelect(index)}
                    className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                  >
                    {month}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Headers */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-4">
        <div className="w-[140px] flex items-center">
          <span className="text-hotel-brand font-semibold text-base hidden lg:block">
            {t('dashboard:changePrices.hotel', { defaultValue: 'Hotel' })}
          </span>
        </div>
        <div 
          className="flex-1 flex flex-col items-center justify-center px-4 lg:hidden"
          onTouchStart={handleTouchStartPrevent}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }} // Allow vertical scroll but handle horizontal swipes
        >
          {/* Main content row */}
          <div className="flex items-center justify-between w-full">
            {/* Mobile navigation buttons - only show on mobile */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousDays}
                disabled={mobileDayIndex === 0}
                className="w-8 h-8 rounded-full bg-hotel-brand/20 hover:bg-hotel-brand/30 text-hotel-brand transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            
            {/* Date headers */}
            <div className="flex-1 flex items-center justify-center">
              {visibleDays.map(({ date, index }) => {
                const d = new Date(date);
                const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center gap-2 w-[78px] lg:w-[90px] xl:w-[110px]"
                  >
                    <span className="text-hotel-brand text-lg lg:text-2xl font-bold">{dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                    <span className="text-gray-700 text-sm lg:text-lg font-semibold">{d.getDate().toString().padStart(2, '0')}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Mobile navigation buttons - only show on mobile */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToNextDays}
                disabled={mobileDayIndex >= (window.innerWidth >= 768 ? 2 : 4)}
                className="w-8 h-8 rounded-full bg-hotel-brand/20 hover:bg-hotel-brand/30 text-hotel-brand transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          
          {/* Swipe indicators */}
          <div className="flex items-center gap-1 mt-2">
            {(window.innerWidth >= 768 ? [0, 1, 2] : [0, 1, 2, 3, 4]).map((indicator) => (
              <div
                key={indicator}
                className={`w-2 h-2 rounded-full transition-colors ${
                  mobileDayIndex === indicator 
                    ? 'bg-hotel-brand' 
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Desktop date headers - no touch events */}
        <div className="hidden lg:flex flex-1 items-center justify-center px-4">
          {competitorData?.dates.map((date, index) => {
            const d = new Date(date);
            const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
            return (
              <div
                key={index}
                className="flex flex-col items-center gap-3 w-[78px] lg:w-[90px] xl:w-[110px]"
              >
                <span className="text-hotel-brand text-2xl font-bold">{dayNames[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>
                <span className="text-gray-700 text-lg font-semibold">{d.getDate().toString().padStart(2, '0')}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Competitor Rows */}
      {competitorData.competitors.map((competitor, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center border-b border-gray-200 px-4 py-4 lg:hidden"
          onTouchStart={handleTouchStartPrevent}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
        >
          <div className="w-[140px]">
            <span className="text-black text-sm font-normal">
              {competitor.name}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            {visibleDays.map(({ date, index }) => {
              const value = competitor.prices[index];
              const isSoldOut = Array.isArray((competitor as any).sold_out) ? (competitor as any).sold_out[index] : false;
              const display = isSoldOut
                ? 'Sold Out'
                : (value !== null && value !== undefined ? `$${value}` : '--');
              return (
                <div key={index} className="w-[78px] lg:w-[90px] xl:w-[110px] flex justify-center">
                  <div className={`px-3 py-1 bg-gray-100 rounded text-[13px] ${isSoldOut ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {display}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Desktop Competitor Rows - no touch events */}
      {competitorData.competitors.map((competitor, rowIndex) => (
        <div
          key={`desktop-${rowIndex}`}
          className="hidden lg:flex items-center border-b border-gray-200 px-4 py-4"
        >
          <div className="w-[140px]">
            <span className="text-black text-base font-normal">
              {competitor.name}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center px-4">
            {competitorData.dates.map((date, index) => {
              const value = competitor.prices[index];
              const isSoldOut = Array.isArray((competitor as any).sold_out) ? (competitor as any).sold_out[index] : false;
              const display = isSoldOut
                ? 'Sold Out'
                : (value !== null && value !== undefined ? `$${value}` : '--');
              return (
                <div key={index} className="w-[78px] lg:w-[90px] xl:w-[110px] flex justify-center">
                  <div className={`px-3 py-1 bg-gray-100 rounded text-[13px] ${isSoldOut ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                    {display}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Your Price Row (dynamic) - Mobile */}
      <div 
        className="flex items-center bg-gray-50 border-b-2 border-hotel-brand px-4 py-5 rounded-b-lg lg:hidden"
        onTouchStart={handleTouchStartPrevent}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="w-[140px]">
          <span className="text-black text-sm font-bold">{t('dashboard:changePrices.yourPrice')}</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          {visibleDays.map(({ date, index }) => {
            // Find the price for this specific date from price history
            const priceData = priceHistoryData?.price_history?.find(
              (entry: any) => entry.checkin_date === date
            );
            const apiPrice = priceData ? priceData.price.toString() : "200"; // Default price if no data found
            
            // Use local price if available, otherwise use API price
            const price = localPrices[date] !== undefined ? localPrices[date] : apiPrice;
            
            // Determine if the date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = new Date(date) < today;
            return (
              <div key={index} className="w-[78px] lg:w-[90px] xl:w-[110px] flex justify-center">
                <div className="relative flex items-center w-full">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm lg:text-lg text-[#294859] font-bold z-10">$</span>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => handlePriceChange(index, e.target.value)}
                    onBlur={() => handlePriceBlur(index)}
                    className={`w-full pl-4 pr-2 py-1 border-0 border-b-2 border-[#294859] bg-transparent text-center text-sm lg:text-xl font-bold focus:outline-none focus:border-blue-500 transition-colors duration-200 ${isPast ? 'text-gray-400 cursor-not-allowed bg-gray-50' : 'text-[#294859]'}`}
                    style={{ minWidth: 60, maxWidth: 80 }}
                    maxLength={5}
                    disabled={isPast}
                    title={isPast ? t('dashboard:changePrices.cannotEditPast', { defaultValue: 'Cannot edit past prices' }) : ''}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your Price Row (dynamic) - Desktop */}
      <div className="hidden lg:flex items-center bg-gray-50 border-b-2 border-hotel-brand px-4 py-5 rounded-b-lg">
        <div className="w-[140px]">
          <span className="text-black text-xl font-bold">{t('dashboard:changePrices.yourPrice')}</span>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          {competitorData?.dates.map((date, index) => {
            // Find the price for this specific date from price history
            const priceData = priceHistoryData?.price_history?.find(
              (entry: any) => entry.checkin_date === date
            );
            const apiPrice = priceData ? priceData.price.toString() : "200"; // Default price if no data found
            
            // Use local price if available, otherwise use API price
            const price = localPrices[date] !== undefined ? localPrices[date] : apiPrice;
            
            // Determine if the date is in the past
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const isPast = new Date(date) < today;
            return (
              <div key={index} className="w-[78px] lg:w-[90px] xl:w-[110px] flex justify-center">
                <div className="relative flex items-center w-full">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-base lg:text-lg text-[#294859] font-bold z-10">$</span>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => handlePriceChange(index, e.target.value)}
                    onBlur={() => handlePriceBlur(index)}
                    className={`w-full pl-5 pr-2 py-1 border-0 border-b-2 border-[#294859] bg-transparent text-center text-lg lg:text-xl font-bold focus:outline-none focus:border-blue-500 transition-colors duration-200 ${isPast ? 'text-gray-400 cursor-not-allowed bg-gray-50' : 'text-[#294859]'}`}
                    style={{ minWidth: 70, maxWidth: 110 }}
                    maxLength={5}
                    disabled={isPast}
                    title={isPast ? t('dashboard:changePrices.cannotEditPast', { defaultValue: 'Cannot edit past prices' }) : ''}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Success Message */}
      {successMsg && (
        <div className="mt-4 px-4 py-2 bg-green-100 text-green-800 text-center text-sm font-semibold rounded break-words whitespace-pre-line" style={{wordBreak: 'break-word'}}>
          {successMsg}
        </div>
      )}
    </div>
  );
}

function getISOWeekNumber(date: Date) {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year.
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  // January 4 is always in week 1.
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return (
    1 + Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

function getTodayDateString() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function StayPeriodSelector({
  onStartDateChange,
  propertyId,
  onSuccess,
  setSuccessMsg,
}: {
  onStartDateChange: (date: string) => void;
  propertyId?: string;
  onSuccess?: () => void;
  setSuccessMsg: (msg: string | null) => void;
}) {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const todayStr = getTodayDateString();
  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(() => {
    const today = new Date();
    const out = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000);
    return `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, '0')}-${String(out.getDate()).padStart(2, '0')}`;
  });
  const [totalPrice, setTotalPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [nightlyRate, setNightlyRate] = useState("67.50"); // Default value
  const [nightlyRateLoading, setNightlyRateLoading] = useState(false);

  // Calculate average nightly rate when dates change
  useEffect(() => {
    if (!propertyId || !checkIn || !checkOut) return;
    
    // Validate that end date is after start date
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    if (endDate <= startDate) {
      setNightlyRate("0.00");
      return;
    }
    
    // Check if date range is more than 31 days (one month)
    const dateDifference = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dateDifference > 31) {
      setNightlyRate("N/A");
      return;
    }
    
    const fetchAverageNightlyRate = async () => {
      setNightlyRateLoading(true);
      try {
        console.log('[StayPeriodSelector] Fetching average nightly rate for:', { propertyId, checkIn, checkOut });
        const response = await dynamicPricingService.getPriceHistoryForDateRange(
          propertyId,
          checkIn,
          checkOut
        );
        
        console.log('[StayPeriodSelector] Average nightly rate response:', response);
        
        if (response.average_price > 0) {
          setNightlyRate(response.average_price.toFixed(2));
        } else {
          setNightlyRate("0.00");
        }
      } catch (error: any) {
        console.error("Error fetching average nightly rate:", error);
        
        // Handle specific error for date range exceeding one month
        if (error?.response?.status === 400 && error?.response?.data?.error?.includes('31 days')) {
          setNightlyRate("N/A");
        } else {
          setNightlyRate("0.00");
        }
      } finally {
        setNightlyRateLoading(false);
      }
    };

    fetchAverageNightlyRate();
  }, [propertyId, checkIn, checkOut]);

  // Handle start date change and notify parent
  const handleStartDateChange = (date: string) => {
    setCheckIn(date);
    onStartDateChange(date);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !checkIn || !checkOut || !totalPrice) return;
    setLoading(true);
    try {
      const res = await dynamicPricingService.overwritePriceRange(
        propertyId,
        checkIn,
        checkOut,
        Number(totalPrice)
      );
      setSuccessMsg(
        `Prices from ${res.start_date} to ${res.end_date} updated successfully to $${res.overwrite_price}`
      );
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setSuccessMsg(null);
      alert(err?.message || t('dashboard:changePrices.updateError', { defaultValue: 'Failed to update prices' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md lg:w-[275px] h-[460px] bg-white rounded-lg border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="bg-[#0073D9] p-[25px_22px] rounded-t-lg h-[72px] flex items-center">
        <div className="flex items-center gap-1">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            className="text-white"
          >
            <path
              d="M14.9998 3.33398H4.99984C3.15889 3.33398 1.6665 4.82637 1.6665 6.66732V15.0007C1.6665 16.8416 3.15889 18.334 4.99984 18.334H14.9998C16.8408 18.334 18.3332 16.8416 18.3332 15.0007V6.66732C18.3332 4.82637 16.8408 3.33398 14.9998 3.33398Z"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.6665 1.66699V5.00033M13.3332 1.66699V5.00033M1.66675 8.33366H18.3332"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-white text-lg font-semibold">
            {t('dashboard:changePrices.selectDateRange', { defaultValue: 'Select Date Range' })}
          </span>
        </div>
      </div>
      {/* Form Content */}
      <form className="px-6 py-6 pb-12" onSubmit={handleSubmit}>
        {/* Check-in Date */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-black mb-3">
            {t('dashboard:changePrices.startDate', { defaultValue: 'Start Date' })}
          </label>
          <div className="relative">
            <input
              type="date"
              value={checkIn}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="w-full h-[36px] px-4 py-2 border border-gray-300 rounded text-[12px] text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
              className="absolute right-4 top-2 text-black pointer-events-none"
            >
              <g clipPath="url(#clip0_2006_1228)">
                <path
                  d="M12.7501 2.83398H4.25008C2.68527 2.83398 1.41675 4.10251 1.41675 5.66732V12.7507C1.41675 14.3155 2.68527 15.584 4.25008 15.584H12.7501C14.3149 15.584 15.5834 14.3155 15.5834 12.7507V5.66732C15.5834 4.10251 14.3149 2.83398 12.7501 2.83398Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.66675 1.41699V4.25033M11.3334 1.41699V4.25033M1.41675 7.08366H15.5834"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_2006_1228">
                  <rect width="17" height="17" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        </div>
        {/* Check-out Date */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-black mb-3">
            {t('dashboard:changePrices.endDate', { defaultValue: 'End Date' })}
          </label>
          <div className="relative">
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full h-[36px] px-4 py-2 border border-gray-300 rounded text-[12px] text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              width="17"
              height="17"
              viewBox="0 0 17 17"
              fill="none"
              className="absolute right-4 top-2 text-black pointer-events-none"
            >
              <g clipPath="url(#clip0_2006_483)">
                <path
                  d="M12.7501 2.83398H4.25008C2.68527 2.83398 1.41675 4.10251 1.41675 5.66732V12.7507C1.41675 14.3155 2.68527 15.584 4.25008 15.584H12.7501C14.3149 15.584 15.5834 14.3155 15.5834 12.7507V5.66732C15.5834 4.10251 14.3149 2.83398 12.7501 2.83398Z"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M5.66675 1.41699V4.25033M11.3334 1.41699V4.25033M1.41675 7.08366H15.5834"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_2006_483">
                  <rect width="17" height="17" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </div>
        </div>
        {/* Total Price Input */}
        <div className="mb-3 relative">
          <span className="absolute left-4 top-2 text-lg font-bold text-[#294859] z-10">
            $
          </span>
          <input
            type="text"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            className="w-full h-[36px] pl-8 pr-4 py-2 border border-[#294859] bg-[#BFDBFE] rounded text-lg font-bold text-[#294859] text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Nightly Rate Display */}
        {nightlyRate !== "N/A" && (
          <div className="flex justify-between items-center mb-6">
            <span className="text-[12px] text-[#294859]">{t('dashboard:changePrices.nightlyRate', { defaultValue: 'Nightly rate' })}:</span>
            <span className="text-[12px] text-[#294859]">
              {nightlyRateLoading ? (
                <span className="text-gray-400">{t('common:messages.loading')}</span>
              ) : (
                `$${nightlyRate}`
              )}
            </span>
          </div>
        )}
        {/* Submit Button */}
        <button
          type="submit"
          className="w-full h-[37px] bg-[#294758] text-white text-sm font-semibold rounded-lg hover:bg-[#234149] transition-colors flex items-center justify-center disabled:opacity-50"
          disabled={loading || !propertyId || !checkIn || !checkOut || !totalPrice}
        >
          {loading ? t('common:messages.updating', { defaultValue: 'Updating...' }) : t('common:buttons.submit')}
        </button>
      </form>
    </div>
  );
}

export default function ChangePrices() {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const { propertyId } = useParams();
  // Set default week to current week (today)
  const today = new Date();
  const defaultWeek = getISOWeekNumber(today);
  const [currentWeek, setCurrentWeek] = useState(defaultWeek);
  const [refreshKey, setRefreshKey] = useState(0);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Calculate which ISO week a given date falls into
  const getWeekNumberFromDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();

    // Find which week this date falls into
    for (let week = 1; week <= 53; week++) {
      const weekStart = getWeekStartDate(year, week);
      const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

      if (date >= weekStart && date <= weekEnd) {
        return week;
      }
    }
    return 1; // fallback
  };

  // Handle start date change from StayPeriodSelector
  const handleStartDateChange = (dateString: string) => {
    if (dateString) {
      const weekNumber = getWeekNumberFromDate(dateString);
      setCurrentWeek(weekNumber);
    }
  };

  // Pass propertyId to WeeklyPriceOverview and StayPeriodSelector
  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-hotel-brand mb-2">
            {t('dashboard:changePrices.title')}
          </h1>
          <p className="text-base text-gray-600">
            {t('dashboard:changePrices.subtitle')}
          </p>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* StayPeriodSelector - appears first on mobile, second on desktop */}
        <div className="flex-shrink-0 lg:order-2 flex justify-center lg:justify-start">
          <div className="w-full max-w-md lg:w-auto">
            <StayPeriodSelector
              onStartDateChange={handleStartDateChange}
              propertyId={propertyId}
              onSuccess={() => setRefreshKey((k) => k + 1)}
              setSuccessMsg={setSuccessMsg}
            />
            {successMsg && (
              <div className="w-full lg:w-[275px] mt-4 mx-auto px-4 py-2 bg-green-100 text-green-800 text-center text-sm font-semibold rounded break-words whitespace-pre-line" style={{wordBreak: 'break-word'}}>
                {successMsg}
              </div>
            )}
          </div>
        </div>
        
        {/* WeeklyPriceOverview - appears second on mobile, first on desktop */}
        <div className="flex-1 lg:order-1">
          <WeeklyPriceOverview
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
            propertyId={propertyId}
            refreshKey={refreshKey}
            onPriceChange={() => setRefreshKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  );
}
