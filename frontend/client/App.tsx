import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terms from "./pages/Terms";
import VerifyEmail from "./pages/VerifyEmail";
import HotelInformation from "./pages/HotelInformation";
import PMSIntegration from "./pages/PMSIntegration";
import SelectPlan from "./pages/SelectPlan";
import Payment from "./pages/Payment";
import AddCompetitor from "./pages/AddCompetitor";
import MSP from "./pages/MSP";
import WelcomeComplete from "./pages/WelcomeComplete";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/hotel-information" element={<HotelInformation />} />
          <Route path="/pms-integration" element={<PMSIntegration />} />
          <Route path="/select-plan" element={<SelectPlan />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/add-competitor" element={<AddCompetitor />} />
          <Route path="/msp" element={<MSP />} />
          <Route path="/welcome-complete" element={<WelcomeComplete />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
