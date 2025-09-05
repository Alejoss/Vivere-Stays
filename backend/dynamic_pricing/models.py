# Django models for the dynamic pricing schema
from django.db import models
from profiles.models import Profile
from booking.models import Competitor
from django.contrib.auth.models import User

class PropertyManagementSystem(models.Model):
    """
    Property management systems
    """
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
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
    # id = models.CharField(max_length=255, primary_key=True)
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
    base_rate_code = models.CharField(max_length=255, null=True, blank=True)
    is_base_in_pms = models.BooleanField(null=True, blank=True)  # For Apaleo only
    min_competitors = models.IntegerField(default=2)
    comp_price_calculation = models.CharField(max_length=255, default='min')  # Minimum, etc.
    competitor_excluded = models.TextField(null=True, blank=True)
    competitors_excluded = models.ManyToManyField(Competitor, related_name='properties_excluded', blank=True)
    msp_include_events_weekend_increments = models.BooleanField(default=False)
    future_days_to_price = models.IntegerField(default=365)
    pricing_status = models.CharField(max_length=255, default='offline')
    los_status = models.CharField(max_length=255, default='offline')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Dynamic Pricing General Settings'
        verbose_name_plural = 'Dynamic Pricing General Settings'

    def __str__(self):
        return f"Settings for {self.property_id.name}"


class DpPropertyCompetitor(models.Model):
    """
    Property-competitor relationships for dynamic pricing
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    competitor_id = models.ForeignKey(Competitor, on_delete=models.CASCADE, db_column='competitor_id')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    only_follow = models.BooleanField(default=False)

    class Meta:
        unique_together = ('property_id', 'competitor_id')
        verbose_name = 'Property Competitor'
        verbose_name_plural = 'Property Competitors'

    def __str__(self):
        return f"{self.property_id.name} - Competitor {self.competitor_id}"


class DpDynamicIncrementsV1(models.Model):
    """
    Dynamic pricing increments v1 (range-based format)
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    var_name = models.CharField(max_length=255)  # "occupancy" or "leadtime"
    var_from = models.FloatField()
    var_to = models.FloatField()
    increment_type = models.CharField(max_length=255, default='Additional')  # "Percentage" or "Additional"
    increment_value = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'var_name', 'var_from', 'var_to')
        verbose_name = 'Dynamic Increment V1'
        verbose_name_plural = 'Dynamic Increments V1'

    def __str__(self):
        return f"{self.property_id.name} - {self.var_name} ({self.var_from}-{self.var_to})"


class DpDynamicIncrementsV2(models.Model):
    """
    Dynamic pricing increments v2 (point-based format)
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    occupancy_level = models.FloatField()
    lead_time_days = models.IntegerField()
    increment_type = models.CharField(max_length=255, default='Additional')  # "Percentage" or "Additional"
    increment_value = models.FloatField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'occupancy_level', 'lead_time_days')
        verbose_name = 'Dynamic Increment V2'
        verbose_name_plural = 'Dynamic Increments V2'

    def __str__(self):
        return f"{self.property_id.name} - Occupancy {self.occupancy_level}, Lead {self.lead_time_days} days"


class DpOfferIncrements(models.Model):
    """
    Dynamic pricing offer increments
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
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
    valid_from = models.DateField()
    valid_until = models.DateField()
    day_of_week = models.CharField(max_length=255)  # "mon", "tue", "wed", "thu", "fri", "sat", "sun"
    los_value = models.IntegerField()
    num_competitors = models.IntegerField(default=2)
    los_aggregation = models.CharField(max_length=255, default='min')        
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
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
    lead_time_days = models.IntegerField()
    occupancy_level = models.CharField(max_length=255)  # "30", "50", "70", "200"
    los_value = models.IntegerField()       
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'lead_time_days')
        verbose_name = 'LOS Reduction'
        verbose_name_plural = 'LOS Reductions'

    def __str__(self):
        return f"{self.property_id.name} - Lead {self.lead_time_days} days, Occupancy {self.occupancy_level}%"


