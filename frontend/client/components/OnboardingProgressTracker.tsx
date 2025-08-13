import { useEffect, useRef } from 'react';
import { useOnboardingProgress, OnboardingStep } from '../../shared/api/onboarding';

interface OnboardingProgressTrackerProps {
  currentStep: OnboardingStep;
  onStepComplete?: () => void;
}

export const OnboardingProgressTracker: React.FC<OnboardingProgressTrackerProps> = ({
  currentStep,
  onStepComplete,
}) => {
  const { updateStep, progress } = useOnboardingProgress();
  const lastUpdatedStep = useRef<OnboardingStep | null>(null);

  useEffect(() => {
    // Only update if the step has actually changed and we haven't already updated it
    if (currentStep !== lastUpdatedStep.current) {
      const updateProgress = async () => {
        try {
          await updateStep(currentStep);
          lastUpdatedStep.current = currentStep;
          onStepComplete?.();
        } catch (error) {
          console.error('Failed to update onboarding progress:', error);
        }
      };

      updateProgress();
    }
  }, [currentStep]); // Remove updateStep and onStepComplete from dependencies

  // This component doesn't render anything - it just tracks progress
  return null;
};

export default OnboardingProgressTracker;
