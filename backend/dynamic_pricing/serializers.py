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
    DpLosReduction,
    DpRoomRates,
    UnifiedRoomsAndRates,
    Competitor,
    OverwritePriceHistory
)
from vivere_stays.error_codes import ErrorCode


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
            raise serializers.ValidationError(
                "Hotel name is required.",
                code=ErrorCode.PROPERTY_NAME_REQUIRED
            )
        return value.strip()

    def validate_city(self, value):
        """
        Validate that city is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError(
                "City is required.",
                code=ErrorCode.PROPERTY_CITY_REQUIRED
            )
        return value.strip()

    def validate_country(self, value):
        """
        Validate that country is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Country is required.",
                code=ErrorCode.PROPERTY_COUNTRY_REQUIRED
            )
        return value.strip()

    def validate_street_address(self, value):
        """
        Validate that street address is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Street address is required.",
                code=ErrorCode.PROPERTY_ADDRESS_REQUIRED
            )
        return value.strip()

    def validate_postal_code(self, value):
        """
        Validate that postal code is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Postal code is required.",
                code=ErrorCode.PROPERTY_POSTAL_CODE_REQUIRED
            )
        return value.strip()

    def validate_phone_number(self, value):
        """
        Validate that phone number is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Phone number is required.",
                code=ErrorCode.PROPERTY_PHONE_REQUIRED
            )
        return value.strip()

    def validate_property_type(self, value):
        """
        Validate that property type is provided
        """
        if not value or not value.strip():
            raise serializers.ValidationError(
                "Property type is required.",
                code=ErrorCode.PROPERTY_TYPE_REQUIRED
            )
        return value.strip()

    def validate_number_of_rooms(self, value):
        """
        Validate that number of rooms is provided and is a positive integer
        """
        if value is None:
            raise serializers.ValidationError(
                "Number of rooms is required.",
                code=ErrorCode.PROPERTY_ROOMS_REQUIRED
            )
        if value <= 0:
            raise serializers.ValidationError(
                "Number of rooms must be a positive number.",
                code=ErrorCode.PROPERTY_ROOMS_INVALID
            )
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
            'id', 'property_id', 'user', 'valid_from', 'valid_until', 
            'msp', 'period_title', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

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
                "valid_until must be after valid_from",
                code=ErrorCode.DATE_RANGE_INVALID
            )

        # Validate MSP value
        if msp is not None and msp < 0:
            raise serializers.ValidationError(
                "MSP value cannot be negative",
                code=ErrorCode.MSP_VALUE_NEGATIVE
            )

        return data

    def create(self, validated_data):
        """
        Create MSP entry with additional logging and user assignment
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Set the user from the request context
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['user'] = request.user
        
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
        Checks the new OverwritePriceHistory model for overwrites
        """
        # Check if there's an overwrite in the new OverwritePriceHistory model
        try:
            overwrite_record = OverwritePriceHistory.objects.get(
                property_id=obj.property_id,
                checkin_date=obj.checkin_date
            )
            if overwrite_record and overwrite_record.overwrite_price is not None:
                return overwrite_record.overwrite_price
        except OverwritePriceHistory.DoesNotExist:
            pass
        
        # Return the recommended price from the external schema
        return obj.recom_price
    
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
        """
        Check if there's an overwrite price set
        Checks the new OverwritePriceHistory model
        """
        # Check the new OverwritePriceHistory model
        try:
            overwrite_record = OverwritePriceHistory.objects.get(
                property_id=obj.property_id,
                checkin_date=obj.checkin_date
            )
            return overwrite_record and overwrite_record.overwrite_price is not None
        except OverwritePriceHistory.DoesNotExist:
            return False 


class HistoricalCompetitorPriceSerializer(serializers.ModelSerializer):
    """
    Serializer for DpHistoricalCompetitorPrice model.
    """
    competitor_id = serializers.IntegerField(source='competitor.id', read_only=True)
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
            'property_id', 'user', 'similarity_score', 'status', 'only_follow',
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
        print(f"🔍 BulkCompetitorCandidateSerializer: validate_competitor_names called with: {value}")
        
        # Allow empty list - no competitors required
        if not value:
            return value
            
        for name in value:
            if not name or not name.strip():
                raise serializers.ValidationError(
                    "All competitor names must be provided.",
                    code=ErrorCode.COMPETITOR_NAME_REQUIRED
                )
            if len(name.strip()) < 2:
                raise serializers.ValidationError(
                    "All competitor names must be at least 2 characters long.",
                    code=ErrorCode.COMPETITOR_NAME_TOO_SHORT
                )
        
        print(f"🔍 BulkCompetitorCandidateSerializer: validate_competitor_names passed validation")
        return value

    def validate(self, data):
        """
        General validation for the serializer
        """
        print(f"🔍 BulkCompetitorCandidateSerializer: validate called with data: {data}")
        print(f"🔍 BulkCompetitorCandidateSerializer: context: {self.context}")
        return data

    def create(self, validated_data):
        """
        Create multiple CompetitorCandidate instances
        """
        competitor_names = validated_data['competitor_names']
        suggested_by_user = validated_data.get('suggested_by_user', True)
        
        # If no competitors provided, return success with empty results
        if not competitor_names:
            # Get the current user's property for consistency
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError("User must be authenticated.")
            
            # Get property instance - either from context or user's last created property
            property_id = self.context.get('property_id')
            print(f"🔍 BulkCompetitorCandidateSerializer: property_id from context: {property_id}")
            print(f"🔍 BulkCompetitorCandidateSerializer: request.user: {request.user.username}")
            
            if property_id:
                # Use provided property_id
                try:
                    print(f"🔍 BulkCompetitorCandidateSerializer: Looking for property {property_id} for user {request.user.username}")
                    property_instance = Property.objects.get(
                        id=property_id,
                        profiles__user=request.user
                    )
                    print(f"🔍 BulkCompetitorCandidateSerializer: Found property: {property_instance.name}")
                except Property.DoesNotExist:
                    print(f"🔍 BulkCompetitorCandidateSerializer: Property {property_id} not found for user {request.user.username}")
                    # Let's also check if the property exists at all
                    try:
                        property_exists = Property.objects.get(id=property_id)
                        print(f"🔍 BulkCompetitorCandidateSerializer: Property {property_id} exists but not associated with user")
                    except Property.DoesNotExist:
                        print(f"🔍 BulkCompetitorCandidateSerializer: Property {property_id} does not exist at all")
                    raise serializers.ValidationError(
                        "Property not found or you don't have access to it.",
                        code=ErrorCode.PROPERTY_NOT_FOUND
                    )
            else:
                # Fallback to user's last created property (backward compatibility)
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
        
        # Get the current user's property
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("User must be authenticated.")
        
        # Get property instance - either from context or user's last created property
        property_id = self.context.get('property_id')
        if property_id:
            # Use provided property_id
            try:
                property_instance = Property.objects.get(
                    id=property_id,
                    profiles__user=request.user
                )
            except Property.DoesNotExist:
                raise serializers.ValidationError(
                    "Property not found or you don't have access to it.",
                    code=ErrorCode.PROPERTY_NOT_FOUND
                )
        else:
            # Fallback to user's last created property (backward compatibility)
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
                    property_id=property_instance,
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
                        property_id=property_instance,
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
            'property_id', 'user', 'min_competitors', 'comp_price_calculation', 
            'future_days_to_price', 'pricing_status', 'los_status', 
            'los_num_competitors', 'los_aggregation', 'otas_price_diff', 'created_at', 'updated_at'
        ]
        read_only_fields = ['property_id', 'user', 'created_at', 'updated_at']

    def validate_comp_price_calculation(self, value):
        """
        Validate that comp_price_calculation is one of the allowed values
        """
        allowed_values = ['min', 'max', 'avg', 'median']
        if value not in allowed_values:
            raise serializers.ValidationError(
                f"comp_price_calculation must be one of: {', '.join(allowed_values)}",
                code=ErrorCode.SETTINGS_COMP_PRICE_CALCULATION_INVALID
            )
        return value

    def validate_los_aggregation(self, value):
        """
        Validate that los_aggregation is one of the allowed values
        """
        allowed_values = ['min', 'max']
        if value not in allowed_values:
            raise serializers.ValidationError(
                f"los_aggregation must be one of: {', '.join(allowed_values)}",
                code=ErrorCode.SETTINGS_LOS_AGGREGATION_INVALID
            )
        return value 


class PropertyCompetitorSerializer(serializers.ModelSerializer):
    """
    Serializer for DpPropertyCompetitor with competitor details
    """
    competitor_id = serializers.IntegerField(source='competitor.id')
    competitor_name = serializers.CharField(source='competitor.competitor_name')
    booking_link = serializers.URLField(source='competitor.booking_link')
    only_follow = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    
    class Meta:
        model = DpPropertyCompetitor
        fields = [
            'id', 'property_id', 'user', 'competitor_id', 'competitor_name', 'booking_link', 
            'only_follow', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'property_id', 'user', 'created_at', 'updated_at']


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
                "valid_until must be after valid_from",
                code=ErrorCode.DATE_RANGE_INVALID
            )

        # Note: Removed applied days range validation to allow more flexible configurations

        # Validate increment value (allow negative values for discounts)
        if increment_value is not None and not isinstance(increment_value, (int, float)):
            raise serializers.ValidationError(
                "increment_value must be a valid number",
                code=ErrorCode.FIELD_INVALID
            )

        # Validate increment type
        allowed_types = ['Percentage', 'Additional']
        increment_type = data.get('increment_type')
        if increment_type and increment_type not in allowed_types:
            raise serializers.ValidationError(
                f"increment_type must be one of: {', '.join(allowed_types)}",
                code=ErrorCode.OFFER_INCREMENT_TYPE_INVALID
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

    def update(self, instance, validated_data):
        """
        Update offer increment with additional logging
        """
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"Updating offer increment {instance.id} with validated data: {validated_data}")
        
        try:
            # Update the instance with the validated data
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            
            instance.save()
            logger.info(f"Offer increment {instance.id} updated successfully")
            return instance
        except Exception as e:
            logger.error(f"Error updating offer increment {instance.id}: {str(e)}", exc_info=True)
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
                    raise serializers.ValidationError(
                        f"Offer {i+1}: {field} is required.",
                        code=ErrorCode.FIELD_REQUIRED
                    )
            
            # Validate increment type
            if offer['increment_type'] not in ['Percentage', 'Additional']:
                raise serializers.ValidationError(
                    f"Offer {i+1}: increment_type must be 'Percentage' or 'Additional'.",
                    code=ErrorCode.OFFER_INCREMENT_TYPE_INVALID
                )
            
            # Validate increment value (allow negative values for discounts)
            try:
                increment_value = float(offer['increment_value'])  # Allow decimals
                # No longer checking for negative values - allow discounts
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Offer {i+1}: increment_value must be a valid number.",
                    code=ErrorCode.FIELD_INVALID
                )
        
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
                f"occupancy_category must be one of: {', '.join(valid_occupancy_categories)}",
                code=ErrorCode.DYNAMIC_OCCUPANCY_CATEGORY_INVALID
            )

        # Validate lead time category
        valid_lead_time_categories = [choice[0] for choice in DpDynamicIncrementsV2.LEAD_TIME_CATEGORIES]
        if lead_time_category and lead_time_category not in valid_lead_time_categories:
            raise serializers.ValidationError(
                f"lead_time_category must be one of: {', '.join(valid_lead_time_categories)}",
                code=ErrorCode.DYNAMIC_LEAD_TIME_CATEGORY_INVALID
            )

        # Validate increment value (allow negative values for discounts)
        if increment_value is not None and not isinstance(increment_value, (int, float)):
            raise serializers.ValidationError(
                "increment_value must be a valid number",
                code=ErrorCode.FIELD_INVALID
            )

        # Validate increment type
        allowed_types = ['Percentage', 'Additional']
        increment_type = data.get('increment_type')
        if increment_type and increment_type not in allowed_types:
            raise serializers.ValidationError(
                f"increment_type must be one of: {', '.join(allowed_types)}",
                code=ErrorCode.DYNAMIC_INCREMENT_TYPE_INVALID
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
        max_length=100,  # Increased limit to 100 rules
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
                    raise serializers.ValidationError(
                        f"Rule {i+1}: {field} is required.",
                        code=ErrorCode.FIELD_REQUIRED
                    )
            
            # Validate occupancy category
            valid_occupancy_categories = [choice[0] for choice in DpDynamicIncrementsV2.OCCUPANCY_CATEGORIES]
            if rule['occupancy_category'] not in valid_occupancy_categories:
                raise serializers.ValidationError(
                    f"Rule {i+1}: occupancy_category must be one of: {', '.join(valid_occupancy_categories)}.",
                    code=ErrorCode.DYNAMIC_OCCUPANCY_CATEGORY_INVALID
                )
            
            # Validate lead time category
            valid_lead_time_categories = [choice[0] for choice in DpDynamicIncrementsV2.LEAD_TIME_CATEGORIES]
            if rule['lead_time_category'] not in valid_lead_time_categories:
                raise serializers.ValidationError(
                    f"Rule {i+1}: lead_time_category must be one of: {', '.join(valid_lead_time_categories)}.",
                    code=ErrorCode.DYNAMIC_LEAD_TIME_CATEGORY_INVALID
                )
            
            # Validate increment type
            if rule['increment_type'] not in ['Percentage', 'Additional']:
                raise serializers.ValidationError(
                    f"Rule {i+1}: increment_type must be 'Percentage' or 'Additional'.",
                    code=ErrorCode.DYNAMIC_INCREMENT_TYPE_INVALID
                )
            
            # Validate increment value (allow negative values for discounts)
            try:
                increment_value = float(rule['increment_value'])
                # No longer checking for negative values - allow discounts
            except (ValueError, TypeError):
                raise serializers.ValidationError(
                    f"Rule {i+1}: increment_value must be a valid number.",
                    code=ErrorCode.FIELD_INVALID
                )
        
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


class BulkUpdateDynamicIncrementsV2Serializer(serializers.Serializer):
    """
    Serializer for bulk updating multiple dynamic increments at once
    """
    rules = serializers.ListField(
        child=serializers.DictField(),
        max_length=100,  # Increased limit to 100 rules
        help_text='List of dynamic increment objects with id for updates'
    )
    
    def validate_rules(self, value):
        """
        Validate that all rules are valid and have required fields for updates
        """
        if not value:
            return value
            
        for i, rule in enumerate(value):
            # Validate that rule has an id for updates
            if 'id' not in rule or not rule['id']:
                raise serializers.ValidationError(
                    f"Rule {i+1}: id is required for updates.",
                    code=ErrorCode.FIELD_REQUIRED
                )
            
            # Validate required fields (all optional for updates)
            if 'occupancy_category' in rule and rule['occupancy_category']:
                valid_occupancy_categories = [choice[0] for choice in DpDynamicIncrementsV2.OCCUPANCY_CATEGORIES]
                if rule['occupancy_category'] not in valid_occupancy_categories:
                    raise serializers.ValidationError(
                        f"Rule {i+1}: occupancy_category must be one of: {', '.join(valid_occupancy_categories)}.",
                        code=ErrorCode.DYNAMIC_OCCUPANCY_CATEGORY_INVALID
                    )
            
            if 'lead_time_category' in rule and rule['lead_time_category']:
                valid_lead_time_categories = [choice[0] for choice in DpDynamicIncrementsV2.LEAD_TIME_CATEGORIES]
                if rule['lead_time_category'] not in valid_lead_time_categories:
                    raise serializers.ValidationError(
                        f"Rule {i+1}: lead_time_category must be one of: {', '.join(valid_lead_time_categories)}.",
                        code=ErrorCode.DYNAMIC_LEAD_TIME_CATEGORY_INVALID
                    )
            
            if 'increment_type' in rule and rule['increment_type']:
                if rule['increment_type'] not in ['Percentage', 'Additional']:
                    raise serializers.ValidationError(
                        f"Rule {i+1}: increment_type must be 'Percentage' or 'Additional'.",
                        code=ErrorCode.DYNAMIC_INCREMENT_TYPE_INVALID
                    )
            
            if 'increment_value' in rule and rule['increment_value'] is not None:
                try:
                    increment_value = float(rule['increment_value'])
                    # No longer checking for negative values - allow discounts
                except (ValueError, TypeError):
                    raise serializers.ValidationError(
                        f"Rule {i+1}: increment_value must be a valid number.",
                        code=ErrorCode.FIELD_INVALID
                    )
        
        return value

    def update(self, property_instance, validated_data):
        """
        Update multiple DynamicIncrementsV2 instances
        """
        rules = validated_data['rules']
        updated_rules = []
        errors = []
        
        for i, rule_data in enumerate(rules):
            try:
                rule_id = rule_data.pop('id')  # Remove id from update data
                
                # Get the existing rule
                try:
                    existing_rule = DpDynamicIncrementsV2.objects.get(
                        id=rule_id, 
                        property_id=property_instance
                    )
                except DpDynamicIncrementsV2.DoesNotExist:
                    errors.append({
                        'rule_index': i + 1,
                        'rule_id': rule_id,
                        'error': f'Rule with id {rule_id} not found for this property'
                    })
                    continue
                
                # Update only provided fields
                for field, value in rule_data.items():
                    if value is not None:
                        setattr(existing_rule, field, value)
                
                existing_rule.save()
                updated_rules.append(existing_rule)
                
            except Exception as e:
                errors.append({
                    'rule_index': i + 1,
                    'rule_id': rule_data.get('id', 'Unknown'),
                    'error': str(e)
                })
        
        if errors and not updated_rules:
            raise serializers.ValidationError(f"Failed to update any dynamic increments: {errors}")
        
        return {
            'updated_rules': updated_rules,
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
            'id', 'property_id', 'user', 'valid_from', 'valid_until', 
            'day_of_week', 'los_value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'property_id', 'user', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Validate that valid_from is before valid_until
        """
        print(f"🔧 DEBUG: DpLosSetupSerializer.validate called with data: {data}")
        
        if data['valid_from'] >= data['valid_until']:
            print(f"🔧 DEBUG: Date validation failed: {data['valid_from']} >= {data['valid_until']}")
            raise serializers.ValidationError(
                "valid_from must be before valid_until",
                code=ErrorCode.DATE_RANGE_INVALID
            )
        
        print(f"🔧 DEBUG: Date validation passed")
        return data

    def create(self, validated_data):
        """
        Ensure property_id and user are set from context during creation.
        """
        print(f"🔧 DEBUG: DpLosSetupSerializer.create called with validated_data: {validated_data}")
        
        request = self.context.get('request')
        user = self.context.get('user') or (request.user if request and request.user.is_authenticated else None)
        property_instance = self.context.get('property')

        print(f"🔧 DEBUG: Context - user: {user}, property_instance: {property_instance}")

        if not property_instance:
            print("🔧 DEBUG: Property context is missing")
            raise serializers.ValidationError(
                "Property context is required to create LOS setup",
                code=ErrorCode.PROPERTY_SETUP_INCOMPLETE
            )
        if not user:
            print("🔧 DEBUG: User context is missing")
            raise serializers.ValidationError(
                "User must be authenticated.",
                code=ErrorCode.UNAUTHORIZED
            )

        validated_data['property_id'] = property_instance
        validated_data['user'] = user
        
        print(f"🔧 DEBUG: Final validated_data before create: {validated_data}")
        
        result = super().create(validated_data)
        print(f"🔧 DEBUG: Created DpLosSetup instance: {result.id}")
        return result


