# Django models for the dynamic pricing schema
from django.db import models
from django.utils import timezone
from django.conf import settings
from profiles.models import Profile
from django.contrib.auth.models import User

class Competitor(models.Model):
    """
    Model representing competitor hotels for price monitoring.
    """
    competitor_id = models.CharField(max_length=255, unique=True)
    competitor_name = models.CharField(max_length=255)
    booking_link = models.URLField(null=True, blank=True)    
    
    class Meta:
        db_table = 'dynamic_pricing_competitor'
        verbose_name = 'Competitor'
        verbose_name_plural = 'Competitors'
    
    def __str__(self):
        return f"{self.competitor_name} ({self.competitor_id})"


class PropertyManagementSystem(models.Model):
    """
    Property management systems
    """
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_propertymanagementsystem'
        verbose_name = 'Property Management System'
        verbose_name_plural = 'Property Management Systems'

    def __str__(self):
        return self.name


class Property(models.Model):
    """
    Properties table - stores information about hotels/properties
    """
    PROPERTY_TYPE_CHOICES = [
        ('hotel', 'Hotel'),
        ('apartment', 'Apartment'),
        ('hostel', 'Hostel'),
        ('guesthouse', 'Guesthouse'),
        ('other', 'Other'),
    ]
    id = models.CharField(max_length=255, primary_key=True)
    profiles = models.ManyToManyField(Profile, related_name='properties', blank=True)
    pms = models.ForeignKey(PropertyManagementSystem, on_delete=models.CASCADE, null=True, blank=True)
    name = models.CharField(max_length=255)
    pms_name = models.CharField(max_length=255, null=True, blank=True)  # mrplan, apaleo, avirato, or other
    pms_hotel_id = models.CharField(max_length=255, null=True, blank=True)
    spreadsheet_id = models.CharField(max_length=255, null=True, blank=True)
    booking_hotel_url = models.TextField(null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
    country = models.CharField(max_length=255, null=True, blank=True)
    # Address fields
    street_address = models.CharField(max_length=500, null=True, blank=True, help_text="Street address including building number and street name")
    postal_code = models.CharField(max_length=20, null=True, blank=True, help_text="Postal/ZIP code")
    state_province = models.CharField(max_length=100, null=True, blank=True, help_text="State, province, or region")
    phone_number = models.CharField(max_length=20, null=True, blank=True, help_text="Phone number in international format (e.g. +34612345678)")
    website = models.CharField(max_length=255, null=True, blank=True)
    cif = models.CharField(max_length=255, null=True, blank=True)
    number_of_rooms = models.IntegerField()
    property_type = models.CharField(max_length=255, null=True, blank=True, choices=PROPERTY_TYPE_CHOICES)
    # Geolocation fields
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Latitude coordinate")
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Longitude coordinate")
    rm_email = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'dynamic_pricing_property'
        verbose_name = 'Property'
        verbose_name_plural = 'Properties'

    def __str__(self):
        return f"{self.name} ({self.id})"

    @property
    def full_address(self):
        """
        Returns the complete formatted address
        """
        address_parts = []
        if self.street_address:
            address_parts.append(self.street_address)
        if self.city:
            address_parts.append(self.city)
        if self.state_province:
            address_parts.append(self.state_province)
        if self.postal_code:
            address_parts.append(self.postal_code)
        if self.country:
            address_parts.append(self.country)
        return ", ".join(address_parts) if address_parts else "Address not available"


class DpGeneralSettings(models.Model):
    """
    Dynamic pricing general settings for each property
    """
    property_id = models.OneToOneField(Property, on_delete=models.CASCADE, primary_key=True, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='general_settings', help_text="User who owns this property")
    min_competitors = models.IntegerField(default=2)
    comp_price_calculation = models.CharField(max_length=255, default='min')  # Minimum, etc.
    future_days_to_price = models.IntegerField(default=365)
    pricing_status = models.CharField(max_length=255, default='offline')
    los_status = models.CharField(max_length=255, default='offline')
    otas_price_diff = models.FloatField(default=0)
    # LOS-specific settings
    los_num_competitors = models.IntegerField(default=2, help_text="Number of competitors required for LOS calculations")
    los_aggregation = models.CharField(max_length=255, default='min', help_text="LOS aggregation method: min or max")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_dpgeneralsettings'
        verbose_name = 'Dynamic Pricing General Settings'
        verbose_name_plural = 'Dynamic Pricing General Settings'

    def __str__(self):
        return f"Settings for {self.property_id.name}"


class DpPropertyCompetitor(models.Model):
    """
    Property-competitor relationships for dynamic pricing
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='property_competitors', help_text="User who owns this property")
    competitor_id = models.ForeignKey(Competitor, on_delete=models.CASCADE, db_column='competitor_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    only_follow = models.BooleanField(default=False)

    class Meta:
        db_table = 'dynamic_pricing_dppropertycompetitor'
        unique_together = ('property_id', 'competitor_id')
        verbose_name = 'Property Competitor'
        verbose_name_plural = 'Property Competitors'

    def __str__(self):
        return f"{self.property_id.name} - Competitor {self.competitor_id}"


class DpDynamicIncrementsV2(models.Model):
    """
    Dynamic pricing increments v2 (category-based format)
    """
    # Occupancy categories: 0-30, 30-50, 50-70, 70-80, 80-90, 90-100, 100+
    OCCUPANCY_CATEGORIES = [
        ('0-30', '0-30%'),
        ('30-50', '30-50%'),
        ('50-70', '50-70%'),
        ('70-80', '70-80%'),
        ('80-90', '80-90%'),
        ('90-100', '90-100%'),
        ('100+', '100%+'),
    ]
    
    # Lead time categories: 0-1, 1-3, 3-7, 7-14, 14-30, 30-45, 45-60, 60+
    LEAD_TIME_CATEGORIES = [
        ('0-1', '0-1 days'),
        ('1-3', '1-3 days'),
        ('3-7', '3-7 days'),
        ('7-14', '7-14 days'),
        ('14-30', '14-30 days'),
        ('30-45', '30-45 days'),
        ('45-60', '45-60 days'),
        ('60+', '60+ days'),
    ]
    
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='dynamic_increments_v2', help_text="User who created this dynamic increment")
    occupancy_category = models.CharField(max_length=10, choices=OCCUPANCY_CATEGORIES, default='50-70', help_text="Occupancy level category")
    lead_time_category = models.CharField(max_length=10, choices=LEAD_TIME_CATEGORIES, default='3-7', help_text="Lead time category")
    increment_type = models.CharField(max_length=255, default='Additional')  # "Percentage" or "Additional"
    increment_value = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_dpdynamicincrementsv2'
        unique_together = ('property_id', 'occupancy_category', 'lead_time_category')
        verbose_name = 'Dynamic Increment V2'
        verbose_name_plural = 'Dynamic Increments V2'

    def __str__(self):
        return f"{self.property_id.name} - Occupancy {self.get_occupancy_category_display()}, Lead {self.get_lead_time_category_display()}"


class DpOfferIncrements(models.Model):
    """
    Dynamic pricing offer increments
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='offer_increments', help_text="User who created this offer increment")
    offer_name = models.CharField(max_length=255, null=True, blank=True)
    valid_from = models.DateField()
    valid_until = models.DateField()
    applied_from_days = models.IntegerField(null=True, blank=True)
    applied_until_days = models.IntegerField(null=True, blank=True)
    increment_type = models.CharField(max_length=255, default='Additional')  # "Percentage" or "Additional"
    increment_value = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_dpofferincrements'
        unique_together = ('property_id', 'valid_from', 'valid_until')
        verbose_name = 'Offer Increment'
        verbose_name_plural = 'Offer Increments'

    def __str__(self):
        return f"{self.property_id.name} - {self.offer_name or 'Offer'} ({self.valid_from} to {self.valid_until})"


