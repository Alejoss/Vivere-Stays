
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import { getHotelInformationData, setHotelInformationData, HotelInformationData } from '../../../shared/localStorage';
import "../../styles/responsive-utilities.css";

interface FormData {
  hotelName: string;
  bookingUrl: string;
  streetAddress: string;
  city: string;
  country: string;
  postalCode: string;
  phoneNumber: string;
  website: string;
  cif: string;
  numberOfRooms: string;
  propertyType: string;
}

interface FormErrors {
  hotelName?: string;
  bookingUrl?: string;
  streetAddress?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  numberOfRooms?: string;
  propertyType?: string;
}

// List of countries with their codes
const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MK", name: "North Macedonia" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

// Helper function to get country name from country code
const getCountryName = (countryCode: string): string => {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
};

export default function HotelInformationOnboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common', 'errors']);
  
  // Add authentication check on component mount
  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    
    if (token) {
      try {
        // Decode token to check expiration
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const isExpired = payload.exp < currentTime;
        
        if (isExpired) {
          console.warn('Token is expired!');
        }
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);
  
  // Load saved form data from localStorage on component mount
  const [formData, setFormData] = useState<FormData>(() => {
    const savedData = getHotelInformationData();
    if (savedData) {
      // Handle backward compatibility: if country is a full name, convert to code
      let countryCode = savedData.country;
      if (countryCode && countryCode.length > 2) {
        // It's likely a country name, try to find the code
        const country = COUNTRIES.find(c => c.name.toLowerCase() === countryCode.toLowerCase());
        if (country) {
          countryCode = country.code;
        }
      }
      
      return {
        ...savedData,
        country: countryCode || "",
      };
    }
    return {
      hotelName: "",
      bookingUrl: "",
      streetAddress: "",
      city: "",
      country: "",
      postalCode: "",
      phoneNumber: "",
      website: "",
      cif: "",
      numberOfRooms: "",
      propertyType: "",
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [formError, setFormError] = useState("");


  // Save form data to localStorage
  const saveFormData = (data: FormData) => {
    setHotelInformationData(data);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.hotelName.trim()) {
      newErrors.hotelName = t('errors:PROPERTY_NAME_REQUIRED');
    }

    // Validate booking URL if provided
    if (formData.bookingUrl.trim() && !formData.bookingUrl.toLowerCase().includes("booking.com")) {
      newErrors.bookingUrl = t('onboarding:hotelInformation.bookingUrlInvalid');
    }

    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = t('errors:PROPERTY_ADDRESS_REQUIRED');
    }

    if (!formData.city.trim()) {
      newErrors.city = t('errors:PROPERTY_CITY_REQUIRED');
    }

    if (!formData.country.trim()) {
      newErrors.country = t('errors:PROPERTY_COUNTRY_REQUIRED');
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = t('errors:PROPERTY_POSTAL_CODE_REQUIRED');
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = t('errors:PROPERTY_PHONE_REQUIRED');
    }

    if (!formData.propertyType.trim()) {
      newErrors.propertyType = t('errors:PROPERTY_TYPE_REQUIRED');
    }

    if (!formData.numberOfRooms.trim()) {
      newErrors.numberOfRooms = t('errors:PROPERTY_ROOMS_REQUIRED');
    } else if (isNaN(Number(formData.numberOfRooms)) || Number(formData.numberOfRooms) <= 0) {
      newErrors.numberOfRooms = t('errors:PROPERTY_ROOMS_INVALID');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Save to localStorage on every change
    saveFormData(newFormData);

    // Clear error when user starts typing
    if (errors[field as keyof FormErrors] && hasSubmitted) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

  };

  const handleContinue = async () => {
    setHasSubmitted(true);
    if (validateForm()) {
      setFormError("");
      
      // The form data is already saved in hotelInformationData via the form persistence
      // No need to create a duplicate hotelDataForPMS entry
      
      console.log("Hotel data already saved to localStorage via form persistence");
      
      // Navigate to PMS Integration
      navigate("/pms-integration");
    }
  };



  const getFieldBorderColor = (field: keyof FormErrors) => {
    if (hasSubmitted && errors[field]) {
      return "border-[#FF0404]";
    }
    if (hasSubmitted && formData[field] && !errors[field]) {
      return "border-[#16B257]";
    }
    return "border-[#D7DFE8]";
  };

  const getFieldTextColor = (field: keyof FormData) => {
    // Always return black text for better UX - inputs should look active
    return "text-[#1E1E1E]";
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] py-8 px-4">
      <OnboardingProgressTracker currentStep="hotel_information" />
      <div className="max-w-4xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/images/logo.png"
            alt="Vivere Stays Logo"
            className="w-60 h-auto mx-auto"
          />
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-4xl mb-8">
          <div className="flex items-center justify-center gap-[14px]">
            {/* Account - Completed */}
            <div className="flex items-center gap-[14px]">
              <div className="flex items-center gap-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 15.25C10.807 15.2352 10.6276 15.1455 10.5 15L7.49998 12C7.43314 11.86 7.41133 11.7028 7.43756 11.5499C7.46379 11.3971 7.53676 11.2561 7.64643 11.1464C7.7561 11.0368 7.89707 10.9638 8.04993 10.9376C8.20279 10.9113 8.36003 10.9331 8.49998 11L10.97 13.47L19.5 4.99998C19.6399 4.93314 19.7972 4.91133 19.95 4.93756C20.1029 4.96379 20.2439 5.03676 20.3535 5.14643C20.4632 5.2561 20.5362 5.39707 20.5624 5.54993C20.5886 5.70279 20.5668 5.86003 20.5 5.99998L11.5 15C11.3724 15.1455 11.1929 15.2352 11 15.25Z"
                    fill="#16B257"
                  />
                  <path
                    d="M12.5 20.9999C10.8915 20.9973 9.313 20.5637 7.92891 19.7442C6.54481 18.9246 5.40566 17.7491 4.62999 16.3399C4.04118 15.2896 3.67682 14.1284 3.55999 12.9299C3.37697 11.172 3.7156 9.39911 4.53363 7.83239C5.35167 6.26568 6.6129 4.9745 8.15999 4.11993C9.21036 3.53112 10.3715 3.16677 11.57 3.04993C12.7641 2.92259 13.9717 3.03825 15.12 3.38993C15.2224 3.4104 15.3195 3.45205 15.4049 3.51222C15.4903 3.57238 15.5622 3.64973 15.616 3.73931C15.6698 3.82889 15.7043 3.92871 15.7173 4.03239C15.7302 4.13607 15.7214 4.24131 15.6913 4.34136C15.6612 4.44142 15.6105 4.53409 15.5425 4.61343C15.4745 4.69276 15.3907 4.75702 15.2965 4.80208C15.2022 4.84713 15.0995 4.87199 14.9951 4.87507C14.8907 4.87814 14.7867 4.85936 14.69 4.81993C13.7187 4.52732 12.6987 4.43211 11.69 4.53993C10.6928 4.6412 9.72661 4.94399 8.84999 5.42993C8.00512 5.89603 7.25813 6.52079 6.64999 7.26993C6.02385 8.03309 5.55628 8.91352 5.27467 9.85965C4.99307 10.8058 4.90308 11.7986 5.00999 12.7799C5.11126 13.7771 5.41405 14.7433 5.89999 15.6199C6.36609 16.4648 6.99084 17.2118 7.73999 17.8199C8.50315 18.4461 9.38357 18.9136 10.3297 19.1952C11.2758 19.4768 12.2686 19.5668 13.25 19.4599C14.2472 19.3587 15.2134 19.0559 16.09 18.5699C16.9349 18.1038 17.6818 17.4791 18.29 16.7299C18.9161 15.9668 19.3837 15.0863 19.6653 14.1402C19.9469 13.1941 20.0369 12.2013 19.93 11.2199C19.9101 11.0117 19.9737 10.8042 20.1069 10.6429C20.24 10.4816 20.4318 10.3798 20.64 10.3599C20.8482 10.34 21.0558 10.4037 21.217 10.5368C21.3783 10.67 21.4801 10.8617 21.5 11.0699C21.6821 12.8289 21.342 14.6025 20.5221 16.1694C19.7022 17.7362 18.4389 19.0268 16.89 19.8799C15.8284 20.4928 14.1493 20.8745 12.93 20.9999H12.5Z"
                    fill="#16B257"
                  />
                </svg>
                <span className="text-responsive-lg text-[#16B257] font-medium">
                  Account
                </span>
              </div>
              <div className="w-[31px] h-[2px] bg-[#294859]"></div>
            </div>

            {/* Hotel Details - Current */}
            <div className="flex items-center gap-[14px]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-[1.67px] border-[#294859] rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-[#294859] rounded-full"></div>
                </div>
                <span className="text-responsive-lg text-[#294859] font-medium">
                  Hotel Details
                </span>
              </div>
              <div className="w-[31px] h-[2px] bg-[#294859]"></div>
            </div>

            {/* Remaining steps - Inactive */}
            {[
              "PMS Integration",
              "Select Plan",
              "Payment",
              "Add Competitor",
              "MSP",
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-[14px]">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border border-[#9CAABD] rounded-full"></div>
                  <span className="text-responsive-lg text-[#9CAABD] font-medium">
                    {step}
                  </span>
                </div>
                {index < 4 && (
                  <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] container-padding-base w-full max-w-3xl relative">
          {/* Hotel Icon */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-14 h-14 bg-gradient-to-r from-[#D7E4EB] to-[#CEF4FC] border-[0.5px] border-[#9CAABD] rounded-[10px] flex items-center justify-center">
            <svg
              width="30"
              height="30"
              viewBox="0 0 30 30"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12.5 27.5V19.2875M15 13.75H15.0125M15 8.75H15.0125M17.5 19.2875V27.5M18.75 20C17.6681 19.1886 16.3523 18.75 15 18.75C13.6477 18.75 12.3319 19.1886 11.25 20M20 13.75H20.0125M20 8.75H20.0125M10 13.75H10.0125M10 8.75H10.0125"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22.5 2.5H7.5C6.11929 2.5 5 3.61929 5 5V25C5 26.3807 6.11929 27.5 7.5 27.5H22.5C23.8807 27.5 25 26.3807 25 25V5C25 3.61929 23.8807 2.5 22.5 2.5Z"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Header */}
          <div className="text-center mt-16 container-margin-sm">
            <h1 className="text-responsive-3xl font-bold text-[#1E1E1E] mb-3">
              {t('onboarding:hotelInformation.title')}
            </h1>
            <p className="text-responsive-lg text-[#485567]">
              {t('onboarding:hotelInformation.subtitle')}
            </p>
          </div>

          <div className="space-y-5 max-w-2xl mx-auto">
            {/* Hotel Name */}
            <div className="form-field">
              <label className="form-label">
                {t('onboarding:hotelInformation.hotelNameLabel')}
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  value={formData.hotelName}
                  onChange={(e) => handleInputChange("hotelName", e.target.value)}
                  placeholder={t('onboarding:hotelInformation.hotelNamePlaceholder')}
                  className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${getFieldBorderColor("hotelName")} ${getFieldTextColor("hotelName")}`}
                />
                {hasSubmitted && errors.hotelName && (
                  <div className="flex items-center gap-1">
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
                    <span className="error-message">
                      {errors.hotelName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            

          {/* Street Address */}
          <div className="form-field">
            <div className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10.2058 17.474C11.1643 16.6043 12.0513 15.6591 12.8583 14.6473C14.5583 12.5115 15.5925 10.4057 15.6625 8.53317C15.6902 7.77217 15.5642 7.01339 15.2921 6.30215C15.02 5.59092 14.6073 4.94183 14.0788 4.39366C13.5502 3.84549 12.9165 3.40948 12.2157 3.11167C11.5148 2.81387 10.7611 2.66038 9.99959 2.66038C9.23809 2.66038 8.48439 2.81387 7.78353 3.11167C7.08266 3.40948 6.44901 3.84549 5.92043 4.39366C5.39185 4.94183 4.97917 5.59092 4.70706 6.30215C4.43495 7.01339 4.30898 7.77217 4.33668 8.53317C4.40751 10.4057 5.44251 12.5115 7.14168 14.6473C7.94873 15.6591 8.83575 16.6043 9.79418 17.474C9.8864 17.5573 9.95501 17.6179 10 17.6557L10.2058 17.474ZM9.38501 18.4448C9.38501 18.4448 3.33334 13.3482 3.33334 8.33317C3.33334 6.56506 4.03572 4.86937 5.28596 3.61913C6.53621 2.36888 8.2319 1.6665 10 1.6665C11.7681 1.6665 13.4638 2.36888 14.7141 3.61913C15.9643 4.86937 16.6667 6.56506 16.6667 8.33317C16.6667 13.3482 10.615 18.4448 10.615 18.4448C10.2783 18.7548 9.72418 18.7515 9.38501 18.4448ZM10 10.6665C10.6188 10.6665 11.2123 10.4207 11.6499 9.98309C12.0875 9.5455 12.3333 8.95201 12.3333 8.33317C12.3333 7.71433 12.0875 7.12084 11.6499 6.68325C11.2123 6.24567 10.6188 5.99984 10 5.99984C9.38117 5.99984 8.78768 6.24567 8.35009 6.68325C7.91251 7.12084 7.66668 7.71433 7.66668 8.33317C7.66668 8.95201 7.91251 9.5455 8.35009 9.98309C8.78768 10.4207 9.38117 10.6665 10 10.6665ZM10 11.6665C9.11595 11.6665 8.26811 11.3153 7.64299 10.6902C7.01787 10.0651 6.66668 9.21723 6.66668 8.33317C6.66668 7.44912 7.01787 6.60127 7.64299 5.97615C8.26811 5.35103 9.11595 4.99984 10 4.99984C10.8841 4.99984 11.7319 5.35103 12.357 5.97615C12.9822 6.60127 13.3333 7.44912 13.3333 8.33317C13.3333 9.21723 12.9822 10.0651 12.357 10.6902C11.7319 11.3153 10.8841 11.6665 10 11.6665Z"
                  fill="black"
                />
              </svg>
              <label className="text-[16px] text-[#485567] font-medium">
                Street Address*
              </label>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(e) =>
                  handleInputChange("streetAddress", e.target.value)
                }
                placeholder="Passeig de Gracia,43"
                className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${getFieldBorderColor("streetAddress")} ${getFieldTextColor("streetAddress")}`}
              />
              {hasSubmitted && errors.streetAddress && (
                <div className="flex items-center gap-1">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
                  </svg>
                  <span className="error-message">
                    {errors.streetAddress}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* City, Country, Postal Code Row */}
          <div className="flex flex-col lg:flex-row items-start form-gap-base">
            <div className="flex-1 space-y-2">
              <label className="form-label">
                {t('onboarding:hotelInformation.cityLabel')}
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder={t('onboarding:hotelInformation.cityPlaceholder')}
                  className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${getFieldBorderColor("city")} ${getFieldTextColor("city")}`}
                />
                {hasSubmitted && errors.city && (
                  <span className="error-message">
                    {errors.city}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="form-label">
                {t('onboarding:hotelInformation.countryLabel')}
              </label>
              <div className="space-y-1">
                <select
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base focus:outline-none transition-colors ${
                    formData.country
                      ? `${getFieldBorderColor("country")} text-[#1E1E1E]`
                      : "border-[#D7DFE8] text-[#1E1E1E]"
                  }`}
                >
                  <option value="">{t('onboarding:hotelInformation.selectCountry')}</option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
                {hasSubmitted && errors.country && (
                  <span className="error-message">
                    {errors.country}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="form-label">
                {t('onboarding:hotelInformation.postalCodeLabel')}
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    handleInputChange("postalCode", e.target.value)
                  }
                  placeholder={t('onboarding:hotelInformation.postalCodePlaceholder')}
                  className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${getFieldBorderColor("postalCode")} ${getFieldTextColor("postalCode")}`}
                />
                {hasSubmitted && errors.postalCode && (
                  <span className="error-message">
                    {errors.postalCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Phone Number and Website Row */}
          <div className="flex flex-col lg:flex-row items-start form-gap-base">
            <div className="w-full lg:w-[190px] space-y-2">
              <label className="form-label">
                {t('onboarding:hotelInformation.phoneNumberLabel')}
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  placeholder={t('onboarding:hotelInformation.phoneNumberPlaceholder')}
                  className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${getFieldBorderColor("phoneNumber")} ${getFieldTextColor("phoneNumber")}`}
                />
                {hasSubmitted && errors.phoneNumber && (
                  <span className="error-message">
                    {errors.phoneNumber}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <label className="form-label">
                {t('onboarding:hotelInformation.websiteLabel')}
              </label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder={t('onboarding:hotelInformation.websitePlaceholder')}
                className="w-full input-height-lg input-padding-base border border-[#D7DFE8] rounded-[8px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors"
              />
            </div>
          </div>

          {/* CIF and Number of Rooms Row */}
          <div className="flex flex-col lg:flex-row items-start form-gap-base">
            <div className="w-full lg:w-[265px] space-y-2">
              <label className="form-label">
                {t('onboarding:hotelInformation.cifLabel')}
              </label>
              <input
                type="text"
                value={formData.cif}
                onChange={(e) => handleInputChange("cif", e.target.value)}
                placeholder={t('onboarding:hotelInformation.cifPlaceholder')}
                className="w-full input-height-lg input-padding-base border border-[#D7DFE8] rounded-[10px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none focus:border-[#294859] transition-colors"
              />
            </div>
            <div className="w-full lg:w-[265px] space-y-2">
              <label className="form-label">
                {t('onboarding:hotelInformation.numberOfRoomsLabel')}
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  value={formData.numberOfRooms}
                  onChange={(e) =>
                    handleInputChange("numberOfRooms", e.target.value)
                  }
                  placeholder={t('onboarding:hotelInformation.numberOfRoomsPlaceholder')}
                  className={`w-full input-height-lg input-padding-base border rounded-[10px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${
                    formData.numberOfRooms
                      ? `${getFieldBorderColor("numberOfRooms")} text-[#1E1E1E]`
                      : "border-[#D7DFE8] text-[#1E1E1E]"
                  }`}
                />
                {hasSubmitted && errors.numberOfRooms && (
                  <span className="error-message">
                    {errors.numberOfRooms}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Property Type */}
          <div className="form-field">
            <label className="form-label">
              {t('onboarding:hotelInformation.propertyTypeLabel')}
            </label>
            <div className="space-y-1">
              <select
                value={formData.propertyType}
                onChange={(e) =>
                  handleInputChange("propertyType", e.target.value)
                }
                className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base focus:outline-none transition-colors ${
                  formData.propertyType
                    ? `${getFieldBorderColor("propertyType")} text-[#1E1E1E]`
                    : "border-[#D7DFE8] text-[#1E1E1E]"
                }`}
              >
                <option value="">{t('onboarding:hotelInformation.selectPropertyType')}</option>
                <option value="hotel">{t('onboarding:hotelInformation.propertyTypes.hotel')}</option>
                <option value="apartment">{t('onboarding:hotelInformation.propertyTypes.apartment')}</option>
                <option value="villa">{t('onboarding:hotelInformation.propertyTypes.villa')}</option>
                <option value="hostel">{t('onboarding:hotelInformation.propertyTypes.hostel')}</option>
                <option value="guesthouse">{t('onboarding:hotelInformation.propertyTypes.guesthouse')}</option>
              </select>
              {hasSubmitted && errors.propertyType && (
                <span className="error-message">
                  {errors.propertyType}
                </span>
              )}
            </div>
          </div>

          {/* Booking.com URL - moved to bottom */}
          <div className="form-field">
            <div className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_74_59970)">
                  <path
                    d="M1.25 10C1.25 12.3206 2.17187 14.5462 3.81282 16.1872C5.45376 17.8281 7.67936 18.75 10 18.75C12.3206 18.75 14.5462 17.8281 16.1872 16.1872C17.8281 14.5462 18.75 12.3206 18.75 10C18.75 7.67936 17.8281 5.45376 16.1872 3.81282C14.5462 2.17187 12.3206 1.25 10 1.25C7.67936 1.25 5.45376 2.17187 3.81282 3.81282C2.17187 5.45376 1.25 7.67936 1.25 10Z"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6.25 10C6.25 7.67936 6.64509 5.45376 7.34835 3.81282C8.05161 2.17187 9.00544 1.25 10 1.25C10.9946 1.25 11.9484 2.17187 12.6516 3.81282C13.3549 5.45376 13.75 7.67936 13.75 10C13.75 12.3206 13.3549 14.5462 12.6516 16.1872C11.9484 17.8281 10.9946 18.75 10 18.75C9.00544 18.75 8.05161 17.8281 7.34835 16.1872C6.64509 14.5462 6.25 12.3206 6.25 10Z"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M1.875 12.9168H18.125M1.875 7.0835H18.125"
                    stroke="black"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_74_59970">
                    <rect width="20" height="20" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <label className="form-label">
                {t('onboarding:hotelInformation.bookingUrlLabel')}
              </label>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                value={formData.bookingUrl}
                onChange={(e) => handleInputChange("bookingUrl", e.target.value)}
                placeholder={t('onboarding:hotelInformation.bookingUrlPlaceholder')}
                className={`w-full input-height-lg input-padding-base border rounded-[8px] bg-white text-responsive-base placeholder:text-[#9CAABD] focus:outline-none transition-colors ${getFieldBorderColor("bookingUrl")} ${getFieldTextColor("bookingUrl")}`}
              />
              {hasSubmitted && errors.bookingUrl && (
                <div className="flex items-center gap-1">
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
                  <span className="error-message">
                    {errors.bookingUrl}
                  </span>
                </div>
              )}
            </div>
            {formData.bookingUrl.trim() && !errors.bookingUrl ? (
              <p className="text-responsive-sm text-[#16B257]">
                {t('onboarding:hotelInformation.bookingUrlHelp')}
              </p>
            ) : null}
          </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center pt-8">
            <button
              onClick={handleContinue}
              className="w-full btn-height-lg btn-padding-base rounded-[10px] text-responsive-base font-bold bg-[#294758] text-white hover:bg-[#1e3340] transition-colors flex items-center justify-center gap-2"
            >
              {t('onboarding:hotelInformation.continueButton')}
            </button>
          </div>
        </div>
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-[10px] p-4 mt-2">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 11.0707 2.47267 10.3413C2.15756 9.612 2 8.83222 2 8.002C2 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 7.998C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
              </svg>
              <span className="text-responsive-sm text-[#FF0404] font-medium">{formError}</span>
            </div>
          </div>
        )}
      </div>
        
    </div>
  );
}
