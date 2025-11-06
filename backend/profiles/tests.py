import logging
from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status

from profiles.models import Profile

logger = logging.getLogger(__name__)

class ProfileModelTests(TestCase):
    """Test cases for the Profile model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.profile = Profile.objects.create(
            user=self.user,
            timezone='UTC'
        )

    def test_profile_creation(self):
        """Test profile creation and string representation"""
        self.assertEqual(str(self.profile), 'testuser')
        self.assertEqual(self.profile.user.username, 'testuser')
        self.assertEqual(self.profile.timezone, 'UTC')
        self.assertIsNone(self.profile.profile_picture.name)

    def test_profile_with_picture(self):
        """Test profile with profile picture"""
        # This would be tested with actual file upload in a real scenario
        self.assertIsNone(self.profile.profile_picture.name)

    def test_profile_timezone_update(self):
        """Test profile timezone field updates"""
        self.profile.timezone = 'America/New_York'
        self.profile.save()
        
        updated_profile = Profile.objects.get(id=self.profile.id)
        self.assertEqual(updated_profile.timezone, 'America/New_York')

    def test_profile_properties_relationship(self):
        """Test profile properties many-to-many relationship"""
        # Test that properties_count works
        self.assertEqual(self.profile.properties_count, 0)
        
        # Test that get_properties works
        properties = self.profile.get_properties()
        self.assertEqual(len(properties), 0)

    def test_profile_property_management(self):
        """Test profile property management methods"""
        # Create a mock property (we'll use a simple object for testing)
        class MockProperty:
            def __init__(self, id):
                self.id = id
        
        mock_property = MockProperty("test_prop_123")
        
        # Test has_property method
        self.assertFalse(self.profile.has_property(mock_property))
        
        # Note: In a real scenario, you would test add_property and remove_property
        # with actual Property objects from the dynamic_pricing app


class AuthenticationViewsTests(APITestCase):
    """Test cases for authentication views"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.profile = Profile.objects.create(
            user=self.user,
            timezone='UTC'
        )

    def test_check_auth_unauthenticated(self):
        """Test authentication check for unauthenticated user"""
        url = reverse('check-auth')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('is_authenticated', response.data)
        self.assertFalse(response.data['is_authenticated'])

    def test_check_auth_authenticated(self):
        """Test authentication check for authenticated user"""
        self.client.force_authenticate(user=self.user)
        url = reverse('check-auth')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('is_authenticated', response.data)
        self.assertTrue(response.data['is_authenticated'])

    def test_register_view(self):
        """Test user registration"""
        url = reverse('register')
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)
        self.assertIn('username', response.data)
        self.assertEqual(response.data['username'], 'newuser')
        
        # Verify user was created
        user = User.objects.get(username='newuser')
        self.assertTrue(user.check_password('newpass123'))
        
        # Verify profile was created
        self.assertTrue(hasattr(user, 'profile'))

    def test_register_view_duplicate_username(self):
        """Test registration with duplicate username"""
        url = reverse('register')
        data = {
            'username': 'testuser',  # Already exists
            'email': 'another@example.com',
            'password': 'pass123'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_register_view_duplicate_email(self):
        """Test registration with duplicate email"""
        url = reverse('register')
        data = {
            'username': 'anotheruser',
            'email': 'test@example.com',  # Already exists
            'password': 'pass123'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_login_view_success(self):
        """Test successful login"""
        url = reverse('login')
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'testuser')
        self.assertIn('has_profile', response.data)
        self.assertTrue(response.data['has_profile'])
        self.assertIn('had_profile', response.data)
        self.assertTrue(response.data['had_profile'])
        self.assertIn('properties_count', response.data)
        self.assertEqual(response.data['properties_count'], 0)

    def test_login_view_creates_profile_if_missing(self):
        """Test login creates profile metadata when profile missing"""
        user = User.objects.create_user(
            username='noprofile',
            email='noprofile@example.com',
            password='pass12345'
        )
        # Ensure profile does not exist for this user
        Profile.objects.filter(user=user).delete()

        url = reverse('login')
        data = {
            'username': 'noprofile',
            'password': 'pass12345'
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Profile.objects.filter(user=user).exists())

        profile = Profile.objects.get(user=user)
        self.assertIn('has_profile', response.data)
        self.assertTrue(response.data['has_profile'])
        self.assertIn('had_profile', response.data)
        self.assertFalse(response.data['had_profile'])
        self.assertIn('properties_count', response.data)
        self.assertEqual(response.data['properties_count'], profile.properties_count)

    def test_login_view_invalid_credentials(self):
        """Test login with invalid credentials"""
        url = reverse('login')
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('error', response.data)

    def test_logout_view(self):
        """Test logout functionality"""
        url = reverse('logout')
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)

    def test_get_csrf_token(self):
        """Test CSRF token endpoint"""
        url = reverse('get-csrf-token')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('message', response.data)

    def test_user_properties_view(self):
        """Test user properties endpoint"""
        self.client.force_authenticate(user=self.user)
        url = reverse('user-properties')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('properties', response.data)
        self.assertIn('count', response.data)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(response.data['properties'], [])

    def test_user_properties_view_unauthenticated(self):
        """Test user properties endpoint without authentication"""
        url = reverse('user-properties')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_property_association_view_invalid_data(self):
        """Test property association with invalid data"""
        self.client.force_authenticate(user=self.user)
        url = reverse('property-association')
        
        # Test with missing fields
        data = {'property_id': 'test_prop'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test with invalid action
        data = {'property_id': 'test_prop', 'action': 'invalid'}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_property_association_view_unauthenticated(self):
        """Test property association without authentication"""
        url = reverse('property-association')
        data = {'property_id': 'test_prop', 'action': 'add'}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class SerializerTests(TestCase):
    """Test cases for serializers"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.profile = Profile.objects.create(
            user=self.user,
            timezone='UTC'
        )

    def test_user_serializer(self):
        """Test UserSerializer"""
        from profiles.serializers import UserSerializer
        
        serializer = UserSerializer(self.user)
        data = serializer.data
        
        self.assertIn('id', data)
        self.assertIn('username', data)
        self.assertIn('email', data)
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['email'], 'test@example.com')

    def test_profile_serializer(self):
        """Test ProfileSerializer"""
        from profiles.serializers import ProfileSerializer
        
        serializer = ProfileSerializer(self.profile)
        data = serializer.data
        
        self.assertIn('user', data)
        self.assertIn('timezone', data)
        self.assertIn('profile_picture', data)
        self.assertIn('properties', data)
        self.assertIn('properties_count', data)
        self.assertEqual(data['timezone'], 'UTC')
        self.assertIsNone(data['profile_picture'])
        self.assertEqual(data['properties'], [])
        self.assertEqual(data['properties_count'], 0)

    def test_user_registration_serializer(self):
        """Test UserRegistrationSerializer"""
        from profiles.serializers import UserRegistrationSerializer
        
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'newpass123'
        }
        serializer = UserRegistrationSerializer(data=data)
        
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        
        self.assertEqual(user.username, 'newuser')
        self.assertEqual(user.email, 'newuser@example.com')
        self.assertTrue(user.check_password('newpass123'))

    def test_property_association_serializer(self):
        """Test PropertyAssociationSerializer"""
        from profiles.serializers import PropertyAssociationSerializer
        from test_utils import create_test_property
        
        # Create a test property first
        property = create_test_property()
        
        # Test valid data
        data = {
            'property_id': property.id,
            'action': 'add'
        }
        serializer = PropertyAssociationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # Test invalid action
        data = {
            'property_id': property.id,
            'action': 'invalid'
        }
        serializer = PropertyAssociationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('action', serializer.errors)
        
        # Test missing property_id
        data = {
            'action': 'add'
        }
        serializer = PropertyAssociationSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('property_id', serializer.errors)
