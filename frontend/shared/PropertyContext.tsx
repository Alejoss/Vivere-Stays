import React, { createContext, useState, useEffect, ReactNode } from "react";
import { getLocalStorageItem, setLocalStorageItem } from "./localStorage";
import { PropertyDetailResponse, dynamicPricingService } from "./api/dynamic";

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

  useEffect(() => {
    let selectedPropertyId = getLocalStorageItem<string>("selectedPropertyId");
    console.log('[PropertyContext] Loaded selectedPropertyId from localStorage:', selectedPropertyId);
    // If not in localStorage, use propertyId from props
    if (!selectedPropertyId && propertyId) {
      selectedPropertyId = propertyId;
      setLocalStorageItem("selectedPropertyId", propertyId);
      console.log('[PropertyContext] Set selectedPropertyId in localStorage from URL:', propertyId);
    }
    if (selectedPropertyId) {
      const propertyData = getLocalStorageItem<any>(PROPERTY_DATA_KEY);
      console.log('[PropertyContext] Loaded propertyData from localStorage:', propertyData, 'Type:', typeof propertyData);
      if (isValidProperty(propertyData)) {
        setProperty(propertyData);
        console.log('[PropertyContext] setProperty called with (from localStorage):', propertyData);
      } else {
        // Fetch from backend if not in localStorage or invalid
        (async () => {
          try {
            console.log('[PropertyContext] Fetching property from backend for id:', selectedPropertyId);
            const backendData = await dynamicPricingService.getProperty(selectedPropertyId!);
            // Flatten if wrapped in 'property' key
            const flatProperty = backendData.property ? backendData.property : backendData;
            console.log('[PropertyContext] Fetched property from backend (flat):', flatProperty);
            setProperty(flatProperty);
            setLocalStorageItem(PROPERTY_DATA_KEY, flatProperty);
            console.log('[PropertyContext] setProperty called with (from backend):', flatProperty);
          } catch (err) {
            console.error('[PropertyContext] Error fetching property from backend:', err);
          }
        })();
      }
    }
  }, [propertyId]);

  useEffect(() => {
    if (property && property.id) {
      setLocalStorageItem("selectedPropertyId", property.id);
      setLocalStorageItem(PROPERTY_DATA_KEY, property);
      console.log('[PropertyContext] Updated localStorage with property:', property);
    }
  }, [property]);

  console.log('[PropertyContext] Rendering with property:', property);
  return (
    <PropertyContext.Provider value={{ property, setProperty }}>
      {children}
    </PropertyContext.Provider>
  );
};
