# Django models for the dynamic pricing schema
from django.db import models
from profiles.models import Profile
from booking.models import Competitor

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
