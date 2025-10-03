import { Plus, Save, Trash2, Calendar, Info } from "lucide-react";
import { useState, useEffect, useContext } from "react";
import { useForm, FormProvider, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { toast } from "../../hooks/use-toast";
import type {
  LosSetupRule,
  CreateLosSetupRuleRequest,
  UpdateLosSetupRuleRequest,
} from "../../../shared/api/dynamic";

export default function LosSetupRules() {
  const { property } = useContext(PropertyContext) ?? {};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Weekday options
  const weekdays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ] as const;

  // Zod schema for a single rule
  const RuleSchema = z
    .object({
      id: z.union([z.number(), z.string()]).optional(),
      property_id: z.string().min(1, 'property_id is required'),
      valid_from: z.string().min(1, 'valid_from is required'),
      valid_until: z.string().min(1, 'valid_until is required'),
      day_of_week: z.enum(weekdays, {
        errorMap: () => ({ message: 'Invalid day of week' }),
      }),
      los_value: z.coerce.number().int().min(1, 'LOS must be at least 1'),
      // Optional backend-only
      num_competitors: z.coerce.number().int().min(1).optional(),
      los_aggregation: z.string().optional(),
    })
    .superRefine((val, ctx) => {
      // Date range validation
      const from = new Date(val.valid_from);
      const until = new Date(val.valid_until);
      if (isNaN(from.getTime()) || isNaN(until.getTime())) {
        return; // basic required check already handled above
      }
      // Backend requires strictly before (not equal)
      if (from >= until) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'valid_from must be before valid_until',
          path: ['valid_until'],
        });
      }
    });

  const FormSchema = z.object({
    rules: z.array(RuleSchema),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { rules: [] },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const { control, handleSubmit, reset, formState, getValues, setError: setFormError } = form;
  const { fields, append, remove, update } = useFieldArray({ control, name: 'rules' });

  // Load existing data on component mount
  useEffect(() => {
    if (property?.id) {
      loadExistingData();
    }
  }, [property?.id]);

  const loadExistingData = async () => {
    if (!property?.id) return;
    
    setIsLoading(true);
    
    try {
      const response = await dynamicPricingService.getLosSetupRules(property.id);
      // Initialize form with backend data
      reset({
        rules: (response.setups || []).map((r: LosSetupRule) => ({
          ...r,
          // ensure strings for date inputs
          valid_from: String(r.valid_from),
          valid_until: String(r.valid_until),
          num_competitors: r?.num_competitors ?? 2,
          los_aggregation: r?.los_aggregation ?? 'min',
        })),
      });
    } catch (error) {
      console.error("Error loading LOS setup data:", error);
      toast({
        title: "Error",
        description: "Failed to load existing LOS setup configuration",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSetupRule = () => {
    append({
      id: `temp_${Date.now()}` as any,
      property_id: property?.id || '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: new Date().toISOString().split('T')[0],
      day_of_week: 'Monday',
      los_value: 1,
      num_competitors: 2,
      los_aggregation: 'min',
    } as any);
  };

  const removeSetupRule = async (index: number) => {
    if (!property?.id) return;

    const current = getValues().rules?.[index];
    try {
      if (current && typeof current.id === 'number') {
        await dynamicPricingService.deleteLosSetupRule(property.id, current.id);
      }
      remove(index);
    } catch (error: any) {
      console.error("Error deleting setup rule:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = "Failed to delete setup rule. Please try again.";
      
      // Try to parse the detail field first
      if (error?.detail) {
        try {
          const errorData = JSON.parse(error.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              // If field is non_field_errors, do not prefix with the key
              if (field === 'non_field_errors') {
                errorMessages.push(`${messageText}`);
              } else {
                errorMessages.push(`${field}: ${messageText}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.detail;
        }
      } else if (error?.response?.data?.detail) {
        try {
          const errorData = JSON.parse(error.response.data.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              if (field === 'non_field_errors') {
                errorMessages.push(`${messageText}`);
              } else {
                errorMessages.push(`${field}: ${messageText}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.response.data.detail;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // update handled by react-hook-form registration

  const saveRule = async (rule: LosSetupRule) => {
    if (!property?.id) return;

    try {
      if (typeof rule.id === 'string') {
        // This is a new rule - create it
        const createData: CreateLosSetupRuleRequest = {
          property_id: property.id,
          valid_from: rule.valid_from,
          valid_until: rule.valid_until,
          day_of_week: rule.day_of_week,
          los_value: rule.los_value,
          num_competitors: 2, // Default value
          los_aggregation: "min", // Default value
        };

        const response = await dynamicPricingService.createLosSetupRule(property.id, createData);
        // Update the form value with the new ID
        const currentValues = getValues().rules;
        const idx = currentValues.findIndex((r) => r.id === rule.id);
        if (idx !== -1) {
          update(idx, { ...response.setup } as any);
        }
      } else {
        // This is an existing rule - update it
        const updateData: UpdateLosSetupRuleRequest = {
          valid_from: rule.valid_from,
          valid_until: rule.valid_until,
          day_of_week: rule.day_of_week,
          los_value: rule.los_value,
          num_competitors: 2, // Default value
          los_aggregation: "min", // Default value
        };

        await dynamicPricingService.updateLosSetupRule(property.id, rule.id, updateData);
      }
    } catch (error: any) {
      console.error("Error saving rule:", error);
      // Extract detailed error message from backend response
      let errorMessage = "Failed to save rule. Please try again.";
      
      // Try to parse the detail field first
      if (error?.detail) {
        try {
          const errorData = JSON.parse(error.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              if (field === 'non_field_errors') {
                errorMessages.push(`${messageText}`);
              } else {
                errorMessages.push(`${field}: ${messageText}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.detail;
        }
      } else if (error?.response?.data?.detail) {
        try {
          const errorData = JSON.parse(error.response.data.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              if (field === 'non_field_errors') {
                errorMessages.push(`${messageText}`);
              } else {
                errorMessages.push(`${field}: ${messageText}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.response.data.detail;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      // Throw so the aggregate saver can control the banner
      throw new Error(errorMessage);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!property?.id) {
      toast({
        title: "Error",
        description: "No property selected",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Save all rules and evaluate outcomes
      const results = await Promise.allSettled(values.rules.map(rule => saveRule(rule as any)));

      const rejected = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      if (rejected.length > 0) {
        const messages = Array.from(new Set(rejected.map(r => {
          const reason: any = r.reason;
          return typeof reason === 'string' ? reason : reason?.message || 'Failed to save one or more LOS setup rules. Please fix errors and try again.';
        })));
        toast({
          title: "Error",
          description: messages.join('; '),
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "All LOS setup rules saved successfully!",
      });
      
    } catch (error: any) {
      console.error("Error saving LOS setup rules:", error);
      
      // Extract detailed error message from backend response
      let errorMessage = "Failed to save LOS setup rules. Please try again.";
      
      // Try to parse the detail field first
      if (error?.detail) {
        try {
          const errorData = JSON.parse(error.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              if (field === 'non_field_errors') {
                errorMessages.push(`${messageText}`);
              } else {
                errorMessages.push(`${field}: ${messageText}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.detail;
        }
      } else if (error?.response?.data?.detail) {
        try {
          const errorData = JSON.parse(error.response.data.detail);
          if (errorData.errors) {
            // Format validation errors
            const errorMessages = [];
            for (const [field, messages] of Object.entries(errorData.errors)) {
              const messageText = Array.isArray(messages) ? messages.join(', ') : messages;
              if (field === 'non_field_errors') {
                errorMessages.push(`${messageText}`);
              } else {
                errorMessages.push(`${field}: ${messageText}`);
              }
            }
            errorMessage = errorMessages.join('; ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If parsing fails, use the raw detail
          errorMessage = error.response.data.detail;
        }
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state if no property is available
  if (!property) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">No property selected</div>
          <div className="text-sm text-gray-500">Please select a property to configure LOS setup rules</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          <FormProvider {...form}>
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <Calendar size={34} className="text-[#287CAC]" />
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                LOS Setup Rules
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                Configure length of stay requirements by weekday.
              </p>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800 font-normal">Loading LOS setup rules...</span>
              </div>
            </div>
          )}



          {/* Setup Rules Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-black">Setup Rules</h3>
              {fields.length > 0 && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {fields.length} rule{fields.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden rounded-lg border border-[#D0DFE6] mb-6">
              {/* Table Headers */}
              <div className="grid grid-cols-5 gap-0">
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">From</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold">To</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">Day</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4 flex items-center gap-2">
                  <span className="text-base font-semibold text-center">LOS Value</span>
                  <Info size={20} className="text-white" />
                </div>
                <div className="bg-hotel-brand-dark text-white p-4">
                </div>
              </div>

              {/* Table Rows */}
              {fields.map((rule, index) => (
                <div key={rule.id || index} className="grid grid-cols-5 gap-0">
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="date"
                      {...form.register(`rules.${index}.valid_from` as const)}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {formState.errors?.rules?.[index]?.valid_from?.message && (
                      <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.valid_from?.message)}</div>
                    )}
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="date"
                      {...form.register(`rules.${index}.valid_until` as const)}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    {formState.errors?.rules?.[index]?.valid_until?.message && (
                      <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.valid_until?.message)}</div>
                    )}
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <select
                      {...form.register(`rules.${index}.day_of_week` as const)}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {weekdays.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                    {formState.errors?.rules?.[index]?.day_of_week?.message && (
                      <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.day_of_week?.message)}</div>
                    )}
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6]">
                    <input
                      type="number"
                      {...form.register(`rules.${index}.los_value`, { valueAsNumber: true })}
                      disabled={isLoading || isSaving}
                      className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      min="1"
                    />
                    {formState.errors?.rules?.[index]?.los_value?.message && (
                      <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.los_value?.message)}</div>
                    )}
                  </div>
                  <div className="bg-[#EFF6FF] p-3 border border-[#D0DFE6] flex justify-center">
                    <button
                      onClick={() => removeSetupRule(index)}
                      disabled={isLoading || isSaving}
                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden space-y-4 mb-6">
              {fields.map((rule, index) => (
                <div key={rule.id || index} className="bg-white border border-[#D0DFE6] rounded-lg p-4 space-y-4">
                  {/* Header with delete button */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-700">
                      Rule {index + 1}
                    </h4>
                    <button
                      onClick={() => removeSetupRule(index)}
                      disabled={isLoading || isSaving}
                      className="w-8 h-8 p-1 border border-red-300 bg-red-50 rounded-md flex items-center justify-center hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Date
                        <Info size={14} className="inline ml-1 text-gray-600" />
                      </label>
                      <input
                        type="date"
                        {...form.register(`rules.${index}.valid_from` as const)}
                        disabled={isLoading || isSaving}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {formState.errors?.rules?.[index]?.valid_from?.message && (
                        <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.valid_from?.message)}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        To Date
                        <Info size={14} className="inline ml-1 text-gray-600" />
                      </label>
                      <input
                        type="date"
                        {...form.register(`rules.${index}.valid_until` as const)}
                        disabled={isLoading || isSaving}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {formState.errors?.rules?.[index]?.valid_until?.message && (
                        <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.valid_until?.message)}</div>
                      )}
                    </div>
                  </div>

                  {/* Day and LOS Value */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day
                        <Info size={14} className="inline ml-1 text-gray-600" />
                      </label>
                      <select
                        {...form.register(`rules.${index}.day_of_week` as const)}
                        disabled={isLoading || isSaving}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                      </select>
                      {formState.errors?.rules?.[index]?.day_of_week?.message && (
                        <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.day_of_week?.message)}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        LOS Value
                        <Info size={14} className="inline ml-1 text-gray-600" />
                      </label>
                      <input
                        type="number"
                        {...form.register(`rules.${index}.los_value`, { valueAsNumber: true })}
                        disabled={isLoading || isSaving}
                        className="w-full px-3 py-2 text-sm text-center border border-gray-300 rounded bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        min="1"
                      />
                      {formState.errors?.rules?.[index]?.los_value?.message && (
                        <div className="mt-1 text-xs text-red-600">{String(formState.errors.rules[index]?.los_value?.message)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button 
                onClick={addSetupRule}
                disabled={isLoading || isSaving}
                className="flex items-center gap-3 px-6 py-3 bg-[#F0F0F0] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                Add Setup Rule
              </button>
              
              <button 
                onClick={handleSubmit(onSubmit)}
                disabled={isSaving || isLoading || !formState.isValid}
                className="flex items-center gap-2 px-6 py-3 bg-[#294758] text-white rounded-lg font-semibold hover:bg-[#234149] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
          </FormProvider>
        </div>
      </div>
    </div>
  );
}
