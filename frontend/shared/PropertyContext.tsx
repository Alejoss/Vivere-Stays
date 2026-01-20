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
  const [propertyState, setPropertyState] = useState<PropertyDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Track the propertyId we're currently loading to prevent race conditions
  const loadingPropertyIdRef = React.useRef<string | null>(null);

  // Wrapper function to update both state and localStorage when property changes
  const setProperty = React.useCallback((newProperty: PropertyDetailResponse | null) => {
    setPropertyState(newProperty);
    if (newProperty) {
      // Always keep localStorage in sync when property is set
      setLocalStorageItem(PROPERTY_DATA_KEY, newProperty);
      setLocalStorageItem("selectedPropertyId", newProperty.id);
    } else {
      // If property is cleared, also clear localStorage
      setLocalStorageItem(PROPERTY_DATA_KEY, null);
      setLocalStorageItem("selectedPropertyId", null);
    }
  }, []);

  // Function to load property from localStorage or backend
  const loadProperty = React.useCallback(async (selectedPropertyId: string) => {
    if (!selectedPropertyId) {
      return;
    }

    // Prevent infinite loops - don't load if already loading or if we already have the correct property
    if (isLoading) {
      return;
    }

    if (propertyState && propertyState.id === selectedPropertyId) {
      // Property already loaded and matches - ensure localStorage is in sync
      const currentStoredId = getLocalStorageItem<string>("selectedPropertyId");
      if (currentStoredId !== selectedPropertyId) {
        setLocalStorageItem("selectedPropertyId", selectedPropertyId);
        setLocalStorageItem(PROPERTY_DATA_KEY, propertyState);
      }
      return;
    }
      
    // Always fetch from backend to ensure we have the correct property for the current user
    setIsLoading(true);
    loadingPropertyIdRef.current = selectedPropertyId;
    try {
        const backendData = await dynamicPricingService.getProperty(selectedPropertyId);
        
        // Flatten if wrapped in 'property' key
        const flatProperty = backendData.property ? backendData.property : backendData;
        
        // Only update if this is still the property we're loading (prevent race conditions)
        if (loadingPropertyIdRef.current === selectedPropertyId) {
          // Update both state and localStorage - use setProperty to ensure sync
          setProperty(flatProperty);
        }
        setIsLoading(false);
        loadingPropertyIdRef.current = null;
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
              
              // Only update if this is still the property we're loading (prevent race conditions)
              if (loadingPropertyIdRef.current === selectedPropertyId || loadingPropertyIdRef.current === fallbackProperty.id) {
                // Update context and localStorage with the correct property - use setProperty to ensure sync
                setProperty(flatProperty);
              }
              
              setIsLoading(false);
              loadingPropertyIdRef.current = null;
             } else {
               setIsLoading(false);
               loadingPropertyIdRef.current = null;
             }
           } catch (fallbackErr) {
             setIsLoading(false);
             loadingPropertyIdRef.current = null;
           }
         } else {
           setIsLoading(false);
           loadingPropertyIdRef.current = null;
       }
    }
  }, [isLoading, propertyState, setProperty]);

  useEffect(() => {
    // If propertyId is provided from URL, use it (this happens on routes like /dashboard/property/:propertyId)
    if (propertyId) {
      // loadProperty will update localStorage via setProperty, so no need to set it here
      loadProperty(propertyId);
      return;
    }
    
    // If no propertyId in URL (e.g., /dashboard/dynamic-setup), preserve current property if it exists
    // Only fall back to localStorage if we don't have a property in context
    if (propertyState) {
      // We already have a property in context, keep it - don't reload from localStorage
      // This ensures that when navigating to routes without propertyId, we keep the current property
      // Also sync localStorage to match the current property in context
      const currentStoredId = getLocalStorageItem<string>("selectedPropertyId");
      if (currentStoredId !== propertyState.id) {
        setLocalStorageItem("selectedPropertyId", propertyState.id);
        setLocalStorageItem(PROPERTY_DATA_KEY, propertyState);
      }
      return;
    }
    
    // Only load from localStorage if we don't have a property in context
    const selectedPropertyId = getLocalStorageItem<string>("selectedPropertyId");
    if (selectedPropertyId) {
      loadProperty(selectedPropertyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  // localStorage is kept in sync via:
  // 1. setProperty() - updates both state and localStorage whenever property is set
  // 2. loadProperty() - uses setProperty() to ensure sync when loading from backend
  // 3. useEffect - syncs localStorage when propertyId changes or when preserving current property

  return (
    <PropertyContext.Provider value={{ property: propertyState, setProperty }}>
      {children}
    </PropertyContext.Provider>
  );
};
