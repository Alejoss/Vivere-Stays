import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { profilesService } from "../../../shared/api/profiles";
import { queryKeys } from "../../../shared/api/hooks";
import { loadStripe } from "@stripe/stripe-js";
import { paymentService } from "@shared/api/payments";
import { getLocalStorageItem, setLocalStorageItem } from "../../../shared/localStorage";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import OnboardingHeaderControls from "../../components/onboarding/OnboardingHeaderControls";
import "../../styles/responsive-utilities.css";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);


type PlanType = "start" | "scale" | "pro";

interface Plan {
  id: PlanType;
  name: string;
  description: string;
  pricePerRoom: number;
  price: string;
  isSelected?: boolean;
}

export default function SelectPlan() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("scale");
  const [numberOfRooms, setNumberOfRooms] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [tempRoomCount, setTempRoomCount] = useState<number>(1);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [pmsSelectionType, setPmsSelectionType] = useState<string | null>(null);
  // Removed inline tab system in favor of dedicated PlanInformation page

  // Pricing calculation function
  const calculatePrice = (pricePerRoom: number, rooms: number): number => {
    const calculatedPrice = pricePerRoom * rooms;
    return Math.max(calculatedPrice, 300); // Minimum $300
  };

  // Load hotel data from localStorage to get number of rooms
  useEffect(() => {
    try {
      // Use hotelInformationData as primary source
      const hotelInfo = getLocalStorageItem<any>('hotelInformationData');
      if (hotelInfo) {
        if (hotelInfo.numberOfRooms) {
          setNumberOfRooms(parseInt(hotelInfo.numberOfRooms) || 1);
        }
      }
      
      // Get property ID from localStorage
      const propertyId = getLocalStorageItem<string>('selectedPropertyId');
      if (propertyId) {
        setSelectedPropertyId(propertyId);
      }

      // Get PMS selection type from localStorage
      const pmsType = getLocalStorageItem<string>('pmsSelectionType');
      if (pmsType) {
        setPmsSelectionType(pmsType);
      }
    } catch (error) {
      console.error('Error loading hotel data:', error);
      // Fallback to checking hotelDataForPMS for backward compatibility
      try {
        const hotelData = getLocalStorageItem<any>('hotelDataForPMS');
        if (hotelData) {
          if (hotelData.number_of_rooms) {
            setNumberOfRooms(hotelData.number_of_rooms);
          }
        }
      } catch (fallbackError) {
        console.error('Error loading fallback hotel data:', fallbackError);
      }
    }
  }, []);

  const plans: Plan[] = [
    {
      id: "start",
      name: "Start",
      description: "Perfect for single properties",
      pricePerRoom: 20,
      price: `$${calculatePrice(20, numberOfRooms)}/month`,
    },
    {
      id: "scale",
      name: "Scale",
      description: "For growing hotel businesses",
      pricePerRoom: 50,
      price: `$${calculatePrice(50, numberOfRooms)}/month`,
    },
    {
      id: "pro",
      name: "Pro",
      description: "Enterprise-level features",
      pricePerRoom: 80, // Assuming $80 per room for Pro plan - please confirm
      price: "% of total revenue",
    },
  ];

  const handleBack = () => {
    navigate("/pms-integration");
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (plan: string) => profilesService.updateProfile({ selected_plan: plan }),
    onSuccess: () => {
      // Invalidate profile data
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.profile });
    },
  });

  // Update onboarding progress mutation
  const updateOnboardingMutation = useMutation({
    mutationFn: (step: string) => profilesService.updateOnboardingProgress({ step }),
    onSuccess: () => {
      // Navigate to next step
      navigate("/payment");
    },
  });

  // Update property mutation
  const updatePropertyMutation = useMutation({
    mutationFn: ({ propertyId, data }: { propertyId: string; data: any }) => 
      dynamicPricingService.updateProperty(propertyId, data),
    onSuccess: () => {
      // Invalidate property data
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing', 'property'] });
    },
  });

  // const handleContinue = async () => {
  //   setIsLoading(true);
    
  //   try {
  //     // Save selected plan to profile
  //     await updateProfileMutation.mutateAsync(selectedPlan);
      
  //     // Update onboarding progress
  //     await updateOnboardingMutation.mutateAsync('payment');
  //   } catch (error) {
  //     console.error("Error saving plan selection:", error);
  //     // You might want to show an error message to the user here
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  const token = localStorage.getItem("access_token");

  const handleContinue = async () => {
    try {
      await updateProfileMutation.mutateAsync(selectedPlan);

      // Check if user selected "Other" or "I don't have PMS"
      if (pmsSelectionType === "custom_or_none") {
        // Navigate to Contact Sales instead of payment
        navigate("/contact-sales");
        return;
      }

      // Standard flow for users with standard PMS
      await updateOnboardingMutation.mutateAsync("payment");
      const stripe = await stripePromise;
  
      // Find selected plan details
      const planDetails = plans.find(p => p.id === selectedPlan)!;
  
      // Calculate price
      const calculatedPrice = calculatePrice(planDetails.pricePerRoom, numberOfRooms);
  
      // Option 1: reuse same variable
        const { sessionId } = await paymentService.createCheckoutSession(
          selectedPlan,
          numberOfRooms,
          calculatedPrice
        );

        console.log("sessionId from backend:", sessionId);

        // redirect to Stripe
        const { error } = await stripe!.redirectToCheckout({ sessionId });
      if (error) console.error(error);
    } catch (err) {
      console.error("Stripe error:", err);
    }
  };
  
  const handleSelectPlan = (planId: PlanType) => {
    setSelectedPlan(planId);
  };

  const handleOpenRoomModal = () => {
    setTempRoomCount(numberOfRooms);
    setShowRoomModal(true);
  };

  const handleCloseRoomModal = () => {
    setShowRoomModal(false);
    setTempRoomCount(numberOfRooms);
  };

  const handleSaveRoomCount = async () => {
    if (!selectedPropertyId) {
      console.error('No property ID available');
      return;
    }

    try {
      await updatePropertyMutation.mutateAsync({
        propertyId: selectedPropertyId,
        data: { number_of_rooms: tempRoomCount }
      });

      // Update local state
      setNumberOfRooms(tempRoomCount);
      
      // Update localStorage
      const hotelInfo = getLocalStorageItem<any>('hotelInformationData');
      if (hotelInfo) {
        hotelInfo.numberOfRooms = tempRoomCount.toString();
        setLocalStorageItem('hotelInformationData', hotelInfo);
      }

      setShowRoomModal(false);
    } catch (error) {
      console.error('Error updating room count:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8 w-full">
      {/* Language Switcher - Top Right */}
      <OnboardingHeaderControls />
      
      {/* Logo */}
      <div className="container-margin-sm">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="logo-base"
        />
      </div>


      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full max-w-[603px] container-padding-base">
        {/* Header Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-[56px] h-[56px] p-[14px] rounded-[10px] border-[0.5px] border-[#9CAABD] bg-gradient-to-r from-[#D7E4EB] to-[#CEF4FC] flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 14.583C12.9171 14.583 11.8784 15.0132 11.1127 15.779C10.3469 16.5448 9.91669 17.5834 9.91669 18.6663C9.91669 19.7493 10.3469 20.7879 11.1127 21.5537C11.8784 22.3195 12.9171 22.7497 14 22.7497C15.083 22.7497 16.1216 22.3195 16.8874 21.5537C17.6531 20.7879 18.0834 19.7493 18.0834 18.6663C18.0834 17.5834 17.6531 16.5448 16.8874 15.779C16.1216 15.0132 15.083 14.583 14 14.583ZM12.25 18.6663C12.25 18.2022 12.4344 17.7571 12.7626 17.4289C13.0908 17.1007 13.5359 16.9163 14 16.9163C14.4641 16.9163 14.9093 17.1007 15.2375 17.4289C15.5656 17.7571 15.75 18.2022 15.75 18.6663C15.75 19.1305 15.5656 19.5756 15.2375 19.9038C14.9093 20.232 14.4641 20.4163 14 20.4163C13.5359 20.4163 13.0908 20.232 12.7626 19.9038C12.4344 19.5756 12.25 19.1305 12.25 18.6663Z"
                fill="black"
              />
              <path
                d="M20.447 5.96839L16.7382 0.768555L3.101 11.6629L2.345 11.6547V11.6664H1.75V25.6664H26.25V11.6664H25.1277L22.8947 5.13422L20.447 5.96839ZM22.6625 11.6664H10.9632L19.677 8.69605L21.4527 8.12789L22.6625 11.6664ZM18.1417 6.75472L9.14667 9.82072L16.2703 4.12972L18.1417 6.75472ZM4.08333 21.1969V16.1336C4.57587 15.9597 5.02326 15.6779 5.39269 15.3086C5.76212 14.9394 6.04423 14.4922 6.21833 13.9997H21.7817C21.9556 14.4924 22.2377 14.9398 22.6071 15.3093C22.9765 15.6787 23.424 15.9608 23.9167 16.1347V21.1981C23.424 21.372 22.9765 21.6541 22.6071 22.0235C22.2377 22.3929 21.9556 22.8404 21.7817 23.3331H6.22067C6.04588 22.8403 5.76329 22.3929 5.39352 22.0233C5.02375 21.6537 4.57613 21.3714 4.08333 21.1969Z"
                fill="black"
              />
            </svg>
          </div>
        </div>

        {/* Title and Description */}
        <div className="text-center container-margin-sm">
          <h1 className="text-responsive-3xl font-bold text-[#1E1E1E] mb-2">{t('onboarding:selectPlan.title')}</h1>
          <div className="flex flex-col items-center gap-2 mb-4">
            <p className="text-responsive-lg text-[#485567]">
              {t('onboarding:selectPlan.subtitle')}
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/plan-information')}
                className="text-responsive-sm text-[#294758] underline hover:text-[#1e3340]"
              >
                {t('onboarding:selectPlan.moreInfo')}
              </button>
              <button
                onClick={() => navigate("/add-competitor")}
                className="text-responsive-sm text-[#64748B] underline hover:text-[#1e3340]"
              >
                {t('onboarding:selectPlan.skipPayment')}
              </button>
            </div>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-responsive-sm text-[#64748B]">
                {t('onboarding:selectPlan.pricingFor', { count: numberOfRooms, room: numberOfRooms === 1 ? t('onboarding:selectPlan.room') : t('onboarding:selectPlan.rooms') })}
              </p>
              <button
                onClick={handleOpenRoomModal}
                className="text-responsive-sm text-[#294758] font-medium hover:text-[#1e3340] underline"
              >
                {t('common:buttons.edit')}
              </button>
            </div>
          </div>
        </div>

        {/* Removed inline tabs in favor of a dedicated page */}

        {/* Information for custom/no PMS users */}
        {pmsSelectionType === "custom_or_none" && (
          <div className="bg-[#FFF9F1] border border-[#C2410C] rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 11.25C10.3452 11.25 10.625 10.9702 10.625 10.625V6.25C10.625 5.90482 10.3452 5.625 10 5.625C9.65482 5.625 9.375 5.90482 9.375 6.25V10.625C9.375 10.9702 9.65482 11.25 10 11.25ZM10 13.75C10.6904 13.75 11.25 13.1904 11.25 12.5C11.25 11.8096 10.6904 11.25 10 11.25C9.30964 11.25 8.75 11.8096 8.75 12.5C8.75 13.1904 9.30964 13.75 10 13.75ZM10 18.75C14.1421 18.75 17.5 15.3921 17.5 11.25C17.5 7.10786 14.1421 3.75 10 3.75C5.85786 3.75 2.5 7.10786 2.5 11.25C2.5 15.3921 5.85786 18.75 10 18.75ZM10 20C15.5228 20 20 15.5228 20 10C20 4.47715 15.5228 0 10 0C4.47715 0 0 4.47715 0 10C0 15.5228 4.47715 20 10 20Z"
                  fill="#C2410C"
                />
              </svg>
              <p className="text-responsive-sm text-[#C2410C] font-medium">
                {t('onboarding:selectPlan.pmsWarning')}
              </p>
            </div>
          </div>
        )}

        {/* Plan Cards */}
        <div className="space-y-5 mb-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`flex items-center justify-between p-[21px] rounded-xl transition-all ${
                pmsSelectionType === "custom_or_none" 
                  ? "border border-[#9CAABD] bg-white cursor-default"
                  : selectedPlan === plan.id
                    ? "border-2 border-[#294859] bg-[#CEF4FC] cursor-pointer"
                    : "border border-[#9CAABD] bg-white hover:border-[#294859] cursor-pointer"
              }`}
              onClick={() => pmsSelectionType !== "custom_or_none" && handleSelectPlan(plan.id)}
            >
              <div className="flex-1">
                <h3 className="text-responsive-lg font-semibold text-black mb-[6px]">
                  {plan.name}
                </h3>
                <p className="text-responsive-base text-[#64748B] mb-[6px]">
                  {plan.description}
                </p>
                <p className="text-responsive-xl font-bold text-black">{plan.price}</p>
              </div>
              {/* Only show selection buttons for standard PMS users */}
              {pmsSelectionType !== "custom_or_none" && (
                <button className="bg-[#2C4E60] text-white btn-padding-sm rounded-[9px] text-responsive-sm font-normal hover:bg-[#234149] transition-colors">
                  {plan.id === "pro" ? t('onboarding:selectPlan.contactSales') : t('onboarding:selectPlan.selectButton')}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center items-center gap-[13px]">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 btn-padding-base border border-[#D9D9D9] bg-white rounded-[10px] text-responsive-base font-bold text-[#294758] hover:bg-gray-50 transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15.8333 10L4.16658 10M4.16658 10L9.16658 5M4.16658 10L9.16658 15"
                  stroke="#294758"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('common:buttons.back')}
            </button>
            <button
              onClick={handleContinue}
              disabled={isLoading || updateProfileMutation.isPending || updateOnboardingMutation.isPending}
              className={`flex items-center gap-2 btn-padding-base rounded-[10px] text-responsive-base font-bold transition-colors ${
                isLoading || updateProfileMutation.isPending || updateOnboardingMutation.isPending 
                  ? "bg-gray-400 cursor-not-allowed" 
                  : "bg-[#294758] text-white hover:bg-[#234149]"
              }`}
            >
              {isLoading || updateProfileMutation.isPending || updateOnboardingMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('common:messages.saving')}
                </>
              ) : (
                <>
                  {pmsSelectionType === "custom_or_none" ? t('onboarding:selectPlan.contactSales') : t('onboarding:selectPlan.continueToPayment')}
                  <svg
                    width="21"
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
        </div>
      </div>

      {/* Room Count Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] container-padding-base w-full max-w-md mx-4">
            <div className="text-center container-margin-sm">
              <h2 className="text-responsive-2xl font-bold text-[#1E1E1E] mb-2">
                {t('onboarding:selectPlan.updateRoomTitle')}
              </h2>
              <p className="text-responsive-base text-[#485567]">
                {t('onboarding:selectPlan.updateRoomQuestion')}
              </p>
            </div>

            <div className="mb-6">
              <label className="block form-label mb-2">
                {t('onboarding:hotelInformation.numberOfRoomsLabel')}
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={tempRoomCount}
                onChange={(e) => setTempRoomCount(parseInt(e.target.value) || 1)}
                className="w-full input-height-base input-padding-base border border-[#D7DFE8] rounded-[8px] bg-white text-responsive-base focus:outline-none focus:border-[#294859] transition-colors"
                placeholder={t('onboarding:selectPlan.roomPlaceholder')}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCloseRoomModal}
                className="flex-1 input-height-base bg-white border border-[#D9D9D9] text-[#294758] text-responsive-base font-bold rounded-[10px] hover:bg-gray-50 transition-colors"
              >
                {t('common:buttons.cancel')}
              </button>
              <button
                onClick={handleSaveRoomCount}
                disabled={updatePropertyMutation.isPending || tempRoomCount < 1}
                className={`flex-1 input-height-base rounded-[10px] text-responsive-base font-bold transition-colors ${
                  updatePropertyMutation.isPending || tempRoomCount < 1
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-[#294758] text-white hover:bg-[#234149]"
                }`}
              >
                {updatePropertyMutation.isPending ? t('common:messages.saving') : t('common:buttons.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
