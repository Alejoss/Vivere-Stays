import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { useCheckUserExists } from "../../../shared/api/hooks";
import { useRegister, useGoogleLogin } from "../../../shared/api/hooks";
import { RegisterRequest } from "../../../shared/api/types";
import { profilesService } from "../../../shared/api/profiles";
import { FormFieldError } from "../../components/ErrorMessage";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import "../../styles/responsive-utilities.css";

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const { t } = useTranslation('auth');
  const strength = {
    hasMinLength: password.length >= 8,
    hasUpperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const StrengthItem = ({
    label,
    isValid,
  }: {
    label: string;
    isValid: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 11"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="5" cy="5.5" r="5" fill={isValid ? "#16B257" : "#D7DFE8"} />
      </svg>
      <span
        className={`text-responsive-xs font-normal ${isValid ? "text-[#16B257]" : "text-[#9CAABD]"}`}
      >
        {label}
      </span>
    </div>
  );

  // Only show if user has started typing
  if (!password) return null;

  return (
    <div className="mt-3 space-y-[10px]">
      <StrengthItem label={t('register.password8Chars')} isValid={strength.hasMinLength} />
      <StrengthItem
        label={t('register.passwordUpperLower')}
        isValid={strength.hasUpperLower}
      />
      <StrengthItem label={t('register.passwordNumber')} isValid={strength.hasNumber} />
    </div>
  );
};

export default function Register() {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'errors', 'common']);
  const checkUserExists = useCheckUserExists();
  
  // Form data state - no longer using localStorage
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dni: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  // Terms acceptance state
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [receiveUpdates, setReceiveUpdates] = useState(true);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const registerMutation = useRegister();
  const googleLoginMutation = useGoogleLogin();

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    return {
      hasMinLength: password.length >= 8,
      hasUpperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
    };
  };

  const isFieldValid = (field: string) => {
    const value = formData[field as keyof typeof formData];
    if (!touched[field] || !value) return false;

    switch (field) {
      case "firstName":
      case "lastName":
        return value.trim() !== "";
      case "email":
        return value.trim() !== "" && /\S+@\S+\.\S+/.test(value);
      case "password":
        const strength = getPasswordStrength(value);
        return (
          strength.hasMinLength && strength.hasUpperLower && strength.hasNumber
        );
      case "confirmPassword":
        return value.trim() !== "" && value === formData.password;
      case "dni":
      case "phoneNumber":
        return value.trim() !== "";
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
      case "email":
        if (value.trim() === "") return t('errors:EMAIL_REQUIRED');
        if (!/\S+@\S+\.\S+/.test(value)) return t('errors:EMAIL_INVALID');
        return "";
      case "password":
        if (value.trim() === "") return t('errors:PASSWORD_REQUIRED');
        const strength = getPasswordStrength(value);
        if (
          !strength.hasMinLength ||
          !strength.hasUpperLower ||
          !strength.hasNumber
        ) {
          return t('errors:PASSWORD_TOO_WEAK');
        }
        return "";
      case "confirmPassword":
        if (value.trim() === "") return t('errors:PASSWORD_REQUIRED');
        if (value !== formData.password) return t('errors:PASSWORD_MISMATCH');
        return "";
      default:
        return "";
    }
  };

  const handleInputChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const newFormData = { ...formData, [field]: value };
      setFormData(newFormData);

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
    
    // Check if user exists when email field loses focus
    if (field === "email" && formData.email && !error) {
      checkUserExists.mutate(
        { email: formData.email, username: formData.email },
        {
          onSuccess: () => {
            // Clear any existing email error if user doesn't exist
            setErrors((prev) => ({ ...prev, email: "" }));
          },
          onError: (error: any) => {
            console.error("User existence check error:", error);
            
            // Handle validation errors from backend
            if (error && typeof error === 'object' && 'detail' in error) {
              try {
                const detail = JSON.parse(error.detail);
                if (detail.email) {
                  setErrors((prev) => ({ ...prev, email: detail.email }));
                }
              } catch (parseError) {
                console.error("Error parsing user existence response:", parseError);
              }
            }
          },
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if terms are agreed to
    if (!agreeToTerms) {
      setFormError(t('errors:TERMS_NOT_AGREED') || "Please agree to the Terms of Service and Privacy Policy to continue.");
      return;
    }

    // Validate all required fields
    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "password",
      "confirmPassword",
    ];
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
      setIsLoading(true);
      
      try {
        // Check if user already exists before proceeding
        await checkUserExists.mutateAsync({
          email: formData.email,
          username: formData.email, // Using email as username
        });
        
        // If no error, user doesn't exist, create the account immediately
        const registrationData = {
          username: formData.email, // Using email as username
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          receive_updates: receiveUpdates, // Include email preferences
        };
        
        await registerMutation.mutateAsync(registrationData);
        
        // Navigate directly to email verification
        navigate("/verify-email");
      } catch (error: any) {
        console.error("Registration error:", error);
        
        // Handle validation errors from backend
        if (error && typeof error === 'object' && 'detail' in error) {
          try {
            const detail = JSON.parse(error.detail);
            setErrors(detail);
          } catch (parseError) {
            setFormError("An error occurred during registration. Please try again.");
          }
        } else if (error && typeof error === 'object' && 'error' in error) {
          setFormError(error.error);
        } else {
          setFormError("An error occurred during registration. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    console.log('Google OAuth response received:', response);
    setFormError("");

    try {
      console.log('Attempting to login with Google credential...');
      const data = await googleLoginMutation.mutateAsync(response.credential);
      console.log('Google login successful, raw response data:', data);
      
      if (!data || !data.id || !data.username || !data.email || !data.access) {
        console.error('Invalid user data structure:', data);
        throw new Error('Invalid user data received from server');
      }
      
      // Get user's onboarding progress and redirect to appropriate step
      try {
        console.log('🔍 Google Register: Fetching onboarding progress...');
        console.log('🔍 Google Register: Access token available:', !!data.access);
        
        const progressData = await profilesService.getOnboardingProgress();
        console.log('📊 Google Register: Onboarding progress data:', progressData);
        
        // Check if onboarding is completed
        if (progressData.completed) {
          console.log('✅ Google Register: Onboarding completed, redirecting to dashboard');
          navigate("/dashboard");
          return;
        }
        
        const currentStep = progressData.current_step;
        console.log('📍 Google Register: Current onboarding step:', currentStep);
        
        // For new Google users, redirect to dashboard (same as completed users)
        if (currentStep === 'register' && !progressData.completed) {
          console.log('📝 Google Register: User at register step, redirecting to dashboard');
          navigate("/dashboard");
          return;
        }
        
        // Validate that the current step is a valid OnboardingStep
        const validSteps = ['register', 'verify_email', 'hotel_information', 'pms_integration', 'select_plan', 'payment', 'add_competitor', 'msp', 'complete'] as const;
        
        if (validSteps.includes(currentStep as any)) {
          // Navigate directly to the step route
          const stepRoutes = {
            register: '/register',
            verify_email: '/verify-email',
            hotel_information: '/hotel-information',
            pms_integration: '/pms-integration',
            select_plan: '/select-plan',
            payment: '/payment',
            add_competitor: '/add-competitor',
            msp: '/msp',
            complete: '/welcome-complete',
          };
          
          const route = stepRoutes[currentStep as keyof typeof stepRoutes];
          console.log('🚀 Google Register: Navigating to route:', route);
          navigate(route);
          console.log(`✅ Google Register: Redirecting to onboarding step: ${currentStep}`);
        } else {
          console.warn(`⚠️ Google Register: Invalid onboarding step: ${currentStep}, defaulting to hotel-information`);
          navigate("/hotel-information");
        }
      } catch (progressError) {
        console.error('❌ Google Register: Error getting onboarding progress:', progressError);
        // Fallback to hotel-information if progress check fails
        navigate("/hotel-information");
      }
    } catch (error: any) {
      console.error('Google login failed:', error);
      
      // Handle the API error structure
      if (error && typeof error === 'object' && 'error' in error) {
        setFormError(error.error);
      } else if (error && typeof error === 'object' && 'response' in error && error.response?.data?.error) {
        setFormError(error.response.data.error);
      } else if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Google login failed. Please try again.");
      }
    }
  }, [googleLoginMutation, navigate]);

  return (
    <div className="min-h-screen bg-[#F6F9FD] py-8 px-4 w-full">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      <div className="w-full max-w-6xl mx-auto px-4">
        {/* Logo */}
        <div className="text-center container-margin-base">
          <img
            src="/images/logo.png"
            alt="Vivere Stays Logo"
            className="logo-base mx-auto"
          />
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Main Card */}
          <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] container-padding-base relative">
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
            <div className="text-center mt-20 md:mt-16 container-margin-base">
              <h1 className="text-responsive-3xl font-bold text-[#1E1E1E] mb-3">
                {t('auth:register.title')}
              </h1>
              <p className="text-responsive-lg text-[#485567]">
                {t('auth:register.subtitle')}
              </p>
            </div>



            <form onSubmit={handleSubmit} className="space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 mb-2">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
                    </svg>
                    <span className="text-responsive-sm text-[#FF0404] font-medium">{formError}</span>
                  </div>
                </div>
              )}
              {/* First Name & Last Name Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 grid-gap-base">
                <div className="form-field">
                  <label className="form-label">
                    {t('auth:register.firstNameLabel')}
                  </label>
                  <div>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={handleInputChange("firstName")}
                      onBlur={handleBlur("firstName")}
                      placeholder={t('auth:register.firstNamePlaceholder')}
                      className={`w-full input-height-lg input-padding-base border rounded-[10px] text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                        errors.firstName && touched.firstName
                          ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                          : isFieldValid("firstName")
                            ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                            : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                      }`}
                    />
                    <FormFieldError error={touched.firstName ? errors.firstName : ""} />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">
                    {t('auth:register.lastNameLabel')}
                  </label>
                  <div>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={handleInputChange("lastName")}
                      onBlur={handleBlur("lastName")}
                      placeholder={t('auth:register.lastNamePlaceholder')}
                      className={`w-full input-height-lg input-padding-base border rounded-[10px] text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                        errors.lastName && touched.lastName
                          ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                          : isFieldValid("lastName")
                            ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                            : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                      }`}
                    />
                    <FormFieldError error={touched.lastName ? errors.lastName : ""} />
                  </div>
                </div>
              </div>

              {/* DNI & Phone Number Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 grid-gap-base">
                <div className="form-field">
                  <label className="form-label">
                    {t('auth:register.dniLabel')}
                  </label>
                  <input
                    type="text"
                    value={formData.dni}
                    onChange={handleInputChange("dni")}
                    onBlur={handleBlur("dni")}
                    placeholder={t('auth:register.dniPlaceholder')}
                    className={`w-full input-height-lg input-padding-base border rounded-[10px] text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                      isFieldValid("dni")
                        ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                        : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                    }`}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    {t('auth:register.phoneLabel')}
                  </label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleInputChange("phoneNumber")}
                    onBlur={handleBlur("phoneNumber")}
                    placeholder={t('auth:register.phonePlaceholder')}
                    className={`w-full input-height-lg input-padding-base border rounded-[10px] text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                      isFieldValid("phoneNumber")
                        ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                        : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                    }`}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="form-field">
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
                  <span className="form-label">
                    {t('auth:register.emailLabel')}
                  </span>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange("email")}
                      onBlur={handleBlur("email")}
                      placeholder={t('auth:register.emailPlaceholder')}
                      className={`w-full input-height-lg input-padding-base pr-12 border rounded-[10px] text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                        errors.email && touched.email
                          ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                          : isFieldValid("email")
                            ? "border-[#16B257] focus:border-[#16B257] bg-[#E8F0FE] text-[#1E1E1E]"
                            : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                      }`}
                    />
                    {isFieldValid("email") && (
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M10.5 15.25C10.307 15.2352 10.1276 15.1455 9.99998 15L6.99998 12C6.93314 11.86 6.91133 11.7028 6.93756 11.5499C6.96379 11.3971 7.03676 11.2561 7.14643 11.1464C7.2561 11.0368 7.39707 10.9638 7.54993 10.9376C7.70279 10.9113 7.86003 10.9331 7.99998 11L10.47 13.47L19 4.99998C19.1399 4.93314 19.2972 4.91133 19.45 4.93756C19.6029 4.96379 19.7439 5.03676 19.8535 5.14643C19.9632 5.2561 20.0362 5.39707 20.0624 5.54993C20.0886 5.70279 20.0668 5.86003 20 5.99998L11 15C10.8724 15.1455 10.6929 15.2352 10.5 15.25Z"
                            fill="#16B257"
                          />
                          <path
                            d="M12.0001 21.0001C10.3916 20.9975 8.81313 20.5638 7.42903 19.7443C6.04494 18.9247 4.90578 17.7492 4.13011 16.3401C3.5413 15.2897 3.17695 14.1285 3.06011 12.9301C2.87709 11.1721 3.21572 9.39923 4.03375 7.83252C4.85179 6.2658 6.11302 4.97462 7.66011 4.12005C8.71048 3.53124 9.87164 3.16689 11.0701 3.05005C12.2643 2.92271 13.4718 3.03837 14.6201 3.39005C14.7226 3.41052 14.8196 3.45218 14.905 3.51234C14.9905 3.57251 15.0624 3.64986 15.1162 3.73943C15.1699 3.82901 15.2044 3.92883 15.2174 4.03251C15.2303 4.13619 15.2215 4.24143 15.1914 4.34149C15.1613 4.44154 15.1106 4.53421 15.0427 4.61355C14.9747 4.69288 14.8909 4.75714 14.7966 4.8022C14.7023 4.84725 14.5997 4.87212 14.4952 4.87519C14.3908 4.87826 14.2869 4.85948 14.1901 4.82005C13.2188 4.52744 12.1988 4.43224 11.1901 4.54005C10.1929 4.64132 9.22673 4.94411 8.35011 5.43005C7.50524 5.89615 6.75825 6.52091 6.15011 7.27005C5.52397 8.03321 5.0564 8.91364 4.7748 9.85977C4.49319 10.8059 4.4032 11.7987 4.51011 12.7801C4.61138 13.7772 4.91417 14.7434 5.40011 15.6201C5.86621 16.4649 6.49096 17.2119 7.24011 17.8201C8.00327 18.4462 8.8837 18.9138 9.82982 19.1954C10.776 19.477 11.7688 19.567 12.7501 19.4601C13.7473 19.3588 14.7135 19.056 15.5901 18.5701C16.435 18.1039 17.182 17.4792 17.7901 16.7301C18.4162 15.9669 18.8838 15.0865 19.1654 14.1403C19.447 13.1942 19.537 12.2014 19.4301 11.2201C19.4102 11.0119 19.4738 10.8043 19.607 10.643C19.7401 10.4817 19.9319 10.3799 20.1401 10.3601C20.3483 10.3402 20.5559 10.4038 20.7172 10.5369C20.8784 10.6701 20.9802 10.8619 21.0001 11.0701C21.1822 12.829 20.8421 14.6027 20.0222 16.1695C19.2023 17.7363 17.9391 19.0269 16.3901 19.8801C15.3286 20.493 14.1495 20.8746 12.9301 21.0001H12.0001Z"
                            fill="#16B257"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <FormFieldError error={touched.email ? errors.email : ""} />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-field">
                <div className="flex items-center gap-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_74_59886)">
                      <path
                        d="M1.66666 13.3333C1.66666 10.9766 1.66666 9.79742 2.39916 9.06575C3.13082 8.33325 4.30999 8.33325 6.66666 8.33325H13.3333C15.69 8.33325 16.8692 8.33325 17.6008 9.06575C18.3333 9.79742 18.3333 10.9766 18.3333 13.3333C18.3333 15.6899 18.3333 16.8691 17.6008 17.6008C16.8692 18.3333 15.69 18.3333 13.3333 18.3333H6.66666C4.30999 18.3333 3.13082 18.3333 2.39916 17.6008C1.66666 16.8691 1.66666 15.6899 1.66666 13.3333Z"
                        stroke="black"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M5 8.33329V6.66663C5 5.34054 5.52678 4.06877 6.46447 3.13109C7.40215 2.19341 8.67392 1.66663 10 1.66663C11.3261 1.66663 12.5979 2.19341 13.5355 3.13109C14.4732 4.06877 15 5.34054 15 6.66663V8.33329"
                        stroke="black"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6.66666 13.3333H6.67416M9.99249 13.3333H9.99999M13.3258 13.3333H13.3333"
                        stroke="black"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_74_59886">
                        <rect width="20" height="20" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                  <span className="form-label">
                    {t('auth:register.passwordLabel')}
                  </span>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange("password")}
                      onBlur={handleBlur("password")}
                      placeholder={t('auth:register.passwordPlaceholder')}
                      className={`w-full input-height-lg input-padding-base pr-12 border rounded-[10px] text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                        errors.password && touched.password
                          ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                          : isFieldValid("password")
                            ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                            : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M12.5 10C12.5 10.663 12.2366 11.2989 11.7678 11.7678C11.2989 12.2366 10.663 12.5 10 12.5C9.33696 12.5 8.70107 12.2366 8.23223 11.7678C7.76339 11.2989 7.5 10.663 7.5 10C7.5 9.33696 7.76339 8.70107 8.23223 8.23223C8.70107 7.76339 9.33696 7.5 10 7.5C10.663 7.5 11.2989 7.76339 11.7678 8.23223C12.2366 8.70107 12.5 9.33696 12.5 10Z"
                          stroke="#294859"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M1.66669 10.0001C3.00002 6.58591 6.11335 4.16675 10 4.16675C13.8867 4.16675 17 6.58591 18.3334 10.0001C17 13.4142 13.8867 15.8334 10 15.8334C6.11335 15.8334 3.00002 13.4142 1.66669 10.0001Z"
                          stroke="#294859"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={formData.password} />
                  <FormFieldError error={touched.password ? errors.password : ""} />
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="form-field">
                <label className="form-label">
                  {t('auth:register.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleInputChange("confirmPassword")}
                    onBlur={handleBlur("confirmPassword")}
                    placeholder={t('auth:register.confirmPasswordPlaceholder')}
                    className={`w-full input-height-lg input-padding-base pr-12 border rounded-[10px] text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                      errors.confirmPassword && touched.confirmPassword
                        ? "border-[#FF0404] focus:border-[#FF0404] text-[#1E1E1E]"
                        : isFieldValid("confirmPassword")
                          ? "border-[#16B257] focus:border-[#16B257] text-[#1E1E1E]"
                          : "border-[#D7DFE8] focus:border-[#294859] text-[#1E1E1E]"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.5 10C12.5 10.663 12.2366 11.2989 11.7678 11.7678C11.2989 12.2366 10.663 12.5 10 12.5C9.33696 12.5 8.70107 12.2366 8.23223 11.7678C7.76339 11.2989 7.5 10.663 7.5 10C7.5 9.33696 7.76339 8.70107 8.23223 8.23223C8.70107 7.76339 9.33696 7.5 10 7.5C10.663 7.5 11.2989 7.76339 11.7678 8.23223C12.2366 8.70107 12.5 9.33696 12.5 10Z"
                        stroke="#294859"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M1.66669 10.0001C3.00002 6.58591 6.11335 4.16675 10 4.16675C13.8867 4.16675 17 6.58591 18.3334 10.0001C17 13.4142 13.8867 15.8334 10 15.8334C6.11335 15.8334 3.00002 13.4142 1.66669 10.0001Z"
                        stroke="#294859"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <FormFieldError
                  error={touched.confirmPassword ? errors.confirmPassword : ""}
                />
              </div>

              {/* Terms Agreement Checkbox */}
              <div className="flex items-start gap-2">
                <div className="relative mt-1">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="w-5 h-5 border border-[#D7DFE8] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#294859] checked:bg-[#294859] checked:border-[#294859]"
                  />
                </div>
                <label
                  htmlFor="agreeToTerms"
                  className="text-[16px] text-[#485567] cursor-pointer"
                >
                  {t('auth:register.termsAgreement')}
                </label>
              </div>

              {/* Updates Checkbox */}
              <div className="flex items-start gap-2">
                <div className="relative mt-1">
                  <input
                    type="checkbox"
                    id="receiveUpdates"
                    checked={receiveUpdates}
                    onChange={(e) => setReceiveUpdates(e.target.checked)}
                    className="w-5 h-5 border border-[#D7DFE8] rounded bg-white focus:outline-none focus:ring-2 focus:ring-[#294859] checked:bg-[#294859] checked:border-[#294859]"
                  />
                </div>
                <label
                  htmlFor="receiveUpdates"
                  className="text-[16px] text-[#485567] cursor-pointer"
                >
                  {t('auth:register.receiveUpdates')}
                </label>
              </div>

              {/* Data Protection Section */}
              <div className="bg-[#F8FAFC] border border-[#D7DFE8] rounded-[8px] p-6 mt-8">
                <div className="flex items-center gap-4 mb-4">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 22 22"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M11 1.83325L2.75 5.04159V10.9999C2.75 14.2083 5.95833 19.2499 10.0833 20.1666C14.2083 19.2499 17.4167 14.2083 17.4167 10.9999V5.04159L10.0833 1.83325H11Z"
                      stroke="#16B257"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <h3 className="text-[18px] font-bold text-[#1E1E1E]">
                    {t('auth:terms.dataProtectionTitle')}
                  </h3>
                </div>
                <p className="text-[16px] text-[#1E1E1E] leading-normal">
                  {t('auth:terms.dataProtectionText')}
                </p>
              </div>

              {/* Continue Button */}
              <button
                type="submit"
                disabled={isLoading || checkUserExists.isPending || !agreeToTerms}
                className={`w-full btn-height-lg text-white font-bold text-responsive-base rounded-[10px] hover:bg-[#1e3340] transition-colors flex items-center justify-center gap-2 ${
                  isLoading || checkUserExists.isPending || !agreeToTerms ? "bg-gray-400 cursor-not-allowed" : "bg-[#294758]"
                }`}
              >
                {isLoading || checkUserExists.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    {t('common:messages.loading')}
                  </>
                ) : (
                  <>{t('auth:register.registerButton')}</>
                )}
              </button>
            </form>

            {/* OR Divider */}
            <div className="flex items-center gap-[29px] my-5">
              <div className="flex-1 divider"></div>
              <span className="text-responsive-base text-[#485567] font-medium">{t('common:common.or').toUpperCase()}</span>
              <div className="flex-1 divider"></div>
            </div>

            {/* Google Sign Up Button */}
            <div className="flex justify-center mb-5">
              <GoogleLogin
                onSuccess={handleGoogleCredentialResponse}
                onError={() => {
                  console.error('Google OAuth error occurred');
                  setFormError(t('errors:SERVER_ERROR'));
                }}
                theme="filled_blue"
                shape="rectangular"
                text="signup_with"
                locale="en"
              />
            </div>

            {/* Bottom Divider and Sign In Link */}
            <div className="space-y-5">
              <div className="w-full divider"></div>
              <div className="text-center">
                <span className="text-responsive-base text-[#294859]">
                  {t('auth:register.alreadyHaveAccount')}{" "}
                </span>
                <Link
                  to="/"
                  className="text-responsive-base text-[#294859] font-bold hover:underline"
                >
                  {t('auth:login.title')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
