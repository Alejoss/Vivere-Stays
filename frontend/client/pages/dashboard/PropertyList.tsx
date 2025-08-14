import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserProperties } from "../../../shared/api/hooks";
import { Building2, MapPin, Calendar, ArrowRight } from "lucide-react";

export default function PropertyList() {
  const navigate = useNavigate();
  const { data: userPropertiesData, isLoading: propertiesLoading } = useUserProperties();

  const handlePropertyClick = (propertyId: string) => {
    navigate(`/dashboard/property/${propertyId}`);
  };

  // Show loading state while fetching properties
  if (propertiesLoading) {
    return (
      <div className="flex-1 p-3 lg:p-6 overflow-auto">
        <div className="w-full">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#294758] mx-auto mb-4"></div>
              <p className="text-[16px] text-[#485567]">Loading your properties...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no properties
  if (!userPropertiesData?.properties || userPropertiesData.properties.length === 0) {
    return (
      <div className="flex-1 p-3 lg:p-6 overflow-auto">
        <div className="w-full">
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-md">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Properties Found</h3>
              <p className="text-gray-600 mb-6">
                You haven't added any properties yet. Please complete the onboarding process to add your first property.
              </p>
              <button
                onClick={() => navigate("/hotel-information")}
                className="px-6 py-3 bg-[#294758] text-white rounded-lg hover:bg-[#234149] transition-colors"
              >
                Add Your First Property
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 lg:p-6 overflow-auto">
      <div className="w-full max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Properties</h1>
          <p className="text-gray-600">
            Select a property to view its pricing calendar and manage dynamic pricing settings.
          </p>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userPropertiesData.properties.map((property) => (
            <div
              key={property.id}
              onClick={() => handlePropertyClick(property.id)}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg hover:border-[#294758] transition-all duration-200 cursor-pointer group"
            >
              {/* Property Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#294758] rounded-lg flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#294758] transition-colors">
                      {property.name}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-4 w-4" />
                      <span>{property.city}, {property.country}</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#294758] transition-colors" />
              </div>

              {/* Property Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Property Type</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {property.property_type || 'Not specified'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Rooms</span>
                  <span className="font-medium text-gray-900">
                    {property.number_of_rooms}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    property.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {property.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center gap-2 text-[#294758] font-medium group-hover:text-[#234149] transition-colors">
                  <Calendar className="h-4 w-4" />
                  <span>View Pricing Calendar</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Property Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/hotel-information")}
            className="inline-flex items-center gap-2 px-6 py-3 border border-[#294758] text-[#294758] rounded-lg hover:bg-[#294758] hover:text-white transition-colors"
          >
            <Building2 className="h-5 w-5" />
            Add New Property
          </button>
        </div>
      </div>
    </div>
  );
}
