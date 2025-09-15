import { useState, useEffect, useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { Settings, Info } from "lucide-react";

export default function LosGeneralSettings() {
  const { property } = useContext(PropertyContext) ?? {};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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
    setErrorMessage("");
    
    try {
      const generalSettings = await dynamicPricingService.getGeneralSettings(property.id);
      setCompetitorCount(generalSettings.los_num_competitors?.toString() || "2");
      setAggregationMethod(generalSettings.los_aggregation || "min");
    } catch (error) {
      console.error("Error loading general settings:", error);
      setErrorMessage("Failed to load general settings");
    } finally {
      setIsLoading(false);
    }
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
      await dynamicPricingService.updateGeneralSettings(property.id, {
        los_num_competitors: parseInt(competitorCount),
        los_aggregation: aggregationMethod
      });
      
      setSaveMessage("General settings saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
      
    } catch (error) {
      console.error("Error saving general settings:", error);
      setErrorMessage("Failed to save general settings. Please try again.");
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
          <div className="text-sm text-gray-500">Please select a property to configure LOS general settings</div>
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
            <Settings size={34} className="text-[#287CAC]" />
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                LOS General Settings
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                Configure global settings for Length of Stay calculations.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-medium">Loading general settings...</span>
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

          {/* Info Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-[#294758] mb-3">General Settings Overview</h3>
            <div className="text-black/60 text-base leading-relaxed">
              <p className="mb-2">
                These settings control how the LOS algorithm analyzes competitors and calculates requirements:
              </p>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Number of Competitors:</strong> Minimum competitors required to apply competitor-based LOS</li>
                <li>• <strong>LOS Aggregation Method:</strong> How to combine competitor LOS values (minimum or maximum)</li>
              </ul>
            </div>
          </div>

          {/* Settings Form */}
          <div className="max-w-2xl">
            <div className="space-y-6">
              {/* Number of Competitors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Competitors
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={competitorCount}
                    onChange={(e) => setCompetitorCount(e.target.value)}
                    disabled={isLoading || isSaving}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    min="1"
                  />
                  <Info size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Minimum competitors required to apply competitor-based LOS
                  </span>
                </div>
              </div>

              {/* LOS Aggregation Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LOS Aggregation Method
                </label>
                <div className="flex items-center gap-3">
                  <select
                    value={aggregationMethod}
                    onChange={(e) => setAggregationMethod(e.target.value)}
                    disabled={isLoading || isSaving}
                    className="w-48 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="min">Minimum</option>
                    <option value="max">Maximum</option>
                  </select>
                  <Info size={20} className="text-gray-500" />
                  <span className="text-sm text-gray-600">
                    How to combine competitor LOS values
                  </span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8">
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
