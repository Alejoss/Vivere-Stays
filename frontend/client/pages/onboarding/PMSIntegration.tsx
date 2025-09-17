import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreatePMSIntegration, useCreateHotel, usePMSList } from "../../../shared/api/hooks";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import { getHotelDataForAPI, setLocalStorageItem, getLocalStorageItem } from "../../../shared/localStorage";

type PMSOption = "mews" | "cloudbeds" | "opera" | "other" | "none" | null;

export default function PMSIntegration() {
  const navigate = useNavigate();
  const [selectedPMS, setSelectedPMS] = useState<PMSOption>(null);
  const [customPMSName, setCustomPMSName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [hotelData, setHotelData] = useState<any>({});

  const createPMSIntegration = useCreatePMSIntegration();
  const createHotelMutation = useCreateHotel();
  const { data: pmsListData, isLoading: pmsListLoading, error: pmsListError } = usePMSList();

  // Load hotel data from localStorage
  useEffect(() => {
    try {
      const hotelData = getHotelDataForAPI();
      if (hotelData) {
        setHotelData(hotelData);
      }
    } catch (error) {
      console.error('Error loading hotel data:', error);
      // Fallback to checking hotelDataForPMS for backward compatibility
      try {
        const hotelData = getLocalStorageItem<any>('hotelDataForPMS');
        if (hotelData) {
          setHotelData(hotelData);
        }
      } catch (fallbackError) {
        console.error('Error loading fallback hotel data:', fallbackError);
      }
    }
  }, []);

  const handleBack = () => {
    navigate("/hotel-information");
  };

  const handleContinue = async () => {
    if (!selectedPMS) {
      setError("Please select a PMS option");
      return;
    }

    if (selectedPMS === "other" && !customPMSName.trim()) {
      setError("Please specify the custom PMS name");
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      // Use the hotelData from state (loaded from hotelInformationData)
      if (!hotelData || !hotelData.hotel_name) {
        setError("Hotel data not found. Please go back and fill in hotel information.");
        return;
      }

      // Step 1: Create the Property
      console.log("🏨 PMSIntegration - Creating property...");
      console.log("🏨 PMSIntegration - Hotel data:", hotelData);
      const propertyResponse = await createHotelMutation.mutateAsync(hotelData);
      console.log(`✅ PMSIntegration - Property ${propertyResponse.action} successfully:`, propertyResponse.property);

      // Persist property id and data so PropertyContext (or later steps) can load it
      try {
        const createdProperty = propertyResponse.property ?? propertyResponse;
        if (createdProperty?.id) {
          setLocalStorageItem('selectedPropertyId', createdProperty.id);
          setLocalStorageItem('property_data', createdProperty);
          console.log('🏷️ PMSIntegration - Persisted selectedPropertyId and property_data to localStorage');
        }
      } catch (e) {
        console.warn('PMSIntegration - Failed to persist property to localStorage', e);
      }

      // Step 2: Create PMS Integration
      console.log("🔗 PMSIntegration - Creating PMS integration...");
      const integrationData: any = {};
      
      if (selectedPMS === "none") {
        // No PMS selected
        integrationData.pms_id = null;
        integrationData.custom_pms_name = null;
      } else if (selectedPMS === "other") {
        // Custom PMS
        integrationData.pms_id = null;
        integrationData.custom_pms_name = customPMSName.trim();
      } else {
        // Standard PMS - use the actual PMS ID
        const selectedPMSOption = pmsOptions.find(option => option.id === selectedPMS);
        if (selectedPMSOption && selectedPMSOption.type === 'pms') {
          integrationData.pms_id = parseInt(selectedPMS);
          integrationData.custom_pms_name = null;
        } else {
          // Fallback for any other selection
          integrationData.pms_id = null;
          integrationData.custom_pms_name = selectedPMS;
        }
      }

      await createPMSIntegration.mutateAsync(integrationData);
      
      console.log("✅ PMSIntegration - PMS integration saved successfully");
      
      // Don't clear localStorage - keep data for potential back navigation
      // localStorage.removeItem('hotelDataForPMS');
      // localStorage.removeItem('hotelInformationData');
      
      // Navigate based on PMS selection
      if (selectedPMS === "other" || selectedPMS === "none") {
        // For custom PMS or no PMS, show information page first
        // Pass the custom PMS name if "other" was selected
        const pmsInfo = selectedPMS === "other" ? { customPMSName } : null;
        navigate("/pms-information", { state: { pmsInfo } });
      } else {
        // For standard PMS selections, go directly to plans
        navigate("/select-plan");
      }
    } catch (err: any) {
      console.error("❌ PMSIntegration - Error during property creation or PMS integration:", err);
      console.error("❌ PMSIntegration - Error details:", {
        message: err.message,
        status: err.status,
        response: err.response?.data
      });
      
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err.error);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save property and PMS integration. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Build PMS options from API data
  const pmsOptions = [
    // Add PMS systems from API
    ...(pmsListData?.pms_list?.map(pms => ({
      id: pms.id.toString(),
      label: pms.name,
      type: 'pms' as const
    })) || []),
    // Add static options
    { id: "other", label: "Other (specify)", type: 'other' as const },
    { id: "none", label: "I don't have PMS", type: 'none' as const },
  ];

  // Show loading state while fetching PMS list
  if (pmsListLoading) {
    return (
      <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
          <p className="text-[16px] text-[#485567]">Loading PMS options...</p>
        </div>
      </div>
    );
  }

  // Show error state if PMS list fails to load
  if (pmsListError) {
    return (
      <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center justify-center px-4 py-8">
        <div className="text-center">
          <p className="text-[16px] text-[#FF0404] mb-4">Failed to load PMS options. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-[#294758] text-white rounded-lg hover:bg-[#1e3340]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8">
      <OnboardingProgressTracker currentStep="pms_integration" />
      {/* Logo */}
      <div className="text-center mb-10">
        <img
          src="/images/logo.png"
          alt="Vivere Stays Logo"
          className="w-60 h-auto mx-auto"
        />
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-4xl mb-8">
        <div className="flex items-center justify-center gap-[14px]">
          {/* Account - Completed */}
          <div className="flex items-center gap-[14px]">
            <div className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 15.25C10.807 15.2352 10.6276 15.1455 10.5 15L7.49998 12C7.43314 11.86 7.41133 11.7028 7.43756 11.5499C7.46379 11.3971 7.53676 11.2561 7.64643 11.1464C7.7561 11.0368 7.89707 10.9638 8.04993 10.9376C8.20279 10.9113 8.36003 10.9331 8.49998 11L10.97 13.47L19.5 4.99998C19.6399 4.93314 19.7972 4.91133 19.95 4.93756C20.1029 4.96379 20.2439 5.03676 20.3535 5.14643C20.4632 5.2561 20.5362 5.39707 20.5624 5.54993C20.5886 5.70279 20.5668 5.86003 20.5 5.99998L11.5 15C11.3724 15.1455 11.1929 15.2352 11 15.25Z"
                  fill="#16B257"
                />
                <path
                  d="M12.5 20.9999C10.8915 20.9973 9.313 20.5637 7.92891 19.7442C6.54481 18.9246 5.40566 17.7491 4.62999 16.3399C4.04118 15.2896 3.67682 14.1284 3.55999 12.9299C3.37697 11.172 3.7156 9.39911 4.53363 7.83239C5.35167 6.26568 6.6129 4.9745 8.15999 4.11993C9.21036 3.53112 10.3715 3.16677 11.57 3.04993C12.7641 2.92259 13.9717 3.03825 15.12 3.38993C15.2224 3.4104 15.3195 3.45205 15.4049 3.51222C15.4903 3.57238 15.5622 3.64973 15.616 3.73931C15.6698 3.82889 15.7043 3.92871 15.7173 4.03239C15.7302 4.13607 15.7214 4.24131 15.6913 4.34136C15.6612 4.44142 15.6105 4.53409 15.5425 4.61343C15.4745 4.69276 15.3907 4.75702 15.2965 4.80208C15.2022 4.84713 15.0995 4.87199 14.9951 4.87507C14.8907 4.87814 14.7867 4.85936 14.69 4.82017C13.7187 4.52732 12.6987 4.43211 11.69 4.53993C10.6928 4.6412 9.72661 4.94399 8.84999 5.42993C8.00512 5.89603 7.25813 6.52079 6.64999 7.26993C6.02385 8.03309 5.55628 8.91352 5.27467 9.85965C4.99307 10.8058 4.90308 11.7986 5.00999 12.7799C5.11126 13.7771 5.41405 14.7433 5.89999 15.6199C6.36609 16.4648 6.99084 17.2118 7.73999 17.8199C8.50315 18.4461 9.38357 18.9136 10.3297 19.1952C11.2758 19.4768 12.2686 19.5668 13.25 19.4599C14.2472 19.3587 15.2134 19.0559 16.09 18.5699C16.9349 18.1038 17.6818 17.4791 18.29 16.7299C18.9161 15.9668 19.3837 15.0863 19.6653 14.1402C19.9469 13.1941 20.0369 12.2013 19.93 11.2199C19.9101 11.0117 19.9737 10.8042 20.1069 10.6429C20.24 10.4816 20.4318 10.3798 20.64 10.3599C20.8482 10.34 21.0558 10.4037 21.217 10.5368C21.3783 10.67 21.4801 10.8617 21.5 11.0699C21.6821 12.8289 21.342 14.6025 20.5221 16.1694C19.7022 17.7362 18.4389 19.0268 16.89 19.8799C15.8284 20.4928 14.1493 20.8745 12.93 20.9999H12.5Z"
                  fill="#16B257"
                />
              </svg>
              <span className="text-[18px] text-[#16B257] font-medium">
                Account
              </span>
            </div>
            <div className="w-[31px] h-[2px] bg-[#294859]"></div>
          </div>

          {/* Hotel Details - Completed */}
          <div className="flex items-center gap-[14px]">
            <div className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 15.25C10.807 15.2352 10.6276 15.1455 10.5 15L7.49998 12C7.43314 11.86 7.41133 11.7028 7.43756 11.5499C7.46379 11.3971 7.53676 11.2561 7.64643 11.1464C7.7561 11.0368 7.89707 10.9638 8.04993 10.9376C8.20279 10.9113 8.36003 10.9331 8.49998 11L10.97 13.47L19.5 4.99998C19.6399 4.93314 19.7972 4.91133 19.95 4.93756C20.1029 4.96379 20.2439 5.03676 20.3535 5.14643C20.4632 5.2561 20.5362 5.39707 20.5624 5.54993C20.5886 5.70279 20.5668 5.86003 20.5 5.99998L11.5 15C11.3724 15.1455 11.1929 15.2352 11 15.25Z"
                  fill="#16B257"
                />
                <path
                  d="M12.5 20.9999C10.8915 20.9973 9.313 20.5637 7.92891 19.7442C6.54481 18.9246 5.40566 17.7491 4.62999 16.3399C4.04118 15.2896 3.67682 14.1284 3.55999 12.9299C3.37697 11.172 3.7156 9.39911 4.53363 7.83239C5.35167 6.26568 6.6129 4.9745 8.15999 4.11993C9.21036 3.53112 10.3715 3.16677 11.57 3.04993C12.7641 2.92259 13.9717 3.03825 15.12 3.38993C15.2224 3.4104 15.3195 3.45205 15.4049 3.51222C15.4903 3.57238 15.5622 3.64973 15.616 3.73931C15.6698 3.82889 15.7043 3.92871 15.7173 4.03239C15.7302 4.13607 15.7214 4.24131 15.6913 4.34136C15.6612 4.44142 15.6105 4.53409 15.5425 4.61343C15.4745 4.69276 15.3907 4.75702 15.2965 4.80208C15.2022 4.84713 15.0995 4.87199 14.9951 4.87507C14.8907 4.87814 14.7867 4.85936 14.69 4.82017C13.7187 4.52732 12.6987 4.43211 11.69 4.53993C10.6928 4.6412 9.72661 4.94399 8.84999 5.42993C8.00512 5.89603 7.25813 6.52079 6.64999 7.26993C6.02385 8.03309 5.55628 8.91352 5.27467 9.85965C4.99307 10.8058 4.90308 11.7986 5.00999 12.7799C5.11126 13.7771 5.41405 14.7433 5.89999 15.6199C6.36609 16.4648 6.99084 17.2118 7.73999 17.8199C8.50315 18.4461 9.38357 18.9136 10.3297 19.1952C11.2758 19.4768 12.2686 19.5668 13.25 19.4599C14.2472 19.3587 15.2134 19.0559 16.09 18.5699C16.9349 18.1038 17.6818 17.4791 18.29 16.7299C18.9161 15.9668 19.3837 15.0863 19.6653 14.1402C19.9469 13.1941 20.0369 12.2013 19.93 11.2199C19.9101 11.0117 19.9737 10.8042 20.1069 10.6429C20.24 10.4816 20.4318 10.3798 20.64 10.3599C20.8482 10.34 21.0558 10.4037 21.217 10.5368C21.3783 10.67 21.4801 10.8617 21.5 11.0699C21.6821 12.8289 21.342 14.6025 20.5221 16.1694C19.7022 17.7362 18.4389 19.0268 16.89 19.8799C15.8284 20.4928 14.1493 20.8745 12.93 20.9999H12.5Z"
                  fill="#16B257"
                />
              </svg>
              <span className="text-[18px] text-[#16B257] font-medium">
                Hotel Details
              </span>
            </div>
            <div className="w-[31px] h-[2px] bg-[#294859]"></div>
          </div>

          {/* PMS Integration - Current */}
          <div className="flex items-center gap-[18px]">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-[1.67px] border-[#294859] rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-[#294859] rounded-full"></div>
              </div>
              <span className="text-[18px] text-[#294859] font-medium">
                PMS Integration
              </span>
            </div>
            <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
          </div>

          {/* Remaining steps - Inactive */}
          {["Select Plan", "Payment", "Add Competitor", "MSP"].map(
            (step, index) => (
              <div key={step} className="flex items-center gap-[14px]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border border-[#9CAABD] rounded-full"></div>
                  <span className="text-[18px] text-[#9CAABD] font-medium">
                    {step}
                  </span>
                </div>
                {index < 3 && (
                  <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
                )}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] px-8 py-12 w-full max-w-3xl relative">
        {/* PMS Icon */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-[#D7E4EB] to-[#CEF4FC] border-[0.5px] border-[#9CAABD] rounded-[10px] flex items-center justify-center">
          <svg
            width="30"
            height="30"
            viewBox="0 0 30 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M27.8508 7.77425C27.7637 7.68709 27.6603 7.61794 27.5465 7.57076C27.4327 7.52358 27.3107 7.4993 27.1875 7.4993C27.0643 7.4993 26.9423 7.52358 26.8285 7.57076C26.7147 7.61794 26.6113 7.68709 26.5242 7.77425L22.5 11.7996L18.2004 7.50003L22.2258 3.47581C22.4017 3.2999 22.5005 3.06131 22.5005 2.81253C22.5005 2.56375 22.4017 2.32517 22.2258 2.14925C22.0498 1.97334 21.8113 1.87451 21.5625 1.87451C21.3137 1.87451 21.0751 1.97334 20.8992 2.14925L16.875 6.17464L13.7883 3.08675C13.6123 2.91084 13.3738 2.81201 13.125 2.81201C12.8762 2.81201 12.6376 2.91084 12.4617 3.08675C12.2858 3.26267 12.187 3.50125 12.187 3.75003C12.187 3.99881 12.2858 4.2374 12.4617 4.41331L13.2058 5.15628L6.99489 11.3672C6.55959 11.8025 6.21429 12.3193 5.97871 12.888C5.74313 13.4567 5.62187 14.0663 5.62187 14.6819C5.62187 15.2975 5.74313 15.907 5.97871 16.4758C6.21429 17.0445 6.55959 17.5612 6.99489 17.9965L8.83591 19.8375L3.08669 25.5868C2.99959 25.6739 2.93049 25.7773 2.88335 25.8911C2.83621 26.0049 2.81195 26.1269 2.81195 26.25C2.81195 26.3732 2.83621 26.4952 2.88335 26.609C2.93049 26.7228 2.99959 26.8262 3.08669 26.9133C3.2626 27.0892 3.50119 27.1881 3.74997 27.1881C3.87315 27.1881 3.99513 27.1638 4.10894 27.1167C4.22274 27.0695 4.32615 27.0004 4.41325 26.9133L10.166 21.1606L12.007 23.0016C12.4423 23.4369 12.959 23.7822 13.5278 24.0178C14.0965 24.2534 14.7061 24.3746 15.3217 24.3746C15.9372 24.3746 16.5468 24.2534 17.1155 24.0178C17.6843 23.7822 18.201 23.4369 18.6363 23.0016L24.8472 16.7907L25.5902 17.5348C25.6773 17.6219 25.7807 17.691 25.8945 17.7381C26.0083 17.7853 26.1303 17.8095 26.2535 17.8095C26.3767 17.8095 26.4986 17.7853 26.6125 17.7381C26.7263 17.691 26.8297 17.6219 26.9168 17.5348C27.0039 17.4477 27.073 17.3443 27.1201 17.2305C27.1672 17.1167 27.1915 16.9947 27.1915 16.8715C27.1915 16.7483 27.1672 16.6264 27.1201 16.5126C27.073 16.3987 27.0039 16.2953 26.9168 16.2082L23.8254 13.125L27.8508 9.10082C27.9379 9.01375 28.0071 8.91035 28.0542 8.79654C28.1014 8.68273 28.1257 8.56074 28.1257 8.43753C28.1257 8.31433 28.1014 8.19234 28.0542 8.07853C28.0071 7.96472 27.9379 7.86132 27.8508 7.77425ZM17.3109 21.6797C17.0497 21.941 16.7396 22.1483 16.3983 22.2898C16.057 22.4312 15.6911 22.504 15.3217 22.504C14.9522 22.504 14.5863 22.4312 14.245 22.2898C13.9037 22.1483 13.5936 21.941 13.3324 21.6797L8.32028 16.6676C8.05896 16.4064 7.85167 16.0963 7.71023 15.755C7.5688 15.4137 7.496 15.0478 7.496 14.6784C7.496 14.3089 7.5688 13.943 7.71023 13.6017C7.85167 13.2604 8.05896 12.9503 8.32028 12.6891L14.5312 6.47816L23.5183 15.4688L17.3109 21.6797Z"
              fill="white"
            />
            <path
              d="M27.8508 7.77425C27.7637 7.68709 27.6603 7.61794 27.5465 7.57076C27.4327 7.52358 27.3107 7.4993 27.1875 7.4993C27.0643 7.4993 26.9423 7.52358 26.8285 7.57076C26.7147 7.61794 26.6113 7.68709 26.5242 7.77425L22.5 11.7996L18.2004 7.50003L22.2258 3.47581C22.4017 3.2999 22.5005 3.06131 22.5005 2.81253C22.5005 2.56375 22.4017 2.32517 22.2258 2.14925C22.0498 1.97334 21.8113 1.87451 21.5625 1.87451C21.3137 1.87451 21.0751 1.97334 20.8992 2.14925L16.875 6.17464L13.7883 3.08675C13.6123 2.91084 13.3738 2.81201 13.125 2.81201C12.8762 2.81201 12.6376 2.91084 12.4617 3.08675C12.2858 3.26267 12.187 3.50125 12.187 3.75003C12.187 3.99881 12.2858 4.2374 12.4617 4.41331L13.2058 5.15628L6.99489 11.3672C6.55959 11.8025 6.21429 12.3193 5.97871 12.888C5.74313 13.4567 5.62187 14.0663 5.62187 14.6819C5.62187 15.2975 5.74313 15.907 5.97871 16.4758C6.21429 17.0445 6.55959 17.5612 6.99489 17.9965L8.83591 19.8375L3.08669 25.5868C2.99959 25.6739 2.93049 25.7773 2.88335 25.8911C2.83621 26.0049 2.81195 26.1269 2.81195 26.25C2.81195 26.3732 2.83621 26.4952 2.88335 26.609C2.93049 26.7228 2.99959 26.8262 3.08669 26.9133C3.2626 27.0892 3.50119 27.1881 3.74997 27.1881C3.87315 27.1881 3.99513 27.1638 4.10894 27.1167C4.22274 27.0695 4.32615 27.0004 4.41325 26.9133L10.166 21.1606L12.007 23.0016C12.4423 23.4369 12.959 23.7822 13.5278 24.0178C14.0965 24.2534 14.7061 24.3746 15.3217 24.3746C15.9372 24.3746 16.5468 24.2534 17.1155 24.0178C17.6843 23.7822 18.201 23.4369 18.6363 23.0016L24.8472 16.7907L25.5902 17.5348C25.6773 17.6219 25.7807 17.691 25.8945 17.7381C26.0083 17.7853 26.1303 17.8095 26.2535 17.8095C26.3767 17.8095 26.4986 17.7853 26.6125 17.7381C26.7263 17.691 26.8297 17.6219 26.9168 17.5348C27.0039 17.4477 27.073 17.3443 27.1201 17.2305C27.1672 17.1167 27.1915 16.9947 27.1915 16.8715C27.1915 16.7483 27.1672 16.6264 27.1201 16.5126C27.073 16.3987 27.0039 16.2953 26.9168 16.2082L23.8254 13.125L27.8508 9.10082C27.9379 9.01375 28.0071 8.91035 28.0542 8.79654C28.1014 8.68273 28.1257 8.56074 28.1257 8.43753C28.1257 8.31433 28.1014 8.19234 28.0542 8.07853C28.0071 7.96472 27.9379 7.86132 27.8508 7.77425ZM17.3109 21.6797C17.0497 21.941 16.7396 22.1483 16.3983 22.2898C16.057 22.4312 15.6911 22.504 15.3217 22.504C14.9522 22.504 14.5863 22.4312 14.245 22.2898C13.9037 22.1483 13.5936 21.941 13.3324 21.6797L8.32028 16.6676C8.05896 16.4064 7.85167 16.0963 7.71023 15.755C7.5688 15.4137 7.496 15.0478 7.496 14.6784C7.496 14.3089 7.5688 13.943 7.71023 13.6017C7.85167 13.2604 8.05896 12.9503 8.32028 12.6891L14.5312 6.47816L23.5183 15.4688L17.3109 21.6797Z"
              fill="black"
            />
          </svg>
        </div>

        {/* Header */}
        <div className="text-center mt-16 mb-8">
          <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
            Integration with Your PMS
          </h1>
          <p className="text-[18px] text-[#485567] text-center max-w-md mx-auto">
            Connect your Property Management System to automate price
            management.
          </p>
        </div>

        <div className="space-y-5 max-w-2xl mx-auto">
          {/* PMS Selection */}
          <div className="space-y-[14px]">
            <label className="text-[16px] text-[#485567] font-medium">
              Select your PMS
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-[21px]">
              {pmsOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedPMS(option.id as PMSOption)}
                  className={`w-[184px] h-[54px] px-[17px] py-[17px] rounded-[8px] border text-[16px] font-normal transition-colors ${
                    selectedPMS === option.id
                      ? "bg-[#294859] border-[#294859] text-white"
                      : "bg-white border-[#D7DFE8] text-[#9CAABD]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom PMS Name Input - Only show when "Other" is selected */}
          {selectedPMS === "other" && (
            <div className="space-y-[14px]">
              <label className="text-[16px] text-[#485567] font-medium">
                Name of your PMS
              </label>
              <input
                type="text"
                value={customPMSName}
                onChange={(e) => setCustomPMSName(e.target.value)}
                placeholder="e.g., Little Hotelier"
                className="w-full h-[60px] px-4 py-[17px] border border-[#D7DFE8] rounded-[8px] bg-white text-[16px] placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors"
              />
            </div>
          )}

          {/* PMS Recommendation Box - Only show when "I don't have PMS" is selected */}
          {selectedPMS === "none" && (
            <div className="border border-[#D9D9D9] rounded-[8px] bg-[#F8FAFC] p-[25px]">
              <div className="flex items-center gap-[6px] mb-[10px]">
                <svg
                  width="27"
                  height="27"
                  viewBox="0 0 27 27"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M13.5 9V13.5M13.5 18H13.5113M3.375 13.5C3.375 14.8296 3.63689 16.1462 4.14572 17.3747C4.65455 18.6031 5.40035 19.7193 6.34054 20.6595C7.28074 21.5996 8.39691 22.3455 9.62533 22.8543C10.8538 23.3631 12.1704 23.625 13.5 23.625C14.8296 23.625 16.1462 23.3631 17.3747 22.8543C18.6031 22.3455 19.7193 21.5996 20.6595 20.6595C21.5996 19.7193 22.3455 18.6031 22.8543 17.3747C23.3631 16.1462 23.625 14.8296 23.625 13.5C23.625 10.8147 22.5583 8.23935 20.6595 6.34054C18.7606 4.44174 16.1853 3.375 13.5 3.375C10.8147 3.375 8.23935 4.44174 6.34054 6.34054C4.44174 8.23935 3.375 10.8147 3.375 13.5Z"
                    stroke="#485567"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3 className="text-[18px] font-bold text-[#485567]">
                  PMS Recommendation
                </h3>
              </div>
              <p className="text-[14px] text-[#485567]">
                To get the most out of Vivere Stays, we recommend using a PMS.
                Our support team will contact you to help you choose a
                compatible one.
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 mb-4">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
                </svg>
                <span className="text-[14px] text-[#FF0404] font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-8">
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="flex-1 h-[55px] bg-white border border-[#D9D9D9] text-[#294758] text-[16px] font-bold rounded-[10px] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                width="21"
                height="20"
                viewBox="0 0 21 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16.3333 10L4.66658 10M4.66658 10L9.66658 5M4.66658 10L9.66658 15"
                  stroke="#294758"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Back
            </button>
            <button
              onClick={handleContinue}
              disabled={isLoading || !selectedPMS || (selectedPMS === "other" && !customPMSName.trim())}
              className={`flex-1 h-[55px] px-[85px] py-[18px] rounded-[10px] text-white text-[16px] font-bold transition-colors flex items-center justify-center gap-2 ${
                isLoading || !selectedPMS || (selectedPMS === "other" && !customPMSName.trim())
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#294758] hover:bg-[#1e3340]"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating Property & PMS Integration...
                </>
              ) : (
                <>
                  {selectedPMS === "other" || selectedPMS === "none" 
                    ? "Continue" 
                    : "Continue to Plans"
                  }
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.16669 10H15.8334M15.8334 10L10.8334 15M15.8334 10L10.8334 5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Contact Support */}
        <div className="flex items-center gap-[7px] mt-8 justify-center">
          <span className="text-[14px] text-[#485567] opacity-55">
            Contact Support
          </span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_74_60625)">
              <path
                d="M0.426036 9.88041C0.425571 11.5608 0.864641 13.2016 1.69952 14.6478L0.346191 19.589L5.40294 18.2631C6.80157 19.0245 8.36863 19.4235 9.96107 19.4236H9.96526C15.2222 19.4236 19.5015 15.1458 19.5038 9.88793C19.5048 7.3401 18.5135 4.94428 16.7124 3.1418C14.9116 1.33948 12.5167 0.346378 9.96487 0.345215C4.70728 0.345215 0.428284 4.62273 0.426114 9.88041"
                fill="url(#paint0_linear_74_60625)"
              />
              <path
                d="M0.0854482 9.87721C0.0849055 11.6181 0.539712 13.3175 1.40436 14.8155L0.00250244 19.9339L5.24056 18.5605C6.68382 19.3474 8.30878 19.7622 9.96227 19.7629H9.96653C15.4121 19.7629 19.8451 15.3312 19.8475 9.88512C19.8484 7.24574 18.8214 4.7638 16.956 2.89674C15.0903 1.02992 12.6097 0.00108527 9.96653 0C4.52002 0 0.0876187 4.43101 0.0854482 9.87721"
                fill="url(#paint1_linear_74_60625)"
              />
              <path
                d="M7.49696 5.74776C7.312 5.33668 7.11735 5.32838 6.94146 5.32117C6.79743 5.31497 6.63278 5.31544 6.46828 5.31544C6.30363 5.31544 6.03611 5.37738 5.80999 5.62427C5.58363 5.87141 4.9458 6.46862 4.9458 7.68327C4.9458 8.89792 5.83053 10.0719 5.95386 10.2368C6.07735 10.4013 7.66185 12.9737 10.1713 13.9633C12.2569 14.7857 12.6813 14.6222 13.1339 14.5809C13.5867 14.5399 14.5947 13.9839 14.8004 13.4074C15.0062 12.8309 15.0062 12.3368 14.9445 12.2336C14.8828 12.1307 14.7181 12.0689 14.4712 11.9455C14.2243 11.8221 13.0105 11.2247 12.7842 11.1423C12.5578 11.06 12.3932 11.0189 12.2286 11.2661C12.0639 11.513 11.5911 12.0689 11.447 12.2336C11.3031 12.3986 11.159 12.4192 10.9122 12.2957C10.6651 12.1718 9.86999 11.9114 8.92665 11.0704C8.1927 10.416 7.6972 9.60784 7.55316 9.36063C7.40913 9.11381 7.53774 8.98001 7.66154 8.85699C7.77247 8.74637 7.90851 8.56869 8.03208 8.42459C8.15518 8.2804 8.19627 8.17753 8.27859 8.01288C8.36099 7.84807 8.31975 7.70389 8.25813 7.5804C8.19627 7.45691 7.7165 6.2359 7.49696 5.74776Z"
                fill="white"
              />
            </g>
            <defs>
              <linearGradient
                id="paint0_linear_74_60625"
                x1="958.226"
                y1="1924.73"
                x2="958.226"
                y2="0.345215"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#1FAF38" />
                <stop offset="1" stopColor="#60D669" />
              </linearGradient>
              <linearGradient
                id="paint1_linear_74_60625"
                x1="992.251"
                y1="1993.39"
                x2="992.251"
                y2="0"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#F9F9F9" />
                <stop offset="1" stopColor="white" />
              </linearGradient>
              <clipPath id="clip0_74_60625">
                <rect width="19.85" height="20" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              opacity="0.16"
              d="M3.34998 4.16699L9.67164 10.4887C9.98419 10.8011 10.408 10.9766 10.85 10.9766C11.2919 10.9766 11.7158 10.8011 12.0283 10.4887L18.35 4.16699V14.167C18.35 14.609 18.1744 15.0329 17.8618 15.3455C17.5493 15.6581 17.1253 15.8337 16.6833 15.8337H5.01664C4.57461 15.8337 4.15069 15.6581 3.83813 15.3455C3.52557 15.0329 3.34998 14.609 3.34998 14.167V4.16699Z"
              fill="black"
              fillOpacity="0.47"
            />
            <path
              d="M3.35 4.16683V3.3335C3.12898 3.3335 2.91702 3.42129 2.76074 3.57757C2.60446 3.73385 2.51666 3.94582 2.51666 4.16683H3.35ZM18.35 4.16683H19.1833C19.1833 3.94582 19.0955 3.73385 18.9393 3.57757C18.783 3.42129 18.571 3.3335 18.35 3.3335V4.16683ZM3.35 5.00016H18.35V3.3335H3.35V5.00016ZM17.5167 4.16683V14.1668H19.1833V4.16683H17.5167ZM16.6833 15.0002H5.01666V16.6668H16.6833V15.0002ZM4.18333 14.1668V4.16683H2.51666V14.1668H4.18333ZM5.01666 15.0002C4.79565 15.0002 4.58369 14.9124 4.42741 14.7561C4.27113 14.5998 4.18333 14.3878 4.18333 14.1668H2.51666C2.51666 14.8299 2.78005 15.4658 3.2489 15.9346C3.71774 16.4034 4.35362 16.6668 5.01666 16.6668V15.0002ZM17.5167 14.1668C17.5167 14.3878 17.4289 14.5998 17.2726 14.7561C17.1163 14.9124 16.9043 15.0002 16.6833 15.0002V16.6668C17.3464 16.6668 17.9823 16.4034 18.4511 15.9346C18.9199 15.4658 19.1833 14.8299 19.1833 14.1668H17.5167Z"
              fill="black"
              fillOpacity="0.47"
            />
            <path
              d="M3.34998 4.16699L10.85 11.667L18.35 4.16699"
              stroke="black"
              strokeOpacity="0.47"
              strokeWidth="1.66667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