class DpMinimumSellingPrice(models.Model):
    """
    Minimum selling price table
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    valid_from = models.DateField()
    valid_until = models.DateField()
    manual_alternative_price = models.IntegerField(null=True, blank=True)
    msp = models.IntegerField()
    period_title = models.CharField(max_length=255, null=True, blank=True, help_text="Optional name for this MSP period")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'valid_from')
        verbose_name = 'Minimum Selling Price'
        verbose_name_plural = 'Minimum Selling Prices'

    def __str__(self):
        return f"{self.property_id.name} - MSP {self.valid_from} to {self.valid_until}"


class DpWeekdayIncrements(models.Model):
    """
    Weekday-specific increments
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    weekday = models.CharField(max_length=255)  # "Monday", "Tuesday", etc.
    increment_type = models.CharField(max_length=255, default='Additional')  # "Percentage" or "Additional"
    increment_value = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'weekday')
        verbose_name = 'Weekday Increment'
        verbose_name_plural = 'Weekday Increments'

    def __str__(self):
        return f"{self.property_id.name} - {self.weekday}"


class DpEvents(models.Model):
    """
    Event-based increments
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    valid_from = models.DateField()
    valid_until = models.DateField()
    event_name = models.CharField(max_length=255)
    increment_type = models.CharField(max_length=255, default='Additional')  # "Percentage" or "Additional"
    increment_value = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'valid_from')
        verbose_name = 'Event'
        verbose_name_plural = 'Events'

    def __str__(self):
        return f"{self.property_id.name} - {self.event_name} ({self.valid_from} to {self.valid_until})"


class DpRoomRates(models.Model):
    """
    Room rate configurations
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    rate_id = models.CharField(max_length=255)
    base_rate_id = models.CharField(max_length=255)
    increment_type = models.CharField(max_length=255, default='Additional')  # "Percentage" or "Additional"
    increment_value = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'rate_id')
        verbose_name = 'Room Rate'
        verbose_name_plural = 'Room Rates'

    def __str__(self):
        return f"{self.property_id.name} - Rate {self.rate_id}"


class DpPriceChangeHistory(models.Model):
    """
    Dynamic pricing price change history - tracks pricing decisions over time
    """
    property_id = models.ForeignKey(Property, on_delete=models.CASCADE, db_column='property_id')
    pms_hotel_id = models.CharField(max_length=255)
    checkin_date = models.DateField()  # Date for which the price change was calculated
    as_of = models.DateTimeField()  # Timestamp when the data was captured

    # Key pricing data
    occupancy = models.FloatField(null=True, blank=True)  # Occupancy level
    msp = models.IntegerField()  # Minimum Selling Price
    recom_price = models.IntegerField()  # Recommended price
    overwrite_price = models.IntegerField(null=True, blank=True)  # Overwrite price (from RM)
    recom_los = models.IntegerField()  # Recommended LOS
    overwrite_los = models.IntegerField(null=True, blank=True)  # Overwrite LOS (from RM)
    base_price = models.IntegerField()  # Base price used in calculation
    base_price_choice = models.CharField(max_length=255)  # "competitor" or "manual"

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('property_id', 'checkin_date', 'as_of')
        verbose_name = 'Price Change History'
        verbose_name_plural = 'Price Change Histories'

    def __str__(self):
        return f"{self.property_id.name} - {self.checkin_date} at {self.as_of}"


class DpHistoricalCompetitorPrice(models.Model):
    """
    Historical competitor prices (imported from booking.historical_competitor_prices)
    """
    competitor = models.ForeignKey(
        'booking.Competitor',
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
    property_instance = models.ForeignKey(
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
        verbose_name = 'Competitor Candidate'
        verbose_name_plural = 'Competitor Candidates'
        unique_together = ('property_instance', 'competitor_name')
        indexes = [
            models.Index(fields=['property_instance', 'status']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['deleted', 'status']),
        ]
    
    def __str__(self):
        return f"{self.competitor_name} - {self.property_instance.name} ({self.get_status_display()})"
    
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
