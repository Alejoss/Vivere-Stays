from django.contrib import admin
from profiles.models import Profile, PMSIntegrationRequirement, Payment, SupportTicket


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'timezone', 'properties_count', 'profile_picture')
    list_filter = ('timezone',)
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('properties_count',)

    def properties_count(self, obj):
        return obj.properties_count
    properties_count.short_description = 'Properties Count'


@admin.register(PMSIntegrationRequirement)
class PMSIntegrationRequirementAdmin(admin.ModelAdmin):
    list_display = ('id', 'profile', 'property_obj', 'pms_system', 'custom_pms_name', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('profile__user__username', 'profile__user__email', 'property_obj__name', 'custom_pms_name')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'issue_type', 'status', 'created_at')
    list_filter = ('issue_type', 'status', 'created_at')
    search_fields = ('user__username', 'user__email', 'title', 'description')
    readonly_fields = ('created_at', 'updated_at', 'resolved_at')
    ordering = ('-created_at',)
    list_per_page = 25
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'title', 'issue_type', 'description')
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Screenshot', {
            'fields': ('screenshot',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'resolved_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


admin.site.register(Payment)