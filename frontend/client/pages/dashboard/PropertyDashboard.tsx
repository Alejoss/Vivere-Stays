import { useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PriceCalendar from "../../components/dashboard/PriceCalendar";
import RightSidebar from "../../components/dashboard/RightSidebar";
import { PropertyContext } from "../../../shared/PropertyContext";

export default function PropertyDashboard() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<{
    day: number;
    month: string;
    year: string;
  } | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [selectedPriceOption, setSelectedPriceOption] = useState("Average Daily Rate");

  // Get property from context
  const { property } = useContext(PropertyContext) ?? {};

  // Use property ID from context instead of URL params to ensure we have the correct property after fallback
  const effectivePropertyId = property?.id || propertyId;

  const handleDateClick = (
    day: number,
    month: string = "September",
    year: string = "2025",
  ) => {
    setSelectedDate({ day, month, year });
  };

  const handlePriceUpdate = () => setCalendarRefreshKey((k) => k + 1);

  const handlePriceOptionChange = (option: string) => {
    setSelectedPriceOption(option);
  };

  // Show loading state while property is not loaded
  if (!property) {
    return (
      <div className="flex-1 flex lg:flex-row flex-col overflow-hidden">
        <div className="flex-1 p-3 lg:p-6 overflow-auto">
          <div className="w-full">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
                <p className="text-base text-[#485567]">Loading property details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('[PropertyDashboard] property.pms:', property.pms);

  return (
    <div className="flex-1 flex lg:flex-row flex-col overflow-hidden">
      {/* Calendar Area */}
      <div className="flex-1 p-3 lg:p-6 overflow-auto">
        <div className="w-full">         
          {/* Price Calendar */}
          <PriceCalendar 
            onDateClick={handleDateClick} 
            propertyId={effectivePropertyId} 
            refreshKey={calendarRefreshKey}
            onPriceOptionChange={handlePriceOptionChange}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="lg:block md:block sm:hidden">        
        <RightSidebar 
          selectedDate={selectedDate} 
          propertyId={effectivePropertyId} 
          onPriceUpdate={handlePriceUpdate} 
          hasPMS={!!property.pms}
          selectedPriceOption={selectedPriceOption}
        />
      </div>
    </div>
  );
}
