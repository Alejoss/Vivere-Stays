from rest_framework import serializers
from .models import Competitor
from dynamic_pricing.models import Property
from vivere_stays.error_codes import ErrorCode
import logging

logger = logging.getLogger(__name__)


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
                # Generate a unique competitor_id from the name
                import hashlib
                import re
                
                # Clean the name and create a unique ID
                clean_name = re.sub(r'[^a-zA-Z0-9]', '', competitor_name.lower())
                competitor_id = hashlib.md5(competitor_name.encode()).hexdigest()[:10]
                
                # Check if competitor already exists
                if Competitor.objects.filter(competitor_id=competitor_id).exists():
                    # Update existing competitor
                    competitor = Competitor.objects.get(competitor_id=competitor_id)
                    competitor.competitor_name = competitor_name.strip()
                    competitor.save()
                    logger.info(f"Updated existing competitor: {competitor_id}")
                else:
                    # Create new competitor
                    competitor = Competitor.objects.create(
                        competitor_id=competitor_id,
                        competitor_name=competitor_name.strip()
                    )
                    logger.info(f"Created new competitor: {competitor_id}")
                
                # Create or update the property-competitor relationship
                from dynamic_pricing.models import DpPropertyCompetitor
                dp_property_competitor, created = DpPropertyCompetitor.objects.get_or_create(
                    property_id=property_instance,
                    competitor_id=competitor
                )
                
                if created:
                    logger.info(f"Created property-competitor relationship: {property_instance.id} - {competitor_id}")
                
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