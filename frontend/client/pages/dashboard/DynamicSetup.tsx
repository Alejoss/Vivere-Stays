import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Save,
  ChevronDown,
  TrendingUp,
  Percent,
  DollarSign,
  Users,
  Clock,
  Trash2,
} from "lucide-react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { toast } from "../../hooks/use-toast";
import "../../styles/responsive-utilities.css";

// Category definitions matching the backend model
const OCCUPANCY_CATEGORIES = [
  { value: '0-30', label: '0-30%' },
  { value: '30-50', label: '30-50%' },
  { value: '50-70', label: '50-70%' },
  { value: '70-80', label: '70-80%' },
  { value: '80-90', label: '80-90%' },
  { value: '90-100', label: '90-100%' },
  { value: '100+', label: '100%+' },
];

const LEAD_TIME_CATEGORIES = [
  { value: '0-1', label: '0-1 days' },
  { value: '1-3', label: '1-3 days' },
  { value: '3-7', label: '3-7 days' },
  { value: '7-14', label: '7-14 days' },
  { value: '14-30', label: '14-30 days' },
  { value: '30-45', label: '30-45 days' },
  { value: '45-60', label: '45-60 days' },
  { value: '60+', label: '60+ days' },
];

interface DynamicRule {
  id?: number;
  occupancy_category: string;
  lead_time_category: string;
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
  isNew?: boolean;
  isDirty?: boolean; // Track if rule has been modified
  originalData?: Partial<DynamicRule>; // Store original data for comparison
}

