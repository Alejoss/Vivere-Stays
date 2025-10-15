import { PropertyProvider } from "../../../shared/PropertyContext";
import WhatsAppButton from "../ui/WhatsAppButton";
import { useLocation } from "react-router-dom";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const location = useLocation();
  
  // Don't include PropertyProvider for early onboarding steps that don't need property data
  // This prevents 401 errors during registration when user isn't authenticated yet
  const stepsWithoutProperty = [
    '/register',
    '/verify-email',
    '/profile-completion'
  ];
  
  const needsPropertyProvider = !stepsWithoutProperty.includes(location.pathname);
  
  const content = (
    <>
      {children}
      <WhatsAppButton
        phoneNumber="593989375445"
        message="Hi! I need help with my Vivere Stays onboarding process."
        position="bottom-right"
      />
    </>
  );

  return needsPropertyProvider ? (
    <PropertyProvider>
      {content}
    </PropertyProvider>
  ) : (
    content
  );
}
