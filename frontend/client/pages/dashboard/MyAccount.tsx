import { useState, useEffect } from "react";
import { User, Mail, Calendar, Lock, Eye, EyeOff, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { profilesService, ProfileData, PasswordChangeRequest } from "../../../shared/api/profiles";
import { useToast } from "../../../client/hooks/use-toast";

// Password Strength Indicator Component
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const strength = {
    hasMinLength: password.length >= 8,
    hasUpperLower: /[a-z]/.test(password) && /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const StrengthItem = ({
    label,
    isValid,
  }: {
    label: string;
    isValid: boolean;
  }) => (
    <div className="flex items-center gap-2">
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 11"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="5" cy="5.5" r="5" fill={isValid ? "#16B257" : "#D7DFE8"} />
      </svg>
      <span
        className={`text-xs font-normal ${isValid ? "text-[#16B257]" : "text-[#9CAABD]"}`}
      >
        {label}
      </span>
    </div>
  );

  // Only show if user has started typing
  if (!password) return null;

  return (
    <div className="mt-3 space-y-2">
      <StrengthItem label="At least 8 characters" isValid={strength.hasMinLength} />
      <StrengthItem
        label="Mix of uppercase and lowercase letters"
        isValid={strength.hasUpperLower}
      />
      <StrengthItem label="At least one number" isValid={strength.hasNumber} />
    </div>
  );
};

export default function MyAccount() {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordErrors, setPasswordErrors] = useState<{
    current_password?: string;
    new_password?: string;
    confirm_password?: string;
    general?: string;
  }>({});
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await profilesService.getProfile();
      setProfile(profileData);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    // Clear errors when user starts typing
    if (passwordErrors[field as keyof typeof passwordErrors]) {
      setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (passwordErrors.general) {
      setPasswordErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  const validatePasswordForm = () => {
    const errors: typeof passwordErrors = {};

    if (!passwordForm.current_password) {
      errors.current_password = "Current password is required";
    }

    if (!passwordForm.new_password) {
      errors.new_password = "New password is required";
    } else {
      // Check password strength requirements (matching onboarding requirements)
      const hasMinLength = passwordForm.new_password.length >= 8;
      const hasUpperLower = /[a-z]/.test(passwordForm.new_password) && /[A-Z]/.test(passwordForm.new_password);
      const hasNumber = /\d/.test(passwordForm.new_password);

      if (!hasMinLength || !hasUpperLower || !hasNumber) {
        const missingRequirements = [];
        if (!hasMinLength) missingRequirements.push("at least 8 characters");
        if (!hasUpperLower) missingRequirements.push("mix of uppercase and lowercase letters");
        if (!hasNumber) missingRequirements.push("at least one number");
        
        errors.new_password = `Password must contain: ${missingRequirements.join(", ")}`;
      }
    }

    if (!passwordForm.confirm_password) {
      errors.confirm_password = "Please confirm your new password";
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = "Passwords do not match";
    }

    if (passwordForm.current_password === passwordForm.new_password) {
      errors.new_password = "New password must be different from current password";
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) {
      return;
    }

    try {
      setPasswordLoading(true);
      setPasswordErrors({});
      
      const passwordData: PasswordChangeRequest = {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      };

      await profilesService.changePassword(passwordData);
      
      setPasswordSuccess(true);
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      
      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      // Hide success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
      
    } catch (error: any) {
      console.error("Error changing password:", error);
      
      // The API client interceptor transforms errors into ApiError format
      // Check for both original axios error structure and transformed ApiError structure
      let errorMessage = null;
      let errorDetails = null;
      
      if (error.response?.data) {
        // Original axios error structure
        errorMessage = error.response.data.error;
        errorDetails = error.response.data.details;
      } else if (error.error) {
        // Transformed ApiError structure from interceptor
        errorMessage = error.error;
        errorDetails = error.detail;
      }
      
      console.error("Error message:", errorMessage);
      console.error("Error details:", errorDetails);
      
      if (errorMessage) {
        // Handle password validation errors with details
        if (errorDetails && Array.isArray(errorDetails)) {
          setPasswordErrors({
            new_password: errorDetails.join(", "),
          });
        }
        // Handle current password incorrect error
        else if (errorMessage === 'Current password is incorrect') {
          setPasswordErrors({
            current_password: errorMessage,
          });
        }
        // Handle new password requirements error
        else if (errorMessage === 'New password does not meet requirements') {
          setPasswordErrors({
            new_password: errorMessage,
          });
        }
        // Handle any other specific error message
        else {
          setPasswordErrors({
            general: errorMessage,
          });
        }
      } else {
        // Fallback for unknown error structure
        setPasswordErrors({
          general: "Failed to change password. Please try again.",
        });
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#6B7280]">Failed to load profile information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-300 mb-8" />

      <div className="px-6">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#294758]">My Account</h1>
          <p className="text-[#6B7280] mt-2">Manage your account settings and security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <div className="bg-white border border-[#E4E4E4] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#294758] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#294758]">Profile Information</h2>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <Mail className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-[12px] text-[#6B7280] uppercase tracking-wide">Email</p>
                  <p className="text-base font-normal text-[#111827]">{profile.user.email}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <Calendar className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-[12px] text-[#6B7280] uppercase tracking-wide">Member Since</p>
                  <p className="text-base font-normal text-[#111827]">
                    {formatDate(profile.user.date_joined)}
                  </p>
                </div>
              </div>

              {/* Name */}
              <div className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <User className="w-5 h-5 text-[#6B7280]" />
                <div>
                  <p className="text-[12px] text-[#6B7280] uppercase tracking-wide">Name</p>
                  <p className="text-base font-normal text-[#111827]">
                    {profile.user.first_name && profile.user.last_name
                      ? `${profile.user.first_name} ${profile.user.last_name}`
                      : profile.user.username}
                  </p>
                </div>
              </div>

              {/* Properties Count */}
              <div className="flex items-center gap-3 p-4 bg-[#F9FAFB] rounded-lg">
                <div className="w-5 h-5 bg-[#294758] rounded-full flex items-center justify-center">
                  <span className="text-white text-[12px] font-bold">{profile.properties_count}</span>
                </div>
                <div>
                  <p className="text-[12px] text-[#6B7280] uppercase tracking-wide">Properties</p>
                  <p className="text-base font-normal text-[#111827]">
                    {profile.properties_count} {profile.properties_count === 1 ? 'property' : 'properties'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-[#E4E4E4] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[#294758] rounded-full flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#294758]">Change Password</h2>
            </div>

            {passwordSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <p className="text-green-800 font-semibold">Password changed successfully!</p>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.current_password}
                    onChange={(e) => handlePasswordChange("current_password", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#294758] focus:border-transparent ${
                      passwordErrors.current_password ? "border-red-500" : "border-[#D1D5DB]"
                    }`}
                    placeholder="Enter your current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordErrors.current_password && (
                  <p className="text-red-600 text-[12px] mt-1">{passwordErrors.current_password}</p>
                )}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.new_password}
                    onChange={(e) => handlePasswordChange("new_password", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#294758] focus:border-transparent ${
                      passwordErrors.new_password ? "border-red-500" : "border-[#D1D5DB]"
                    }`}
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={passwordForm.new_password} />
                {passwordErrors.new_password && (
                  <p className="text-red-600 text-[12px] mt-1">{passwordErrors.new_password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-[#374151] mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirm_password}
                    onChange={(e) => handlePasswordChange("confirm_password", e.target.value)}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#294758] focus:border-transparent ${
                      passwordErrors.confirm_password ? "border-red-500" : "border-[#D1D5DB]"
                    }`}
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#6B7280] hover:text-[#374151]"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordErrors.confirm_password && (
                  <p className="text-red-600 text-[12px] mt-1">{passwordErrors.confirm_password}</p>
                )}
              </div>

              {/* General Error */}
              {passwordErrors.general && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{passwordErrors.general}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-[#294758] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#1F2937] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {passwordLoading ? "Changing Password..." : "Change Password"}
              </button>
            </form>

            {/* Password Requirements */}
            <div className="mt-6 p-4 bg-[#F9FAFB] rounded-lg">
              <h3 className="text-sm font-semibold text-[#374151] mb-2">Password Requirements:</h3>
              <ul className="text-[12px] text-[#6B7280] space-y-1">
                <li>• At least 8 characters long</li>
                <li>• Mix of uppercase and lowercase letters</li>
                <li>• At least one number</li>
                <li>• Cannot be the same as your current password</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
