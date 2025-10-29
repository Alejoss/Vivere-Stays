import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from './auth';
import { profilesService, ProfileUpdateRequest, HotelInformation, PMSIntegrationData, MSPData, OnboardingProgressUpdate } from './profiles';
import { LoginRequest, RegisterRequest } from './types';
import { dynamicPricingService } from './dynamic';

// Query keys
export const queryKeys = {
  auth: {
    profile: ['auth', 'profile'],
    check: ['auth', 'check'],
    user: ['auth', 'user'],
  },
  profiles: {
    profile: ['profiles', 'profile'],
    properties: ['profiles', 'properties'],
  },
};

// Authentication hooks
export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.setQueryData(queryKeys.auth.user, {
        id: data.id,
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: RegisterRequest) => authService.register(userData),
    onSuccess: (data) => {
      // Set user data after successful registration
      queryClient.setQueryData(queryKeys.auth.user, data.user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
  });
};

export const useCheckUserExists = () => {
  return useMutation({
    mutationFn: ({ email, username }: { email?: string; username?: string }) => 
      authService.checkUserExists(email, username),
  });
};

export const useGoogleLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (credential: string) => authService.googleLogin(credential),
    onSuccess: (data) => {
      // Invalidate and refetch user data
      queryClient.setQueryData(queryKeys.auth.user, {
        id: data.id,
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.profile });
    },
  });
};

export const useCheckAuth = () => {
  return useQuery({
    queryKey: queryKeys.auth.check,
    queryFn: () => authService.checkAuth(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};

// Profile hooks
export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.profiles.profile,
    queryFn: () => profilesService.getProfile(),
    enabled: authService.isAuthenticated(),
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (profileData: ProfileUpdateRequest) => 
      profilesService.updateProfile(profileData),
    onSuccess: (data) => {
      // Update cached profile data
      queryClient.setQueryData(queryKeys.profiles.profile, data);
    },
  });
};

export const useCreateHotel = () => {
  return useMutation({
    mutationFn: (data: HotelInformation) => profilesService.createHotel(data),
  });
};

// PMS Integration hooks
export const useCreatePMSIntegration = () => {
  return useMutation({
    mutationFn: (data: PMSIntegrationData) => profilesService.createPMSIntegration(data),
  });
};

export const usePMSList = () => {
  return useQuery({
    queryKey: ['pms-list'],
    queryFn: () => profilesService.getPMSList(),
  });
};

export const useCreateMSP = () => {
  return useMutation({
    mutationFn: (data: MSPData) => profilesService.createMSP(data),
  });
};

export const useGetMSPEntries = () => {
  return useQuery({
    queryKey: ['msp-entries'],
    queryFn: () => profilesService.getMSPEntries(),
  });
};

export const useGetOnboardingProgress = () => {
  return useQuery({
    queryKey: ['onboarding-progress'],
    queryFn: () => profilesService.getOnboardingProgress(),
  });
};

export const useUpdateOnboardingProgress = () => {
  return useMutation({
    mutationFn: (data: OnboardingProgressUpdate) => 
      profilesService.updateOnboardingProgress(data),
  });
};

export const useCreateBulkCompetitors = () => {
  return useMutation({
    mutationFn: (data: { competitor_names: string[] }) =>
      profilesService.createBulkCompetitors(data),
  });
};

export const useCreateCompetitorCandidates = () => {
  return useMutation({
    mutationFn: (data: { 
      competitor_names: string[];
      property_id?: string;
      suggested_by_user?: boolean;
    }) =>
      dynamicPricingService.createCompetitorCandidates(data),
  });
};

export const useUserProperties = () => {
  return useQuery({
    queryKey: ['user-properties'],
    queryFn: () => profilesService.getUserProperties(),
  });
};

export const usePMSIntegrations = () => {
  return useQuery({
    queryKey: ['pms-integrations'],
    queryFn: () => profilesService.getPMSIntegrations(),
  });
};

// Dynamic Pricing hooks
export const usePriceHistory = (propertyId: string, year?: number, month?: number, refreshKey?: number) => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'price-history', propertyId, year, month, refreshKey],
    queryFn: () => dynamicPricingService.getPriceHistory(propertyId, year, month),
    enabled: !!propertyId && !!year && !!month, // Only run when all required params are present
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useMSPPriceHistory = (propertyId: string, year?: number, month?: number, refreshKey?: number, shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'msp-price-history', propertyId, year, month, refreshKey],
    queryFn: () => dynamicPricingService.getMSPPriceHistory(propertyId, year, month),
    enabled: !!propertyId && !!year && !!month && shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCompetitorAveragePriceHistory = (propertyId: string, year?: number, month?: number, refreshKey?: number, shouldFetch: boolean = true) => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'competitor-average-price-history', propertyId, year, month, refreshKey],
    queryFn: () => dynamicPricingService.getCompetitorAveragePriceHistory(propertyId, year, month),
    enabled: !!propertyId && !!year && !!month && shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProperties = () => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'properties'],
    queryFn: () => dynamicPricingService.getProperties(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useProperty = (propertyId: string) => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'property', propertyId],
    queryFn: () => dynamicPricingService.getProperty(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Single-date price history (includes occupancy and occupancy_level)
export const usePriceForDate = (propertyId: string | undefined, dateISO: string | undefined, refreshKey?: number) => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'price-for-date', propertyId, dateISO, refreshKey],
    queryFn: () => dynamicPricingService.getPriceForDate(propertyId as string, dateISO as string),
    enabled: !!propertyId && !!dateISO,
    staleTime: 5 * 60 * 1000,
  });
};

export const useDynamicPMSList = () => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'pms-list'],
    queryFn: () => dynamicPricingService.getPMSList(),
    staleTime: 10 * 60 * 1000, // 10 minutes (PMS list doesn't change often)
  });
};

export const useDynamicMSPEntries = () => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'msp-entries'],
    queryFn: () => dynamicPricingService.getMSPEntries(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePropertyMSPEntries = (propertyId: string) => {
  return useQuery({
    queryKey: ['dynamic-pricing', 'property-msp-entries', propertyId],
    queryFn: () => dynamicPricingService.getPropertyMSPEntries(propertyId),
    enabled: !!propertyId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateDynamicMSP = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { periods: Array<{ fromDate: string; toDate: string; price: string; periodTitle: string }> }) => 
      dynamicPricingService.createMSP(data),
    onSuccess: () => {
      // Invalidate MSP entries after creating new ones
      queryClient.invalidateQueries({ queryKey: ['dynamic-pricing', 'msp-entries'] });
    },
  });
};

// Utility hook to get current user
export const useCurrentUser = () => {
  const user = authService.getCurrentUser();
  return { user, isAuthenticated: authService.isAuthenticated() };
}; 