class DpLosReductionSerializer(serializers.ModelSerializer):
    """
    Serializer for DpLosReduction model
    """
    class Meta:
        model = DpLosReduction
        fields = [
            'id', 'property_id', 'user', 'lead_time_category', 
            'occupancy_category', 'los_value', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'property_id', 'user', 'created_at', 'updated_at']

    def validate_los_value(self, value):
        """
        Validate that los_value is positive
        """
        if value <= 0:
            raise serializers.ValidationError(
                "LOS value must be greater than 0",
                code=ErrorCode.LOS_VALUE_INVALID
            )
        return value

    def create(self, validated_data):
        """
        Ensure property_id and user are set from context during creation.
        """
        request = self.context.get('request')
        user = self.context.get('user') or (request.user if request and request.user.is_authenticated else None)
        property_instance = self.context.get('property')

        if not property_instance:
            raise serializers.ValidationError(
                "Property context is required to create LOS reduction",
                code=ErrorCode.PROPERTY_SETUP_INCOMPLETE
            )
        if not user:
            raise serializers.ValidationError(
                "User must be authenticated.",
                code=ErrorCode.UNAUTHORIZED
            )

        validated_data['property_id'] = property_instance
        validated_data['user'] = user
        return super().create(validated_data)


class BulkDpLosSetupSerializer(serializers.Serializer):
    """
    Serializer for bulk creating DpLosSetup entries
    """
    setups = DpLosSetupSerializer(many=True)

    def create(self, validated_data):
        setups_data = validated_data['setups']
        property_instance = self.context['property']
        user = self.context.get('user')
        
        # If user is not in context, get it from request
        if not user:
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                user = request.user
        
        if not user:
            raise serializers.ValidationError(
                "User must be authenticated.",
                code=ErrorCode.UNAUTHORIZED
            )
        
        created_setups = []
        errors = []
        
        for i, setup_data in enumerate(setups_data):
            try:
                # Remove property_id and user from setup_data since they're provided as strings from frontend
                # but we need to use the Property instance and User from context
                setup_data.pop('property_id', None)
                setup_data.pop('user', None)
                setup_data['property_id'] = property_instance
                setup_data['user'] = user
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
        user = self.context.get('user')
        
        # If user is not in context, get it from request
        if not user:
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                user = request.user
        
        if not user:
            raise serializers.ValidationError(
                "User must be authenticated.",
                code=ErrorCode.UNAUTHORIZED
            )
        
        created_reductions = []
        errors = []
        
        for i, reduction_data in enumerate(reductions_data):
            try:
                # Remove property_id and user from reduction_data since they're provided as strings from frontend
                # but we need to use the Property instance and User from context
                reduction_data.pop('property_id', None)
                reduction_data.pop('user', None)
                reduction_data['property_id'] = property_instance
                reduction_data['user'] = user
                print(f"🔧 DEBUG: Creating DpLosReduction with data: {reduction_data}")
                reduction = DpLosReduction.objects.create(**reduction_data)
                # Don't serialize here - just store the model instance
                created_reductions.append(reduction)
            except Exception as e:
                error_message = str(e)
                # Check for unique constraint violation
                if 'unique constraint' in error_message.lower() or 'duplicate key' in error_message.lower():
                    error_message = f"A rule with lead time {reduction_data.get('lead_time_category', 'Unknown')} and occupancy {reduction_data.get('occupancy_category', 'Unknown')} already exists for this property."
                
                errors.append({
                    'reduction_index': i,
                    'lead_time_category': reduction_data.get('lead_time_category', 'Unknown'),
                    'occupancy_category': reduction_data.get('occupancy_category', 'Unknown'),
                    'error': error_message
                })
        
        return {
            'message': f'Successfully created {len(created_reductions)} LOS reduction rules',
            'created_reductions': created_reductions,  # Return model instances, not serialized data
            'errors': errors,
            'property_id': property_instance.id
        }


