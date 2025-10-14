import { Plus, Save, Trash2, Calendar, Info } from "lucide-react";
import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { toast } from "../../hooks/use-toast";
import type { 
  LosReductionRule, 
  CreateLosReductionRuleRequest,
  UpdateLosReductionRuleRequest
} from "../../../shared/api/dynamic";
import "../../styles/responsive-utilities.css";

export default function LosReductionRules() {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const { property } = useContext(PropertyContext) ?? {};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Occupancy categories
  const occupancyCategories = [
    { value: '0-30', label: '0-30%' },
    { value: '30-50', label: '30-50%' },
    { value: '50-70', label: '50-70%' },
    { value: '70-80', label: '70-80%' },
    { value: '80-90', label: '80-90%' },
    { value: '90-100', label: '90-100%' },
    { value: '100+', label: '100%+' },
  ];

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

  // State management
  const [reductionRules, setReductionRules] = useState<LosReductionRule[]>([]);

  // Load existing data on component mount
  useEffect(() => {
    if (property?.id) {
      loadExistingData();
    }
  }, [property?.id]);

  const loadExistingData = async () => {
    if (!property?.id) return;
    
    setIsLoading(true);
    
    try {
      const response = await dynamicPricingService.getLosReductionRules(property.id);
      setReductionRules(response.reductions);
    } catch (error) {
      console.error("Error loading LOS reduction data:", error);
      toast({
        title: t('common:messages.error'),
        description: t('dashboard:losReduction.loadError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addReductionRule = () => {
    const newRule: LosReductionRule = {
      id: `temp_${Date.now()}` as any,
      property_id: property?.id || "",
      lead_time_category: '3-7',
      occupancy_category: "50-70",
      los_value: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setReductionRules([...reductionRules, newRule]);
  };

  const removeReductionRule = async (id: number | string) => {
    if (!property?.id) return;

    try {
      if (typeof id === 'number') {
        // This is an existing rule - delete it from the backend
        await dynamicPricingService.deleteLosReductionRule(property.id, id);
      }
      
      // Remove from local state regardless of whether it was a new or existing rule
      setReductionRules(reductionRules.filter(rule => rule.id !== id));
    } catch (error: any) {
      console.error("Error deleting reduction rule:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = "Failed to delete reduction rule. Please try again.";
      
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
      
      toast({
        title: t('common:messages.error'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const updateReductionRule = (id: number | string, field: string, value: string | number) => {
    setReductionRules(reductionRules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const saveRule = async (rule: LosReductionRule) => {
    if (!property?.id) return;

    try {
      if (typeof rule.id === 'string') {
        // This is a new rule - create it
        const createData: CreateLosReductionRuleRequest = {
          property_id: property.id,
          lead_time_category: rule.lead_time_category,
          occupancy_category: rule.occupancy_category,
          los_value: rule.los_value,
        };

        const response = await dynamicPricingService.createLosReductionRule(property.id, createData);
        
        // Update the rule in state with the new ID from the response
        setReductionRules(reductionRules.map(r => 
          r.id === rule.id ? { ...response.reduction } : r
        ));
      } else {
        // This is an existing rule - update it
        const updateData: UpdateLosReductionRuleRequest = {
          lead_time_category: rule.lead_time_category,
          occupancy_category: rule.occupancy_category,
          los_value: rule.los_value,
        };

        await dynamicPricingService.updateLosReductionRule(property.id, rule.id, updateData);
      }
    } catch (error: any) {
      console.error("Error saving rule:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = t('dashboard:losReduction.saveError', { defaultValue: 'Failed to save rule. Please try again.' });
      
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
      
      toast({
        title: t('common:messages.error'),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleSaveAll = async () => {
    if (!property?.id) {
      toast({
        title: t('common:messages.error'),
        description: t('common:messages.noPropertySelected'),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Save all rules that need saving
      const savePromises = reductionRules.map(rule => saveRule(rule));
      await Promise.all(savePromises);
      
      toast({
        title: t('common:messages.success'),
        description: t('dashboard:losReduction.saveSuccess'),
      });
      
    } catch (error: any) {
      console.error("Error saving LOS reduction rules:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = t('dashboard:losReduction.saveError');
      
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
      
      toast({
        title: t('common:messages.error'),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-responsive-lg text-gray-600 container-margin-sm">{t('common:messages.noPropertySelected')}</div>
          <div className="text-responsive-sm text-gray-500">{t('dashboard:losReduction.selectPropertyMessage', { defaultValue: 'Please select a property to configure LOS reduction rules' })}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container-padding-base">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg container-padding-base">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 container-margin-sm">
            <Calendar size={34} className="text-[#287CAC] hidden lg:block" />
            <div>
              <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                {t('dashboard:losReduction.title')}
              </h2>
              <p className="text-[#8A8E94] font-bold text-responsive-lg">
                {t('dashboard:losReduction.subtitle')}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="container-margin-sm container-padding-base bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center form-gap-base">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-normal text-responsive-base">{t('common:messages.loading')}</span>
              </div>
            </div>
          )}


          {/* Reduction Rules Table */}
          <div className="container-margin-sm">
            {reductionRules.length > 0 && (
              <div className="flex justify-end container-margin-sm">
                <span className="text-responsive-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {reductionRules.length} {t('dashboard:losReduction.ruleCount', { count: reductionRules.length, defaultValue: reductionRules.length !== 1 ? 'rules' : 'rule' })}
                </span>
              </div>
            )}

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden rounded-lg border border-[#D0DFE6] container-margin-sm">
              {/* Table Headers */}
              <div className="grid grid-cols-4 gap-0">
                <div className="bg-hotel-brand-dark text-white container-padding-base flex items-center form-gap-base">
                  <span className="text-responsive-base font-semibold">{t('dashboard:losReduction.leadTimeCategory', { defaultValue: 'Lead Time Category' })}</span>
                  <Info size={20} className="text-white hidden lg:inline" />
                </div>
                <div className="bg-hotel-brand-dark text-white container-padding-base flex items-center form-gap-base">
                  <span className="text-responsive-base font-semibold">{t('dashboard:losReduction.occupancyCategory', { defaultValue: 'Occupancy Category' })}</span>
                  <Info size={20} className="text-white hidden lg:inline" />
                </div>
                <div className="bg-hotel-brand-dark text-white container-padding-base flex items-center form-gap-base">
                  <span className="text-responsive-base font-semibold">{t('dashboard:losReduction.losReduction', { defaultValue: 'LOS Reduction' })}</span>
                  <Info size={20} className="text-white hidden lg:inline" />
                </div>
                <div className="bg-hotel-brand-dark text-white container-padding-base">
                </div>
              </div>

              {/* Table Rows */}
              {reductionRules.map((rule, index) => (
                <div key={rule.id || index} className="grid grid-cols-4 gap-0">
                  <div className="bg-[#EFF6FF] container-padding-sm border border-[#D0DFE6]">
                    <select
                      value={rule.lead_time_category}
                      onChange={(e) => updateReductionRule(rule.id, 'lead_time_category', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {leadTimeCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#EFF6FF] container-padding-sm border border-[#D0DFE6]">
                    <select
                      value={rule.occupancy_category}
                      onChange={(e) => updateReductionRule(rule.id, 'occupancy_category', e.target.value)}
                      disabled={isLoading || isSaving}
                      className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {occupancyCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-[#EFF6FF] container-padding-sm border border-[#D0DFE6]">
                    <input
                      type="number"
                      value={rule.los_value}
                      onChange={(e) => updateReductionRule(rule.id, 'los_value', parseInt(e.target.value))}
                      disabled={isLoading || isSaving}
                      className="w-full input-padding-base input-height-base text-responsive-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      min="1"
                    />
                  </div>
                  <div className="bg-[#EFF6FF] container-padding-sm border border-[#D0DFE6] flex justify-center">
                    <button
                      onClick={() => removeReductionRule(rule.id)}
                      disabled={isLoading || isSaving}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden form-gap-base container-margin-sm">
              {reductionRules.map((rule, index) => (
                <div key={rule.id || index} className="bg-white border border-[#D0DFE6] rounded-lg container-padding-base form-gap-base">
                  {/* Header with delete button */}
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => removeReductionRule(rule.id)}
                      disabled={isLoading || isSaving}
                      className="w-8 h-8 p-1 border border-red-300 bg-red-50 rounded-md flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>

                  {/* Lead Time and Occupancy Categories */}
                  <div className="grid grid-cols-1 form-gap-base">
                    <div className="form-field">
                      <label className="form-label">
                      {t('dashboard:losReduction.leadTimeCategory', { defaultValue: 'Lead Time Category' })}
                      <Info size={14} className="hidden lg:inline ml-1 text-gray-600" />
                    </label>
                      <div className="form-field">
                        <select
                          value={rule.lead_time_category}
                          onChange={(e) => updateReductionRule(rule.id, 'lead_time_category', e.target.value)}
                          disabled={isLoading || isSaving}
                          className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {leadTimeCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="form-field">
                      <label className="form-label">
                      {t('dashboard:losReduction.occupancyCategory', { defaultValue: 'Occupancy Category' })}
                      <Info size={14} className="hidden lg:inline ml-1 text-gray-600" />
                    </label>
                      <div className="form-field">
                        <select
                          value={rule.occupancy_category}
                          onChange={(e) => updateReductionRule(rule.id, 'occupancy_category', e.target.value)}
                          disabled={isLoading || isSaving}
                          className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {occupancyCategories.map((category) => (
                            <option key={category.value} value={category.value}>
                              {category.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* LOS Reduction */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('dashboard:losReduction.losReduction', { defaultValue: 'LOS Reduction' })}
                      <Info size={14} className="hidden lg:inline ml-1 text-gray-600" />
                    </label>
                    <div className="form-field">
                      <input
                        type="number"
                        value={rule.los_value}
                        onChange={(e) => updateReductionRule(rule.id, 'los_value', parseFloat(e.target.value) || 0)}
                        disabled={isLoading || isSaving}
                        className="w-full input-padding-base input-height-base text-responsive-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col lg:flex-row justify-between items-center mt-8 mb-4 space-y-4 lg:space-y-0">
              <button 
                onClick={addReductionRule}
                disabled={isLoading || isSaving}
                className="flex items-center gap-3 btn-padding-base bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-responsive-base"
              >
                <Plus size={20} />
                {t('dashboard:losReduction.addRule')}
              </button>
              
              <button 
                onClick={handleSaveAll}
                disabled={isSaving || isLoading}
                className="flex items-center gap-2 btn-padding-base bg-[#294758] text-white rounded-lg font-semibold hover:bg-[#234149] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-responsive-base"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('common:messages.saving')}
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {t('common:buttons.save')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Section - moved to bottom */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg container-padding-base container-margin-sm">
            <h3 className="text-responsive-lg font-bold text-[#294758] container-margin-sm">{t('dashboard:losReduction.howItWorksTitle', { defaultValue: 'How Reduction Rules Work' })}</h3>
            <div className="text-black/60 text-responsive-base leading-relaxed">
              <p className="container-margin-sm">
                {t('dashboard:losReduction.howItWorksDesc', { defaultValue: 'Reduction rules automatically reduce the LOS requirement when specific conditions are met:' })}
              </p>
              <ul className="form-gap-base text-responsive-sm">
                <li>• <strong>{t('dashboard:losReduction.leadTimeLabel', { defaultValue: 'Lead Time' })}:</strong> {t('dashboard:losReduction.leadTimeDesc', { defaultValue: 'Days between booking and check-in' })}</li>
                <li>• <strong>{t('dashboard:losReduction.occupancyLabel', { defaultValue: 'Occupancy Level' })}:</strong> {t('dashboard:losReduction.occupancyDesc', { defaultValue: 'Current occupancy percentage' })}</li>
                <li>• <strong>{t('dashboard:losReduction.losValueLabel', { defaultValue: 'LOS Value' })}:</strong> {t('dashboard:losReduction.losValueDesc', { defaultValue: 'How much to reduce the LOS by' })}</li>
              </ul>
              <p className="container-margin-sm text-responsive-sm">
                <strong>{t('common:common.example', { defaultValue: 'Example' })}:</strong> {t('dashboard:losReduction.exampleText', { defaultValue: 'If lead time ≤ 7 days and occupancy ≤ 50% → reduce LOS by 1 night.' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
