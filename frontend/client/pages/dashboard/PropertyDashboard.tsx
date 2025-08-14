import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PriceCalendar from "../../components/dashboard/PriceCalendar";
import RightSidebar from "../../components/dashboard/RightSidebar";
import { useProperty } from "../../../shared/api/hooks";

export default function PropertyDashboard() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<{
    day: number;
    month: string;
    year: string;
  } | null>(null);

  // Get property details
  const { data: propertyData, isLoading: propertyLoading, error: propertyError } = useProperty(propertyId || '');

  const handleDateClick = (
    day: number,
    month: string = "August",
    year: string = "2025",
  ) => {
    setSelectedDate({ day, month, year });
  };



  // Show loading state while fetching property
  if (propertyLoading) {
    return (
      <div className="flex-1 flex lg:flex-row flex-col overflow-hidden">
        <div className="flex-1 p-3 lg:p-6 overflow-auto">
          <div className="w-full">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
                <p className="text-[16px] text-[#485567]">Loading property details...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (propertyError || !propertyData) {
    return (
      <div className="flex-1 flex lg:flex-row flex-col overflow-hidden">
        <div className="flex-1 p-3 lg:p-6 overflow-auto">
          <div className="w-full">
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Property Not Found</h3>
                <p className="text-gray-600 mb-6">
                  The property you're looking for doesn't exist or you don't have access to it.
                </p>
                <button
                  onClick={handleBackToProperties}
                  className="px-6 py-3 bg-[#294758] text-white rounded-lg hover:bg-[#234149] transition-colors"
                >
                  Back to Properties
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex lg:flex-row flex-col overflow-hidden">
      {/* Calendar Area */}
      <div className="flex-1 p-3 lg:p-6 overflow-auto">
        <div className="w-full">


          {/* Price Calendar */}
          <PriceCalendar onDateClick={handleDateClick} propertyId={propertyId} />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="lg:block md:block sm:hidden">
        <RightSidebar selectedDate={selectedDate} />
      </div>
    </div>
  );
}
