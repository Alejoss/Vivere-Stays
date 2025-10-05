import { useState, useEffect, useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { Settings, Info } from "lucide-react";
import { toast } from "../../hooks/use-toast";
import "../../styles/responsive-utilities.css";

export default function LosGeneralSettings() {
  const { property } = useContext(PropertyContext) ?? {};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // State management
  const [competitorCount, setCompetitorCount] = useState("2");
  const [aggregationMethod, setAggregationMethod] = useState("min");

  // Load existing data on component mount
  useEffect(() => {
    if (property?.id) {
      loadGeneralSettings();
    }
  }, [property?.id]);

  const loadGeneralSettings = async () => {
    if (!property?.id) return;
    
    setIsLoading(true);
    
    try {
      const generalSettings = await dynamicPricingService.getGeneralSettings(property.id);
      setCompetitorCount(generalSettings.los_num_competitors?.toString() || "2");
      setAggregationMethod(generalSettings.los_aggregation || "min");
    } catch (error) {
      console.error("Error loading general settings:", error);
      toast({
        title: "Error",
        description: "Failed to load general settings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!property?.id) {
      toast({
        title: "Error",
        description: "No property selected",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      await dynamicPricingService.updateGeneralSettings(property.id, {
        los_num_competitors: parseInt(competitorCount),
        los_aggregation: aggregationMethod
      });
      
      toast({
        title: "Success",
        description: "General settings saved successfully!",
      });
      
    } catch (error) {
      console.error("Error saving general settings:", error);
      toast({
        title: "Error",
        description: "Failed to save general settings. Please try again.",
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
          <div className="text-responsive-lg text-gray-600 container-margin-sm">No property selected</div>
          <div className="text-responsive-sm text-gray-500">Please select a property to configure LOS general settings</div>
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
            <Settings size={34} className="text-[#287CAC]" />
            <div>
              <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                LOS General Settings
              </h2>
              <p className="text-[#8A8E94] font-bold text-responsive-lg">
                Configure global settings for Length of Stay calculations.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="container-margin-sm container-padding-base bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center form-gap-base">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-normal text-responsive-base">Loading general settings...</span>
              </div>
            </div>
          )}


          {/* Info Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg container-padding-base container-margin-sm">
            <h3 className="text-responsive-lg font-bold text-[#294758] container-margin-sm">General Settings Overview</h3>
            <div className="text-black/60 text-responsive-base leading-relaxed">
              <p className="container-margin-sm">
                These settings control how the LOS algorithm analyzes competitors and calculates requirements:
              </p>
              <ul className="form-gap-base text-responsive-sm">
                <li>• <strong>Number of Competitors:</strong> Minimum competitors required to apply competitor-based LOS</li>
                <li>• <strong>LOS Aggregation Method:</strong> How to combine competitor LOS values (minimum or maximum)</li>
              </ul>
            </div>
          </div>

          {/* Settings Form */}
          <div className="max-w-2xl">
            <div className="form-gap-base">
              {/* Number of Competitors */}
              <div>
                <label className="form-label">
                  Number of Competitors
                </label>
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
                  <span className="text-responsive-sm text-gray-600">
                    Minimum competitors required to apply competitor-based LOS
                  </span>
                </div>
              </div>

              {/* LOS Aggregation Method */}
              <div>
                <label className="form-label">
                  LOS Aggregation Method
                </label>
                <div className="flex flex-col lg:flex-row items-start lg:items-center form-gap-base">
                  <select
                    value={aggregationMethod}
                    onChange={(e) => setAggregationMethod(e.target.value)}
                    disabled={isLoading || isSaving}
                    className="w-48 input-padding-base input-height-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                  <Info size={20} className="text-gray-500 hidden lg:inline" />
                  <span className="text-responsive-sm text-gray-600">
                    How to combine competitor LOS values
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Settings size={20} />
                    Save General Settings
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
