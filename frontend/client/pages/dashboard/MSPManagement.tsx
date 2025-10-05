import { useState, useEffect, useContext } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { PropertyContext } from "../../../shared/PropertyContext";
import { toast } from "../../hooks/use-toast";
import "../../styles/responsive-utilities.css";

interface MSPPeriod {
  id: string;
  fromDate: string;
  toDate: string;
  price: string;
  periodTitle: string;
}

export default function MSPManagement() {
  const { property } = useContext(PropertyContext) ?? {};
  const [periods, setPeriods] = useState<MSPPeriod[]>([]);
  const [openCalendar, setOpenCalendar] = useState<{ [key: string]: boolean }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Helper function to get current date in dd/MM/yyyy format
  const getCurrentDate = () => {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, '0');
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Load existing MSP entries when component mounts
  useEffect(() => {
    if (property?.id) {
      loadMSPEntries();
    }
  }, [property?.id]);

  const loadMSPEntries = async () => {
    if (!property?.id) return;
    
    setIsLoading(true);
    try {
      const response = await dynamicPricingService.getPropertyMSPEntries(property.id);
      console.log("Loading existing MSP entries:", response.msp_entries);
      
      // Convert existing entries to the format expected by the form
      const existingPeriods: MSPPeriod[] = response.msp_entries.map((entry, index) => ({
        id: `existing-${entry.id}`,
        fromDate: format(new Date(entry.valid_from), "dd/MM/yyyy"),
        toDate: format(new Date(entry.valid_until), "dd/MM/yyyy"),
        price: entry.msp.toString(),
        periodTitle: entry.period_title || "",
      }));
      
      setPeriods(existingPeriods);
    } catch (err: any) {
      console.error("Error loading MSP entries:", err);
      toast({
        title: "Error",
        description: err.message || 'Failed to load MSP entries',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!property?.id) return;
    
    // Require at least one valid period
    if (
      periods.length === 0 ||
      periods.some(
        (p) => !p.fromDate.trim() || !p.toDate.trim() || !p.price.trim() || isNaN(Number(p.price))
      )
    ) {
      toast({
        title: "Validation Error",
        description: "Please add at least one valid period with dates and price.",
        variant: "destructive",
      });
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
      toast({
        title: "Validation Error",
        description: `Invalid date range: The end date (${invalidPeriod.toDate}) must be after the start date (${invalidPeriod.fromDate}). Please correct the dates and try again.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      // Call the MSP API
      const result = await dynamicPricingService.createPropertyMSP(property.id, { periods });
      
      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Partial Success",
          description: `Some periods could not be saved: ${result.errors.join(', ')}`,
          variant: "destructive",
        });
        return;
      }
      
      console.log("MSP periods saved successfully:", result);
      console.log(`Created: ${result.created_entries?.length || 0} entries`);
      
      toast({
        title: "Success",
        description: "MSP periods saved successfully",
      });
      loadMSPEntries(); // Reload to get updated data
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
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
          <p className="text-responsive-base text-[#485567]">Loading MSP periods...</p>
        </div>
      </div>
    );
  }

  // Show error if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-responsive-lg text-gray-600 mb-4">No property selected</div>
          <div className="text-responsive-sm text-gray-500">Please select a property to manage MSP settings</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container-padding-base">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg container-padding-base">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between container-margin-sm">
            <div className="flex items-center gap-3">
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.25 23.75L23.75 6.25"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.75 12.5C10.8211 12.5 12.5 10.8211 12.5 8.75C12.5 6.67893 10.8211 5 8.75 5C6.67893 5 5 6.67893 5 8.75C5 10.8211 6.67893 12.5 8.75 12.5Z"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21.25 25C23.3211 25 25 23.3211 25 21.25C25 19.1789 23.3211 17.5 21.25 17.5C19.1789 17.5 17.5 19.1789 17.5 21.25C17.5 23.3211 19.1789 25 21.25 25Z"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                  MSP Management
                </h2>
                <p className="text-[#8A8E94] font-bold text-responsive-lg">
                  Manage minimum selling prices for {property.name}
                </p>
              </div>
            </div>
          </div>


          {/* Header */}
          <div className="container-margin-sm">
            <h3 className="text-responsive-lg font-bold text-black container-margin-sm">
              MSP Configuration
            </h3>
          </div>

          {/* Table Headers */}
          <div className="hidden lg:flex items-center gap-[10px] container-margin-sm">
            <div className="w-[448px]">
              <span className="form-label">
                From
              </span>
            </div>
            <div className="w-[448px]">
              <span className="form-label">
                To
              </span>
            </div>
            <div className="w-[448px]">
              <span className="form-label">
                Price
              </span>
            </div>
            <div className="w-[448px]">
              <span className="form-label">
                Period Name (Optional)
              </span>
            </div>
            <div className="w-[60px]">
              {/* Empty space for remove button column */}
            </div>
          </div>

          {/* Periods List */}
          <div className="form-gap-base container-margin-sm">
            {periods.map((period, index) => (
              <div key={period.id}>
                {/* Desktop Layout */}
                <div className="hidden lg:flex items-start gap-[10px]">
                  {/* FROM Column */}
                  <div className="w-[448px]">
                    <div className="border border-[#D7DFE8] bg-gray-50 rounded-[10px] p-[3px]">
                      <div
                        className={`w-full input-height-lg input-padding-base border-none rounded-lg text-left text-responsive-base ${
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
                  <div className="w-[448px]">
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
                            className={`w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-left text-base focus:outline-none ${
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
                  <div className="w-[448px]">
                    <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                      <input
                        type="number"
                        value={period.price}
                        onChange={(e) =>
                          updatePeriod(period.id, "price", e.target.value)
                        }
                        placeholder="Enter price"
                        className="w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-base focus:outline-none text-[#1E1E1E]"
                      />
                    </div>
                  </div>

                  {/* PERIOD TITLE Column */}
                  <div className="w-[448px]">
                    <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                      <input
                        type="text"
                        value={period.periodTitle}
                        onChange={(e) =>
                          updatePeriod(period.id, "periodTitle", e.target.value)
                        }
                        placeholder="e.g., Summer Season, High Season"
                        className="w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-base focus:outline-none text-[#1E1E1E]"
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  {periods.length > 1 && (
                    <button
                      onClick={() => removePeriod(period.id)}
                      className="w-[60px] h-[60px] p-[10px] border border-[#D7DFE8] bg-white rounded-[10px] flex items-center justify-center hover:bg-red-50 transition-colors"
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

                {/* Mobile Layout */}
                <div className="lg:hidden bg-white border border-[#D7DFE8] rounded-lg p-4 space-y-4">
                  {/* Header with remove button */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-[#485567]">
                      Period {index + 1}
                    </h4>
                    {periods.length > 1 && (
                      <button
                        onClick={() => removePeriod(period.id)}
                        className="w-8 h-8 p-1 border border-red-300 bg-red-50 rounded-md flex items-center justify-center hover:bg-red-100 transition-colors"
                      >
                        <svg
                          width="20"
                          height="20"
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

                  {/* Date Range Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#485567] mb-2">
                        From Date
                      </label>
                      <div className="border border-[#D7DFE8] bg-gray-50 rounded-[10px] p-[3px]">
                        <div
                          className={`w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-left text-base ${
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
                    <div>
                      <label className="block text-sm font-medium text-[#485567] mb-2">
                        To Date
                      </label>
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
                              className={`w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-left text-base focus:outline-none ${
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
                  </div>

                  {/* Price and Title Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#485567] mb-2">
                        Price
                      </label>
                      <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                        <input
                          type="number"
                          value={period.price}
                          onChange={(e) =>
                            updatePeriod(period.id, "price", e.target.value)
                          }
                          placeholder="Enter price"
                          className="w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-base focus:outline-none text-[#1E1E1E]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#485567] mb-2">
                        Period Name (Optional)
                      </label>
                      <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                        <input
                          type="text"
                          value={period.periodTitle}
                          onChange={(e) =>
                            updatePeriod(period.id, "periodTitle", e.target.value)
                          }
                          placeholder="e.g., Summer Season"
                          className="w-full h-[54px] px-4 py-[17px] border-none rounded-lg text-base focus:outline-none text-[#1E1E1E]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
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
          <div className="flex justify-end items-center mt-8 mb-4">
            <button
              onClick={handleSave}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                isSaving ? "bg-gray-400 cursor-not-allowed text-white" : "bg-[#294758] text-white hover:bg-[#234149]"
              }`}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>Save MSP</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
