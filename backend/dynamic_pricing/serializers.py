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
    pms_id = serializers.IntegerField(write_only=True, help_text='ID of the Property Management System')
    
    class Meta:
        model = Property
        fields = [
            'name', 
            'pms_id',
            'booking_hotel_url', 
            'street_address', 
            'city', 
            'country', 
            'postal_code'
        ]
        extra_kwargs = {
            'name': {'help_text': 'Hotel/Property name'},
            'pms_id': {'help_text': 'ID of the Property Management System'},
            'booking_hotel_url': {'help_text': 'Booking.com URL for the property'},
            'street_address': {'help_text': 'Street address including building number and street name'},
            'city': {'help_text': 'City where the property is located'},
            'country': {'help_text': 'Country where the property is located'},
            'postal_code': {'help_text': 'Postal/ZIP code'},
        }

    def validate_name(self, value):
        """
        Validate that the property name is not empty
        """
        if not value or not value.strip():
            raise serializers.ValidationError("Property name cannot be empty.")
        return value.strip()

    def validate_booking_hotel_url(self, value):
        """
        Validate booking.com URL format
        """
        if value and not value.startswith('https://www.booking.com/'):
            raise serializers.ValidationError("Please provide a valid Booking.com URL.")
        return value

    def validate_pms_id(self, value):
        """
        Validate that the PMS exists
        """
        try:
            PropertyManagementSystem.objects.get(id=value)
        except PropertyManagementSystem.DoesNotExist:
            raise serializers.ValidationError("Property Management System with this ID does not exist.")
        return value

    def create(self, validated_data):
        """
        Create a new Property instance
        """
        # Extract PMS ID and get the PMS instance
        pms_id = validated_data.pop('pms_id')
        pms = PropertyManagementSystem.objects.get(id=pms_id)
        
        # Generate a unique ID for the property
        import uuid
        property_id = str(uuid.uuid4())
        
        # Set default values for required fields that are not provided
        validated_data['id'] = property_id
        validated_data['pms'] = pms
        validated_data['pms_name'] = pms.name  # Keep for backward compatibility
        validated_data['pms_hotel_id'] = property_id  # Use the same ID for PMS
        validated_data['spreadsheet_id'] = ''  # Empty by default
        
        return super().create(validated_data)


class PropertyDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed Property information
    """
    full_address = serializers.ReadOnlyField()
    pms = PropertyManagementSystemSerializer(read_only=True)
    
    class Meta:
        model = Property
        fields = [
            'id', 'name', 'pms', 'pms_name', 'pms_hotel_id', 'spreadsheet_id',
            'booking_hotel_url', 'street_address', 'city', 'country',
            'postal_code', 'state_province', 'latitude', 'longitude',
            'rm_email', 'is_active', 'created_at', 'updated_at', 'full_address'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropertyListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing properties (simplified view)
    """
    full_address = serializers.ReadOnlyField()
    pms = PropertyManagementSystemSerializer(read_only=True)
    
    class Meta:
        model = Property
        fields = [
            'id', 'name', 'pms', 'city', 'country', 'full_address', 
            'is_active', 'created_at'
        ] 