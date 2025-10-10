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
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as React from "react";
import { useContext } from "react";
import { PropertyContext, PropertyContextType } from "../../../shared/PropertyContext";
import { ConnectionContext } from '../../../shared/ConnectionContext';
import LanguageSwitcher from "../LanguageSwitcher";

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
  const { t } = useTranslation(['dashboard', 'common']);
  const [analyticsOpen, setAnalyticsOpen] = React.useState(() => location.pathname.startsWith("/dashboard/analytics"));
  const [hotelManagementOpen, setHotelManagementOpen] = React.useState(() => location.pathname.startsWith("/dashboard/hotel-information") || location.pathname.startsWith("/dashboard/competitors") || location.pathname.startsWith("/dashboard/special-offers") || location.pathname.startsWith("/dashboard/dynamic-setup") || location.pathname.startsWith("/dashboard/length-of-stay") || location.pathname.startsWith("/dashboard/available-rates") || location.pathname.startsWith("/dashboard/msp-management"));
  const [isMinimized, setIsMinimized] = React.useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  
  // Get property from context
  const context = useContext(PropertyContext) as PropertyContextType | undefined;
  const connectionContext = useContext(ConnectionContext);
  const property = context?.property;
  const isConnected = connectionContext?.isConnected ?? true;
  const setIsConnected = connectionContext?.setIsConnected ?? (() => {});

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

  const toggleConnection = () => {
    setIsConnected(!isConnected);
  };

  const handleLogout = () => {
    navigate("/logout");
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleMobileNavigation = (path: string) => {
    handleNavigation(path);
    closeMobileMenu();
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-hotel-border-light">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-hotel-brand-dark rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <h1 className="text-lg font-bold text-hotel-brand">
              {property?.name || "Hotel"}
            </h1>
          </div>

          {/* Hamburger Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X size={24} className="text-gray-600" />
            ) : (
              <Menu size={24} className="text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-black bg-opacity-50" onClick={closeMobileMenu}>
            <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Mobile Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{t('dashboard:navigation.menu')}</h2>
                <button
                  onClick={closeMobileMenu}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>

              {/* Connection Status */}
              <div className="p-4 border-b border-gray-200">
                <button
                  onClick={toggleConnection}
                  className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isConnected
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="font-medium">
                    {isConnected ? t('dashboard:navigation.connected') : t('dashboard:navigation.disconnected')}
                  </span>
                </button>
              </div>

              {/* Navigation Items */}
              <div className="p-4 space-y-2">
                {/* Daily Prices */}
                {navigationItems.filter(item => item.id === "daily-prices").map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith("/dashboard/property/");
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMobileNavigation(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive ? "bg-hotel-brand-dark text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{t('dashboard:navigation.dailyPrices')}</span>
                    </button>
                  );
                })}

                {/* Change Prices */}
                <button
                  onClick={() => {
                    if (property?.id) {
                      handleMobileNavigation(`/dashboard/change-prices/${property.id}`);
                    } else {
                      handleMobileNavigation("/dashboard/change-prices");
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    location.pathname.startsWith("/dashboard/change-prices") 
                      ? "bg-hotel-brand-dark text-white" 
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Edit3 size={20} />
                  <span className="font-medium">{t('dashboard:navigation.changePrices')}</span>
                </button>

                {/* Analytics */}
                <div>
                  <button
                    onClick={() => setAnalyticsOpen(!analyticsOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      location.pathname.startsWith("/dashboard/analytics") 
                        ? "bg-hotel-brand-dark text-white" 
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BarChart3 size={20} />
                      <span className="font-medium">{t('dashboard:navigation.analytics')}</span>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-200 ${analyticsOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  </button>
                  {analyticsOpen && (
                    <div className="mt-2 ml-4 space-y-1">
                      <button
                        onClick={() => handleMobileNavigation("/dashboard/analytics/performance")}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                          location.pathname === "/dashboard/analytics/performance" 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <BarChart3 size={16} />
                        <span>{t('dashboard:navigation.performance')}</span>
                      </button>
                      <button
                        onClick={() => handleMobileNavigation("/dashboard/analytics/pickup")}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors ${
                          location.pathname === "/dashboard/analytics/pickup" 
                            ? "bg-blue-600 text-white" 
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <TrendingUp size={16} />
                        <span>{t('dashboard:navigation.pickup')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Hotel Management */}
                <div>
                  <button
                    onClick={() => setHotelManagementOpen(!hotelManagementOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                      location.pathname.startsWith("/dashboard/hotel-information") || 
                      location.pathname.startsWith("/dashboard/competitors") || 
                      location.pathname.startsWith("/dashboard/special-offers") || 
                      location.pathname.startsWith("/dashboard/dynamic-setup") || 
                      location.pathname.startsWith("/dashboard/length-of-stay") || 
                      location.pathname.startsWith("/dashboard/available-rates") || 
                      location.pathname.startsWith("/dashboard/msp-management")
                        ? "bg-hotel-brand-dark text-white" 
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings size={20} />
                      <span className="font-medium">{t('dashboard:navigation.hotelManagement')}</span>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-200 ${hotelManagementOpen ? "rotate-180" : "rotate-0"}`}
                    />
                  </button>
                  {hotelManagementOpen && (
                    <div className="mt-2 ml-4 space-y-1">
                      {hotelManagementItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleMobileNavigation(item.path)}
                            className={`w-full flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                              isActive
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <span>{t(`dashboard:navigation.${item.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/-/g, '')}`)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Account Items */}
                <div className="pt-4 border-t border-gray-200">
                  {accountItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleMobileNavigation(item.path)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive ? "bg-hotel-brand-dark text-white" : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <item.icon size={20} />
                        <span className="font-medium">{t(`dashboard:navigation.${item.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/-/g, '')}`)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Language Switcher */}
                <div className="pt-4 border-t border-gray-200">
                  <LanguageSwitcher variant="mobile" />
                </div>

                {/* Logout */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">{t('dashboard:navigation.logout')}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sidebar */}
      <div className={`hidden lg:block ${isMinimized ? 'w-16' : 'w-[277px]'} h-screen bg-hotel-sidebar-bg border-r border-hotel-sidebar-border flex flex-col overflow-hidden transition-all duration-300 ease-in-out`}>
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
                <span className="text-[15px] font-semibold leading-none">{t('dashboard:navigation.dailyPrices')}</span>
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
          title={isMinimized ? t('dashboard:navigation.changePrices') : undefined}
        >
          <Edit3 size={18} color={location.pathname.startsWith("/dashboard/change-prices") ? "white" : "black"} />
          {!isMinimized && (
            <span className="text-[15px] font-semibold leading-none">{t('dashboard:navigation.changePrices')}</span>
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
            title={isMinimized ? t('dashboard:navigation.analytics') : undefined}
          >
            <span className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'}`}>
              <BarChart3 size={18} color={location.pathname.startsWith("/dashboard/analytics") ? "white" : "black"} />
              {!isMinimized && (
                <span className="text-[15px] font-semibold leading-none">{t('dashboard:navigation.analytics')}</span>
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
                <span>{t('dashboard:navigation.performance')}</span>
              </button>
              {/* Pickup */}
              <button
                onClick={() => handleNavigation("/dashboard/analytics/pickup")}
                className={`flex items-center gap-2 px-2 py-2 rounded transition-colors text-sm ${
                  location.pathname === "/dashboard/analytics/pickup" ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-black"
                }`}
              >
                <TrendingUp size={16} color={location.pathname === "/dashboard/analytics/pickup" ? "white" : "black"} />
                <span>{t('dashboard:navigation.pickup')}</span>
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
                  {t('dashboard:navigation.hotelManagement')}
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
                    <span>{t(`dashboard:navigation.${item.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/-/g, '')}`)}</span>
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
              title={isMinimized ? t(`dashboard:navigation.${item.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/-/g, '')}`) : undefined}
            >
              <item.icon size={18} color={isActive ? "white" : "black"} />
              {!isMinimized && (
                <span className="text-[15px] font-normal leading-none">
                  {t(`dashboard:navigation.${item.id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()).replace(/-/g, '')}`)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

    </div>
    </>
  );
}
