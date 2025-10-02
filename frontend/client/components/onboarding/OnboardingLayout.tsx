import { PropertyProvider } from "../../../shared/PropertyContext";
import WhatsAppButton from "../ui/WhatsAppButton";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <PropertyProvider>
      {children}
      <WhatsAppButton
        phoneNumber="593989375445"
        message="Hi! I need help with my Vivere Stays onboarding process."
        position="bottom-right"
      />
    </PropertyProvider>
  );
}
