import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { usePropertyMSPEntries } from "../../../shared/api/hooks";
import { removeLocalStorageItem, HOTEL_INFO_KEY, setLocalStorageItem } from "../../../shared/localStorage";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { profilesService } from "../../../shared/api/profiles";
import OnboardingHeaderControls from "../../components/onboarding/OnboardingHeaderControls";
import "../../styles/responsive-utilities.css";

interface MSPPeriod {
  id: string;
  fromDate: string;
  toDate: string;
  price: string;
  periodTitle: string;
}

export default function MSP() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const [property, setProperty] = useState<any>(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(true);
  
  // Use property-specific MSP entries hook once we have the property
  const { data: mspEntriesData, isLoading: mspEntriesLoading } = usePropertyMSPEntries(property?.id || '');
  
  // Fetch user's properties from backend
  useEffect(() => {
    const fetchUserProperty = async () => {
      try {
        console.log('[MSPOnboarding] Fetching user properties from backend');
        const response = await profilesService.getUserProperties();
        
        if (response.properties && response.properties.length > 0) {
          // Get the most recent property (first in the list as they're ordered by creation date)
          const latestProperty = response.properties[0];
          console.log('[MSPOnboarding] Found property:', latestProperty);
          setProperty(latestProperty);
        } else {
          console.log('[MSPOnboarding] No properties found for user');
          setProperty(null);
        }
      } catch (error) {
        console.error('[MSPOnboarding] Error fetching user properties:', error);
        setProperty(null);
      } finally {
        setIsLoadingProperty(false);
      }
    };

    fetchUserProperty();
  }, []);
  
  // Helper function to get current date in dd/MM/yyyy format
  const getCurrentDate = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [periods, setPeriods] = useState<MSPPeriod[]>([
    {
      id: "1",
      fromDate: getCurrentDate(),
      toDate: "",
      price: "0",
      periodTitle: "",
    },
  ]);
  const [openCalendar, setOpenCalendar] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper function to parse ISO date string without timezone conversion
  const parseISODate = (isoDateString: string): Date => {
    // Parse YYYY-MM-DD format directly without timezone conversion
    const [year, month, day] = isoDateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Load existing MSP entries when component mounts
  useEffect(() => {
    if (mspEntriesData?.msp_entries && mspEntriesData.msp_entries.length > 0) {
      console.log("Loading existing MSP entries:", mspEntriesData.msp_entries);
      
      // Convert existing entries to the format expected by the form
      const existingPeriods: MSPPeriod[] = mspEntriesData.msp_entries.map((entry, index) => ({
        id: `existing-${entry.id}`,
        fromDate: format(parseISODate(entry.valid_from), "dd/MM/yyyy"),
        toDate: format(parseISODate(entry.valid_until), "dd/MM/yyyy"),
        price: entry.msp.toString(),
        periodTitle: entry.period_title || "",
      }));
      
      setPeriods(existingPeriods);
    }
  }, [mspEntriesData]);

  // Ensure the first period always starts with the current date
  useEffect(() => {
    setPeriods(currentPeriods => {
      if (currentPeriods.length > 0) {
        const updatedPeriods = [...currentPeriods];
        updatedPeriods[0] = {
          ...updatedPeriods[0],
          fromDate: getCurrentDate()
        };
        return updatedPeriods;
      }
      return currentPeriods;
    });
  }, []); // Run only once when component mounts

  const handleBack = () => {
    navigate("/add-competitor");
  };

  const handleFinish = async () => {
    setError("");
    
    // Require at least one valid period
    if (
      periods.length === 0 ||
      periods.some(
        (p) => !p.fromDate.trim() || !p.toDate.trim() || !p.price.trim() || isNaN(Number(p.price))
      )
    ) {
      setError(t('onboarding:msp.validationError'));
      return;
    }
    
    // Validate date ranges before submitting (allow equal dates for one-day periods)
    const invalidPeriods = periods.filter(period => {
      if (!period.fromDate || !period.toDate) return false; // Skip validation for incomplete periods
      
      const fromDate = parseDate(period.fromDate);
      const toDate = parseDate(period.toDate);
      
      if (!fromDate || !toDate) return true; // Invalid date format
      
      return toDate < fromDate; // End date should be after or equal to start date
    });
    
    if (invalidPeriods.length > 0) {
      const invalidPeriod = invalidPeriods[0]; // Show first invalid period
      setError(`Invalid date range: The end date (${invalidPeriod.toDate}) must be after or equal to the start date (${invalidPeriod.fromDate}). Please correct the dates and try again.`);
      return;
    }
    // Debug: Log property prior to guard
    console.log('[MSPOnboarding] handleFinish invoked');
    console.log('[MSPOnboarding] Property:', property);

    // Ensure we have a property id
    if (!property?.id) {
      setError("No property found. Please complete the hotel setup first.");
      return;
    }

    setIsLoading(true);
    try {
      // Call the MSP API
      console.log('[MSPOnboarding] Submitting MSP to endpoint:', `/dynamic-pricing/properties/${property.id}/msp/`);
      const result = await dynamicPricingService.createPropertyMSP(property.id, { periods });
      
      if (result.errors && result.errors.length > 0) {
        setError(`Some periods could not be saved: ${result.errors.join(', ')}`);
        return;
      }
      
      console.log("MSP periods saved successfully:", result);
      console.log(`Created: ${result.created_entries?.length || 0} entries`);
      
      // Persist selected property for deterministic dashboard redirect
      try {
        setLocalStorageItem("selectedPropertyId", property.id);
        setLocalStorageItem("property_data", property);
        console.log('[MSPOnboarding] Persisted selectedPropertyId and property_data to localStorage');
      } catch (storageErr) {
        console.warn('[MSPOnboarding] Failed to persist property selection:', storageErr);
      }

      // Clear hotel information from localStorage after successful MSP save
      removeLocalStorageItem(HOTEL_INFO_KEY);
      console.log("Hotel information cleared from localStorage");
      
      navigate("/welcome-complete");
    } catch (err: any) {
      console.error("Error saving MSP periods:", err);
      
      // Parse and format error messages for better user experience
      let errorMessage = "Failed to save MSP periods. Please try again.";
      
      if (err?.error) {
        // Handle the specific validation error format from the backend
        if (typeof err.error === 'string' && err.error.includes('Validation error for period')) {
          try {
            // Extract the period data and error details
            const errorMatch = err.error.match(/Validation error for period \{'([^}]+)'\}: \{'([^}]+)'\}/);
            if (errorMatch) {
              const periodData = errorMatch[1];
              const errorDetails = errorMatch[2];
              
              // Parse the period data to get the dates
              const periodMatch = periodData.match(/'fromDate': '([^']+)', 'toDate': '([^']+)'/);
              if (periodMatch) {
                const fromDate = periodMatch[1];
                const toDate = periodMatch[2];
                
                // Check for specific validation errors
                if (errorDetails.includes('valid_until must be after valid_from') || errorDetails.includes('valid_until must be after or equal to valid_from')) {
                  errorMessage = `Invalid date range: The end date (${toDate}) must be after or equal to the start date (${fromDate}). Please correct the dates and try again.`;
                } else if (errorDetails.includes('non_field_errors')) {
                  errorMessage = `Invalid period data: Please check that all dates and prices are valid.`;
                } else {
                  errorMessage = `Period validation error: ${errorDetails.replace(/'/g, '')}`;
                }
              } else {
                errorMessage = `Invalid period data: Please check that all required fields are filled correctly.`;
              }
            } else {
              errorMessage = err.error;
            }
          } catch (parseError) {
            console.error("Error parsing validation error:", parseError);
            errorMessage = err.error;
          }
        } else {
          errorMessage = err.error;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addPeriod = () => {
    // Find the last period with a valid To date
    const lastPeriod = periods[periods.length - 1];
    let nextFromDate = getCurrentDate(); // Default fallback to current date
    
    if (lastPeriod && lastPeriod.toDate) {
      try {
        // Parse the last period's To date
        const lastToDate = parseDate(lastPeriod.toDate);
        if (lastToDate) {
          // Add one day to get the next From date
          const nextDate = new Date(lastToDate);
          nextDate.setDate(nextDate.getDate() + 1);
          
          // Format as dd/mm/yyyy
          const day = nextDate.getDate().toString().padStart(2, '0');
          const month = (nextDate.getMonth() + 1).toString().padStart(2, '0');
          const year = nextDate.getFullYear();
          nextFromDate = `${day}/${month}/${year}`;
        }
      } catch (error) {
        console.error("Error calculating next date:", error);
      }
    }
    
    const newPeriod: MSPPeriod = {
      id: Date.now().toString(),
      fromDate: nextFromDate,
      toDate: "",
      price: "0",
      periodTitle: "",
    };
    setPeriods([...periods, newPeriod]);
  };

  const removePeriod = (id: string) => {
    if (periods.length > 1) {
      setPeriods(periods.filter((period) => period.id !== id));
    }
  };

  const updatePeriod = (id: string, field: keyof MSPPeriod, value: string) => {
    setPeriods(
      periods.map((period) =>
        period.id === id ? { ...period, [field]: value } : period,
      ),
    );
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return "";
    // If already in dd/mm/yyyy format, return as is
    if (dateStr.includes("/")) return dateStr;
    // If it's a Date object string, format it
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const handleDateSelect = (
    date: Date | undefined,
    periodId: string,
    field: "fromDate" | "toDate",
  ) => {
    if (date) {
      const formattedDate = format(date, "dd/MM/yyyy");
      updatePeriod(periodId, field, formattedDate);
    }
    setOpenCalendar((prev) => ({ ...prev, [`${periodId}-${field}`]: false }));
  };

  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined;
    try {
      // Handle dd/mm/yyyy format
      if (dateStr.includes("/")) {
        const [day, month, year] = dateStr.split("/");
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      return new Date(dateStr);
    } catch {
      return undefined;
    }
  };

  // Show loading state while fetching property or MSP entries
  if (isLoadingProperty || mspEntriesLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
          <p className="text-responsive-base text-[#485567]">
            {isLoadingProperty ? t('common:messages.loading') : t('onboarding:msp.loadingPeriods')}
          </p>
        </div>
      </div>
    );
  }

  // Show error if no property found
  if (!property) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-[10px] p-6 max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#EF4444" strokeWidth="1.5"/>
                <path d="M10 6.66667V10M10 13.3333H10.0083" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-responsive-base text-[#EF4444] font-medium">{t('errors:PROPERTY_NOT_FOUND')}</span>
            </div>
            <p className="text-responsive-sm text-[#6B7280] mb-4">
              {t('onboarding:msp.noPropertyMessage')}
            </p>
            <button
              onClick={() => navigate('/hotel-information')}
              className="btn-padding-sm bg-[#294758] text-white rounded-md text-responsive-sm font-medium hover:bg-[#234149] transition-colors"
            >
              {t('onboarding:msp.goToHotelSetup')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8 w-full">
      {/* Language Switcher - Top Right */}
      <OnboardingHeaderControls />
      
      {/* Logo */}
      <div className="text-center container-margin-base">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="logo-base"
        />
      </div>


      {/* Title and Description */}
      <div className="text-center container-margin-base">
        <h1 className="text-responsive-3xl font-bold text-black mb-4">
          {t('onboarding:msp.title')}
        </h1>
        <p className="text-responsive-base text-black">
          {t('onboarding:msp.subtitle')}
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] border border-[#E2E8F0] w-full max-w-[1414px] container-padding-lg relative">
        {/* Header */}
        <div className="container-margin-sm">
          <h2 className="text-responsive-lg font-bold text-black mb-6">
            {t('onboarding:msp.configTitle')}
          </h2>
        </div>

        {/* Periods List */}
        <div className="space-y-5 container-margin-sm">
          {periods.map((period, index) => (
            <div key={period.id} className="flex flex-col lg:flex-row items-start form-gap-sm">
              {/* FROM Column */}
              <div className="flex flex-col gap-3 w-full lg:w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="form-label">
                    {t('onboarding:msp.fromLabel')}
                  </span>
                </div>
                <div className="border border-[#D7DFE8] bg-gray-50 rounded-[10px] p-[3px]">
                  <div
                    className={`w-full input-height-base input-padding-base border-none rounded-lg text-left text-responsive-base ${
                      period.fromDate
                        ? "text-[#1E1E1E]"
                        : "text-[#9CAABD]"
                    }`}
                  >
                    {period.fromDate
                      ? formatDateForDisplay(period.fromDate)
                      : t('onboarding:msp.selectDate')}
                  </div>
                </div>
              </div>

              {/* TO Column */}
              <div className="flex flex-col gap-3 w-full lg:w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="form-label">
                    {t('onboarding:msp.toLabel')}
                  </span>
                </div>
                <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                  <Popover
                    open={openCalendar[`${period.id}-to`]}
                    onOpenChange={(open) =>
                      setOpenCalendar({
                        ...openCalendar,
                        [`${period.id}-to`]: open,
                      })
                    }
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={`w-full input-height-base input-padding-base border-none rounded-lg text-left text-responsive-base focus:outline-none ${
                          period.toDate
                            ? "text-[#1E1E1E]"
                            : "text-[#9CAABD]"
                        }`}
                      >
                        {period.toDate
                          ? formatDateForDisplay(period.toDate)
                          : t('onboarding:msp.selectDate')}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={parseDate(period.toDate)}
                        onSelect={(date) =>
                          handleDateSelect(date, period.id, "toDate")
                        }
                        disabled={(date) =>
                          date < new Date("1900-01-01") ||
                          date > new Date("2100-12-31")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* PRICE Column */}
              <div className="flex flex-col gap-3 w-full lg:w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="form-label">
                    {t('onboarding:msp.priceLabel')}
                  </span>
                </div>
                <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                  <input
                    type="number"
                    value={period.price}
                    onChange={(e) =>
                      updatePeriod(period.id, "price", e.target.value)
                    }
                    placeholder={t('onboarding:msp.pricePlaceholder')}
                    className="w-full input-height-base input-padding-base border-none rounded-lg text-responsive-base focus:outline-none text-[#1E1E1E]"
                  />
                </div>
              </div>

              {/* PERIOD TITLE Column */}
              <div className="flex flex-col gap-3 w-full lg:w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="form-label">
                    {t('onboarding:msp.periodNameLabel')}
                  </span>
                </div>
                <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                  <input
                    type="text"
                    value={period.periodTitle}
                    onChange={(e) =>
                      updatePeriod(period.id, "periodTitle", e.target.value)
                    }
                    placeholder={t('onboarding:msp.periodNamePlaceholder')}
                    className="w-full input-height-base input-padding-base border-none rounded-lg text-responsive-base focus:outline-none text-[#1E1E1E]"
                  />
                </div>
              </div>

              {/* Remove Button */}
              {periods.length > 1 && (
                <button
                  onClick={() => removePeriod(period.id)}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-[60px] md:h-[60px] p-2 sm:p-3 md:p-[10px] border border-[#D7DFE8] bg-white rounded-[10px] flex items-center justify-center hover:bg-red-50 transition-colors mt-8"
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M27.2895 27.4737C27.2895 28.3426 26.9443 29.176 26.3299 29.7904C25.7154 30.4048 24.8821 30.75 24.0132 30.75H16.3684C15.4995 30.75 14.6661 30.4048 14.0517 29.7904C13.4373 29.176 13.0921 28.3426 13.0921 27.4737V14.3684H12V11.0921H16.9145L18.0066 10H22.375L23.4671 11.0921H28.3816V14.3684H27.2895V27.4737ZM14.1842 14.3684V27.4737C14.1842 28.053 14.4143 28.6085 14.824 29.0182C15.2336 29.4278 15.7891 29.6579 16.3684 29.6579H24.0132C24.5924 29.6579 25.148 29.4278 25.5576 29.0182C25.9672 28.6085 26.1974 28.053 26.1974 27.4737V14.3684H14.1842ZM27.2895 13.2763V12.1842H22.9211L21.8289 11.0921H18.5526L17.4605 12.1842H13.0921V13.2763H27.2895ZM16.3684 16.5526H17.4605V27.4737H16.3684V16.5526ZM22.9211 16.5526H24.0132V27.4737H22.9211V16.5526Z"
                      fill="#EF4444"
                    />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add Period Button */}
        <div className="flex justify-center container-margin-sm">
          <button
            onClick={addPeriod}
            className="flex items-center gap-1 btn-padding-sm border border-[#294859] bg-[#E8F0FE] rounded-md text-responsive-xs font-semibold text-[#1E1E1E] hover:bg-[#d7e6fc] transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3.33325 9.99967H9.99992M9.99992 9.99967H16.6666M9.99992 9.99967V3.33301M9.99992 9.99967V16.6663"
                stroke="#1E1E1E"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('onboarding:msp.addPeriodButton')}
          </button>
        </div>

        {/* Divider and Tip */}
        <div className="flex flex-col items-center gap-3 container-margin-sm">
          <div className="w-full h-[1px] bg-[#D7E4EB]"></div>
          <p className="text-responsive-xs text-[#757575] text-center">
            {t('onboarding:msp.tip')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 btn-padding-sm border border-[#D9D9D9] bg-white rounded-md text-responsive-xs font-semibold text-[#294758] hover:bg-gray-50 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.8333 10L4.16658 10M4.16658 10L9.16658 5M4.16658 10L9.16658 15"
                stroke="#294758"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('common:buttons.back')}
          </button>
          
          <button
            onClick={handleFinish}
            className={`btn-padding-base rounded-md text-responsive-xs font-semibold shadow-[0_4px_10px_0_rgba(0,0,0,0.25)] transition-colors flex items-center justify-center gap-2 ${
              isLoading ? "bg-gray-400 cursor-not-allowed text-white" : "bg-[#294758] text-white hover:bg-[#234149]"
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {t('common:messages.saving')}
              </>
            ) : (
              <>{t('common:buttons.finish')}</>
            )}
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 mt-2">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 10.4478 2.78778 8.002C2.78778 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 8.002C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
            </svg>
            <span className="text-responsive-sm text-[#FF0404] font-medium">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
