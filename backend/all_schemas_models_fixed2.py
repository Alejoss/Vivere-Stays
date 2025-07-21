# This is an auto-generated Django model module.
# Generated from all schemas in the database.
from django.db import models

class MaintenanceHistory(models.Model):
    id = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    unit = models.JSONField()
    from_ = models.CharField(max_length=255)
    to = models.CharField(max_length=255)
    type = models.CharField(max_length=255)
    description = models.CharField(max_length=255, null=True)

    class Meta:
        managed = False
        db_table = 'apaleo.maintenance_history'

class PropertiesDeprecated(models.Model):
    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=255)
    propertyTemplateId = models.CharField(max_length=255, null=True)
    isTemplate = models.BooleanField()
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, null=True)
    companyName = models.CharField(max_length=255)
    managingDirectors = models.CharField(max_length=255, null=True)
    commercialRegisterEntry = models.CharField(max_length=255)
    taxId = models.CharField(max_length=255)
    location = models.JSONField()
    bankAccount = models.JSONField(null=True)
    paymentTerms = models.JSONField()
    timeZone = models.CharField(max_length=255)
    currencyCode = models.CharField(max_length=255)
    created = models.CharField(max_length=255)
    status = models.CharField(max_length=255)
    isArchived = models.BooleanField()
    actions = models.TextField(null=True)  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'apaleo.properties_deprecated'

class PropertyHistory(models.Model):
    id = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    code = models.CharField(max_length=255)
    propertyTemplateId = models.CharField(max_length=255, null=True)
    isTemplate = models.BooleanField()
    name = models.JSONField()
    description = models.JSONField(null=True)
    companyName = models.CharField(max_length=255)
    managingDirectors = models.CharField(max_length=255, null=True)
    commercialRegisterEntry = models.CharField(max_length=255)
    taxId = models.CharField(max_length=255)
    location = models.JSONField()
    bankAccount = models.JSONField(null=True)
    paymentTerms = models.JSONField()
    timeZone = models.CharField(max_length=255)
    currencyCode = models.CharField(max_length=255)
    created = models.CharField(max_length=255)
    status = models.CharField(max_length=255)
    isArchived = models.BooleanField()
    actions = models.TextField(null=True)  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'apaleo.property_history'

class RateplanHistory(models.Model):
    id = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    code = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    minGuaranteeType = models.CharField(max_length=255)
    priceCalculationMode = models.CharField(max_length=255, null=True)
    property = models.JSONField()
    unitGroup = models.JSONField()
    cancellationPolicy = models.JSONField()
    noShowPolicy = models.JSONField()
    channelCodes = models.TextField()  # ARRAY type converted to TextField
    promoCodes = models.TextField(null=True)  # ARRAY type converted to TextField
    timeSliceDefinition = models.JSONField()
    restrictions = models.JSONField(null=True)
    bookingPeriods = models.TextField(null=True)  # ARRAY type converted to TextField
    isBookable = models.BooleanField()
    isSubjectToCityTax = models.BooleanField()
    pricingRule = models.JSONField(null=True)
    isDerived = models.BooleanField()
    derivationLevel = models.IntegerField()
    surcharges = models.TextField(null=True)  # ARRAY type converted to TextField
    ageCategories = models.TextField(null=True)  # ARRAY type converted to TextField
    includedServices = models.TextField(null=True)  # ARRAY type converted to TextField
    companies = models.TextField(null=True)  # ARRAY type converted to TextField
    ratesRange = models.JSONField(null=True)
    accountingConfigs = models.TextField()  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'apaleo.rateplan_history'