class DpLosSetup(models.Model):
    """
    Dynamic pricing length of stay setup
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='los_setups', help_text="User who owns this property")
    valid_from = models.DateField()
    valid_until = models.DateField()
    day_of_week = models.CharField(max_length=255, default='Monday')  # "mon", "tue", "wed", "thu", "fri", "sat", "sun"
    los_value = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_dplossetup'
        unique_together = ('property_id', 'valid_from', 'day_of_week')
        verbose_name = 'LOS Setup'
        verbose_name_plural = 'LOS Setups'

    def __str__(self):
        return f"{self.property_id.name} - {self.day_of_week} ({self.valid_from} to {self.valid_until})"


class DpLosReduction(models.Model):
    """
    Dynamic pricing length of stay reduction
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='los_reductions', help_text="User who owns this property")
    # Mirror categories from DpDynamicIncrementsV2
    lead_time_category = models.CharField(max_length=10, choices=DpDynamicIncrementsV2.LEAD_TIME_CATEGORIES, default='3-7', help_text="Lead time category")
    occupancy_category = models.CharField(max_length=10, choices=DpDynamicIncrementsV2.OCCUPANCY_CATEGORIES, default='50-70', help_text="Occupancy level category")
    los_value = models.IntegerField(default=1)       
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_dplosreduction'
        unique_together = ('property_id', 'occupancy_category', 'lead_time_category')
        verbose_name = 'LOS Reduction'
        verbose_name_plural = 'LOS Reductions'

    def __str__(self):
        return f"{self.property_id.name} - Lead {self.get_lead_time_category_display()}, Occupancy {self.get_occupancy_category_display()}"


