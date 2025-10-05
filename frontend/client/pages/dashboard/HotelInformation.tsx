import { useState, useEffect, useContext } from "react";
import { Building2, Plus, Save, ChevronDown } from "lucide-react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { toast } from "../../hooks/use-toast";
import "../../styles/responsive-utilities.css";

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
  const [otasPriceDiff, setOtasPriceDiff] = useState<string>("");
  const [isUpdatingOtas, setIsUpdatingOtas] = useState(false);

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
      // Load general settings (including otas_price_diff)
      (async () => {
        try {
          const settings = await dynamicPricingService.getGeneralSettings(property.id);
          setOtasPriceDiff(settings?.otas_price_diff?.toString() ?? "");
        } catch (e) {
          // ignore for now
        }
      })();
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
      toast({
        title: "Error",
        description: "No property selected",
        variant: "destructive",
      });
      return;
    }

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

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
      
      toast({
        title: "Success",
        description: "Hotel information saved successfully!",
      });
      
    } catch (error) {
      console.error("Error saving hotel information:", error);
      toast({
        title: "Error",
        description: "Failed to save hotel information. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldBorderColor = (field: keyof FormErrors) => {
    if (errors[field]) {
      return "border-[#FF0404]";
    }
    return "border-[#D7DFE8]";
  };

  // Show loading state if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2B6CEE] mx-auto mb-4"></div>
          <p className="text-responsive-base text-[#8A8E94] font-normal">Loading hotel information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hotel Information Form Section */}
      <div className="container-padding-base">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg container-padding-base container-margin-sm">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between container-margin-sm">
            <div className="flex items-center gap-3">
              <Building2 size={40} className="text-[#294758]" />
              <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                Hotel Information
              </h2>
            </div>
            <button className="flex items-center gap-3 btn-padding-base bg-[#294758] text-white rounded-lg font-semibold hover:bg-[#234149] transition-colors mt-4 lg:mt-0">
              <Plus size={24} />
              Add New Hotel
            </button>
          </div>


          {/* Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 form-gap-base">
            {/* Left Column */}
            <div className="form-field">
              {/* Hotel Name */}
              <div className="form-field">
                <label className="form-label">
                  Hotel Name*
                </label>
                <div className="form-field">
                  <input
                    type="text"
                    value={formData.hotelName}
                    onChange={(e) => handleInputChange("hotelName", e.target.value)}
                    placeholder="Enter hotel name"
                    className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("hotelName")}`}
                  />
                  {errors.hotelName && (
                    <span className="error-message">
                      {errors.hotelName}
                    </span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="form-field">
                <label className="form-label">
                  Address*
                </label>
                <div className="form-field">
                  <input
                    type="text"
                    value={formData.streetAddress}
                    onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                    placeholder="Enter street address"
                    className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("streetAddress")}`}
                  />
                  {errors.streetAddress && (
                    <span className="error-message">
                      {errors.streetAddress}
                    </span>
                  )}
                </div>
              </div>

              {/* City and Country Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 form-gap-base">
                <div className="form-field">
                  <label className="form-label">
                    City*
                  </label>
                  <div className="form-field">
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="Enter city"
                      className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("city")}`}
                    />
                    {errors.city && (
                      <span className="error-message">
                        {errors.city}
                      </span>
                    )}
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Country*
                  </label>
                  <div className="form-field">
                    <select
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("country")}`}
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                    {errors.country && (
                      <span className="error-message">
                        {errors.country}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Postal Code */}
              <div className="form-field">
                <label className="form-label">
                  Postal Code*
                </label>
                <div className="form-field">
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleInputChange("postalCode", e.target.value)}
                    placeholder="Enter postal code"
                    className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("postalCode")}`}
                  />
                  {errors.postalCode && (
                    <span className="error-message">
                      {errors.postalCode}
                    </span>
                  )}
                </div>
              </div>

              {/* CIF and Number of Rooms Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 form-gap-base">
                <div className="form-field">
                  <label className="form-label">
                    CIF (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.cif}
                    onChange={(e) => handleInputChange("cif", e.target.value)}
                    placeholder="Enter CIF"
                    className="w-full input-padding-base input-height-base bg-white border border-[#D7DAE0] rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    Number of Rooms*
                  </label>
                  <div className="form-field">
                    <input
                      type="number"
                      value={formData.numberOfRooms}
                      readOnly
                      placeholder="Enter number of rooms"
                      min="1"
                      className="w-full input-padding-base input-height-base bg-gray-100 border border-[#D7DAE0] rounded-md text-responsive-base cursor-not-allowed"
                    />
                    {errors.numberOfRooms && (
                      <span className="error-message">
                        {errors.numberOfRooms}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="form-field">
              {/* Phone */}
              <div className="form-field">
                <label className="form-label">
                  Phone*
                </label>
                <div className="form-field">
                  <input
                    type="text"
                    value={formData.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    placeholder="Enter phone number"
                    className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("phoneNumber")}`}
                  />
                  {errors.phoneNumber && (
                    <span className="error-message">
                      {errors.phoneNumber}
                    </span>
                  )}
                </div>
              </div>

              {/* Website */}
              <div className="form-field">
                <label className="form-label">
                  Website (Optional)
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="Enter website URL"
                  className="w-full input-padding-base input-height-base bg-white border border-[#D7DAE0] rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors"
                />
              </div>

              {/* Booking URL */}
              <div className="form-field">
                <label className="form-label">
                  Booking.com URL (Optional)
                </label>
                <div className="form-field">
                  <input
                    type="text"
                    value={formData.bookingUrl}
                    onChange={(e) => handleInputChange("bookingUrl", e.target.value)}
                    placeholder="https://www.booking.com/hotel/..."
                    className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("bookingUrl")}`}
                  />
                  {errors.bookingUrl && (
                    <span className="error-message">
                      {errors.bookingUrl}
                    </span>
                  )}
                </div>
              </div>

              {/* Property Type */}
              <div className="form-field">
                <label className="form-label">
                  Property Type*
                </label>
                <div className="form-field">
                  <select
                    value={formData.propertyType}
                    onChange={(e) => handleInputChange("propertyType", e.target.value)}
                    className={`w-full input-padding-base input-height-base bg-white border rounded-md text-responsive-base focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent transition-colors ${getFieldBorderColor("propertyType")}`}
                  >
                    <option value="">Select Property Type</option>
                    <option value="hotel">Hotel</option>
                    <option value="apartment">Apartment</option>
                    <option value="villa">Villa</option>
                    <option value="hostel">Hostel</option>
                    <option value="guesthouse">Guest House</option>
                  </select>
                  {errors.propertyType && (
                    <span className="error-message">
                      {errors.propertyType}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button and Message */}
          <div className="flex flex-col items-end container-margin-lg form-gap-base">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-4 btn-padding-base rounded-lg font-semibold transition-colors text-responsive-base ${
                isSaving 
                  ? "bg-gray-400 text-gray-200 cursor-not-allowed" 
                  : "bg-[#294758] text-white hover:bg-[#234149]"
              }`}
            >
              <Save size={24} />
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Pricing Configuration Section */}
        <div className="bg-white rounded-lg border border-black/10 shadow-lg container-padding-base">
          {/* Section Header with Inline Input */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between container-margin-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
              <Building2 size={40} className="text-[#294758]" />
              <h2 className="text-responsive-3xl font-bold text-[#294758]">
                Price Difference Between OTAs and Direct Channels
              </h2>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={otasPriceDiff}
                  onChange={(e) => setOtasPriceDiff(e.target.value)}
                  onBlur={async () => {
                    if (!property?.id) return;
                    const parsed = parseFloat(otasPriceDiff);
                    if (isNaN(parsed)) return; // silently ignore invalid
                    try {
                      setIsUpdatingOtas(true);
                      await dynamicPricingService.updateGeneralSettings(property.id, { otas_price_diff: parsed });
                      toast({
                        title: "Success",
                        description: "OTA price difference updated",
                      });
                    } catch (e) {
                      const err: any = e;
                      const backendMsg = err?.response?.data?.message || err?.message || 'Failed to update OTA price difference';
                      toast({
                        title: "Error",
                        description: backendMsg,
                        variant: "destructive",
                      });
                    } finally {
                      setIsUpdatingOtas(false);
                    }
                  }}
                  className={`w-36 input-padding-base input-height-base text-responsive-xl font-bold text-center border-2 ${isUpdatingOtas ? 'border-gray-300' : 'border-[#287CAC]'} rounded-lg bg-white text-[#287CAC] focus:outline-none focus:ring-2 focus:ring-[#287CAC]/20 focus:border-[#287CAC] transition-all shadow-sm pr-8`}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-responsive-xl font-bold text-[#287CAC] pointer-events-none">
                  %
                </span>
              </div>
            </div>
          </div>

          <p className="text-responsive-base text-[#4B5563] container-margin-sm">
            Configure how your hotel prices are calculated and compared to
            competitors.
          </p>
        </div>
      </div>
    </div>
  );
}
