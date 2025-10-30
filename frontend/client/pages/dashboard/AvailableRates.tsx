import { useState, useEffect, useContext } from "react";
import { Save, ChevronDown, Percent } from "lucide-react";
import { useTranslation } from "react-i18next";
import { dynamicPricingService, UnifiedRoomRate } from "../../../shared/api/dynamic";
import { toast } from "../../hooks/use-toast";
import { PropertyContext } from "../../../shared/PropertyContext";

export default function AvailableRates() {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const [rates, setRates] = useState<UnifiedRoomRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { property } = useContext(PropertyContext) ?? {};

  // Local state for editable fields
  const [editableRates, setEditableRates] = useState<UnifiedRoomRate[]>([]);
  // Temporary input values to allow '-', '.' during typing without coercion
  const [tempValues, setTempValues] = useState<Record<string, string>>({});

  // Helper function to sort rates with base rate first
  const sortRatesWithBaseFirst = (rates: UnifiedRoomRate[]): UnifiedRoomRate[] => {
    return [...rates].sort((a, b) => {
      // Base rate comes first
      if (a.is_base_rate && !b.is_base_rate) return -1;
      if (!a.is_base_rate && b.is_base_rate) return 1;
      
      // If both are base rates or both are not base rates, sort by room_id then rate_id
      if (a.room_id !== b.room_id) {
        return a.room_id.localeCompare(b.room_id);
      }
      return a.rate_id.localeCompare(b.rate_id);
    });
  };

  useEffect(() => {
    const fetchAvailableRates = async () => {
      if (!property?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await dynamicPricingService.getAvailableRates(property.id);
        setRates(response.rates);
        // Sort rates so base rate appears first
        const sortedRates = sortRatesWithBaseFirst(response.rates);
        setEditableRates(sortedRates);
      } catch (err: any) {
        console.error('Error fetching available rates:', err);
        const backendMsg = err?.response?.data?.message || err?.message || t('dashboard:availableRates.loadError');
        toast({ title: t('common:messages.error'), description: backendMsg, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableRates();
  }, [property?.id]);

  const handleSave = async () => {
    if (!property?.id) {
      toast({
        title: t('common:messages.error'),
        description: t('common:messages.noPropertySelected'),
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Prepare only changed rows to minimize payload
      const originalByRateId = new Map(rates.map(r => [r.rate_id, r]));
      const changed = editableRates.filter(er => {
        const orig = originalByRateId.get(er.rate_id);
        if (!orig) return true; // treat as changed if not present
        return (
          orig.increment_type !== er.increment_type ||
          orig.increment_value !== er.increment_value ||
          orig.is_base_rate !== er.is_base_rate
        );
      });

      const ratesData = changed.map(rate => ({
        rate_id: rate.rate_id,
        increment_type: rate.increment_type,
        increment_value: rate.increment_value,
        is_base_rate: rate.is_base_rate,
      }));

      if (ratesData.length === 0) {
        toast({
          title: t('common:messages.info', { defaultValue: 'Info' }),
          description: t('dashboard:availableRates.noChanges', { defaultValue: 'No changes to save.' })
        });
        return;
      }

      const response = await dynamicPricingService.updateAvailableRates(property.id, {
        rates: ratesData,
      });

      toast({
        title: t('common:messages.success'),
        description: t('dashboard:availableRates.saveSuccess', { updated: response.updated_count }),
      });
      
      // Refresh the data to show updated values
      const updatedResponse = await dynamicPricingService.getAvailableRates(property.id);
      setRates(updatedResponse.rates);
      // Sort rates so base rate appears first
      const sortedRates = sortRatesWithBaseFirst(updatedResponse.rates);
      setEditableRates(sortedRates);
      
    } catch (err: any) {
      console.error('Error saving available rates:', err);
      const backendMsg = err?.response?.data?.message || err?.message || t('dashboard:availableRates.saveError');
      toast({ title: t('common:messages.error'), description: backendMsg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Update temporary string while typing
  const handleIncrementValueChange = (rateId: string, value: string) => {
    setTempValues(prev => ({ ...prev, [rateId]: value }));
  };

  // Commit string to numeric on blur/enter
  const commitIncrementValue = (rateId: string) => {
    const raw = tempValues[rateId];
    const numericValue = raw === undefined ? undefined : parseFloat(raw);
    const finalValue = Number.isFinite(numericValue as number) ? (numericValue as number) : 0;
    setEditableRates(prev =>
      prev.map(rate =>
        rate.rate_id === rateId
          ? { ...rate, increment_value: finalValue }
          : rate
      )
    );
    setTempValues(({ [rateId]: _omit, ...rest }) => rest);
  };

  const updateIncrementType = (rateId: string, type: 'Percentage' | 'Additional') => {
    setEditableRates(prev => 
      prev.map(rate => 
        rate.rate_id === rateId 
          ? { ...rate, increment_type: type }
          : rate
      )
    );
  };

  const toggleBaseRate = (rateId: string) => {
    setEditableRates(prev => {
      const updatedRates = prev.map(rate => {
        if (rate.rate_id === rateId) {
          // If this rate is being set as base, set increment value to 0
          return {
            ...rate,
            is_base_rate: !rate.is_base_rate,
            increment_value: !rate.is_base_rate ? 0 : rate.increment_value
          };
        } else {
          // Unset base rate for all other rates
          return {
            ...rate,
            is_base_rate: false
          };
        }
      });
      // Re-sort to put the new base rate at the top
      return sortRatesWithBaseFirst(updatedRates);
    });
  };

  const CategorySelector = ({
    category,
    hasDropdown = false,
  }: {
    category: string;
    hasDropdown?: boolean;
  }) => (
    <div className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded bg-gray-50 cursor-not-allowed">
      <span className="text-sm font-normal text-gray-600">{category}</span>
      {hasDropdown && (
        <ChevronDown size={16} className="text-gray-400 rotate-90" />
      )}
    </div>
  );

  const IncrementTypeSelector = ({ 
    type, 
    onChange 
  }: { 
    type: 'Percentage' | 'Additional';
    onChange: (newType: 'Percentage' | 'Additional') => void;
  }) => (
    <div className="relative">
      <select
        value={type}
        onChange={(e) => onChange(e.target.value as 'Percentage' | 'Additional')}
        className="w-full input-padding-sm pr-8 text-responsive-sm border border-gray-300 rounded bg-white text-black focus:outline-none focus:border-[#2B6CEE] appearance-none cursor-pointer"
      >
        <option value="Percentage">{t('dashboard:availableRates.percentage', { defaultValue: 'Percentage' })}</option>
        <option value="Additional">{t('dashboard:availableRates.additional', { defaultValue: 'Additional' })}</option>
      </select>
      <ChevronDown size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  );

  const ToggleSwitch = ({
    enabled,
    onChange,
  }: {
    enabled: boolean;
    onChange: () => void;
  }) => (
    <div
      className={`relative w-14 h-7 rounded-full cursor-pointer transition-colors ${
        enabled ? "bg-hotel-brand-dark" : "bg-gray-300"
      }`}
      onClick={onChange}
    >
      <div
        className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
          enabled ? "translate-x-7" : "translate-x-0.5"
        }`}
      />
    </div>
  );


  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <svg
              width="34"
              height="34"
              viewBox="0 0 34 34"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M27.4219 14.8906H13.7109V22.8416H12.2506V20.1389C12.2489 18.6077 11.6399 17.1396 10.5571 16.0569C9.47436 14.9741 8.00632 14.365 6.47506 14.3633H3.16406V10.1445H1.05469V32.8203H3.16406V29.6732L30.5859 29.8926V32.8203H32.6953V20.1641C32.6937 18.7659 32.1376 17.4255 31.149 16.4369C30.1604 15.4483 28.82 14.8922 27.4219 14.8906ZM3.16406 16.4727H6.47506C7.44704 16.4738 8.37891 16.8604 9.06621 17.5477C9.75351 18.235 10.1401 19.1668 10.1412 20.1388V22.8415H3.16406V16.4727ZM30.5859 27.7831L3.16406 27.5638V24.951H30.5859V27.7831ZM30.5859 22.8416H15.8203V17H27.4219C28.2607 17.001 29.065 17.3346 29.6581 17.9278C30.2513 18.521 30.585 19.3252 30.5859 20.1641V22.8416Z"
                fill="#287CAC"
              />
            </svg>
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                {t('dashboard:availableRates.title')}
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                {t('dashboard:availableRates.subtitle')} {!loading && `(${editableRates.length} ${t('dashboard:availableRates.rates')})`}
              </p>
            </div>
          </div>

          {/* Rates Table */}
          <div className="mb-8">
            {/* Desktop Table Headers */}
            <div className="hidden lg:grid grid-cols-8 gap-4 mb-4 text-[#375A7D] font-bold text-base">
              <div>{t('dashboard:availableRates.roomId')}</div>
              <div>{t('dashboard:availableRates.roomName')}</div>
              <div>{t('dashboard:availableRates.rateId')}</div>
              <div>{t('dashboard:availableRates.rateName')}</div>
              <div>{t('dashboard:availableRates.rateCategory')}</div>
              <div>{t('dashboard:availableRates.incrementType')}</div>
              <div>{t('dashboard:availableRates.incrementValue')}</div>
              <div>{t('dashboard:availableRates.selectAsBase')}</div>
            </div>

            {/* Divider Line */}
            <div className="w-full h-px bg-hotel-divider mb-5"></div>

            {/* Table Rows */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">{t('dashboard:availableRates.loadingRates')}</div>
                </div>
              ) : editableRates.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">{t('dashboard:availableRates.noRatesFound')}</div>
                </div>
              ) : (
                editableRates.map((rate) => (
                  <div key={rate.id}>
                    {/* Desktop Layout */}
                    <div
                      className={`hidden lg:grid grid-cols-8 gap-4 items-center p-3 rounded-lg transition-colors ${
                        rate.is_base_rate 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Room ID */}
                      <div>
                        <div className="px-3 py-2 text-sm font-normal border border-gray-200 rounded bg-gray-50 text-gray-600 cursor-not-allowed">
                          {rate.room_id}
                        </div>
                      </div>

                      {/* Room Name */}
                      <div>
                        <div className="px-3 py-2 text-sm font-normal border border-gray-200 rounded bg-gray-50 text-gray-600 cursor-not-allowed">
                          {rate.room_name}
                        </div>
                      </div>

                      {/* Rate ID */}
                      <div>
                        <div className="px-3 py-2 text-sm font-normal border border-gray-200 rounded bg-gray-50 text-gray-600 cursor-not-allowed">
                          {rate.rate_id}
                        </div>
                      </div>

                      {/* Rate Name */}
                      <div>
                        <div className="px-3 py-2 text-sm font-normal border border-gray-200 rounded bg-gray-50 text-gray-600 cursor-not-allowed">
                          {rate.rate_name}
                        </div>
                      </div>

                      {/* Rate Category */}
                      <div>
                        <CategorySelector
                          category={rate.rate_category || t('dashboard:availableRates.notSpecified', { defaultValue: 'Not specified' })}
                          hasDropdown={true}
                        />
                      </div>

                      {/* Increment Type */}
                      <div>
                        <IncrementTypeSelector 
                          type={rate.increment_type} 
                          onChange={(newType) => updateIncrementType(rate.rate_id, newType)}
                        />
                      </div>

                      {/* Increment Value */}
                      <div>
                        <input
                          type="text"
                          value={tempValues[rate.rate_id] ?? String(rate.increment_value)}
                          onChange={(e) => handleIncrementValueChange(rate.rate_id, e.target.value)}
                          onBlur={() => commitIncrementValue(rate.rate_id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              commitIncrementValue(rate.rate_id);
                            }
                          }}
                          inputMode="decimal"
                          className="w-full px-3 py-2 text-sm text-center border border-hotel-divider rounded bg-white text-black focus:outline-none focus:border-[#2B6CEE]"
                        />
                      </div>

                      {/* Select as Base */}
                      <div className="flex items-center justify-center">
                        <ToggleSwitch enabled={rate.is_base_rate} onChange={() => toggleBaseRate(rate.rate_id)} />
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className={`lg:hidden bg-white border border-gray-200 rounded-lg p-4 space-y-4 ${
                      rate.is_base_rate ? 'bg-blue-50 border-blue-200' : ''
                    }`}>
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-700">
                          {rate.room_name}
                        </h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{t('dashboard:availableRates.baseRate', { defaultValue: 'Base Rate' })}</span>
                          <ToggleSwitch enabled={rate.is_base_rate} onChange={() => toggleBaseRate(rate.rate_id)} />
                        </div>
                      </div>

                      {/* Room and Rate Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('dashboard:availableRates.roomId')}
                          </label>
                          <div className="px-3 py-2 text-sm font-normal border border-gray-200 rounded bg-gray-50 text-gray-600">
                            {rate.room_id}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('dashboard:availableRates.rateId', { defaultValue: 'Rate ID' })}
                          </label>
                          <div className="px-3 py-2 text-sm font-normal border border-gray-200 rounded bg-gray-50 text-gray-600">
                            {rate.rate_id}
                          </div>
                        </div>
                      </div>

                      {/* Rate Name and Category */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('dashboard:availableRates.rateName', { defaultValue: 'Rate Name' })}
                          </label>
                          <div className="px-3 py-2 text-sm font-normal border border-gray-200 rounded bg-gray-50 text-gray-600">
                            {rate.rate_name}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('dashboard:availableRates.rateCategory', { defaultValue: 'Rate Category' })}
                          </label>
                          <CategorySelector
                            category={rate.rate_category || t('dashboard:availableRates.notSpecified', { defaultValue: 'Not specified' })}
                            hasDropdown={true}
                          />
                        </div>
                      </div>

                      {/* Increment Type and Value */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('dashboard:availableRates.incrementType')}
                          </label>
                          <IncrementTypeSelector 
                            type={rate.increment_type} 
                            onChange={(newType) => updateIncrementType(rate.rate_id, newType)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('dashboard:availableRates.incrementValue')}
                          </label>
                          <input
                            type="text"
                            value={tempValues[rate.rate_id] ?? String(rate.increment_value)}
                            onChange={(e) => handleIncrementValueChange(rate.rate_id, e.target.value)}
                            onBlur={() => commitIncrementValue(rate.rate_id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                commitIncrementValue(rate.rate_id);
                              }
                            }}
                            inputMode="decimal"
                            className="w-full px-3 py-2 text-sm text-center border border-hotel-divider rounded bg-white text-black focus:outline-none focus:border-[#2B6CEE]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col items-end mt-8 mb-4 space-y-4">
            <button 
              onClick={handleSave}
              disabled={saving || loading}
              className={`flex items-center gap-5 px-7 py-3 rounded-lg font-semibold transition-colors ${
                saving || loading
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed" 
                  : "bg-[#294758] text-white hover:bg-[#234149]"
              }`}
            >
              <Save size={24} />
              {saving ? t('common:messages.saving') : t('common:buttons.save')}
            </button>
          </div>
        </div>

        {/* Algorithm Info Section */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-bold text-[#294758] mb-3">
            {t('dashboard:availableRates.algorithmSchedule', { defaultValue: 'Algorithm checks for changes on this tab: Daily at 9am' })}
          </h3>
          <div className="text-black/60 text-base leading-relaxed">
            <p className="mb-4">
              {t('dashboard:availableRates.algorithmDescription', { defaultValue: 'The Available Rates worksheet defines how different room rates are calculated and displayed.' })}
            </p>
            <p className="mb-2">
              <strong>{t('dashboard:availableRates.howItWorks', { defaultValue: 'How It Works Together:' })}</strong>
            </p>
            <ul className="space-y-1 text-sm">
              <li>
                • {t('dashboard:availableRates.algorithmStep1', { defaultValue: 'Room Setup → Each room is linked to a base rate ID and a rate name for identification.' })}
              </li>
              <li>
                • {t('dashboard:availableRates.algorithmStep2', { defaultValue: 'Rate Categories → Rates are classified (e.g., Flexible, Non-refundable, Advance Purchase).' })}
              </li>
              <li>
                • {t('dashboard:availableRates.algorithmStep3', { defaultValue: 'Calculation Type → Define if the adjustment is a fixed amount or a percentage.' })}
              </li>
              <li>
                • {t('dashboard:availableRates.algorithmStep4', { defaultValue: 'Calculation Value → Numeric adjustment applied to the base rate.' })}
              </li>
              <li>
                • {t('dashboard:availableRates.algorithmStep5', { defaultValue: 'Activation → Switch controls which rates are active and visible.' })}
              </li>
              <li>
                • {t('dashboard:availableRates.algorithmStep6', { defaultValue: 'Final Available Rates → Produces the list of active rates that will be shown to users.' })}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
