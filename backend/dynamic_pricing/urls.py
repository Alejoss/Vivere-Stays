from django.urls import path
from .views import (
    PropertyManagementSystemListView,
    PropertyCreateView,
    PropertyPMSUpdateView,
    PropertyDetailView,
    PropertyListView,
    MinimumSellingPriceView,
    PropertyMSPView,
    PriceHistoryView,
    MSPPriceHistoryView,
    CompetitorAveragePriceHistoryView,
    OverwritePriceView,
    OverwritePriceRangeView,
    FetchCompetitorsView,
    NearbyHotelsView,
    BulkCompetitorCandidateCreateView,
    DpGeneralSettingsUpdateView,
    CompetitorCandidatesListView,
    PropertyCompetitorsListView,
    property_msp_for_date,  # <-- add import
    lowest_competitor_prices,  # <-- new import
    competitor_prices_weekly_chart,  # <-- new import
    competitor_prices_for_date,  # <-- new import
    price_history_for_date_range,  # <-- new import
    CompetitorCandidateUpdateView,
    PropertyCompetitorUpdateView,
    CompetitorCandidateDeleteView,
    PropertyCompetitorDeleteView,
    OfferIncrementsListView,
    OfferIncrementsCreateView,
    OfferIncrementsUpdateView,
    OfferIncrementsDeleteView,
    DynamicIncrementsV2ListView,
    DynamicIncrementsV2CreateView,
    DynamicIncrementsV2UpdateView,
    DynamicIncrementsV2BulkUpdateView,
    DynamicIncrementsV2DeleteView,
    LosReductionListView,
    LosReductionCreateView,
    LosReductionUpdateView,
    LosReductionDeleteView,
    LosSetupListView,
    LosSetupCreateView,
    LosSetupUpdateView,
    LosSetupDeleteView,
    PropertyAvailableRatesView,
    PropertyAvailableRatesUpdateView,
    InitializePropertyDefaultsView,
    CheckMSPStatusView,
    # Competitor views moved from booking app
    CompetitorCreateView,
    CompetitorDetailView,
    CompetitorListView,
    PropertyCompetitorsView,
    BulkCompetitorCreateView,  # Used by booking/urls.py
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
    
    # General Settings endpoints
    path('properties/<str:property_id>/general-settings/', DpGeneralSettingsUpdateView.as_view(), name='general-settings-update'),
    
    # Competitor endpoints
    path('properties/<str:property_id>/competitor-candidates/', CompetitorCandidatesListView.as_view(), name='competitor-candidates'),
    path('properties/<str:property_id>/competitor-candidates/<str:candidate_id>/', CompetitorCandidateUpdateView.as_view(), name='competitor-candidate-update'),
    path('properties/<str:property_id>/competitor-candidates/<str:candidate_id>/delete/', CompetitorCandidateDeleteView.as_view(), name='competitor-candidate-delete'),
    # More specific competitor patterns first
    path('properties/<str:property_id>/competitors/date/', competitor_prices_for_date, name='competitor-prices-for-date'),
    path('properties/<str:property_id>/competitors/weekly-chart/', competitor_prices_weekly_chart, name='competitor-prices-weekly-chart'),
    # General competitor patterns after specific ones
    path('properties/<str:property_id>/competitors/', PropertyCompetitorsListView.as_view(), name='property-competitors'),
    path('properties/<str:property_id>/competitors/<str:competitor_id>/', PropertyCompetitorUpdateView.as_view(), name='property-competitor-update'),
    path('properties/<str:property_id>/competitors/<str:competitor_id>/delete/', PropertyCompetitorDeleteView.as_view(), name='property-competitor-delete'),
    path('competitors/fetch/', FetchCompetitorsView.as_view(), name='fetch-competitors'),
    path('competitors/nearby/', NearbyHotelsView.as_view(), name='nearby-hotels'),
    path('competitors/candidates/bulk-create/', BulkCompetitorCandidateCreateView.as_view(), name='bulk-create-competitor-candidates'),
    path('properties/<str:property_id>/competitors/candidates/bulk-create/', BulkCompetitorCandidateCreateView.as_view(), name='bulk-create-competitor-candidates-for-property'),
    
    # Competitor endpoints moved from booking app
    path('competitors/', CompetitorListView.as_view(), name='competitor-list'),
    path('competitors/create/', CompetitorCreateView.as_view(), name='competitor-create'),
    # Note: bulk-create endpoint is in booking/urls.py for backward compatibility with frontend
    path('competitors/<str:competitor_id>/', CompetitorDetailView.as_view(), name='competitor-detail'),
    path('properties/<str:property_id>/competitors-list/', PropertyCompetitorsView.as_view(), name='property-competitors-list'),
    
    # Minimum Selling Price endpoints
    path('msp/', MinimumSellingPriceView.as_view(), name='msp'),
    path('properties/<str:property_id>/msp/', PropertyMSPView.as_view(), name='property-msp'),
    path('properties/<str:property_id>/msp/<int:msp_id>/', PropertyMSPView.as_view(), name='property-msp-delete'),
    
    # Price History endpoints
    path('properties/<str:property_id>/price-history/', PriceHistoryView.as_view(), name='price-history'),
    path('properties/<str:property_id>/msp-price-history/', MSPPriceHistoryView.as_view(), name='msp-price-history'),
    path('properties/<str:property_id>/competitor-average-price-history/', CompetitorAveragePriceHistoryView.as_view(), name='competitor-average-price-history'),
    path('properties/<str:property_id>/price-history/<str:checkin_date>/overwrite/', OverwritePriceView.as_view(), name='overwrite-price'),
    path('properties/<str:property_id>/price-history/overwrite-range/', OverwritePriceRangeView.as_view(), name='overwrite-price-range'),
    
    # Date range price history
    path('properties/<str:property_id>/price-history/range/', price_history_for_date_range, name='price-history-range'),
    
    # MSP for specific date
    path('properties/<str:property_id>/msp/date/', property_msp_for_date, name='property-msp-date'),
    
    # Competitor price endpoints
    path('competitors/lowest-prices/', lowest_competitor_prices, name='lowest-competitor-prices'),
    
    # Special Offers (Offer Increments) endpoints
    path('properties/<str:property_id>/special-offers/', OfferIncrementsListView.as_view(), name='special-offers-list'),
    path('properties/<str:property_id>/special-offers/create/', OfferIncrementsCreateView.as_view(), name='special-offers-create'),
    path('properties/<str:property_id>/special-offers/<int:offer_id>/', OfferIncrementsUpdateView.as_view(), name='special-offers-update'),
    path('properties/<str:property_id>/special-offers/<int:offer_id>/delete/', OfferIncrementsDeleteView.as_view(), name='special-offers-delete'),
    
    # Dynamic Setup (Dynamic Increments V2) endpoints
    path('properties/<str:property_id>/dynamic-setup/', DynamicIncrementsV2ListView.as_view(), name='dynamic-setup-list'),
    path('properties/<str:property_id>/dynamic-setup/create/', DynamicIncrementsV2CreateView.as_view(), name='dynamic-setup-create'),
    path('properties/<str:property_id>/dynamic-setup/bulk-update/', DynamicIncrementsV2BulkUpdateView.as_view(), name='dynamic-setup-bulk-update'),
    path('properties/<str:property_id>/dynamic-setup/<int:rule_id>/', DynamicIncrementsV2UpdateView.as_view(), name='dynamic-setup-update'),
    path('properties/<str:property_id>/dynamic-setup/<int:rule_id>/delete/', DynamicIncrementsV2DeleteView.as_view(), name='dynamic-setup-delete'),
    
    # LOS Reduction Rules endpoints
    path('properties/<str:property_id>/los-reduction/', LosReductionListView.as_view(), name='los-reduction-list'),
    path('properties/<str:property_id>/los-reduction/create/', LosReductionCreateView.as_view(), name='los-reduction-create'),
    path('properties/<str:property_id>/los-reduction/<int:reduction_id>/', LosReductionUpdateView.as_view(), name='los-reduction-update'),
    path('properties/<str:property_id>/los-reduction/<int:reduction_id>/delete/', LosReductionDeleteView.as_view(), name='los-reduction-delete'),
    
    # LOS Setup Rules endpoints
    path('properties/<str:property_id>/los-setup/', LosSetupListView.as_view(), name='los-setup-list'),
    path('properties/<str:property_id>/los-setup/create/', LosSetupCreateView.as_view(), name='los-setup-create'),
    path('properties/<str:property_id>/los-setup/<int:setup_id>/', LosSetupUpdateView.as_view(), name='los-setup-update'),
    path('properties/<str:property_id>/los-setup/<int:setup_id>/delete/', LosSetupDeleteView.as_view(), name='los-setup-delete'),
    
    # Available Rates (Unified Rooms and Rates) endpoints
    path('properties/<str:property_id>/available-rates/', PropertyAvailableRatesView.as_view(), name='available-rates'),
    path('properties/<str:property_id>/available-rates/update/', PropertyAvailableRatesUpdateView.as_view(), name='available-rates-update'),
    
    # Initialize property defaults (called during onboarding completion)
    path('properties/<str:property_id>/initialize-defaults/', InitializePropertyDefaultsView.as_view(), name='initialize-defaults'),
    
    # MSP Status Check (triggers notifications if MSP is missing)
    path('properties/<str:property_id>/check-msp/', CheckMSPStatusView.as_view(), name='check-msp-status'),
    path('check-msp/', CheckMSPStatusView.as_view(), name='check-msp-status-all'),
] 