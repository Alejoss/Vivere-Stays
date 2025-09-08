from django.contrib import admin
from .models import (
    Property, PropertyManagementSystem, DpGeneralSettings, DpPropertyCompetitor, DpDynamicIncrementsV1,
    DpDynamicIncrementsV2, DpOfferIncrements, DpLosSetup, DpLosReduction,
    DpMinimumSellingPrice, DpWeekdayIncrements, DpEvents, DpRoomRates, DpPriceChangeHistory
)


@admin.register(PropertyManagementSystem)
class PropertyManagementSystemAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'created_at')
    search_fields = ('name',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'pms_name', 'city', 'country', 'is_active', 'created_at')
    list_filter = ('pms_name', 'is_active', 'created_at')
    search_fields = ('name', 'city', 'country')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('name',)


@admin.register(DpGeneralSettings)
class DpGeneralSettingsAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'base_rate_code', 'min_competitors', 'comp_price_calculation', 'pricing_status', 'los_status')
    list_filter = ('pricing_status', 'los_status', 'min_competitors', 'created_at')
    search_fields = ('property_id__name', 'base_rate_code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DpPropertyCompetitor)
class DpPropertyCompetitorAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'competitor_id', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('property_id__name', 'competitor_id')
    readonly_fields = ('created_at', 'updated_at')


class DpDynamicIncrementsV1Admin(admin.ModelAdmin):
    list_display = ('property_id', 'var_name', 'var_from', 'var_to', 'increment_type', 'increment_value')
    list_filter = ('var_name', 'increment_type', 'created_at')
    search_fields = ('property_id__name',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('property_id', 'var_name', 'var_from')


class DpDynamicIncrementsV2Admin(admin.ModelAdmin):
    list_display = ('property_id', 'occupancy_category', 'lead_time_category', 'increment_type', 'increment_value', 'user')
    list_filter = ('increment_type', 'occupancy_category', 'lead_time_category', 'created_at')
    search_fields = ('property_id__name', 'user__username')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('property_id', 'occupancy_category', 'lead_time_category')
    fieldsets = (
        ('Property & User', {'fields': ('property_id', 'user')}),
        ('Categories', {'fields': ('occupancy_category', 'lead_time_category')}),
        ('Increment Settings', {'fields': ('increment_type', 'increment_value')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(DpOfferIncrements)
class DpOfferIncrementsAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'offer_name', 'valid_from', 'valid_until', 'increment_type', 'increment_value')
    list_filter = ('increment_type', 'valid_from', 'valid_until')
    search_fields = ('property_id__name', 'offer_name')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'valid_from'


@admin.register(DpLosSetup)
class DpLosSetupAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'valid_from', 'valid_until', 'day_of_week', 'los_value', 'num_competitors', 'los_aggregation')
    list_filter = ('day_of_week', 'valid_from', 'num_competitors', 'created_at')
    search_fields = ('property_id__name',)
    ordering = ('property_id', 'valid_from', 'day_of_week')


@admin.register(DpLosReduction)
class DpLosReductionAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'lead_time_days', 'occupancy_level', 'los_value')
    list_filter = ('lead_time_days', 'occupancy_level', 'created_at')
    search_fields = ('property_id__name',)
    ordering = ('property_id', 'lead_time_days', 'occupancy_level')


@admin.register(DpMinimumSellingPrice)
class DpMinimumSellingPriceAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'valid_from', 'valid_until', 'msp', 'manual_alternative_price')
    list_filter = ('valid_from', 'valid_until')
    search_fields = ('property_id__name',)
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'valid_from'


@admin.register(DpWeekdayIncrements)
class DpWeekdayIncrementsAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'weekday', 'increment_type', 'increment_value')
    list_filter = ('weekday', 'increment_type')
    search_fields = ('property_id__name',)
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('property_id', 'weekday')


@admin.register(DpEvents)
class DpEventsAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'event_name', 'valid_from', 'valid_until', 'increment_type', 'increment_value')
    list_filter = ('increment_type', 'valid_from', 'valid_until')
    search_fields = ('property_id__name', 'event_name')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'valid_from'


@admin.register(DpRoomRates)
class DpRoomRatesAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'rate_id', 'base_rate_id', 'increment_type', 'increment_value')
    list_filter = ('increment_type',)
    search_fields = ('property_id__name', 'rate_id', 'base_rate_id')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('property_id', 'rate_id')


# Register the models
admin.site.register(DpDynamicIncrementsV1, DpDynamicIncrementsV1Admin)
admin.site.register(DpDynamicIncrementsV2, DpDynamicIncrementsV2Admin)
admin.site.register(DpPriceChangeHistory)
