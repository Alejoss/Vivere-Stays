import { useState, useContext } from "react";
import { useTranslation } from "react-i18next";
import { PropertyContext } from "../../../shared/PropertyContext";
import LosGeneralSettings from "./LosGeneralSettings";
import LosSetupRules from "./LosSetupRules";
import LosReductionRules from "./LosReductionRules";
import "../../styles/responsive-utilities.css";

export default function LengthOfStay() {
  const { property } = useContext(PropertyContext) ?? {};
  const { t } = useTranslation(['dashboard', 'common']);
  const [activeTab, setActiveTab] = useState<'general' | 'setup' | 'reduction'>('general');

  // Show loading state if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-responsive-lg text-gray-600 container-margin-sm">{t('dashboard:lengthOfStay.noPropertySelected')}</div>
          <div className="text-responsive-sm text-gray-500">{t('dashboard:lengthOfStay.selectPropertyMessage')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container-padding-base">
        {/* Tab Navigation */}
        <div className="container-margin-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-8">
              <button
                onClick={() => setActiveTab('general')}
                className={`py-2 px-1 border-b-2 font-semibold text-responsive-sm ${
                  activeTab === 'general'
                    ? 'border-[#287CAC] text-[#287CAC]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('dashboard:lengthOfStay.generalSettings')}
              </button>
              <button
                onClick={() => setActiveTab('setup')}
                className={`py-2 px-1 border-b-2 font-semibold text-responsive-sm ${
                  activeTab === 'setup'
                    ? 'border-[#287CAC] text-[#287CAC]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('dashboard:lengthOfStay.setupRules')}
              </button>
              <button
                onClick={() => setActiveTab('reduction')}
                className={`py-2 px-1 border-b-2 font-semibold text-responsive-sm ${
                  activeTab === 'reduction'
                    ? 'border-[#287CAC] text-[#287CAC]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t('dashboard:lengthOfStay.reductionRules')}
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
