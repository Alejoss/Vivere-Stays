from rest_framework import serializers
from .models import Property, PropertyManagementSystem, DpMinimumSellingPrice, DpPriceChangeHistory


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