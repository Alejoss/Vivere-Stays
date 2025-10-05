import {
  Bot,
  Plus,
  Check,
  Info,
  Trash2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Minus,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { useState, useEffect, useContext } from "react";
import { PropertyContext } from "../../../shared/PropertyContext";
import { dynamicPricingService, CompetitorCandidate, PropertyCompetitor } from "../../../shared/api/dynamic";
import { toast } from "../../hooks/use-toast";
import "../../styles/responsive-utilities.css";

export default function Competitors() {
  const { property } = useContext(PropertyContext)!;
  const [selectedAggregation, setSelectedAggregation] = useState("Minimum");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentCalculation, setCurrentCalculation] = useState<string>("min");
  
  // New state for competitors
  const [competitorCandidates, setCompetitorCandidates] = useState<CompetitorCandidate[]>([]);
  const [processedCompetitors, setProcessedCompetitors] = useState<PropertyCompetitor[]>([]);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingProcessed, setIsLoadingProcessed] = useState(false);
  
  // AI suggestion state
  const [isLoadingAISuggestions, setIsLoadingAISuggestions] = useState(false);
  
  // Editing state
  const [editingField, setEditingField] = useState<{ type: 'candidate' | 'competitor', id: string, field: 'name' | 'url' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Local input values for editing
  const [localInputValues, setLocalInputValues] = useState<{[key: string]: {name: string, url: string}}>({});
  
  // Add competitor form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCompetitorName, setNewCompetitorName] = useState('');
  const [newCompetitorUrl, setNewCompetitorUrl] = useState('');
  const [isCreatingCompetitor, setIsCreatingCompetitor] = useState(false);

  const aggregationOptions = ["Maximum", "Average", "Median", "Minimum"];

  // Mapping from frontend display names to backend values
  const aggregationMapping = {
    "Maximum": "max",
    "Average": "avg", 
    "Median": "median",
    "Minimum": "min"
  };

  // Mapping from backend values to frontend display names
  const reverseAggregationMapping = {
    "max": "Maximum",
    "avg": "Average",
    "median": "Median", 
    "min": "Minimum"
  };

  // Function to get the appropriate icon for each aggregation method
  const getAggregationIcon = (aggregation: string) => {
    switch (aggregation) {
      case "Maximum":
        return <TrendingUp size={24} className="text-[#16B257]" />;
      case "Average":
        return <BarChart3 size={24} className="text-[#16B257]" />;
      case "Median":
        return <Minus size={24} className="text-[#16B257]" />;
      case "Minimum":
        return <TrendingDown size={24} className="text-[#16B257]" />;
      default:
        return <BarChart3 size={24} className="text-[#16B257]" />;
    }
  };

  // Function to get status icon for competitor candidates
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Clock size={20} className="text-blue-600" />
          </div>
        );
      case "finished":
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check size={20} className="text-green-600" />
          </div>
        );
      case "error":
        return (
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle size={20} className="text-red-600" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <Info size={20} className="text-gray-600" />
          </div>
        );
    }
  };

  // Function to get status icon for processed competitors
  const getProcessedStatusIcon = () => {
    return (
      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
        <Check size={20} className="text-green-600" />
      </div>
    );
  };

  // Handle aggregation change
  const handleAggregationChange = async (newAggregation: string) => {
    console.log('🔧 FRONTEND DEBUG: handleAggregationChange called with:', newAggregation);
    
    if (!property) {
      console.log('🔧 FRONTEND DEBUG: No property selected');
      toast({
        title: "Error",
        description: "No property selected. Please select a property first.",
        variant: "destructive",
      });
      return;
    }

    const backendValue = aggregationMapping[newAggregation as keyof typeof aggregationMapping];
    console.log('🔧 FRONTEND DEBUG: Mapped to backend value:', backendValue);
    
    if (!backendValue) {
      console.log('🔧 FRONTEND DEBUG: Invalid aggregation method');
      toast({
        title: "Error",
        description: "Invalid aggregation method selected.",
        variant: "destructive",
      });
      return;
    }

    console.log('🔧 FRONTEND DEBUG: Making API call to update comp_price_calculation');
    console.log('🔧 FRONTEND DEBUG: Property ID:', property.id);
    console.log('🔧 FRONTEND DEBUG: Data being sent:', { comp_price_calculation: backendValue });
    
    setIsUpdating(true);
    try {
      const response = await dynamicPricingService.updateCompPriceCalculation(property.id, {
        comp_price_calculation: backendValue as 'min' | 'max' | 'avg' | 'median'
      });
      
      console.log('🔧 FRONTEND DEBUG: API response:', response);
      
      setSelectedAggregation(newAggregation);
      setCurrentCalculation(backendValue);
      
      toast({
        title: "Success",
        description: `Competitor price aggregation updated to ${newAggregation}`,
      });
    } catch (error: any) {
      console.error("🔧 FRONTEND DEBUG: Error updating aggregation:", error);
      console.error("🔧 FRONTEND DEBUG: Error details:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method
      });
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update competitor price aggregation",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
      setShowDropdown(false);
    }
  };

  // Fetch competitor candidates
  const fetchCompetitorCandidates = async () => {
    if (!property) return;
    
    setIsLoadingCandidates(true);
    
    try {
      const response = await dynamicPricingService.getCompetitorCandidates(property.id);
      setCompetitorCandidates(response.candidates);
    } catch (error: any) {
      console.error("Error fetching competitor candidates:", error);
      const backendMsg = error?.response?.data?.message || error?.message || "Failed to fetch competitor candidates";
      toast({ title: "Error", description: backendMsg, variant: "destructive" });
    } finally {
      setIsLoadingCandidates(false);
    }
  };

  // Fetch processed competitors
  const fetchProcessedCompetitors = async () => {
    if (!property) return;
    
    setIsLoadingProcessed(true);
    
    try {
      const response = await dynamicPricingService.getPropertyCompetitors(property.id);
      setProcessedCompetitors(response.competitors);
    } catch (error: any) {
      console.error("Error fetching processed competitors:", error);
      const backendMsg = error?.response?.data?.message || error?.message || "Failed to fetch processed competitors";
      toast({ title: "Error", description: backendMsg, variant: "destructive" });
    } finally {
      setIsLoadingProcessed(false);
    }
  };

  // AI suggestion function
  const handleAISuggestions = async () => {
    if (!property) {
      toast({
        title: "Error",
        description: "No property selected. Please select a property first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingAISuggestions(true);

    try {
      // Get property location data
      const locationData = {
        address: property.street_address || '',
        city: property.city || '',
        country: property.country || '',
        postal_code: property.postal_code || ''
      };

      // Check if we have required location data
      if (!locationData.address || !locationData.city) {
        toast({
          title: "Error",
          description: "Property address and city are required for AI suggestions. Please update your property information.",
          variant: "destructive",
        });
        return;
      }

      console.log('🤖 Fetching AI suggestions for property:', property.name);
      console.log('📍 Location data:', locationData);

      // Call the nearby hotels API with 3 competitors
      const hotelNames = await dynamicPricingService.getNearbyHotels(locationData, 3);
      
      console.log('🏨 AI suggested hotels:', hotelNames);

      if (hotelNames && Array.isArray(hotelNames) && hotelNames.length > 0) {
        // Clean hotel names (similar to AddCompetitor component)
        const cleanHotelName = (name: string): string => {
          if (!name) return '';
          
          return name
            .replace(/["""]/g, '') // Remove quotes
            .replace(/[''']/g, '') // Remove single quotes
            .replace(/[\/\\]/g, '') // Remove forward and backward slashes
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/[{}]/g, '') // Remove curly braces
            .replace(/[\[\]]/g, '') // Remove square brackets
            .replace(/[|]/g, '') // Remove pipe
            .replace(/[`~!@#$%^&*()_+=]/g, '') // Remove other special characters
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim(); // Remove leading/trailing spaces
        };

        const cleanedHotels = hotelNames
          .map(name => cleanHotelName(name))
          .filter(name => name.length > 0);

        if (cleanedHotels.length > 0) {
          // Create competitor candidates from AI suggestions
          const response = await dynamicPricingService.createCompetitorCandidates({
            competitor_names: cleanedHotels,
            suggested_by_user: false  // Mark as AI-suggested
          });

          console.log('✅ AI suggestions created:', response);

          // Refresh the competitor lists
          await fetchCompetitorCandidates();
          await fetchProcessedCompetitors();

          // Show success message with details about created vs existing candidates
          const totalCreated = response.total_created || 0;
          const totalErrors = response.errors?.length || 0;
          
          if (totalCreated > 0 && totalErrors === 0) {
            toast({
              title: "Success",
              description: `AI suggested ${totalCreated} new competitor(s) based on your property location`,
            });
          } else if (totalCreated > 0 && totalErrors > 0) {
            toast({
              title: "Partial Success",
              description: `AI suggested ${totalCreated} competitor(s), ${totalErrors} were already added`,
            });
          } else if (totalCreated === 0 && totalErrors > 0) {
            toast({
              title: "Already Added",
              description: `All ${totalErrors} suggested competitors were already in your list`,
            });
          } else {
            toast({
              title: "Success",
              description: `AI suggested ${cleanedHotels.length} competitor(s) based on your property location`,
            });
          }
        } else {
          toast({
            title: "No suggestions",
            description: "AI couldn't find suitable competitors for your property location",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "No suggestions",
          description: "AI couldn't find suitable competitors for your property location",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("❌ Error getting AI suggestions:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || "Failed to get AI suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAISuggestions(false);
    }
  };

  // Fetch general settings to load current comp_price_calculation
  const fetchGeneralSettings = async () => {
    if (!property) return;
    
    try {
      console.log('🔧 FRONTEND DEBUG: Fetching general settings for property:', property.id);
      const generalSettings = await dynamicPricingService.getGeneralSettings(property.id);
      console.log('🔧 FRONTEND DEBUG: Loaded general settings:', generalSettings);
      
      // Set the current calculation and selected aggregation
      setCurrentCalculation(generalSettings.comp_price_calculation);
      const frontendValue = reverseAggregationMapping[generalSettings.comp_price_calculation as keyof typeof reverseAggregationMapping];
      if (frontendValue) {
        setSelectedAggregation(frontendValue);
        console.log('🔧 FRONTEND DEBUG: Set selectedAggregation to:', frontendValue);
      }
      
    } catch (error) {
      console.error("Error loading general settings:", error);
      // Don't show error to user since it's not critical
    }
  };

  // Fetch all competitors when property changes
  useEffect(() => {
    if (property) {
      fetchGeneralSettings();
      fetchProcessedCompetitors();
      fetchCompetitorCandidates();
    }
  }, [property]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  // Note: selectedAggregation is now set in fetchGeneralSettings() when property loads

  const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) => (
    <div
      className={`w-14 h-8 rounded-full flex items-center ${enabled ? "bg-[#2C4E60]" : "bg-gray-300"} transition-colors cursor-pointer`}
      onClick={() => onChange(!enabled)}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`}
      />
    </div>
  );

  // Handle only_follow toggle for processed competitors
  const handleOnlyFollowToggle = async (competitorId: string, newValue: boolean) => {
    if (!property) return;
    
    try {
      await dynamicPricingService.updatePropertyCompetitor(property.id, competitorId, {
        only_follow: newValue
      });
      
      // Update local state
      setProcessedCompetitors(prev => 
        prev.map(comp => 
          comp.id === competitorId 
            ? { ...comp, only_follow: newValue }
            : comp
        )
      );
      
      toast({
        title: "Success",
        description: `Competitor ${newValue ? 'set to' : 'removed from'} follow-only mode`,
      });
    } catch (error: any) {
      console.error("Error updating only_follow:", error);
      const backendMsg = error?.response?.data?.message || error?.message || "Failed to update competitor follow status";
      toast({ title: "Error", description: backendMsg, variant: "destructive" });
    }
  };

  // Handle delete competitor candidate
  const handleDeleteCandidate = async (candidateId: string, competitorName: string) => {
    if (!property) return;
    
    try {
      await dynamicPricingService.deleteCompetitorCandidate(property.id, candidateId);
      
      // Remove from local state
      setCompetitorCandidates(prev => 
        prev.filter(candidate => candidate.id !== candidateId)
      );
      
      toast({
        title: "Success",
        description: `Competitor candidate "${competitorName}" deleted successfully`,
      });
    } catch (error: any) {
      console.error("Error deleting competitor candidate:", error);
      const backendMsg = error?.response?.data?.message || error?.message || "Failed to delete competitor candidate";
      toast({ title: "Error", description: backendMsg, variant: "destructive" });
    }
  };

  // Handle delete processed competitor
  const handleDeleteCompetitor = async (competitorId: string, competitorName: string) => {
    if (!property) return;
    
    try {
      await dynamicPricingService.deletePropertyCompetitor(property.id, competitorId);
      
      // Remove from local state
      setProcessedCompetitors(prev => 
        prev.filter(competitor => competitor.id !== competitorId)
      );
      
      toast({
        title: "Success",
        description: `Competitor "${competitorName}" deleted successfully`,
      });
    } catch (error: any) {
      console.error("Error deleting competitor:", error);
      const backendMsg = error?.response?.data?.message || error?.message || "Failed to delete competitor";
      toast({ title: "Error", description: backendMsg, variant: "destructive" });
    }
  };

  // Handle adding new competitor
  const handleAddCompetitor = async () => {
    if (!property) return;
    
    // Validate input
    if (!newCompetitorName.trim()) {
      toast({
        title: "Error",
        description: "Competitor name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingCompetitor(true);
    
    try {
      const response = await dynamicPricingService.createCompetitorCandidates({
        competitor_names: [newCompetitorName.trim()],
        suggested_by_user: true  // Mark as user-suggested
      });

      console.log('✅ New competitor created:', response);

      // If URL was provided, update the competitor candidate with the URL
      if (newCompetitorUrl.trim() && response.created_candidates && response.created_candidates.length > 0) {
        const createdCandidate = response.created_candidates[0];
        try {
          await dynamicPricingService.updateCompetitorCandidate(property.id, createdCandidate.id, {
            booking_link: newCompetitorUrl.trim()
          });
          console.log('✅ URL updated for new competitor');
        } catch (urlError) {
          console.warn('⚠️ Failed to update URL for new competitor:', urlError);
          // Don't show error to user since the competitor was created successfully
        }
      }

      // Clear form
      setNewCompetitorName('');
      setNewCompetitorUrl('');
      setShowAddForm(false);

      // Refresh the competitor lists
      await fetchCompetitorCandidates();
      await fetchProcessedCompetitors();

      toast({
        title: "Success",
        description: `Competitor "${newCompetitorName.trim()}" added successfully`,
      });
    } catch (error: any) {
      console.error("Error adding competitor:", error);
      const backendMsg = error?.response?.data?.message || error?.message || "Failed to add competitor";
      toast({ title: "Error", description: backendMsg, variant: "destructive" });
    } finally {
      setIsCreatingCompetitor(false);
    }
  };

  // Handle canceling add competitor form
  const handleCancelAddCompetitor = () => {
    setNewCompetitorName('');
    setNewCompetitorUrl('');
    setShowAddForm(false);
  };

  // Handle starting to edit a field
  const startEditing = (type: 'candidate' | 'competitor', id: string, field: 'name' | 'url', currentValue: string) => {
    setEditingField({ type, id, field });
    setEditValue(currentValue || '');
  };

  // Handle saving edits
  const saveEdit = async () => {
    if (!editingField || !property) return;

    setIsSaving(true);
    try {
      if (editingField.type === 'candidate') {
        // Update competitor candidate
        const data: any = {};
        if (editingField.field === 'name') {
          data.competitor_name = editValue;
        } else if (editingField.field === 'url') {
          data.booking_link = editValue;
        }

        await dynamicPricingService.updateCompetitorCandidate(property.id, editingField.id, data);
        
        // Update local state
        setCompetitorCandidates(prev => 
          prev.map(candidate => 
            candidate.id === editingField.id 
              ? { ...candidate, ...data }
              : candidate
          )
        );

        toast({
          title: "Success",
          description: "Competitor candidate updated successfully",
        });
      } else {
        // Update processed competitor
        const data: any = {};
        if (editingField.field === 'name') {
          data.competitor_name = editValue;
        } else if (editingField.field === 'url') {
          data.booking_link = editValue;
        }

        await dynamicPricingService.updatePropertyCompetitor(property.id, editingField.id, data);
        
        // Update local state
        setProcessedCompetitors(prev => 
          prev.map(competitor => 
            competitor.id === editingField.id 
              ? { ...competitor, ...data }
              : competitor
          )
        );

        toast({
          title: "Success",
          description: "Competitor updated successfully",
        });
      }
    } catch (error: any) {
      console.error("Error updating competitor:", error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to update competitor",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setEditingField(null);
      setEditValue('');
    }
  };

  // Handle canceling edits
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Render competitor item
  const renderCompetitorItem = (competitor: PropertyCompetitor | CompetitorCandidate, isProcessed: boolean) => {
    const isCandidate = !isProcessed;
    const candidate = isCandidate ? competitor as CompetitorCandidate : null;
    const processed = isProcessed ? competitor as PropertyCompetitor : null;

    // Get current values - use local input values if available, otherwise use original data
    const localValues = localInputValues[competitor.id] || { name: '', url: '' };
    const currentName = localValues.name || (isProcessed ? processed?.competitor_name : candidate?.competitor_name) || '';
    const currentUrl = localValues.url || (isProcessed ? processed?.booking_link : candidate?.booking_link) || '';

    // Handle field blur (save on focus out)
    const handleFieldBlur = async (field: 'name' | 'url', value: string) => {
      console.log('🔍 handleFieldBlur called:', { field, value, isProcessed, competitorId: competitor.id });
      
      if (!property) {
        console.log('❌ No property selected');
        return;
      }
      
      // Get original values for comparison
      const originalName = isProcessed ? processed?.competitor_name : candidate?.competitor_name;
      const originalUrl = isProcessed ? processed?.booking_link : candidate?.booking_link;
      
      console.log('📊 Original vs New values:', {
        field,
        originalName,
        originalUrl,
        newValue: value,
        nameChanged: field === 'name' && value !== originalName,
        urlChanged: field === 'url' && value !== originalUrl
      });
      
      // Don't save if value hasn't changed
      if (field === 'name' && value === originalName) {
        console.log('⏭️ Name unchanged, skipping API call');
        // Clear local input values since no change was made
        setLocalInputValues(prev => {
          const newValues = { ...prev };
          delete newValues[competitor.id];
          return newValues;
        });
        return;
      }
      if (field === 'url' && value === originalUrl) {
        console.log('⏭️ URL unchanged, skipping API call');
        // Clear local input values since no change was made
        setLocalInputValues(prev => {
          const newValues = { ...prev };
          delete newValues[competitor.id];
          return newValues;
        });
        return;
      }
      
      try {
        if (isCandidate) {
          // Update competitor candidate
          const data: any = {};
          if (field === 'name') {
            data.competitor_name = value;
          } else if (field === 'url') {
            data.booking_link = value;
          }

          console.log('🚀 Making API call for candidate:', {
            propertyId: property.id,
            competitorId: competitor.id,
            data,
            endpoint: 'updateCompetitorCandidate'
          });

          const response = await dynamicPricingService.updateCompetitorCandidate(property.id, competitor.id, data);
          
          console.log('✅ Candidate update successful:', response);
          
          // Update global state with the new data
          setCompetitorCandidates(prev => 
            prev.map(c => 
              c.id === competitor.id 
                ? { ...c, ...data }
                : c
            )
          );
          
          // Clear local input values since the change was saved
          setLocalInputValues(prev => {
            const newValues = { ...prev };
            delete newValues[competitor.id];
            return newValues;
          });

          toast({
            title: "Success",
            description: "Competitor candidate updated successfully",
          });
        } else {
          // Update processed competitor
          const data: any = {};
          if (field === 'name') {
            data.competitor_name = value;
          } else if (field === 'url') {
            data.booking_link = value;
          }

          console.log('🚀 Making API call for processed competitor:', {
            propertyId: property.id,
            competitorId: competitor.id,
            data,
            endpoint: 'updatePropertyCompetitor'
          });

          const response = await dynamicPricingService.updatePropertyCompetitor(property.id, competitor.id, data);
          
          console.log('✅ Processed competitor update successful:', response);
          
          // Update global state with the new data
          setProcessedCompetitors(prev => 
            prev.map(c => 
              c.id === competitor.id 
                ? { ...c, ...data }
                : c
            )
          );
          
          // Clear local input values since the change was saved
          setLocalInputValues(prev => {
            const newValues = { ...prev };
            delete newValues[competitor.id];
            return newValues;
          });

          toast({
            title: "Success",
            description: "Competitor updated successfully",
          });
        }
      } catch (error: any) {
        console.error("❌ Error updating competitor:", error);
        console.error("❌ Error details:", {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
          url: error?.config?.url,
          method: error?.config?.method
        });
        
        // Revert local input values to original values on error
        setLocalInputValues(prev => {
          const newValues = { ...prev };
          delete newValues[competitor.id];
          return newValues;
        });
        
        toast({
          title: "Error",
          description: error?.response?.data?.message || "Failed to update competitor",
          variant: "destructive",
        });
      }
    };

    return (
      <div
        key={competitor.id}
        className="border border-[#B6C4DA] rounded-lg container-padding-base"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Status Icon */}
          {isProcessed ? getProcessedStatusIcon() : getStatusIcon(candidate?.status || 'processing')}

          {/* Competitor Details */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 form-gap-base">
            {/* Name Field */}
            <div className="form-field">
              <label className="form-label">
                Competitor Name
              </label>
              <div className="input-padding-base input-height-lg bg-[#EFF3FA] border border-[#C5C9D0] rounded-lg">
                <input
                  type="text"
                  value={currentName || ''}
                  onChange={(e) => {
                    console.log('📝 Name field onChange:', {
                      competitorId: competitor.id,
                      isCandidate,
                      newValue: e.target.value,
                      oldValue: currentName
                    });
                    
                    // Update local input values only
                    setLocalInputValues(prev => ({
                      ...prev,
                      [competitor.id]: {
                        ...prev[competitor.id],
                        name: e.target.value,
                        url: prev[competitor.id]?.url || ''
                      }
                    }));
                  }}
                  onBlur={() => handleFieldBlur('name', currentName || '')}
                  className="w-full bg-transparent text-[#4C5155] font-bold text-responsive-lg border-none outline-none"
                  placeholder="Enter competitor name"
                />
              </div>
            </div>

            {/* URL Field */}
            <div className="form-field">
              <label className="form-label">
                Link (URL)
              </label>
              <div className="input-padding-base input-height-lg bg-[#EFF3FA] border border-[#C5C9D0] rounded-lg">
                <input
                  type="url"
                  value={currentUrl || ''}
                  onChange={(e) => {
                    console.log('📝 URL field onChange:', {
                      competitorId: competitor.id,
                      isCandidate,
                      newValue: e.target.value,
                      oldValue: currentUrl
                    });
                    
                    // Update local input values only
                    setLocalInputValues(prev => ({
                      ...prev,
                      [competitor.id]: {
                        ...prev[competitor.id],
                        name: prev[competitor.id]?.name || '',
                        url: e.target.value
                      }
                    }));
                  }}
                  onBlur={() => handleFieldBlur('url', currentUrl || '')}
                  className="w-full bg-transparent text-[#4C5155] font-bold text-responsive-lg border-none outline-none"
                  placeholder="Enter booking URL"
                />
              </div>
            </div>
          </div>

          {/* Controls - Only show for processed competitors */}
          {isProcessed && (
            <div className="flex flex-col items-center form-gap-base">
              <ToggleSwitch 
                enabled={processed?.only_follow || false} 
                onChange={(enabled) => handleOnlyFollowToggle(processed?.id || '', enabled)}
              />
              <div className="text-center">
                <span className="text-[#8D9094] font-bold text-responsive-sm">
                  Only
                </span>
                <br />
                <span className="text-[#8D9094] font-bold text-responsive-sm">
                  Follow
                </span>
              </div>
            </div>
          )}

          {/* Action Icons */}
          <div className="flex form-gap-base">
            <button className="text-gray-500 hover:text-gray-700">
              <Info size={20} />
            </button>
            <button 
              onClick={() => {
                if (isProcessed) {
                  handleDeleteCompetitor(competitor.id, processed?.competitor_name || 'Unknown');
                } else {
                  handleDeleteCandidate(competitor.id, candidate?.competitor_name || 'Unknown');
                }
              }}
              className="text-red-500 hover:text-red-700 transition-colors"
              title={`Delete ${isProcessed ? 'competitor' : 'candidate'}`}
            >
              <Trash2 size={24} />
            </button>
          </div>
        </div>

        {/* Additional info for candidates */}
        {isCandidate && candidate && (
          <div className="container-margin-sm pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 form-gap-base text-responsive-sm">
              <div>
                <span className="font-semibold text-gray-600">Status: </span>
                <span className={`capitalize ${
                  candidate.status === 'finished' ? 'text-green-600' :
                  candidate.status === 'error' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {candidate.status}
                </span>
              </div>
              {candidate.similarity_score && (
                <div>
                  <span className="font-semibold text-gray-600">Similarity: </span>
                  <span className="text-gray-800">{(candidate.similarity_score * 100).toFixed(1)}%</span>
                </div>
              )}
              <div>
                <span className="font-semibold text-gray-600">Suggested by: </span>
                <span className={`font-semibold ${
                  candidate.suggested_by_user ? 'text-blue-600' : 'text-purple-600'
                }`}>
                  {candidate.suggested_by_user ? 'User' : 'AI'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

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
                <g clipPath="url(#clip0_251_4502)">
                  <path
                    d="M5.24 9.375H23.4925M5.24 14.375H23.4925M10.625 3.5625V15.625M18.125 3.5625V15.625M23.0512 15.625L24.375 11.875L22.0675 5.33625L14.375 1.875L6.6825 5.33625L4.375 11.875L5.69875 15.625M6.875 23.125L4.375 24.375L1.875 23.125V20L4.375 18.75L6.875 20V23.125ZM8.125 29.375V26.875L4.375 25.625L0.625 26.875V29.375H8.125ZM18.125 29.375V26.875L14.375 25.625L10.625 26.875V29.375H18.125ZM28.125 29.375V26.875L24.375 25.625L20.625 26.875V29.375H28.125ZM16.875 23.125L14.375 24.375L11.875 23.125V20L14.375 18.75L16.875 20V23.125ZM26.875 23.125L24.375 24.375L21.875 23.125V20L14.375 18.75L16.875 20V23.125Z"
                    stroke="#287CAC"
                    strokeWidth="1.66667"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_251_4502">
                    <rect width="30" height="30" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <div>
                <h2 className="text-responsive-3xl font-bold text-[#287CAC]">
                  Competitors
                </h2>
                <p className="text-[#8A8E94] font-bold text-responsive-lg">
                  Manage your competitor tracking
                </p>
              </div>
            </div>
            
            {/* AI Suggestion Button */}
            <div className="flex items-center mt-4 lg:mt-0">
              <button 
                onClick={handleAISuggestions}
                disabled={isLoadingAISuggestions}
                className={`flex items-center gap-3 btn-padding-base border rounded-lg transition-colors ${
                  isLoadingAISuggestions 
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                    : 'bg-[#E7D7FE] border-[#422C61] hover:bg-[#DCC7FE]'
                }`}
              >
                {isLoadingAISuggestions ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#422C61]"></div>
                    <span className="text-[#422C61] font-bold text-responsive-base">
                      Finding...
                    </span>
                  </>
                ) : (
                  <>
                    <Bot size={20} className="text-[#422C61]" />
                    <span className="text-[#422C61] font-bold text-responsive-base">
                      Use AI to suggest competitors
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Competitor Price Aggregation */}
          <div className="bg-white rounded-lg border border-black/10 container-padding-base container-margin-sm">
            <div className="max-w-lg">
              <label className="form-label">
                Competitor Price Aggregation
              </label>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isUpdating) {
                      setShowDropdown(!showDropdown);
                    }
                  }}
                  disabled={isUpdating}
                  className={`flex items-center justify-between w-full input-padding-base input-height-lg border border-[#9CAABD] rounded-lg bg-white container-margin-sm hover:border-[#287CAC] transition-colors ${
                    isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="flex items-center gap-5">
                    {getAggregationIcon(selectedAggregation)}
                    <span className="text-[#60615F] font-bold text-responsive-lg">
                      {selectedAggregation}
                    </span>
                    {isUpdating && (
                      <div className="ml-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#287CAC]"></div>
                      </div>
                    )}
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-black transition-transform ${showDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-[#9CAABD] rounded-lg shadow-lg mt-1">
                    {aggregationOptions.map((option) => (
                      <button
                        key={option}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAggregationChange(option);
                        }}
                        disabled={isUpdating}
                        className={`w-full input-padding-base input-height-lg text-left hover:bg-gray-50 transition-colors flex items-center gap-5 ${
                          option === selectedAggregation ? "bg-blue-50" : ""
                        } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {getAggregationIcon(option)}
                        <span className="text-[#60615F] font-bold text-responsive-lg">
                          {option}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[#9CAABD] text-responsive-xs">
                Defines how to reference your prices compared to competitors
                (Maximum, Average, Median, Minimum). Default: Minimum
              </p>
              {!property && (
                <p className="error-message">
                  Please select a property to configure competitor price aggregation.
                </p>
              )}
            </div>
          </div>


          {/* Competitors List */}
          <div className="form-gap-base container-margin-sm">
            {/* Loading states */}
            {(isLoadingProcessed || isLoadingCandidates) && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#287CAC] mx-auto mb-4"></div>
                <p className="text-gray-600 text-responsive-base">Loading competitors...</p>
              </div>
            )}


            {/* Processed Competitors Section */}
            {processedCompetitors.length > 0 && (
              <div className="container-margin-sm">
                <div className="form-gap-base">
                  {processedCompetitors.map((competitor) => 
                    renderCompetitorItem(competitor, true)
                  )}
                </div>
              </div>
            )}

            {/* Competitor Candidates Section */}
            {competitorCandidates.length > 0 && (
              <div>
                <div className="form-gap-base">
                  {competitorCandidates.map((candidate) => 
                    renderCompetitorItem(candidate, false)
                  )}
                </div>
              </div>
            )}

            {/* No competitors message */}
            {!isLoadingProcessed && !isLoadingCandidates && processedCompetitors.length === 0 && competitorCandidates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-responsive-base">No competitors found for this property.</p>
                <p className="text-gray-400 text-responsive-sm container-margin-sm">Use the AI suggestion button above to find competitors.</p>
              </div>
            )}
          </div>

          {/* Add Competitor Form */}
          {showAddForm && (
            <div className="bg-white rounded-lg border border-black/10 container-padding-base container-margin-sm">
              <div className="flex items-center justify-between container-margin-sm">
                <h3 className="text-responsive-xl font-semibold text-gray-800">Add New Competitor</h3>
                <button
                  onClick={handleCancelAddCompetitor}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 form-gap-base">
                {/* Competitor Name Field */}
                <div className="form-field">
                  <label className="form-label">
                    Competitor Name *
                  </label>
                  <div className="input-padding-base input-height-lg bg-[#EFF3FA] border border-[#C5C9D0] rounded-lg">
                    <input
                      type="text"
                      value={newCompetitorName}
                      onChange={(e) => setNewCompetitorName(e.target.value)}
                      className="w-full bg-transparent text-[#4C5155] font-bold text-responsive-lg border-none outline-none"
                      placeholder="Enter competitor name"
                      disabled={isCreatingCompetitor}
                    />
                  </div>
                </div>

                {/* URL Field */}
                <div className="form-field">
                  <label className="form-label">
                    Link (URL)
                  </label>
                  <div className="input-padding-base input-height-lg bg-[#EFF3FA] border border-[#C5C9D0] rounded-lg">
                    <input
                      type="url"
                      value={newCompetitorUrl}
                      onChange={(e) => setNewCompetitorUrl(e.target.value)}
                      className="w-full bg-transparent text-[#4C5155] font-bold text-responsive-lg border-none outline-none"
                      placeholder="Enter booking URL (optional)"
                      disabled={isCreatingCompetitor}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end form-gap-base container-margin-sm">
                <button
                  onClick={handleCancelAddCompetitor}
                  disabled={isCreatingCompetitor}
                  className="btn-padding-base text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-responsive-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCompetitor}
                  disabled={isCreatingCompetitor || !newCompetitorName.trim()}
                  className={`btn-padding-base rounded-lg transition-colors flex items-center gap-2 text-responsive-base ${
                    isCreatingCompetitor || !newCompetitorName.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#294758] text-white hover:bg-[#234149]'
                  }`}
                >
                  {isCreatingCompetitor ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Add Competitor
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Add Competitor Button */}
          <div className="flex justify-center container-margin-sm">
            <button 
              onClick={() => setShowAddForm(true)}
              disabled={showAddForm}
              className={`flex items-center gap-3 btn-padding-base rounded-lg font-semibold transition-colors text-responsive-base ${
                showAddForm 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-[#294758] text-white hover:bg-[#234149]'
              }`}
            >
              <Plus size={24} />
              Add Competitor
            </button>
          </div>

          {/* Tips Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg container-padding-base">
            <div className="flex items-center gap-3 container-margin-sm">
              <Info size={25} className="text-[#294758]" />
              <h3 className="text-responsive-lg font-bold text-[#294758]">
                Tips for Choosing Competitors
              </h3>
            </div>
            <div className="text-black/60 leading-relaxed text-responsive-base">
              <p>
                • Choose properties in the same geographical area as your hotel
              </p>
              <p>• Select hotels with similar size, type, and amenities</p>
              <p>• Include 3-5 competitors for optimal price analysis</p>
              <p>
                • Ensure competitor URLs are from Booking.com for best results
              </p>
              <p>
                • Use "Only Follow" for competitors you want to monitor but not
                include in pricing calculations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
