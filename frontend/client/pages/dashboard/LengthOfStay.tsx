import { Plus, Save, ChevronDown, Calendar, Info, Trash2 } from "lucide-react";
import { useState, useEffect, useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import type { 
  LosSetupRule, 
  LosReductionRule, 
  CreateLosSetupRuleRequest,
  CreateLosReductionRuleRequest,
  UpdateLosSetupRuleRequest,
  UpdateLosReductionRuleRequest
} from "../../../shared/api/dynamic";

export default function LengthOfStay() {
  const { property } = useContext(PropertyContext) ?? {};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingGeneralSettings, setIsUpdatingGeneralSettings] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Lead time categories from DpDynamicIncrementsV2
  const leadTimeCategories = [
    { value: '0-1', label: '0-1 days' },
    { value: '1-3', label: '1-3 days' },
    { value: '3-7', label: '3-7 days' },
    { value: '7-14', label: '7-14 days' },
    { value: '14-30', label: '14-30 days' },
    { value: '30-45', label: '30-45 days' },
    { value: '45-60', label: '45-60 days' },
    { value: '60+', label: '60+ days' },
  ];

  // Occupancy categories from DpDynamicIncrementsV2
  const occupancyCategories = [
    { value: '0-30', label: '0-30%' },
    { value: '30-50', label: '30-50%' },
    { value: '50-70', label: '50-70%' },
    { value: '70-80', label: '70-80%' },
    { value: '80-90', label: '80-90%' },
    { value: '90-100', label: '90-100%' },
    { value: '100+', label: '100%+' },
  ];

  // Weekday options
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // LOS aggregation methods
  const aggregationMethods = [
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
  ];

  // State management - using proper types
  const [setupRules, setSetupRules] = useState<LosSetupRule[]>([]);
  const [reductionRules, setReductionRules] = useState<LosReductionRule[]>([]);
  const [competitorCount, setCompetitorCount] = useState("2");
  const [aggregationMethod, setAggregationMethod] = useState("min");

  // Load existing data on component mount
  useEffect(() => {
    if (property?.id) {
      loadExistingData();
      loadGeneralSettings();
    }
  }, [property?.id]);

  const loadGeneralSettings = async () => {
    if (!property?.id) return;
    
    try {
      console.log('Loading general settings for property:', property.id);
      const generalSettings = await dynamicPricingService.getGeneralSettings(property.id);
      
      console.log('Loaded general settings:', generalSettings);
      
      // Set competitor count and aggregation method from general settings
      setCompetitorCount(generalSettings.min_competitors?.toString() || "2");
      setAggregationMethod(generalSettings.comp_price_calculation || "min");
      
      console.log('Set competitor count to:', generalSettings.min_competitors, 'and aggregation to:', generalSettings.comp_price_calculation);
      
    } catch (error) {
      console.error("Error loading general settings:", error);
      // Don't set error message for general settings as it's not critical
    }
  };

  const loadExistingData = async () => {
    if (!property?.id) return;
    
    console.log('Loading existing LOS data for property:', property.id);
    setIsLoading(true);
    setErrorMessage("");
    
    try {
      // Load both setup and reduction rules in parallel
      const [setupResponse, reductionResponse] = await Promise.all([
        dynamicPricingService.getLosSetupRules(property.id),
        dynamicPricingService.getLosReductionRules(property.id)
      ]);
      
      console.log('Loaded setup rules:', setupResponse.setups);
      console.log('Loaded reduction rules:', reductionResponse.reductions);
      
      setSetupRules(setupResponse.setups);
      setReductionRules(reductionResponse.reductions);
      
    } catch (error) {
      console.error("Error loading LOS data:", error);
      setErrorMessage("Failed to load existing LOS configuration");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions to update general settings
  const updateCompetitorCount = async (newCount: string) => {
    setCompetitorCount(newCount);
    
    if (!property?.id) return;
    
    setIsUpdatingGeneralSettings(true);
    try {
      const countValue = parseInt(newCount);
      if (countValue >= 1) {
        await dynamicPricingService.updateGeneralSettings(property.id, {
          min_competitors: countValue
        });
        console.log('Updated min_competitors to:', countValue);
      }
    } catch (error) {
      console.error('Error updating competitor count:', error);
      // Revert the state on error
      setCompetitorCount(competitorCount);
    } finally {
      setIsUpdatingGeneralSettings(false);
    }
  };

  const updateAggregationMethod = async (newMethod: string) => {
    setAggregationMethod(newMethod);
    
    if (!property?.id) return;
    
    setIsUpdatingGeneralSettings(true);
    try {
      await dynamicPricingService.updateGeneralSettings(property.id, {
        comp_price_calculation: newMethod
      });
      console.log('Updated comp_price_calculation to:', newMethod);
    } catch (error) {
      console.error('Error updating aggregation method:', error);
      // Revert the state on error
      setAggregationMethod(aggregationMethod);
    } finally {
      setIsUpdatingGeneralSettings(false);
    }
  };

  // Helper functions
  const addSetupRule = () => {
    const newRule: Partial<LosSetupRule> = {
      // No ID - this is a new rule that doesn't exist in database yet
      // Use temporary key for UI purposes only
      id: `temp_${Date.now()}` as any,
      property_id: property?.id || "",
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date().toISOString().split('T')[0],
      day_of_week: "Monday",
      los_value: 1,
      num_competitors: parseInt(competitorCount),
      los_aggregation: aggregationMethod,
    };
    setSetupRules([...setupRules, newRule as LosSetupRule]);
  };

  const removeSetupRule = (id: number) => {
    setSetupRules(setupRules.filter(rule => rule.id !== id));
  };

  const updateSetupRule = (id: number, field: string, value: string | number) => {
    setSetupRules(setupRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const addReductionRule = () => {
    const newRule: Partial<LosReductionRule> = {
      // No ID - this is a new rule that doesn't exist in database yet
      // Use temporary key for UI purposes only
      id: `temp_${Date.now()}` as any,
      property_id: property?.id || "",
      lead_time_days: 7, // Default to 7 days
      occupancy_level: "50-70", // Default occupancy level
      los_value: 1,
    };
    setReductionRules([...reductionRules, newRule as LosReductionRule]);
  };

  const removeReductionRule = (id: number) => {
    setReductionRules(reductionRules.filter(rule => rule.id !== id));
  };

  const updateReductionRule = (id: number, field: string, value: string | number) => {
    setReductionRules(reductionRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const handleSave = async () => {
    if (!property?.id) {
      setErrorMessage("No property selected");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setErrorMessage("");

    try {
      // Save setup rules
      await saveSetupRules();
      
      // Save reduction rules
      await saveReductionRules();
      
      setSaveMessage("LOS configuration saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
      
    } catch (error) {
      console.error("Error saving LOS configuration:", error);
      setErrorMessage("Failed to save LOS configuration. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveSetupRules = async () => {
    if (!property?.id) return;

    // Separate existing rules (numeric IDs from database) from new rules (string temp IDs)
    const existingRules = setupRules.filter(rule => typeof rule.id === 'number');
    const newRules = setupRules.filter(rule => typeof rule.id === 'string');
    
    console.log('Saving setup rules:', {
      total: setupRules.length,
      existing: existingRules.length,
      new: newRules.length,
      existingIds: existingRules.map(r => r.id)
    });

    // Update existing rules
    for (const rule of existingRules) {
      const updateData: UpdateLosSetupRuleRequest = {
        valid_from: rule.valid_from,
        valid_until: rule.valid_until,
        day_of_week: rule.day_of_week,
        los_value: rule.los_value,
        num_competitors: parseInt(competitorCount),
        los_aggregation: aggregationMethod,
      };
      
      await dynamicPricingService.updateLosSetupRule(property.id, rule.id, updateData);
    }

    // Create new rules
    if (newRules.length > 0) {
      const createRequests: CreateLosSetupRuleRequest[] = newRules.map(rule => ({
        property_id: property.id, // Include property_id as required by backend
        valid_from: rule.valid_from,
        valid_until: rule.valid_until,
        day_of_week: rule.day_of_week,
        los_value: rule.los_value,
        num_competitors: parseInt(competitorCount),
        los_aggregation: aggregationMethod,
      }));

      console.log('Creating setup rules with data:', createRequests);

      const response = await dynamicPricingService.bulkCreateLosSetupRules(property.id, {
        setups: createRequests
      });
      
      // Reload data to get the new rules with proper IDs
      await loadExistingData();
    }
  };

  const saveReductionRules = async () => {
    if (!property?.id) return;

    // Separate existing rules (numeric IDs from database) from new rules (string temp IDs)
    const existingRules = reductionRules.filter(rule => typeof rule.id === 'number');
    const newRules = reductionRules.filter(rule => typeof rule.id === 'string');
    
    console.log('Saving reduction rules:', {
      total: reductionRules.length,
      existing: existingRules.length,
      new: newRules.length,
      existingIds: existingRules.map(r => r.id)
    });

    // Update existing rules
    for (const rule of existingRules) {
      const updateData: UpdateLosReductionRuleRequest = {
        lead_time_days: rule.lead_time_days,
        occupancy_level: rule.occupancy_level,
        los_value: rule.los_value,
      };
      
      await dynamicPricingService.updateLosReductionRule(property.id, rule.id, updateData);
    }

    // Create new rules
    if (newRules.length > 0) {
      const createRequests: CreateLosReductionRuleRequest[] = newRules.map(rule => ({
        property_id: property.id, // Include property_id as required by backend
        lead_time_days: rule.lead_time_days,
        occupancy_level: rule.occupancy_level,
        los_value: rule.los_value,
      }));

      console.log('Creating reduction rules with data:', createRequests);

      const response = await dynamicPricingService.bulkCreateLosReductionRules(property.id, {
        reductions: createRequests
      });
      
      // Reload data to get the new rules with proper IDs
      await loadExistingData();
    }
  };


  // Show loading state if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">No property selected</div>
          <div className="text-sm text-gray-500">Please select a property to configure LOS settings</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <Calendar size={34} className="text-[#287CAC]" />
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Length of Stay
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                Price adjustments based on weekdays.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-medium">Loading LOS configuration...</span>
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

          {/* Algorithm Info Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-[#294758] mb-3">
              Algorithm checks for changes on this tab: Daily at 9am
            </h3>
            <div className="text-black/60 text-base leading-relaxed">
              <p className="mb-4">
                The Dynamic LOS worksheet contains two sets of rules that work
                together to calculate the Length of Stay (LOS) requirements.
              </p>
              <p className="mb-2">
                <strong>How It Works Together:</strong>
              </p>
              <ul className="space-y-1 text-sm">
                <li>
                  • Competitor Analysis → The system checks how many competitors
                  apply LOS &gt; 1 for each date.
                </li>
                <li>
                  • Day Preferences → Weekday-specific LOS rules are applied
                  within the chosen date range.
                </li>
                <li>
                  • Combination → The system takes the larger value between
                  competitor-driven LOS and weekday LOS rules.
                </li>
                <li>
                  • Reduction → If lead time and occupancy thresholds are met,
                  the LOS is reduced.
                </li>
                <li>
                  • Final LOS → Produces the recommended LOS for each date.
                </li>
              </ul>
            </div>
          </div>

          {/* LOS Setup Rules */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-black">
                LOS Setup Rules
              </h3>
              {setupRules.length > 0 && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {setupRules.length} existing rule{setupRules.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* General Settings Update Indicator */}
            {isUpdatingGeneralSettings && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-800 text-sm font-medium">Updating general settings...</span>
                </div>
              </div>
            )}

            {/* Competitors LOS Section */}
            <div className="mb-6 overflow-hidden rounded-lg border border-[#D0DFE6] max-w-2xl">
              <div className="grid grid-cols-2 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 border-r border-[#D0DFE6]">
                  <span className="text-base font-semibold">
                    Competitors LOS
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">Value</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 border-r border-t border-[#D0DFE6] flex items-center gap-2">
                  <span className="text-base font-semibold">
                    Number of Competitors
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-[#EFF6FF] p-4 border-t border-[#D0DFE6]">
                  <input
                    type="number"
                    value={competitorCount}
                    onChange={(e) => updateCompetitorCount(e.target.value)}
                    disabled={isLoading || isSaving || isUpdatingGeneralSettings}
                    className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    min="1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 border-r border-t border-[#D0DFE6] flex items-center gap-2">
                  <span className="text-base font-semibold">
                    LOS Aggregation Method
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-[#EFF6FF] p-4 border-t border-[#D0DFE6]">
                  <select
                    value={aggregationMethod}
                    onChange={(e) => updateAggregationMethod(e.target.value)}
                    disabled={isLoading || isSaving || isUpdatingGeneralSettings}
                    className="w-full px-4 py-2 border border-hotel-divider rounded bg-white text-sm font-semibold text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aggregationMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Setup Rules Table */}
            <div className="overflow-hidden rounded-lg border border-[#D0DFE6] mb-6">
              {/* Table Headers */}
              <div className="grid grid-cols-5 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">From</span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">To</span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">
                    Restriction Day
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">
                    LOS Value
                  </span>
                  <Info size={24} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold text-center">Actions</span>
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
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={addSetupRule}
              disabled={isLoading || isSaving}
              className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={20} />
              Add LOS Set Up Rule
            </button>
          </div>

          {/* Example Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-[#294758] mb-3">Example</h3>
            <div className="text-black/60 text-base leading-relaxed">
              <p>
                If at least 3 competitors show an LOS restriction → apply
                competitor LOS.
              </p>
              <p>
                If Monday and Tuesday require 2 nights → apply weekday rule.
              </p>
              <p>
                The system takes the larger value between competitor-driven LOS
                and weekday LOS rules.
              </p>
            </div>
          </div>

          {/* LOS Reduction Rules */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-black">
                LOS Reduction Rules
              </h3>
              {reductionRules.length > 0 && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {reductionRules.length} existing rule{reductionRules.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Reduction Rules Table */}
            <div className="overflow-hidden rounded-lg border border-[#D0DFE6] mb-6">
              {/* Table Headers */}
              <div className="grid grid-cols-4 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">
                    Lead Time
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">
                    Occupancy
                  </span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold">Length of Stay</span>
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                  <span className="text-base font-semibold text-center"></span>
                </div>
              </div>

              {/* Table Rows */}
              {reductionRules.map((rule, index) => (
                <div key={rule.id || index} className="grid grid-cols-4 gap-0">
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="number"
                      value={rule.lead_time_days}
                      onChange={(e) => updateReductionRule(rule.id, 'lead_time_days', parseInt(e.target.value))}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      min="1"
                      placeholder="Days"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <select
                      value={rule.occupancy_level}
                      onChange={(e) => updateReductionRule(rule.id, 'occupancy_level', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {occupancyCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="number"
                      value={rule.los_value}
                      onChange={(e) => updateReductionRule(rule.id, 'los_value', parseInt(e.target.value))}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      min="1"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6] flex justify-center">
                    <button
                      onClick={() => removeReductionRule(rule.id)}
                      disabled={isLoading || isSaving}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button 
                onClick={addReductionRule}
                disabled={isLoading || isSaving}
                className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                Add Reduction Rule
              </button>
              <button 
                onClick={handleSave}
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

        {/* Reduction Logic Info */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-[#294758] mb-3">
            Reduction Logic
          </h3>
          <div className="text-black/60 text-base leading-relaxed">
            <p>
              <strong>Example:</strong> If lead time ≤ 7 days and occupancy ≤
              50% → reduce LOS by 1 night.
            </p>
            <p>
              When conditions match, the LOS is automatically reduced by 1 night
              from the calculated value.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
