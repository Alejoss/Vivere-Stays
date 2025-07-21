from django.urls import path, include
from django.contrib.auth import views as auth_views
from profiles import views

app_name = 'profiles'

urlpatterns = [
    path('check_auth/', views.CheckAuth.as_view(), name='check_auth'),
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('activate_account/', views.activate_account, name="activate_account"),
    path('set_jwt_token/', views.set_jwt_token, name="set_jwt_token"),
    path('get_csrf_token/', views.GetCsrfToken.as_view(), name='get_csrf_token'),
    path('refresh_token/', views.RefreshTokenView.as_view(), name='refresh_token'),
    path('properties/', views.UserPropertiesView.as_view(), name='user_properties'),
    path('properties/associate/', views.PropertyAssociationView.as_view(), name='property_association'),
]
