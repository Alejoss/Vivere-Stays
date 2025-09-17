import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { useDynamicMSPEntries } from "../../../shared/api/hooks";
import { removeLocalStorageItem, HOTEL_INFO_KEY } from "../../../shared/localStorage";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";

interface MSPPeriod {
  id: string;
  fromDate: string;
  toDate: string;
  price: string;
  periodTitle: string;
}

export default function MSP() {
  const navigate = useNavigate();
  const { property } = useContext(PropertyContext) ?? {};
  const { data: mspEntriesData, isLoading: mspEntriesLoading } = useDynamicMSPEntries();
  
  // Debug: Log context and localStorage on mount
  useEffect(() => {
    try {
      const selectedPropertyId = localStorage.getItem('selectedPropertyId');
      const propertyDataRaw = localStorage.getItem('property_data');
      let propertyData: any = null;
      try { propertyData = propertyDataRaw ? JSON.parse(propertyDataRaw) : null; } catch (e) { /* ignore parse error */ }
      console.log('[MSPOnboarding] Mount');
      console.log('[MSPOnboarding] PropertyContext.property:', property);
      console.log('[MSPOnboarding] localStorage.selectedPropertyId:', selectedPropertyId);
      console.log('[MSPOnboarding] localStorage.property_data:', propertyData);
    } catch (e) {
      console.warn('[MSPOnboarding] Error reading localStorage for debugging', e);
    }
  }, [property]);
  
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

  // Load existing MSP entries when component mounts
  useEffect(() => {
    if (mspEntriesData?.msp_entries && mspEntriesData.msp_entries.length > 0) {
      console.log("Loading existing MSP entries:", mspEntriesData.msp_entries);
      
      // Convert existing entries to the format expected by the form
      const existingPeriods: MSPPeriod[] = mspEntriesData.msp_entries.map((entry, index) => ({
        id: `existing-${entry.id}`,
        fromDate: format(new Date(entry.valid_from), "dd/MM/yyyy"),
        toDate: format(new Date(entry.valid_until), "dd/MM/yyyy"),
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
      setError("Please add at least one valid period with dates and price.");
      return;
    }
    
    // Validate date ranges before submitting
    const invalidPeriods = periods.filter(period => {
      if (!period.fromDate || !period.toDate) return false; // Skip validation for incomplete periods
      
      const fromDate = parseDate(period.fromDate);
      const toDate = parseDate(period.toDate);
      
      if (!fromDate || !toDate) return true; // Invalid date format
      
      return toDate <= fromDate; // End date should be after start date
    });
    
    if (invalidPeriods.length > 0) {
      const invalidPeriod = invalidPeriods[0]; // Show first invalid period
      setError(`Invalid date range: The end date (${invalidPeriod.toDate}) must be after the start date (${invalidPeriod.fromDate}). Please correct the dates and try again.`);
      return;
    }
    // Debug: Log property prior to guard
    try {
      const selectedPropertyId = localStorage.getItem('selectedPropertyId');
      console.log('[MSPOnboarding] handleFinish invoked');
      console.log('[MSPOnboarding] PropertyContext.property:', property);
      console.log('[MSPOnboarding] localStorage.selectedPropertyId:', selectedPropertyId);
    } catch {}

    // Resolve property id from context or localStorage fallback
    const resolvedPropertyId = property?.id || localStorage.getItem('selectedPropertyId') || '';
    if (!resolvedPropertyId) {
      setError("Missing property context. Please go back and ensure the property is selected/created.");
      return;
    }

    setIsLoading(true);
    try {
      // Call the MSP API
      console.log('[MSPOnboarding] Submitting MSP to endpoint:', `/dynamic-pricing/properties/${resolvedPropertyId}/msp/`);
      const result = await dynamicPricingService.createPropertyMSP(resolvedPropertyId, { periods });
      
      if (result.errors && result.errors.length > 0) {
        setError(`Some periods could not be saved: ${result.errors.join(', ')}`);
        return;
      }
      
      console.log("MSP periods saved successfully:", result);
      console.log(`Created: ${result.created_entries?.length || 0} entries`);
      
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
                if (errorDetails.includes('valid_until must be after valid_from')) {
                  errorMessage = `Invalid date range: The end date (${toDate}) must be after the start date (${fromDate}). Please correct the dates and try again.`;
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

  // Show loading state while fetching MSP entries
  if (mspEntriesLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
          <p className="text-[16px] text-[#485567]">Loading existing MSP periods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8">
      <OnboardingProgressTracker currentStep="msp" />
      {/* Logo */}
      <div className="text-center mb-10">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="w-[240px] h-[121px]"
        />
      </div>

      {/* Progress Bar */}
      <div className="flex justify-center items-center mb-10 w-full max-w-[1245px]">
        {/* Payment - Completed */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="25"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.0644 15.25C10.8715 15.2352 10.692 15.1455 10.5644 15L7.56443 12C7.49759 11.86 7.47579 11.7028 7.50201 11.5499C7.52824 11.3971 7.60121 11.2561 7.71088 11.1464C7.82055 11.0368 7.96152 10.9638 8.11439 10.9376C8.26725 10.9113 8.42448 10.9331 8.56443 11L11.0344 13.47L19.5644 4.99998C19.7044 4.93314 19.8616 4.91133 20.0145 4.93756C20.1673 4.96379 20.3083 5.03676 20.418 5.14643C20.5277 5.2561 20.6006 5.39707 20.6269 5.54993C20.6531 5.70279 20.6313 5.86003 20.5644 5.99998L11.5644 15C11.4369 15.1455 11.2574 15.2352 11.0644 15.25Z"
                fill="#16B257"
              />
              <path
                d="M12.5646 21.0002C10.956 20.9976 9.37758 20.564 7.99348 19.7444C6.60939 18.9249 5.47023 17.7493 4.69456 16.3402C4.10575 15.2898 3.7414 14.1286 3.62456 12.9302C3.44154 11.1723 3.78017 9.39935 4.59821 7.83264C5.41624 6.26592 6.67747 4.97474 8.22456 4.12017C9.27493 3.53136 10.4361 3.16701 11.6346 3.05017C12.8287 2.92284 14.0363 3.03849 15.1846 3.39017C15.287 3.41064 15.3841 3.4523 15.4695 3.51246C15.5549 3.57263 15.6268 3.64998 15.6806 3.73955C15.7344 3.82913 15.7689 3.92896 15.7818 4.03263C15.7948 4.13631 15.7859 4.24155 15.7558 4.34161C15.7258 4.44167 15.6751 4.53433 15.6071 4.61367C15.5391 4.69301 15.4553 4.75726 15.361 4.80232C15.2668 4.84738 15.1641 4.87224 15.0597 4.87531C14.9552 4.87839 14.8513 4.85961 14.7546 4.82017C13.7833 4.52756 12.7632 4.43236 11.7546 4.54017C10.7574 4.64145 9.79119 4.94423 8.91456 5.43017C8.06969 5.89628 7.32271 6.52103 6.71456 7.27017C6.08842 8.03333 5.62086 8.91376 5.33925 9.85989C5.05764 10.806 4.96766 11.7988 5.07456 12.7802C5.17583 13.7773 5.47862 14.7436 5.96456 15.6202C6.43066 16.465 7.05542 17.212 7.78845 17.8202C8.55161 18.4463 9.43204 18.9139 10.3782 19.1955C11.3243 19.4771 12.3171 19.5671 13.2984 19.4602C14.2956 19.3589 15.2618 19.0561 16.1385 18.5702C16.9833 18.1041 17.7303 17.4793 18.3385 16.7302C18.9646 15.967 19.4322 15.0866 19.7138 14.1405C19.9954 13.1943 20.0854 12.2015 19.9785 11.2202C19.9586 11.012 20.0222 10.8044 20.1553 10.6431C20.2885 10.4818 20.4803 10.3801 20.6884 10.3602C20.8966 10.3403 21.1042 10.4039 21.2655 10.5371C21.4268 10.6702 21.5286 10.862 21.5485 11.0702C21.7305 12.8291 21.3904 14.6028 20.5705 16.1696C19.7507 17.7364 18.4874 19.027 16.9384 19.8802C15.8769 20.4931 14.6978 20.8748 13.4784 21.0002H12.5484Z"
                fill="#16B257"
              />
            </svg>
            <span className="text-[18px] font-medium text-[#16B257]">
              Payment
            </span>
          </div>
          <div className="w-[31px] h-[2px] bg-[#294859]"></div>
        </div>

        {/* Add Competitor Hotels - Completed */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="25"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.0644 15.25C10.8715 15.2352 10.692 15.1455 10.5644 15L7.56443 12C7.49759 11.86 7.47579 11.7028 7.50201 11.5499C7.52824 11.3971 7.60121 11.2561 7.71088 11.1464C7.82055 11.0368 7.96152 10.9638 8.11439 10.9376C8.26725 10.9113 8.42448 10.9331 8.56443 11L11.0344 13.47L19.5644 4.99998C19.7044 4.93314 19.8616 4.91133 20.0145 4.93756C20.1673 4.96379 20.3083 5.03676 20.418 5.14643C20.5277 5.2561 20.6006 5.39707 20.6269 5.54993C20.6531 5.70279 20.6313 5.86003 20.5644 5.99998L11.5644 15C11.4369 15.1455 11.2574 15.2352 11.0644 15.25Z"
                fill="#16B257"
              />
              <path
                d="M12.5646 21.0002C10.956 20.9976 9.37758 20.564 7.99348 19.7444C6.60939 18.9249 5.47023 17.7493 4.69456 16.3402C4.10575 15.2898 3.7414 14.1286 3.62456 12.9302C3.44154 11.1723 3.78017 9.39935 4.59821 7.83264C5.41624 6.26592 6.67747 4.97474 8.22456 4.12017C9.27493 3.53136 10.4361 3.16701 11.6346 3.05017C12.8287 2.92284 14.0363 3.03849 15.1846 3.39017C15.287 3.41064 15.3841 3.4523 15.4695 3.51246C15.5549 3.57263 15.6268 3.64998 15.6806 3.73955C15.7344 3.82913 15.7689 3.92896 15.7818 4.03263C15.7948 4.13631 15.7859 4.24155 15.7558 4.34161C15.7258 4.44167 15.6751 4.53433 15.6071 4.61367C15.5391 4.69301 15.4553 4.75726 15.361 4.80232C15.2668 4.84738 15.1641 4.87224 15.0597 4.87531C14.9552 4.87839 14.8513 4.85961 14.7546 4.82017C13.7833 4.52756 12.7632 4.43236 11.7546 4.54017C10.7574 4.64145 9.79119 4.94423 8.91456 5.43017C8.06969 5.89628 7.32271 6.52103 6.71456 7.27017C6.08842 8.03333 5.62086 8.91376 5.33925 9.85989C5.05764 10.806 4.96766 11.7988 5.07456 12.7802C5.17583 13.7773 5.47862 14.7436 5.96456 15.6202C6.43066 16.465 7.05542 17.212 7.78845 17.8202C8.55161 18.4463 9.43204 18.9139 10.3782 19.1955C11.3243 19.4771 12.3171 19.5671 13.2984 19.4602C14.2956 19.3589 15.2618 19.0561 16.1385 18.5702C16.9833 18.1041 17.7303 17.4793 18.3385 16.7302C18.9646 15.967 19.4322 15.0866 19.7138 14.1405C19.9954 13.1943 20.0854 12.2015 19.9785 11.2202C19.9586 11.012 20.0222 10.8044 20.1553 10.6431C20.2885 10.4818 20.4803 10.3801 20.6884 10.3602C20.8966 10.3403 21.1042 10.4039 21.2655 10.5371C21.4268 10.6702 21.5286 10.862 21.5485 11.0702C21.7305 12.8291 21.3904 14.6028 20.5705 16.1696C19.7507 17.7364 18.4874 19.027 16.9384 19.8802C15.8769 20.4931 14.6978 20.8748 13.4784 21.0002H12.5484Z"
                fill="#16B257"
              />
            </svg>
            <span className="text-[18px] font-medium text-[#16B257]">
              Add Competitor Hotels
            </span>
          </div>
          <div className="w-[31px] h-[2px] bg-[#294859]"></div>
        </div>

        {/* MSP - Current */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_74_60601)">
                <path
                  d="M10.5646 19.1663C15.6271 19.1663 19.7313 15.0622 19.7313 9.99967C19.7313 4.93717 15.6271 0.833008 10.5646 0.833008C5.50212 0.833008 1.39795 4.93717 1.39795 9.99967C1.39795 15.0622 5.50212 19.1663 10.5646 19.1663ZM10.5646 10.833C10.7856 10.833 10.9976 10.7452 11.1539 10.5889C11.3102 10.4326 11.3979 10.2207 11.3979 9.99967C11.3979 9.77866 11.3102 9.5667 11.1539 9.41042C10.9976 9.25414 10.7856 9.16634 10.5646 9.16634C10.3436 9.16634 10.1316 9.25414 9.97536 9.41042C9.81908 9.5667 9.73128 9.77866 9.73128 9.99967C9.73128 10.2207 9.81908 10.4326 9.97536 10.5889C10.1316 10.7452 10.3436 10.833 10.5646 10.833ZM10.5646 12.4997C11.2277 12.4997 11.8635 12.2363 12.3324 11.7674C12.8012 11.2986 13.0646 10.6627 13.0646 9.99967C13.0646 9.33663 12.8012 8.70075 12.3324 8.23191C11.8635 7.76307 11.2277 7.49967 10.5646 7.49967C9.90157 7.49967 9.26569 7.76307 8.79685 8.23191C8.32801 8.70075 8.06462 9.33663 8.06462 9.99967C8.06462 10.6627 8.32801 11.2986 8.79685 11.7674C9.26569 12.2363 9.90157 12.4997 10.5646 12.4997ZM10.5646 14.1663C11.6697 14.1663 12.7295 13.7274 13.5109 12.946C14.2923 12.1646 14.7313 11.1047 14.7313 9.99967C14.7313 8.8946 14.2923 7.8348 13.5109 7.0534C12.7295 6.27199 11.6697 5.83301 10.5646 5.83301C9.45955 5.83301 8.39974 6.27199 7.61834 7.0534C6.83694 7.8348 6.39795 8.8946 6.39795 9.99967C6.39795 11.1047 6.83694 12.1646 7.61834 12.946C8.39974 13.7274 9.45955 14.1663 10.5646 14.1663Z"
                  stroke="#294859"
                  strokeWidth="1.66667"
                />
              </g>
              <defs>
                <clipPath id="clip0_74_60601">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(0.564453)"
                  />
                </clipPath>
              </defs>
            </svg>
            <span className="text-[18px] font-medium text-[#9CAABD]">MSP</span>
          </div>
        </div>
      </div>

      {/* Title and Description */}
      <div className="text-center mb-12">
        <h1 className="text-[32px] font-bold text-black mb-4">
          Setting Minimum Prices
        </h1>
        <p className="text-[16px] text-black">
          Defines minimum prices (MSP) by date period
        </p>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] border border-[#E2E8F0] w-full max-w-[1414px] p-[53px] relative">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-[18px] font-bold text-black mb-6">
            MSP Configuration
          </h2>
        </div>

        {/* Periods List */}
        <div className="space-y-5 mb-8">
          {periods.map((period, index) => (
            <div key={period.id} className="flex items-start gap-[10px]">
              {/* FROM Column */}
              <div className="flex flex-col gap-3 w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[16px] font-bold text-[#485567]">
                    From
                  </span>
                </div>
                <div className="border border-[#D7DFE8] bg-gray-50 rounded-[10px] p-[3px]">
                  <div
                    className={`w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-left text-[16px] ${
                      period.fromDate
                        ? "text-[#1E1E1E]"
                        : "text-[#9CAABD]"
                    }`}
                  >
                    {period.fromDate
                      ? formatDateForDisplay(period.fromDate)
                      : "Select date"}
                  </div>
                </div>
              </div>

              {/* TO Column */}
              <div className="flex flex-col gap-3 w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[16px] font-bold text-[#485567]">
                    To
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
                        className={`w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-left text-[16px] focus:outline-none ${
                          period.toDate
                            ? "text-[#1E1E1E]"
                            : "text-[#9CAABD]"
                        }`}
                      >
                        {period.toDate
                          ? formatDateForDisplay(period.toDate)
                          : "Select date"}
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
              <div className="flex flex-col gap-3 w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[16px] font-bold text-[#485567]">
                    Price
                  </span>
                </div>
                <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                  <input
                    type="number"
                    value={period.price}
                    onChange={(e) =>
                      updatePeriod(period.id, "price", e.target.value)
                    }
                    placeholder="Enter price"
                    className="w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-[16px] focus:outline-none text-[#1E1E1E]"
                  />
                </div>
              </div>

              {/* PERIOD TITLE Column */}
              <div className="flex flex-col gap-3 w-[448px]">
                <div className="flex items-center gap-[6px]">
                  <span className="text-[16px] font-bold text-[#485567]">
                    Period Name (Optional)
                  </span>
                </div>
                <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                  <input
                    type="text"
                    value={period.periodTitle}
                    onChange={(e) =>
                      updatePeriod(period.id, "periodTitle", e.target.value)
                    }
                    placeholder="e.g., Summer Season, High Season"
                    className="w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-[16px] focus:outline-none text-[#1E1E1E]"
                  />
                </div>
              </div>

              {/* Remove Button */}
              {periods.length > 1 && (
                <button
                  onClick={() => removePeriod(period.id)}
                  className="w-[60px] h-[60px] p-[10px] border border-[#D7DFE8] bg-white rounded-[10px] flex items-center justify-center hover:bg-red-50 transition-colors mt-8"
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
        <div className="flex justify-center mb-8">
          <button
            onClick={addPeriod}
            className="flex items-center gap-1 px-[28px] py-[7px] border border-[#294859] bg-[#E8F0FE] rounded-md text-[12px] font-semibold text-[#1E1E1E] hover:bg-[#d7e6fc] transition-colors"
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
            Add period
          </button>
        </div>

        {/* Divider and Tip */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-full h-[1px] bg-[#D7E4EB]"></div>
          <p className="text-[10px] text-[#757575] text-center">
            💡 The price is automatically recommended when selecting the final
            date
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-[28px] py-[10px] border border-[#D9D9D9] bg-white rounded-md text-[12px] font-semibold text-[#294758] hover:bg-gray-50 transition-colors"
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
            Back
          </button>
          
          <button
            onClick={handleFinish}
            className={`px-[54px] py-[10px] rounded-md text-[12px] font-semibold shadow-[0_4px_10px_0_rgba(0,0,0,0.25)] transition-colors flex items-center justify-center gap-2 ${
              isLoading ? "bg-gray-400 cursor-not-allowed text-white" : "bg-[#294758] text-white hover:bg-[#234149]"
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>Finish</>
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
            <span className="text-[14px] text-[#FF0404] font-medium">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}
