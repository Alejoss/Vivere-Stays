import { useState, useContext } from "react";
import PriceCalendar from "../../components/dashboard/PriceCalendar";
import RightSidebar from "../../components/dashboard/RightSidebar";
import { PropertyContext } from "../../../shared/PropertyContext";
import { hasPMSConfigured } from "../../../shared/utils/pmsUtils";

export default function Index() {
  const [selectedDate, setSelectedDate] = useState<{
    day: number;
    month: string;
    year: string;
  } | null>(null);

  const { property } = useContext(PropertyContext) ?? {};

  const handleDateClick = (
    day: number,
    month: string = "August",
    year: string = "2025",
  ) => {
    setSelectedDate({ day, month, year });
  };

  return (
    <div className="flex-1 flex lg:flex-row flex-col overflow-hidden">
      {/* Calendar Area */}
      <div className="flex-1 p-3 lg:p-6 overflow-auto">
        <div className="w-full">
          <PriceCalendar onDateClick={handleDateClick} />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="lg:block md:block sm:hidden">
        <RightSidebar selectedDate={selectedDate} hasPMS={hasPMSConfigured(property)} />
      </div>
    </div>
  );
}
