import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useRequestPasswordReset } from "../../shared/api/hooks";
import OnboardingHeaderControls from "../components/onboarding/OnboardingHeaderControls";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'errors', 'common']);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const requestPasswordResetMutation = useRequestPasswordReset();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!email.trim()) {
      setError(t('errors:EMAIL_REQUIRED'));
      return;
    }

    try {
      await requestPasswordResetMutation.mutateAsync(email);
      setIsSuccess(true);
    } catch (error: any) {
      console.error("Password reset request failed:", error);
      
      // Handle the API error structure
      if (error && typeof error === 'object' && 'error' in error) {
        setError(error.error);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('errors:SERVER_ERROR'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8">
      <OnboardingHeaderControls />
      
      {/* Logo */}
      <div className="text-center mb-10">
        <img
          src="/images/logo_transparent.png"
          alt="Vivere Stays Logo"
          className="w-[480px] h-auto mx-auto"
        />
      </div>

      <div className="w-full max-w-md lg:max-w-lg">
        <div className="bg-white rounded-[20px] px-16 py-14 shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full">
          {!isSuccess ? (
            <>
              {/* Header */}
              <div className="text-center mb-12">
                <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
                  {t('auth:forgotPassword.title')}
                </h1>
                <p className="text-[18px] text-[#485567] leading-normal">
                  {t('auth:forgotPassword.subtitle')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      {t('auth:forgotPassword.emailLabel')}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth:forgotPassword.emailPlaceholder')}
                      disabled={requestPasswordResetMutation.isPending}
                      className="w-full h-[60px] px-4 py-[17px] border border-[#D7DFE8] rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={requestPasswordResetMutation.isPending}
                  className={`w-full h-[55px] text-white font-bold text-[16px] rounded-[10px] shadow-[0_4px_11px_0_rgba(0,0,0,0.25)] transition-colors flex items-center justify-center gap-2 ${
                    requestPasswordResetMutation.isPending 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#294758] hover:bg-[#1e3340]'
                  }`}
                >
                  {requestPasswordResetMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {t('common:messages.loading')}
                    </>
                  ) : (
                    <>
                      {t('auth:forgotPassword.submitButton')}
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

              {/* Back to Login */}
              <div className="mt-5 text-center">
                <Link to="/login" className="text-[16px] text-[#294859] font-medium hover:underline">
                  {t('auth:forgotPassword.backToLogin')}
                </Link>
              </div>
            </>
          ) : (
            /* Success Message */
            <div className="text-center">
              <div className="mb-8">
                <div className="w-[78px] h-[78px] bg-[#D7FBE6] rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    width="39"
                    height="39"
                    viewBox="0 0 39 39"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M17.4847 23.5C17.2425 23.4821 17.0173 23.3734 16.8572 23.1973L13.0919 19.5647C13.008 19.3952 12.9806 19.2048 13.0135 19.0197C13.0464 18.8346 13.1381 18.664 13.2757 18.5311C13.4133 18.3983 13.5903 18.31 13.7821 18.2782C13.974 18.2465 14.1713 18.2729 14.347 18.3538L17.447 21.3446L28.153 11.0886C28.3287 11.0078 28.526 10.9813 28.7178 11.0131C28.9097 11.0448 29.0866 11.1332 29.2242 11.266C29.3618 11.3988 29.4535 11.5695 29.4864 11.7546C29.5193 11.9396 29.4919 12.13 29.408 12.2995L18.112 23.1973C17.9519 23.3734 17.7267 23.4821 17.4847 23.5Z"
                      fill="#16B257"
                    />
                  </svg>
                </div>
                <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
                  {t('auth:forgotPassword.successTitle')}
                </h1>
                <p className="text-[18px] text-[#485567] leading-normal mb-8">
                  {t('auth:forgotPassword.successMessage')}
                </p>
              </div>
              
              <Link to="/login">
                <button className="w-full h-[55px] bg-[#294758] text-white font-bold text-[16px] rounded-[10px] shadow-[0_4px_11px_0_rgba(0,0,0,0.25)] hover:bg-[#1e3340] transition-colors">
                  {t('auth:forgotPassword.backToLogin')}
                </button>
              </Link>
            </div>
          )}

          {/* Create Account Section */}
          {!isSuccess && (
            <div className="mt-5 space-y-5 text-center">
              <p className="text-[16px] text-[#294859]">
                {t('auth:forgotPassword.noAccount')}
              </p>
              <Link to="/register">
                <button className="w-full h-[54px] border-[1.7px] border-[#D7DFE8] rounded-[10px] text-[16px] text-[#294859] font-medium hover:border-[#294859] transition-colors">
                  {t('auth:register.title')}
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

