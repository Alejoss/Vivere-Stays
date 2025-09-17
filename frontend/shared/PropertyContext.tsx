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

  // Function to load property from localStorage or backend
  const loadProperty = async (selectedPropertyId: string) => {
    if (!selectedPropertyId) return;
    
    const propertyData = getLocalStorageItem<any>(PROPERTY_DATA_KEY);
    console.log('[PropertyContext] Loaded propertyData from localStorage:', propertyData, 'Type:', typeof propertyData);
    
    // Only use localStorage data if it matches the current propertyId
    if (isValidProperty(propertyData) && propertyData.id === selectedPropertyId) {
      setProperty(propertyData);
      console.log('[PropertyContext] setProperty called with (from localStorage):', propertyData);
    } else {
      // Fetch from backend if not in localStorage, invalid, or different property
      try {
        console.log('[PropertyContext] Fetching property from backend for id:', selectedPropertyId);
        const backendData = await dynamicPricingService.getProperty(selectedPropertyId);
        // Flatten if wrapped in 'property' key
        const flatProperty = backendData.property ? backendData.property : backendData;
        console.log('[PropertyContext] Fetched property from backend (flat):', flatProperty);
        setProperty(flatProperty);
        setLocalStorageItem(PROPERTY_DATA_KEY, flatProperty);
        console.log('[PropertyContext] setProperty called with (from backend):', flatProperty);
      } catch (err) {
        console.error('[PropertyContext] Error fetching property from backend:', err);
      }
    }
  };

  useEffect(() => {
    // Prioritize propertyId from URL over localStorage
    let selectedPropertyId = propertyId;
    if (!selectedPropertyId) {
      // Use standardized JSON storage method
      selectedPropertyId = getLocalStorageItem<string>("selectedPropertyId");
      console.log('[PropertyContext] No propertyId in URL, using from localStorage:', selectedPropertyId);
    } else {
      console.log('[PropertyContext] Using propertyId from URL:', selectedPropertyId);
      setLocalStorageItem("selectedPropertyId", selectedPropertyId);
    }
    
    loadProperty(selectedPropertyId);
  }, [propertyId]);

  // Listen for localStorage changes to detect when property is created/updated
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle changes to our property-related keys
      if (e.key === 'selectedPropertyId' || e.key === PROPERTY_DATA_KEY) {
        console.log('[PropertyContext] localStorage changed:', e.key, e.newValue);
        
        // If selectedPropertyId changed, load the new property
        if (e.key === 'selectedPropertyId' && e.newValue) {
          loadProperty(e.newValue);
        }
        // If property_data changed, update the context
        else if (e.key === PROPERTY_DATA_KEY && e.newValue) {
          try {
            const newPropertyData = JSON.parse(e.newValue);
            if (isValidProperty(newPropertyData)) {
              setProperty(newPropertyData);
              console.log('[PropertyContext] Updated property from storage event:', newPropertyData);
            }
          } catch (err) {
            console.error('[PropertyContext] Error parsing property data from storage event:', err);
          }
        }
      }
    };

    // Listen for storage events (changes from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events for same-tab changes
    const handleCustomStorageChange = (e: CustomEvent) => {
      console.log('[PropertyContext] Custom storage event:', e.detail);
      if (e.detail.key === 'selectedPropertyId' && e.detail.value) {
        loadProperty(e.detail.value);
      } else if (e.detail.key === PROPERTY_DATA_KEY && e.detail.value) {
        if (isValidProperty(e.detail.value)) {
          setProperty(e.detail.value);
          console.log('[PropertyContext] Updated property from custom storage event:', e.detail.value);
        }
      }
    };

    window.addEventListener('localStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageChange', handleCustomStorageChange as EventListener);
    };
  }, []);

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
