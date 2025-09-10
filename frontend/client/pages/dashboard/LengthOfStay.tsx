import { useState, useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";
import LosGeneralSettings from "./LosGeneralSettings";
import LosSetupRules from "./LosSetupRules";
import LosReductionRules from "./LosReductionRules";

export default function LengthOfStay() {
  const { property } = useContext(PropertyContext) ?? {};
  const [activeTab, setActiveTab] = useState<'general' | 'setup' | 'reduction'>('general');

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
      <div className="px-6 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'general'
                    ? 'border-[#287CAC] text-[#287CAC]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                General Settings
              </button>
              <button
                onClick={() => setActiveTab('setup')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'setup'
                    ? 'border-[#287CAC] text-[#287CAC]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Setup Rules
              </button>
              <button
                onClick={() => setActiveTab('reduction')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reduction'
                    ? 'border-[#287CAC] text-[#287CAC]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Reduction Rules
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && <LosGeneralSettings />}
        {activeTab === 'setup' && <LosSetupRules />}
        {activeTab === 'reduction' && <LosReductionRules />}
      </div>
    </div>
  );
}
