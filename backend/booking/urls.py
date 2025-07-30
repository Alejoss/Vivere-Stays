from django.urls import path
from .views import (
    CompetitorCreateView,
    CompetitorDetailView,
    CompetitorListView,
    PropertyCompetitorsView,
    BulkCompetitorCreateView
)

app_name = 'booking'

urlpatterns = [
    # Competitor endpoints
    path('competitors/', CompetitorListView.as_view(), name='competitor-list'),
    path('competitors/create/', CompetitorCreateView.as_view(), name='competitor-create'),
    path('competitors/bulk-create/', BulkCompetitorCreateView.as_view(), name='competitor-bulk-create'),
    path('competitors/<str:competitor_id>/', CompetitorDetailView.as_view(), name='competitor-detail'),
    
    # Property-specific competitor endpoints
    path('properties/<str:property_id>/competitors/', PropertyCompetitorsView.as_view(), name='property-competitors'),
] 