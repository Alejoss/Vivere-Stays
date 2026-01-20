# Competitor bulk-create endpoint - uses dynamic_pricing view
# This endpoint is still used by the frontend, so we route it here

from django.urls import path
from dynamic_pricing.views import BulkCompetitorCreateView

app_name = 'booking'

urlpatterns = [
    # Bulk competitor creation endpoint (uses dynamic_pricing view)
    path('competitors/bulk-create/', BulkCompetitorCreateView.as_view(), name='competitor-bulk-create'),
]