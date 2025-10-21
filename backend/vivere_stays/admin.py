from django.contrib import admin
from django.conf import settings

# Configure admin site
admin.site.site_header = getattr(settings, 'ADMIN_SITE_HEADER', 'Vivere Administration')
admin.site.site_title = getattr(settings, 'ADMIN_SITE_TITLE', 'Vivere Administration')
admin.site.index_title = getattr(settings, 'ADMIN_INDEX_TITLE', 'Vivere Administration')
