import { useState, useEffect, useContext } from "react";
import {
  Plus,
  Save,
  Calendar,
  ChevronDown,
  Trash2,
  Info,
  Percent,
  DollarSign,
} from "lucide-react";
import { dynamicPricingService, SpecialOffer, CreateSpecialOfferRequest } from "../../../shared/api/dynamic";
import { PropertyContext } from "../../../shared/PropertyContext";

interface OfferFormData {
  id?: number;
  offer_name: string;
  valid_from: string;
  valid_until: string;
  applied_from_days: number | null;
  applied_until_days: number | null;
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
  isNew?: boolean;
}

export default function SpecialOffers() {
  const { property } = useContext(PropertyContext) ?? {};
  const [offers, setOffers] = useState<OfferFormData[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing offers on component mount
  useEffect(() => {
    if (property?.id) {
      loadOffers();
    }
  }, [property?.id]);

  const loadOffers = async () => {
    if (!property?.id) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await dynamicPricingService.getSpecialOffers(property.id);
      setOffers(response.offers.map(offer => ({
        id: offer.id,
        offer_name: offer.offer_name,
        valid_from: offer.valid_from,
        valid_until: offer.valid_until,
        applied_from_days: offer.applied_from_days,
        applied_until_days: offer.applied_until_days,
        increment_type: offer.increment_type,
        increment_value: offer.increment_value,
        isNew: false
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const addNewOffer = () => {
    const newOffer: OfferFormData = {
      offer_name: "",
      valid_from: "",
      valid_until: "",
      applied_from_days: null,
      applied_until_days: null,
      increment_type: 'Percentage',
      increment_value: 0,
      isNew: true
    };
    setOffers([...offers, newOffer]);
  };

  const updateOffer = (index: number, field: keyof OfferFormData, value: any) => {
    const updatedOffers = [...offers];
    updatedOffers[index] = { ...updatedOffers[index], [field]: value };
    setOffers(updatedOffers);
  };

  const removeOffer = async (index: number) => {
    const offer = offers[index];
    
    // If it's an existing offer, delete it from the server
    if (offer.id && !offer.isNew) {
      if (!property?.id) return;
      
      try {
        await dynamicPricingService.deleteSpecialOffer(property.id, offer.id);
        setSuccess('Offer deleted successfully');
      } catch (err: any) {
        setError(err.message || 'Failed to delete offer');
        return;
      }
    }
    
    // Remove from local state
    const updatedOffers = offers.filter((_, i) => i !== index);
    setOffers(updatedOffers);
  };

  const saveOffers = async () => {
    if (!property?.id) return;
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    // Client-side validation for required fields only
    const validationErrors = [];
    for (let i = 0; i < offers.length; i++) {
      const offer = offers[i];
      
      // Check required fields
      if (!offer.offer_name?.trim()) {
        validationErrors.push(`Offer in row ${i + 1}: Offer name is required`);
      }
      if (!offer.valid_from) {
        validationErrors.push(`Offer "${offer.offer_name || 'Unnamed'}" (row ${i + 1}): Valid from date is required`);
      }
      if (!offer.valid_until) {
        validationErrors.push(`Offer "${offer.offer_name || 'Unnamed'}" (row ${i + 1}): Valid until date is required`);
      }
    }
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      setSaving(false);
      return;
    }
    
    try {
      const newOffers = offers.filter(offer => offer.isNew);
      const existingOffers = offers.filter(offer => !offer.isNew);
      
      // Update existing offers
      for (const offer of existingOffers) {
        if (offer.id) {
          console.log('🔧 FRONTEND DEBUG: Updating existing offer:', {
            propertyId: property.id,
            offerId: offer.id,
            offerData: {
              offer_name: offer.offer_name,
              valid_from: offer.valid_from,
              valid_until: offer.valid_until,
              applied_from_days: offer.applied_from_days,
              applied_until_days: offer.applied_until_days,
              increment_type: offer.increment_type,
              increment_value: offer.increment_value
            }
          });
          
          await dynamicPricingService.updateSpecialOffer(property.id, offer.id, {
            offer_name: offer.offer_name,
            valid_from: offer.valid_from,
            valid_until: offer.valid_until,
            applied_from_days: offer.applied_from_days,
            applied_until_days: offer.applied_until_days,
            increment_type: offer.increment_type,
            increment_value: offer.increment_value
          });
          
          console.log('🔧 FRONTEND DEBUG: Offer updated successfully');
        }
      }
      
      // Create new offers
      if (newOffers.length > 0) {
        const validNewOffers = newOffers.filter(offer => 
          offer.offer_name.trim() && offer.valid_from && offer.valid_until
        );
        
        if (validNewOffers.length > 0) {
          await dynamicPricingService.bulkCreateSpecialOffers(property.id, {
            offers: validNewOffers.map(offer => ({
              offer_name: offer.offer_name,
              valid_from: offer.valid_from,
              valid_until: offer.valid_until,
              applied_from_days: offer.applied_from_days,
              applied_until_days: offer.applied_until_days,
              increment_type: offer.increment_type,
              increment_value: offer.increment_value
            }))
          });
        }
      }
      
      setSuccess('Offers saved successfully');
      loadOffers(); // Reload to get updated data
    } catch (err: any) {
      console.error('🔧 FRONTEND DEBUG: Error saving offers:', err);
      console.error('🔧 FRONTEND DEBUG: Error details:', {
        message: err?.message,
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        method: err?.config?.method
      });
      
      // Extract detailed error message from backend response
      let errorMessage = 'Failed to save offers';
      if (err?.response?.data?.errors) {
        // Handle validation errors
        const errors = err.response.data.errors;
        if (errors.non_field_errors && errors.non_field_errors.length > 0) {
          errorMessage = errors.non_field_errors[0];
        } else {
          // Handle field-specific errors
          const fieldErrors = Object.entries(errors).map(([field, messages]) => 
            `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`
          ).join('; ');
          errorMessage = fieldErrors;
        }
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const DateInput = ({
    value,
    onChange,
    placeholder = "Select date"
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white text-black"
        placeholder={placeholder}
      />
      <Calendar size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );

  const TypeSelector = ({
    value,
    onChange
  }: {
    value: 'Percentage' | 'Additional';
    onChange: (value: 'Percentage' | 'Additional') => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'Percentage' | 'Additional')}
      className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white text-black appearance-none"
    >
      <option value="Percentage">Percentage</option>
      <option value="Additional">Additional</option>
    </select>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.25 23.75L23.75 6.25"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.75 12.5C10.8211 12.5 12.5 10.8211 12.5 8.75C12.5 6.67893 10.8211 5 8.75 5C6.67893 5 5 6.67893 5 8.75C5 10.8211 6.67893 12.5 8.75 12.5Z"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21.25 25C23.3211 25 25 23.3211 25 21.25C25 19.1789 23.3211 17.5 21.25 17.5C19.1789 17.5 17.5 19.1789 17.5 21.25C17.5 23.3211 19.1789 25 21.25 25Z"
                  stroke="#287CAC"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div>
                <h2 className="text-3xl font-bold text-[#287CAC]">
                  Special Offers
                </h2>
                <p className="text-[#8A8E94] font-bold text-lg">
                  Manage your special offers and discounts
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Offers Table */}
          <div className="mb-8">
            {/* Table Headers */}
            <div className="grid grid-cols-8 gap-4 mb-4 text-black/70 font-bold text-base">
              <div>Offer Name*</div>
              <div>Valid From*</div>
              <div>Valid Until*</div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span>Available From Days</span>
                  <Info size={17} className="text-gray-600" />
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span>Available Until Days</span>
                  <Info size={17} className="text-gray-600" />
                </div>
              </div>
              <div>Type</div>
              <div>Value*</div>
              <div></div>
            </div>

            {/* Table Rows */}
            <div className="space-y-2">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading offers...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No offers found. Click "Add Offer" to create your first special offer.</p>
                </div>
              ) : (
                offers.map((offer, index) => (
                  <div
                    key={offer.id || `new-${index}`}
                    className={`grid grid-cols-8 gap-4 items-center p-3 rounded-lg ${
                      offer.isNew ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                    }`}
                  >
                    {/* Offer Name */}
                    <div>
                      <input
                        type="text"
                        value={offer.offer_name}
                        onChange={(e) => updateOffer(index, 'offer_name', e.target.value)}
                        placeholder="Discount Name"
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Valid From */}
                    <div>
                      <DateInput
                        value={offer.valid_from}
                        onChange={(value) => updateOffer(index, 'valid_from', value)}
                        placeholder="Select start date"
                      />
                    </div>

                    {/* Valid Until */}
                    <div>
                      <DateInput
                        value={offer.valid_until}
                        onChange={(value) => updateOffer(index, 'valid_until', value)}
                        placeholder="Select end date"
                      />
                    </div>

                    {/* Available From Days */}
                    <div>
                      <input
                        type="number"
                        value={offer.applied_from_days || ''}
                        onChange={(e) => updateOffer(index, 'applied_from_days', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="0"
                        min="0"
                        className="w-full px-3 py-2 text-xs text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Available Until Days */}
                    <div>
                      <input
                        type="number"
                        value={offer.applied_until_days || ''}
                        onChange={(e) => updateOffer(index, 'applied_until_days', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="0"
                        min="0"
                        className="w-full px-3 py-2 text-xs text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <TypeSelector
                        value={offer.increment_type}
                        onChange={(value) => updateOffer(index, 'increment_type', value)}
                      />
                    </div>

                    {/* Value */}
                    <div>
                      <input
                        type="number"
                        value={offer.increment_value}
                        onChange={(e) => updateOffer(index, 'increment_value', parseInt(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        className="w-full px-3 py-2 text-xs text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Actions */}
                    <div>
                      <button 
                        onClick={() => removeOffer(index)}
                        className="w-full px-5 py-2 border border-red-500 bg-red-50 rounded flex items-center justify-center hover:bg-red-100 transition-colors"
                        title="Delete offer"
                      >
                        <Trash2 size={20} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={addNewOffer}
              className="flex items-center gap-3 px-5 py-3 bg-[#C4D4F5] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-blue-100 transition-colors"
            >
              <Plus size={24} />
              Add Offer
            </button>
            <button 
              onClick={saveOffers}
              disabled={saving || offers.length === 0}
              className="flex items-center gap-4 px-6 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={24} />
              {saving ? 'Saving...' : 'Save Special Offers'}
            </button>
          </div>

          {/* Created Offers Summary */}
          {offers.length > 0 && (
            <div className="bg-[#F9FAFB] border border-[#EBEDF0] rounded-lg p-4 mb-8">
              <h3 className="text-base font-bold text-gray-900 mb-4">
                Created Offers Summary
              </h3>
              <div className="space-y-2 text-sm">
                {offers.filter(offer => !offer.isNew).map((offer, index) => (
                  <p key={offer.id || index}>
                    <span className="text-gray-900 font-medium">{offer.offer_name || 'Unnamed Offer'}</span>
                    <span className="text-gray-500"> — valid from</span>
                    <span className="text-gray-900"> {offer.valid_from} to {offer.valid_until}</span>
                    {offer.applied_from_days !== null && offer.applied_until_days !== null && (
                      <span className="text-gray-500"> (applied {offer.applied_from_days}-{offer.applied_until_days} days before)</span>
                    )}
                  </p>
                ))}
                {offers.filter(offer => offer.isNew).length > 0 && (
                  <p className="text-blue-600 font-medium">
                    {offers.filter(offer => offer.isNew).length} new offer(s) pending save
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6 mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Info size={25} className="text-[#294758]" />
            <h3 className="text-lg font-bold text-[#294758]">
              Tips for Creating Special Offers
            </h3>
          </div>
          <div className="text-black/60 leading-relaxed space-y-1">
            <p>
              • Define clear start and end dates to avoid overlapping promotions
            </p>
            <p>
              • Use descriptive names (e.g., Summer Discount, Weekend Deal) for
              easy identification
            </p>
            <p>
              • Combine fixed and percentage discounts strategically to attract
              different guests
            </p>
            <p>
              • Schedule offers in advance to align with holidays or local
              events
            </p>
            <p>
              • Keep discounts visible close to check-in dates to increase
              last-minute bookings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
