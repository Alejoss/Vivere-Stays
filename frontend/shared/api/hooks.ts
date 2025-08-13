import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from './auth';
import { profilesService, ProfileUpdateRequest, HotelInformation, PMSIntegrationData, MSPData, OnboardingProgressUpdate } from './profiles';
import { LoginRequest, RegisterRequest } from './types';

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

// Utility hook to get current user
export const useCurrentUser = () => {
  const user = authService.getCurrentUser();
  return { user, isAuthenticated: authService.isAuthenticated() };
}; 