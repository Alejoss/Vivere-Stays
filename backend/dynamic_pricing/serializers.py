from rest_framework import serializers
from .models import Property, PropertyManagementSystem


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
    number_of_rooms = serializers.IntegerField(required=False, help_text='Number of rooms')
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
    class Meta:
        model = Property
        fields = [
            'id', 'name', 'pms', 'city', 'country', 'full_address', 
            'is_active', 'created_at'
        ] 