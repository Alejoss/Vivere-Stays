import { Plus, Save, Trash2, Calendar, Info } from "lucide-react";
import { useState, useEffect, useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import type { 
  LosSetupRule, 
  CreateLosSetupRuleRequest,
  UpdateLosSetupRuleRequest
} from "../../../shared/api/dynamic";

export default function LosSetupRules() {
  const { property } = useContext(PropertyContext) ?? {};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Weekday options
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // State management
  const [setupRules, setSetupRules] = useState<LosSetupRule[]>([]);

  // Load existing data on component mount
  useEffect(() => {
    if (property?.id) {
      loadExistingData();
    }
  }, [property?.id]);

  const loadExistingData = async () => {
    if (!property?.id) return;
    
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      const response = await dynamicPricingService.getLosSetupRules(property.id);
      setSetupRules(response.setups);
    } catch (error) {
      console.error("Error loading LOS setup data:", error);
      setErrorMessage("Failed to load existing LOS setup configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const addSetupRule = () => {
    const newRule: Partial<LosSetupRule> = {
      id: `temp_${Date.now()}` as any,
      property_id: property?.id || "",
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date().toISOString().split('T')[0],
      day_of_week: "Monday",
      los_value: 1,
      num_competitors: 2, // Default value
      los_aggregation: "min", // Default value
    };
    setSetupRules([...setupRules, newRule as LosSetupRule]);
  };

  const removeSetupRule = async (id: number | string) => {
    if (!property?.id) return;

    try {
      if (typeof id === 'number') {
        // This is an existing rule - delete it from the backend
        await dynamicPricingService.deleteLosSetupRule(property.id, id);
      }
      
      // Remove from local state regardless of whether it was a new or existing rule
      setSetupRules(setupRules.filter(rule => rule.id !== id));
    } catch (error: any) {
      console.error("Error deleting setup rule:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = "Failed to delete setup rule. Please try again.";
      
      // Try to parse the detail field first
      if (error?.detail) {
        try {
          const errorData = JSON.parse(error.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.detail;
        }
      } else if (error?.response?.data?.detail) {
        try {
          const errorData = JSON.parse(error.response.data.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.response.data.detail;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setErrorMessage(errorMessage);
    }
  };

  const updateSetupRule = (id: number | string, field: string, value: string | number) => {
    setSetupRules(setupRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const saveRule = async (rule: LosSetupRule) => {
    if (!property?.id) return;

    try {
      if (typeof rule.id === 'string') {
        // This is a new rule - create it
        const createData: CreateLosSetupRuleRequest = {
          property_id: property.id,
          valid_from: rule.valid_from,
          valid_until: rule.valid_until,
          day_of_week: rule.day_of_week,
          los_value: rule.los_value,
          num_competitors: 2, // Default value
          los_aggregation: "min", // Default value
        };

        const response = await dynamicPricingService.createLosSetupRule(property.id, createData);
        
        // Update the rule in state with the new ID from the response
        setSetupRules(setupRules.map(r => 
          r.id === rule.id ? { ...response.setup } : r
        ));
      } else {
        // This is an existing rule - update it
        const updateData: UpdateLosSetupRuleRequest = {
          valid_from: rule.valid_from,
          valid_until: rule.valid_until,
          day_of_week: rule.day_of_week,
          los_value: rule.los_value,
          num_competitors: 2, // Default value
          los_aggregation: "min", // Default value
        };

        await dynamicPricingService.updateLosSetupRule(property.id, rule.id, updateData);
      }
    } catch (error: any) {
      console.error("Error saving rule:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = "Failed to save rule. Please try again.";
      
      // Try to parse the detail field first
      if (error?.detail) {
        try {
          const errorData = JSON.parse(error.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.detail;
        }
      } else if (error?.response?.data?.detail) {
        try {
          const errorData = JSON.parse(error.response.data.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.response.data.detail;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setErrorMessage(errorMessage);
    }
  };

  const handleSaveAll = async () => {
    if (!property?.id) {
      setErrorMessage("No property selected");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      // Save all rules that need saving
      const savePromises = setupRules.map(rule => saveRule(rule));
      await Promise.all(savePromises);
      
      setSaveMessage("All LOS setup rules saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
      
    } catch (error: any) {
      console.error("Error saving LOS setup rules:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = "Failed to save LOS setup rules. Please try again.";
      
      // Try to parse the detail field first
      if (error?.detail) {
        try {
          const errorData = JSON.parse(error.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.detail;
        }
      } else if (error?.response?.data?.detail) {
        try {
          const errorData = JSON.parse(error.response.data.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              if (Array.isArray(messages)) {
                errorMessages.push(`${field}: ${messages.join(', ')}`);
              } else {
                errorMessages.push(`${field}: ${messages}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.response.data.detail;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">No property selected</div>
          <div className="text-sm text-gray-500">Please select a property to configure LOS setup rules</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <Calendar size={34} className="text-[#287CAC]" />
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                LOS Setup Rules
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                Configure length of stay requirements by weekday.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-medium">Loading LOS setup rules...</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {saveMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-green-800 font-medium">{saveMessage}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-xs">✕</span>
                </div>
                <span className="text-red-800 font-medium">{errorMessage}</span>
              </div>
            </div>
          )}


          {/* Setup Rules Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-black">Setup Rules</h3>
              {setupRules.length > 0 && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {setupRules.length} rule{setupRules.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-[#D0DFE6] mb-6">
              {/* Table Headers */}
              <div className="grid grid-cols-5 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">From</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">To</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">Day</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">LOS Value</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                </div>
              </div>

              {/* Table Rows */}
              {setupRules.map((rule, index) => (
                <div key={rule.id || index} className="grid grid-cols-5 gap-0">
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="date"
                      value={rule.valid_from}
                      onChange={(e) => updateSetupRule(rule.id, 'valid_from', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="date"
                      value={rule.valid_until}
                      onChange={(e) => updateSetupRule(rule.id, 'valid_until', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <select
                      value={rule.day_of_week}
                      onChange={(e) => updateSetupRule(rule.id, 'day_of_week', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {weekdays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="number"
                      value={rule.los_value}
                      onChange={(e) => updateSetupRule(rule.id, 'los_value', parseInt(e.target.value))}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      min="1"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6] flex justify-center">
                    <button
                      onClick={() => removeSetupRule(rule.id)}
                      disabled={isLoading || isSaving}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button 
                onClick={addSetupRule}
                disabled={isLoading || isSaving}
                className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                Add Setup Rule
              </button>
              
              <button 
                onClick={handleSaveAll}
                disabled={isSaving || isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