class UnifiedRoomsAndRatesSerializer(serializers.ModelSerializer):
    """
    Serializer for UnifiedRoomsAndRates model (Available Rates)
    """
    class Meta:
        model = UnifiedRoomsAndRates
        fields = [
            'id', 'property_id', 'user', 'pms_source', 'pms_hotel_id', 'room_id', 'rate_id',
            'room_name', 'room_description', 'rate_name', 'rate_description', 
            'rate_category', 'last_updated'
        ]
        read_only_fields = ['id', 'property_id', 'user', 'last_updated']


class AvailableRatesUnifiedSerializer(serializers.Serializer):
    """
    Unified serializer that combines UnifiedRoomsAndRates and DpRoomRates data
    for the Available Rates frontend component
    """
    # Fields from UnifiedRoomsAndRates
    id = serializers.IntegerField(read_only=True)
    property_id = serializers.CharField(read_only=True)
    user = serializers.CharField(read_only=True)
    pms_source = serializers.CharField(read_only=True)
    pms_hotel_id = serializers.CharField(read_only=True)
    room_id = serializers.CharField(read_only=True)
    rate_id = serializers.CharField(read_only=True)
    room_name = serializers.CharField(read_only=True)
    room_description = serializers.CharField(read_only=True, allow_null=True)
    rate_name = serializers.CharField(read_only=True)
    rate_description = serializers.CharField(read_only=True, allow_null=True)
    rate_category = serializers.CharField(read_only=True, allow_null=True)
    last_updated = serializers.DateTimeField(read_only=True)
    
    # Fields from DpRoomRates (configuration)
    increment_type = serializers.CharField(default='Percentage')
    increment_value = serializers.IntegerField(default=0)
    is_base_rate = serializers.BooleanField(default=False)
    
    def to_representation(self, instance):
        """
        Custom representation that combines data from both models
        """
        # Get the base data from UnifiedRoomsAndRates
        data = super().to_representation(instance)
        
        # Try to get the corresponding DpRoomRates configuration
        try:
            room_rate_config = DpRoomRates.objects.get(
                property_id=instance.property_id,
                rate_id=instance.rate_id
            )
            # Override with actual configuration values
            data['increment_type'] = room_rate_config.increment_type
            data['increment_value'] = room_rate_config.increment_value
            data['is_base_rate'] = room_rate_config.is_base_rate
        except DpRoomRates.DoesNotExist:
            # If no configuration exists, use defaults
            data['increment_type'] = 'Percentage'
            data['increment_value'] = 0
            data['is_base_rate'] = False
        
        return data


