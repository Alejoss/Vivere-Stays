from rest_framework import serializers
from .models import (
    Property, 
    PropertyManagementSystem, 
    DpMinimumSellingPrice, 
    DpPriceChangeHistory,
    CompetitorCandidate,
    DpGeneralSettings,
    DpPropertyCompetitor,
    DpHistoricalCompetitorPrice,
    DpOfferIncrements,
    DpDynamicIncrementsV2,
    DpLosSetup,
    DpLosReduction
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


class OfferIncrementsSerializer(serializers.ModelSerializer):
    """
    Serializer for DpOfferIncrements model (Special Offers)
    """
    class Meta:
        model = DpOfferIncrements
        fields = [
            'id', 'property_id', 'user', 'offer_name', 'valid_from', 'valid_until',
            'applied_from_days', 'applied_until_days', 'increment_type', 
            'increment_value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Custom validation for offer increments data
        """
        valid_from = data.get('valid_from')
        valid_until = data.get('valid_until')
        applied_from_days = data.get('applied_from_days')
        applied_until_days = data.get('applied_until_days')
        increment_value = data.get('increment_value')

        # Validate date range
        if valid_from and valid_until and valid_from >= valid_until:
            raise serializers.ValidationError(
                "valid_until must be after valid_from"
            )

        # Note: Removed applied days range validation to allow more flexible configurations

        # Validate increment value
        if increment_value is not None and increment_value < 0:
            raise serializers.ValidationError(
                "increment_value cannot be negative"
            )

        # Validate increment type
        allowed_types = ['Percentage', 'Additional']
        increment_type = data.get('increment_type')
        if increment_type and increment_type not in allowed_types:
            raise serializers.ValidationError(
                f"increment_type must be one of: {', '.join(allowed_types)}"
            )

        return data

    def create(self, validated_data):
        """
        Create offer increment with additional logging and user assignment
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Set the user from the request context
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        logger.info(f"Creating offer increment with validated data: {validated_data}")
        
        try:
            offer_increment = super().create(validated_data)
            logger.info(f"Offer increment created successfully with ID: {offer_increment.id}")
            return offer_increment
        except Exception as e:
            logger.error(f"Error creating offer increment: {str(e)}", exc_info=True)
            raise


class BulkOfferIncrementsSerializer(serializers.Serializer):
    """
    Serializer for creating multiple offer increments at once
    """
    offers = serializers.ListField(
        child=serializers.DictField(),
        max_length=20,  # Limit to 20 offers at once
        help_text='List of offer increment objects'
    )
    
    def validate_offers(self, value):
        """
        Validate that all offers are valid
        """
        if not value:
            return value
            
        for i, offer in enumerate(value):
            # Validate required fields
            required_fields = ['offer_name', 'valid_from', 'valid_until', 'increment_type', 'increment_value']
            for field in required_fields:
                if field not in offer or offer[field] is None or offer[field] == '':
                    raise serializers.ValidationError(f"Offer {i+1}: {field} is required.")
            
            # Validate increment type
            if offer['increment_type'] not in ['Percentage', 'Additional']:
                raise serializers.ValidationError(f"Offer {i+1}: increment_type must be 'Percentage' or 'Additional'.")
            
            # Validate increment value
            try:
                increment_value = int(offer['increment_value'])
                if increment_value < 0:
                    raise serializers.ValidationError(f"Offer {i+1}: increment_value cannot be negative.")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Offer {i+1}: increment_value must be a valid number.")
        
        return value

    def create(self, validated_data):
        """
        Create multiple OfferIncrements instances
        """
        offers = validated_data['offers']
        created_offers = []
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
        
        for i, offer_data in enumerate(offers):
            try:
                # Add property_id and user to the offer data
                offer_data['property_id'] = property_instance
                offer_data['user'] = request.user
                
                # Create the offer increment
                offer_increment = DpOfferIncrements.objects.create(**offer_data)
                created_offers.append(offer_increment)
                
            except Exception as e:
                errors.append({
                    'offer_index': i + 1,
                    'offer_name': offer_data.get('offer_name', 'Unknown'),
                    'error': str(e)
                })
        
        if errors and not created_offers:
            # If all offers failed to create, raise an error
            raise serializers.ValidationError(f"Failed to create any offer increments: {errors}")
        
        return {
            'created_offers': created_offers,
            'errors': errors,
            'property_id': property_instance.id
        }


class DynamicIncrementsV2Serializer(serializers.ModelSerializer):
    """
    Serializer for DpDynamicIncrementsV2 model (Dynamic Setup)
    """
    class Meta:
        model = DpDynamicIncrementsV2
        fields = [
            'id', 'property_id', 'user', 'occupancy_category', 'lead_time_category',
            'increment_type', 'increment_value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Custom validation for dynamic increments data
        """
        occupancy_category = data.get('occupancy_category')
        lead_time_category = data.get('lead_time_category')
        increment_value = data.get('increment_value')

        # Validate occupancy category
        valid_occupancy_categories = [choice[0] for choice in DpDynamicIncrementsV2.OCCUPANCY_CATEGORIES]
        if occupancy_category and occupancy_category not in valid_occupancy_categories:
            raise serializers.ValidationError(
                f"occupancy_category must be one of: {', '.join(valid_occupancy_categories)}"
            )

        # Validate lead time category
        valid_lead_time_categories = [choice[0] for choice in DpDynamicIncrementsV2.LEAD_TIME_CATEGORIES]
        if lead_time_category and lead_time_category not in valid_lead_time_categories:
            raise serializers.ValidationError(
                f"lead_time_category must be one of: {', '.join(valid_lead_time_categories)}"
            )

        # Validate increment value
        if increment_value is not None and increment_value < 0:
            raise serializers.ValidationError(
                "increment_value cannot be negative"
            )

        # Validate increment type
        allowed_types = ['Percentage', 'Additional']
        increment_type = data.get('increment_type')
        if increment_type and increment_type not in allowed_types:
            raise serializers.ValidationError(
                f"increment_type must be one of: {', '.join(allowed_types)}"
            )

        return data

    def create(self, validated_data):
        """
        Create dynamic increment with additional logging and user assignment
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Set the user from the request context
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
        logger.info(f"Creating dynamic increment with validated data: {validated_data}")
        
        try:
            dynamic_increment = super().create(validated_data)
            logger.info(f"Dynamic increment created successfully with ID: {dynamic_increment.id}")
            return dynamic_increment
        except Exception as e:
            logger.error(f"Error creating dynamic increment: {str(e)}", exc_info=True)
            raise


class BulkDynamicIncrementsV2Serializer(serializers.Serializer):
    """
    Serializer for creating multiple dynamic increments at once
    """
    rules = serializers.ListField(
        child=serializers.DictField(),
        max_length=20,  # Limit to 20 rules at once
        help_text='List of dynamic increment objects'
    )
    
    def validate_rules(self, value):
        """
        Validate that all rules are valid
        """
        if not value:
            return value
            
        for i, rule in enumerate(value):
            # Validate required fields
            required_fields = ['occupancy_category', 'lead_time_category', 'increment_type', 'increment_value']
            for field in required_fields:
                if field not in rule or rule[field] is None or rule[field] == '':
                    raise serializers.ValidationError(f"Rule {i+1}: {field} is required.")
            
            # Validate occupancy category
            valid_occupancy_categories = [choice[0] for choice in DpDynamicIncrementsV2.OCCUPANCY_CATEGORIES]
            if rule['occupancy_category'] not in valid_occupancy_categories:
                raise serializers.ValidationError(f"Rule {i+1}: occupancy_category must be one of: {', '.join(valid_occupancy_categories)}.")
            
            # Validate lead time category
            valid_lead_time_categories = [choice[0] for choice in DpDynamicIncrementsV2.LEAD_TIME_CATEGORIES]
            if rule['lead_time_category'] not in valid_lead_time_categories:
                raise serializers.ValidationError(f"Rule {i+1}: lead_time_category must be one of: {', '.join(valid_lead_time_categories)}.")
            
            # Validate increment type
            if rule['increment_type'] not in ['Percentage', 'Additional']:
                raise serializers.ValidationError(f"Rule {i+1}: increment_type must be 'Percentage' or 'Additional'.")
            
            # Validate increment value
            try:
                increment_value = float(rule['increment_value'])
                if increment_value < 0:
                    raise serializers.ValidationError(f"Rule {i+1}: increment_value cannot be negative.")
            except (ValueError, TypeError):
                raise serializers.ValidationError(f"Rule {i+1}: increment_value must be a valid number.")
        
        return value

    def create(self, validated_data):
        """
        Create multiple DynamicIncrementsV2 instances
        """
        rules = validated_data['rules']
        created_rules = []
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
        
        for i, rule_data in enumerate(rules):
            try:
                # Add property_id and user to the rule data
                rule_data['property_id'] = property_instance
                rule_data['user'] = request.user
                
                # Create the dynamic increment
                dynamic_increment = DpDynamicIncrementsV2.objects.create(**rule_data)
                created_rules.append(dynamic_increment)
                
            except Exception as e:
                errors.append({
                    'rule_index': i + 1,
                    'occupancy_category': rule_data.get('occupancy_category', 'Unknown'),
                    'lead_time_category': rule_data.get('lead_time_category', 'Unknown'),
                    'error': str(e)
                })
        
        if errors and not created_rules:
            # If all rules failed to create, raise an error
            raise serializers.ValidationError(f"Failed to create any dynamic increments: {errors}")
        
        return {
            'created_rules': created_rules,
            'errors': errors,
            'property_id': property_instance.id
        }


class DpLosSetupSerializer(serializers.ModelSerializer):
    """
    Serializer for DpLosSetup model
    """
    class Meta:
        model = DpLosSetup
        fields = [
            'id', 'property_id', 'valid_from', 'valid_until', 
            'day_of_week', 'los_value', 'num_competitors', 
            'los_aggregation', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Validate that valid_from is before valid_until
        """
        if data['valid_from'] >= data['valid_until']:
            raise serializers.ValidationError("valid_from must be before valid_until")
        return data


class DpLosReductionSerializer(serializers.ModelSerializer):
    """
    Serializer for DpLosReduction model
    """
    class Meta:
        model = DpLosReduction
        fields = [
            'id', 'property_id', 'lead_time_days', 
            'occupancy_level', 'los_value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_los_value(self, value):
        """
        Validate that los_value is positive
        """
        if value <= 0:
            raise serializers.ValidationError("LOS value must be greater than 0")
        return value


class BulkDpLosSetupSerializer(serializers.Serializer):
    """
    Serializer for bulk creating DpLosSetup entries
    """
    setups = DpLosSetupSerializer(many=True)

    def create(self, validated_data):
        setups_data = validated_data['setups']
        property_instance = self.context['property']
        user = self.context['user']
        
        created_setups = []
        errors = []
        
        for i, setup_data in enumerate(setups_data):
            try:
                # Remove property_id from setup_data since it's provided as a string from frontend
                # but we need to use the Property instance from context
                setup_data.pop('property_id', None)
                setup_data['property_id'] = property_instance
                print(f"🔧 DEBUG: Creating DpLosSetup with data: {setup_data}")
                setup = DpLosSetup.objects.create(**setup_data)
                # Don't serialize here - just store the model instance
                created_setups.append(setup)
            except Exception as e:
                error_message = str(e)
                # Check for unique constraint violation
                if 'unique constraint' in error_message.lower() or 'duplicate key' in error_message.lower():
                    error_message = f"A rule with date range {setup_data.get('valid_from', 'Unknown')} to {setup_data.get('valid_until', 'Unknown')} and weekday {setup_data.get('day_of_week', 'Unknown')} already exists for this property."
                
                errors.append({
                    'setup_index': i,
                    'day_of_week': setup_data.get('day_of_week', 'Unknown'),
                    'error': error_message
                })
        
        return {
            'message': f'Successfully created {len(created_setups)} LOS setup rules',
            'created_setups': created_setups,  # Return model instances, not serialized data
            'errors': errors,
            'property_id': property_instance.id
        }


class BulkDpLosReductionSerializer(serializers.Serializer):
    """
    Serializer for bulk creating DpLosReduction entries
    """
    reductions = DpLosReductionSerializer(many=True)

    def create(self, validated_data):
        reductions_data = validated_data['reductions']
        property_instance = self.context['property']
        
        created_reductions = []
        errors = []
        
        for i, reduction_data in enumerate(reductions_data):
            try:
                # Remove property_id from reduction_data since it's provided as a string from frontend
                # but we need to use the Property instance from context
                reduction_data.pop('property_id', None)
                reduction_data['property_id'] = property_instance
                # Remove user field since it doesn't exist in the model
                reduction_data.pop('user', None)
                print(f"🔧 DEBUG: Creating DpLosReduction with data: {reduction_data}")
                reduction = DpLosReduction.objects.create(**reduction_data)
                # Don't serialize here - just store the model instance
                created_reductions.append(reduction)
            except Exception as e:
                error_message = str(e)
                # Check for unique constraint violation
                if 'unique constraint' in error_message.lower() or 'duplicate key' in error_message.lower():
                    error_message = f"A rule with lead time {reduction_data.get('lead_time_days', 'Unknown')} days and occupancy {reduction_data.get('occupancy_level', 'Unknown')} already exists for this property."
                
                errors.append({
                    'reduction_index': i,
                    'lead_time_days': reduction_data.get('lead_time_days', 'Unknown'),
                    'occupancy_level': reduction_data.get('occupancy_level', 'Unknown'),
                    'error': error_message
                })
        
        return {
            'message': f'Successfully created {len(created_reductions)} LOS reduction rules',
            'created_reductions': created_reductions,  # Return model instances, not serialized data
            'errors': errors,
            'property_id': property_instance.id
        } 