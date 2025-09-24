import { useState, useEffect, useContext } from "react";
import {
  Plus,
  Save,
  ChevronDown,
  TrendingUp,
  Percent,
  DollarSign,
  Users,
  Clock,
  Trash2,
} from "lucide-react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService } from "../../../shared/api/dynamic";
import { toast } from "../../hooks/use-toast";

// Category definitions matching the backend model
const OCCUPANCY_CATEGORIES = [
  { value: '0-30', label: '0-30%' },
  { value: '30-50', label: '30-50%' },
  { value: '50-70', label: '50-70%' },
  { value: '70-80', label: '70-80%' },
  { value: '80-90', label: '80-90%' },
  { value: '90-100', label: '90-100%' },
  { value: '100+', label: '100%+' },
];

const LEAD_TIME_CATEGORIES = [
  { value: '0-1', label: '0-1 days' },
  { value: '1-3', label: '1-3 days' },
  { value: '3-7', label: '3-7 days' },
  { value: '7-14', label: '7-14 days' },
  { value: '14-30', label: '14-30 days' },
  { value: '30-45', label: '30-45 days' },
  { value: '45-60', label: '45-60 days' },
  { value: '60+', label: '60+ days' },
];

interface DynamicRule {
  id?: number;
  occupancy_category: string;
  lead_time_category: string;
  increment_type: 'Percentage' | 'Additional';
  increment_value: number;
  isNew?: boolean;
}