class ReservationHistory(models.Model):
    id = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    bookingId = models.CharField(max_length=255)
    blockId = models.CharField(max_length=255, null=True)
    groupName = models.CharField(max_length=255, null=True)
    status = models.CharField(max_length=255)
    checkInTime = models.CharField(max_length=255, null=True)
    checkOutTime = models.CharField(max_length=255, null=True)
    cancellationTime = models.CharField(max_length=255, null=True)
    noShowTime = models.CharField(max_length=255, null=True)
    unit = models.JSONField(null=True)
    property = models.JSONField()
    ratePlan = models.JSONField()
    unitGroup = models.JSONField()
    totalGrossAmount = models.JSONField()
    arrival = models.CharField(max_length=255)
    departure = models.CharField(max_length=255)
    created = models.CharField(max_length=255)
    modified = models.CharField(max_length=255)
    adults = models.IntegerField()
    childrenAges = models.TextField(null=True)  # ARRAY type converted to TextField
    comment = models.CharField(max_length=255, null=True)
    guestComment = models.CharField(max_length=255, null=True)
    externalCode = models.CharField(max_length=255, null=True)
    channelCode = models.CharField(max_length=255)
    source = models.CharField(max_length=255, null=True)
    primaryGuest = models.JSONField(null=True)
    additionalGuests = models.TextField(null=True)  # ARRAY type converted to TextField
    booker = models.JSONField(null=True)
    paymentAccount = models.JSONField(null=True)
    guaranteeType = models.CharField(max_length=255)
    cancellationFee = models.JSONField()
    noShowFee = models.JSONField()
    travelPurpose = models.CharField(max_length=255, null=True)
    balance = models.JSONField()
    assignedUnits = models.TextField(null=True)  # ARRAY type converted to TextField
    timeSlices = models.TextField(null=True)  # ARRAY type converted to TextField
    services = models.TextField(null=True)  # ARRAY type converted to TextField
    validationMessages = models.TextField(null=True)  # ARRAY type converted to TextField
    actions = models.TextField(null=True)  # ARRAY type converted to TextField
    company = models.JSONField(null=True)
    corporateCode = models.CharField(max_length=255, null=True)
    allFoliosHaveInvoice = models.BooleanField(null=True)
    hasCityTax = models.BooleanField()
    commission = models.JSONField(null=True)
    promoCode = models.CharField(max_length=255, null=True)

    class Meta:
        managed = False
        db_table = 'apaleo.reservation_history'

class UnitGroupHistory(models.Model):
    id = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    code = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    memberCount = models.IntegerField()
    maxPersons = models.IntegerField(null=True)
    rank = models.IntegerField(null=True)
    type = models.CharField(max_length=255)
    property = models.JSONField()

    class Meta:
        managed = False
        db_table = 'apaleo.unit_group_history'

class UnitGroupsAvailabilityHistory(models.Model):
    as_of = models.DateTimeField()
    property_id = models.AutoField(primary_key=True)
    from_ = models.CharField(max_length=255)
    to = models.CharField(max_length=255)
    property = models.JSONField()
    unitGroups = models.TextField()  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'apaleo.unit_groups_availability_history'

class UnitHistory(models.Model):
    id = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    property = models.JSONField()
    unitGroup = models.JSONField(null=True)
    status = models.JSONField()
    maxPersons = models.IntegerField()
    created = models.CharField(max_length=255)
    attributes = models.TextField(null=True)  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'apaleo.unit_history'

class WebhookEvents(models.Model):
    id = models.AutoField(primary_key=True)
    topic = models.TextField(null=True)
    type = models.TextField(null=True)
    account_id = models.TextField(null=True)
    property_id = models.TextField(null=True)
    entity_id = models.TextField(null=True)
    timestamp = models.BigIntegerField(null=True)

    class Meta:
        managed = False
        db_table = 'apaleo.webhook_events'

class AvailabilityHistory(models.Model):
    web_code = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    space_subtype_id = models.CharField(max_length=255)
    days = models.TextField(null=True)  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'avirato.availability_history'

class PriceHistory(models.Model):
    web_code = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    day = models.DateField()
    space_subtypes = models.TextField(null=True)  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'avirato.price_history'

class RateHistory(models.Model):
    web_code = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    rate_id = models.CharField(max_length=255)
    rate_name = models.CharField(max_length=255)
    minimum_stay = models.IntegerField(null=True)
    maximum_stay = models.IntegerField(null=True)
    refundable = models.BooleanField(null=True)
    linked = models.BooleanField(null=True)
    linked_percentage = models.FloatField(null=True)
    master = models.BooleanField(null=True)
    space_type_id = models.CharField(max_length=255, null=True)
    mode = models.CharField(max_length=255, null=True)
    release_rate = models.IntegerField(null=True)

    class Meta:
        managed = False
        db_table = 'avirato.rate_history'

class SpaceHistory(models.Model):
    web_code = models.AutoField(primary_key=True)
    as_of = models.DateTimeField()
    space_subtype_id = models.CharField(max_length=255)
    space_type_id = models.CharField(max_length=255)
    space_subtype_name = models.CharField(max_length=255)
    hotel_id = models.CharField(max_length=255)
    maximum_capacity = models.IntegerField(null=True)
    maximum_adults = models.IntegerField(null=True)
    standard_capacity = models.IntegerField(null=True)
    spaces = models.TextField()  # ARRAY type converted to TextField

    class Meta:
        managed = False
        db_table = 'avirato.space_history'

