import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getLocalStorageItem, setLocalStorageItem } from "../../../shared/localStorage";
import DashboardLayout from "../../components/dashboard/Layout";
import PropertyList from "./PropertyList";
import { useUserProperties } from "../../../shared/api/hooks";

export default function DashboardRedirect() {
  const navigate = useNavigate();
  const { data: userPropertiesData, isLoading } = useUserProperties();

  useEffect(() => {
    const selectedPropertyId = getLocalStorageItem<string>("selectedPropertyId");
    if (selectedPropertyId) {
      navigate(`/dashboard/property/${selectedPropertyId}`, { replace: true });
      return;
    }

    // If no selected property in localStorage, use the latest user property from API
    if (!isLoading && userPropertiesData?.properties && userPropertiesData.properties.length > 0) {
      // API is ordered newest first in backend; pick first
      const latest = userPropertiesData.properties[0];
      try {
        setLocalStorageItem("selectedPropertyId", latest.id);
        // Store minimal property info; PropertyContext validates id and name
        setLocalStorageItem("property_data", latest as any);
      } catch (e) {
        // Ignore storage errors
      }
      navigate(`/dashboard/property/${latest.id}`, { replace: true });
    }
  }, [navigate, isLoading, userPropertiesData]);

  // Fallback: show the property list inside the dashboard layout
  return (
    <DashboardLayout>
      <PropertyList />
    </DashboardLayout>
  );
}


