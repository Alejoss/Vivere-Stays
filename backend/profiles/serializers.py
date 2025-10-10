from rest_framework import serializers
import logging

from django.contrib.auth.models import User

from profiles.models import Profile, PMSIntegrationRequirement, SupportTicket, Notification
from vivere_stays.error_codes import ErrorCode

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
            raise serializers.ValidationError(
                "A user with that email already exists.",
                code=ErrorCode.EMAIL_ALREADY_EXISTS
            )
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError(
                "A user with that username already exists.",
                code=ErrorCode.USERNAME_ALREADY_EXISTS
            )
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
            raise serializers.ValidationError(
                "Property does not exist.",
                code=ErrorCode.PROPERTY_NOT_FOUND
            )


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


class SupportTicketSerializer(serializers.ModelSerializer):
    """
    Serializer for SupportTicket model
    """
    issue_type_display = serializers.CharField(source='get_issue_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = SupportTicket
        fields = [
            'id', 'user', 'user_email', 'user_username', 'issue_type', 'issue_type_display',
            'title', 'description', 'status', 'status_display',
            'screenshot', 'created_at', 'updated_at', 'resolved_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'resolved_at']
    
    def create(self, validated_data):
        """
        Create a new support ticket
        """
        # The user will be set in the view from the request
        return super().create(validated_data)
    
    def validate_title(self, value):
        """
        Validate title length
        """
        if len(value.strip()) < 5:
            raise serializers.ValidationError(
                "Title must be at least 5 characters long.",
                code=ErrorCode.SUPPORT_TITLE_TOO_SHORT
            )
        return value.strip()
    
    def validate_description(self, value):
        """
        Validate description length
        """
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "Description must be at least 10 characters long.",
                code=ErrorCode.SUPPORT_DESCRIPTION_TOO_SHORT
            )
        return value.strip()


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model
    """
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(source='created_at', read_only=True, format='%m/%d/%Y, %I:%M:%S %p')
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'type', 'type_display', 'category', 'category_display',
            'priority', 'priority_display', 'title', 'description', 'is_read', 
            'is_new', 'action_url', 'metadata', 'created_at', 'updated_at', 
            'read_at', 'expires_at', 'timestamp', 'is_expired'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'read_at', 'user']
    
    def get_is_expired(self, obj):
        """
        Check if notification is expired
        """
        return obj.is_expired()
    
    def validate_type(self, value):
        """
        Validate notification type
        """
        valid_types = [choice[0] for choice in Notification.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid type. Must be one of: {valid_types}",
                code=ErrorCode.NOTIFICATION_TYPE_INVALID
            )
        return value
    
    def validate_category(self, value):
        """
        Validate notification category
        """
        valid_categories = [choice[0] for choice in Notification.CATEGORY_CHOICES]
        if value not in valid_categories:
            raise serializers.ValidationError(
                f"Invalid category. Must be one of: {valid_categories}",
                code=ErrorCode.NOTIFICATION_CATEGORY_INVALID
            )
        return value
    
    def validate_priority(self, value):
        """
        Validate notification priority
        """
        valid_priorities = [choice[0] for choice in Notification.PRIORITY_LEVELS]
        if value not in valid_priorities:
            raise serializers.ValidationError(
                f"Invalid priority. Must be one of: {valid_priorities}",
                code=ErrorCode.NOTIFICATION_PRIORITY_INVALID
            )
        return value


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating notifications
    """
    class Meta:
        model = Notification
        fields = [
            'type', 'category', 'priority', 'title', 'description', 
            'action_url', 'metadata', 'expires_at'
        ]
    
    def validate_type(self, value):
        """
        Validate notification type
        """
        valid_types = [choice[0] for choice in Notification.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid type. Must be one of: {valid_types}",
                code=ErrorCode.NOTIFICATION_TYPE_INVALID
            )
        return value
    
    def validate_category(self, value):
        """
        Validate notification category
        """
        valid_categories = [choice[0] for choice in Notification.CATEGORY_CHOICES]
        if value not in valid_categories:
            raise serializers.ValidationError(
                f"Invalid category. Must be one of: {valid_categories}",
                code=ErrorCode.NOTIFICATION_CATEGORY_INVALID
            )
        return value
    
    def validate_priority(self, value):
        """
        Validate notification priority
        """
        valid_priorities = [choice[0] for choice in Notification.PRIORITY_LEVELS]
        if value not in valid_priorities:
            raise serializers.ValidationError(
                f"Invalid priority. Must be one of: {valid_priorities}",
                code=ErrorCode.NOTIFICATION_PRIORITY_INVALID
            )
        return value


class NotificationUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating notifications (mainly for marking as read/unread)
    """
    class Meta:
        model = Notification
        fields = ['is_read', 'is_new']
    
    def update(self, instance, validated_data):
        """
        Custom update to handle marking as read with timestamp
        """
        is_read = validated_data.get('is_read', instance.is_read)
        is_new = validated_data.get('is_new', instance.is_new)
        
        # If marking as read, use the model method to set timestamp
        if is_read and not instance.is_read:
            instance.mark_as_read()
        elif not is_read and instance.is_read:
            instance.mark_as_unread()
        elif not is_new and instance.is_new and not is_read:
            instance.acknowledge()
        else:
            # Update fields normally if no special logic needed
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()
        
        return instance