class CompetitorPricesBak(models.Model):
    hotel_id = models.CharField(max_length=255, null=True)
    hotel_name = models.CharField(max_length=255, null=True)
    room_name = models.CharField(max_length=255, null=True)
    checkin_date = models.DateField(null=True)
    checkout_date = models.DateField(null=True)
    price = models.FloatField(null=True)
    currency = models.TextField(null=True)
    cancellation_type = models.CharField(max_length=255, null=True)
    max_persons = models.IntegerField(null=True)
    min_los = models.IntegerField(null=True)
    sold_out_message = models.CharField(max_length=255, null=True)
    request_date = models.DateField(null=True)
    is_available = models.IntegerField(null=True)
    rn = models.BigIntegerField(null=True)

    class Meta:
        managed = False
        db_table = 'booking.competitor_prices_bak'

class CompetitorPricesDev(models.Model):
    hotel_id = models.CharField(max_length=255, null=True)
    hotel_name = models.CharField(max_length=255, null=True)
    room_name = models.CharField(max_length=255, null=True)
    checkin_date = models.DateField(null=True)
    checkout_date = models.DateField(null=True)
    raw_price = models.FloatField(null=True)
    currency = models.TextField(null=True)
    cancellation_type = models.CharField(max_length=255, null=True)
    max_persons = models.IntegerField(null=True)
    min_los = models.IntegerField(null=True)
    sold_out_message = models.CharField(max_length=255, null=True)
    request_date = models.DateField(null=True)
    is_available = models.IntegerField(null=True)
    rn = models.BigIntegerField(null=True)
    num_days = models.FloatField(null=True)
    price = models.FloatField(null=True)

    class Meta:
        managed = False
        db_table = 'booking.competitor_prices_dev'

class Competitors(models.Model):
    competitor_id = models.AutoField(primary_key=True)
    competitor_name = models.CharField(max_length=255)
    booking_link = models.CharField(max_length=255)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField(null=True)
    weekly_num_days = models.IntegerField()
    region = models.CharField(max_length=100, null=True)
    bimonthly_num_days = models.IntegerField()
    quarterly_num_days = models.IntegerField()
    morning_cutoff_hour_cet = models.IntegerField(null=True)
    evening_cutoff_hour_cet = models.IntegerField(null=True)
    morning_num_days = models.IntegerField()
    evening_num_days = models.IntegerField()
    country = models.CharField(max_length=25, null=True)

    class Meta:
        managed = False
        db_table = 'booking.competitors'

class PriceHistory(models.Model):
    hotel_id = models.AutoField(primary_key=True)
    hotel_name = models.CharField(max_length=255)
    checkin_date = models.DateField()
    checkout_date = models.DateField()
    los_message = models.CharField(max_length=255, null=True)
    min_los = models.IntegerField(null=True)
    sold_out_message = models.CharField(max_length=255, null=True)
    b_id = models.IntegerField()
    b_roomtype_id = models.IntegerField()
    b_name = models.CharField(max_length=255)
    b_has_room_inventory = models.BooleanField()
    b_blocks_b_block_id = models.CharField(max_length=255)
    b_blocks_b_raw_price = models.FloatField()
    b_blocks_b_mealplan_included_name = models.CharField(max_length=255, null=True)
    b_blocks_b_cancellation_type = models.CharField(max_length=255)
    b_blocks_b_max_persons = models.IntegerField()
    b_blocks_b_price = models.CharField(max_length=255)
    b_blocks_b_rate_is_genius = models.BooleanField()
    b_blocks_b_nr_stays = models.IntegerField()
    b_blocks_b_price_breakdown_simplified_b_excluded_charges_amount = models.FloatField(null=True)
    b_blocks_b_price_breakdown_simplified_b_tax_exception = models.FloatField(null=True)
    b_blocks_b_price_breakdown_simplified_b_strikethrough_price_amo = models.FloatField(null=True)
    b_blocks_b_book_now_pay_later = models.BooleanField(null=True)
    b_blocks_b_price_breakdown_simplified_b_headline_price_amount = models.FloatField()
    b_blocks_b_price_breakdown_simplified_b_vm_products = models.TextField(null=True)  # ARRAY type converted to TextField
    b_blocks_b_price_breakdown_simplified_b_reward_credit_amount = models.FloatField(null=True)
    b_blocks_b_stay_prices_b_price = models.CharField(max_length=255)
    b_blocks_b_stay_prices_b_local_price = models.FloatField()
    b_blocks_b_stay_prices_b_raw_price = models.FloatField(null=True)
    b_blocks_b_stay_prices_b_stays = models.IntegerField()
    b_blocks_b_stay_prices_b_price_per_night = models.CharField(max_length=255)
    as_of = models.DateTimeField()
    region = models.CharField(max_length=100, null=True)
    taking_reservations = models.BooleanField(null=True)

    class Meta:
        managed = False
        db_table = 'booking.price_history'

