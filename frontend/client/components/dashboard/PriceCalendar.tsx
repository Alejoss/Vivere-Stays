import { ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { useState, useEffect } from "react";
import { usePriceHistory, useUserProperties } from "../../../shared/api/hooks";

type CalendarCell = {
  day: number;
  price: string;
  occupancy: string;
} | null;

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

// Function to get the first day of the month (0 = Sunday, 1 = Monday, etc.)
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Function to get the number of days in a month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Function to generate calendar data for any month/year
const generateCalendarData = (
  year: number,
  month: number,
  priceHistory: Array<{ checkin_date: string; price: number; occupancy_level: string }> = []
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
    const priceData = priceHistory.find(item => item.checkin_date === dateStr);
    
    currentWeek.push({
      day,
      price: priceData ? `$${priceData.price}` : "$200", // Default price if no data
      occupancy: priceData ? priceData.occupancy_level : "medium", // Default occupancy if no data
    });

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

const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
  onClick,
}: {
  day: number;
  price: string;
  occupancy: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-[100px] sm:w-[80px] md:w-[100px] lg:w-[120px] xl:w-[140px] h-[59px] sm:h-[50px] md:h-[59px] lg:h-[70px] xl:h-[80px] rounded-lg ${getOccupancyColor(occupancy)} p-[10px] sm:p-[8px] md:p-[10px] lg:p-[12px] xl:p-[14px] justify-center items-center hover:scale-105 transition-transform cursor-pointer`}
    >
      <div className="flex flex-col items-center gap-[5px] sm:gap-[3px] md:gap-[5px] text-white">
        <span className="text-[16px] sm:text-[14px] md:text-[16px] font-normal">
          {price}
        </span>
        <span className="text-[12px] sm:text-[10px] md:text-[12px] font-normal">
          {day}
        </span>
      </div>
    </button>
  );
}

interface PriceCalendarProps {
  onDateClick: (day: number, month?: string, year?: string) => void;
  propertyId?: string; // Optional prop for when we know the property ID
}

export default function PriceCalendar({ onDateClick, propertyId }: PriceCalendarProps) {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tempYear, setTempYear] = useState(new Date().getFullYear());
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(propertyId || null);

  // Get user properties (only if no propertyId is provided)
  const { data: userPropertiesData, isLoading: propertiesLoading } = useUserProperties();
  
  // Get price history for the selected property and month
  const { data: priceHistoryData, isLoading: priceHistoryLoading } = usePriceHistory(
    selectedPropertyId || '',
    currentYear,
    currentMonth + 1 // Convert to 1-indexed for API
  );

  // Set the first property as selected when properties are loaded (only if no propertyId is provided)
  useEffect(() => {
    if (!propertyId && userPropertiesData?.properties && userPropertiesData.properties.length > 0 && !selectedPropertyId) {
      setSelectedPropertyId(userPropertiesData.properties[0].id);
    }
  }, [userPropertiesData, selectedPropertyId, propertyId]);

  const calendarData = generateCalendarData(
    currentYear, 
    currentMonth, 
    priceHistoryData?.price_history || []
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

  const toggleMonthPicker = () => {
    if (!showMonthPicker) {
      setTempYear(currentYear);
    }
    setShowMonthPicker(!showMonthPicker);
  };

  // Show loading state while fetching properties (only if no propertyId is provided)
  if (!propertyId && propertiesLoading) {
    return (
      <div className="w-full max-w-none bg-white border border-hotel-border-light rounded-[9px] p-4 lg:p-[26px]">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#294758] mx-auto mb-4"></div>
            <p className="text-[16px] text-[#485567]">Loading properties...</p>
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
            <p className="text-[16px] text-[#485567]">No properties found. Please add a property first.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none bg-white border border-hotel-border-light rounded-[9px] p-4 lg:p-[26px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[57px]">
        <h2 className="text-[24px] font-bold text-black">Price Calendar</h2>

                  <div className="flex items-center gap-4">
            {/* Property Selector - only show if no propertyId is provided */}
            {!propertyId && userPropertiesData?.properties && (
              <select
                value={selectedPropertyId || ''}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="px-3 py-2 border border-[#E7E7EA] rounded-[5px] bg-white text-black"
              >
                {userPropertiesData.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            )}

          {/* Navigation buttons */}
          <button
            onClick={goToPreviousMonth}
            className="flex items-center justify-center w-[45px] h-[38px] border border-[#E7E7EA] rounded-[5px] bg-white hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={12} className="text-black" />
          </button>

          {/* Month/Year display - Clickable with fixed width */}
          <div className="relative">
            <button
              onClick={toggleMonthPicker}
              className="flex items-center justify-center gap-1 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors w-[180px]"
            >
              <span className="text-[19px] font-semibold text-black">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <ChevronUp
                size={20}
                className={`text-black transition-transform ${showMonthPicker ? "rotate-180" : ""}`}
              />
            </button>

            {/* Month/Year Picker Dropdown */}
            {showMonthPicker && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[280px]">
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
                    Close
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

      {/* Calendar */}
      <div className="flex flex-col gap-[14px]">
        {/* Day Headers */}
        <div className="flex items-center gap-1">
          {dayHeaders.map((day) => (
            <div
              key={day}
              className="flex w-[100px] sm:w-[80px] md:w-[100px] lg:w-[120px] xl:w-[140px] justify-center items-center py-1"
            >
              <span className="text-[16px] sm:text-[14px] md:text-[16px] font-medium text-gray-500">
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex flex-col gap-1">
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="flex items-center gap-1">
              {week.map((cell, cellIndex) =>
                cell ? (
                  <CalendarCell
                    key={cell.day}
                    day={cell.day}
                    price={cell.price}
                    occupancy={cell.occupancy}
                    onClick={() => handleDateClick(cell.day)}
                  />
                ) : (
                  <div
                    key={`empty-${weekIndex}-${cellIndex}`}
                    className="w-[100px] sm:w-[80px] md:w-[100px] lg:w-[120px] xl:w-[140px] h-[59px] sm:h-[50px] md:h-[59px] lg:h-[70px] xl:h-[80px]"
                  />
                ),
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-[18px] h-[18px] bg-hotel-occupancy-low" />
            <span className="text-[14px] font-normal text-black">
              0-35% (Low occupancy)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[18px] h-[18px] bg-hotel-occupancy-medium" />
            <span className="text-[14px] font-normal text-black">
              36-69% (Medium occupancy)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[18px] h-[18px] bg-hotel-occupancy-high" />
            <span className="text-[14px] font-normal text-black">
              70%+ (High occupancy)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
