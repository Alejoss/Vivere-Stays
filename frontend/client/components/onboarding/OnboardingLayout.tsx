import { PropertyProvider } from "../../../shared/PropertyContext";

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <PropertyProvider>
      {children}
    </PropertyProvider>
  );
}
