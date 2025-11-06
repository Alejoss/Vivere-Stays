import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { getLocalStorageItem } from "../../../shared/localStorage";
import OnboardingHeaderControls from "../../components/onboarding/OnboardingHeaderControls";

export default function WelcomeComplete() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const [progress, setProgress] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Simulate scanning progress
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsCompleted(true);
            return 100;
          }
          return prev + 2;
        });
      }, 50);

      return () => clearInterval(interval);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleGoToDashboard = async () => {
    const clickTs = Date.now();
    console.log('[WelcomeComplete] Go to Dashboard clicked at', new Date(clickTs).toISOString());
    setError("");
    setIsInitializing(true);
    
    try {
      // Get property ID from localStorage
      const selectedPropertyId = getLocalStorageItem<string>("selectedPropertyId");
      
      if (!selectedPropertyId) {
        console.error('[WelcomeComplete] No property ID found in localStorage');
        setError("Property information not found. Please contact support.");
        setIsInitializing(false);
        return;
      }
      
      console.log('[WelcomeComplete] Initializing defaults for property:', selectedPropertyId);
      const reqUrl = `/dynamic-pricing/properties/${selectedPropertyId}/initialize-defaults/`;
      console.log('[WelcomeComplete] Request URL:', reqUrl);
      console.log('[WelcomeComplete] Navigator.onLine:', navigator.onLine);
      
      const start = performance.now();
      
      // Initialize property defaults (DpGeneralSettings and DpDynamicIncrementsV2)
      const result = await dynamicPricingService.initializePropertyDefaults(selectedPropertyId);
      const durationMs = Math.round(performance.now() - start);
      console.log('[WelcomeComplete] API success in', durationMs, 'ms. Response:', result);
      
      console.log('[WelcomeComplete] Defaults initialized successfully:', result);
      
      // Navigate to dashboard after successful initialization
      navigate("/dashboard");
    } catch (err: any) {
      const durationMsg = typeof performance !== 'undefined' ? ` after ~${Math.round(performance.now())}ms from mount` : '';
      console.error('[WelcomeComplete] Error initializing property defaults' + durationMsg + ':', err);
      
      // Network diagnostics
      // Try to unwrap typical fetch/axios style errors
      const status = err?.response?.status ?? err?.status;
      const statusText = err?.response?.statusText ?? err?.statusText;
      const url = err?.config?.url ?? err?.request?.url;
      console.log('[WelcomeComplete] Error diagnostics:', {
        navigatorOnline: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
        status,
        statusText,
        url,
        hasResponseData: !!err?.response?.data,
      });
      if (err?.response?.data) {
        console.log('[WelcomeComplete] Response data:', err.response.data);
      }
      
      // Extract error message
      let errorMessage = "Failed to initialize property settings. Please try again.";
      if (err && typeof err === 'object') {
        if ('error' in err) {
          errorMessage = err.error;
        } else if ('detail' in err) {
          errorMessage = err.detail;
        } else if ('message' in err) {
          errorMessage = err.message;
        }
        if (err?.response?.data?.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8 w-full">
      {/* Language Switcher - Top Right */}
      <OnboardingHeaderControls />
      
      {/* Logo */}
      <div className="mb-8">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="w-[240px] h-[121px]"
        />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full max-w-[832px] p-4 sm:p-8 md:p-[65px] relative">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-[102px] h-[102px] rounded-full bg-[#D7FBE6] flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21.7293 29.4618C21.0959 29.4151 20.5068 29.1309 20.088 28.6701L10.2404 19.1695C10.021 18.7263 9.9494 18.2284 10.0355 17.7443C10.1215 17.2602 10.3611 16.8137 10.7211 16.4664C11.0811 16.1191 11.5438 15.888 12.0456 15.805C12.5474 15.7219 13.0635 15.791 13.5229 16.0026L21.6308 23.8248L49.6309 -3.0014C50.0903 -3.2131 50.6065 -3.2821 51.1083 -3.1991C51.61 -3.116 52.0728 -2.8849 52.4328 -2.5376C52.7928 -2.1903 53.0323 -1.7439 53.1184 -1.2598C53.2045 -0.775694 53.1329 -0.277707 52.9135 0.165514L23.3706 28.6701C22.9518 29.1309 22.3626 29.4151 21.7293 29.4618Z"
                fill="#16B257"
              />
              <path
                d="M26.9052 47.7689C21.7737 47.7607 16.7382 46.3746 12.3227 43.7548C7.90718 41.1351 4.27309 37.3774 1.79859 32.873C-0.0798134 29.5154 -1.2421 25.8037 -1.61489 21.9728C-2.19873 16.3535 -1.11843 10.6863 1.49121 5.67824C4.10084 0.670159 8.12439 -3.45722 13.0599 -6.18877C16.4107 -8.07096 20.115 -9.23565 23.9383 -9.60914C27.7479 -10.0162 31.6002 -9.64649 35.2634 -8.52227C35.5902 -8.45691 35.8998 -8.32374 36.1724 -8.13139C36.4449 -7.93905 36.6743 -7.69176 36.8459 -7.40547C37.0174 -7.11918 37.1274 -6.80007 37.1687 -6.46873C37.2101 -6.13739 37.1819 -5.80093 37.0859 -5.48102C36.9899 -5.16112 36.8283 -4.86496 36.6114 -4.61136C36.3945 -4.35775 36.1271 -4.15242 35.8264 -4.00834C35.5256 -3.86426 35.1982 -3.78484 34.865 -3.77498C34.5318 -3.76512 34.2003 -3.82515 33.8916 -3.95127C30.793 -4.88656 27.5389 -5.19091 24.3211 -4.84629C21.14 -4.52256 18.0577 -3.55466 15.2611 -2.00143C12.5658 -0.511431 10.1828 1.48563 8.24269 3.88034C6.24515 6.31981 4.75356 9.13407 3.85532 12.1585C2.95708 15.1828 2.66985 18.3564 3.01094 21.4933C3.33394 24.6808 4.29992 27.7693 5.85008 30.5715C7.33709 33.2721 9.33007 35.6599 11.72 37.6039C14.1546 39.6054 16.9633 41.1 19.9816 42.0002C22.9999 42.9003 26.1671 43.188 29.2978 42.8462C32.4789 42.5225 35.5613 41.5546 38.3578 40.0013C41.0531 38.5114 43.4361 36.5143 45.3762 34.1197C47.3737 31.6802 48.8653 28.8659 49.7636 25.8415C50.662 22.8172 50.9491 19.6436 50.608 16.5067C50.5446 15.8412 50.7476 15.1777 51.1723 14.6621C51.5971 14.1466 52.2089 13.8212 52.8731 13.7576C53.5372 13.694 54.1994 13.8974 54.7139 14.3231C55.2284 14.7487 55.5531 15.3617 55.6166 16.0272C56.1975 21.6498 55.1124 27.3193 52.4969 32.3278C49.8814 37.3362 45.8513 41.4616 40.91 44.1888C37.5234 46.148 33.762 47.368 29.872 47.7689H26.9052Z"
                fill="#16B257"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl md:text-[34px] font-bold text-[#1E1E1E] text-center mb-4">
          {t('onboarding:welcomeComplete.title')}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-[18px] text-[#485567] text-center mb-6 sm:mb-8 max-w-[563px] mx-auto">
          {t('onboarding:welcomeComplete.subtitle')}
        </p>

        {/* AI Robot Working Section */}
        <div className="bg-[#EEF9FF] border border-[#D8E9FE] rounded-[8px] p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
          {/* Mobile Layout - Stack vertically */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            {/* Robot Icon */}
            <div className="flex-shrink-0">
              <svg
                width="48"
                height="48"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M27 4.00007C27 4.88807 26.614 5.68607 26 6.23607V10.0001H36C37.5913 10.0001 39.1174 10.6322 40.2426 11.7574C41.3679 12.8826 42 14.4088 42 16.0001V36.0001C42 37.5914 41.3679 39.1175 40.2426 40.2427C39.1174 41.3679 37.5913 42.0001 36 42.0001H12C10.4087 42.0001 8.88258 41.3679 7.75736 40.2427C6.63214 39.1175 6 37.5914 6 36.0001V16.0001C6 14.4088 6.63214 12.8826 7.75736 11.7574C8.88258 10.6322 10.4087 10.0001 12 10.0001H22V6.23607C21.627 5.90245 21.3434 5.48083 21.175 5.0096C21.0066 4.53837 20.9587 4.03249 21.0358 3.53804C21.1128 3.04359 21.3124 2.57626 21.6162 2.17862C21.92 1.78099 22.3185 1.46567 22.7753 1.26137C23.2321 1.05708 23.7328 0.970312 24.2317 1.00896C24.7306 1.04761 25.212 1.21046 25.6319 1.48267C26.0518 1.75487 26.3969 2.1278 26.6359 2.56749C26.8748 3.00717 27 3.49965 27 4.00007ZM12 14.0001C11.4696 14.0001 10.9609 14.2108 10.5858 14.5859C10.2107 14.9609 10 15.4696 10 16.0001V36.0001C10 36.5305 10.2107 37.0392 10.5858 37.4143C10.9609 37.7894 11.4696 38.0001 12 38.0001H36C36.5304 38.0001 37.0391 37.7894 37.4142 37.4143C37.7893 37.0392 38 36.5305 38 36.0001V16.0001C38 15.4696 37.7893 14.9609 37.4142 14.5859C37.0391 14.2108 36.5304 14.0001 36 14.0001H12ZM4 20.0001H0V32.0001H4V20.0001ZM44 20.0001H48V32.0001H44V20.0001ZM18 29.0001C18.7956 29.0001 19.5587 28.684 20.1213 28.1214C20.6839 27.5588 21 26.7957 21 26.0001C21 25.2044 20.6839 24.4414 20.1213 23.8787C19.5587 23.3161 18.7956 23.0001 18 23.0001C17.2044 23.0001 16.4413 23.3161 15.8787 23.8787C15.3161 24.4414 15 25.2044 15 26.0001C15 26.7957 15.3161 27.5588 15.8787 28.1214C16.4413 28.684 17.2044 29.0001 18 29.0001ZM30 29.0001C30.7956 29.0001 31.5587 28.684 32.1213 28.1214C32.6839 27.5588 33 26.7957 33 26.0001C33 25.2044 32.6839 24.4414 32.1213 23.8787C31.5587 23.3161 30.7956 23.0001 30 23.0001C29.2044 23.0001 28.4413 23.3161 27.8787 23.8787C27.3161 24.4414 27 25.2044 27 26.0001C27 26.7957 27.3161 27.5588 27.8787 28.1214C28.4413 28.684 29.2044 29.0001 30 29.0001Z"
                  fill="#294859"
                />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="mb-4">
                <h3 className="text-base sm:text-lg md:text-[18px] font-bold text-[#1E1E1E] mb-2">
                  {t('onboarding:welcomeComplete.aiRobotTitle')}
                </h3>
                <p className="text-sm sm:text-base md:text-[14px] text-[#1E1E1E]">
                  {t('onboarding:welcomeComplete.scanningMessage')}
                </p>
              </div>

              {/* Scanning Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm sm:text-base md:text-[14px] text-[#1E1E1E]">
                    {t('onboarding:welcomeComplete.scanningProgress')}
                  </p>
                  {/* Progress Counter */}
                  <div className="text-sm font-medium text-[#294859]">
                    {progress}%
                  </div>
                </div>
                <div className="w-full h-[10px] bg-[#E2E8F0] rounded-[6px] relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#285A6E] to-[#03CBF5] rounded-[6px] transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Status Message */}
              <div className="flex items-center gap-2">
                {!isCompleted ? (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="animate-spin"
                    >
                      <path
                        d="M12 6V3M16.25 7.75L18.4 5.6M18 12H21M16.25 16.25L18.4 18.4M12 18V21M7.75 16.25L5.6 18.4M6 12H3M7.75 7.75L5.6 5.6"
                        stroke="#294859"
                        strokeWidth="1.66667"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-base sm:text-lg md:text-[18px] text-[#294859]">
                      {t('onboarding:welcomeComplete.analyzing')}
                    </span>
                  </>
                ) : (
                  <>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11 15.25C10.807 15.2352 10.6276 15.1455 10.5 15L7.49998 12C7.43314 11.86 7.41133 11.7028 7.43756 11.5499C7.46379 11.3971 7.53676 11.2561 7.64643 11.1464C7.7561 11.0368 7.89707 10.9638 8.04993 10.9376C8.20279 10.9113 8.36003 10.9331 8.49998 11L10.97 13.47L19.5 4.99998C19.6399 4.93314 19.7972 4.91133 19.95 4.93756C20.1029 4.96379 20.2439 5.03676 20.3535 5.14643C20.4632 5.2561 20.5362 5.39707 20.5624 5.54993C20.5886 5.70279 20.5668 5.86003 20.5 5.99998L11.5 15C11.3724 15.1455 11.1929 15.2352 11 15.25Z"
                        fill="#16B257"
                      />
                      <path
                        d="M12.5 21.0002C10.8915 20.9976 9.313 20.564 7.92891 19.7444C6.54481 18.9249 5.40566 17.7493 4.62999 16.3402C4.04118 15.2898 3.67682 14.1286 3.55999 12.9302C3.37697 11.1723 3.7156 9.39935 4.53363 7.83264C5.35167 6.26592 6.6129 4.97474 8.15999 4.12017C9.21036 3.53136 10.3715 3.16701 11.57 3.05017C12.7641 2.92284 13.9717 3.03849 15.12 3.39017C15.2224 3.41064 15.3195 3.4523 15.4049 3.51246C15.4903 3.57263 15.5622 3.64998 15.616 3.73955C15.6698 3.82913 15.7043 3.92896 15.7173 4.03263C15.7302 4.13631 15.7214 4.24155 15.6913 4.34161C15.6612 4.44167 15.6105 4.53433 15.5425 4.61367C15.4745 4.69301 15.3907 4.75726 15.2965 4.80232C15.2022 4.84738 15.0995 4.87224 14.9951 4.87531C14.8907 4.87839 14.7867 4.85961 14.69 4.82017C13.7187 4.52756 12.6987 4.43236 11.69 4.54017C10.6928 4.64145 9.72661 4.94423 8.84999 5.43017C8.00512 5.89628 7.25813 6.52103 6.64999 7.27017C6.02385 8.03333 5.55628 8.91376 5.27467 9.85989C4.99307 10.806 4.90308 11.7988 5.00999 12.7802C5.11126 13.7773 5.41405 14.7436 5.89999 15.6202C6.36609 16.465 6.99084 17.212 7.73999 17.8202C8.50315 18.4463 9.38357 18.9139 10.3297 19.1955C11.2758 19.4771 12.2686 19.5671 13.25 19.4602C14.2472 19.3589 15.2134 19.0561 16.09 18.5702C16.9349 18.1041 17.6818 17.4793 18.29 16.7302C18.9161 15.967 19.3837 15.0866 19.6653 14.1405C19.9469 13.1943 20.0369 12.2015 19.93 11.2202C19.9101 11.012 19.9737 10.8044 20.1069 10.6431C20.24 10.4818 20.4318 10.3801 20.64 10.3602C20.8482 10.3403 21.0558 10.4039 21.217 10.5371C21.3783 10.6702 21.4801 10.862 21.5 11.0702C21.6821 12.8291 21.342 14.6028 20.5221 16.1696C19.7022 17.7364 18.4389 19.027 16.89 19.8802C15.8284 20.4931 14.6493 20.8748 13.43 21.0002H12.5Z"
                        fill="#16B257"
                      />
                    </svg>
                    <span className="text-base sm:text-lg md:text-[18px] text-[#16B257] font-medium">
                      {t('onboarding:welcomeComplete.completed')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Go Dashboard Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={handleGoToDashboard}
            disabled={isInitializing}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 sm:px-[77px] py-[18px] rounded-[10px] text-[16px] font-bold transition-colors ${
              isInitializing 
                ? "bg-gray-400 cursor-not-allowed text-white" 
                : "bg-[#294758] text-white hover:bg-[#234149]"
            }`}
          >
            {isInitializing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>{t('onboarding:welcomeComplete.settingUp')}</span>
              </>
            ) : (
              <>
                <span>{t('onboarding:welcomeComplete.goToDashboard')}</span>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 21 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M4.66669 10H16.3334M16.3334 10L11.3334 15M16.3334 10L11.3334 5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </>
            )}
          </button>
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 max-w-md">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 18.3333C14.6024 18.3333 18.3333 14.6024 18.3333 10C18.3333 5.39763 14.6024 1.66667 10 1.66667C5.39763 1.66667 1.66667 5.39763 1.66667 10C1.66667 14.6024 5.39763 18.3333 10 18.3333Z" stroke="#EF4444" strokeWidth="1.5"/>
                  <path d="M10 6.66667V10M10 13.3333H10.0083" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[14px] text-[#EF4444] font-medium">{error}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
