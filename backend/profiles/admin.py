from django.contrib import admin
from profiles.models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'timezone', 'properties_count', 'profile_picture')
    list_filter = ('timezone',)
    search_fields = ('user__username', 'user__email')
    readonly_fields = ('properties_count',)

    def properties_count(self, obj):
        return obj.properties_count
    properties_count.short_description = 'Properties Count'