class DpMinimumSellingPrice(models.Model):
    """
    Minimum selling price table
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='minimum_selling_prices', help_text="User who owns this property")
    valid_from = models.DateField()
    valid_until = models.DateField()
    msp = models.IntegerField()
    period_title = models.CharField(max_length=255, null=True, blank=True, help_text="Optional name for this MSP period")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_dpminimumsellingprice'
        unique_together = ('property_id', 'valid_from')
        verbose_name = 'Minimum Selling Price'
        verbose_name_plural = 'Minimum Selling Prices'

    def __str__(self):
        return f"{self.property_id.name} - MSP {self.valid_from} to {self.valid_until}"



class DpRoomRates(models.Model):
    """
    Room rate configurations
    """
    INCREMENT_TYPE_CHOICES = [
        ('Percentage', 'Percentage'),
        ('Additional', 'Additional'),
    ]
    
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='room_rates', help_text="User who owns this property")
    rate_id = models.CharField(max_length=255)
    is_base_rate = models.BooleanField(default=False)
    increment_type = models.CharField(max_length=255, choices=INCREMENT_TYPE_CHOICES, default='Percentage')
    increment_value = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_dproomrates'
        unique_together = ('property_id', 'rate_id')
        verbose_name = 'Room Rate'
        verbose_name_plural = 'Room Rates'

    def __str__(self):
        return f"{self.property_id.name} - Rate {self.rate_id}"


class DpPriceChangeHistory(models.Model):
    """
    Dynamic pricing price change history - tracks pricing decisions over time.
    
    NOTE: This model represents a table managed by an external schema/system.
    Django will NOT create/modify this table structure (managed=False).
    Only for read operations and foreign key relationships.
    
    The overwrite_price field has been moved to OverwritePriceHistory model.
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='price_change_history', help_text="User who owns this property")    
    checkin_date = models.DateField()  # Date for which the price change was calculated    
    # overwrite_price field moved to OverwritePriceHistory model
    updated_at = models.DateTimeField(auto_now=True)
    # Key pricing data (managed externally)
    created_at = models.DateTimeField(auto_now_add=True)
    as_of = models.DateTimeField()  # Timestamp when the data was captured
    occupancy = models.FloatField(null=True, blank=True)  # Occupancy level
    pms_hotel_id = models.CharField(max_length=255)
    msp = models.IntegerField()  # Minimum Selling Price
    recom_price = models.IntegerField()  # Recommended price    
    recom_los = models.IntegerField()  # Recommended LOS
    overwrite_los = models.IntegerField(null=True, blank=True)  # Overwrite LOS (from RM)
    base_price = models.IntegerField()  # Base price used in calculation
    base_price_choice = models.CharField(max_length=255)  # "competitor" or "manual"
    competitor_average = models.FloatField(null=True, blank=True)  # Competitor average price

    class Meta:
        managed = settings.DEBUG  # True in dev/staging, False in production
        db_table = 'booking.dp_price_change_history'
        unique_together = ('property_id', 'checkin_date', 'as_of')
        verbose_name = 'Price Change History'
        verbose_name_plural = 'Price Change Histories'

    def __str__(self):
        return f"{self.property_id.name} - {self.checkin_date} at {self.as_of}"


