from django.contrib import admin
from .models import (
    Property, PropertyManagementSystem, DpGeneralSettings, DpPropertyCompetitor,
    DpDynamicIncrementsV2, DpOfferIncrements, DpLosSetup, DpLosReduction,
    DpMinimumSellingPrice, DpRoomRates, DpPriceChangeHistory,
    UnifiedRoomsAndRates
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
    list_display = ('property_id', 'min_competitors', 'comp_price_calculation', 'pricing_status', 'los_status', 'los_num_competitors', 'los_aggregation')
    list_filter = ('pricing_status', 'los_status', 'min_competitors', 'los_num_competitors', 'los_aggregation', 'created_at')
    search_fields = ('property_id__name',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DpPropertyCompetitor)
class DpPropertyCompetitorAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'competitor_id', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('property_id__name', 'competitor_id')
    readonly_fields = ('created_at', 'updated_at')


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
    list_display = ('property_id', 'valid_from', 'valid_until', 'day_of_week', 'los_value')
    list_filter = ('day_of_week', 'valid_from', 'created_at')
    search_fields = ('property_id__name',)
    ordering = ('property_id', 'valid_from', 'day_of_week')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(DpLosReduction)
class DpLosReductionAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'lead_time_category', 'occupancy_category', 'los_value')
    list_filter = ('lead_time_category', 'occupancy_category', 'created_at')
    search_fields = ('property_id__name',)
    ordering = ('property_id', 'lead_time_category', 'occupancy_category')


@admin.register(DpMinimumSellingPrice)
class DpMinimumSellingPriceAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'valid_from', 'valid_until', 'msp', 'period_title')
    list_filter = ('valid_from', 'valid_until')
    search_fields = ('property_id__name', 'period_title')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'valid_from'




@admin.register(DpRoomRates)
class DpRoomRatesAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'rate_id', 'is_base_rate', 'increment_type', 'increment_value')
    list_filter = ('increment_type', 'is_base_rate')
    search_fields = ('property_id__name', 'rate_id')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('property_id', 'rate_id')


@admin.register(UnifiedRoomsAndRates)
class UnifiedRoomsAndRatesAdmin(admin.ModelAdmin):
    list_display = ('property_id', 'pms_source', 'room_id', 'rate_id', 'room_name', 'rate_name', 'rate_category', 'last_updated')
    list_filter = ('pms_source', 'rate_category', 'last_updated')
    search_fields = ('property_id__name', 'room_id', 'rate_id', 'room_name', 'rate_name')
    readonly_fields = ('last_updated',)
    ordering = ('property_id', 'pms_source', 'room_id', 'rate_id')
    fieldsets = (
        ('Property & PMS', {'fields': ('property_id', 'pms_source', 'pms_hotel_id')}),
        ('Room Information', {'fields': ('room_id', 'room_name', 'room_description')}),
        ('Rate Information', {'fields': ('rate_id', 'rate_name', 'rate_description', 'rate_category')}),
        ('Metadata', {'fields': ('last_updated',), 'classes': ('collapse',)}),
    )


# Register the models
admin.site.register(DpDynamicIncrementsV2, DpDynamicIncrementsV2Admin)
admin.site.register(DpPriceChangeHistory)
