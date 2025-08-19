from django.urls import path
from .views import (
    PropertyCreateView, 
    PropertyDetailView, 
    PropertyListView, 
    PropertyPMSUpdateView,
    PropertyManagementSystemListView,
    MinimumSellingPriceView,
    PriceHistoryView,
    OverwritePriceView,
    property_msp_for_date,  # <-- add import
)

app_name = 'dynamic_pricing'

urlpatterns = [
    # Property Management System endpoints
    path('pms/', PropertyManagementSystemListView.as_view(), name='pms-list'),
    
    # Property endpoints
    path('properties/', PropertyListView.as_view(), name='property-list'),
    path('properties/create/', PropertyCreateView.as_view(), name='property-create'),
    path('properties/<str:property_id>/', PropertyDetailView.as_view(), name='property-detail'),
    path('properties/<str:property_id>/pms/', PropertyPMSUpdateView.as_view(), name='property-pms-update'),
    
    # Minimum Selling Price endpoints
    path('msp/', MinimumSellingPriceView.as_view(), name='msp-create'),
    path('properties/<str:property_id>/msp-for-date/', property_msp_for_date, name='property-msp-for-date'),
    
    # Price History endpoints
    path('properties/<str:property_id>/price-history/', PriceHistoryView.as_view(), name='price-history'),
    path('properties/<str:property_id>/price-history/<str:checkin_date>/overwrite/', OverwritePriceView.as_view(), name='overwrite-price'),
] 