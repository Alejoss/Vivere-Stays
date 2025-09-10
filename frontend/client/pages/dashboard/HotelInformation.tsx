import { useState, useEffect, useContext } from "react";
import { Building2, Plus, Save, ChevronDown } from "lucide-react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";

interface FormData {
  hotelName: string;
  bookingUrl: string;
  streetAddress: string;
  city: string;
  country: string;
  postalCode: string;
  phoneNumber: string;
  website: string;
  cif: string;
  numberOfRooms: string;
  propertyType: string;
}

interface FormErrors {
  hotelName?: string;
  bookingUrl?: string;
  streetAddress?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  phoneNumber?: string;
  numberOfRooms?: string;
  propertyType?: string;
}

// List of countries with their codes (same as onboarding)
const COUNTRIES = [
  { code: "AF", name: "Afghanistan" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "CV", name: "Cape Verde" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MK", name: "North Macedonia" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "MX", name: "Mexico" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TO", name: "Tonga" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "TM", name: "Turkmenistan" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

// Helper function to get country name from country code
const getCountryName = (countryCode: string): string => {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
};

export default function HotelInformation() {
  const { property, setProperty } = useContext(PropertyContext) ?? {};
  const [formData, setFormData] = useState<FormData>({
    hotelName: "",
    bookingUrl: "",
    streetAddress: "",
    city: "",
    country: "",
    postalCode: "",
    phoneNumber: "",
    website: "",
    cif: "",
    numberOfRooms: "",
    propertyType: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  // Load property data when component mounts or property changes
  useEffect(() => {
    if (property) {
      setFormData({
        hotelName: property.name || "",
        bookingUrl: property.booking_hotel_url || "",
        streetAddress: property.street_address || "",
        city: property.city || "",
        country: property.country || "",
        postalCode: property.postal_code || "",
        phoneNumber: property.phone_number || "",
        website: property.website || "",
        cif: property.cif || "",
        numberOfRooms: property.number_of_rooms?.toString() || "",
        propertyType: property.property_type || "",
      });
    }
  }, [property]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.hotelName.trim()) {
      newErrors.hotelName = "Hotel name is required";
    }

    // Validate booking URL if provided
    if (formData.bookingUrl.trim() && !formData.bookingUrl.toLowerCase().includes("booking.com")) {
      newErrors.bookingUrl = "URL must be from booking.com";
    }

    if (!formData.streetAddress.trim()) {
      newErrors.streetAddress = "Address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    if (!formData.postalCode.trim()) {
      newErrors.postalCode = "Postal code is required";
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }

    if (!formData.propertyType.trim()) {
      newErrors.propertyType = "Property type is required";
    }

    if (!formData.numberOfRooms.trim()) {
      newErrors.numberOfRooms = "Number of rooms is required";
    } else if (isNaN(Number(formData.numberOfRooms)) || Number(formData.numberOfRooms) <= 0) {
      newErrors.numberOfRooms = "Number of rooms must be a positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSave = async () => {
    if (!property?.id) {
      setSaveMessage("No property selected");
      return;
    }

    if (!validateForm()) {
      setSaveMessage("Please fix the errors before saving");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      // Convert form data to API format
      const apiData = {
        name: formData.hotelName,
        booking_hotel_url: formData.bookingUrl,
        street_address: formData.streetAddress,
        city: formData.city,
        country: formData.country,
        postal_code: formData.postalCode,
        phone_number: formData.phoneNumber,
        website: formData.website,
        cif: formData.cif,
        number_of_rooms: parseInt(formData.numberOfRooms),
        property_type: formData.propertyType,
      };

      const response = await dynamicPricingService.updateProperty(property.id, apiData);
      
      // Update the property context with the new data
      if (response.property) {
        setProperty(response.property);
      }
      
      setSaveMessage("Hotel information saved successfully!");
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveMessage("");
      }, 3000);
      
    } catch (error) {
      console.error("Error saving hotel information:", error);
      setSaveMessage("Failed to save hotel information. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldBorderColor = (field: keyof FormErrors) => {
    if (errors[field]) {
      return "border-[#FF0404]";
    }
    if (formData[field] && !errors[field]) {
      return "border-[#16B257]";
    }
    return "border-[#D7DFE8]";
  };

  // Show loading state if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B6CEE] mx-auto mb-4"></div>
          <p className="text-[#8A8E94] font-medium">Loading hotel information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hotel Information Form Section */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8 mb-8">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Building2 size={40} className="text-[#287CAC]" />
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Hotel Information
              </h2>
            </div>
            <button className="flex items-center gap-3 px-5 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              <Plus size={24} />
              Add New Hotel
            </button>
          </div>

          <p className="text-[#8A8E94] font-bold text-lg mb-8">
            Manage your hotel's basic information
          </p>

          {/* Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Hotel Name */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Hotel Name*
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={formData.hotelName}
                    onChange={(e) => handleInputChange("hotelName", e.target.value)}
                    placeholder="Enter hotel name"
                    className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("hotelName")}`}
                  />
                  {errors.hotelName && (
                    <span className="text-[12px] text-[#FF0404]">
                      {errors.hotelName}
                    </span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Address*
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                    placeholder="Enter street address"
                    className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("streetAddress")}`}
                  />
                  {errors.streetAddress && (
                    <span className="text-[12px] text-[#FF0404]">
                      {errors.streetAddress}
                    </span>
                  )}
                </div>
              </div>

              {/* City and Country Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    City*
                  </label>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="Enter city"
                      className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("city")}`}
                    />
                    {errors.city && (
                      <span className="text-[12px] text-[#FF0404]">
                        {errors.city}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    Country*
                  </label>
                  <div className="space-y-1">
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("country")}`}
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    {errors.country && (
                      <span className="text-[12px] text-[#FF0404]">
                        {errors.country}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Postal Code */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Postal Code*
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange("postalCode", e.target.value)}
                    placeholder="Enter postal code"
                    className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("postalCode")}`}
                  />
                  {errors.postalCode && (
                    <span className="text-[12px] text-[#FF0404]">
                      {errors.postalCode}
                    </span>
                  )}
                </div>
              </div>

              {/* CIF and Number of Rooms Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    CIF (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.cif}
                    onChange={(e) => handleInputChange("cif", e.target.value)}
                    placeholder="Enter CIF"
                    className="w-full px-5 py-4 bg-white border border-[#D7DFE8] rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none focus:border-[#294859] transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    Number of Rooms*
                  </label>
                  <div className="space-y-1">
                    <input
                      type="number"
                      value={formData.numberOfRooms}
                      onChange={(e) => handleInputChange("numberOfRooms", e.target.value)}
                      placeholder="Enter number of rooms"
                      min="1"
                      className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("numberOfRooms")}`}
                    />
                    {errors.numberOfRooms && (
                      <span className="text-[12px] text-[#FF0404]">
                        {errors.numberOfRooms}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Phone*
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    placeholder="Enter phone number"
                    className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("phoneNumber")}`}
                  />
                  {errors.phoneNumber && (
                    <span className="text-[12px] text-[#FF0404]">
                      {errors.phoneNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Website (Optional)
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="Enter website URL"
                  className="w-full px-5 py-4 bg-white border border-[#D7DFE8] rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none focus:border-[#294859] transition-colors"
                />
              </div>

              {/* Booking URL */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Booking.com URL (Optional)
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={formData.bookingUrl}
                    onChange={(e) => handleInputChange("bookingUrl", e.target.value)}
                    placeholder="https://www.booking.com/hotel/..."
                    className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("bookingUrl")}`}
                  />
                  {errors.bookingUrl && (
                    <span className="text-[12px] text-[#FF0404]">
                      {errors.bookingUrl}
                    </span>
                  )}
                </div>
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Property Type*
                </label>
                <div className="space-y-1">
                  <select
                    value={formData.propertyType}
                    onChange={(e) => handleInputChange("propertyType", e.target.value)}
                    className={`w-full px-5 py-4 bg-white border rounded-lg text-[#1E1E1E] font-bold text-lg focus:outline-none transition-colors ${getFieldBorderColor("propertyType")}`}
                  >
                    <option value="">Select Property Type</option>
                    <option value="hotel">Hotel</option>
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="hostel">Hostel</option>
                    <option value="guesthouse">Guest House</option>
                  </select>
                  {errors.propertyType && (
                    <span className="text-[12px] text-[#FF0404]">
                      {errors.propertyType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button and Message */}
          <div className="flex flex-col items-end mt-12 space-y-4">
            {saveMessage && (
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                saveMessage.includes("successfully") 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {saveMessage}
              </div>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-4 px-6 py-3 rounded-lg font-semibold transition-colors ${
                isSaving 
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed" 
                  : "bg-[#2B6CEE] text-white hover:bg-blue-600"
              }`}
            >
              <Save size={24} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Pricing Configuration Section */}
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header with Inline Input */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <Building2 size={40} className="text-[#287CAC]" />
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Price Difference Between OTAs and Direct Channels
              </h2>
              <div className="relative">
                <input
                  type="number"
                  value="10"
                  className="w-24 px-4 py-3 text-xl font-bold text-center border-2 border-[#287CAC] rounded-lg bg-white text-[#287CAC] focus:outline-none focus:ring-2 focus:ring-[#287CAC]/20 focus:border-[#287CAC] transition-all shadow-sm pr-8"
                  placeholder="10"
                  readOnly
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl font-bold text-[#287CAC]">
                  %
                </span>
              </div>
            </div>
          </div>

          <p className="text-[#8A8E94] font-bold text-lg mb-8">
            Configure how your hotel prices are calculated and compared to
            competitors.
          </p>
        </div>
      </div>
    </div>
  );
}
