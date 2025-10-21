import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProfile } from "../../../shared/api/hooks";
import { getLocalStorageItem } from "../../../shared/localStorage";
import { profilesService } from "../../../shared/api/profiles";
import { toast } from "../../hooks/use-toast";
import LanguageSwitcher from "../../components/LanguageSwitcher";

export default function ContactSalesOnboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common']);
  const [userEmail, setUserEmail] = useState<string>("");
  const [pmsSelectionType, setPmsSelectionType] = useState<string | null>(null);
  const [customPmsName, setCustomPmsName] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  
  // Fetch user profile to get email
  const { data: profile, isLoading: profileLoading } = useProfile();

  // Set user email when profile loads
  useEffect(() => {
    if (profile?.user?.email) {
      setUserEmail(profile.user.email);
    }
    console.log("Profile data:", profile); // Debug log
  }, [profile]);

  // Load PMS selection data and property ID from localStorage
  useEffect(() => {
    try {
      const pmsType = getLocalStorageItem<string>('pmsSelectionType');
      if (pmsType) {
        setPmsSelectionType(pmsType);
      }

      // Get custom PMS name from localStorage
      const customPms = getLocalStorageItem<string>('customPmsName');
      if (customPms) {
        setCustomPmsName(customPms);
      }

      // Get property ID from localStorage
      const storedPropertyId = getLocalStorageItem<string>('selectedPropertyId');
      if (storedPropertyId) {
        setPropertyId(storedPropertyId);
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
  }, []);

  const handleBack = () => {
    navigate("/select-plan");
  };

  const handleContactSales = () => {
    // Navigate directly to Add Competitor
    navigate("/add-competitor");
  };

  // Automatically send contact sales email when component mounts
  useEffect(() => {
    const sendContactSalesEmail = async () => {
      // Only send if we have user email and haven't sent already
      if (userEmail && !emailSent && !isSendingEmail) {
        setIsSendingEmail(true);
        
        try {
          await profilesService.sendOnboardingContactSales({
            message: `User has reached the contact sales page during onboarding. Our sales team will get in touch within 24 hours.`,
            property_id: propertyId || undefined,
          });
          
          setEmailSent(true);
          console.log("Contact sales email sent automatically");
        } catch (error: any) {
          console.error("Error sending automatic sales request:", error);
          // Don't show error toast for automatic sending to avoid disrupting UX
        } finally {
          setIsSendingEmail(false);
        }
      }
    };

    sendContactSalesEmail();
  }, [userEmail, emailSent, isSendingEmail, propertyId]);

  // Show loading state while fetching profile or sending email
  if (profileLoading || isSendingEmail) {
    return (
      <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center justify-center px-4 py-8 w-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
          <p className="text-[16px] text-[#485567]">
            {profileLoading ? t('common:messages.loading') : t('onboarding:contactSales.notifying')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8 w-full">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      
      {/* Logo */}
      <div className="mb-8">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="w-[240px] h-[121px]"
        />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full max-w-[603px] px-[68px] py-[30px]">
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
        <div className="text-center mb-8">
          <h1 className="text-[34px] font-bold text-[#1E1E1E] mb-2">{t('onboarding:contactSales.title')}</h1>
          <p className="text-[18px] text-[#485567] mb-4">
            {t('onboarding:contactSales.subtitle')}
          </p>
          
          {/* User Email Display */}
          {userEmail ? (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4 mb-4">
              <p className="text-[14px] text-[#64748B]">
                <span className="font-medium">{t('auth:register.emailLabel')}</span> {userEmail}
              </p>
            </div>
          ) : (
            <div className="bg-[#FFF9F1] border border-[#C2410C] rounded-lg p-4 mb-4">
              <p className="text-[14px] text-[#C2410C]">
                <span className="font-medium">{t('onboarding:contactSales.note')}</span> {t('onboarding:contactSales.emailNotFound')}
              </p>
            </div>
          )}
        </div>

        {/* Information Box */}
        <div className="bg-[#F0F9FF] border border-[#0EA5E9] rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 bg-[#0EA5E9] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z"
                  fill="white"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-[16px] font-semibold text-[#0C4A6E] mb-2">
                {t('onboarding:contactSales.teamNotifiedTitle')}
              </h3>
              <p className="text-[14px] text-[#0C4A6E] leading-relaxed">
                {customPmsName 
                  ? t('onboarding:contactSales.messageWithCustom', { pmsName: customPmsName })
                  : t('onboarding:contactSales.messageGeneral')
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-[13px]">
          <div className="flex justify-center items-center gap-[13px]">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-[70px] py-[18px] border border-[#D9D9D9] bg-white rounded-[10px] text-[16px] font-bold text-[#294758] hover:bg-gray-50 transition-colors"
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
              onClick={handleContactSales}
              className="flex items-center gap-2 px-[36px] py-[18px] rounded-[10px] text-[16px] font-bold transition-colors bg-[#294758] text-white hover:bg-[#234149]"
            >
              {t('onboarding:contactSales.continueButton')}
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
      </div>
    </div>
  );
}
