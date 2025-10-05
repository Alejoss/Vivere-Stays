import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCompetitorCandidates } from "../../../shared/api/hooks";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import OnboardingProgressTracker from "../../components/OnboardingProgressTracker";
import { getHotelDataForAPI, getLocalStorageItem } from "../../../shared/localStorage";
import { PropertyContext } from "../../../shared/PropertyContext";
import "../../styles/responsive-utilities.css";

interface CompetitorHotel {
  id: string;
  name: string;
}

export default function AddCompetitor() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8">
      <OnboardingProgressTracker currentStep="add_competitor" />
      {/* Logo */}
      <div className="container-margin-sm">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/45994adad9b2b36a95d20ee6e1b3521891b0bf6a?width=480"
          alt="Vivere Stays"
          className="logo-base"
        />
      </div>

      {/* Progress Bar */}
      <div className="flex justify-center items-center container-margin-base w-full max-w-[1245px]">
        {/* Payment - Completed */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="25"
              height="24"
              viewBox="0 0 25 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.0644 15.25C10.8715 15.2352 10.692 15.1455 10.5644 15L7.56443 12C7.49759 11.86 7.47579 11.7028 7.50201 11.5499C7.52824 11.3971 7.60121 11.2561 7.71088 11.1464C7.82055 11.0368 7.96152 10.9638 8.11439 10.9376C8.26725 10.9113 8.42448 10.9331 8.56443 11L11.0344 13.47L19.5644 4.99998C19.7044 4.93314 19.8616 4.91133 20.0145 4.93756C20.1673 4.96379 20.3083 5.03676 20.418 5.14643C20.5277 5.2561 20.6006 5.39707 20.6269 5.54993C20.6531 5.70279 20.6313 5.86003 20.5644 5.99998L11.5644 15C11.4369 15.1455 11.2574 15.2352 11.0644 15.25Z"
                fill="#16B257"
              />
              <path
                d="M12.5646 21.0002C10.956 20.9976 9.37758 20.564 7.99348 19.7444C6.60939 18.9249 5.47023 17.7493 4.69456 16.3402C4.10575 15.2898 3.7414 14.1286 3.62456 12.9302C3.44154 11.1723 3.78017 9.39935 4.59821 7.83264C5.41624 6.26592 6.67747 4.97474 8.22456 4.12017C9.27493 3.53136 10.4361 3.16701 11.6346 3.05017C12.8287 2.92284 14.0363 3.03849 15.1846 3.39017C15.287 3.41064 15.3841 3.4523 15.4695 3.51246C15.5549 3.57263 15.6268 3.64998 15.6806 3.73955C15.7344 3.82913 15.7689 3.92896 15.7818 4.03263C15.7948 4.13631 15.7859 4.24155 15.7558 4.34161C15.7258 4.44167 15.6751 4.53433 15.6071 4.61367C15.5391 4.69301 15.4553 4.75726 15.361 4.80232C15.2668 4.84738 15.1641 4.87224 15.0597 4.87531C14.9552 4.87839 14.8513 4.85961 14.7546 4.82017C13.7833 4.52756 12.7632 4.43236 11.7546 4.54017C10.7574 4.64145 9.79119 4.94423 8.91456 5.43017C8.06969 5.89628 7.32271 6.52103 6.71456 7.27017C6.08842 8.03333 5.62086 8.91376 5.33925 9.85989C5.05764 10.806 4.96766 11.7988 5.07456 12.7802C5.17583 13.7773 5.47862 14.7436 5.96456 15.6202C6.43066 16.465 7.05542 17.212 7.78845 17.8202C8.55161 18.4463 9.43204 18.9139 10.3782 19.1955C11.3243 19.4771 12.3171 19.5671 13.2984 19.4602C14.2956 19.3589 15.2618 19.0561 16.1385 18.5702C16.9833 18.1041 17.7303 17.4793 18.3385 16.7302C18.9646 15.967 19.4322 15.0866 19.7138 14.1405C19.9954 13.1943 20.0854 12.2015 19.9785 11.2202C19.9586 11.012 20.0222 10.8044 20.1553 10.6431C20.2885 10.4818 20.4803 10.3801 20.6884 10.3602C20.8966 10.3403 21.1042 10.4039 21.2655 10.5371C21.4268 10.6702 21.5286 10.862 21.5485 11.0702C21.7305 12.8291 21.3904 14.6028 20.5705 16.1696C19.7507 17.7364 18.4874 19.027 16.9384 19.8802C15.8769 20.4931 14.6978 20.8748 13.4784 21.0002H12.5484Z"
                fill="#16B257"
              />
            </svg>
            <span className="text-responsive-lg font-medium text-[#16B257]">
              Payment
            </span>
          </div>
          <div className="w-[31px] h-[2px] bg-[#294859]"></div>
        </div>

        {/* Add Competitor Hotels - Current */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_74_60265)">
                <path
                  d="M10.5644 19.1663C15.6269 19.1663 19.731 15.0622 19.731 9.99967C19.731 4.93717 15.6269 0.833008 10.5644 0.833008C5.50187 0.833008 1.39771 4.93717 1.39771 9.99967C1.39771 15.0622 5.50187 19.1663 10.5644 19.1663ZM10.5644 10.833C10.7854 10.833 10.9973 10.7452 11.1536 10.5889C11.3099 10.4326 11.3977 10.2207 11.3977 9.99967C11.3977 9.77866 11.3099 9.5667 11.1536 9.41042C10.9973 9.25414 10.7854 9.16634 10.5644 9.16634C10.3434 9.16634 10.1314 9.25414 9.97512 9.41042C9.81884 9.5667 9.73104 9.77866 9.73104 9.99967C9.73104 10.2207 9.81884 10.4326 9.97512 10.5889C10.1314 10.7452 10.3434 10.833 10.5644 10.833ZM10.5644 12.4997C11.2274 12.4997 11.8633 12.2363 12.3321 11.7674C12.801 11.2986 13.0644 10.6627 13.0644 9.99967C13.0644 9.33663 12.801 8.70075 12.3321 8.23191C11.8633 7.76307 11.2274 7.49967 10.5644 7.49967C9.90133 7.49967 9.26544 7.76307 8.7966 8.23191C8.32776 8.70075 8.06437 9.33663 8.06437 9.99967C8.06437 10.6627 8.32776 11.2986 8.7966 11.7674C9.26544 12.2363 9.90133 12.4997 10.5644 12.4997ZM10.5644 14.1663C11.6694 14.1663 12.7292 13.7274 13.5106 12.946C14.2921 12.1646 14.731 11.1047 14.731 9.99967C14.731 8.8946 14.2921 7.8348 13.5106 7.0534C12.7292 6.27199 11.6694 5.83301 10.5644 5.83301C9.4593 5.83301 8.39949 6.27199 7.61809 7.0534C6.83669 7.8348 6.3977 8.8946 6.3977 9.99967C6.3977 11.1047 6.83669 12.1646 7.61809 12.946C8.39949 13.7274 9.4593 14.1663 10.5644 14.1663Z"
                  stroke="#294859"
                  strokeWidth="1.66667"
                />
              </g>
              <defs>
                <clipPath id="clip0_74_60265">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(0.564453)"
                  />
                </clipPath>
              </defs>
            </svg>
            <span className="text-responsive-lg font-medium text-[#9CAABD]">
              Add Competitor Hotels
            </span>
          </div>
          <div className="w-[31px] h-[2px] bg-[#9CAABD]"></div>
        </div>

        {/* MSP - Pending */}
        <div className="flex items-center gap-[14px]">
          <div className="flex justify-center items-center gap-2">
            <svg
              width="21"
              height="20"
              viewBox="0 0 21 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_74_60271)">
                <path
                  d="M10.5645 18.75C8.24381 18.75 6.01821 17.8281 4.37727 16.1872C2.73633 14.5462 1.81445 12.3206 1.81445 10C1.81445 7.67936 2.73633 5.45376 4.37727 3.81282C6.01821 2.17187 8.24381 1.25 10.5645 1.25C12.8851 1.25 15.1107 2.17187 16.7516 3.81282C18.3926 5.45376 19.3145 7.67936 19.3145 10C19.3145 12.3206 18.3926 14.5462 16.7516 16.1872C15.1107 17.8281 12.8851 18.75 10.5645 18.75ZM10.5645 20C13.2166 20 15.7602 18.9464 17.6355 17.0711C19.5109 15.1957 20.5645 12.6522 20.5645 10C20.5645 7.34784 19.5109 4.8043 17.6355 2.92893C15.7602 1.05357 13.2166 0 10.5645 0C7.91229 0 5.36875 1.05357 3.49339 2.92893C1.61802 4.8043 0.564453 7.34784 0.564453 10C0.564453 12.6522 1.61802 15.1957 3.49339 17.0711C5.36875 18.9464 7.91229 20 10.5645 20Z"
                  fill="#9CAABD"
                />
              </g>
              <defs>
                <clipPath id="clip0_74_60271">
                  <rect
                    width="20"
                    height="20"
                    fill="white"
                    transform="translate(0.564453)"
                  />
                </clipPath>
              </defs>
            </svg>
            <span className="text-responsive-lg font-medium text-[#9CAABD]">MSP</span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full max-w-[724px] container-padding-base">
        {/* Title and Description */}
        <div className="text-center container-margin-lg">
          <h1 className="text-responsive-3xl font-bold text-[#1E1E1E] mb-3">
            Add Competitor Hotels
          </h1>
          <p className="text-responsive-lg text-[#485567]">
            Add names of competitor hotels you want to monitor and compare.
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
                AI-Powered Recommendations
              </span>
            </div>
            <p className="text-responsive-sm text-[#1E1E1E] leading-normal">
              We recommend competitors using AI based on your property location and characteristics. 
              However, feel free to add and remove competitors so that this list matches your actual competition. 
              You will be able to perfect it later.
            </p>
          </div>

          {/* Competitor Hotels Section */}
          <div className="space-y-[14px]">
            <div className="flex items-center gap-2">
              <span className="text-responsive-base font-bold text-[#485567]">
                Competitor Hotel Names
              </span>
              {isLoadingNearbyHotels && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#294758]"></div>
                  <span className="text-responsive-xs text-[#485567]">Finding nearby hotels...</span>
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
                        placeholder="Hotel Name (e.g., Hotel Barcelona)"
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
              Add another competitor hotel
            </button>
          </div>

          {/* Tips Section */}
          <div className="border border-[#BFC8D5] bg-[#F9FBFD] rounded-lg p-[19px]">
            <div className="space-y-[10px]">
              <div className="flex items-center gap-[6px]">
                <span className="text-responsive-lg text-[#64748B]">
                  Tips for choosing competitors:
                </span>
              </div>
              <div className="text-responsive-sm text-[#64748B] leading-normal space-y-1">
                <div>• Choose hotels in the same area</div>
                <div>• Similar type and size of property</div>
                <div>• Similar amenities and features</div>
                <div>• Add 3–5 competitor hotels for best results</div>
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
                  Saving...
                </>
              ) : (
                <>Continue</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
