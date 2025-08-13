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
import Terms from "./pages/onboarding/Terms";
import VerifyEmail from "./pages/onboarding/VerifyEmail";
import HotelInformation from "./pages/onboarding/HotelInformation";
import PMSIntegration from "./pages/onboarding/PMSIntegration";
import PMSInformation from "./pages/onboarding/PMSInformation";
import SelectPlan from "./pages/onboarding/SelectPlan";
import Payment from "./pages/onboarding/Payment";
import AddCompetitor from "./pages/onboarding/AddCompetitor";
import MSPOnboarding from "./pages/onboarding/MSPOnboarding";
import WelcomeComplete from "./pages/onboarding/WelcomeComplete";
import NotFound from "./pages/NotFound";

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
            <Route path="/terms" element={<Terms />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/hotel-information" element={<HotelInformation />} />
            <Route path="/pms-integration" element={<PMSIntegration />} />
            <Route path="/pms-information" element={<PMSInformation />} />
            <Route path="/select-plan" element={<SelectPlan />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/add-competitor" element={<AddCompetitor />} />
            <Route path="/msp" element={<MSPOnboarding />} />
            <Route path="/welcome-complete" element={<WelcomeComplete />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
