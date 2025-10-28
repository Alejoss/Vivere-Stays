from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse

from dynamic_pricing.models import (
    Property, DpGeneralSettings, DpPropertyCompetitor,
    DpDynamicIncrementsV2, DpOfferIncrements, DpLosSetup, DpLosReduction,
    DpMinimumSellingPrice, DpRoomRates
)
from test_utils import create_test_user, create_test_property


class PropertyModelTest(TestCase):
    """Test cases for Property model"""

    def setUp(self):
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001',
            city='Test City',
            country='Test Country',
            number_of_rooms=50,
            is_active=True
        )

    def test_property_creation(self):
        """Test that a property can be created"""
        self.assertEqual(self.property.name, 'Test Hotel')
        self.assertEqual(self.property.pms_name, 'apaleo')
        self.assertTrue(self.property.is_active)

    def test_property_str_representation(self):
        """Test the string representation of Property"""
        expected = 'Test Hotel (TEST001)'
        self.assertEqual(str(self.property), expected)


class DpGeneralSettingsModelTest(TestCase):
    """Test cases for DpGeneralSettings model"""

    def setUp(self):
        self.user = create_test_user()
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001',
            number_of_rooms=50
        )
        self.settings = DpGeneralSettings.objects.create(
            property_id=self.property,
            user=self.user,
            min_competitors=3,
            comp_price_calculation='min',
            pricing_status='online',
            los_status='online'
        )

    def test_settings_creation(self):
        """Test that settings can be created"""
        self.assertEqual(self.settings.property_id, self.property)
        self.assertEqual(self.settings.min_competitors, 3)
        self.assertEqual(self.settings.pricing_status, 'online')

    def test_settings_str_representation(self):
        """Test the string representation of DpGeneralSettings"""
        expected = 'Settings for Test Hotel'
        self.assertEqual(str(self.settings), expected)


class DpPropertyCompetitorModelTest(TestCase):
    """Test cases for DpPropertyCompetitor model"""

    def setUp(self):
        self.user = create_test_user()
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001',
            number_of_rooms=50
        )
        # Create a Competitor instance first
        from dynamic_pricing.models import Competitor
        competitor = Competitor.objects.create(
            competitor_name='Test Competitor'
        )
        self.competitor = DpPropertyCompetitor.objects.create(
            property_id=self.property,
            user=self.user,
            competitor=competitor
        )

    def test_competitor_creation(self):
        """Test that a competitor relationship can be created"""
        self.assertEqual(self.competitor.property_id, self.property)
        self.assertEqual(self.competitor.competitor.competitor_name, 'Test Competitor')

    def test_competitor_str_representation(self):
        """Test the string representation of DpPropertyCompetitor"""
        expected = 'Test Hotel - Competitor Test Competitor (ID: 1)'
        self.assertEqual(str(self.competitor), expected)


class DpDynamicIncrementsV2ModelTest(TestCase):
    """Test cases for DpDynamicIncrementsV2 model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001',
            number_of_rooms=50
        )
        self.increment = DpDynamicIncrementsV2.objects.create(
            property_id=self.property,
            user=self.user,
            occupancy_category='70-80',
            lead_time_category='3-7',
            increment_type='Additional',
            increment_value=15.0
        )

    def test_increment_creation(self):
        """Test that an increment can be created"""
        self.assertEqual(self.increment.property_id, self.property)
        self.assertEqual(self.increment.occupancy_category, '70-80')
        self.assertEqual(self.increment.lead_time_category, '3-7')

    def test_increment_str_representation(self):
        """Test the string representation of DpDynamicIncrementsV2"""
        expected = 'Test Hotel - Occupancy 70-80%, Lead 3-7 days'
        self.assertEqual(str(self.increment), expected)


class PropertyAPITest(APITestCase):
    """Test cases for Property API endpoints"""

    def setUp(self):
        self.user = create_test_user()
        self.client.force_authenticate(user=self.user)
        
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001',
            city='Test City',
            country='Test Country',
            number_of_rooms=50
        )
        
        # Associate property with user's profile
        self.user.profile.add_property(self.property)

    def test_property_list(self):
        """Test getting list of properties"""
        url = reverse('dynamic_pricing:property-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_property_detail(self):
        """Test getting property details"""
        url = reverse('dynamic_pricing:property-detail', kwargs={'property_id': self.property.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['property']['name'], 'Test Hotel')

    def test_property_pricing_settings(self):
        """Test getting property pricing settings"""
        # Create settings for the property
        DpGeneralSettings.objects.create(
            property_id=self.property,
            user=self.user,
            pricing_status='online',
            los_status='online',
            min_competitors=3
        )
        
        url = reverse('dynamic_pricing:general-settings-update', kwargs={'property_id': self.property.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pricing_status'], 'online')
