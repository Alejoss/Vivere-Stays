import {
  Calendar,
  BarChart3,
  TrendingUp,
  User,
  Bell,
  HelpCircle,
  Building2,
  ChevronDown,
  Settings,
  Edit3,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import * as React from "react";
import { useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";

const navigationItems = [
  { id: "daily-prices", label: "Daily Prices", icon: Calendar, path: "/dashboard/property" },
  // Analytics handled as a submenu below
];

const hotelManagementItems = [
  { id: "hotel-information", label: "Hotel Information", path: "/dashboard/hotel-information" },
  { id: "competitors", label: "Competitors", path: "/dashboard/competitors" },
  { id: "msp-management", label: "MSP Management", path: "/dashboard/msp-management" },
  { id: "special-offers", label: "Special Offers", path: "/dashboard/special-offers" },
  { id: "dynamic-setup", label: "Dynamic Setup", path: "/dashboard/dynamic-setup" },
  { id: "length-of-stay", label: "Length of Stay", path: "/dashboard/length-of-stay" },
  { id: "available-rates", label: "Available Rates", path: "/dashboard/available-rates" },
];

const accountItems = [
  { id: "my-account", label: "My Account", icon: User, path: "/dashboard/my-account" },
  { id: "notifications", label: "Notifications", icon: Bell, path: "/dashboard/notifications" },
  { id: "support", label: "Support", icon: HelpCircle, path: "/dashboard/support" },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [analyticsOpen, setAnalyticsOpen] = React.useState(() => location.pathname.startsWith("/dashboard/analytics"));
  const [hotelManagementOpen, setHotelManagementOpen] = React.useState(() => location.pathname.startsWith("/dashboard/hotel-information") || location.pathname.startsWith("/dashboard/competitors") || location.pathname.startsWith("/dashboard/special-offers") || location.pathname.startsWith("/dashboard/dynamic-setup") || location.pathname.startsWith("/dashboard/length-of-stay") || location.pathname.startsWith("/dashboard/available-rates") || location.pathname.startsWith("/dashboard/msp-management"));
  const [isMinimized, setIsMinimized] = React.useState(true);
  
  // Get property from context
  const { property } = useContext(PropertyContext) ?? {};

  const handleNavigation = (path: string) => {
    // For "Daily Prices", include the property ID if available
    if (path === "/dashboard/property" && property?.id) {
      navigate(`/dashboard/property/${property.id}`);
    } else {
      navigate(path);
    }
  };

  const handleMinimizedClick = (path: string) => {
    // When minimized, just navigate without expanding
    handleNavigation(path);
  };

  return (
    <div className={`${isMinimized ? 'w-16' : 'w-[277px] lg:w-[277px] md:w-64'} h-screen bg-hotel-sidebar-bg border-r border-hotel-sidebar-border flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
      {/* Logo */}
      <div className="flex justify-center items-center px-[10px] pt-[34px] pb-[24px]">
        {!isMinimized ? (
          <img
            src="https://api.builder.io/api/v1/image/assets/TEMP/ccc50d58fcb7f83e65dfa6899517f0bb70d365f9?width=374"
            alt="Vivere Stays Logo"
            className="w-[187px] h-16"
          />
        ) : (
          <div className="w-8 h-8 bg-hotel-brand-dark rounded flex items-center justify-center">
            <span className="text-white font-bold text-sm">V</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className={`${isMinimized ? 'w-12' : 'w-[257px]'} h-px bg-hotel-divider mx-[10px] mb-[10px]`} />

      {/* Toggle Button */}
      <div className="flex justify-end px-2 mb-2">
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 rounded hover:bg-gray-200 transition-colors"
          title={isMinimized ? "Expand sidebar" : "Minimize sidebar"}
        >
          {isMinimized ? (
            <ChevronsRight size={16} className="text-gray-600" />
          ) : (
            <ChevronsLeft size={16} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex flex-col gap-[2px] px-[10px]">
        {/* Daily Prices */}
        {navigationItems.filter(item => item.id === "daily-prices").map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith("/dashboard/property/");
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center ${isMinimized ? 'justify-center px-[11px]' : 'gap-3 px-[11px]'} py-[10px] rounded border-0 transition-colors ${
                isActive ? "bg-hotel-brand-dark text-white" : "bg-hotel-sidebar-bg text-black hover:bg-gray-100"
              }`}
              title={isMinimized ? item.label : undefined}
            >
              <item.icon size={18} color={isActive ? "white" : "black"} />
              {!isMinimized && (
                <span className="text-[15px] font-semibold leading-none">{item.label}</span>
              )}
            </button>
          );
        })}

        {/* Change Prices Button - Right below Daily Prices */}
        <button
          onClick={() => {
            if (property?.id) {
              navigate(`/dashboard/change-prices/${property.id}`);
            } else {
              navigate("/dashboard/change-prices");
            }
          }}
          className={`flex items-center ${isMinimized ? 'justify-center px-[11px]' : 'gap-3 px-[11px]'} py-[10px] rounded border-0 transition-colors ${
            location.pathname.startsWith("/dashboard/change-prices") 
              ? "bg-hotel-brand-dark text-white" 
              : "bg-hotel-sidebar-bg text-black hover:bg-gray-100"
          }`}
          title={isMinimized ? "Change Prices" : undefined}
        >
          <Edit3 size={18} color={location.pathname.startsWith("/dashboard/change-prices") ? "white" : "black"} />
          {!isMinimized && (
            <span className="text-[15px] font-semibold leading-none">Change Prices</span>
          )}
        </button>


        {/* Analytics submenu */}
        <div className="mt-[2px]">
          <button
            onClick={() => isMinimized ? handleMinimizedClick("/dashboard/analytics/performance") : setAnalyticsOpen((o) => !o)}
            aria-expanded={analyticsOpen}
            className={`w-full flex items-center ${isMinimized ? 'justify-center px-[11px]' : 'justify-between px-[11px]'} py-[10px] rounded border-0 transition-colors ${
              location.pathname.startsWith("/dashboard/analytics") ? "bg-hotel-brand-dark text-white" : "bg-hotel-sidebar-bg text-black hover:bg-gray-100"
            }`}
            title={isMinimized ? "Analytics" : undefined}
          >
            <span className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'}`}>
              <BarChart3 size={18} color={location.pathname.startsWith("/dashboard/analytics") ? "white" : "black"} />
              {!isMinimized && (
                <span className="text-[15px] font-semibold leading-none">Analytics</span>
              )}
            </span>
            {!isMinimized && (
              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${analyticsOpen ? "rotate-180" : "rotate-0"}`}
                color={location.pathname.startsWith("/dashboard/analytics") ? "white" : "black"}
              />
            )}
          </button>
          {analyticsOpen && !isMinimized && (
            <div className="mt-1 pl-9 pr-2 flex flex-col gap-1">
              {/* Performance */}
              <button
                onClick={() => handleNavigation("/dashboard/analytics/performance")}
                className={`flex items-center gap-2 px-2 py-2 rounded transition-colors text-sm ${
                  location.pathname === "/dashboard/analytics/performance" ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-black"
                }`}
              >
                <BarChart3 size={16} color={location.pathname === "/dashboard/analytics/performance" ? "white" : "black"} />
                <span>Performance</span>
              </button>
              {/* Pickup */}
              <button
                onClick={() => handleNavigation("/dashboard/analytics/pickup")}
                className={`flex items-center gap-2 px-2 py-2 rounded transition-colors text-sm ${
                  location.pathname === "/dashboard/analytics/pickup" ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-black"
                }`}
              >
                <TrendingUp size={16} color={location.pathname === "/dashboard/analytics/pickup" ? "white" : "black"} />
                <span>Pickup</span>
              </button>
            </div>
          )}
        </div>

        {/* Hotel Management Section */}
        <div className="mt-[10px]">
          <button
            onClick={() => {
              if (isMinimized) {
                // If minimized, expand the sidebar and open hotel management
                setIsMinimized(false);
                setHotelManagementOpen(true);
              } else {
                // If expanded, just toggle hotel management
                setHotelManagementOpen((o) => !o);
              }
            }}
            aria-expanded={hotelManagementOpen}
            className={`w-full flex items-center ${isMinimized ? 'justify-center px-[11px]' : 'justify-between px-[11px]'} py-[10px] rounded border-0 transition-colors ${
              location.pathname.startsWith("/dashboard/hotel-information") || location.pathname.startsWith("/dashboard/competitors") || location.pathname.startsWith("/dashboard/special-offers") || location.pathname.startsWith("/dashboard/dynamic-setup") || location.pathname.startsWith("/dashboard/length-of-stay") || location.pathname.startsWith("/dashboard/available-rates") || location.pathname.startsWith("/dashboard/msp-management") ? "bg-hotel-brand-dark text-white" : "bg-hotel-sidebar-bg text-black hover:bg-gray-100"
            }`}
            title={isMinimized ? "Hotel Management" : undefined}
          >
            <span className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'}`}>
              <Settings size={18} color={location.pathname.startsWith("/dashboard/hotel-information") || location.pathname.startsWith("/dashboard/competitors") || location.pathname.startsWith("/dashboard/special-offers") || location.pathname.startsWith("/dashboard/dynamic-setup") || location.pathname.startsWith("/dashboard/length-of-stay") || location.pathname.startsWith("/dashboard/available-rates") || location.pathname.startsWith("/dashboard/msp-management") ? "white" : "black"} />
              {!isMinimized && (
                <span className="text-[15px] font-semibold leading-none">
                  Hotel Management
                </span>
              )}
            </span>
            {!isMinimized && (
              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${hotelManagementOpen ? "rotate-180" : "rotate-0"}`}
                color={location.pathname.startsWith("/dashboard/hotel-information") || location.pathname.startsWith("/dashboard/competitors") || location.pathname.startsWith("/dashboard/special-offers") || location.pathname.startsWith("/dashboard/dynamic-setup") || location.pathname.startsWith("/dashboard/length-of-stay") || location.pathname.startsWith("/dashboard/available-rates") || location.pathname.startsWith("/dashboard/msp-management") ? "white" : "black"}
              />
            )}
          </button>
          
          {/* Hotel Management Sub-options */}
          {hotelManagementOpen && !isMinimized && (
            <div className="mt-1 pl-9 pr-2 flex flex-col gap-1">
              {hotelManagementItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    className={`flex items-center px-2 py-2 rounded transition-colors text-sm ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-100 text-black"
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className={`${isMinimized ? 'w-12' : 'w-[257px]'} h-px bg-hotel-divider mx-[10px] my-[10px]`} />

      {/* Account Navigation */}
      <div className="flex flex-col gap-[2px] px-[10px]">
        {accountItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center ${isMinimized ? 'justify-center px-[11px]' : 'gap-3 px-[11px]'} py-[10px] rounded border-0 transition-colors ${
                isActive ? "bg-hotel-brand-dark text-white" : "bg-hotel-sidebar-bg text-black hover:bg-gray-100"
              }`}
              title={isMinimized ? item.label : undefined}
            >
              <item.icon size={18} color={isActive ? "white" : "black"} />
              {!isMinimized && (
                <span className="text-[15px] font-normal leading-none">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

    </div>
  );
}
