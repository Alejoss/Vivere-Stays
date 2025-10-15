import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import "../../styles/responsive-utilities.css";

export default function Payment() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);

  // useEffect(() => {
  //   // Simulate payment completion and automatically redirect to add competitor
  //   const timer = setTimeout(() => {
  //     navigate("/add-competitor");
  //   }, 2000);

  //   return () => clearTimeout(timer);
  // }, [navigate]);

  // const handleBack = () => {
  //   navigate("/select-plan");
  // };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex items-center justify-center px-4 py-8">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      <OnboardingProgressTracker currentStep="payment" />
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] container-padding-base w-full max-w-3xl text-center">
        <h1 className="text-responsive-3xl font-bold text-[#1E1E1E] mb-4">{t('onboarding:payment.title')}</h1>
        <p className="text-responsive-lg text-[#485567] mb-8">
          {t('onboarding:payment.subtitle')}
        </p>

        <div className="flex justify-center mb-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#294758]"></div>
        </div>

        
      </div>
    </div>
  );
}
