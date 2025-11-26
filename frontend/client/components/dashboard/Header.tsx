import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { PropertyContext, PropertyContextType } from "../../../shared/PropertyContext";
import { ConnectionContext } from '../../../shared/ConnectionContext';
import LanguageSwitcher from "../LanguageSwitcher";
import { dynamicPricingService } from "../../../shared/api/dynamic";

export default function Header() {
  const context = useContext(PropertyContext) as PropertyContextType | undefined;
  const connectionContext = useContext(ConnectionContext);
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Get property from context
  const property = context?.property;
  const propertyName = property?.name || "Hotel";
  
  // Use ConnectionContext as source of truth
  const isConnected = connectionContext?.isConnected ?? true;
  
  // Sync with backend pricing_status when property changes
  useEffect(() => {
    const fetchPricingStatus = async () => {
      if (!property?.id || !connectionContext?.setIsConnected) {
        // No property or no context, skip backend sync
        return;
      }
      
      try {
        const settings = await dynamicPricingService.getGeneralSettings(property.id);
        const backendStatus = settings.pricing_status === 'online';
        // Update ConnectionContext to sync with backend
        connectionContext.setIsConnected(backendStatus);
      } catch (error) {
        console.error('Failed to fetch pricing status:', error);
        // Silently fail - keep current state
      }
    };
    
    fetchPricingStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property?.id]); // Only depend on property.id to avoid loops

  const toggleConnection = async () => {
    // If no property, just toggle local state (localStorage only)
    if (!property?.id) {
      const newValue = !isConnected;
      if (connectionContext?.setIsConnected) {
        connectionContext.setIsConnected(newValue);
      }
      return;
    }
    
    // Prevent multiple simultaneous updates
    if (isUpdating) {
      return;
    }
    
    setIsUpdating(true);
    const newStatus = !isConnected;
    const newPricingStatus = newStatus ? 'online' : 'offline';
    
    try {
      // Update backend
      await dynamicPricingService.updateGeneralSettings(property.id, {
        pricing_status: newPricingStatus
      });
      
      // Update ConnectionContext on success
      if (connectionContext?.setIsConnected) {
        connectionContext.setIsConnected(newStatus);
      }
    } catch (error) {
      console.error('Failed to update pricing status:', error);
      // Don't update state on error - keep current state
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    navigate("/logout");
  };

  const handleLogoClick = () => {
    // Navigate to Price Calendar with property ID if available
    if (context?.property?.id) {
      navigate(`/dashboard/property/${context.property.id}`);
    } else {
      navigate("/dashboard/property");
    }
  };

  return (
    <div className="hidden lg:flex items-center justify-between px-4 lg:px-6 py-4 border-b border-hotel-border-light bg-white">
      {/* Hotel Name */}
      <button
        onClick={handleLogoClick}
        className="text-[18px] lg:text-[20px] font-bold text-hotel-brand hover:text-hotel-brand-dark transition-colors cursor-pointer"
        title="Go to Price Calendar"
      >
        {propertyName}
      </button>

      {/* Center Section - Connection Status Toggle */}
      <div className="flex-1 flex justify-center">
        <button
          onClick={toggleConnection}
          disabled={isUpdating}
          className={`flex items-center gap-2 lg:gap-3 px-[12px] lg:px-[18px] py-[3px] rounded-[21px] shadow-lg transition-all duration-200 ${
            isUpdating 
              ? "opacity-50 cursor-not-allowed" 
              : "hover:scale-105"
          } ${
            isConnected
              ? "bg-hotel-status-connected-bg"
              : "bg-hotel-status-disconnected-bg"
          }`}
        >
          <span className="text-[11px] lg:text-[12px] font-normal text-black">
            {isUpdating ? "Updating..." : (isConnected ? "Connected" : "Disconnected")}
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

      {/* Right Section - Language Switcher and Logout */}
      <div className="flex items-center gap-2">
        {/* Language Switcher */}
        <LanguageSwitcher variant="header" />

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
          title="Logout"
        >
          <LogOut size={20} />
          <span className="text-sm font-medium hidden sm:block">Logout</span>
        </button>
      </div>
    </div>
  );
}