class DpHistoricalCompetitorPrice(models.Model):
    """
    Historical competitor prices (imported from booking.historical_competitor_prices)
    
    NOTE: This model represents a table managed by an external schema/system.
    Django will NOT create/modify this table structure (managed=False).
    Only for read operations and foreign key relationships.
    """
    competitor = models.ForeignKey(
        Competitor,
        on_delete=models.CASCADE,
        db_column='competitor_id',
        related_name='historical_prices',
    )
    hotel_name = models.CharField(max_length=255)
    room_name = models.CharField(max_length=255)
    checkin_date = models.DateField()
    checkout_date = models.DateField()
    raw_price = models.FloatField(null=True, blank=True)
    currency = models.CharField(max_length=10, null=True, blank=True)
    cancellation_type = models.CharField(max_length=255, null=True, blank=True)
    max_persons = models.IntegerField(null=True, blank=True)
    min_los = models.IntegerField(null=True, blank=True)
    sold_out_message = models.CharField(max_length=500, null=True, blank=True)
    taking_reservations = models.BooleanField(null=True, blank=True)
    scrape_date = models.DateField()
    is_available = models.IntegerField(null=True, blank=True)
    num_days = models.IntegerField(null=True, blank=True)
    price = models.FloatField(null=True, blank=True)
    update_tz = models.DateTimeField()

    class Meta:
        managed = settings.DEBUG  # True in dev/staging, False in production
        db_table = 'booking.dp_historical_competitor_price'
        unique_together = ('competitor', 'checkin_date', 'room_name')
        verbose_name = 'Historical Competitor Price'
        verbose_name_plural = 'Historical Competitor Prices'

    def __str__(self):
        return f"{self.competitor.competitor_name} - {self.room_name} ({self.checkin_date})"