export default function DynamicSetup() {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const { property } = useContext(PropertyContext) ?? {};
  const [rules, setRules] = useState<DynamicRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing rules on component mount
  useEffect(() => {
    if (property?.id) {
      loadRules();
    }
  }, [property?.id]);

  const loadRules = async () => {
    if (!property?.id) return;
    
    setLoading(true);
    try {
      const response = await dynamicPricingService.getDynamicRules(property.id);
      setRules(response.rules.map(rule => ({ 
        ...rule, 
        isNew: false,
        isDirty: false,
        originalData: { ...rule } // Store original data for comparison
      })));
    } catch (err: any) {
      console.error('🔧 FRONTEND DEBUG: Error loading dynamic rules:', err);
      
      // Extract detailed error message from backend response
      let errorMessage = err?.response?.data?.message || err?.message || t('dashboard:dynamicSetup.loadError');
      
      // Try to get error code and translate it
      if (err?.response?.data?.error_code) {
        const errorCode = err.response.data.error_code;
        const translatedError = t(`errors:${errorCode}`, { defaultValue: null });
        if (translatedError) {
          errorMessage = translatedError;
        }
      }
      
      toast({ title: t('common:messages.error'), description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const addNewRule = () => {
    const newRule: DynamicRule = {
      occupancy_category: '',
      lead_time_category: '',
      increment_type: 'Percentage',
      increment_value: 0,
      isNew: true,
      isDirty: true, // New rules are always dirty
      originalData: {} // No original data for new rules
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (index: number, field: keyof DynamicRule, value: any) => {
    const updatedRules = [...rules];
    const rule = updatedRules[index];
    
    // Update the field
    rule[field] = value;
    
    // Check if this rule is dirty by comparing with original data
    if (!rule.isNew && rule.originalData) {
      const originalValue = rule.originalData[field];
      rule.isDirty = rule.occupancy_category !== rule.originalData.occupancy_category ||
                     rule.lead_time_category !== rule.originalData.lead_time_category ||
                     rule.increment_type !== rule.originalData.increment_type ||
                     rule.increment_value !== rule.originalData.increment_value;
    }
    
    setRules(updatedRules);
  };

  const removeRule = async (index: number) => {
    const rule = rules[index];
    
    // If it's an existing rule, delete it from the server
    if (rule.id && !rule.isNew) {
      if (!property?.id) return;
      
      try {
        await dynamicPricingService.deleteDynamicRule(property.id, rule.id);
        toast({
          title: t('common:messages.success'),
          description: t('common:messages.deleteSuccess'),
        });
      } catch (err: any) {
        console.error('🔧 FRONTEND DEBUG: Error deleting dynamic rule:', err);
        
        // Extract detailed error message from backend response
        let errorMessage = err?.response?.data?.message || err?.message || t('dashboard:dynamicSetup.deleteError');
        
        // Try to get error code and translate it
        if (err?.response?.data?.error_code) {
          const errorCode = err.response.data.error_code;
          const translatedError = t(`errors:${errorCode}`, { defaultValue: null });
          if (translatedError) {
            errorMessage = translatedError;
          }
        }
        
        toast({
          title: t('common:messages.error'),
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }
    }
    
    // Remove from local state
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
  };

  const saveRules = async () => {
    if (!property?.id) return;
    
    setSaving(true);
    
    try {
      // Only process dirty rules (new or modified)
      const dirtyRules = rules.filter(rule => rule.isDirty);
      const newRules = dirtyRules.filter(rule => rule.isNew);
      const modifiedExistingRules = dirtyRules.filter(rule => !rule.isNew);
      
      // Bulk update only modified existing rules
      if (modifiedExistingRules.length > 0) {
        const validModifiedRules = modifiedExistingRules.filter(rule => 
          rule.id && rule.occupancy_category && rule.lead_time_category
        );
        
        if (validModifiedRules.length > 0) {
          console.log(`🔧 FRONTEND DEBUG: Updating ${validModifiedRules.length} modified rules`);
          await dynamicPricingService.bulkUpdateDynamicRules(property.id, {
            rules: validModifiedRules.map(rule => ({
              id: rule.id!,
              occupancy_category: rule.occupancy_category,
              lead_time_category: rule.lead_time_category,
              increment_type: rule.increment_type,
              increment_value: rule.increment_value
            }))
          });
        }
      }
      
      // Create only new rules
      if (newRules.length > 0) {
        const validNewRules = newRules.filter(rule => 
          rule.occupancy_category && rule.lead_time_category
        );
        
        if (validNewRules.length > 0) {
          console.log(`🔧 FRONTEND DEBUG: Creating ${validNewRules.length} new rules`);
          await dynamicPricingService.bulkCreateDynamicRules(property.id, {
            rules: validNewRules.map(rule => ({
              occupancy_category: rule.occupancy_category,
              lead_time_category: rule.lead_time_category,
              increment_type: rule.increment_type,
              increment_value: rule.increment_value
            }))
          });
        }
      }
      
      // Show success message with count of changes
      const totalChanges = modifiedExistingRules.length + newRules.length;
      toast({
        title: t('common:messages.success'),
        description: totalChanges > 0 
          ? t('dashboard:dynamicSetup.saveSuccessWithCount', { 
              count: totalChanges, 
              defaultValue: `Successfully saved ${totalChanges} rule${totalChanges === 1 ? '' : 's'}` 
            })
          : t('dashboard:dynamicSetup.noChangesToSave', { defaultValue: 'No changes to save' }),
      });
      
      loadRules(); // Reload to get updated data
    } catch (err: any) {
      console.error('🔧 FRONTEND DEBUG: Error saving dynamic rules:', err);
      console.error('🔧 FRONTEND DEBUG: Error details:', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method
      });
      
      // Extract detailed error message from backend response
      let errorMessage = err?.response?.data?.message || 'Failed to save dynamic rules';
      
      // Try to get error code and translate it
      if (err?.response?.data?.error_code) {
        const errorCode = err.response.data.error_code;
        const translatedError = t(`errors:${errorCode}`, { defaultValue: null });
        if (translatedError) {
          errorMessage = translatedError;
        }
      }
      
      // Handle validation errors
      if (err?.response?.data?.errors) {
        const errors = err.response.data.errors;
        if (errors.non_field_errors && errors.non_field_errors.length > 0) {
          errorMessage = errors.non_field_errors[0];
        } else {
          // Handle field-specific errors
          const fieldErrors = Object.entries(errors).map(([field, messages]) => 
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
          ).join('; ');
          errorMessage = fieldErrors;
        }
      }
      
      toast({ title: t('common:messages.error'), description: errorMessage, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const IncrementTypeSelector = ({
    value,
    onChange
  }: {
    value: 'Percentage' | 'Additional';
    onChange: (value: 'Percentage' | 'Additional') => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'Percentage' | 'Additional')}
      className="w-full input-padding-sm input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] sm:min-w-[140px]"
    >
      <option value="Percentage">{t('dashboard:availableRates.percentage')}</option>
      <option value="Additional">{t('dashboard:availableRates.additional')}</option>
    </select>
  );

  const OccupancySelector = ({
    value,
    onChange
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full input-padding-sm input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px] sm:min-w-[177px]"
    >
      <option value="">{t('dashboard:dynamicSetup.selectOccupancy', { defaultValue: 'Select occupancy' })}</option>
      {OCCUPANCY_CATEGORIES.map(category => (
        <option key={category.value} value={category.value}>
          {category.label}
        </option>
      ))}
    </select>
  );

  const LeadTimeSelector = ({
    value,
    onChange
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full input-padding-sm input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px] sm:min-w-[217px]"
    >
      <option value="">{t('dashboard:dynamicSetup.selectLeadTime', { defaultValue: 'Select lead time' })}</option>
      {LEAD_TIME_CATEGORIES.map(category => (
        <option key={category.value} value={category.value}>
          {category.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="container-padding-base">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg container-padding-base">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between container-margin-sm">
            <div className="flex items-center gap-3">
              <TrendingUp size={30} className="text-[#287CAC]" />
              <div>
                <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                  {t('dashboard:dynamicSetup.title')}
                </h2>
                <p className="text-[#8A8E94] font-bold text-responsive-lg">
                  {t('dashboard:dynamicSetup.subtitle')}
                </p>
              </div>
            </div>
          </div>


          {/* Rules Table */}
          <div className="container-margin-sm">
            {/* Desktop Table Headers */}
            <div className="hidden lg:grid grid-cols-5 form-gap-base container-margin-sm text-[#494951] font-semibold text-responsive-base">
              <div>{t('dashboard:dynamicSetup.occupancy')}</div>
              <div>{t('dashboard:dynamicSetup.leadTime')}</div>
              <div>{t('dashboard:availableRates.incrementType')}</div>
              <div>{t('dashboard:availableRates.incrementValue')}</div>
              <div></div>
            </div>

            {/* Divider Line */}
            <div className="w-full h-px bg-hotel-divider container-margin-sm"></div>

            {/* Table Rows */}
            <div className="form-gap-base">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-responsive-base">{t('dashboard:dynamicSetup.loadingRules')}</p>
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-responsive-base">{t('dashboard:dynamicSetup.noRulesFound')}</p>
                </div>
              ) : (
                rules.map((rule, index) => (
                  <div key={rule.id || `new-${index}`}>
                    {/* Desktop Layout */}
                    <div
                      className={`hidden lg:grid grid-cols-5 form-gap-base items-center container-padding-sm rounded-lg ${
                        rule.isNew ? 'bg-blue-50 border border-blue-200' : 
                        rule.isDirty ? 'bg-yellow-50 border border-yellow-200' : 'bg-white'
                      }`}
                    >
                      {/* Occupancy */}
                      <div>
                        <OccupancySelector
                          value={rule.occupancy_category}
                          onChange={(value) => updateRule(index, 'occupancy_category', value)}
                        />
                      </div>

                      {/* Lead Time */}
                      <div>
                        <LeadTimeSelector
                          value={rule.lead_time_category}
                          onChange={(value) => updateRule(index, 'lead_time_category', value)}
                        />
                      </div>

                      {/* Increment Type */}
                      <div>
                        <IncrementTypeSelector
                          value={rule.increment_type}
                          onChange={(value) => updateRule(index, 'increment_type', value)}
                        />
                      </div>

                      {/* Increment Value */}
                      <div>
                        <input
                          type="number"
                          value={rule.increment_value}
                          onChange={(e) => updateRule(index, 'increment_value', parseFloat(e.target.value) || 0)}
                          placeholder={t('common:common.zero', { defaultValue: '0' })}
                          className="w-full input-padding-sm input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[234px]"
                        />
                      </div>

                      {/* Actions */}
                      <div>
                        <button 
                          onClick={() => removeRule(index)}
                          className="input-padding-sm input-height-base border border-gray-300 rounded bg-white text-red-500 font-semibold text-responsive-sm hover:bg-red-50 transition-colors min-w-[80px] flex items-center justify-center"
                          title="Delete rule"
                        >
                          <Trash2 size={20} className="text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className={`lg:hidden border border-gray-200 rounded-lg container-padding-base form-gap-base ${
                      rule.isNew ? 'bg-blue-50 border-blue-200' : 
                      rule.isDirty ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                    }`}>
                      {/* Header with delete button */}
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => removeRule(index)}
                          className="w-8 h-8 p-1 border border-red-300 bg-red-50 rounded-md flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Delete rule"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>

                      {/* Occupancy and Lead Time */}
                      <div className="grid grid-cols-2 form-gap-base">
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:dynamicSetup.occupancy')}
                          </label>
                          <div className="form-field">
                            <OccupancySelector
                              value={rule.occupancy_category}
                              onChange={(value) => updateRule(index, 'occupancy_category', value)}
                            />
                          </div>
                        </div>
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:dynamicSetup.leadTime')}
                          </label>
                          <div className="form-field">
                            <LeadTimeSelector
                              value={rule.lead_time_category}
                              onChange={(value) => updateRule(index, 'lead_time_category', value)}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Increment Type and Value */}
                      <div className="grid grid-cols-2 form-gap-base">
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:availableRates.incrementType')}
                          </label>
                          <div className="form-field">
                            <IncrementTypeSelector
                              value={rule.increment_type}
                              onChange={(value) => updateRule(index, 'increment_type', value)}
                            />
                          </div>
                        </div>
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:availableRates.incrementValue')}
                          </label>
                          <div className="form-field">
                            <input
                              type="number"
                              value={rule.increment_value}
                              onChange={(e) => updateRule(index, 'increment_value', parseFloat(e.target.value) || 0)}
                              placeholder={t('common:common.zero', { defaultValue: '0' })}
                              className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-center mt-8 mb-4 space-y-4 lg:space-y-0">
            <button 
              onClick={addNewRule}
              className="flex items-center gap-3 btn-padding-base bg-[#C4D4F5] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-blue-100 transition-colors text-responsive-base"
            >
              <Plus size={24} />
              {t('dashboard:dynamicSetup.addRule')}
            </button>
            <button 
              onClick={saveRules}
              disabled={saving || !rules.some(rule => rule.isDirty)}
              className="flex items-center gap-5 btn-padding-base bg-[#294758] text-white rounded-lg font-semibold hover:bg-[#234149] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-responsive-base"
            >
              <Save size={24} />
              {saving ? t('common:messages.saving') : t('common:buttons.save')}
              {rules.some(rule => rule.isDirty) && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {rules.filter(rule => rule.isDirty).length}
                </span>
              )}
            </button>
          </div>
        </div>

          {/* How It Works Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg container-padding-base container-margin-sm">
            <div className="container-margin-sm">
              <h3 className="text-responsive-lg font-bold text-[#294758]">{t('dashboard:dynamicSetup.howItWorks', { defaultValue: 'How It Works' })}</h3>
            </div>
            <div className="text-black/60 leading-relaxed form-gap-base text-responsive-base">
              <p>
                {t('dashboard:dynamicSetup.howItWorksDesc', { defaultValue: 'The system automatically creates occupancy and lead time ranges from your threshold values and applies increments based on current conditions.' })}
              </p>
              <p className="text-responsive-xs">
                {t('dashboard:dynamicSetup.howItWorksExample', { defaultValue: 'Example: At 50% occupancy (30-50% range) with 7 days lead time (3-7 days range): $20 additional charge' })}
              </p>
              
              {/* Legend for color coding */}
              <div className="mt-4 p-3 bg-white/50 rounded-lg">
                <h4 className="text-responsive-sm font-semibold text-[#294758] mb-2">Color Legend:</h4>
                <div className="flex flex-wrap gap-4 text-responsive-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
                    <span>Unchanged</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
                    <span>Modified</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
                    <span>New Rule</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}
