import { AlertTriangle } from "lucide-react";
import { useEffect, useState, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import CompetitorPrices from "./CompetitorPrices";
import { usePriceForDate } from "../../../shared/api/hooks";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { ConnectionContext } from '../../../shared/ConnectionContext';

interface DateDetailsContentProps {
  selectedDate: { day: number; month: string; year: string } | null;
  propertyId?: string;
  onPriceUpdate?: () => void;
  onModalClose?: () => void;
  hasPMS?: boolean;
  selectedPriceOption?: string;
}

export default function DateDetailsContent({ 
  selectedDate, 
  propertyId, 
  onPriceUpdate, 
  onModalClose,
  hasPMS, 
  selectedPriceOption 
}: DateDetailsContentProps) {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  console.log('[DateDetailsContent] hasPMS:', hasPMS);
  
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
  
  // Compute ISO date for selected date (or today fallback)
  const computeISODate = (d: { day: number; month: string; year: string } | null) => {
    if (!d) return undefined;
    const monthNum = getMonthNumber(d.month);
    if (isNaN(monthNum)) return undefined;
    const iso = `${d.year}-${monthNum.toString().padStart(2, '0')}-${d.day.toString().padStart(2, '0')}`;
    console.log('[DateDetailsContent] computeISODate', { input: d, monthNum, iso });
    return iso;
  };

  const selectedISODate = computeISODate(selectedDate);
  const { data: selectedDayPriceHistory } = usePriceForDate(propertyId, selectedISODate);
  console.log('[DateDetailsContent] hook result', {
    propertyId,
    selectedISODate,
    selectedDayPriceHistory,
  });
  
  const [mspForDay, setMspForDay] = useState<null | { loading: boolean; msp: any | null }>({ loading: false, msp: null });

  const connectionContext = useContext(ConnectionContext);
  const isConnected = connectionContext?.isConnected ?? true;
  console.log('[DateDetailsContent] Render. isConnected:', isConnected);

  // Compute effectiveDate: use selectedDate if set, otherwise today
  // Memoize to avoid recalculating on every render
  const effectiveDate = useMemo(() => {
    if (selectedDate) return selectedDate;
    const today = new Date();
    return {
      day: today.getDate(),
      month: today.toLocaleString('en-US', { month: 'long' }), // Force English month name
      year: today.getFullYear().toString(),
    };
  }, [selectedDate]);

  useEffect(() => {
    if (propertyId && effectiveDate) {
      const monthNum = getMonthNumber(effectiveDate.month);
      if (isNaN(monthNum)) {
        console.warn('[DateDetailsContent] Invalid month name for effectiveDate:', effectiveDate.month);
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
  }, [propertyId, effectiveDate, getMonthNumber]);

  return (
    <div className="flex flex-col gap-6">
      {/* Competitor Prices - Only show when user has selected a date */}
      {selectedDate && propertyId && (
        <CompetitorPrices
          selectedDate={selectedDate}
          propertyId={propertyId}
          onPriceUpdate={onPriceUpdate}
          onModalClose={onModalClose}
          selectedDayPriceHistory={selectedDayPriceHistory}
        />
      )}

      {/* MSP Information */}
      {propertyId && selectedDate && !mspForDay.loading && mspForDay.msp && (
        <div className="text-center text-responsive-base font-medium text-[#294758] py-2">
          {t('dashboard:calendar.mspForThisDay', { msp: mspForDay.msp.msp })}
        </div>
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
            <span className="text-responsive-sm font-medium text-hotel-warning-orange">
              {t('dashboard:calendar.noPmsConfigured')}
            </span>
          </div>
        )}
        
        
        {/* MSP Warning - show for selected date only */}
        {propertyId && selectedDate && !mspForDay.loading && !mspForDay.msp && (
          <div className="flex items-center gap-[7px] px-[25px] py-[12px] border border-hotel-warning-red-border rounded-lg bg-hotel-warning-red-bg">
            <AlertTriangle
              size={25}
              className="text-hotel-warning-orange flex-shrink-0"
            />
            <span className="text-responsive-sm font-medium text-hotel-warning-orange">
              {t('dashboard:calendar.noMspConfigured')}
            </span>
          </div>
        )}
        
      </div>
    </div>
  );
}
