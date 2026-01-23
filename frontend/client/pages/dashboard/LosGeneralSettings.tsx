import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { Settings, Info } from "lucide-react";
import { toast } from "../../hooks/use-toast";
import "../../styles/responsive-utilities.css";

export default function LosGeneralSettings() {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const { property } = useContext(PropertyContext) ?? {};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State management
  const [competitorCount, setCompetitorCount] = useState("2");
  const [aggregationMethod, setAggregationMethod] = useState("min");

  // Extract property ID to avoid optional chaining in dependency arrays
  const propertyId = property?.id;

  const loadGeneralSettings = async () => {
    if (!propertyId) return;
    
    setIsLoading(true);
    
    try {
      const generalSettings = await dynamicPricingService.getGeneralSettings(propertyId);
      setCompetitorCount(generalSettings.los_num_competitors?.toString() || "2");
      setAggregationMethod(generalSettings.los_aggregation || "min");
    } catch (error) {
      console.error("Error loading general settings:", error);
      toast({
        title: t('common:messages.error'),
        description: t('dashboard:losGeneral.loadError'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing data on component mount
  useEffect(() => {
    if (propertyId) {
      loadGeneralSettings();
    }
  }, [propertyId]);

  const handleSave = async () => {
    if (!propertyId) {
      toast({
        title: t('common:messages.error'),
        description: t('common:messages.noPropertySelected'),
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      await dynamicPricingService.updateGeneralSettings(propertyId, {
        los_num_competitors: parseInt(competitorCount),
        los_aggregation: aggregationMethod
      });
      
      toast({
        title: t('common:messages.success'),
        description: t('dashboard:losGeneral.saveSuccess'),
      });
      
    } catch (error) {
      console.error("Error saving general settings:", error);
      toast({
        title: t('common:messages.error'),
        description: t('dashboard:losGeneral.saveError'),
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
          <div className="text-responsive-sm text-gray-500">{t('dashboard:lengthOfStay.selectPropertyMessage')}</div>
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
            <Settings size={34} className="text-[#287CAC] hidden lg:block" />
            <div>
              <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                {t('dashboard:losGeneral.title')}
              </h2>
              <p className="text-[#8A8E94] font-bold text-responsive-lg">
                {t('dashboard:losGeneral.subtitle')}
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


          {/* Settings Form */}
          <div className="max-w-2xl">
            <div className="form-gap-base">
              {/* Number of Competitors */}
              <div className="form-field">
                <label className="form-label">
                  {t('dashboard:losGeneralSettings.numberOfCompetitors', { defaultValue: 'Number of Competitors' })}
                </label>
                <div className="form-field">
                  <div className="flex flex-col lg:flex-row items-start lg:items-center form-gap-base">
                    <input
                      type="number"
                      value={competitorCount}
                      onChange={(e) => setCompetitorCount(e.target.value)}
                      disabled={isLoading || isSaving}
                      className="w-32 input-padding-base input-height-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      min="1"
                    />
                    <Info size={20} className="text-gray-500 hidden lg:inline" />
                    <span className="text-[#9CAABD] text-responsive-xs">
                      {t('dashboard:losGeneralSettings.competitorsDescription', { defaultValue: 'Minimum competitors required to apply competitor-based LOS' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* LOS Aggregation Method */}
              <div className="form-field mt-6">
                <label className="form-label">
                  {t('dashboard:losGeneralSettings.losAggregationMethod', { defaultValue: 'LOS Aggregation Method' })}
                </label>
                <div className="flex flex-col lg:flex-row items-start lg:items-center form-gap-base">
                  <select
                    value={aggregationMethod}
                    onChange={(e) => setAggregationMethod(e.target.value)}
                    disabled={isLoading || isSaving}
                    className="w-48 input-padding-base input-height-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="min">{t('dashboard:losGeneralSettings.minimum', { defaultValue: 'Minimum' })}</option>
                    <option value="max">{t('dashboard:losGeneralSettings.maximum', { defaultValue: 'Maximum' })}</option>
                  </select>
                  <Info size={20} className="text-gray-500 hidden lg:inline" />
                  <span className="text-[#9CAABD] text-responsive-xs">
                    {t('dashboard:losGeneralSettings.aggregationDescription', { defaultValue: 'How to combine competitor LOS values' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 mb-4">
              <button 
                onClick={handleSave}
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
                    <Settings size={20} />
                    {t('dashboard:losGeneralSettings.saveButton', { defaultValue: 'Save General Settings' })}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Section - moved to bottom */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg container-padding-base container-margin-sm">
            <h3 className="text-responsive-lg font-bold text-[#294758] container-margin-sm">{t('dashboard:losGeneralSettings.overviewTitle', { defaultValue: 'General Settings Overview' })}</h3>
            <div className="text-black/60 text-responsive-base leading-relaxed">
              <p className="container-margin-sm">
                {t('dashboard:losGeneralSettings.overviewDescription', { defaultValue: 'These settings control how the LOS algorithm analyzes competitors and calculates requirements:' })}
              </p>
              <ul className="form-gap-base text-responsive-sm">
                <li>• <strong>{t('dashboard:losGeneralSettings.numberOfCompetitors', { defaultValue: 'Number of Competitors' })}:</strong> {t('dashboard:losGeneralSettings.competitorsDescription', { defaultValue: 'Minimum competitors required to apply competitor-based LOS' })}</li>
                <li>• <strong>{t('dashboard:losGeneralSettings.losAggregationMethod', { defaultValue: 'LOS Aggregation Method' })}:</strong> {t('dashboard:losGeneralSettings.aggregationDescription', { defaultValue: 'How to combine competitor LOS values' })} ({t('dashboard:losGeneralSettings.minimum', { defaultValue: 'minimum' })} {t('common:common.or', { defaultValue: 'or' })} {t('dashboard:losGeneralSettings.maximum', { defaultValue: 'maximum' })})</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
