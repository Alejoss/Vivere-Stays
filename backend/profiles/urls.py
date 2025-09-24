from django.urls import path
from .views import (
    CheckAuth, UserPropertiesView, PropertyAssociationView, LoginView, 
    GetCsrfToken, ProfileView, LogoutView, CheckUserExistsView, RegisterView, 
    RefreshTokenView, GoogleLoginView, PMSIntegrationRequirementView,
    SendVerificationEmailView, VerifyEmailCodeView,
    OnboardingProgressView, TestEmailView, ChangePasswordView, stripe_webhook, CreateCheckoutSession,
    SupportTicketView
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
    
    # Email verification endpoints
    path('send-verification-email/', SendVerificationEmailView.as_view(), name='send-verification-email'),
    path('verify-email-code/', VerifyEmailCodeView.as_view(), name='verify-email-code'),
    path('resend-verification-email/', SendVerificationEmailView.as_view(), name='resend-verification-email'),
    path('test-email/', TestEmailView.as_view(), name='test-email'),
    
    # Onboarding progress endpoints
    path('onboarding-progress/', OnboardingProgressView.as_view(), name='onboarding-progress'),
    
    # Password change endpoint
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    
    # Support ticket endpoints
    path('support-tickets/', SupportTicketView.as_view(), name='support-tickets'),

    path("create-checkout-session/",CreateCheckoutSession.as_view(), name="create-checkout-session"),
    path('webhook/', stripe_webhook, name='stripe_webhook'),
]
