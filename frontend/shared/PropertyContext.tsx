import React, { createContext, useState, useEffect, ReactNode } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "./localStorage";
import { PropertyDetailResponse, dynamicPricingService } from "./api/dynamic";
import { profilesService } from "./api/profiles";

export interface PropertyContextType {
  property: PropertyDetailResponse | null;
  setProperty: (property: PropertyDetailResponse | null) => void;
}

interface PropertyProviderProps {
  children: ReactNode;
  propertyId?: string;
}

function isValidProperty(obj: any): obj is PropertyDetailResponse {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

const PROPERTY_DATA_KEY = "property_data";

export const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const PropertyProvider = ({ children, propertyId }: PropertyProviderProps) => {
  const [property, setProperty] = useState<PropertyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to load property from localStorage or backend
  const loadProperty = async (selectedPropertyId: string) => {
    if (!selectedPropertyId) {
      return;
    }

    // Prevent infinite loops - don't load if already loading or if we already have the correct property
    if (isLoading) {
      return;
    }

    if (property && property.id === selectedPropertyId) {
      return;
    }
      
    // Always fetch from backend to ensure we have the correct property for the current user
    setIsLoading(true);
    try {
        const backendData = await dynamicPricingService.getProperty(selectedPropertyId);
        
        // Flatten if wrapped in 'property' key
        const flatProperty = backendData.property ? backendData.property : backendData;
        
        setProperty(flatProperty);
        setLocalStorageItem(PROPERTY_DATA_KEY, flatProperty);
        setIsLoading(false);
      } catch (err) {
        // Check if it's a 404 error (property not found or access denied)
        const is404Error = (
          // Check if it's an error object with status 404
          (err && typeof err === 'object' && err.status === 404) ||
          // Check if it's an Error instance with 404 in message
          (err instanceof Error && (
            err.message.includes('404') || 
            err.message.includes('not found') || 
            err.message.includes('access denied') ||
            err.message.includes('Property not found or access denied')
          )) ||
          // Check if error message contains the access denied message
          (err && typeof err === 'object' && err.error && err.error.includes('Property not found or access denied'))
        );
        
        if (is404Error) {
          // Fallback to user's properties
          try {
            const userPropertiesResponse = await profilesService.getUserProperties();
            const userProperties = userPropertiesResponse.properties;
            
            if (userProperties && userProperties.length > 0) {
              // Take the first (most recent) property
              const fallbackProperty = userProperties[0];
              
              // Fetch full property details for the fallback property
              const fullPropertyData = await dynamicPricingService.getProperty(fallbackProperty.id);
              const flatProperty = fullPropertyData.property ? fullPropertyData.property : fullPropertyData;
              
              // Update context and localStorage with the correct property
              setProperty(flatProperty);
              setLocalStorageItem(PROPERTY_DATA_KEY, flatProperty);
              setLocalStorageItem("selectedPropertyId", flatProperty.id);
              
              setIsLoading(false);
             } else {
               setIsLoading(false);
             }
           } catch (fallbackErr) {
             setIsLoading(false);
           }
         } else {
           setIsLoading(false);
       }
    }
  };

  useEffect(() => {
    // Prioritize propertyId from URL over localStorage
    let selectedPropertyId = propertyId;
    if (!selectedPropertyId) {
      // Use standardized JSON storage method
      selectedPropertyId = getLocalStorageItem<string>("selectedPropertyId");
    } else {
      setLocalStorageItem("selectedPropertyId", selectedPropertyId);
    }
    
    loadProperty(selectedPropertyId);
  }, [propertyId]);

  // Removed localStorage event listeners to prevent infinite loops

  // Removed automatic localStorage updates to prevent infinite loops
  // localStorage is now only updated explicitly in loadProperty function

  return (
    <PropertyContext.Provider value={{ property, setProperty }}>
      {children}
    </PropertyContext.Provider>
  );
};
