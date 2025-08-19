// Utility for localStorage interactions

export function getLocalStorageItem<T>(key: string): T | null {
  const item = localStorage.getItem(key);
  if (!item) return null;
  try {
    return JSON.parse(item) as T;
  } catch (e) {
    console.error(`Error parsing localStorage key ${key}:`, e);
    return null;
  }
}

export function setLocalStorageItem<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeLocalStorageItem(key: string) {
  localStorage.removeItem(key);
}

// Hotel Information specific helpers
export const HOTEL_INFO_KEY = 'hotelInformationData';

export type HotelInformationData = {
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
};

export function getHotelInformationData(): HotelInformationData | null {
  return getLocalStorageItem<HotelInformationData>(HOTEL_INFO_KEY);
}

export function setHotelInformationData(data: HotelInformationData) {
  setLocalStorageItem(HOTEL_INFO_KEY, data);
}

// Connection Status helpers
export const VIVERE_CONNECTION_KEY = 'vivereConnection';

export function getVivereConnection(): boolean {
  const value = getLocalStorageItem<boolean>(VIVERE_CONNECTION_KEY);
  // Default to true if not set
  return value === null ? true : value;
}

export function setVivereConnection(isConnected: boolean) {
  setLocalStorageItem(VIVERE_CONNECTION_KEY, isConnected);
}