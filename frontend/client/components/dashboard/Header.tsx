import { useContext } from "react";
import { PropertyContext, PropertyContextType } from "../../../shared/PropertyContext";
import { ConnectionContext } from '../../../shared/ConnectionContext';

export default function Header() {
  const context = useContext(PropertyContext) as PropertyContextType | undefined;
  const connectionContext = useContext(ConnectionContext);
  const isConnected = connectionContext?.isConnected ?? true;
  const setIsConnected = connectionContext?.setIsConnected ?? (() => {});

  const propertyName = context?.property?.name || "Hotel";

  const toggleConnection = () => {
    setIsConnected(!isConnected);
  };

  return (
    <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-b border-hotel-border-light bg-white">
      {/* Hotel Name */}
      <h1 className="text-[18px] lg:text-[20px] font-bold text-hotel-brand">
        {propertyName}
      </h1>

      {/* Connection Status Toggle */}
      <button
        onClick={toggleConnection}
        className={`flex items-center gap-2 lg:gap-3 px-[12px] lg:px-[18px] py-[3px] rounded-[21px] shadow-lg transition-all duration-200 hover:scale-105 ${
          isConnected
            ? "bg-hotel-status-connected-bg"
            : "bg-hotel-status-disconnected-bg"
        }`}
      >
        <span className="text-[11px] lg:text-[12px] font-normal text-black">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
        <div
          className={`w-[20px] lg:w-[26px] h-[20px] lg:h-[26px] rounded-full transition-colors duration-200 ${
            isConnected
              ? "bg-hotel-status-connected"
              : "bg-hotel-status-disconnected"
          }`}
        />
      </button>
    </div>
  );
}
