from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status

from .models import (
    Property, DpGeneralSettings, DpPropertyCompetitor,
    DpDynamicIncrementsV2, DpOfferIncrements, DpLosSetup, DpLosReduction,
    DpMinimumSellingPrice, DpRoomRates
)


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
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001'
        )
        self.settings = DpGeneralSettings.objects.create(
            property_id=self.property,
            base_rate_code='BASE_RATE',
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
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001'
        )
        self.competitor = DpPropertyCompetitor.objects.create(
            property_id=self.property,
            competitor_id='COMP001'
        )

    def test_competitor_creation(self):
        """Test that a competitor relationship can be created"""
        self.assertEqual(self.competitor.property_id, self.property)
        self.assertEqual(self.competitor.competitor_id, 'COMP001')

    def test_competitor_str_representation(self):
        """Test the string representation of DpPropertyCompetitor"""
        expected = 'Test Hotel - Competitor COMP001'
        self.assertEqual(str(self.competitor), expected)


class DpDynamicIncrementsV1ModelTest(TestCase):
    """Test cases for DpDynamicIncrementsV1 model"""

    def setUp(self):
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001'
        )
        self.increment = DpDynamicIncrementsV1.objects.create(
            property_id=self.property,
            var_name='occupancy',
            var_from=0.0,
            var_to=50.0,
            increment_type='Additional',
            increment_value=10.0
        )

    def test_increment_creation(self):
        """Test that an increment can be created"""
        self.assertEqual(self.increment.property_id, self.property)
        self.assertEqual(self.increment.var_name, 'occupancy')
        self.assertEqual(self.increment.increment_value, 10.0)

    def test_increment_str_representation(self):
        """Test the string representation of DpDynamicIncrementsV1"""
        expected = 'Test Hotel - occupancy (0.0-50.0)'
        self.assertEqual(str(self.increment), expected)


class DpDynamicIncrementsV2ModelTest(TestCase):
    """Test cases for DpDynamicIncrementsV2 model"""

    def setUp(self):
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001'
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
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.property = Property.objects.create(
            id='TEST001',
            name='Test Hotel',
            pms_name='apaleo',
            pms_hotel_id='AP001',
            spreadsheet_id='SPREADSHEET001',
            city='Test City',
            country='Test Country'
        )

    def test_property_list(self):
        """Test getting list of properties"""
        response = self.client.get('/api/v1/properties/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_property_detail(self):
        """Test getting property details"""
        response = self.client.get(f'/api/v1/properties/{self.property.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Hotel')

    def test_property_pricing_settings(self):
        """Test getting property pricing settings"""
        # Create settings for the property
        DpGeneralSettings.objects.create(
            property_id=self.property,
            pricing_status='online',
            los_status='online',
            min_competitors=3
        )
        
        response = self.client.get(f'/api/v1/properties/{self.property.id}/pricing_settings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['pricing_status'], 'online')
