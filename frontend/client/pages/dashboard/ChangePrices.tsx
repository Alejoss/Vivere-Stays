import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserProperties, usePriceHistory } from "../../../shared/api/hooks";
import { dynamicPricingService } from "../../../shared/api/dynamic";

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
}: {
  currentWeek: number;
  setCurrentWeek: (week: number) => void;
}) {
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  // Get user's propertyId
  const { data: userPropertiesData, isLoading: propertiesLoading } = useUserProperties();
  const propertyId = userPropertiesData?.properties?.[0]?.id || null;

  // Calculate week dates
  const weekDates = generateWeekDates(currentWeek);
  const weekYear = 2025; // Hardcoded for now
  const weekMonth = weekDates[0]?.fullDate.getMonth() + 1; // 1-indexed

  // Fetch price history for the month
  const { data: priceHistoryData, isLoading: priceLoading, refetch } = usePriceHistory(
    propertyId || '',
    weekYear,
    weekMonth
  );

  // Helper: get price entry for a date
  const getPriceEntryForDate = (dateObj: Date) => {
    if (!priceHistoryData?.price_history) return null;
    const dateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
    return priceHistoryData.price_history.find((entry) => entry.checkin_date === dateStr) || null;
  };

  // Handle price change
  const handlePriceChange = async (index: number, newValue: string) => {
    if (!propertyId) return;
    const dateObj = weekDates[index]?.fullDate;
    if (!dateObj) return;
    const dateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${dateObj.getDate().toString().padStart(2, "0")}`;
    try {
      await dynamicPricingService.updateOverwritePrice(propertyId, dateStr, Number(newValue));
      alert("Price changed successfully");
      refetch();
    } catch (e) {
      alert("Failed to change price");
    }
  };

  if (propertiesLoading || priceLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }
  if (!propertyId) {
    return <div className="p-8 text-center">No property found.</div>;
  }

  const goToPreviousWeek = () => {
    setCurrentWeek(Math.max(1, currentWeek - 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(Math.min(53, currentWeek + 1));
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
      <div className="bg-hotel-brand rounded-t-lg p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="text-white" size={20} />
          <span className="text-white text-[20px] font-bold">
            Weekly Price Overview
          </span>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={goToPreviousWeek}
            className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            disabled={currentWeek <= 1}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-6 py-3 bg-white/90 rounded-2xl shadow-lg border border-white/20 backdrop-blur-sm">
            <span className="text-hotel-brand text-[16px] font-bold">
              Week {currentWeek}
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
      <div className="px-6 py-4 bg-hotel-brand relative">
        <button
          onClick={() => setShowMonthDropdown(!showMonthDropdown)}
          className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
        >
          <span className="text-[16px]">{getCurrentMonthYear(currentWeek)}</span>
          <div
            className={`w-5 h-5 transition-transform ${showMonthDropdown ? "rotate-180" : ""}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 13L13 7L5 7L9 13Z" />
            </svg>
          </div>
        </button>

        {showMonthDropdown && (
          <div className="absolute top-full left-6 right-6 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {monthNames.map((month, index) => (
              <button
                key={index}
                onClick={() => handleMonthSelect(index)}
                className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-b-0"
              >
                {month} 2025
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Headers */}
      <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-4">
        <div className="w-[140px] flex items-center">
          <span className="text-hotel-brand font-semibold text-[16px]">
            Hotel
          </span>
        </div>
        <div className="flex-1 flex items-center justify-between px-4">
          {weekDates.map((date, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-3 w-[78px] lg:w-[90px] xl:w-[110px]"
            >
              <span className="text-hotel-brand text-[18px] font-bold">
                {date.day}
              </span>
              <span className="text-gray-700 text-[16px] font-semibold">
                {date.date}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Competitor Rows */}
      {weeklyData.competitors.map((competitor, rowIndex) => (
        <div
          key={rowIndex}
          className="flex items-center border-b border-gray-200 px-4 py-4"
        >
          <div className="w-[140px]">
            <span className="text-black text-[16px] font-normal">
              {competitor.name}
            </span>
          </div>
          <div className="flex-1 flex items-center justify-between px-4">
            {competitor.values.map((value, index) => (
              <div key={index} className="w-[78px] lg:w-[90px] xl:w-[110px] flex justify-center">
                {competitor.type === "occupancy" ? (
                  <div
                    className={`px-2 py-1 rounded text-[14px] font-semibold ${getOccupancyColor(value)}`}
                  >
                    {value}
                  </div>
                ) : (
                  <div className="px-3 py-1 bg-gray-100 rounded text-[13px] text-gray-600">
                    {value}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Your Price Row (dynamic) */}
      <div className="flex items-center bg-gray-50 border-b-2 border-hotel-brand px-4 py-5 rounded-b-lg">
        <div className="w-[140px]">
          <span className="text-black text-[20px] font-bold">Your Price</span>
        </div>
        <div className="flex-1 flex items-center justify-between px-4">
          {weekDates.map((date, index) => {
            const priceEntry = getPriceEntryForDate(date.fullDate);
            const price = priceEntry
              ? priceEntry.overwrite && priceEntry.price
                ? priceEntry.price
                : priceEntry.price
              : "";
            return (
              <div key={index} className="w-[100px] lg:w-[120px] xl:w-[140px] flex justify-center">
                <div className="relative flex items-center w-full">
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[17px] text-[#294859] font-bold z-10">$</span>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => handlePriceChange(index, e.target.value)}
                    className="w-full pl-5 pr-2 py-1 border-0 border-b-2 border-[#294859] bg-transparent text-center text-[20px] text-[#294859] font-bold focus:outline-none focus:border-blue-500 transition-colors duration-200"
                    style={{ minWidth: 70, maxWidth: 110 }}
                    maxLength={5}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StayPeriodSelector({
  onStartDateChange,
}: {
  onStartDateChange: (date: string) => void;
}) {
  const [checkIn, setCheckIn] = useState("2025-08-05");
  const [checkOut, setCheckOut] = useState("2025-08-10");
  const [totalPrice, setTotalPrice] = useState("337.50");

  // Static nightly rate for informational purposes only
  const nightlyRate = "67.50";

  // Handle start date change and notify parent
  const handleStartDateChange = (date: string) => {
    setCheckIn(date);
    onStartDateChange(date);
  };

  return (
    <div className="w-[275px] h-[460px] bg-white rounded-lg border border-gray-200 shadow-lg">
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
              d="M6.6665 1.66699V5.00033M13.3332 1.66699V5.00033M1.6665 8.33366H18.3332"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-white text-[18px] font-semibold">
            Select Date Range
          </span>
        </div>
      </div>

      {/* Form Content */}
      <div className="px-6 py-6 pb-12">
        {/* Check-in Date */}
        <div className="mb-6">
          <label className="block text-[14px] font-semibold text-black mb-3">
            Start Date
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
          <label className="block text-[14px] font-semibold text-black mb-3">
            End Date
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
          <span className="absolute left-4 top-2 text-[17px] font-bold text-[#294859] z-10">
            $
          </span>
          <input
            type="text"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            className="w-full h-[36px] pl-8 pr-4 py-2 border border-[#294859] bg-[#BFDBFE] rounded text-[17px] font-bold text-[#294859] text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Nightly Rate Display */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-[12px] text-[#294859]">Nightly rate:</span>
          <span className="text-[12px] text-[#294859]">${nightlyRate}</span>
        </div>

        {/* Submit Button */}
        <button className="w-full h-[37px] bg-[#2766EC] text-white text-[14px] font-semibold rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center">
          Submit
        </button>
      </div>
    </div>
  );
}

export default function ChangePrices() {
  const [currentWeek, setCurrentWeek] = useState(29); // Start with week 29 (mid-July 2025)

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[28px] font-bold text-hotel-brand mb-2">
              Change Prices
            </h1>
            <p className="text-[16px] text-gray-600">
              Adjust your pricing strategy based on competitor analysis
            </p>
          </div>
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-hotel-brand hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-[14px] font-medium">
              Back to Price Calendar
            </span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 p-6">
        <div className="flex-1">
          <WeeklyPriceOverview
            currentWeek={currentWeek}
            setCurrentWeek={setCurrentWeek}
          />
        </div>
        <div className="flex-shrink-0">
          <StayPeriodSelector onStartDateChange={handleStartDateChange} />
        </div>
      </div>
    </div>
  );
}
