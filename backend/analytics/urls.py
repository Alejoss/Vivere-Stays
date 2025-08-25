from django.urls import path
from .views import SummaryView, PickupView, OccupancyView

app_name = 'analytics'

urlpatterns = [
    path('summary/', SummaryView.as_view(), name='summary'),
    path('pickup/', PickupView.as_view(), name='pickup'),
    path('occupancy/', OccupancyView.as_view(), name='occupancy'),
]
