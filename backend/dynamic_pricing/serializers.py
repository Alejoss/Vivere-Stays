from rest_framework import serializers
from .models import (
    Property, 
    PropertyManagementSystem, 
    DpMinimumSellingPrice, 
    DpPriceChangeHistory,
    CompetitorCandidate,
    DpGeneralSettings,
    DpPropertyCompetitor,
    DpHistoricalCompetitorPrice
)
from booking.models import Competitor


class PropertyManagementSystemSerializer(serializers.ModelSerializer):
    """
    Serializer for PropertyManagementSystem
    """
    class Meta:
        model = PropertyManagementSystem
        fields = ['id', 'name', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropertyCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Property
    """
    # Map frontend field names to model field names using snake_case
    hotel_name = serializers.CharField(source='name', required=False, allow_blank=True, help_text='Hotel/Property name')
    booking_url = serializers.CharField(source='booking_hotel_url', required=False, allow_blank=True, help_text='Booking.com URL')
    street_address = serializers.CharField(required=False, allow_blank=True, help_text='Street address')
    city = serializers.CharField(required=False, allow_blank=True, help_text='City')
    country = serializers.CharField(required=False, allow_blank=True, help_text='Country')
    postal_code = serializers.CharField(required=False, allow_blank=True, help_text='Postal/ZIP code')
    phone_number = serializers.CharField(required=False, allow_blank=True, help_text='Phone number')
    website = serializers.CharField(required=False, allow_blank=True, help_text='Property website')
    cif = serializers.CharField(required=False, allow_blank=True, help_text='CIF (tax identification code)')
    number_of_rooms = serializers.IntegerField(required=True, help_text='Number of rooms')
    property_type = serializers.CharField(required=False, allow_blank=True, help_text='Type of property')

    class Meta:
        model = Property
        fields = [
            'hotel_name', 'booking_url', 'street_address', 'city', 'country', 
            'postal_code', 'phone_number', 'website', 'cif', 'number_of_rooms', 
            'property_type'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_hotel_name(self, value):
        """
        Validate that hotel name is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Hotel name is required.")
        return value.strip()

    def validate_city(self, value):
        """
        Validate that city is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError("City is required.")
        return value.strip()

    def validate_country(self, value):
        """
        Validate that country is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Country is required.")
        return value.strip()

    def validate_street_address(self, value):
        """
        Validate that street address is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Street address is required.")
        return value.strip()

    def validate_postal_code(self, value):
        """
        Validate that postal code is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Postal code is required.")
        return value.strip()

    def validate_phone_number(self, value):
        """
        Validate that phone number is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Phone number is required.")
        return value.strip()

    def validate_property_type(self, value):
        """
        Validate that property type is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Property type is required.")
        return value.strip()

    def validate_number_of_rooms(self, value):
        """
        Validate that number of rooms is provided and is a positive integer
        """
        if value is None:
            raise serializers.ValidationError("Number of rooms is required.")
        if value <= 0:
            raise serializers.ValidationError("Number of rooms must be a positive number.")
        return value


class PropertyDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for Property detail view
    """
    class Meta:
        model = Property
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropertyPMSUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating Property PMS
    """
    class Meta:
        model = Property
        fields = ['pms'] 


class PropertyListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing properties
    """
    class Meta:
        model = Property
        fields = [
            'id', 'name', 'city', 'country', 'property_type', 'number_of_rooms',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class MinimumSellingPriceSerializer(serializers.ModelSerializer):
    """
    Serializer for DpMinimumSellingPrice model
    """
    class Meta:
        model = DpMinimumSellingPrice
        fields = [
            'id', 'property_id', 'valid_from', 'valid_until', 
            'manual_alternative_price', 'msp', 'period_title', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Custom validation for MSP data
        """
        valid_from = data.get('valid_from')
        valid_until = data.get('valid_until')
        msp = data.get('msp')

        # Validate date range
        if valid_from and valid_until and valid_from >= valid_until:
            raise serializers.ValidationError(
                "valid_until must be after valid_from"
            )

        # Validate MSP value
        if msp is not None and msp < 0:
            raise serializers.ValidationError(
                "MSP value cannot be negative"
            )

        return data

    def create(self, validated_data):
        """
        Create MSP entry with additional logging
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Creating MSP entry with validated data: {validated_data}")
        
        try:
            msp_entry = super().create(validated_data)
            logger.info(f"MSP entry created successfully with ID: {msp_entry.id}")
            return msp_entry
        except Exception as e:
            logger.error(f"Error creating MSP entry: {str(e)}", exc_info=True)
            raise 


class PriceHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for price history data
    """
    checkin_date = serializers.DateField()
    price = serializers.SerializerMethodField()
    occupancy_level = serializers.SerializerMethodField()
    overwrite = serializers.SerializerMethodField()
    occupancy = serializers.FloatField()  # Add raw occupancy
    
    class Meta:
        model = DpPriceChangeHistory
        fields = ['checkin_date', 'price', 'occupancy_level', 'overwrite', 'occupancy']
    
    def get_price(self, obj):
        """
        Return the price to display (overwrite_price if exists, otherwise recom_price)
        """
        return obj.overwrite_price if obj.overwrite_price is not None else obj.recom_price
    
    def get_occupancy_level(self, obj):
        """
        Return occupancy level as string (low, medium, high)
        """
        if obj.occupancy is None:
            return "medium"
        if obj.occupancy <= 35:
            return "low"
        elif obj.occupancy <= 69:
            return "medium"
        else:
            return "high"
    
    def get_overwrite(self, obj):
        return obj.overwrite_price is not None 


class HistoricalCompetitorPriceSerializer(serializers.ModelSerializer):
    """
    Serializer for DpHistoricalCompetitorPrice model.
    """
    competitor_id = serializers.CharField(source='competitor.competitor_id', read_only=True)
    competitor_name = serializers.CharField(source='competitor.competitor_name', read_only=True)

    class Meta:
        model = DpHistoricalCompetitorPrice
        fields = [
            'competitor_id', 'competitor_name', 'hotel_name', 'room_name', 'checkin_date', 'checkout_date',
            'raw_price', 'currency', 'cancellation_type', 'max_persons', 'min_los', 'sold_out_message',
            'taking_reservations', 'scrape_date', 'is_available', 'num_days', 'price', 'update_tz'
        ] 


class CompetitorCandidateSerializer(serializers.ModelSerializer):
    """
    Serializer for CompetitorCandidate model
    """
    class Meta:
        model = CompetitorCandidate
        fields = [
            'id', 'competitor_name', 'booking_link', 'suggested_by_user',
            'property_instance', 'user', 'similarity_score', 'status', 'only_follow',
            'deleted', 'created_at', 'updated_at', 'processed_at', 'error_message'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'processed_at', 'error_message']
    
    def create(self, validated_data):
        """
        Create a new competitor candidate
        """
        # Set the user from the request context
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        # Set suggested_by_user to True since this comes from user input
        validated_data['suggested_by_user'] = True
        
        # Set initial status to processing
        validated_data['status'] = 'processing'
        
        return super().create(validated_data)


class BulkCompetitorCandidateSerializer(serializers.Serializer):
    """
    Serializer for creating multiple competitor candidates at once
    """
    competitor_names = serializers.ListField(
        child=serializers.CharField(max_length=255),
        max_length=10,  # Limit to 10 competitors at once
        help_text='List of competitor hotel names'
    )
    suggested_by_user = serializers.BooleanField(
        default=True,
        help_text='Whether these competitors were suggested by the user (True) or AI (False)'
    )
    
    def validate_competitor_names(self, value):
        """
        Validate that all competitor names are valid
        """
        # Allow empty list - no competitors required
        if not value:
            return value
            
        for name in value:
            if not name or not name.strip():
                raise serializers.ValidationError("All competitor names must be provided.")
            if len(name.strip()) < 2:
                raise serializers.ValidationError("All competitor names must be at least 2 characters long.")
        
        return value

    def create(self, validated_data):
        """
        Create multiple CompetitorCandidate instances
        """
        competitor_names = validated_data['competitor_names']
        suggested_by_user = validated_data.get('suggested_by_user', True)
        
        # If no competitors provided, return success with empty results
        if not competitor_names:
            # Get the current user's last created property for consistency
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError("User must be authenticated.")
            
            try:
                property_instance = Property.objects.filter(
                    profiles__user=request.user
                ).order_by('-created_at').first()
                
                if not property_instance:
                    raise serializers.ValidationError("No property found for this user. Please complete the hotel setup first.")
                    
            except Property.DoesNotExist:
                raise serializers.ValidationError("No property found for this user. Please complete the hotel setup first.")
            
            return {
                'created_candidates': [],
                'errors': [],
                'property_id': property_instance.id
            }
        
        created_candidates = []
        errors = []
        
        # Get the current user's last created property
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated.")
        
        # Get the user's last created property
        try:
            property_instance = Property.objects.filter(
                profiles__user=request.user
            ).order_by('-created_at').first()
            
            if not property_instance:
                raise serializers.ValidationError("No property found for this user. Please complete the hotel setup first.")
                
        except Property.DoesNotExist:
            raise serializers.ValidationError("No property found for this user. Please complete the hotel setup first.")
        
        for competitor_name in competitor_names:
            try:
                # Check if candidate already exists for this property (including deleted ones)
                existing_candidate = CompetitorCandidate.objects.filter(
                    property_instance=property_instance,
                    competitor_name=competitor_name.strip()
                ).first()
                
                if existing_candidate:
                    # Update existing candidate if it was deleted
                    if existing_candidate.deleted:
                        existing_candidate.deleted = False
                        existing_candidate.status = 'processing'
                        existing_candidate.suggested_by_user = suggested_by_user  # Update suggestion source
                        existing_candidate.save()
                        created_candidates.append(existing_candidate)
                    else:
                        # Candidate already exists and is active - update suggestion source if different
                        if existing_candidate.suggested_by_user != suggested_by_user:
                            existing_candidate.suggested_by_user = suggested_by_user
                            existing_candidate.save()
                        created_candidates.append(existing_candidate)
                else:
                    # Create new candidate
                    candidate = CompetitorCandidate.objects.create(
                        competitor_name=competitor_name.strip(),
                        property_instance=property_instance,
                        user=request.user,
                        suggested_by_user=suggested_by_user,
                        status='processing'
                    )
                    created_candidates.append(candidate)
                
            except Exception as e:
                errors.append({
                    'name': competitor_name,
                    'error': str(e)
                })
        
        if errors and not created_candidates:
            # If all candidates failed to create, raise an error
            raise serializers.ValidationError(f"Failed to create any competitor candidates: {errors}")
        
        return {
            'created_candidates': created_candidates,
            'errors': errors,
            'property_id': property_instance.id
        } 


class DpGeneralSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for DpGeneralSettings
    """
    class Meta:
        model = DpGeneralSettings
        fields = [
            'property_id', 'base_rate_code', 'is_base_in_pms', 'min_competitors',
            'comp_price_calculation', 'competitor_excluded', 'competitors_excluded',
            'msp_include_events_weekend_increments', 'future_days_to_price',
            'pricing_status', 'los_status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['property_id', 'created_at', 'updated_at']

    def validate_comp_price_calculation(self, value):
        """
        Validate that comp_price_calculation is one of the allowed values
        """
        allowed_values = ['min', 'max', 'avg', 'median']
        if value not in allowed_values:
            raise serializers.ValidationError(
                f"comp_price_calculation must be one of: {', '.join(allowed_values)}"
            )
        return value 


class PropertyCompetitorSerializer(serializers.ModelSerializer):
    """
    Serializer for DpPropertyCompetitor with competitor details
    """
    competitor_id = serializers.CharField(source='competitor_id.competitor_id')
    competitor_name = serializers.CharField(source='competitor_id.competitor_name')
    booking_link = serializers.URLField(source='competitor_id.booking_link')
    only_follow = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    
    class Meta:
        model = DpPropertyCompetitor
        fields = [
            'id', 'competitor_id', 'competitor_name', 'booking_link', 
            'only_follow', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at'] 