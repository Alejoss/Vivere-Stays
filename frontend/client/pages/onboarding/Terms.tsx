import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../../../shared/api/hooks";
import { getLocalStorageItem } from "../../../shared/localStorage";

export default function Terms() {
  const navigate = useNavigate();
  const [agreeToTerms, setAgreeToTerms] = useState(true);
  const [receiveUpdates, setReceiveUpdates] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const registerMutation = useRegister();

  const handleCreateAccount = async () => {
    if (!agreeToTerms) {
      alert(
        "Please agree to the Terms of Service and Privacy Policy to continue."
      );
      return;
    }
    setError("");
    setIsLoading(true);
    try {
      // Get form data from localStorage
      const savedFormData = getLocalStorageItem('registerFormData');
      if (!savedFormData) {
        setError("Registration data not found. Please go back and try again.");
        return;
      }

      const formData = savedFormData;
      
      // Create user account with backend
      const registrationData = {
        username: formData.email, // Using email as username
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        receive_updates: receiveUpdates, // Include email preferences
      };
      
      await registerMutation.mutateAsync(registrationData);
      
      // Clear registration data from localStorage after successful registration
      localStorage.removeItem('registerFormData');
      
      navigate("/verify-email");
    } catch (err: any) {
      console.error("Registration error:", err);
      
      // Handle the API error structure
      if (err && typeof err === 'object' && 'error' in err) {
        setError(err.error);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/register");
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
              Step 2 of 2
            </span>
            <span className="text-[16px] text-black font-normal">
              100% Complete
            </span>
          </div>

          {/* Progress Bar - 100% filled */}
          <div className="w-full h-[10px] bg-[#E2E8F0] rounded-[6px] mb-10 relative">
            <div className="w-full h-full bg-gradient-to-r from-[#285A6E] to-[#03CBF5] rounded-[6px]"></div>
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
                  d="M14 11.6666C16.5774 11.6666 18.6667 9.57725 18.6667 6.99992C18.6667 4.42259 16.5774 2.33325 14 2.33325C11.4227 2.33325 9.33337 4.42259 9.33337 6.99992C9.33337 9.57725 11.4227 11.6666 14 11.6666Z"
                  stroke="black"
                  strokeWidth="1.5"
                />
                <path
                  d="M23.331 20.9998C23.3326 20.8085 23.3334 20.6141 23.3334 20.4165C23.3334 17.5173 19.1544 15.1665 14 15.1665C8.84569 15.1665 4.66669 17.5173 4.66669 20.4165C4.66669 23.3157 4.66669 25.6665 14 25.6665C16.6029 25.6665 18.48 25.4833 19.8334 25.1567"
                  stroke="black"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Header */}
            <div className="text-center mt-16 mb-12">
              <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-3">
                Terms & Preferences
              </h1>
              <p className="text-[18px] text-[#485567]">
                Review and accept our terms
              </p>
            </div>

            <div className="space-y-5">
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
                  I agree to the{" "}
                  <span className="font-bold">Terms of Service</span> and{" "}
                  <span className="font-bold">Privacy Policy</span>
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
                  className="text-[13px] text-[#485567] cursor-pointer"
                >
                  I'd like to receive product updates, industry insights, and
                  special offers via email
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
                    Your Data is Protected
                  </h3>
                </div>
                <p className="text-[16px] text-[#1E1E1E] leading-normal">
                  We use enterprise-grade encryption to protect your
                  information. Your data will never be shared with third parties
                  without your explicit consent.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={handleBack}
                  className="flex-1 h-[55px] bg-white border border-[#D9D9D9] text-[#294758] font-bold text-[16px] rounded-[10px] hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
                  onClick={handleCreateAccount}
                  className={`flex-1 h-[55px] text-white font-bold text-[16px] rounded-[10px] transition-colors flex items-center justify-center gap-2 ${
                    agreeToTerms
                      ? isLoading
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#294758] hover:bg-[#1e3340]"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!agreeToTerms || isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Continuing...
                    </>
                  ) : (
                    <>Create Account</>
                  )}
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
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 mt-2">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
                  </svg>
                  <span className="text-[14px] text-[#FF0404] font-medium">{error}</span>
                </div>
              </div>
            )}
            {/* Bottom Sign In Link */}
            <div className="mt-8 pt-5 border-t border-[#D7DFE8]">
              <div className="text-center">
                <span className="text-[16px] text-[#294859]">
                  Already have an account?{" "}
                </span>
                <Link
                  to="/"
                  className="text-[16px] text-[#294859] font-bold hover:underline"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
