from rest_framework import serializers
from .models import Competitor
from dynamic_pricing.models import Property
import logging

logger = logging.getLogger(__name__)


class CompetitorCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating a new Competitor with minimal data
    """
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
            raise serializers.ValidationError("Please provide a valid Booking.com URL.")
        
        # Check if it's a hotel URL (either direct or with query parameters)
        clean_url = value.split('?')[0]
        if '/hotel/' not in clean_url:
            raise serializers.ValidationError("Please provide a valid Booking.com hotel URL.")
        
        return value

    def validate_property_id(self, value):
        """
        Validate that the property exists
        """
        try:
            Property.objects.get(id=value)
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property with this ID does not exist.")
        return value

    def create(self, validated_data):
        """
        Create a new Competitor instance with minimal data
        """
        property_id = validated_data.pop('property_id')
        booking_link = validated_data['booking_link']
        
        # Extract competitor_id from the booking link
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
                    competitor_id = f"{country}/{hotel_name}"
                elif hotel_index + 1 < len(url_parts):
                    # Fallback: just use the country if hotel name is missing
                    competitor_id = url_parts[hotel_index + 1]
                else:
                    # Fallback: use a hash of the URL
                    import hashlib
                    competitor_id = hashlib.md5(booking_link.encode()).hexdigest()[:10]
            else:
                # Fallback: use a hash of the URL
                import hashlib
                competitor_id = hashlib.md5(booking_link.encode()).hexdigest()[:10]
        except Exception as e:
            logger.warning(f"Error extracting competitor_id from URL {booking_link}: {str(e)}")
            # Fallback: use a hash of the URL
            import hashlib
            competitor_id = hashlib.md5(booking_link.encode()).hexdigest()[:10]
        
        # Set minimal required fields for the competitor
        validated_data['competitor_id'] = competitor_id
        validated_data['competitor_name'] = f"Competitor {competitor_id}"  # Placeholder name
        validated_data['booking_link'] = booking_link
        
        # Create the competitor
        competitor = super().create(validated_data)
        
        logger.info(f"Created competitor {competitor_id} for property {property_id} with URL {booking_link}")
        
        return competitor


class CompetitorDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed Competitor information
    """
    class Meta:
        model = Competitor
        fields = [
            'competitor_id', 'competitor_name', 'booking_link', 'valid_from', 
            'valid_to', 'daily_num_days', 'weekly_num_days', 'bimonthly_num_days', 
            'quarterly_num_days', 'first_cutoff_hour_cet', 'second_cutoff_hour_cet', 
            'region', 'is_currently_valid'
        ]
        read_only_fields = ['competitor_id', 'valid_from', 'is_currently_valid']


class CompetitorListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing competitors (simplified view)
    """
    is_currently_valid = serializers.ReadOnlyField()
    
    class Meta:
        model = Competitor
        fields = [
            'competitor_id', 'competitor_name', 'booking_link', 
            'valid_from', 'valid_to', 'is_currently_valid'
        ] 