class AvailableRatesUpdateSerializer(serializers.Serializer):
    """
    Serializer for updating Available Rates configuration
    """
    rate_id = serializers.CharField()
    increment_type = serializers.ChoiceField(choices=DpRoomRates.INCREMENT_TYPE_CHOICES)
    increment_value = serializers.IntegerField()
    is_base_rate = serializers.BooleanField()
    
    def validate_increment_value(self, value):
        """
        Validate increment value based on increment type
        """
        if value < 0:
            raise serializers.ValidationError(
                "Increment value cannot be negative",
                code=ErrorCode.RATE_INCREMENT_VALUE_NEGATIVE
            )
        return value


class BulkAvailableRatesUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk updating multiple Available Rates configurations
    """
    rates = AvailableRatesUpdateSerializer(many=True)
    
    def validate_rates(self, value):
        """
        Validate that only one rate per property can be marked as base rate
        """
        base_rates = [rate for rate in value if rate.get('is_base_rate', False)]
        if len(base_rates) > 1:
            raise serializers.ValidationError(
                "Only one rate can be marked as base rate",
                code=ErrorCode.RATE_MULTIPLE_BASE_RATES
            )
        return value 


# Competitor serializers moved from booking app
class BulkCompetitorCreateSerializer(serializers.Serializer):
    """
    Serializer for creating multiple competitors at once
    """
    competitor_names = serializers.ListField(
        child=serializers.CharField(max_length=255),
        max_length=10,  # Limit to 10 competitors at once
        help_text='List of competitor hotel names'
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
                raise serializers.ValidationError(
                    "All competitor names must be provided.",
                    code=ErrorCode.COMPETITOR_NAME_REQUIRED
                )
            if len(name.strip()) < 2:
                raise serializers.ValidationError(
                    "All competitor names must be at least 2 characters long.",
                    code=ErrorCode.COMPETITOR_NAME_TOO_SHORT
                )
        
        return value

    def create(self, validated_data):
        """
        Create multiple Competitor instances
        """
        import logging
        import hashlib
        
        logger = logging.getLogger(__name__)
        competitor_names = validated_data['competitor_names']
        
        # If no competitors provided, return success with empty results
        if not competitor_names:
            # Get the current user's last created property for consistency
            request = self.context.get('request')
            if not request or not request.user.is_authenticated:
                raise serializers.ValidationError(
                    "User must be authenticated.",
                    code=ErrorCode.UNAUTHORIZED
                )
            
            try:
                property_instance = Property.objects.filter(
                    profiles__user=request.user
                ).order_by('-created_at').first()
                
                if not property_instance:
                    raise serializers.ValidationError(
                        "No property found for this user. Please complete the hotel setup first.",
                        code=ErrorCode.PROPERTY_SETUP_INCOMPLETE
                    )
                    
            except Property.DoesNotExist:
                raise serializers.ValidationError(
                    "No property found for this user. Please complete the hotel setup first.",
                    code=ErrorCode.PROPERTY_SETUP_INCOMPLETE
                )
            
            return {
                'created_competitors': [],
                'errors': [],
                'property_id': property_instance.id
            }
        
        created_competitors = []
        errors = []
        
        # Get the current user's last created property
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError(
                "User must be authenticated.",
                code=ErrorCode.UNAUTHORIZED
            )
        
        # Get the user's last created property
        try:
            property_instance = Property.objects.filter(
                profiles__user=request.user
            ).order_by('-created_at').first()
            
            if not property_instance:
                raise serializers.ValidationError(
                    "No property found for this user. Please complete the hotel setup first.",
                    code=ErrorCode.PROPERTY_SETUP_INCOMPLETE
                )
                
        except Property.DoesNotExist:
            raise serializers.ValidationError(
                "No property found for this user. Please complete the hotel setup first.",
                code=ErrorCode.PROPERTY_SETUP_INCOMPLETE
            )
        
        for competitor_name in competitor_names:
            try:
                # Generate a unique competitor name
                import re
                
                # Clean the name
                clean_name = re.sub(r'[^a-zA-Z0-9]', '', competitor_name.lower())
                
                # Check if competitor already exists by name
                if Competitor.objects.filter(competitor_name=competitor_name.strip()).exists():
                    # Update existing competitor
                    competitor = Competitor.objects.get(competitor_name=competitor_name.strip())
                    competitor.booking_link = validated_data.get('booking_link', '')
                    competitor.save()
                    logger.info(f"Updated existing competitor: {competitor_name.strip()}")
                else:
                    # Create new competitor
                    competitor = Competitor.objects.create(
                        competitor_name=competitor_name.strip(),
                        booking_link=validated_data.get('booking_link', '')
                    )
                    logger.info(f"Created new competitor: {competitor_name.strip()}")
                
                # Create or update the property-competitor relationship
                dp_property_competitor, created = DpPropertyCompetitor.objects.get_or_create(
                    property_id=property_instance,
                    competitor=competitor
                )
                
                if created:
                    logger.info(f"Created property-competitor relationship: {property_instance.id} - {competitor.competitor_name}")
                
                created_competitors.append(competitor)
                
            except Exception as e:
                logger.error(f"Error creating competitor for name {competitor_name}: {str(e)}")
                errors.append({
                    'name': competitor_name,
                    'error': str(e)
                })
        
        if errors and not created_competitors:
            # If all competitors failed to create, raise an error
            raise serializers.ValidationError(f"Failed to create any competitors: {errors}")
        
        return {
            'created_competitors': created_competitors,
            'errors': errors,
            'property_id': property_instance.id
        }


class CompetitorCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Competitor with minimal data
    """
    import logging
    
    logger = logging.getLogger(__name__)
    property_id = serializers.CharField(write_only=True, help_text='ID of the Property to associate with this competitor')
    booking_link = serializers.URLField(help_text='Booking.com URL for the competitor hotel')
    
    class Meta:
        model = Competitor
        fields = ['property_id', 'booking_link']
        extra_kwargs = {
            'property_id': {'help_text': 'ID of the Property to associate with this competitor'},
            'booking_link': {'help_text': 'Booking.com URL for the competitor hotel'},
        }

    def validate_booking_link(self, value):
        """
        Validate that the booking link is a valid Booking.com URL
        """
        if not value.startswith('https://www.booking.com/'):
            raise serializers.ValidationError(
                "Please provide a valid Booking.com URL.",
                code=ErrorCode.COMPETITOR_URL_INVALID
            )
        
        # Check if it's a hotel URL (either direct or with query parameters)
        clean_url = value.split('?')[0]
        if '/hotel/' not in clean_url:
            raise serializers.ValidationError(
                "Please provide a valid Booking.com hotel URL.",
                code=ErrorCode.COMPETITOR_URL_NOT_HOTEL
            )
        
        return value

    def validate_property_id(self, value):
        """
        Validate that the property exists
        """
        try:
            Property.objects.get(id=value)
        except Property.DoesNotExist:
            raise serializers.ValidationError(
                "Property with this ID does not exist.",
                code=ErrorCode.PROPERTY_NOT_FOUND
            )
        return value

    def create(self, validated_data):
        """
        Create a new Competitor instance with minimal data
        """
        import hashlib
        
        property_id = validated_data.pop('property_id')
        booking_link = validated_data['booking_link']
        
        # Extract competitor name from the booking link
        # Booking.com URLs have the format: https://www.booking.com/hotel/COUNTRY/HOTEL-NAME.html
        try:
            # Clean the URL by removing query parameters
            clean_url = booking_link.split('?')[0]
            
            # Extract the hotel identifier from the URL
            url_parts = clean_url.split('/')
            if 'hotel' in url_parts:
                hotel_index = url_parts.index('hotel')
                if hotel_index + 2 < len(url_parts):  # We need both country and hotel name
                    country = url_parts[hotel_index + 1]
                    hotel_name = url_parts[hotel_index + 2].replace('.html', '')
                    competitor_name = f"{country}/{hotel_name}"
                elif hotel_index + 1 < len(url_parts):
                    # Fallback: just use the country if hotel name is missing
                    competitor_name = url_parts[hotel_index + 1]
                else:
                    # Fallback: use a hash of the URL
                    competitor_name = f"Competitor {hashlib.md5(booking_link.encode()).hexdigest()[:10]}"
            else:
                # Fallback: use a hash of the URL
                competitor_name = f"Competitor {hashlib.md5(booking_link.encode()).hexdigest()[:10]}"
        except Exception as e:
            self.logger.warning(f"Error extracting competitor name from URL {booking_link}: {str(e)}")
            # Fallback: use a hash of the URL
            competitor_name = f"Competitor {hashlib.md5(booking_link.encode()).hexdigest()[:10]}"
        
        # Set minimal required fields for the competitor
        validated_data['competitor_name'] = competitor_name
        validated_data['booking_link'] = booking_link
        
        # Create the competitor
        competitor = super().create(validated_data)
        
        self.logger.info(f"Created competitor {competitor.competitor_name} for property {property_id} with URL {booking_link}")
        
        return competitor


class CompetitorDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed Competitor information
    """
    class Meta:
        model = Competitor
        fields = [
            'id', 'competitor_name', 'booking_link'
        ]
        read_only_fields = ['id']


class CompetitorListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing competitors (simplified view)
    """
    class Meta:
        model = Competitor
        fields = [
            'id', 'competitor_name', 'booking_link'
        ] 


class OverwritePriceHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for OverwritePriceHistory model
    """
    class Meta:
        model = OverwritePriceHistory
        fields = [
            'property_id', 'checkin_date', 'overwrite_price', 'updated_at'
        ]
        read_only_fields = ['updated_at']
    
    def validate_overwrite_price(self, value):
        """
        Validate that overwrite price is a positive integer
        """
        if value is not None and value < 0:
            raise serializers.ValidationError("Overwrite price must be a positive integer")
        return value