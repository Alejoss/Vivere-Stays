import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiClient } from "../../../shared/api/client";
import { useCurrentUser } from "../../../shared/api/hooks";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import ContactSupportModal from "../../components/onboarding/ContactSupportModal";
import { profilesService } from "../../../shared/api/profiles";
import { toast } from "../../hooks/use-toast";

// Success Overlay Component
const SuccessOverlay = ({ onComplete }: { onComplete: () => void }) => {
  return (
    <div className="absolute inset-0 bg-[#F6F9FD] flex items-center justify-center z-50">
      {/* Logo */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
        <img
          src="/images/logo.png"
          alt="Vivere Stays Logo"
          className="w-60 h-auto"
        />
      </div>

      {/* Success Message Card */}
      <div className="bg-white border border-[#16B257] rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] p-8 text-center max-w-2xl mx-4 relative">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-[78px] h-[78px] bg-[#D7FBE6] rounded-full flex items-center justify-center mx-auto">
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
        </div>

        {/* Success Text */}
        <h1 className="text-[28px] font-bold text-black mb-4">
          Email Verified Successfully!
        </h1>
        <p className="text-[18px] text-[#16B257] mb-6">
          Your email has been verified. You can now proceed to set up your hotel details.
        </p>
        
        {/* Manual Continue Button */}
        <button
          onClick={onComplete}
          className="px-6 py-3 bg-[#16B257] text-white font-medium rounded-[10px] hover:bg-[#14A04A] transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useCurrentUser();
  const [verificationCode, setVerificationCode] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Get email from authenticated user
  const email = user?.email || "";

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => {
        setResendTimer(resendTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleVerifyEmail = async () => {
    setError("");
    if (verificationCode.length === 5) {
      setIsVerifying(true);
      
      try {
        // For authenticated users, only send the code (backend gets email from user object)
        const { data } = await apiClient.post('/profiles/verify-email-code/', {
          code: verificationCode
        });
        
        setIsVerifying(false);
        if (data.verified) {
          setIsVerified(true);
        } else {
          setError(data.error || "Verification failed. Please try again.");
        }
      } catch (error: any) {
        console.error('Verification error:', error);
        
        // Extract error message from API response
        let errorMessage = "Network error. Please try again.";
        if (error?.error) {
          errorMessage = error.error;
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        setError(errorMessage);
        setIsVerifying(false);
      }
    } else {
      setError("Please enter a 5-digit verification code.");
    }
  };

  const handleVerificationComplete = () => {
    // Clear any registration data (user is already authenticated)
    localStorage.removeItem('registerFormData');
    // Redirect to hotel information page
    navigate("/hotel-information");
  };

  const handleResendCode = async () => {
    if (canResend) {
      try {
        // For authenticated users, the backend will get email and first_name from the user object
        // No need to send email and first_name in the request body
        const { data } = await apiClient.post('/profiles/resend-verification-email/', {});
        
        // Success - reset timer
        setResendTimer(60);
        setCanResend(false);
        alert("Verification code resent!");
      } catch (error) {
        console.error('Resend error:', error);
        alert("Failed to resend verification code. Please try again.");
      }
    }
  };

  const handleSupportSubmit = async (message: string) => {
    try {
      await profilesService.sendOnboardingEmailVerificationSupport({
        message,
      });
      
      toast({
        title: "Success",
        description: "Support request sent successfully! Our team will contact you soon.",
      });
    } catch (error: any) {
      console.error("Error sending support request:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to send support request. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Only allow digits
    if (value.length <= 5) {
      setVerificationCode(value);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex items-center justify-center px-4 py-8 relative">
      <OnboardingProgressTracker currentStep="verify_email" />
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="/images/logo.png"
            alt="Vivere Stays Logo"
            className="w-60 h-auto mx-auto"
          />
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] px-8 py-12 relative max-w-2xl mx-auto">
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
                d="M14.0002 11.6666C16.5775 11.6666 18.6668 9.57725 18.6668 6.99992C18.6668 4.42259 16.5775 2.33325 14.0002 2.33325C11.4228 2.33325 9.3335 4.42259 9.3335 6.99992C9.3335 9.57725 11.4228 11.6666 14.0002 11.6666Z"
                stroke="black"
                strokeWidth="1.5"
              />
              <path
                d="M23.3311 20.9998C23.3326 20.8085 23.3334 20.6141 23.3334 20.4165C23.3334 17.5173 19.1544 15.1665 14.0001 15.1665C8.84575 15.1665 4.66675 17.5173 4.66675 20.4165C4.66675 23.3157 4.66675 25.6665 14.0001 25.6665C16.6029 25.6665 18.4801 25.4833 19.8334 25.1567"
                stroke="black"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Header */}
          <div className="text-center mt-16 mb-8">
            <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
              Verify Your Email
            </h1>
            <p className="text-[18px] text-[#485567] leading-normal max-w-md mx-auto">
              We've sent a 5-digit verification code to your email address.
              Please enter it below to continue.
            </p>
          </div>

          <div className="space-y-5 max-w-xl mx-auto">
            {/* Verification Code Input */}
            <div className="space-y-[14px]">
              <label className="text-[16px] text-[#485567] font-medium">
                Verification Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={handleCodeChange}
                  placeholder="Enter 5-digit code"
                  className={`w-full h-[73px] px-8 py-5 border rounded-[8px] bg-[#F8FAFC] text-[30px] text-center placeholder:text-[#9BA9BC] focus:outline-none transition-colors font-mono tracking-widest ${
                    verificationCode.length === 5
                      ? "border-[#485567] text-[#1E1E1E]"
                      : "border-[#D7DFE8] focus:border-[#294859]"
                  }`}
                  style={{
                    fontFamily: "'Courier Prime', 'Courier New', monospace",
                  }}
                  maxLength={5}
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-[10px] p-3 mt-2 flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
                  </svg>
                  <span className="text-[14px] text-[#FF0404] font-medium">{error}</span>
                </div>
              )}
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerifyEmail}
              className={`w-full h-[55px] text-white font-bold text-[16px] rounded-[10px] transition-colors flex items-center justify-center gap-2 ${
                isVerifying
                  ? "bg-[#4B6472] cursor-not-allowed"
                  : verificationCode.length === 5
                    ? "bg-[#294758] hover:bg-[#1e3340]"
                    : "bg-gray-400 cursor-not-allowed"
              }`}
              disabled={verificationCode.length !== 5 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.5 15.25C10.307 15.2352 10.1276 15.1455 9.99998 15L6.99998 12C6.93314 11.86 6.91133 11.7028 6.93756 11.5499C6.96379 11.3971 7.03676 11.2561 7.14643 11.1464C7.2561 11.0368 7.39707 10.9638 7.54993 10.9376C7.70279 10.9113 7.86003 10.9331 7.99998 11L10.47 13.47L19 4.99998C19.1399 4.93314 19.2972 4.91133 19.45 4.93756C19.6029 4.96379 19.7439 5.03676 19.8535 5.14643C19.9632 5.2561 20.0362 5.39707 20.0624 5.54993C20.0886 5.70279 20.0668 5.86003 20 5.99998L11 15C10.8724 15.1455 10.6929 15.2352 10.5 15.25Z"
                      fill="white"
                    />
                    <path
                      d="M12.0001 20.9999C10.3916 20.9973 8.81313 20.5637 7.42903 19.7442C6.04494 18.9246 4.90578 17.7491 4.13011 16.3399C3.5413 15.2896 3.17695 14.1284 3.06011 12.9299C2.87709 11.172 3.21572 9.39911 4.03375 7.83239C4.85179 6.26568 6.11302 4.9745 7.66011 4.11993C8.71048 3.53112 9.87164 3.16677 11.0701 3.04993C12.2643 2.92259 13.4718 3.03825 14.6201 3.38993C14.7226 3.4104 14.8196 3.45205 14.905 3.51222C14.9905 3.57238 15.0624 3.64973 15.1162 3.73931C15.1699 3.82889 15.2044 3.92871 15.2174 4.03239C15.2303 4.13607 15.2215 4.24131 15.1914 4.34136C15.1613 4.44142 15.1106 4.53409 15.0427 4.61343C14.9747 4.69276 14.8909 4.75702 14.7966 4.80208C14.7023 4.84713 14.5997 4.87199 14.4952 4.87507C14.3908 4.87814 14.2869 4.85936 14.1901 4.81993C13.2188 4.52732 12.1988 4.43211 11.1901 4.53993C10.1929 4.6412 9.22673 4.94399 8.35011 5.42993C7.50524 5.89603 6.75825 6.52079 6.15011 7.26993C5.52397 8.03309 5.0564 8.91352 4.7748 9.85965C4.49319 10.8058 4.4032 11.7986 4.51011 12.7799C4.61138 13.7771 4.91417 14.7433 5.40011 15.6199C5.86621 16.4648 6.49096 17.2118 7.24011 17.8199C8.00327 18.4461 8.8837 18.9136 9.82982 19.1952C10.776 19.4768 11.7688 19.5668 12.7501 19.4599C13.7473 19.3587 14.7135 19.0559 15.5901 18.5699C16.435 18.1038 17.182 17.4791 17.7901 16.7299C18.4162 15.9668 18.8838 15.0863 19.1654 14.1402C19.447 13.1941 19.537 12.2013 19.4301 11.2199C19.4102 11.0117 19.4738 10.8042 19.607 10.6429C19.7401 10.4816 19.9319 10.3798 20.1401 10.3599C20.3483 10.34 20.5559 10.4037 20.7172 10.5368C20.8784 10.67 20.9802 10.8617 21.0001 11.0699C21.1822 12.8289 20.8421 14.6025 20.0222 16.1694C19.2023 17.7362 17.9391 19.0268 16.3901 19.8799C15.3286 20.4928 14.1495 20.8745 12.9301 20.9999H12.0001Z"
                      fill="white"
                    />
                  </svg>
                  Verified!
                </>
              ) : (
                <>
                  Verify Email
                  <svg
                    width="21"
                    height="20"
                    viewBox="0 0 21 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.66675 10H16.3334M16.3334 10L11.3334 15M16.3334 10L11.3334 5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </>
              )}
            </button>

            {/* Didn't receive code section */}
            <div className="text-center space-y-5">
              <p className="text-[16px] text-[#294859]">
                Didn't receive the code?
              </p>

              {/* Resend Button */}
              <button
                onClick={handleResendCode}
                disabled={!canResend}
                className={`inline-flex items-center gap-2 px-6 py-3 border border-[#D7DFE8] rounded-[9px] bg-white text-[16px] font-medium transition-colors ${
                  canResend
                    ? "text-[#294859] hover:bg-gray-50 cursor-pointer"
                    : "text-[#9CAABD] cursor-not-allowed"
                }`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.30466 17.5153C6.19536 17.4021 6.13489 17.2505 6.13625 17.0932C6.13762 16.9359 6.20072 16.7854 6.31197 16.6742C6.42321 16.5629 6.5737 16.4998 6.73102 16.4985C6.88833 16.4971 7.0399 16.5576 7.15306 16.6669C8.07608 17.5899 9.25207 18.2184 10.5323 18.4731C11.8126 18.7277 13.1396 18.597 14.3455 18.0975C15.5515 17.598 16.5823 16.7521 17.3075 15.6667C18.0327 14.5814 18.4198 13.3054 18.4199 12.0001C18.4269 11.8457 18.4932 11.7001 18.605 11.5934C18.7168 11.4868 18.8653 11.4273 19.0198 11.4275C19.1743 11.4276 19.3228 11.4874 19.4343 11.5943C19.5459 11.7011 19.6119 11.8469 19.6187 12.0013C19.6186 13.5439 19.1611 15.0519 18.304 16.3345C17.4469 17.6171 16.2287 18.6168 14.8035 19.2071C13.3783 19.7974 11.8101 19.9519 10.2971 19.651C8.78409 19.35 7.3943 18.6072 6.30346 17.5165"
                    fill="#9CAABD"
                  />
                  <path
                    d="M15.7571 14.8992C15.6247 14.9875 15.4626 15.0196 15.3065 14.9884C15.1505 14.9573 15.0132 14.8654 14.9249 14.733C14.8365 14.6006 14.8044 14.4385 14.8356 14.2825C14.8668 14.1264 14.9587 13.9891 15.0911 13.9008L18.6911 11.5008C18.7566 11.457 18.8301 11.4267 18.9074 11.4113C18.9847 11.396 19.0643 11.3961 19.1416 11.4115C19.2189 11.427 19.2923 11.4575 19.3578 11.5013C19.4233 11.5451 19.4795 11.6014 19.5233 11.667C19.567 11.7325 19.5974 11.8061 19.6127 11.8834C19.628 11.9607 19.6279 12.0402 19.6125 12.1175C19.5971 12.1948 19.5666 12.2683 19.5227 12.3337C19.4789 12.3992 19.4226 12.4554 19.3571 12.4992L15.7571 14.8992Z"
                    fill="#9CAABD"
                  />
                  <path
                    d="M21.919 15.2676C21.9654 15.3331 21.9983 15.4072 22.0155 15.4856C22.0328 15.564 22.0341 15.6451 22.0195 15.724C22.0049 15.8029 21.9746 15.8781 21.9303 15.9451C21.8861 16.0121 21.8289 16.0696 21.7621 16.114C21.6953 16.1585 21.6202 16.1892 21.5413 16.2041C21.4625 16.2191 21.3814 16.2181 21.3029 16.2011C21.2245 16.1842 21.1502 16.1517 21.0845 16.1055C21.0189 16.0593 20.9631 16.0005 20.9206 15.9324L18.5206 12.3324C18.4379 12.2 18.4101 12.0406 18.4431 11.888C18.476 11.7355 18.5671 11.6017 18.697 11.5152C18.8269 11.4287 18.9854 11.3962 19.1389 11.4247C19.2924 11.4531 19.4287 11.5403 19.519 11.6676L21.919 15.2676ZM17.2246 6.24599C17.3371 6.35865 17.4003 6.51139 17.4001 6.67061C17.4 6.82983 17.3367 6.98248 17.224 7.09499C17.1682 7.15069 17.102 7.19487 17.0291 7.22499C16.9563 7.2551 16.8782 7.27058 16.7994 7.27052C16.6402 7.27041 16.4875 7.20705 16.375 7.09439C15.4519 6.17133 14.2758 5.54275 12.9954 5.28814C11.7151 5.03354 10.388 5.16434 9.18197 5.66401C7.97595 6.16368 6.9452 7.00977 6.22007 8.09528C5.49494 9.18079 5.10801 10.457 5.1082 11.7624C5.10804 11.9215 5.04468 12.0741 4.93204 12.1865C4.81941 12.2989 4.66673 12.3619 4.5076 12.3618C4.34847 12.3616 4.19592 12.2983 4.08352 12.1856C3.97111 12.073 3.90804 11.9203 3.9082 11.7612C3.90806 10.2183 4.36548 8.71005 5.22262 7.42718C6.07976 6.1443 7.29811 5.14445 8.72357 4.55407C10.149 3.9637 11.7175 3.80933 13.2307 4.11049C14.7439 4.41165 16.1338 5.15482 17.2246 6.24599Z"
                    fill="#9CAABD"
                  />
                  <path
                    d="M7.77113 8.86211C7.83668 8.81838 7.91021 8.78799 7.98751 8.77267C8.06481 8.75736 8.14437 8.75742 8.22165 8.77285C8.29892 8.78828 8.37241 8.81879 8.43789 8.86262C8.50338 8.90645 8.5596 8.96275 8.60333 9.02831C8.64706 9.09386 8.67745 9.16739 8.69276 9.24469C8.70808 9.32199 8.70801 9.40155 8.69258 9.47883C8.67715 9.5561 8.64665 9.62958 8.60281 9.69507C8.55898 9.76056 8.50268 9.81678 8.43713 9.86051L4.83713 12.2605C4.77157 12.3042 4.69804 12.3346 4.62074 12.3499C4.54344 12.3653 4.46388 12.3652 4.38661 12.3498C4.30933 12.3343 4.23585 12.3038 4.17036 12.26C4.10487 12.2162 4.04866 12.1599 4.00493 12.0943C3.9612 12.0287 3.93081 11.9552 3.91549 11.8779C3.90018 11.8006 3.90024 11.7211 3.91567 11.6438C3.93111 11.5665 3.96161 11.493 4.00544 11.4275C4.04927 11.362 4.10557 11.3058 4.17113 11.2621L7.77113 8.86211Z"
                    fill="#9CAABD"
                  />
                  <path
                    d="M1.60909 8.49368C1.56266 8.42819 1.52984 8.35406 1.51257 8.27566C1.49531 8.19727 1.49395 8.1162 1.50859 8.03727C1.52322 7.95834 1.55354 7.88315 1.59775 7.81615C1.64197 7.74915 1.69918 7.69171 1.76599 7.64722C1.83281 7.60273 1.90787 7.57209 1.98674 7.55714C2.06561 7.54218 2.14668 7.5432 2.22515 7.56014C2.30361 7.57708 2.37788 7.60959 2.44356 7.65575C2.50923 7.70191 2.56498 7.76078 2.60749 7.82888L5.00749 11.4289C5.09015 11.5613 5.11796 11.7207 5.08503 11.8732C5.05209 12.0258 4.961 12.1595 4.83108 12.246C4.70116 12.3326 4.54265 12.365 4.38918 12.3366C4.23571 12.3081 4.09937 12.221 4.00909 12.0937L1.60909 8.49368Z"
                    fill="#9CAABD"
                  />
                </svg>
                {canResend ? "Resend Code" : `Resend in ${resendTimer}s`}
              </button>
            </div>

            {/* Support Section */}
            <div className="space-y-5 pt-5">
              <div className="w-full h-[1.5px] bg-[#D7DFE8]"></div>
              <button
                onClick={() => setIsSupportModalOpen(true)}
                className="w-full text-[16px] text-[#294859] hover:underline transition-colors"
              >
                Need help? Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Overlay */}
      {isVerified && <SuccessOverlay onComplete={handleVerificationComplete} />}

      {/* Contact Support Modal */}
      <ContactSupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        userEmail={email}
        propertyId={null}
        onSubmit={handleSupportSubmit}
      />
    </div>
  );
}
