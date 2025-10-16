import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profilesService } from "../../../shared/api/profiles";
import { queryKeys } from "../../../shared/api/hooks";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import { getLocalStorageItem, setLocalStorageItem } from "../../../shared/localStorage";
import LanguageSwitcher from "../../components/LanguageSwitcher";

// Error Message Component
const ErrorMessage = ({ message }: { message: string }) => {
  if (!message) return null;

  return (
    <div className="flex items-end gap-[5px] mt-1">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z"
          fill="#FF0404"
        />
      </svg>
      <span className="text-[12px] text-[#FF0404] font-normal">{message}</span>
    </div>
  );
};

interface ProfileCompletionData {
  firstName: string;
  lastName: string;
  dni: string;
  phoneNumber: string;
}

export default function ProfileCompletion() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const queryClient = useQueryClient();
  
  // Load saved form data from localStorage on component mount
  const [formData, setFormData] = useState<ProfileCompletionData>(() => {
    const savedData = getLocalStorageItem<ProfileCompletionData>('profileCompletionData');
    if (savedData) {
      return savedData;
    }
    return {
      firstName: "",
      lastName: "",
      dni: "",
      phoneNumber: "",
    };
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [formError, setFormError] = useState("");

  // Fetch current user profile data
  const { data: profileData, isLoading: isLoadingProfile } = useQuery({
    queryKey: queryKeys.profiles.profile,
    queryFn: profilesService.getProfile,
  });

  // Pre-fill form with existing user data when profile data is loaded
  useEffect(() => {
    if (profileData) {
      setFormData(prev => ({
        ...prev,
        firstName: profileData.user.first_name || "",
        lastName: profileData.user.last_name || "",
      }));
    }
  }, [profileData]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileCompletionData) => {
      return profilesService.updateProfile({
        first_name: data.firstName,
        last_name: data.lastName,
        dni: data.dni,
        phone_number: data.phoneNumber,
      });
    },
    onSuccess: () => {
      // Invalidate profile data
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.profile });
    },
  });

  // Update onboarding progress mutation
  const updateOnboardingMutation = useMutation({
    mutationFn: (step: string) => profilesService.updateOnboardingProgress({ step }),
    onSuccess: () => {
      // Clear saved data
      localStorage.removeItem('profileCompletionData');
      // Navigate to next step
      navigate('/hotel-information');
    },
  });

  const isFieldValid = (field: string) => {
    const value = formData[field as keyof typeof formData];
    if (!touched[field] || !value) return false;

    switch (field) {
      case "firstName":
      case "lastName":
        return value.trim() !== "";
      case "dni":
        return true; // DNI is optional, always valid
      case "phoneNumber":
        return true; // Phone number is optional, always valid
      default:
        return false;
    }
  };

  const validateField = (field: string, value: string) => {
    switch (field) {
      case "firstName":
        return value.trim() === "" ? t('errors:FIRST_NAME_REQUIRED') : "";
      case "lastName":
        return value.trim() === "" ? t('errors:LAST_NAME_REQUIRED') : "";
      case "dni":
        return ""; // DNI is optional
      case "phoneNumber":
        return ""; // Phone number is optional
      default:
        return "";
    }
  };

  // Save form data to localStorage
  const saveFormData = (data: ProfileCompletionData) => {
    setLocalStorageItem('profileCompletionData', data);
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const newFormData = { ...formData, [field]: value };
      setFormData(newFormData);
      
      // Save to localStorage on every change
      saveFormData(newFormData);

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };

  const handleBlur = (field: string) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(
      field,
      formData[field as keyof typeof formData],
    );
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all required fields
    const requiredFields = ["firstName", "lastName"];
    const newErrors: { [key: string]: string } = {};

    requiredFields.forEach((field) => {
      const error = validateField(
        field,
        formData[field as keyof typeof formData],
      );
      if (error) {
        newErrors[field] = error;
      }
    });

    setErrors(newErrors);
    setTouched(
      requiredFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
    );

    if (Object.keys(newErrors).length === 0) {
      setFormError("");
      
      try {
        // Update profile with form data
        await updateProfileMutation.mutateAsync(formData);
        
        // Update onboarding progress
        await updateOnboardingMutation.mutateAsync('hotel_information');
      } catch (error: any) {
        console.error("Profile completion error:", error);
        setFormError(t('errors:SERVER_ERROR'));
      }
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-[#F6F9FD] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FD] py-8 px-4 w-full">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      <OnboardingProgressTracker currentStep="register" />
      <div className="w-full max-w-6xl mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/images/logo.png"
            alt="Vivere Stays Logo"
            className="w-60 h-auto mx-auto"
          />
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Progress Header */}
          <div className="flex justify-between items-center mb-10">
            <span className="text-[16px] text-black font-normal">
              {t('onboarding:profileCompletion.title')}
            </span>
            <span className="text-[16px] text-black font-normal">
              {t('onboarding:profileCompletion.almostThere')}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-[10px] bg-[#E2E8F0] rounded-[6px] mb-10 relative hidden sm:block">
            <div className="w-3/4 h-full bg-gradient-to-r from-[#285A6E] to-[#03CBF5] rounded-[6px]"></div>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] px-8 py-12 relative">
            {/* User Icon */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-[#D7E4EB] to-[#CEF4FC] border border-[#9CAABD] rounded-[10px] flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14 11.6667C16.5774 11.6667 18.6667 9.57737 18.6667 7.00004C18.6667 4.42271 16.5774 2.33337 14 2.33337C11.4227 2.33337 9.33337 4.42271 9.33337 7.00004C9.33337 9.57737 11.4227 11.6667 14 11.6667Z"
                  stroke="black"
                  strokeWidth="1.5"
                />
                <path
                  d="M23.331 21.0001C23.3326 20.8087 23.3334 20.6143 23.3334 20.4167C23.3334 17.5176 19.1544 15.1667 14 15.1667C8.84569 15.1667 4.66669 17.5176 4.66669 20.4167C4.66669 23.3159 4.66669 25.6667 14 25.6667C16.6029 25.6667 18.48 25.4836 19.8334 25.1569"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Header */}
            <div className="text-center mt-20 md:mt-16 mb-12">
              <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
                {t('onboarding:profileCompletion.title')}
              </h1>
              <p className="text-[18px] text-[#485567]">
                {t('onboarding:profileCompletion.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 mb-2">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
                    </svg>
                    <span className="text-[14px] text-[#FF0404] font-medium">{formError}</span>
                  </div>
                </div>
              )}

              {/* First Name & Last Name Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-[14px]">
                  <label className="text-[16px] text-[#485567] font-medium">
                    {t('auth:register.firstNameLabel')}
                  </label>
                  <div>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange("firstName")}
                      onBlur={handleBlur("firstName")}
                      placeholder={t('auth:register.firstNamePlaceholder')}
                      className={`w-full h-[60px] px-4 py-[17px] border rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                        errors.firstName && touched.firstName
                          ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                          : isFieldValid("firstName")
                            ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                            : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                      }`}
                    />
                    <ErrorMessage
                      message={touched.firstName ? errors.firstName : ""}
                    />
                  </div>
                </div>
                <div className="space-y-[14px]">
                  <label className="text-[16px] text-[#485567] font-medium">
                    {t('auth:register.lastNameLabel')}
                  </label>
                  <div>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange("lastName")}
                      onBlur={handleBlur("lastName")}
                      placeholder={t('auth:register.lastNamePlaceholder')}
                      className={`w-full h-[60px] px-4 py-[17px] border rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                        errors.lastName && touched.lastName
                          ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                          : isFieldValid("lastName")
                            ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                            : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                      }`}
                    />
                    <ErrorMessage
                      message={touched.lastName ? errors.lastName : ""}
                    />
                  </div>
                </div>
              </div>

              {/* Email Field (Read Only) */}
              <div className="space-y-[14px]">
                <div className="flex items-center gap-[11px]">
                  <svg
                    width="17"
                    height="15"
                    viewBox="0 0 17 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15.4062 13.9286H1.59375C0.711875 13.9286 0 13.2107 0 12.3214V2.67855C0 1.78927 0.711875 1.07141 1.59375 1.07141H15.4062C16.2881 1.07141 17 1.78927 17 2.67855V12.3214C17 13.2107 16.2881 13.9286 15.4062 13.9286ZM1.59375 2.14284C1.29625 2.14284 1.0625 2.37855 1.0625 2.67855V12.3214C1.0625 12.6214 1.29625 12.8571 1.59375 12.8571H15.4062C15.7037 12.8571 15.9375 12.6214 15.9375 12.3214V2.67855C15.9375 2.37855 15.7037 2.14284 15.4062 2.14284H1.59375Z"
                      fill="black"
                    />
                    <path
                      d="M8.50001 9.59997C7.75626 9.59997 7.07626 9.29997 6.56626 8.75354L0.988135 2.77497C0.78626 2.56068 0.796885 2.21783 1.00939 2.01426C1.22189 1.81068 1.56188 1.8214 1.76376 2.03568L7.34188 8.01426C7.94751 8.66783 9.05251 8.66783 9.65813 8.01426L15.2363 2.0464C15.4381 1.83211 15.7781 1.8214 15.9906 2.02497C16.2031 2.22854 16.2138 2.5714 16.0119 2.78568L10.4338 8.76426C9.92376 9.31068 9.24376 9.61068 8.50001 9.61068V9.59997Z"
                      fill="black"
                    />
                  </svg>
                  <span className="text-[16px] text-[#485567] font-medium">
                    {t('auth:register.emailLabel')}
                  </span>
                </div>
                <div>
                  <input
                    type="email"
                    value={(profileData as any)?.user?.email || ""}
                    readOnly
                    className="w-full h-[60px] px-4 py-[17px] border border-[#D7DFE8] rounded-[10px] text-[16px] text-[#9CAABD] bg-gray-50 cursor-not-allowed"
                  />
                  <div className="mt-1 text-[12px] text-[#9CAABD]">
                    {t('onboarding:profileCompletion.emailReadonly')}
                  </div>
                </div>
              </div>

              {/* DNI & Phone Number Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-[14px]">
                  <label className="text-[16px] text-[#485567] font-medium">
                    {t('auth:register.dniLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.dni}
                    onChange={handleInputChange("dni")}
                    onBlur={handleBlur("dni")}
                    placeholder={t('auth:register.dniPlaceholder')}
                    className={`w-full h-[60px] px-4 py-[17px] border rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                      errors.dni && touched.dni
                        ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                        : isFieldValid("dni")
                          ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                          : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                    }`}
                  />
                  <ErrorMessage message={touched.dni ? errors.dni : ""} />
                </div>
                <div className="space-y-[14px]">
                  <label className="text-[16px] text-[#485567] font-medium">
                    {t('auth:register.phoneLabel')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange("phoneNumber")}
                    onBlur={handleBlur("phoneNumber")}
                    placeholder={t('auth:register.phonePlaceholder')}
                    className={`w-full h-[60px] px-4 py-[17px] border rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                      errors.phoneNumber && touched.phoneNumber
                        ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                        : isFieldValid("phoneNumber")
                          ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                          : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                    }`}
                  />
                  <ErrorMessage message={touched.phoneNumber ? errors.phoneNumber : ""} />
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={updateProfileMutation.isPending || updateOnboardingMutation.isPending}
                className={`w-full h-[55px] text-white font-bold text-[16px] rounded-[10px] hover:bg-[#1e3340] transition-colors flex items-center justify-center gap-2 ${
                  updateProfileMutation.isPending || updateOnboardingMutation.isPending ? "bg-gray-400 cursor-not-allowed" : "bg-[#294758]"
                }`}
              >
                {updateProfileMutation.isPending || updateOnboardingMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('common:messages.saving')}
                  </>
                ) : (
                  <>{t('common:buttons.continue')}</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
