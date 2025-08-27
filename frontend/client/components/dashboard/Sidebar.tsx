import {
  Calendar,
  BarChart3,
  Globe,
  TrendingUp,
  Activity,
  User,
  Bell,
  HelpCircle,
  LogOut,
  Building2,
  ChevronDown,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import * as React from "react";
import { useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";

const navigationItems = [
  { id: "daily-prices", label: "Daily Prices", icon: Calendar, path: "/dashboard/property" },
  // Analytics handled as a submenu below
  { id: "ota", label: "OTA", icon: Globe, path: "/dashboard/ota" },
  { id: "forecast", label: "Forecast", icon: Activity, path: "/dashboard/forecast" },
];

const accountItems = [
  { id: "my-account", label: "My Account", icon: User, active: false },
  { id: "notifications", label: "Notifications", icon: Bell, active: false },
  { id: "support", label: "Support", icon: HelpCircle, active: false },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [analyticsOpen, setAnalyticsOpen] = React.useState(() => location.pathname.startsWith("/dashboard/analytics"));
  
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

  return (
    <div className="w-[277px] lg:w-[277px] md:w-64 sm:w-16 h-screen bg-hotel-sidebar-bg border-r border-hotel-sidebar-border flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="flex justify-center items-center px-[10px] pt-[34px] pb-[24px]">
        <img
          src="https://api.builder.io/api/v1/image/assets/TEMP/ccc50d58fcb7f83e65dfa6899517f0bb70d365f9?width=374"
          alt="Vivere Stays Logo"
          className="w-[187px] h-16"
        />
      </div>

      {/* Divider */}
      <div className="w-[257px] h-px bg-hotel-divider mx-[10px] mb-[10px]" />

      {/* Main Navigation */}
      <div className="flex flex-col gap-[2px] px-[10px]">
        {/* Daily Prices and others (excluding Analytics) */}
        {navigationItems.map((item) => {
          // Special handling for Daily Prices to check both exact path and paths with property ID
          const isActive = item.id === "daily-prices" 
            ? location.pathname === item.path || location.pathname.startsWith("/dashboard/property/")
            : location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center gap-3 px-[11px] py-[10px] rounded border-0 transition-colors ${
                isActive ? "bg-hotel-brand-dark text-white" : "bg-hotel-sidebar-bg text-black hover:bg-gray-100"
              }`}
            >
              <item.icon size={18} color={isActive ? "white" : "black"} />
              <span className="text-[15px] font-semibold leading-none sm:hidden md:block">{item.label}</span>
            </button>
          );
        })}

        {/* Analytics submenu */}
        <div className="mt-[2px]">
          <button
            onClick={() => setAnalyticsOpen((o) => !o)}
            aria-expanded={analyticsOpen}
            className={`w-full flex items-center justify-between px-[11px] py-[10px] rounded border-0 transition-colors ${
              location.pathname.startsWith("/dashboard/analytics") ? "bg-hotel-brand-dark text-white" : "bg-hotel-sidebar-bg text-black hover:bg-gray-100"
            }`}
          >
            <span className="flex items-center gap-3">
              <BarChart3 size={18} color={location.pathname.startsWith("/dashboard/analytics") ? "white" : "black"} />
              <span className="text-[15px] font-semibold leading-none sm:hidden md:block">Analytics</span>
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${analyticsOpen ? "rotate-180" : "rotate-0"}`}
              color={location.pathname.startsWith("/dashboard/analytics") ? "white" : "black"}
            />
          </button>
          {analyticsOpen && (
            <div className="mt-1 pl-9 pr-2 flex flex-col gap-1">
              {/* Performance */}
              <button
                onClick={() => handleNavigation("/dashboard/analytics/performance")}
                className={`flex items-center gap-2 px-2 py-2 rounded transition-colors text-sm ${
                  location.pathname === "/dashboard/analytics/performance" ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-black"
                }`}
              >
                <BarChart3 size={16} color={location.pathname === "/dashboard/analytics/performance" ? "white" : "black"} />
                <span className="sm:hidden md:block">Performance</span>
              </button>
              {/* Pickup */}
              <button
                onClick={() => handleNavigation("/dashboard/analytics/pickup")}
                className={`flex items-center gap-2 px-2 py-2 rounded transition-colors text-sm ${
                  location.pathname === "/dashboard/analytics/pickup" ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-black"
                }`}
              >
                <TrendingUp size={16} color={location.pathname === "/dashboard/analytics/pickup" ? "white" : "black"} />
                <span className="sm:hidden md:block">Pickup</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="w-[257px] h-px bg-hotel-divider mx-[10px] my-[10px]" />

      {/* Account Navigation */}
      <div className="flex flex-col gap-[2px] px-[10px]">
        {accountItems.map((item) => (
          <button
            key={item.id}
            className="flex items-center gap-3 px-[11px] py-[10px] rounded bg-hotel-sidebar-bg text-black hover:bg-gray-100 transition-colors"
          >
            <item.icon size={18} color="black" />
            <span className="text-[15px] font-normal leading-none sm:hidden md:block">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Profile Section */}
      <div className="mx-[11px] mb-[11px]">
        <div className="h-px bg-hotel-divider mb-[10px]" />
        <div className="flex items-center justify-between p-[13px] rounded bg-hotel-sidebar-bg">
          <div className="flex items-center gap-3">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/8186a75627731622327c05369d792a258acfccea?width=90"
              alt="Juan Pérez"
              className="w-[45px] h-[45px] rounded-full"
            />
            <span className="text-[15px] font-normal text-black">
              Juan Pérez
            </span>
          </div>
          <button className="text-red-500 hover:text-red-600 transition-colors">
            <LogOut size={25} />
          </button>
        </div>
      </div>
    </div>
  );
}
