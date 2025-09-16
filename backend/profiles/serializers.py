from rest_framework import serializers
import logging

from django.contrib.auth.models import User

from profiles.models import Profile, PMSIntegrationRequirement

# Get logger for profiles serializers
logger = logging.getLogger('academia_blockchain.profiles.serializers')

# UserRegistrationSerializer (moved from views.py)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    receive_updates = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name', 'receive_updates')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def create(self, validated_data):
        # Extract receive_updates from validated_data
        receive_updates = validated_data.pop('receive_updates', False)
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        # Create profile with receive_updates preference
        Profile.objects.create(user=user, receive_updates=receive_updates)
        
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']


class PropertySerializer(serializers.ModelSerializer):
    """
    Serializer for Property model (from dynamic_pricing app)
    """
    class Meta:
        model = None  # Will be set dynamically
        fields = ['id', 'name', 'city', 'country', 'is_active', 'created_at']


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profile_picture = serializers.SerializerMethodField()
    properties = serializers.SerializerMethodField()
    properties_count = serializers.ReadOnlyField()

    class Meta:
        model = Profile
        fields = ['user', 'timezone', 'profile_picture', 'properties', 'properties_count', 'receive_updates', 'dni', 'phone_number', 'selected_plan']

    def get_profile_picture(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

    def get_properties(self, obj):
        """
        Get properties associated with this profile
        """
        try:
            # Import here to avoid circular imports
            from dynamic_pricing.models import Property
            properties = obj.get_properties()
            return [
                {
                    'id': prop.id,
                    'name': prop.name,
                    'city': prop.city,
                    'country': prop.country,
                    'is_active': prop.is_active,
                    'created_at': prop.created_at
                }
                for prop in properties
            ]
        except Exception as e:
            logger.error(f"Error getting properties for profile {obj.id}: {str(e)}")
            return []


class PropertyAssociationSerializer(serializers.Serializer):
    """
    Serializer for adding/removing properties from a profile
    """
    property_id = serializers.CharField(max_length=255)
    action = serializers.ChoiceField(choices=['add', 'remove'])

    def validate_property_id(self, value):
        try:
            from dynamic_pricing.models import Property
            Property.objects.get(id=value)
            return value
        except Property.DoesNotExist:
            raise serializers.ValidationError("Property does not exist.")


class PMSIntegrationRequirementSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property_obj.name', read_only=True)
    pms_name = serializers.CharField(source='pms_system.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PMSIntegrationRequirement
        fields = [
            'id', 'property_obj', 'property_name', 'profile', 'pms_system', 'pms_name',
            'status', 'status_display', 'custom_pms_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """
        Custom validation to ensure either pms_system or custom_pms_name is provided
        Note: Both can be None/null for "no PMS" case
        """
        pms_system = data.get('pms_system')
        custom_pms_name = data.get('custom_pms_name')
        
        # Allow both to be None/null for "no PMS" case
        # The create method will handle setting appropriate status
        return data

    def create(self, validated_data):
        """
        Create PMS integration requirement with proper status handling
        """
        pms_system = validated_data.get('pms_system')
        custom_pms_name = validated_data.get('custom_pms_name')
        
        # Set appropriate status based on PMS selection
        if not pms_system and not custom_pms_name:
            # No PMS selected
            validated_data['status'] = 'no_pms'
        elif pms_system:
            # Standard PMS selected - set as requested (we'll support all PMS systems)
            validated_data['status'] = 'requested'
        elif custom_pms_name:
            # Custom PMS name provided - set as not_supported
            validated_data['status'] = 'not_supported'
        
        return super().create(validated_data)
