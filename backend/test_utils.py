"""
Test utilities for Django tests.
"""
from django.contrib.auth.models import User
from profiles.models import Profile
from dynamic_pricing.models import Property, PropertyManagementSystem
from rest_framework_simplejwt.tokens import RefreshToken


def create_test_user(username=None, email=None, password='testpass123'):
    """Create a test user with profile."""
    import uuid
    if username is None:
        username = f'testuser_{uuid.uuid4().hex[:8]}'
    if email is None:
        email = f'test_{uuid.uuid4().hex[:8]}@example.com'
    user = User.objects.create_user(username=username, email=email, password=password)
    Profile.objects.create(user=user)
    return user


def create_admin_user(username='admin', email='admin@example.com', password='adminpass123'):
    """Create a test admin user."""
    user = User.objects.create_superuser(username=username, email=email, password=password)
    Profile.objects.create(user=user)
    return user


def get_auth_token(user):
    """Get JWT token for user."""
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token)


def create_test_property(user=None, **kwargs):
    """Create a test property."""
    if user is None:
        user = create_test_user()
    
    import uuid
    property_id = kwargs.get('id', f'test_prop_{uuid.uuid4().hex[:8]}')
    
    defaults = {
        'id': property_id,
        'name': 'Test Hotel',
        'city': 'Test City',
        'country': 'Test Country',
        'number_of_rooms': 50,
        'property_type': 'hotel'
    }
    defaults.update(kwargs)
    property = Property.objects.create(**defaults)
    
    # Associate property with user's profile
    if hasattr(user, 'profile'):
        user.profile.add_property(property)
    
    return property


def create_test_pms(name='Test PMS'):
    """Create a test Property Management System."""
    return PropertyManagementSystem.objects.create(name=name)


def create_test_property_with_pms(user=None, **kwargs):
    """Create a test property with PMS."""
    if user is None:
        user = create_test_user()
    
    import uuid
    property_id = kwargs.get('id', f'test_prop_pms_{uuid.uuid4().hex[:8]}')
    
    pms = create_test_pms()
    property_data = {
        'id': property_id,
        'name': 'Test Hotel with PMS',
        'city': 'Test City',
        'country': 'Test Country',
        'number_of_rooms': 100,
        'property_type': 'hotel',
        'pms': pms
    }
    property_data.update(kwargs)
    property = Property.objects.create(**property_data)
    
    # Associate property with user's profile
    if hasattr(user, 'profile'):
        user.profile.add_property(property)
    
    return property


def create_test_competitor(competitor_id='COMP001', competitor_name='Test Competitor'):
    """Create a test competitor."""
    from dynamic_pricing.models import Competitor
    return Competitor.objects.create(
        competitor_id=competitor_id,
        competitor_name=competitor_name
    )


def create_test_general_settings(property, user=None, **kwargs):
    """Create test general settings for a property."""
    from dynamic_pricing.models import DpGeneralSettings
    if user is None:
        user = create_test_user()
    
    defaults = {
        'property_id': property,
        'user': user,
        'min_competitors': 2,
        'comp_price_calculation': 'min',
        'future_days_to_price': 365,
        'pricing_status': 'offline',
        'los_status': 'offline'
    }
    defaults.update(kwargs)
    return DpGeneralSettings.objects.create(**defaults)


def create_test_property_competitor(property, user=None, competitor=None, **kwargs):
    """Create test property competitor relationship."""
    from dynamic_pricing.models import DpPropertyCompetitor
    if user is None:
        user = create_test_user()
    if competitor is None:
        competitor = create_test_competitor()
    
    defaults = {
        'property_id': property,
        'user': user,
        'competitor_id': competitor,
        'only_follow': False
    }
    defaults.update(kwargs)
    return DpPropertyCompetitor.objects.create(**defaults)
