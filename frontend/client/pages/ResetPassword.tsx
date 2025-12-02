import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useResetPassword } from "../../shared/api/hooks";
import OnboardingHeaderControls from "../components/onboarding/OnboardingHeaderControls";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation(['auth', 'errors', 'common']);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  
  const resetPasswordMutation = useResetPassword();

  // Extract uid and token from URL
  const uid = searchParams.get('uid');
  const token = searchParams.get('token');

  useEffect(() => {
    // Check if uid and token are present
    if (!uid || !token) {
      setError(t('auth:resetPassword.invalidToken'));
    }
  }, [uid, token, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!uid || !token) {
      setError(t('auth:resetPassword.invalidToken'));
      return;
    }
    
    // Basic validation
    if (!newPassword.trim()) {
      setError(t('errors:PASSWORD_REQUIRED'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('auth:resetPassword.passwordMismatch'));
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({
        uid,
        token,
        newPassword,
      });
      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error: any) {
      console.error("Password reset failed:", error);
      
      // Handle the API error structure
      if (error && typeof error === 'object' && 'error' in error) {
        setError(error.error);
      } else if (error?.response?.data?.error) {
        setError(error.response.data.error);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t('errors:SERVER_ERROR'));
      }
    }
  };

  if (!uid || !token) {
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
            <div className="text-center">
              <div className="mb-8">
                <div className="w-[78px] h-[78px] bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg
                    width="39"
                    height="39"
                    viewBox="0 0 39 39"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.5 10.9747C20.1164 10.9747 20.214 10.9353 20.2927 10.8567C20.3709 10.778 20.41 10.6804 20.41 10.564C20.41 10.448 20.3707 10.3507 20.292 10.272C20.2133 10.1933 20.116 10.1538 20 10.1533C19.884 10.1529 19.7867 10.1922 19.708 10.2713C19.6293 10.3504 19.59 10.4478 19.59 10.5633C19.59 10.6789 19.6293 10.7764 19.708 10.856C19.7867 10.9356 19.884 10.9756 20 10.9747ZM19.6667 8.76867H20.3333V4.76867H19.6667V8.76867Z"
                      fill="#FF0404"
                    />
                  </svg>
                </div>
                <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
                  {t('auth:resetPassword.invalidToken')}
                </h1>
                <p className="text-[18px] text-[#485567] leading-normal mb-8">
                  Please request a new password reset link.
                </p>
              </div>
              
              <Link to="/forgot-password">
                <button className="w-full h-[55px] bg-[#294758] text-white font-bold text-[16px] rounded-[10px] shadow-[0_4px_11px_0_rgba(0,0,0,0.25)] hover:bg-[#1e3340] transition-colors">
                  Request New Reset Link
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                  {t('auth:resetPassword.title')}
                </h1>
                <p className="text-[18px] text-[#485567] leading-normal">
                  {t('auth:resetPassword.subtitle')}
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

                {/* New Password Field */}
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
                      {t('auth:resetPassword.newPasswordLabel')}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('auth:resetPassword.newPasswordPlaceholder')}
                      disabled={resetPasswordMutation.isPending}
                      className="w-full h-[60px] px-4 py-[17px] pr-12 border border-[#D7DFE8] rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={resetPasswordMutation.isPending}
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
                </div>

                {/* Confirm Password Field */}
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
                      {t('auth:resetPassword.confirmPasswordLabel')}
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('auth:resetPassword.confirmPasswordPlaceholder')}
                      disabled={resetPasswordMutation.isPending}
                      className="w-full h-[60px] px-4 py-[17px] pr-12 border border-[#D7DFE8] rounded-[10px] text-[16px] placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={resetPasswordMutation.isPending}
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
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className={`w-full h-[55px] text-white font-bold text-[16px] rounded-[10px] shadow-[0_4px_11px_0_rgba(0,0,0,0.25)] transition-colors flex items-center justify-center gap-2 ${
                    resetPasswordMutation.isPending 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#294758] hover:bg-[#1e3340]'
                  }`}
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      {t('common:messages.loading')}
                    </>
                  ) : (
                    <>
                      {t('auth:resetPassword.resetButton')}
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
                  {t('auth:resetPassword.backToLogin')}
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
                  {t('auth:resetPassword.successTitle')}
                </h1>
                <p className="text-[18px] text-[#485567] leading-normal mb-8">
                  {t('auth:resetPassword.successMessage')}
                </p>
              </div>
              
              <Link to="/login">
                <button className="w-full h-[55px] bg-[#294758] text-white font-bold text-[16px] rounded-[10px] shadow-[0_4px_11px_0_rgba(0,0,0,0.25)] hover:bg-[#1e3340] transition-colors">
                  {t('auth:resetPassword.backToLogin')}
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

