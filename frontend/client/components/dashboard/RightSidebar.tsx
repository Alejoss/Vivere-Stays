import { ChevronDown, AlertTriangle } from "lucide-react";
import { useEffect, useState, useContext } from "react";
import { Link } from "react-router-dom";
import CompetitorPrices from "./CompetitorPrices";
import { usePriceHistory } from "../../../shared/api/hooks";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { ConnectionContext } from '../../../shared/ConnectionContext';

const priceOptions = [
  "Recommended Price",
  "PMS Price",
  "Competitor Average",
  "MSP",
];

interface RightSidebarProps {
  selectedDate: { day: number; month: string; year: string } | null;
  propertyId?: string;
  onPriceUpdate?: () => void;
  hasPMS?: boolean;
}

export default function RightSidebar({ selectedDate, propertyId, onPriceUpdate, hasPMS }: RightSidebarProps) {
  console.log('[RightSidebar] hasPMS:', hasPMS);
  // Always call the hook, handle data conditionally
  const year = selectedDate ? parseInt(selectedDate.year, 10) : undefined;
  const month = selectedDate ? new Date(`${selectedDate.month} 1, 2000`).getMonth() + 1 : undefined;
  const { data: priceHistoryData } = usePriceHistory(propertyId || '', year, month);

  let selectedDayPriceHistory = null;
  if (priceHistoryData && selectedDate && month !== undefined) {
    const dateStr = `${selectedDate.year}-${month.toString().padStart(2, '0')}-${selectedDate.day.toString().padStart(2, '0')}`;
    selectedDayPriceHistory = priceHistoryData.price_history.find((entry: any) => entry.checkin_date === dateStr) || null;
  }
  const [selectedPrice, setSelectedPrice] = useState("Recommended Price");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mspForDay, setMspForDay] = useState<null | { loading: boolean; msp: any | null }>({ loading: false, msp: null });

  const connectionContext = useContext(ConnectionContext);
  const isConnected = connectionContext?.isConnected ?? true;
  console.log('[RightSidebar] Render. isConnected:', isConnected);

  // Compute effectiveDate: use selectedDate if set, otherwise today
  const getEffectiveDate = () => {
    if (selectedDate) return selectedDate;
    const today = new Date();
    return {
      day: today.getDate(),
      month: today.toLocaleString('en-US', { month: 'long' }), // Force English month name
      year: today.getFullYear().toString(),
    };
  };
  const effectiveDate = getEffectiveDate();

  useEffect(() => {
    if (propertyId && effectiveDate) {
      const monthNum = new Date(`${effectiveDate.month} 1, 2000`).getMonth() + 1;
      if (isNaN(monthNum)) {
        console.warn('[RightSidebar] Invalid month name for effectiveDate:', effectiveDate.month);
        setMspForDay({ loading: false, msp: null });
        return;
      }
      const dateStr = `${effectiveDate.year}-${monthNum.toString().padStart(2, '0')}-${effectiveDate.day.toString().padStart(2, '0')}`;
      setMspForDay({ loading: true, msp: null });
      dynamicPricingService.getMSPForDate(propertyId, dateStr)
        .then((msp) => setMspForDay({ loading: false, msp }))
        .catch(() => setMspForDay({ loading: false, msp: null }));
    } else {
      setMspForDay({ loading: false, msp: null });
    }
  }, [propertyId, selectedDate]);

  return (
    <div className="w-full lg:w-[378px] flex flex-col gap-6 p-4 lg:pl-6 lg:pr-6 lg:mr-6">
      {/* Change Prices Button */}
      <div className="flex justify-end">
        <Link
          to="/dashboard/change-prices"
          className="px-[22px] py-[13px] bg-hotel-brand rounded-lg text-white text-[14px] font-medium hover:bg-hotel-brand-dark transition-colors"
        >
          Change Prices
        </Link>
      </div>

      {/* Price Type Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center justify-between w-full px-[15px] py-[13px] border border-hotel-border-light rounded-md bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="text-[14px] font-normal text-black">
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
                onClick={() => {
                  setSelectedPrice(option);
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-[15px] py-[13px] text-left text-[14px] font-normal hover:bg-gray-50 transition-colors ${
                  selectedPrice === option
                    ? "bg-blue-50 text-blue-700"
                    : "text-black"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Competitor Prices - Only show when user has selected a date */}
      {selectedDate && propertyId && (
        <CompetitorPrices
          selectedDate={selectedDate}
          propertyId={propertyId}
          onPriceUpdate={onPriceUpdate}
          selectedDayPriceHistory={selectedDayPriceHistory}
        />
      )}

      {/* Warning Messages */}
      <div className="flex flex-col gap-[6px]">
        {/* No PMS Configured Warning */}
        {hasPMS === false && (
          <div className="flex items-center gap-[7px] px-[25px] py-[12px] border border-hotel-warning-red-border rounded-lg bg-hotel-warning-red-bg mb-2">
            <AlertTriangle
              size={25}
              className="text-hotel-warning-orange flex-shrink-0"
            />
            <span className="text-[14px] font-medium text-hotel-warning-orange">
              No PMS configured
            </span>
          </div>
        )}
        {/* Profile Warning */}
        <div className="flex items-center gap-[7px] px-[25px] py-[17px] border border-hotel-warning-orange-border rounded-lg bg-hotel-warning-orange-bg">
          <AlertTriangle
            size={25}
            className="text-hotel-warning-orange flex-shrink-0"
          />
          <span className="text-[14px] font-medium text-hotel-warning-orange">
            Complete your profile to get better recommendations
          </span>
        </div>
        {/* MSP Warning - show for today if no date selected, or for selected date */}
        {propertyId && !mspForDay.loading && !mspForDay.msp && (
          <div className="flex items-center gap-[7px] px-[25px] py-[12px] border border-hotel-warning-red-border rounded-lg bg-hotel-warning-red-bg">
            <AlertTriangle
              size={25}
              className="text-hotel-warning-orange flex-shrink-0"
            />
            <span className="text-[14px] font-medium text-hotel-warning-orange">
              No MSP configured
            </span>
          </div>
        )}
        {/* Dynamic PMS warning */}
        {!isConnected && (
          <div className="flex items-center gap-[7px] px-[25px] py-[12px] border border-hotel-warning-red-border rounded-lg bg-hotel-warning-red-bg mb-2">
            <AlertTriangle
              size={25}
              className="text-hotel-warning-orange flex-shrink-0"
            />
            <span className="text-[14px] font-medium text-hotel-warning-orange">
              If the PMS is not connected (live mode), changes will not be reflected in the PMS.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
