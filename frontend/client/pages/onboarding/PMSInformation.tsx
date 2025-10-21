import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function PMSInformation() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const location = useLocation();
  const pmsInfo = location.state?.pmsInfo;

  const handleBack = () => {
    navigate("/pms-integration");
  };

  const handleAccept = () => {
    navigate("/select-plan");
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex items-center justify-center px-4 py-8 w-full">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] px-8 py-12 w-full max-w-3xl text-center">
        {/* Warning Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-[56px] h-[56px] p-[14px] rounded-[10px] border-[0.5px] border-[#C2410C] bg-[#FFF9F1] flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 15.583C13.4477 15.583 13 16.0307 13 16.583C13 17.1353 13.4477 17.583 14 17.583C14.5523 17.583 15 17.1353 15 16.583C15 16.0307 14.5523 15.583 14 15.583ZM13.5 13.583H14.5V8.583H13.5V13.583ZM14.0034 22.583C11.1039 22.583 8.78763 22.3595 7.05463 21.9125C5.32237 21.4647 4.25025 20.8753 3.83825 20.144C3.42625 19.4128 3.22038 18.5818 3.22063 17.651C3.22088 16.7203 3.42713 15.8861 3.83938 15.148C4.25163 14.4099 5.32375 13.8205 7.05575 13.3798C8.78775 12.9391 11.1039 12.7188 14.0034 12.7188C16.9029 12.7188 19.2191 12.9391 20.9521 13.3798C22.6844 13.8205 23.7565 14.4099 24.1688 15.148C24.581 15.8861 24.7872 16.7203 24.7874 17.651C24.7877 18.5818 24.5819 19.4128 24.1699 20.144C23.7579 20.8753 22.6858 21.4647 20.9535 21.9125C19.2213 22.3599 16.9029 22.5837 14.0034 22.583ZM14 21.583C16.5125 21.583 18.6406 20.7111 20.3844 18.9674C22.1281 17.2236 23 15.0955 23 12.583C23 10.0705 22.1281 7.94237 20.3844 6.19862C18.6406 4.45487 16.5125 3.583 14 3.583C11.4875 3.583 9.35937 4.45487 7.61562 6.19862C5.87187 7.94237 5 10.0705 5 12.583C5 15.0955 5.87187 17.2236 7.61562 18.9674C9.35937 20.7111 11.4875 21.583 14 21.583Z"
                fill="#C2410C"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-4">
          {t('onboarding:pmsInformation.title')}
        </h1>

        {/* Warning Message */}
        <div className="border border-[#C2410C] bg-[#FFF9F1] rounded-lg p-6 mb-8">
          <p className="text-[18px] text-[#C2410C] leading-normal">
            {pmsInfo?.customPMSName ? (
              <>
                {t('onboarding:pmsInformation.messageWithCustom', { pmsName: pmsInfo.customPMSName })}
              </>
            ) : (
              <>
                {t('onboarding:pmsInformation.messageGeneral')}
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center items-center gap-4">
          <button
            onClick={handleBack}
            className="px-8 py-3 border border-[#D9D9D9] bg-white rounded-[10px] text-[16px] font-bold text-[#294758] hover:bg-gray-50 transition-colors"
          >
            {t('common:buttons.back')}
          </button>
          <button
            onClick={handleAccept}
            className="px-8 py-3 bg-[#294758] text-white rounded-[10px] text-[16px] font-bold hover:bg-[#234149] transition-colors"
          >
            {t('onboarding:pmsInformation.acceptButton')}
          </button>
        </div>
      </div>
    </div>
  );
} 