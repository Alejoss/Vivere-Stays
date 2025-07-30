from django.urls import path
from .views import (
    CheckAuth, UserPropertiesView, PropertyAssociationView, LoginView, 
    GetCsrfToken, ProfileView, LogoutView, CheckUserExistsView, RegisterView, 
    RefreshTokenView, GoogleLoginView, PMSIntegrationRequirementView
)

urlpatterns = [
    path('check-auth/', CheckAuth.as_view(), name='check-auth'),
    path('user-properties/', UserPropertiesView.as_view(), name='user-properties'),
    path('property-association/', PropertyAssociationView.as_view(), name='property-association'),
    path('login/', LoginView.as_view(), name='login'),
    path('get-csrf-token/', GetCsrfToken.as_view(), name='get-csrf-token'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('check_user_exists/', CheckUserExistsView.as_view(), name='check-user-exists'),
    path('register/', RegisterView.as_view(), name='register'),
    path('refresh-token/', RefreshTokenView.as_view(), name='refresh-token'),
    path('google-login/', GoogleLoginView.as_view(), name='google-login'),
    path('pms-integration/', PMSIntegrationRequirementView.as_view(), name='pms-integration'),
]
