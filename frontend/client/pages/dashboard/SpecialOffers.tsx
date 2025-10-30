import { useState, useEffect, useContext } from "react";
import { useForm, FormProvider, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
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
import { z } from "zod";
import { toast } from "../../hooks/use-toast";
import { PropertyContext } from "../../../shared/PropertyContext";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import "../../styles/responsive-utilities.css";

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

// Zod schema for standardized validation (allows negative values where applicable)
const OfferSchema = z.object({
  id: z.number().optional(),
  offer_name: z.string().trim().min(1, 'Offer name is required'),
  valid_from: z.string().min(1, 'Valid from date is required'),
  valid_until: z.string().min(1, 'Valid until date is required'),
  applied_from_days: z.union([z.coerce.number().int(), z.null()]),
  applied_until_days: z.union([z.coerce.number().int(), z.null()]),
  increment_type: z.enum(['Percentage', 'Additional']),
  increment_value: z.coerce.number(),
}).superRefine((val, ctx) => {
  // valid_from must be strictly before valid_until
  const from = new Date(val.valid_from);
  const until = new Date(val.valid_until);
  if (!isNaN(from.getTime()) && !isNaN(until.getTime())) {
    if (from >= until) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'valid_from must be before valid_until',
        path: ['valid_until'],
      });
    }
  }

  // Available From should be greater than Available Until (when both set)
  if (
    typeof val.applied_from_days === 'number' &&
    typeof val.applied_until_days === 'number'
  ) {
    if (!(val.applied_from_days > val.applied_until_days)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Available From days must be greater than Available Until days',
        path: ['applied_from_days'],
      });
    }
  }
});

const OffersSchema = z.object({ offers: z.array(OfferSchema) });

type OffersForm = z.infer<typeof OffersSchema>;