export default function DynamicSetup() {
  const { property } = useContext(PropertyContext) ?? {};
  const [rules, setRules] = useState<DynamicRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing rules on component mount
  useEffect(() => {
    if (property?.id) {
      loadRules();
    }
  }, [property?.id]);

  const loadRules = async () => {
    if (!property?.id) return;
    
    setLoading(true);
    try {
      const response = await dynamicPricingService.getDynamicRules(property.id);
      setRules(response.rules.map(rule => ({ ...rule, isNew: false })));
    } catch (err: any) {
      const backendMsg = err?.response?.data?.message || err?.message || 'Failed to load dynamic rules';
      toast({ title: 'Error', description: backendMsg, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const addNewRule = () => {
    const newRule: DynamicRule = {
      occupancy_category: '',
      lead_time_category: '',
      increment_type: 'Percentage',
      increment_value: 0,
      isNew: true
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (index: number, field: keyof DynamicRule, value: any) => {
    const updatedRules = [...rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setRules(updatedRules);
  };

  const removeRule = async (index: number) => {
    const rule = rules[index];
    
    // If it's an existing rule, delete it from the server
    if (rule.id && !rule.isNew) {
      if (!property?.id) return;
      
      try {
        await dynamicPricingService.deleteDynamicRule(property.id, rule.id);
        toast({
          title: "Success",
          description: "Rule deleted successfully",
        });
      } catch (err: any) {
        toast({
          title: "Error",
          description: err.message || 'Failed to delete rule',
          variant: "destructive",
        });
        return;
      }
    }
    
    // Remove from local state
    const updatedRules = rules.filter((_, i) => i !== index);
    setRules(updatedRules);
  };

  const saveRules = async () => {
    if (!property?.id) return;
    
    setSaving(true);
    
    try {
      const newRules = rules.filter(rule => rule.isNew);
      const existingRules = rules.filter(rule => !rule.isNew);
      
      // Update existing rules
      for (const rule of existingRules) {
        if (rule.id) {
          await dynamicPricingService.updateDynamicRule(property.id, rule.id, {
            occupancy_category: rule.occupancy_category,
            lead_time_category: rule.lead_time_category,
            increment_type: rule.increment_type,
            increment_value: rule.increment_value
          });
        }
      }
      
      // Create new rules
      if (newRules.length > 0) {
        const validNewRules = newRules.filter(rule => 
          rule.occupancy_category && rule.lead_time_category
        );
        
        if (validNewRules.length > 0) {
          await dynamicPricingService.bulkCreateDynamicRules(property.id, {
            rules: validNewRules.map(rule => ({
              occupancy_category: rule.occupancy_category,
              lead_time_category: rule.lead_time_category,
              increment_type: rule.increment_type,
              increment_value: rule.increment_value
            }))
          });
        }
      }
      
      toast({
        title: "Success",
        description: "Dynamic rules saved successfully",
      });
      loadRules(); // Reload to get updated data
    } catch (err: any) {
      const backendMsg = err?.response?.data?.message || err?.message || 'Failed to save dynamic rules';
      toast({ title: 'Error', description: backendMsg, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const IncrementTypeSelector = ({
    value,
    onChange
  }: {
    value: 'Percentage' | 'Additional';
    onChange: (value: 'Percentage' | 'Additional') => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as 'Percentage' | 'Additional')}
      className="w-full px-3 py-[10px] text-xs border border-gray-300 rounded bg-white text-black appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]"
    >
      <option value="Percentage">Percentage</option>
      <option value="Additional">Additional</option>
    </select>
  );

  const OccupancySelector = ({
    value,
    onChange
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-[9px] text-xs border border-gray-300 rounded bg-white text-black appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[177px]"
    >
      <option value="">Select occupancy</option>
      {OCCUPANCY_CATEGORIES.map(category => (
        <option key={category.value} value={category.value}>
          {category.label}
        </option>
      ))}
    </select>
  );

  const LeadTimeSelector = ({
    value,
    onChange
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-[9px] text-xs border border-gray-300 rounded bg-white text-black appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[217px]"
    >
      <option value="">Select lead time</option>
      {LEAD_TIME_CATEGORIES.map(category => (
        <option key={category.value} value={category.value}>
          {category.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp size={34} className="text-[#287CAC]" />
            <div>
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Dynamic Set Up
              </h2>
              <p className="text-[#8A8E94] font-bold text-lg">
                Configure dynamic pricing rules based on occupancy and lead time
              </p>
            </div>
          </div>


          {/* Rules Table */}
          <div className="mb-8">
            {/* Table Headers */}
            <div className="grid grid-cols-5 gap-6 mb-4 text-[#494951] font-semibold text-base">
              <div>Occupancy</div>
              <div>Lead Time</div>
              <div>Increment Type</div>
              <div>Increment Value</div>
              <div></div>
            </div>

            {/* Divider Line */}
            <div className="w-full h-px bg-hotel-divider mb-5"></div>

            {/* Table Rows */}
            <div className="space-y-5">
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Loading dynamic rules...</p>
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No dynamic rules found. Click "Add Rule" to create your first dynamic pricing rule.</p>
                </div>
              ) : (
                rules.map((rule, index) => (
                  <div
                    key={rule.id || `new-${index}`}
                    className={`grid grid-cols-5 gap-6 items-center p-3 rounded-lg ${
                      rule.isNew ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                    }`}
                  >
                    {/* Occupancy */}
                    <div>
                      <OccupancySelector
                        value={rule.occupancy_category}
                        onChange={(value) => updateRule(index, 'occupancy_category', value)}
                      />
                    </div>

                    {/* Lead Time */}
                    <div>
                      <LeadTimeSelector
                        value={rule.lead_time_category}
                        onChange={(value) => updateRule(index, 'lead_time_category', value)}
                      />
                    </div>

                    {/* Increment Type */}
                    <div>
                      <IncrementTypeSelector
                        value={rule.increment_type}
                        onChange={(value) => updateRule(index, 'increment_type', value)}
                      />
                    </div>

                    {/* Increment Value */}
                    <div>
                      <input
                        type="number"
                        value={rule.increment_value}
                        onChange={(e) => updateRule(index, 'increment_value', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        min="0"
                        className="w-full px-3 py-[11px] text-xs border border-gray-300 rounded bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[234px]"
                      />
                    </div>

                    {/* Actions */}
                    <div>
                      <button 
                        onClick={() => removeRule(index)}
                        className="px-3 py-[10px] border border-gray-300 rounded bg-white text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors min-w-[80px] flex items-center justify-center"
                        title="Delete rule"
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
              onClick={addNewRule}
              className="flex items-center gap-3 px-7 py-3 bg-[#C4D4F5] border border-[#294758] text-[#294758] rounded-lg font-semibold hover:bg-blue-100 transition-colors"
            >
              <Plus size={24} />
              Add Rule
            </button>
            <button 
              onClick={saveRules}
              disabled={saving || rules.length === 0}
              className="flex items-center gap-5 px-6 py-3 bg-[#294758] text-white rounded-lg font-semibold hover:bg-[#234149] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={24} />
              {saving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-8 mt-8">
          <div className="mb-3">
            <h3 className="text-lg font-bold text-[#294758]">How It Works</h3>
          </div>
          <div className="text-black/60 leading-relaxed space-y-3">
            <p>
              The system automatically creates occupancy and lead time ranges
              from your threshold values and applies increments based on current
              conditions.
            </p>
            <p className="text-xs">
              Example: At 50% occupancy (30-50% range) with 7 days lead time
              (3-7 days range): $20 additional charge
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
