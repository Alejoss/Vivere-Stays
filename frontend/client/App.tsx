import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Register from "./pages/onboarding/Register";
import ProfileCompletion from "./pages/onboarding/ProfileCompletion";
import Terms from "./pages/onboarding/Terms";
import VerifyEmail from "./pages/onboarding/VerifyEmail";
import HotelInformationOnboarding from "./pages/onboarding/HotelInformationOnboarding";
import PMSIntegration from "./pages/onboarding/PMSIntegration";
import PMSInformation from "./pages/onboarding/PMSInformation";
import SelectPlan from "./pages/onboarding/SelectPlan";
import Payment from "./pages/onboarding/Payment";
import ContactSalesOnboarding from "./pages/onboarding/ContactSalesOnboarding";
import AddCompetitor from "./pages/onboarding/AddCompetitor";
import MSPOnboarding from "./pages/onboarding/MSPOnboarding";
import WelcomeComplete from "./pages/onboarding/WelcomeComplete";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/dashboard/Layout";
import OnboardingLayout from "./components/onboarding/OnboardingLayout";
import DashboardIndex from "./pages/dashboard/Index";
import DashboardRedirect from "./pages/dashboard/DashboardRedirect";
import PropertyList from "./pages/dashboard/PropertyList";
import PropertyDashboard from "./pages/dashboard/PropertyDashboard";
import ChangePrices from "./pages/dashboard/ChangePrices";
import Analytics from "./pages/dashboard/Analytics";
import AnalyticsPerformance from "./pages/dashboard/AnalyticsPerformance";
import AnalyticsPickup from "./pages/dashboard/AnalyticsPickup";
import HotelManagement from "./pages/dashboard/HotelInformation";
import Competitors from "./pages/dashboard/Competitors";
import SpecialOffers from "./pages/dashboard/SpecialOffers";
import DynamicSetup from "./pages/dashboard/DynamicSetup";
import LengthOfStay from "./pages/dashboard/LengthOfStay";
import AvailableRates from "./pages/dashboard/AvailableRates";
import MSPManagement from "./pages/dashboard/MSPManagement";
import Notifications from "./pages/dashboard/Notifications";
import Support from "./pages/dashboard/Support";
import MyAccount from "./pages/dashboard/MyAccount";

const queryClient = new QueryClient();

// Get Google OAuth client ID from environment variable
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const App = () => (
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile-completion" element={<ProfileCompletion />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/hotel-information" element={<OnboardingLayout><HotelInformationOnboarding /></OnboardingLayout>} />
            <Route path="/pms-integration" element={<OnboardingLayout><PMSIntegration /></OnboardingLayout>} />
            <Route path="/pms-information" element={<OnboardingLayout><PMSInformation /></OnboardingLayout>} />
            <Route path="/select-plan" element={<OnboardingLayout><SelectPlan /></OnboardingLayout>} />
            <Route path="/payment" element={<OnboardingLayout><Payment /></OnboardingLayout>} />
            <Route path="/contact-sales" element={<OnboardingLayout><ContactSalesOnboarding /></OnboardingLayout>} />
            <Route path="/add-competitor" element={<OnboardingLayout><AddCompetitor /></OnboardingLayout>} />
            <Route path="/msp" element={<OnboardingLayout><MSPOnboarding /></OnboardingLayout>} />
            <Route path="/welcome-complete" element={<OnboardingLayout><WelcomeComplete /></OnboardingLayout>} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/dashboard/property/:propertyId" element={<DashboardLayout><PropertyDashboard /></DashboardLayout>} />
            <Route path="/dashboard/change-prices/:propertyId" element={<DashboardLayout><ChangePrices /></DashboardLayout>} />
            {/* <Route path="/dashboard/change-prices" element={<DashboardLayout><ChangePrices /></DashboardLayout>} /> */}
            <Route path="/dashboard/analytics" element={<DashboardLayout><Analytics /></DashboardLayout>} />
            <Route path="/dashboard/analytics/performance" element={<DashboardLayout><AnalyticsPerformance /></DashboardLayout>} />
            <Route path="/dashboard/analytics/pickup" element={<DashboardLayout><AnalyticsPickup /></DashboardLayout>} />
            
            {/* Hotel Management Routes */}
            <Route path="/dashboard/hotel-information" element={<DashboardLayout><HotelManagement /></DashboardLayout>} />
            <Route path="/dashboard/competitors" element={<DashboardLayout><Competitors /></DashboardLayout>} />
            <Route path="/dashboard/special-offers" element={<DashboardLayout><SpecialOffers /></DashboardLayout>} />
            <Route path="/dashboard/dynamic-setup" element={<DashboardLayout><DynamicSetup /></DashboardLayout>} />
            <Route path="/dashboard/length-of-stay" element={<DashboardLayout><LengthOfStay /></DashboardLayout>} />
            <Route path="/dashboard/available-rates" element={<DashboardLayout><AvailableRates /></DashboardLayout>} />
            <Route path="/dashboard/msp-management" element={<DashboardLayout><MSPManagement /></DashboardLayout>} />
            
            {/* Account Routes */}
            <Route path="/dashboard/my-account" element={<DashboardLayout><MyAccount /></DashboardLayout>} />
            <Route path="/dashboard/notifications" element={<DashboardLayout><Notifications /></DashboardLayout>} />
            <Route path="/dashboard/support" element={<DashboardLayout><Support /></DashboardLayout>} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
