import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { useTranslation } from "react-i18next";
import { useLogin, useGoogleLogin } from "../../shared/api/hooks";
import { OnboardingStep } from "../../shared/api/onboarding";
import { profilesService } from "../../shared/api/profiles";
import { LoginRequest } from "../../shared/api/types";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function Login() {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'errors', 'common']);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  
  const loginMutation = useLogin();
  const googleLoginMutation = useGoogleLogin();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!email.trim()) {
      setError(t('errors:EMAIL_REQUIRED'));
      return;
    }
    
    if (!password.trim()) {
      setError(t('errors:PASSWORD_REQUIRED'));
      return;
    }

    // Use email as username for login
    const loginData: LoginRequest = {
      username: email,
      password: password,
    };

    try {
      const response = await loginMutation.mutateAsync(loginData);
      console.log("Login successful:", response);
      
      // Get user's onboarding progress and redirect to appropriate step
      try {
        console.log('🔍 Login: Fetching onboarding progress...');
        console.log('🔍 Login: Access token available:', !!response.access);
        
        const progressData = await profilesService.getOnboardingProgress();
        console.log('📊 Login: Onboarding progress data:', progressData);
        console.log('📊 Login: Progress data type:', typeof progressData);
        console.log('📊 Login: Progress data keys:', Object.keys(progressData));
        
        // Check if onboarding is completed
        if (progressData.completed) {
          console.log('✅ Login: Onboarding completed, redirecting to dashboard');
          navigate("/dashboard");
          return;
        }
        
        const currentStep = progressData.current_step;
        console.log('📍 Login: Current onboarding step:', currentStep);
        console.log('📍 Login: Current step type:', typeof currentStep);
        
        // For users at register step, redirect to dashboard (same as completed users)
        if (currentStep === 'register' && !progressData.completed) {
          console.log('📝 Login: User at register step, redirecting to dashboard');
          navigate("/dashboard");
          return;
        }
        
        // Validate that the current step is a valid OnboardingStep
        const validSteps = ['register', 'verify_email', 'hotel_information', 'pms_integration', 'select_plan', 'payment', 'add_competitor', 'msp', 'complete'] as const;
        console.log('🔍 Login: Valid steps:', validSteps);
        console.log('🔍 Login: Is current step valid?', validSteps.includes(currentStep as any));
        
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
          console.log('🚀 Login: Navigating to route:', route);
          navigate(route);
          console.log(`✅ Login: Redirecting to onboarding step: ${currentStep}`);
        } else {
          console.warn(`⚠️ Login: Invalid onboarding step: ${currentStep}, defaulting to hotel-information`);
          navigate("/hotel-information");
        }
      } catch (progressError) {
        console.error('❌ Login: Error getting onboarding progress:', progressError);
        console.error('❌ Login: Error details:', {
          message: progressError.message,
          stack: progressError.stack,
          name: progressError.name
        });
        // Fallback to hotel-information if progress check fails
        navigate("/hotel-information");
      }
    } catch (error: any) {
      console.error("Login failed:", error);
      
      // Handle the API error structure
      if (error && typeof error === 'object' && 'error' in error) {
        setError(error.error);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('errors:INVALID_CREDENTIALS'));
      }
    }
  };

  const handleGoogleCredentialResponse = useCallback(async (response: any) => {
    console.log('Google OAuth response received:', response);
    setError("");

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
        console.log('🔍 Google Login: Fetching onboarding progress...');
        console.log('🔍 Google Login: Access token available:', !!data.access);
        
        const progressData = await profilesService.getOnboardingProgress();
        console.log('📊 Google Login: Onboarding progress data:', progressData);
        
        // Check if onboarding is completed
        if (progressData.completed) {
          console.log('✅ Google Login: Onboarding completed, redirecting to dashboard');
          navigate("/dashboard");
          return;
        }
        
        const currentStep = progressData.current_step;
        console.log('📍 Google Login: Current onboarding step:', currentStep);
        
        // For new Google users, redirect to dashboard (same as completed users)
        if (currentStep === 'register' && !progressData.completed) {
          console.log('📝 Google Login: User at register step, redirecting to dashboard');
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
          console.log('🚀 Google Login: Navigating to route:', route);
          navigate(route);
          console.log(`✅ Google Login: Redirecting to onboarding step: ${currentStep}`);
        } else {
          console.warn(`⚠️ Google Login: Invalid onboarding step: ${currentStep}, defaulting to hotel-information`);
          navigate("/hotel-information");
        }
      } catch (progressError) {
        console.error('❌ Google Login: Error getting onboarding progress:', progressError);
        // Fallback to hotel-information if progress check fails
        navigate("/hotel-information");
      }
    } catch (error: any) {
      console.error('Google login failed:', error);
      
      // Handle the API error structure
      if (error && typeof error === 'object' && 'error' in error) {
        setError(error.error);
      } else if (error && typeof error === 'object' && 'response' in error && error.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('errors:SERVER_ERROR'));
      }
    }
  }, [googleLoginMutation, navigate]);

  const handleCreateAccount = () => {
    console.log("Create account clicked");
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      {/* Logo */}
      <div className="text-center mb-10">
        <img
          src="/images/logo.png"
          alt="Vivere Stays Logo"
          className="w-60 h-auto mx-auto"
        />
      </div>

      <div className="w-full max-w-md lg:max-w-lg">
        <div className="bg-white rounded-[20px] px-16 py-14 shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
              {t('auth:login.title')}
            </h1>
            <p className="text-[18px] text-[#485567] leading-normal">
              {t('auth:login.subtitle')}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-4">
                <div className="flex items-center gap-2">
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
                  <span className="text-[14px] text-[#FF0404] font-medium">{error}</span>
                </div>
              </div>
            )}
            {/* Email Field */}
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
                    d="M15.4062 13.9286H1.59375C0.711875 13.9286 0 13.2107 0 12.3214V2.67858C0 1.7893 0.711875 1.07144 1.59375 1.07144H15.4062C16.2881 1.07144 17 1.7893 17 2.67858V12.3214C17 13.2107 16.2881 13.9286 15.4062 13.9286ZM1.59375 2.14287C1.29625 2.14287 1.0625 2.37858 1.0625 2.67858V12.3214C1.0625 12.6214 1.29625 12.8572 1.59375 12.8572H15.4062C15.7037 12.8572 15.9375 12.6214 15.9375 12.3214V2.67858C15.9375 2.37858 15.7037 2.14287 15.4062 2.14287H1.59375Z"
                    fill="black"
                  />
                  <path
                    d="M8.50001 9.6C7.75626 9.6 7.07626 9.3 6.56626 8.75357L0.988135 2.775C0.78626 2.56071 0.796885 2.21786 1.00939 2.01429C1.22189 1.81071 1.56188 1.82143 1.76376 2.03571L7.34188 8.01429C7.94751 8.66786 9.05251 8.66786 9.65813 8.01429L15.2363 2.04643C15.4381 1.83214 15.7781 1.82143 15.9906 2.025C16.2031 2.22857 16.2138 2.57143 16.0119 2.78571L10.4338 8.76429C9.92376 9.31072 9.24376 9.61071 8.50001 9.61071V9.6Z"
                    fill="black"
                  />
                </svg>
                <span className="text-[16px] text-[#485567] font-medium">
                  {t('auth:login.emailLabel')}
                </span>
              </div>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth:login.emailPlaceholder')}
                  disabled={loginMutation.isPending}
                  className="w-full h-[60px] px-4 py-[17px] border border-[#D7DFE8] rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-[14px]">
              <div className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_74_59926)">
                    <path
                      d="M1.66666 13.3333C1.66666 10.9766 1.66666 9.79748 2.39916 9.06581C3.13082 8.33331 4.30999 8.33331 6.66666 8.33331H13.3333C15.69 8.33331 16.8692 8.33331 17.6008 9.06581C18.3333 9.79748 18.3333 10.9766 18.3333 13.3333C18.3333 15.69 18.3333 16.8691 17.6008 17.6008C16.8692 18.3333 15.69 18.3333 13.3333 18.3333H6.66666C4.30999 18.3333 3.13082 18.3333 2.39916 17.6008C1.66666 16.8691 1.66666 15.69 1.66666 13.3333Z"
                      stroke="black"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M5 8.33332V6.66666C5 5.34057 5.52678 4.0688 6.46447 3.13112C7.40215 2.19344 8.67392 1.66666 10 1.66666C11.3261 1.66666 12.5979 2.19344 13.5355 3.13112C14.4732 4.0688 15 5.34057 15 6.66666V8.33332"
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
                    <clipPath id="clip0_74_59926">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <span className="text-[16px] text-[#485567] font-medium">
                  {t('auth:login.passwordLabel')}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth:login.passwordPlaceholder')}
                  disabled={loginMutation.isPending}
                  className="w-full h-[60px] px-4 py-[17px] pr-12 border border-[#D7DFE8] rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loginMutation.isPending}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      d="M1.66669 9.99999C3.00002 6.58582 6.11335 4.16666 10 4.16666C13.8867 4.16666 17 6.58582 18.3334 9.99999C17 13.4142 13.8867 15.8333 10 15.8333C6.11335 15.8333 3.00002 13.4142 1.66669 9.99999Z"
                      stroke="#294859"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  className="text-[16px] font-bold text-[#294859] hover:underline"
                >
                  {t('auth:login.forgotPassword')}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className={`w-full h-[55px] text-white font-bold text-[16px] rounded-[10px] shadow-[0_4px_11px_0_rgba(0,0,0,0.25)] transition-colors flex items-center justify-center gap-2 ${
                loginMutation.isPending 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#294758] hover:bg-[#1e3340]'
              }`}
            >
              {loginMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('common:messages.loading')}
                </>
              ) : (
                <>
                  {t('auth:login.loginButton')}
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
          </form>

          {/* OR Divider */}
          <div className="flex items-center gap-[29px] my-5">
            <div className="flex-1 h-[1.5px] bg-[#D7DFE8]"></div>
            <span className="text-[16px] text-[#485567] font-medium">{t('common:common.or').toUpperCase()}</span>
            <div className="flex-1 h-[1.5px] bg-[#D7DFE8]"></div>
          </div>

          {/* Google Sign Up Button */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleCredentialResponse}
              onError={() => {
                console.error('Google OAuth error occurred');
                setError(t('errors:SERVER_ERROR'));
              }}
              theme="filled_blue"
              shape="rectangular"
              text="continue_with"
              locale="en"
            />
          </div>

          {/* Create Account Section */}
          <div className="mt-5 space-y-5 text-center">
            <p className="text-[16px] text-[#294859]">
              {t('auth:login.noAccount')}
            </p>
            <Link to="/register">
              <button className="w-full h-[54px] border-[1.7px] border-[#D7DFE8] rounded-[10px] text-[16px] text-[#294859] font-medium hover:border-[#294859] transition-colors">
                {t('auth:register.title')}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
