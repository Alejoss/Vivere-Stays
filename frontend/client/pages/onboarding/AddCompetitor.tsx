import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCreateCompetitorCandidates } from "../../../shared/api/hooks";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { getHotelDataForAPI, getLocalStorageItem } from "../../../shared/localStorage";
import { PropertyContext } from "../../../shared/PropertyContext";
import LanguageSwitcher from "../../components/LanguageSwitcher";
import "../../styles/responsive-utilities.css";

interface CompetitorHotel {
  id: string;
  name: string;
}

export default function AddCompetitor() {
  const navigate = useNavigate();
  const { t } = useTranslation(['onboarding', 'common', 'errors']);
  const { property } = useContext(PropertyContext) ?? {};
  const [competitorHotels, setCompetitorHotels] = useState<CompetitorHotel[]>([
    { id: "1", name: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNearbyHotels, setIsLoadingNearbyHotels] = useState(false);
  const [error, setError] = useState("");
  
  const createCompetitorCandidates = useCreateCompetitorCandidates();

  // Debug PropertyContext state
  useEffect(() => {
    console.log('[AddCompetitor] PropertyContext property:', property);
    console.log('[AddCompetitor] PropertyContext property?.id:', property?.id);
  }, [property]);

  // Utility function to clean hotel names
  const cleanHotelName = (name: string): string => {
    if (!name) return '';
    
    return name
      .replace(/["""]/g, '') // Remove quotes
      .replace(/[''']/g, '') // Remove single quotes
      .replace(/[\/\\]/g, '') // Remove forward and backward slashes
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/[{}]/g, '') // Remove curly braces
      .replace(/[\[\]]/g, '') // Remove square brackets
      .replace(/[|]/g, '') // Remove pipe
      .replace(/[`~!@#$%^&*()_+=]/g, '') // Remove other special characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing spaces
  };

  const fetchNearbyHotels = async (hotelData: any) => {
    setIsLoadingNearbyHotels(true);
    try {
      const hotelNames = await dynamicPricingService.getNearbyHotels({
        address: hotelData.street_address,
        city: hotelData.city,
        country: hotelData.country,
        postal_code: hotelData.postal_code,
      });
      
      // Clean and process hotel names
      if (hotelNames && Array.isArray(hotelNames) && hotelNames.length > 0) {
        const cleanedHotels = hotelNames
          .map(name => cleanHotelName(name))
          .filter(name => name.length > 0) // Remove empty names after cleaning
          .slice(0, 5); // Limit to 5 suggestions
        
        const suggestedCompetitors = cleanedHotels.map((name: string, index: number) => ({
          id: `suggested-${index}`,
          name: name,
        }));
        
        setCompetitorHotels(suggestedCompetitors);
      }
    } catch (error) {
      // Handle error silently or set error state if needed
    } finally {
      setIsLoadingNearbyHotels(false);
    }
  };

  // Load hotel data from localStorage to fetch nearby competitors
  useEffect(() => {
    try {
      const hotelData = getHotelDataForAPI();
      
      if (hotelData && hotelData.street_address && hotelData.city) {
        fetchNearbyHotels(hotelData);
      }
    } catch (error) {
      // Fallback to checking hotelDataForPMS for backward compatibility
      try {
        const hotelData = getLocalStorageItem<any>('hotelDataForPMS');
        
        if (hotelData) {
          
          // Check if we have the required location data
          if (hotelData.street_address && hotelData.city) {
            fetchNearbyHotels(hotelData);
          }
        }
      } catch (fallbackError) {
        // Handle fallback error silently
      }
    }
  }, []);

  const handleContinue = async () => {
    setError("");
    
    // Ensure we have a property id - try PropertyContext first, then localStorage fallback
    let propertyId = property?.id;
    
    if (!propertyId) {
      console.error('[AddCompetitor] Missing property context:', { property });
      
      // Fallback: try to get property from localStorage
      try {
        const selectedPropertyId = getLocalStorageItem<string>("selectedPropertyId");
        const propertyData = getLocalStorageItem<any>("property_data");
        
        console.log('[AddCompetitor] Fallback - selectedPropertyId from localStorage:', selectedPropertyId);
        console.log('[AddCompetitor] Fallback - property_data from localStorage:', propertyData);
        
        if (selectedPropertyId) {
          propertyId = selectedPropertyId;
          console.log('[AddCompetitor] Using fallback property ID:', propertyId);
        } else {
          setError("Missing property context. Please go back and ensure the property is selected/created.");
          return;
        }
      } catch (error) {
        console.error('[AddCompetitor] Error reading from localStorage:', error);
        setError("Missing property context. Please go back and ensure the property is selected/created.");
        return;
      }
    }
    
    console.log('[AddCompetitor] Using property ID:', propertyId);
    
    // Filter out empty hotel names and get only valid ones
    const validHotelNames = competitorHotels
      .map(hotel => hotel.name.trim())
      .filter(name => name && name.length > 0);
    
    // If no competitors provided, skip API call and continue directly
    if (validHotelNames.length === 0) {
      navigate("/msp");
      return;
    }
    
    // Only make API call if there are valid competitors
    setIsLoading(true);
    try {
      // Pass the property ID explicitly
      const requestData = {
        property_id: propertyId,
        competitor_names: validHotelNames
      };
      console.log('[AddCompetitor] Sending request data:', requestData);
      
      const response = await createCompetitorCandidates.mutateAsync(requestData);
      
      navigate("/msp");
    } catch (err: any) {
      // Extract the actual error message from the backend response
      let errorMessage = "Failed to save competitor candidates. Please try again.";
      
      if (err && typeof err === 'object') {
        if ('error' in err) {
          // The API client returns errors in format "field: message"
          const errorText = err.error;
          if (typeof errorText === 'string' && errorText.includes(':')) {
            // Extract just the message part after the colon
            const parts = errorText.split(':');
            if (parts.length >= 2) {
              errorMessage = parts.slice(1).join(':').trim();
            } else {
              errorMessage = errorText;
            }
          } else {
            errorMessage = errorText;
          }
        } else if ('message' in err) {
          errorMessage = err.message;
        } else if ('errors' in err) {
          // Handle structured error response from backend
          const errors = err.errors;
          if (typeof errors === 'object') {
            // Extract the first error message from the structured response
            const firstErrorKey = Object.keys(errors)[0];
            if (firstErrorKey && Array.isArray(errors[firstErrorKey])) {
              errorMessage = errors[firstErrorKey][0];
            } else if (typeof errors === 'string') {
              errorMessage = errors;
            }
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      // Also check if this is a mutation error with a different format
      if (errorMessage.includes("Bulk competitor candidate creation failed")) {
        // Try to extract the JSON part and parse it
        const jsonMatch = errorMessage.match(/\{.*\}/);
        if (jsonMatch) {
          try {
            const errorData = JSON.parse(jsonMatch[0]);
            if (errorData.competitor_names && Array.isArray(errorData.competitor_names)) {
              errorMessage = errorData.competitor_names[0];
            }
          } catch (e) {
            console.log("Failed to parse error JSON:", e);
          }
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const addCompetitorHotel = () => {
    const newHotel: CompetitorHotel = {
      id: Date.now().toString(),
      name: "",
    };
    setCompetitorHotels([...competitorHotels, newHotel]);
  };

  const removeCompetitorHotel = (id: string) => {
    setCompetitorHotels(competitorHotels.filter((hotel) => hotel.id !== id));
  };

  const updateCompetitorHotel = (id: string, name: string) => {
    setCompetitorHotels(
      competitorHotels.map((hotel) => (hotel.id === id ? { ...hotel, name } : hotel)),
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8 w-full">
      {/* Language Switcher - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher variant="header" />
      </div>
      
      {/* Logo */}
      <div className="container-margin-sm">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="logo-base"
        />
      </div>


      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full max-w-[724px] container-padding-base">
        {/* Title and Description */}
        <div className="text-center container-margin-lg">
          <h1 className="text-responsive-3xl font-bold text-[#1E1E1E] mb-3">
            {t('onboarding:addCompetitor.title')}
          </h1>
          <p className="text-responsive-lg text-[#485567]">
            {t('onboarding:addCompetitor.subtitle')}
          </p>
        </div>

        <div className="space-y-5">
          {/* AI-Powered Recommendations Box */}
          <div className="border border-[#EEDEFF] bg-[#FAF7FF] rounded-lg p-[25px_30px_29px_30px]">
            <div className="flex items-center gap-[6px] mb-[10px]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M19.9999 3.00025V7.00025M21.9999 5.00025H17.9999M3.99994 17.0002V19.0002M4.99994 18.0002H2.99994M9.93694 15.5002C9.84766 15.1542 9.66728 14.8384 9.41456 14.5856C9.16184 14.3329 8.84601 14.1525 8.49994 14.0632L2.36494 12.4812C2.26027 12.4515 2.16815 12.3885 2.10255 12.3017C2.03696 12.2149 2.00146 12.1091 2.00146 12.0002C2.00146 11.8914 2.03696 11.7856 2.10255 11.6988C2.16815 11.612 2.26027 11.549 2.36494 11.5192L8.49994 9.93625C8.84589 9.84706 9.16163 9.66682 9.41434 9.41429C9.66705 9.16175 9.84751 8.84614 9.93694 8.50025L11.5189 2.36525C11.5483 2.26017 11.6113 2.16759 11.6983 2.10164C11.7852 2.0357 11.8913 2 12.0004 2C12.1096 2 12.2157 2.0357 12.3026 2.10164C12.3896 2.16759 12.4525 2.26017 12.4819 2.36525L14.0629 8.50025C14.1522 8.84632 14.3326 9.16215 14.5853 9.41487C14.838 9.66759 15.1539 9.84797 15.4999 9.93725L21.6349 11.5182C21.7404 11.5473 21.8335 11.6103 21.8998 11.6973C21.9661 11.7844 22.002 11.8908 22.002 12.0002C22.002 12.1097 21.9661 12.2161 21.8998 12.3032C21.8335 12.3902 21.7404 12.4531 21.6349 12.4822L15.4999 14.0632C15.1539 14.1525 14.838 14.3329 14.5853 14.5856C14.3326 14.8384 14.1522 15.1542 14.0629 15.5002L12.4809 21.6353C12.4515 21.7403 12.3886 21.8329 12.3016 21.8989C12.2147 21.9648 12.1086 22.0005 11.9994 22.0005C11.8903 22.0005 11.7842 21.9648 11.6973 21.8989C11.6103 21.8329 11.5473 21.7403 11.5179 21.6353L9.93694 15.5002Z"
                  stroke="#AB61EF"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-responsive-lg font-semibold text-[#1E1E1E]">
                {t('onboarding:addCompetitor.aiRecommendationsTitle')}
              </span>
            </div>
            <p className="text-responsive-sm text-[#1E1E1E] leading-normal">
              {t('onboarding:addCompetitor.aiRecommendationsText')}
            </p>
          </div>

          {/* Competitor Hotels Section */}
          <div className="space-y-[14px]">
            <div className="flex items-center gap-2">
              <span className="text-responsive-base font-bold text-[#485567]">
                {t('onboarding:addCompetitor.competitorNamesLabel')}
              </span>
              {isLoadingNearbyHotels && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#294758]"></div>
                  <span className="text-responsive-xs text-[#485567]">{t('onboarding:addCompetitor.findingNearby')}</span>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-[10px] p-4">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 10.9747C8.11644 10.9747 8.214 10.9353 8.29267 10.8567C8.37089 10.778 8.41 10.6804 8.41 10.564C8.41 10.448 8.37067 10.3507 8.292 10.272C8.21333 10.1933 8.116 10.1538 8 10.1533C7.884 10.1529 7.78667 10.1922 7.708 10.2713C7.62933 10.3504 7.59 10.4478 7.59 10.5633C7.59 10.6789 7.62933 10.7764 7.708 10.856C7.78667 10.9356 7.884 10.9756 8 10.9747ZM7.66667 8.76867H8.33333V4.76867H7.66667V8.76867ZM8.002 14C7.17267 14 6.39267 13.8427 5.662 13.528C4.93178 13.2129 4.29644 12.7853 3.756 12.2453C3.21556 11.7053 2.78778 10.4478 2.78778 8.002C2.78778 7.17178 2.15756 6.39178 2.47267 5.662C2.78733 4.93178 3.21422 4.29644 3.75333 3.756C4.29244 3.21556 4.92733 2.78778 5.658 2.47267C6.38867 2.15756 7.16867 2 7.998 2C8.82733 2 9.60733 2.15756 10.338 2.47267C11.0682 2.78733 11.7036 3.21444 12.244 3.754C12.7844 4.29356 13.2122 4.92844 13.5273 5.65867C13.8424 6.38889 14 7.16867 14 8.002C14 8.82733 13.8427 9.60733 13.528 10.338C13.2133 11.0687 12.7858 11.704 12.2453 12.244C11.7049 12.784 11.0702 13.2118 10.3413 13.5273C9.61244 13.8429 8.83267 14.0004 8.002 14ZM8 13.3333C9.48889 13.3333 10.75 12.8167 11.7833 11.7833C12.8167 10.75 13.3333 9.48889 13.3333 8C13.3333 6.51111 12.8167 5.25 11.7833 4.21667C10.75 3.18333 9.48889 2.66667 8 2.66667C6.51111 2.66667 5.25 3.18333 4.21667 4.21667C3.18333 5.25 2.66667 6.51111 2.66667 8C2.66667 9.48889 3.18333 10.75 4.21667 11.7833C5.25 12.8167 6.51111 13.3333 8 13.3333Z" fill="#FF0404" />
                  </svg>
                  <span className="error-message">{error}</span>
                </div>
              </div>
            )}

            {/* Competitor Input Fields */}
            <div className="space-y-3">
              {competitorHotels.map((hotel, index) => (
                <div key={hotel.id} className="flex items-center gap-1">
                  <div className="flex-1">
                    <div className="border border-[#D7DFE8] bg-white rounded-[10px] p-[3px]">
                      <input
                        type="text"
                        value={hotel.name}
                        onChange={(e) =>
                          updateCompetitorHotel(hotel.id, e.target.value)
                        }
                        placeholder={t('onboarding:addCompetitor.namePlaceholder')}
                        className={`w-full input-height-lg input-padding-base border-none rounded-lg text-responsive-base focus:outline-none ${
                          hotel.name
                            ? "text-[#1E1E1E]"
                            : "text-[#9CAABD] placeholder:text-[#9CAABD]"
                        }`}
                      />
                    </div>
                  </div>
                  {competitorHotels.length > 1 && (
                    <button
                      onClick={() => removeCompetitorHotel(hotel.id)}
                      className="w-[60px] h-[60px] p-[10px] border border-[#D7DFE8] bg-white rounded-[10px] flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <svg
                        width="40"
                        height="40"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M27.2895 27.4737C27.2895 28.3426 26.9443 29.176 26.3299 29.7904C25.7154 30.4048 24.8821 30.75 24.0132 30.75H16.3684C15.4995 30.75 14.6661 30.4048 14.0517 29.7904C13.4373 29.176 13.0921 28.3426 13.0921 27.4737V14.3684H12V11.0921H16.9145L18.0066 10H22.375L23.4671 11.0921H28.3816V14.3684H27.2895V27.4737ZM14.1842 14.3684V27.4737C14.1842 28.053 14.4143 28.6085 14.824 29.0182C15.2336 29.4278 15.7891 29.6579 16.3684 29.6579H24.0132C24.5924 29.6579 25.148 29.4278 25.5576 29.0182C25.9672 28.6085 26.1974 28.053 26.1974 27.4737V14.3684H14.1842ZM27.2895 13.2763V12.1842H22.9211L21.8289 11.0921H18.5526L17.4605 12.1842H13.0921V13.2763H27.2895ZM16.3684 16.5526H17.4605V27.4737H16.3684V16.5526ZM22.9211 16.5526H24.0132V27.4737H22.9211V16.5526Z"
                          fill="#FF0404"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Another Competitor Button */}
            <button
              onClick={addCompetitorHotel}
              className="w-full flex items-center justify-center gap-[14px] input-padding-base border border-[#9CAABD] bg-white rounded-lg text-responsive-base text-[#485567] hover:border-[#485567] transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3.33325 9.99967H9.99992M9.99992 9.99967H16.6666M9.99992 9.99967V3.33301M9.99992 9.99967V16.6663"
                  stroke="#485567"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t('onboarding:addCompetitor.addAnother')}
            </button>
          </div>

          {/* Tips Section */}
          <div className="border border-[#BFC8D5] bg-[#F9FBFD] rounded-lg p-[19px]">
            <div className="space-y-[10px]">
              <div className="flex items-center gap-[6px]">
                <span className="text-responsive-lg text-[#64748B]">
                  {t('onboarding:addCompetitor.tipsTitle')}
                </span>
              </div>
              <div className="text-responsive-sm text-[#64748B] leading-normal space-y-1">
                <div>• {t('onboarding:addCompetitor.tip1')}</div>
                <div>• {t('onboarding:addCompetitor.tip2')}</div>
                <div>• {t('onboarding:addCompetitor.tip3')}</div>
                <div>• {t('onboarding:addCompetitor.tip4')}</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-5">
            <button
              onClick={handleContinue}
              className={`flex items-center gap-2 btn-padding-base rounded-[10px] text-responsive-base font-bold transition-colors ${
                isLoading ? "bg-gray-400 cursor-not-allowed text-white" : "bg-[#294758] text-white hover:bg-[#234149]"
              }`}
              disabled={isLoading || createCompetitorCandidates.isPending}
            >
              {isLoading || createCompetitorCandidates.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {t('common:messages.saving')}
                </>
              ) : (
                <>{t('common:buttons.continue')}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
