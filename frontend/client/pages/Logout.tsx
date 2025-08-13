import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLogout } from "../../shared/api/hooks";
import { useQueryClient } from "@tanstack/react-query";

export default function Logout() {
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        console.log("🔄 Logout: Starting logout process...");
        
        // Clear React Query cache first to prevent stale queries
        queryClient.clear();
        console.log("🧹 Logout: Cleared React Query cache");
        
        // Call the logout API
        await logoutMutation.mutateAsync();
        
        console.log("✅ Logout: Successfully logged out");
        
        // Clear any local storage items
        localStorage.removeItem('access_token');
        localStorage.removeItem('hotelInformationData');
        localStorage.removeItem('hotelDataForPMS');
        
        console.log("🧹 Logout: Cleared local storage");
        
        // Redirect to login page
        navigate("/login");
        
      } catch (error) {
        console.error("❌ Logout: Error during logout:", error);
        
        // Even if logout API fails, clear everything and redirect
        queryClient.clear();
        localStorage.removeItem('access_token');
        localStorage.removeItem('hotelInformationData');
        localStorage.removeItem('hotelDataForPMS');
        
        navigate("/login");
      }
    };

    handleLogout();
  }, [logoutMutation, navigate, queryClient]);

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294859] mx-auto mb-4"></div>
        <p className="text-[#485567] text-lg">Logging out...</p>
      </div>
    </div>
  );
}