class CompetitorCandidate(models.Model):
    """
    Competitor candidates for properties - stores suggested competitors before they become active
    """
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('finished', 'Finished'),
        ('error', 'Error'),
    ]
    
    # Core fields
    competitor_name = models.CharField(max_length=255, help_text="Name of the competitor hotel")
    booking_link = models.URLField(null=True, blank=True, help_text="Booking.com URL for the competitor")
    suggested_by_user = models.BooleanField(default=False, help_text="Whether this competitor was suggested by the user")

    # Relationships
    property_id = models.ForeignKey(
        Property, 
        on_delete=models.CASCADE, 
        db_column='property_id',
        related_name='competitor_candidates',
        help_text="Property this competitor candidate belongs to"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='competitor_candidates',
        help_text="User who suggested or is processing this competitor"
    )
    
    # Analysis fields
    similarity_score = models.FloatField(
        null=True, 
        blank=True, 
        help_text="AI-generated similarity score (0.0 to 1.0)"
    )
    
    # Status and control fields
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='processing',
        help_text="Current processing status of this competitor candidate"
    )
    only_follow = models.BooleanField(
        default=False, 
        help_text="Whether to only follow this competitor without creating a full competitor record"
    )
    deleted = models.BooleanField(
        default=False, 
        help_text="Soft delete flag"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True, help_text="When the candidate was processed")
    
    # Error tracking
    error_message = models.TextField(null=True, blank=True, help_text="Error message if status is 'error'")
    
    class Meta:
        db_table = 'dynamic_pricing_competitorcandidate'
        verbose_name = 'Competitor Candidate'
        verbose_name_plural = 'Competitor Candidates'
        unique_together = ('property_id', 'competitor_name')
        indexes = [
            models.Index(fields=['property_id', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['deleted', 'status']),
        ]
    
    def __str__(self):
        return f"{self.competitor_name} - {self.property_id.name} ({self.get_status_display()})"
    
    def save(self, *args, **kwargs):
        # Auto-update processed_at when status changes to finished or error
        if self.status in ['finished', 'error'] and not self.processed_at:
            from django.utils import timezone
            self.processed_at = timezone.now()
        
        super().save(*args, **kwargs)
    
    @property
    def is_active(self):
        """Check if this candidate is active (not deleted and not in error state)"""
        return not self.deleted and self.status != 'error'
    
    def mark_as_finished(self):
        """Mark the candidate as successfully processed"""
        self.status = 'finished'
        self.save()
    
    def mark_as_error(self, error_message=""):
        """Mark the candidate as failed with an error message"""
        self.status = 'error'
        self.error_message = error_message
        self.save()
    
    def soft_delete(self):
        """Soft delete the candidate"""
        self.deleted = True
        self.save()


class UnifiedRoomsAndRates(models.Model):
    """
    Unified rooms and rates consolidated across PMSs.
    Mirrors SQL table core.unified_rooms_and_rates.
    
    NOTE: This model represents a table managed by an external schema/system.
    Django will NOT create/modify this table structure (managed=False).
    Only for read operations and foreign key relationships.
    """

    PMS_SOURCE_CHOICES = [
        ('apaleo', 'Apaleo'),
        ('mrplan', 'MrPlan'),
        ('avirato', 'Avirato'),
    ]

    # Primary identifiers
    property_id = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        db_column='property_id',
        help_text='Internal property ID (unique across all PMSs)'
    )
    pms_source = models.CharField(max_length=50, choices=PMS_SOURCE_CHOICES)
    pms_hotel_id = models.CharField(max_length=255)
    room_id = models.CharField(max_length=255)
    rate_id = models.CharField(max_length=255)

    # Room and rate information
    room_name = models.CharField(max_length=255)
    room_description = models.TextField(null=True, blank=True)
    rate_name = models.CharField(max_length=255)
    rate_description = models.TextField(null=True, blank=True)
    rate_category = models.CharField(max_length=255, null=True, blank=True)

    # Data tracking
    last_updated = models.DateTimeField(default=timezone.now)

    class Meta:
        managed = settings.DEBUG  # True in dev/staging, False in production
        db_table = 'core.unified_rooms_and_rates'
        verbose_name = 'Unified Room and Rate'
        verbose_name_plural = 'Unified Rooms and Rates'
        unique_together = (
            ('property_id', 'room_id', 'rate_id'),
        )
        indexes = [
            models.Index(fields=['property_id'], name='idx_unified_rooms_prop'),
            models.Index(fields=['property_id', 'pms_source'], name='idx_unified_rooms_pms'),
            models.Index(fields=['property_id', 'room_id'], name='idx_unified_rooms_room'),
        ]

    def __str__(self):
        return f"{self.property_id_id} - Room {self.room_id} / Rate {self.rate_id}"


class OverwritePriceHistory(models.Model):
    """
    Model for storing price overwrites separately from the main price history data.
    This handles only the overwrite_price field that was previously part of DpPriceChangeHistory.
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='overwrite_price_history', help_text="User who owns this property")    
    checkin_date = models.DateField()  # Date for which the price change was calculated    
    overwrite_price = models.IntegerField(null=True, blank=True)  # Overwrite price (from RM)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'dynamic_pricing_overwritepricehistory'
        verbose_name = 'Overwrite Price History'
        verbose_name_plural = 'Overwrite Price Histories'
        unique_together = ('property_id', 'checkin_date')

    def __str__(self):
        return f"{self.property_id.name} - {self.checkin_date} - Overwrite: {self.overwrite_price}"

