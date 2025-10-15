import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import { profilesService } from "../../../shared/api/profiles";
import { queryKeys } from "../../../shared/api/hooks";
import { loadStripe } from "@stripe/stripe-js";
import { paymentService } from "@shared/api/payments";
import { getLocalStorageItem, setLocalStorageItem } from "../../../shared/localStorage";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import LanguageSwitcher from "../../components/LanguageSwitcher";
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
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      <OnboardingProgressTracker currentStep="select_plan" />
      {/* Logo */}
      <div className="container-margin-sm">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="logo-base"
        />
      </div>

      {/* Progress Bar */}
      <div className="flex justify-center items-center container-margin-base w-full max-w-[1235px]">
        {/* Account - Completed */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 15.25C10.8071 15.2352 10.6276 15.1455 10.5 15L7.50003 12C7.43319 11.86 7.41138 11.7028 7.43761 11.5499C7.46383 11.3971 7.5368 11.2561 7.64647 11.1464C7.75614 11.0368 7.89712 10.9638 8.04998 10.9376C8.20284 10.9113 8.36007 10.9331 8.50003 11L10.97 13.47L19.5 4.99998C19.64 4.93314 19.7972 4.91133 19.9501 4.93756C20.1029 4.96379 20.2439 5.03676 20.3536 5.14643C20.4633 5.2561 20.5362 5.39707 20.5624 5.54993C20.5887 5.70279 20.5669 5.86003 20.5 5.99998L11.5 15C11.3725 15.1455 11.193 15.2352 11 15.25Z"
                fill="#16B257"
              />
              <path
                d="M12.5 21.0002C10.8915 20.9976 9.31305 20.564 7.92896 19.7444C6.54486 18.9249 5.4057 17.7493 4.63003 16.3402C4.04122 15.2898 3.67687 14.1286 3.56003 12.9302C3.37701 11.1723 3.71564 9.39935 4.53368 7.83264C5.35171 6.26592 6.61294 4.97474 8.16003 4.12017C9.2104 3.53136 10.3716 3.16701 11.57 3.05017C12.7642 2.92284 13.9718 3.03849 15.12 3.39017C15.2225 3.41064 15.3195 3.4523 15.405 3.51246C15.4904 3.57263 15.5623 3.64998 15.6161 3.73955C15.6699 3.82913 15.7043 3.92896 15.7173 4.03263C15.7303 4.13631 15.7214 4.24155 15.6913 4.34161C15.6612 4.44167 15.6106 4.53433 15.5426 4.61367C15.4746 4.69301 15.3908 4.75726 15.2965 4.80232C15.2022 4.84738 15.0996 4.87224 14.9952 4.87531C14.8907 4.87839 14.7868 4.85961 14.69 4.82017C13.7187 4.52756 12.6987 4.43236 11.69 4.54017C10.6929 4.64145 9.72666 4.94423 8.85003 5.43017C8.00516 5.89628 7.25818 6.52103 6.65003 7.27017C6.02389 8.03333 5.55633 8.91376 5.27472 9.85989C4.99311 10.806 4.90313 11.7988 5.01003 12.7802C5.1113 13.7773 5.41409 14.7436 5.90003 15.6202C6.36614 16.465 6.99089 17.212 7.74003 17.8202C8.50319 18.4463 9.38362 18.9139 10.3297 19.1955C11.2759 19.4771 12.2687 19.5671 13.25 19.4602C14.2472 19.3589 15.2134 19.0561 16.09 18.5702C16.9349 18.1041 17.6819 17.4793 18.29 16.7302C18.9162 15.967 19.3837 15.0866 19.6653 14.1405C19.947 13.1943 20.0369 12.2015 19.93 11.2202C19.9101 11.012 19.9738 10.8044 20.1069 10.6431C20.2401 10.4818 20.4318 10.3801 20.64 10.3602C20.8482 10.3403 21.0558 10.4039 21.2171 10.5371C21.3784 10.6702 21.4801 10.862 21.5 11.0702C21.6821 12.8291 21.342 14.6028 20.5221 16.1696C19.7023 17.7364 18.439 19.027 16.89 19.8802C15.8285 20.4931 14.6494 20.8748 13.43 21.0002H12.5Z"
                fill="#16B257"
              />
            </svg>
            <span className="text-responsive-lg font-medium text-[#16B257]">
              Account
            </span>
          </div>
          <div className="w-[31px] h-[2px] bg-[#294859]"></div>
        </div>

        {/* Hotel Details - Completed */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.0162 15.25C10.8232 15.2352 10.6438 15.1455 10.5162 15L7.51619 12C7.44935 11.86 7.42754 11.7028 7.45376 11.5499C7.47999 11.3971 7.55296 11.2561 7.66263 11.1464C7.7723 11.0368 7.91327 10.9638 8.06614 10.9376C8.219 10.9113 8.37623 10.9331 8.51619 11L10.9862 13.47L19.5162 4.99998C19.6561 4.93314 19.8134 4.91133 19.9662 4.93756C20.1191 4.96379 20.2601 5.03676 20.3697 5.14643C20.4794 5.2561 20.5524 5.39707 20.5786 5.54993C20.6048 5.70279 20.583 5.86003 20.5162 5.99998L11.5162 15C11.3886 15.1455 11.2091 15.2352 11.0162 15.25Z"
                fill="#16B257"
              />
              <path
                d="M12.5162 21.0002C10.9076 20.9976 9.32918 20.564 7.94508 19.7444C6.56099 18.9249 5.42183 17.7493 4.64616 16.3402C4.05735 15.2898 3.693 14.1286 3.57616 12.9302C3.39314 11.1723 3.73177 9.39935 4.54981 7.83264C5.36784 6.26592 6.62907 4.97474 8.17616 4.12017C9.22653 3.53136 10.3877 3.16701 11.5862 3.05017C12.7803 2.92284 13.9879 3.03849 15.1362 3.39017C15.2386 3.41064 15.3357 3.4523 15.4211 3.51246C15.5065 3.57263 15.5784 3.64998 15.6322 3.73955C15.686 3.82913 15.7205 3.92896 15.7334 4.03263C15.7464 4.13631 15.7375 4.24155 15.7074 4.34161C15.6774 4.44167 15.6267 4.53433 15.5587 4.61367C15.4907 4.69301 15.4069 4.75726 15.3126 4.80232C15.2184 4.84738 15.1157 4.87224 15.0113 4.87531C14.9068 4.87839 14.8029 4.85961 14.7062 4.82017C13.7349 4.52756 12.7148 4.43236 11.7062 4.54017C10.709 4.64145 9.74279 4.94423 8.86616 5.43017C8.02129 5.89628 7.2743 6.52103 6.66616 7.27017C6.04002 8.03333 5.57246 8.91376 5.29085 9.85989C5.00924 10.806 4.91926 11.7988 5.02616 12.7802C5.12743 13.7773 5.43022 14.7436 5.91616 15.6202C6.38226 16.465 7.00702 17.212 7.75616 17.8202C8.51932 18.4463 9.39975 18.9139 10.3459 19.1955C11.292 19.4771 12.2848 19.5671 13.2662 19.4602C14.2633 19.3589 15.2295 19.0561 16.1062 18.5702C16.951 18.1041 17.698 17.4793 18.3062 16.7302C18.9323 15.967 19.3999 15.0866 19.6815 14.1405C19.9631 13.1943 19.5692 12.2015 19.4623 11.2202C19.4424 11.012 19.506 10.8044 19.6392 10.6431C19.7723 10.4818 19.9641 10.3801 20.1723 10.3602C20.3805 10.3403 20.588 10.4039 20.7493 10.5371C20.9106 10.6702 21.0124 10.862 21.0323 11.0702C21.2144 12.8291 20.8742 14.6028 20.0544 16.1696C19.2345 17.7364 17.9712 19.027 16.4223 19.8802C15.3607 20.4931 14.1816 20.8748 12.9623 21.0002H12.0323Z"
                fill="#16B257"
              />
            </svg>
            <span className="text-responsive-lg font-medium text-[#16B257]">
              Hotel Details
            </span>
          </div>
          <div className="w-[31px] h-[2px] bg-[#294859]"></div>
        </div>

        {/* PMS Integration - Completed */}
        <div className="flex items-center gap-[18px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.5323 15.25C10.3394 15.2352 10.1599 15.1455 10.0323 15L7.0323 12C6.96546 11.86 6.94365 11.7028 6.96988 11.5499C6.9961 11.3971 7.06908 11.2561 7.17875 11.1464C7.28842 11.0368 7.42939 10.9638 7.58225 10.9376C7.73511 10.9113 7.89235 10.9331 8.0323 11L10.5023 13.47L19.0323 4.99998C19.1723 4.93314 19.3295 4.91133 19.4824 4.93756C19.6352 4.96379 19.7762 5.03676 19.8859 5.14643C19.9955 5.2561 20.0685 5.39707 20.0947 5.54993C20.1209 5.70279 20.0991 5.86003 20.0323 5.99998L11.0323 15C10.9047 15.1455 10.7252 15.2352 10.5323 15.25Z"
                fill="#16B257"
              />
              <path
                d="M12.0323 21.0002C10.4237 20.9976 8.84529 20.564 7.4612 19.7444C6.0771 18.9249 4.93794 17.7493 4.16227 16.3402C3.57347 15.2898 3.20911 14.1286 3.09227 12.9302C2.90925 11.1723 3.24788 9.39935 4.06592 7.83264C4.88395 6.26592 6.14518 4.97474 7.69227 4.12017C8.74264 3.53136 9.90381 3.16701 11.1023 3.05017C12.2964 2.92284 13.504 3.03849 14.6523 3.39017C14.7547 3.41064 14.8518 3.4523 14.9372 3.51246C15.0226 3.57263 15.0945 3.64998 15.1483 3.73955C15.2021 3.82913 15.2366 3.92896 15.2495 4.03263C15.2625 4.13631 15.2536 4.24155 15.2236 4.34161C15.1935 4.44167 15.1428 4.53433 15.0748 4.61367C15.0068 4.69301 14.923 4.75726 14.8287 4.80232C14.7345 4.84738 14.6318 4.87224 14.5274 4.87531C14.423 4.87839 14.319 4.85961 14.2223 4.82017C13.251 4.52756 12.2309 4.43236 11.2223 4.54017C10.2251 4.64145 9.2589 4.94423 8.38227 5.43017C7.53741 5.89628 6.79042 6.52103 6.18227 7.27017C5.55613 8.03333 5.08857 8.91376 4.80696 9.85989C4.52536 10.806 4.43537 11.7988 4.54227 12.7802C4.64355 13.7773 4.94634 14.7436 5.43227 15.6202C5.89838 16.465 6.52313 17.212 7.27227 17.8202C8.03543 18.4463 8.91586 18.9139 9.86199 19.1955C10.8081 19.4771 11.8009 19.5671 12.7823 19.4602C13.7794 19.3589 14.7457 19.0561 15.6223 18.5702C16.4671 18.1041 17.2141 17.4793 17.8223 16.7302C18.4484 15.967 18.916 15.0866 19.1976 14.1405C19.4792 13.1943 19.5692 12.2015 19.4623 11.2202C19.4424 11.012 19.506 10.8044 19.6392 10.6431C19.7723 10.4818 19.9641 10.3801 20.1723 10.3602C20.3805 10.3403 20.588 10.4039 20.7493 10.5371C20.9106 10.6702 21.0124 10.862 21.0323 11.0702C21.2144 12.8291 20.8742 14.6028 20.0544 16.1696C19.2345 17.7364 17.9712 19.027 16.4223 19.8802C15.3607 20.4931 14.1816 20.8748 12.9623 21.0002H12.0323Z"
                fill="#16B257"
              />
            </svg>
            <span className="text-responsive-lg font-medium text-[#16B257]">
              PMS Integration
            </span>
          </div>
          <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
        </div>

        {/* Select Plan - Current */}
        <div className="flex justify-center items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 21 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_74_61390)">
              <path
                d="M10.0484 19.1663C15.1109 19.1663 19.2151 15.0622 19.2151 9.99967C19.2151 4.93717 15.1109 0.833008 10.0484 0.833008C4.98594 0.833008 0.881775 4.93717 0.881775 9.99967C0.881775 15.0622 4.98594 19.1663 10.0484 19.1663ZM10.0484 10.833C10.2695 10.833 10.4814 10.7452 10.6377 10.5889C10.794 10.4326 10.8818 10.2207 10.8818 9.99967C10.8818 9.77866 10.794 9.5667 10.6377 9.41042C10.4814 9.25414 10.2695 9.16634 10.0484 9.16634C9.82743 9.16634 9.61547 9.25414 9.45919 9.41042C9.3029 9.5667 9.21511 9.77866 9.21511 9.99967C9.21511 10.2207 9.3029 10.4326 9.45919 10.5889C9.61547 10.7452 9.82743 10.833 10.0484 10.833ZM10.0484 12.4997C10.7115 12.4997 11.3474 12.2363 11.8162 11.7674C12.285 11.2986 12.5484 10.6627 12.5484 9.99967C12.5484 9.33663 12.285 8.70075 11.8162 8.23191C11.3474 7.76307 10.7115 7.49967 10.0484 7.49967C9.3854 7.49967 8.74951 7.76307 8.28067 8.23191C7.81183 8.70075 7.54844 9.33663 7.54844 9.99967C7.54844 10.6627 7.81183 11.2986 8.28067 11.7674C8.74951 12.2363 9.3854 12.4997 10.0484 12.4997ZM10.0484 14.1663C11.1535 14.1663 12.2133 13.7274 12.9947 12.946C13.7761 12.1646 14.2151 11.1047 14.2151 9.99967C14.2151 8.8946 13.7761 7.8348 12.9947 7.0534C12.2133 6.27199 11.1535 5.83301 10.0484 5.83301C8.94337 5.83301 7.88356 6.27199 7.10216 7.0534C6.32076 7.8348 5.88177 8.8946 5.88177 9.99967C5.88177 11.1047 6.32076 12.1646 7.10216 12.946C7.88356 13.7274 8.94337 14.1663 10.0484 14.1663Z"
                stroke="#294859"
                strokeWidth="1.66667"
              />
            </g>
            <defs>
              <clipPath id="clip0_74_61390">
                <rect
                  width="20"
                  height="20"
                  fill="white"
                  transform="translate(0.0484619)"
                />
              </clipPath>
            </defs>
          </svg>
          <span className="text-responsive-lg font-medium text-[#9CAABD]">
            Select Plan
          </span>
        </div>

        {/* Payment - Pending */}
        <div className="flex items-center gap-[14px]">
          <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
          <div className="flex justify-center items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_74_61396)">
                <path
                  d="M10.0646 18.75C7.74393 18.75 5.51833 17.8281 3.87739 16.1872C2.23645 14.5462 1.31458 12.3206 1.31458 10C1.31458 7.67936 2.23645 5.45376 3.87739 3.81282C5.51833 2.17187 7.74393 1.25 10.0646 1.25C12.3852 1.25 14.6108 2.17187 16.2518 3.81282C17.8927 5.45376 18.8146 7.67936 18.8146 10C18.8146 12.3206 17.8927 14.5462 16.2518 16.1872C14.6108 17.8281 12.3852 18.75 10.0646 18.75ZM10.0646 20C12.7167 20 15.2603 18.9464 17.1356 17.0711C19.011 15.1957 20.0646 12.6522 20.0646 10C20.0646 7.34784 19.011 4.8043 17.1356 2.92893C15.2603 1.05357 12.7167 0 10.0646 0C7.41241 0 4.86887 1.05357 2.99351 2.92893C1.11814 4.8043 0.0645752 7.34784 0.0645752 10C0.0645752 12.6522 1.11814 15.1957 2.99351 17.0711C4.86887 18.9464 7.41241 20 10.0646 20Z"
                  fill="#9CAABD"
                />
              </g>
              <defs>
                <clipPath id="clip0_74_61396">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(0.0645752)"
                  />
                </clipPath>
              </defs>
            </svg>
            <span className="text-responsive-lg font-medium text-[#9CAABD]">
              Payment
            </span>
          </div>
        </div>

        {/* Add Competitor - Pending */}
        <div className="flex items-center gap-[14px]">
          <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
          <div className="flex justify-center items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_74_61402)">
                <path
                  d="M10.0646 18.75C7.74393 18.75 5.51833 17.8281 3.87739 16.1872C2.23645 14.5462 1.31458 12.3206 1.31458 10C1.31458 7.67936 2.23645 5.45376 3.87739 3.81282C5.51833 2.17187 7.74393 1.25 10.0646 1.25C12.3852 1.25 14.6108 2.17187 16.2518 3.81282C17.8927 5.45376 18.8146 7.67936 18.8146 10C18.8146 12.3206 17.8927 14.5462 16.2518 16.1872C14.6108 17.8281 12.3852 18.75 10.0646 18.75ZM10.0646 20C12.7167 20 15.2603 18.9464 17.1356 17.0711C19.011 15.1957 20.0646 12.6522 20.0646 10C20.0646 7.34784 19.011 4.8043 17.1356 2.92893C15.2603 1.05357 12.7167 0 10.0646 0C7.41241 0 4.86887 1.05357 2.99351 2.92893C1.11814 4.8043 0.0645752 7.34784 0.0645752 10C0.0645752 12.6522 1.11814 15.1957 2.99351 17.0711C4.86887 18.9464 7.41241 20 10.0646 20Z"
                  fill="#9CAABD"
                />
              </g>
              <defs>
                <clipPath id="clip0_74_61402">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(0.0645752)"
                  />
                </clipPath>
              </defs>
            </svg>
            <span className="text-responsive-lg font-medium text-[#9CAABD]">
              Add Competitor
            </span>
          </div>
        </div>

        {/* MSP - Pending */}
        <div className="flex items-center gap-[14px]">
          <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
          <div className="flex justify-center items-center gap-2">
            <svg
              width="20"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_74_61408)">
                <path
                  d="M10.0645 18.75C7.74381 18.75 5.51821 17.8281 3.87727 16.1872C2.23633 14.5462 1.31445 12.3206 1.31445 10C1.31445 7.67936 2.23633 5.45376 3.87727 3.81282C5.51821 2.17187 7.74381 1.25 10.0645 1.25C12.3851 1.25 14.6107 2.17187 16.2516 3.81282C17.8926 5.45376 18.8145 7.67936 18.8145 10C18.8145 12.3206 17.8926 14.5462 16.2516 16.1872C14.6107 17.8281 12.3851 18.75 10.0645 18.75ZM10.0645 20C12.7166 20 15.2602 18.9464 17.1355 17.0711C19.0109 15.1957 20.0645 12.6522 20.0645 10C20.0645 7.34784 19.0109 4.8043 17.1355 2.92893C15.2602 1.05357 12.7166 0 10.0645 0C7.41229 0 4.86875 1.05357 2.99339 2.92893C1.11802 4.8043 0.0644531 7.34784 0.0644531 10C0.0644531 12.6522 1.11802 15.1957 2.99339 17.0711C4.86875 18.9464 7.41229 20 10.0645 20Z"
                  fill="#9CAABD"
                />
              </g>
              <defs>
                <clipPath id="clip0_74_61408">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(0.0644531)"
                  />
                </clipPath>
              </defs>
            </svg>
            <span className="text-responsive-lg font-medium text-[#9CAABD]">MSP</span>
          </div>
        </div>
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
        <div className="action-buttons">
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
