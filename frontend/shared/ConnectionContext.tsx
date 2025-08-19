import React, { createContext, useState, useEffect, ReactNode } from "react";
import { getVivereConnection, setVivereConnection } from "./localStorage";

export interface ConnectionContextType {
  isConnected: boolean;
  setIsConnected: (value: boolean) => void;
}

interface ConnectionProviderProps {
  children: ReactNode;
}

export const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

export const ConnectionProvider = ({ children }: ConnectionProviderProps) => {
  const [isConnected, setIsConnectedState] = useState<boolean>(getVivereConnection());

  useEffect(() => {
    setIsConnectedState(getVivereConnection());
  }, []);

  const setIsConnected = (value: boolean) => {
    console.log('[ConnectionContext] setIsConnected called with:', value);
    setIsConnectedState(value);
    setVivereConnection(value);
  };

  console.log('[ConnectionContext] Provider render. isConnected:', isConnected);

  return (
    <ConnectionContext.Provider value={{ isConnected, setIsConnected }}>
      {children}
    </ConnectionContext.Provider>
  );
};
