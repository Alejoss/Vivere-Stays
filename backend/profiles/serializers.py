from rest_framework import serializers
import logging

from django.contrib.auth.models import User

from profiles.models import Profile

# Get logger for profiles serializers
logger = logging.getLogger('academia_blockchain.profiles.serializers')

# UserRegistrationSerializer (moved from views.py)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    email = serializers.EmailField(required=True)
    username = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ('username', 'email', 'password')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with that email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with that username already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


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
        fields = ['user', 'timezone', 'profile_picture', 'properties', 'properties_count']

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