export default function SpecialOffers() {
  const { t } = useTranslation(['dashboard', 'common', 'errors']);
  const { property } = useContext(PropertyContext) ?? {};
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<OffersForm>({
    resolver: zodResolver(OffersSchema),
    defaultValues: { offers: [] },
    mode: 'onChange',
    reValidateMode: 'onChange',
    criteriaMode: 'firstError',
  });
  const { control, formState, handleSubmit, reset, register, getValues, setFocus, watch } = form;
  const { fields, append, remove, update } = useFieldArray({ control, name: 'offers' });

  // Watch form values for debugging
  const watchedValues = watch();
  console.log('🔧 FRONTEND DEBUG: Current watched form values:', watchedValues);
  console.log('🔧 FRONTEND DEBUG: Current fields array:', fields);

  // Load existing offers on component mount
  useEffect(() => {
    if (property?.id) {
      loadOffers();
    }
  }, [property?.id]);

  // Debug effect to track fields changes
  useEffect(() => {
    console.log('🔧 FRONTEND DEBUG: Fields array changed:', fields);
    console.log('🔧 FRONTEND DEBUG: Fields length:', fields.length);
  }, [fields]);

  const loadOffers = async () => {
    if (!property?.id) return;
    
    console.log('🔧 FRONTEND DEBUG: Loading offers for property:', property.id);
    setLoading(true);
    try {
      const response = await dynamicPricingService.getSpecialOffers(property.id);
      console.log('🔧 FRONTEND DEBUG: Raw response from API:', response);
      
      const mappedOffers = (response.offers || []).map((offer: any) => ({
        id: offer.id,
        offer_name: offer.offer_name || '',
        valid_from: offer.valid_from || '',
        valid_until: offer.valid_until || '',
        applied_from_days: offer.applied_from_days ?? null,
        applied_until_days: offer.applied_until_days ?? null,
        increment_type: offer.increment_type || 'Percentage',
        increment_value: offer.increment_value ?? 0,
      }));
      
      console.log('🔧 FRONTEND DEBUG: Mapped offers for form:', mappedOffers);
      
      reset({
        offers: mappedOffers,
      });
      
      console.log('🔧 FRONTEND DEBUG: Form reset completed');
    } catch (err: any) {
      console.error('🔧 FRONTEND DEBUG: Error loading offers:', err);
      const backendMsg = err?.response?.data?.message || err?.message || t('dashboard:specialOffers.loadError');
      toast({ title: t('common:messages.error'), description: backendMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const addNewOffer = () => {
    console.log('🔧 FRONTEND DEBUG: Adding new offer');
    append({
      offer_name: '',
      valid_from: '',
      valid_until: '',
      applied_from_days: null,
      applied_until_days: null,
      increment_type: 'Percentage',
      increment_value: 0,
    } as any);
    console.log('🔧 FRONTEND DEBUG: New offer added, current form values:', getValues());
  };

  const updateOffer = (index: number, field: keyof OfferFormData, value: any) => {
    // Note: This function is not needed when using register() approach
    // The form values are automatically managed by react-hook-form
    console.log(`updateOffer called but not needed with register() approach: ${field} = ${value}`);
  };

  const removeOffer = async (index: number) => {
    console.log(`🔧 FRONTEND DEBUG: Removing offer at index ${index}`);
    const offer = getValues().offers?.[index] || (fields[index] as any);
    console.log(`🔧 FRONTEND DEBUG: Offer to remove:`, offer);
    
    // If it's an existing offer, delete it from the server
    if (offer.id && !offer.isNew) {
      if (!property?.id) return;
      
      try {
        console.log(`🔧 FRONTEND DEBUG: Deleting offer from server:`, { propertyId: property.id, offerId: offer.id });
        await dynamicPricingService.deleteSpecialOffer(property.id, offer.id);
        toast({
          title: t('common:messages.success'),
          description: "Offer deleted successfully",
        });
        console.log(`🔧 FRONTEND DEBUG: Offer deleted successfully from server`);
      } catch (err: any) {
        console.error(`🔧 FRONTEND DEBUG: Error deleting offer from server:`, err);
        const backendMsg = err?.response?.data?.message || err?.message || 'Failed to delete offer';
        toast({ title: 'Error', description: backendMsg, variant: 'destructive' });
        return;
      }
    }
    
    console.log(`🔧 FRONTEND DEBUG: Removing offer from form at index ${index}`);
    remove(index);
    console.log(`🔧 FRONTEND DEBUG: Offer removed from form, current values:`, getValues());
  };

  const onSubmit = async (values: OffersForm) => {
    if (!property?.id) return;
    
    console.log('🔧 FRONTEND DEBUG: Form submitted with values:', values);
    console.log('🔧 FRONTEND DEBUG: All offers:', values.offers);
    
    setSaving(true);
    
    try {
      const allOffers = values.offers || [];
      const newOffers = allOffers.filter(offer => !offer.id);
      const existingOffers = allOffers.filter(offer => !!offer.id);
      
      console.log('🔧 FRONTEND DEBUG: New offers:', newOffers);
      console.log('🔧 FRONTEND DEBUG: Existing offers:', existingOffers);
      
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
      
      toast({
        title: t('common:messages.success'),
        description: "Offers saved successfully",
      });
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
      let errorMessage = err?.response?.data?.message || 'Failed to save offers';
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
      
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
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
        className="w-full input-padding-base input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black"
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
      className="w-full input-padding-base input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black appearance-none"
    >
      <option value="Percentage">Percentage</option>
      <option value="Additional">Additional</option>
    </select>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="container-padding-base">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg container-padding-base">
          {/* Section Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between container-margin-sm">
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
                <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                  {t('dashboard:specialOffers.title')}
                </h2>
                <p className="text-[#8A8E94] font-bold text-responsive-lg">
                  Manage your special offers and discounts
                </p>
              </div>
            </div>
          </div>


          {/* Offers Table */}
          <div className="container-margin-sm">
            {/* Desktop Table Headers */}
            <div className="hidden lg:grid grid-cols-8 form-gap-base container-margin-sm text-black/70 font-bold text-responsive-base">
              <div>{t('dashboard:specialOffers.offerName', { defaultValue: 'Offer Name' })}*</div>
              <div>{t('dashboard:specialOffers.validFrom', { defaultValue: 'Valid From' })}*</div>
              <div>{t('dashboard:specialOffers.validUntil', { defaultValue: 'Valid Until' })}*</div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span>{t('dashboard:specialOffers.availableFromDays', { defaultValue: 'Available From Days' })}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={17} className="text-gray-600 hidden lg:inline cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <div className="font-semibold mb-1">{t('dashboard:specialOffers.tooltips.appliedFromDays.title')}</div>
                      <div>{t('dashboard:specialOffers.tooltips.appliedFromDays.description')}</div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <span>{t('dashboard:specialOffers.availableUntilDays', { defaultValue: 'Available Until Days' })}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={17} className="text-gray-600 hidden lg:inline cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <div className="font-semibold mb-1">{t('dashboard:specialOffers.tooltips.appliedUntilDays.title')}</div>
                      <div>{t('dashboard:specialOffers.tooltips.appliedUntilDays.description')}</div>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div>{t('dashboard:specialOffers.type', { defaultValue: 'Type' })}</div>
              <div>{t('dashboard:specialOffers.value', { defaultValue: 'Value' })}*</div>
              <div></div>
            </div>

            {/* Table Rows */}
            <div className="form-gap-base">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-responsive-base">{t('dashboard:specialOffers.loadingOffers', { defaultValue: 'Loading offers...' })}</p>
                </div>
              ) : fields.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-responsive-base">{t('dashboard:specialOffers.noOffers')}</p>
                </div>
              ) : (
                fields.map((offer, index) => (
                  <div key={offer.id || `new-${index}`}>
                    {/* Desktop Layout */}
                    <div
                      className={`hidden lg:grid grid-cols-8 form-gap-base items-center container-padding-sm rounded-lg ${
                        offer.id ? 'bg-white' : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      {/* Offer Name */}
                      <div>
                        <Controller
                          name={`offers.${index}.offer_name` as const}
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                type="text"
                                {...field}
                                onChange={(e) => {
                                  console.log(`🔧 FRONTEND DEBUG: Offer name changed for index ${index}:`, e.target.value);
                                  field.onChange(e);
                                  console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                }}
                                placeholder={t('dashboard:specialOffers.offerNamePlaceholder', { defaultValue: 'Discount Name' })}
                                className="w-full input-padding-base input-height-base text-responsive-xs border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {fieldState.error && (
                                <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                              )}
                            </>
                          )}
                        />
                      </div>

                      {/* Valid From */}
                      <div>
                        <Controller
                          name={`offers.${index}.valid_from` as const}
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                type="date"
                                {...field}
                                onChange={(e) => {
                                  console.log(`🔧 FRONTEND DEBUG: Valid from changed for index ${index}:`, e.target.value);
                                  field.onChange(e);
                                  console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                }}
                                className="w-full input-padding-base input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black"
                                placeholder="Select start date"
                              />
                              {fieldState.error && (
                                <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                              )}
                            </>
                          )}
                        />
                      </div>

                      {/* Valid Until */}
                      <div>
                        <Controller
                          name={`offers.${index}.valid_until` as const}
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                type="date"
                                {...field}
                                onChange={(e) => {
                                  console.log(`🔧 FRONTEND DEBUG: Valid until changed for index ${index}:`, e.target.value);
                                  field.onChange(e);
                                  console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                }}
                                className="w-full input-padding-base input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black"
                                placeholder="Select end date"
                              />
                              {fieldState.error && (
                                <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                              )}
                            </>
                          )}
                        />
                      </div>

                      {/* Available From Days */}
                      <div>
                        <Controller
                          name={`offers.${index}.applied_from_days` as const}
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                type="text"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  console.log(`🔧 FRONTEND DEBUG: Applied from days (raw) changed for index ${index}:`, value);
                                  field.onChange(value);
                                  console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                }}
                                placeholder="0"
                                className="w-full input-padding-base input-height-base text-responsive-xs text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                inputMode="numeric"
                              />
                              {fieldState.error && (
                                <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                              )}
                            </>
                          )}
                        />
                      </div>

                      {/* Available Until Days */}
                      <div>
                        <Controller
                          name={`offers.${index}.applied_until_days` as const}
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                type="text"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  console.log(`🔧 FRONTEND DEBUG: Applied until days (raw) changed for index ${index}:`, value);
                                  field.onChange(value);
                                  console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                }}
                                placeholder="0"
                                className="w-full input-padding-base input-height-base text-responsive-xs text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                inputMode="numeric"
                              />
                              {fieldState.error && (
                                <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                              )}
                            </>
                          )}
                        />
                      </div>

                      {/* Type */}
                      <div>
                        <Controller
                          name={`offers.${index}.increment_type` as const}
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <select
                                {...field}
                                onChange={(e) => {
                                  console.log(`🔧 FRONTEND DEBUG: Increment type changed for index ${index}:`, e.target.value);
                                  field.onChange(e);
                                  console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                }}
                                className="w-full input-padding-base input-height-base text-responsive-xs border border-gray-300 rounded bg-white text-black appearance-none"
                              >
                                <option value="Percentage">Percentage</option>
                                <option value="Additional">Additional</option>
                              </select>
                              {fieldState.error && (
                                <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                              )}
                            </>
                          )}
                        />
                      </div>

                      {/* Value */}
                      <div>
                        <Controller
                          name={`offers.${index}.increment_value` as const}
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <input
                                type="text"
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  console.log(`🔧 FRONTEND DEBUG: Increment value (raw) changed for index ${index}:`, value);
                                  field.onChange(value);
                                  console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                }}
                                placeholder="0"
                                className="w-full input-padding-base input-height-base text-responsive-xs text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                inputMode="decimal"
                              />
                              {fieldState.error && (
                                <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                              )}
                            </>
                          )}
                        />
                      </div>

                      {/* Actions */}
                      <div>
                        <button 
                          onClick={() => removeOffer(index)}
                          className="w-full px-3 py-2 border border-red-500 bg-red-50 rounded flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Delete offer"
                        >
                          <Trash2 size={24} className="text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className={`lg:hidden bg-white border border-gray-200 rounded-lg container-padding-base form-gap-base ${
                      offer.id ? '' : 'bg-blue-50 border-blue-200'
                    }`}>
                      {/* Header with delete button */}
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => removeOffer(index)}
                          className="w-8 h-8 p-1 border border-red-300 bg-red-50 rounded-md flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="Delete offer"
                        >
                          <Trash2 size={16} className="text-red-500" />
                        </button>
                      </div>

                      {/* Offer Name */}
                      <div className="form-field">
                        <label className="form-label">
                          {t('dashboard:specialOffers.offerName', { defaultValue: 'Offer Name' })}*
                        </label>
                        <div className="form-field">
                          <Controller
                            name={`offers.${index}.offer_name` as const}
                            control={control}
                            render={({ field, fieldState }) => (
                              <>
                                <input
                                  type="text"
                                  {...field}
                                  onChange={(e) => {
                                    console.log(`🔧 FRONTEND DEBUG: Mobile offer name changed for index ${index}:`, e.target.value);
                                    field.onChange(e);
                                    console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                  }}
                                  placeholder={t('dashboard:specialOffers.offerNamePlaceholder', { defaultValue: 'Discount Name' })}
                                  className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {fieldState.error && (
                                  <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                                )}
                              </>
                            )}
                          />
                        </div>
                      </div>

                      {/* Date Range */}
                      <div className="grid grid-cols-2 form-gap-base">
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:specialOffers.validFrom', { defaultValue: 'Valid From' })}*
                          </label>
                          <div className="form-field">
                            <Controller
                              name={`offers.${index}.valid_from` as const}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <input
                                    type="date"
                                    {...field}
                                    onChange={(e) => {
                                      console.log(`🔧 FRONTEND DEBUG: Mobile valid from changed for index ${index}:`, e.target.value);
                                      field.onChange(e);
                                      console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                    }}
                                    className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white text-black"
                                    placeholder={t('dashboard:specialOffers.selectStartDate', { defaultValue: 'Select start date' })}
                                  />
                                  {fieldState.error && (
                                    <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:specialOffers.validUntil', { defaultValue: 'Valid Until' })}*
                          </label>
                          <div className="form-field">
                            <Controller
                              name={`offers.${index}.valid_until` as const}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <input
                                    type="date"
                                    {...field}
                                    onChange={(e) => {
                                      console.log(`🔧 FRONTEND DEBUG: Mobile valid until changed for index ${index}:`, e.target.value);
                                      field.onChange(e);
                                      console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                    }}
                                    className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white text-black"
                                    placeholder={t('dashboard:specialOffers.selectEndDate', { defaultValue: 'Select end date' })}
                                  />
                                  {fieldState.error && (
                                    <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Availability Days */}
                      <div className="grid grid-cols-2 form-gap-base">
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:specialOffers.availableFromDays', { defaultValue: 'Available From Days' })}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info size={14} className="hidden lg:inline ml-1 text-gray-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                <div className="font-semibold mb-1">{t('dashboard:specialOffers.tooltips.appliedFromDays.title')}</div>
                                <div>{t('dashboard:specialOffers.tooltips.appliedFromDays.description')}</div>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                          <div className="form-field">
                            <Controller
                              name={`offers.${index}.applied_from_days` as const}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <input
                                    type="text"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      console.log(`🔧 FRONTEND DEBUG: Mobile applied from days (raw) changed for index ${index}:`, value);
                                      field.onChange(value);
                                      console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                    }}
                                    placeholder="0"
                                    className="w-full input-padding-base input-height-base text-responsive-sm text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    inputMode="numeric"
                                  />
                                  {fieldState.error && (
                                    <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:specialOffers.availableUntilDays', { defaultValue: 'Available Until Days' })}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info size={14} className="hidden lg:inline ml-1 text-gray-600 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs text-xs">
                                <div className="font-semibold mb-1">{t('dashboard:specialOffers.tooltips.appliedUntilDays.title')}</div>
                                <div>{t('dashboard:specialOffers.tooltips.appliedUntilDays.description')}</div>
                              </TooltipContent>
                            </Tooltip>
                          </label>
                          <div className="form-field">
                            <Controller
                              name={`offers.${index}.applied_until_days` as const}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <input
                                    type="text"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      console.log(`🔧 FRONTEND DEBUG: Mobile applied until days (raw) changed for index ${index}:`, value);
                                      field.onChange(value);
                                      console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                    }}
                                    placeholder="0"
                                    className="w-full input-padding-base input-height-base text-responsive-sm text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    inputMode="numeric"
                                  />
                                  {fieldState.error && (
                                    <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Type and Value */}
                      <div className="grid grid-cols-2 form-gap-base">
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:specialOffers.type', { defaultValue: 'Type' })}
                          </label>
                          <div className="form-field">
                            <Controller
                              name={`offers.${index}.increment_type` as const}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <select
                                    {...field}
                                    onChange={(e) => {
                                      console.log(`🔧 FRONTEND DEBUG: Mobile increment type changed for index ${index}:`, e.target.value);
                                      field.onChange(e);
                                      console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                    }}
                                    className="w-full input-padding-base input-height-base text-responsive-sm border border-gray-300 rounded bg-white text-black appearance-none"
                                  >
                                    <option value="Percentage">{t('dashboard:availableRates.percentage')}</option>
                                    <option value="Additional">{t('dashboard:availableRates.additional')}</option>
                                  </select>
                                  {fieldState.error && (
                                    <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                        <div className="form-field">
                          <label className="form-label">
                            {t('dashboard:specialOffers.value', { defaultValue: 'Value' })}*
                          </label>
                          <div className="form-field">
                            <Controller
                              name={`offers.${index}.increment_value` as const}
                              control={control}
                              render={({ field, fieldState }) => (
                                <>
                                  <input
                                    type="text"
                                    {...field}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      console.log(`🔧 FRONTEND DEBUG: Mobile increment value (raw) changed for index ${index}:`, value);
                                      field.onChange(value);
                                      console.log(`🔧 FRONTEND DEBUG: Current form values after change:`, getValues());
                                    }}
                                    placeholder="0"
                                    className="w-full input-padding-base input-height-base text-responsive-sm text-center border border-gray-300 rounded text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    inputMode="decimal"
                                  />
                                  {fieldState.error && (
                                    <div className="mt-1 text-xs text-red-600">{fieldState.error.message}</div>
                                  )}
                                </>
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-center mt-8 mb-4 space-y-4 lg:space-y-0">
            <button 
              onClick={addNewOffer}
              className="flex items-center gap-3 btn-padding-base bg-[#C4D4F5] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-blue-100 transition-colors text-responsive-base"
            >
              <Plus size={24} />
              {t('dashboard:specialOffers.addOffer')}
            </button>
            <button 
              onClick={() => {
                console.log('🔧 FRONTEND DEBUG: Save button clicked');
                console.log('🔧 FRONTEND DEBUG: Current form state:', {
                  isValid: formState.isValid,
                  errors: formState.errors,
                  values: getValues(),
                  fields: fields
                });
                
                handleSubmit(onSubmit, () => {
                  console.log('🔧 FRONTEND DEBUG: Form validation failed');
                  console.log('🔧 FRONTEND DEBUG: Validation errors:', formState.errors);
                  
                  // Show a concise banner and focus first error
                  toast({
                    title: t('common:messages.validationError', { defaultValue: 'Validation Error' }),
                    description: t('common:messages.fixErrors', { defaultValue: 'Please fix the highlighted errors and try again.' }),
                    variant: 'destructive',
                  });
                  // Try to focus the first invalid field
                  const offersErrors = formState.errors?.offers as any[] | undefined;
                  if (offersErrors && offersErrors.length > 0) {
                    const firstIdx = offersErrors.findIndex(Boolean);
                    if (firstIdx >= 0) {
                      const errObj = offersErrors[firstIdx] || {};
                      const firstField = Object.keys(errObj)[0];
                      if (firstField) setFocus(`offers.${firstIdx}.${firstField}` as any);
                    }
                  }
                })();
              }}
              disabled={saving || fields.length === 0}
              className="flex items-center gap-4 btn-padding-base bg-[#294758] text-white rounded-lg font-semibold hover:bg-[#234149] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-responsive-base"
            >
              <Save size={24} />
              {saving ? t('common:messages.saving') : t('common:buttons.save')}
            </button>
          </div>

          {/* Created Offers Summary */}
          {fields.length > 0 && (
            <div className="bg-[#F9FAFB] border border-[#EBEDF0] rounded-lg container-padding-base container-margin-sm">
              <h3 className="text-responsive-base font-bold text-gray-900 container-margin-sm">
                {t('dashboard:specialOffers.createdOffersSummary', { defaultValue: 'Created Offers Summary' })}
              </h3>
              <div className="form-gap-base text-responsive-sm">
                {fields.filter((offer: any) => offer.id).map((offer: any, index) => (
                  <p key={offer.id || index}>
                    <span className="text-gray-900 font-semibold">{offer.offer_name || t('dashboard:specialOffers.unnamedOffer', { defaultValue: 'Unnamed Offer' })}</span>
                    <span className="text-gray-500"> — {t('dashboard:specialOffers.validFromTo', { from: offer.valid_from, to: offer.valid_until, defaultValue: `valid from ${offer.valid_from} to ${offer.valid_until}` })}</span>
                    {offer.applied_from_days !== null && offer.applied_until_days !== null && (
                      <span className="text-gray-500"> ({t('dashboard:specialOffers.appliedDaysBefore', { from: offer.applied_from_days, to: offer.applied_until_days, defaultValue: `applied ${offer.applied_from_days}-${offer.applied_until_days} days before` })})</span>
                    )}
                    <span className="text-gray-700"> — {offer.increment_type === 'Percentage' ? `${offer.increment_value}%` : `+${offer.increment_value}`}</span>
                  </p>
                ))}
                {fields.filter((offer: any) => !offer.id).length > 0 && (
                  <p className="text-blue-600 font-semibold">
                    {t('dashboard:specialOffers.newOffersPending', { count: fields.filter((offer: any) => !offer.id).length, defaultValue: `${fields.filter((offer: any) => !offer.id).length} new offer(s) pending save` })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tips Section */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg container-padding-base container-margin-sm">
          <div className="flex items-center gap-3 container-margin-sm">
            <Info size={25} className="text-[#294758] hidden lg:inline" />
            <h3 className="text-responsive-lg font-bold text-[#294758]">
              {t('dashboard:specialOffers.tipsTitle', { defaultValue: 'Tips for Creating Special Offers' })}
            </h3>
          </div>
          <div className="text-black/60 leading-relaxed form-gap-base text-responsive-base">
            <p>
              • {t('dashboard:specialOffers.tip1', { defaultValue: 'Define clear start and end dates to avoid overlapping promotions' })}
            </p>
            <p>
              • {t('dashboard:specialOffers.tip2', { defaultValue: 'Use descriptive names (e.g., Summer Discount, Weekend Deal) for easy identification' })}
            </p>
            <p>
              • {t('dashboard:specialOffers.tip3', { defaultValue: 'Combine fixed and percentage discounts strategically to attract different guests' })}
            </p>
            <p>
              • {t('dashboard:specialOffers.tip4', { defaultValue: 'Schedule offers in advance to align with holidays or local events' })}
            </p>
            <p>
              • {t('dashboard:specialOffers.tip5', { defaultValue: 'Keep discounts visible close to check-in dates to increase last-minute bookings' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
