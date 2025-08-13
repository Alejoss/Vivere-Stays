import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetOnboardingProgress, useUpdateOnboardingProgress } from './hooks';

// Define the onboarding steps in order
export const ONBOARDING_STEPS = [
  'register',
  'verify_email',
  'hotel_information',
  'pms_integration',
  'select_plan',
  'payment',
  'add_competitor',
  'msp',
  'complete',
] as const;

export type OnboardingStep = typeof ONBOARDING_STEPS[number];

// Map step names to routes
export const STEP_ROUTES: Record<OnboardingStep, string> = {
  register: '/register',
  verify_email: '/verify-email',
  hotel_information: '/hotel-information',
  pms_integration: '/pms-integration',
  select_plan: '/select-plan',
  payment: '/payment',
  add_competitor: '/add-competitor',
  msp: '/msp',
  complete: '/welcome-complete',
};

export const useOnboardingProgress = () => {
  const navigate = useNavigate();
  const { data: progress, isLoading, error } = useGetOnboardingProgress();
  const updateProgress = useUpdateOnboardingProgress();

  const updateStep = useCallback(async (step: OnboardingStep) => {
    try {
      await updateProgress.mutateAsync({ step });
    } catch (error) {
      console.error('Failed to update onboarding progress:', error);
    }
  }, [updateProgress]);

  const navigateToStep = useCallback((step: OnboardingStep) => {
    console.log('🔍 navigateToStep: Called with step:', step);
    const route = STEP_ROUTES[step];
    console.log('🔍 navigateToStep: Found route:', route);
    if (route) {
      console.log('🚀 navigateToStep: Navigating to:', route);
      navigate(route);
    } else {
      console.warn('⚠️ navigateToStep: No route found for step:', step);
    }
  }, [navigate]);

  const getCurrentStepIndex = useCallback(() => {
    if (!progress) return 0;
    return ONBOARDING_STEPS.indexOf(progress.current_step as OnboardingStep);
  }, [progress]);

  const getNextStep = useCallback((): OnboardingStep | null => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex >= ONBOARDING_STEPS.length - 1) {
      return null;
    }
    return ONBOARDING_STEPS[currentIndex + 1];
  }, [getCurrentStepIndex]);

  const getPreviousStep = useCallback((): OnboardingStep | null => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex <= 0) {
      return null;
    }
    return ONBOARDING_STEPS[currentIndex - 1];
  }, [getCurrentStepIndex]);

  const isStepCompleted = useCallback((step: OnboardingStep): boolean => {
    if (!progress) return false;
    const stepIndex = ONBOARDING_STEPS.indexOf(step);
    const currentIndex = getCurrentStepIndex();
    return stepIndex < currentIndex;
  }, [progress, getCurrentStepIndex]);

  const isCurrentStep = useCallback((step: OnboardingStep): boolean => {
    if (!progress) return false;
    return progress.current_step === step;
  }, [progress]);

  return {
    progress,
    isLoading,
    error,
    updateStep,
    navigateToStep,
    getCurrentStepIndex,
    getNextStep,
    getPreviousStep,
    isStepCompleted,
    isCurrentStep,
    ONBOARDING_STEPS,
    STEP_ROUTES,
  };
};

// Hook to automatically redirect users to their current step
export const useOnboardingRedirect = () => {
  const { progress, isLoading } = useOnboardingProgress();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && progress && !progress.completed) {
      const currentStep = progress.current_step as OnboardingStep;
      const currentRoute = STEP_ROUTES[currentStep];
      
      // Only redirect if we're not already on the correct route
      if (currentRoute && window.location.pathname !== currentRoute) {
        navigate(currentRoute);
      }
    }
  }, [progress, isLoading, navigate]);

  return { progress, isLoading };
};