class PriceHistoryArchive(models.Model):
    hotel_id = models.AutoField(primary_key=True)
    hotel_name = models.CharField(max_length=255)
    checkin_date = models.DateField()
    checkout_date = models.DateField()
    los_message = models.CharField(max_length=255, null=True)
    min_los = models.IntegerField(null=True)
    sold_out_message = models.CharField(max_length=255, null=True)
    b_roomtype_id = models.IntegerField()
    b_name = models.CharField(max_length=255)
    b_has_room_inventory = models.BooleanField()
    b_blocks_b_price = models.CharField(max_length=255)
    region = models.CharField(max_length=100, null=True)
    as_of = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'booking.price_history_archive'

class PriceHistoryDev(models.Model):
    hotel_id = models.AutoField(primary_key=True)
    hotel_name = models.CharField(max_length=255)
    checkin_date = models.DateField()
    checkout_date = models.DateField()
    los_message = models.CharField(max_length=255, null=True)
    min_los = models.IntegerField(null=True)
    sold_out_message = models.CharField(max_length=255, null=True)
    b_id = models.IntegerField()
    b_roomtype_id = models.IntegerField()
    b_name = models.CharField(max_length=255)
    b_has_room_inventory = models.BooleanField()
    b_blocks_b_block_id = models.CharField(max_length=255)
    b_blocks_b_raw_price = models.FloatField()
    b_blocks_b_mealplan_included_name = models.CharField(max_length=255, null=True)
    b_blocks_b_cancellation_type = models.CharField(max_length=255)
    b_blocks_b_max_persons = models.IntegerField()
    b_blocks_b_price = models.CharField(max_length=255)
    b_blocks_b_rate_is_genius = models.BooleanField()
    b_blocks_b_nr_stays = models.IntegerField()
    b_blocks_b_price_breakdown_simplified_b_excluded_charges_amount = models.FloatField(null=True)
    b_blocks_b_price_breakdown_simplified_b_tax_exception = models.FloatField(null=True)
    b_blocks_b_price_breakdown_simplified_b_strikethrough_price_amo = models.FloatField(null=True)
    b_blocks_b_book_now_pay_later = models.BooleanField(null=True)
    b_blocks_b_price_breakdown_simplified_b_headline_price_amount = models.FloatField()
    b_blocks_b_price_breakdown_simplified_b_vm_products = models.TextField(null=True)  # ARRAY type converted to TextField
    b_blocks_b_price_breakdown_simplified_b_reward_credit_amount = models.FloatField(null=True)
    b_blocks_b_stay_prices_b_price = models.CharField(max_length=255)
    b_blocks_b_stay_prices_b_local_price = models.FloatField()
    b_blocks_b_stay_prices_b_raw_price = models.FloatField(null=True)
    b_blocks_b_stay_prices_b_stays = models.IntegerField()
    b_blocks_b_stay_prices_b_price_per_night = models.CharField(max_length=255)
    as_of = models.DateTimeField()
    region = models.CharField(max_length=100, null=True)
    taking_reservations = models.BooleanField(null=True)

    class Meta:
        managed = False
        db_table = 'booking.price_history_dev'

class DpDynamicIncrementsV1(models.Model):
    property_id = models.AutoField(primary_key=True)
    var_name = models.CharField(max_length=255)
    var_from = models.FloatField()
    var_to = models.FloatField()
    increment_type = models.CharField(max_length=255)
    increment_value = models.FloatField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_dynamic_increments_v1'

class DpDynamicIncrementsV2(models.Model):
    property_id = models.AutoField(primary_key=True)
    occupancy_level = models.FloatField()
    lead_time_days = models.IntegerField()
    increment_type = models.CharField(max_length=255)
    increment_value = models.FloatField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_dynamic_increments_v2'

class DpEvents(models.Model):
    property_id = models.AutoField(primary_key=True)
    valid_from = models.DateField()
    valid_until = models.DateField()
    event_name = models.CharField(max_length=255)
    increment_type = models.CharField(max_length=255)
    increment_value = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_events'

class DpGeneralSettings(models.Model):
    property_id = models.AutoField(primary_key=True)
    base_rate_code = models.CharField(max_length=255, null=True)
    is_base_in_pms = models.BooleanField(null=True)
    min_competitors = models.IntegerField(null=True)
    comp_price_calculation = models.CharField(max_length=255, null=True)
    competitor_excluded = models.TextField(null=True)
    msp_include_events_weekend_increments = models.BooleanField(null=True)
    future_days_to_price = models.IntegerField(null=True)
    pricing_status = models.CharField(max_length=255, null=True)
    los_status = models.CharField(max_length=255, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_general_settings'

class DpLosReduction(models.Model):
    property_id = models.AutoField(primary_key=True)
    lead_time_days = models.IntegerField()
    occupancy_level = models.CharField(max_length=255)
    los_value = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_los_reduction'

class DpLosSetup(models.Model):
    property_id = models.AutoField(primary_key=True)
    valid_from = models.DateField()
    num_competitors = models.IntegerField()
    los_aggregation = models.CharField(max_length=255)
    valid_until = models.DateField()
    day_of_week = models.CharField(max_length=255)
    los_value = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_los_setup'

class DpMinimumSellingPrice(models.Model):
    property_id = models.AutoField(primary_key=True)
    valid_from = models.DateField()
    valid_until = models.DateField()
    manual_alternative_price = models.IntegerField()
    msp = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_minimum_selling_price'

class DpOfferIncrements(models.Model):
    property_id = models.AutoField(primary_key=True)
    offer_name = models.CharField(max_length=255, null=True)
    valid_from = models.DateField()
    valid_until = models.DateField()
    applied_from_days = models.IntegerField()
    applied_until_days = models.IntegerField()
    increment_type = models.CharField(max_length=255)
    increment_value = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_offer_increments'

class DpPropertyCompetitor(models.Model):
    property_id = models.AutoField(primary_key=True)
    competitor_id = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_property_competitor'

class DpRoomRates(models.Model):
    property_id = models.AutoField(primary_key=True)
    rate_id = models.CharField(max_length=255)
    base_rate_id = models.CharField(max_length=255)
    increment_type = models.CharField(max_length=255)
    increment_value = models.IntegerField(null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_room_rates'

class DpWeekdayIncrements(models.Model):
    property_id = models.AutoField(primary_key=True)
    weekday = models.CharField(max_length=255)
    increment_type = models.CharField(max_length=255)
    increment_value = models.IntegerField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'dynamic.dp_weekday_increments'

class Property(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    pms_name = models.CharField(max_length=255)
    pms_hotel_id = models.CharField(max_length=255)
    spreadsheet_id = models.CharField(max_length=255)
    booking_hotel_url = models.TextField(null=True)
    city = models.CharField(max_length=255, null=True)
    country = models.CharField(max_length=255, null=True)
    rm_email = models.CharField(max_length=255, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    is_active = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'dynamic.property'

class AvailRatesHistory(models.Model):
    hotel_code = models.AutoField(primary_key=True)
    room_id = models.CharField(max_length=255)
    inventory = models.CharField(max_length=255, null=True)
    dates = models.TextField(null=True)  # ARRAY type converted to TextField
    as_of = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'mrplan.avail_rates_history'

class BookingHistory(models.Model):
    channel_id = models.CharField(max_length=255)
    booking = models.JSONField()
    as_of = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'mrplan.booking_history'

class BookingsApiHistory(models.Model):
    hotel_code = models.AutoField(primary_key=True)
    booking_id = models.CharField(max_length=255)
    created_at = models.CharField(max_length=255, null=True)
    updated_at = models.CharField(max_length=255)
    total_price = models.CharField(max_length=255, null=True)
    state = models.CharField(max_length=255, null=True)
    rooms = models.TextField(null=True)  # ARRAY type converted to TextField
    customer = models.JSONField(null=True)
    checksum = models.CharField(max_length=255, null=True)
    as_of = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'mrplan.bookings_api_history'

class PropertiesHistory(models.Model):
    hotel_code = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    as_of = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'mrplan.properties_history'

class RoomsAndRatesHistory(models.Model):
    hotel_code = models.AutoField(primary_key=True)
    room_id = models.CharField(max_length=255)
    name = models.CharField(max_length=255, null=True)
    inventory = models.CharField(max_length=255, null=True)
    max_occupancy = models.IntegerField(null=True)
    rates = models.TextField(null=True)  # ARRAY type converted to TextField
    as_of = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'mrplan.rooms_and_rates_history'
