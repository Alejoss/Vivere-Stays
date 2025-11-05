import logging

from rest_framework_simplejwt.tokens import RefreshToken, AccessToken
from vivere_stays.logging_utils import get_logger, log_operation, log_business_event, LogLevel, LoggerNames

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.contrib.auth.models import User
from django.contrib.auth import login
from django.http import HttpResponse, JsonResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.contrib.auth import authenticate, login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.conf import settings
from django.core.cache import cache
from datetime import timedelta
from django.core.files.base import ContentFile
import requests
from datetime import datetime
import jwt
import json

from profiles.serializers import UserSerializer, ProfileSerializer, UserRegistrationSerializer, PropertyAssociationSerializer, PMSIntegrationRequirementSerializer, SupportTicketSerializer, NotificationSerializer, NotificationCreateSerializer, NotificationUpdateSerializer, InvoiceSerializer
from profiles.models import Profile, PMSIntegrationRequirement, Payment, SupportTicket, Notification, Invoice
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.provider import GoogleProvider
from allauth.socialaccount.models import SocialApp, SocialToken
from allauth.socialaccount.models import SocialAccount
from rest_framework.decorators import api_view, permission_classes
import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from stripe import Webhook
import stripe

stripe.api_key = settings.STRIPE_SECRET_KEY
endpoint_secret = settings.STRIPE_WEBHOOK_SECRET 
logger = get_logger(LoggerNames.PROFILES)

class CreateCheckoutSession(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        log_business_event(
            logger, "checkout_session_request",
            f"Stripe checkout session request received from user {request.user.username}",
            request, request.user,
            plan_type=request.data.get("planType"),
            number_of_rooms=request.data.get("numberOfRooms"),
            calculated_price=request.data.get("calculatedPrice")
        )
        
        user = request.user
        data = request.data

        plan_type = data.get("planType")
        number_of_rooms = data.get("numberOfRooms")
        calculated_price = data.get("calculatedPrice")

        log_operation(
            logger, LogLevel.DEBUG,
            f"Processing checkout session for plan: {plan_type}",
            "checkout_session_processing",
            request, request.user,
            plan_type=plan_type,
            number_of_rooms=number_of_rooms,
            calculated_price=calculated_price
        )

        unit_amount = int(calculated_price * 100)
        
        log_operation(
            logger, LogLevel.DEBUG,
            f"Unit amount calculated: {unit_amount} cents",
            "unit_amount_calculated",
            request, request.user,
            unit_amount=unit_amount,
            calculated_price=calculated_price
        )

        try:
            log_operation(
                logger, LogLevel.INFO,
                f"Creating Stripe price for {plan_type} plan",
                "stripe_price_creation",
                request, request.user,
                plan_type=plan_type,
                unit_amount=unit_amount
            )
            
            price = stripe.Price.create(
                unit_amount=unit_amount,
                currency="usd",
                recurring={"interval": "month"},
                product_data={"name": f"{plan_type.title()} Plan"},
            )
            
            log_operation(
                logger, LogLevel.INFO,
                f"Stripe price created successfully",
                "stripe_price_created",
                request, request.user,
                price_id=price.id,
                plan_type=plan_type
            )

            log_operation(
                logger, LogLevel.INFO,
                f"Creating Stripe checkout session",
                "stripe_session_creation",
                request, request.user,
                price_id=price.id,
                plan_type=plan_type
            )
            
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[{"price": price.id, "quantity": 1}],
                mode="subscription",
                success_url=f"{settings.FRONTEND_URL}/add-competitor/",
                cancel_url=f"{settings.FRONTEND_URL}/select-plan/",
                metadata={
                    "user_id": str(user.id),
                    "plan_type": plan_type,
                    "number_of_rooms": str(number_of_rooms),
                },
            )
            
            log_business_event(
                logger, "checkout_session_created",
                f"Stripe checkout session created successfully for user {request.user.username}",
                request, request.user,
                session_id=session.id,
                plan_type=plan_type,
                number_of_rooms=number_of_rooms,
                price_id=price.id
            )

            return Response({"sessionId": session.id})
            
        except Exception as e:
            log_operation(
                logger, LogLevel.ERROR,
                f"Error creating Stripe session: {str(e)}",
                "stripe_session_error",
                request, request.user,
                error=str(e),
                error_type=type(e).__name__,
                plan_type=plan_type
            )
            return Response(
                {"error": f"Failed to create checkout session: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
 
@csrf_exempt
def stripe_webhook(request):
    log_operation(
        logger, LogLevel.INFO,
        f"Stripe webhook received",
        "stripe_webhook_received",
        request, None,
        method=request.method,
        payload_length=len(request.body)
    )
    
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    log_operation(
        logger, LogLevel.DEBUG,
        f"Webhook signature verification",
        "webhook_signature_check",
        request, None,
        has_signature=bool(sig_header),
        has_secret=bool(endpoint_secret)
    )

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
        log_operation(
            logger, LogLevel.INFO,
            f"Stripe webhook event verified",
            "webhook_event_verified",
            request, None,
            event_id=event['id'],
            event_type=event['type']
        )
    except ValueError as e:
        log_operation(
            logger, LogLevel.ERROR,
            f"Invalid webhook payload: {e}",
            "webhook_invalid_payload",
            request, None,
            error=str(e)
        )
        return JsonResponse({"error": "Invalid payload"}, status=400)
    except stripe.SignatureVerificationError as e:
        log_operation(
            logger, LogLevel.ERROR,
            f"Invalid webhook signature: {e}",
            "webhook_invalid_signature",
            request, None,
            error=str(e)
        )
        return JsonResponse({"error": "Invalid signature"}, status=400)

    
    if event["type"] == "checkout.session.completed":
        log_business_event(
            logger, "checkout_session_completed",
            f"Processing checkout.session.completed event",
            request, None,
            event_id=event['id']
        )
        
        session = event["data"]["object"]
        user_id = session["metadata"].get("user_id")
        
        log_operation(
            logger, LogLevel.DEBUG,
            f"User ID extracted from session metadata",
            "user_id_extracted",
            request, None,
            user_id=user_id
        )
        
        try:
            user = User.objects.get(id=user_id)
            log_operation(
                logger, LogLevel.INFO,
                f"User found for payment processing",
                "user_found_for_payment",
                request, user,
                user_id=user_id,
                username=user.username,
                email=user.email
            )
        except User.DoesNotExist:
            log_operation(
                logger, LogLevel.ERROR,
                f"User with ID {user_id} not found for payment processing",
                "user_not_found_for_payment",
                request, None,
                user_id=user_id
            )
            return JsonResponse({"error": "User not found"}, status=404)
        
        # You can access details here
        customer_id = session.get("customer")
        subscription_id = session.get("subscription")
        client_email = session.get("customer_details", {}).get("email")

        log_operation(
            logger, LogLevel.DEBUG,
            f"Payment details extracted from session",
            "payment_details_extracted",
            request, user,
            customer_id=customer_id,
            subscription_id=subscription_id,
            client_email=client_email,
            amount_total=session.get("amount_total"),
            currency=session.get("currency")
        )

        try:
            payment = Payment.objects.create(
                user=user, 
                stripe_customer_id=session.get("customer"),
                stripe_subscription_id=session.get("subscription"),
                stripe_session_id=session["id"],
                amount_total=session["amount_total"],
                currency=session["currency"],
                payment_status=session["payment_status"],
                status=session["status"],
                email=session["customer_details"]["email"],
                invoice_id=session.get("invoice"),
                raw_response=session,  # optional
            )
            
            log_business_event(
                logger, "payment_record_created",
                f"Payment record created successfully for user {user.username}",
                request, user,
                payment_id=payment.id,
                amount_total=session["amount_total"],
                currency=session["currency"],
                subscription_id=subscription_id
            )
        except Exception as e:
            log_operation(
                logger, LogLevel.ERROR,
                f"Error creating payment record: {e}",
                "payment_record_creation_error",
                request, user,
                error=str(e),
                user_id=user_id,
                session_id=session["id"]
            )
            return JsonResponse({"error": "Failed to create payment record"}, status=500)

    else:
        log_operation(
            logger, LogLevel.INFO,
            f"Unhandled webhook event type: {event['type']}",
            "unhandled_webhook_event",
            request, None,
            event_type=event['type'],
            event_id=event['id']
        )

    log_operation(
        logger, LogLevel.INFO,
        f"Webhook processed successfully",
        "webhook_processed_success",
        request, None,
        event_type=event['type'],
        event_id=event['id']
    )
    return JsonResponse({"status": "success"}, status=200)
class CheckAuth(APIView):
    permission_classes = [AllowAny]

    @method_decorator(csrf_exempt)
    def get(self, request):
        logger.debug(f"Authentication check requested - User: {request.user.username if request.user.is_authenticated else 'anonymous'}")
        
        # Check if user is authenticated via session
        is_authenticated = request.user.is_authenticated
        
        # If not authenticated via session, check for refresh token cookie
        if not is_authenticated:
            refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['REFRESH_COOKIE'])
            if refresh_token:
                try:
                    # Try to validate the refresh token
                    RefreshToken(refresh_token)
                    is_authenticated = True
                    logger.debug("User authenticated via refresh token")
                except Exception as e:
                    logger.debug(f"Refresh token validation failed: {str(e)}")
        
        logger.info(f"Authentication check completed - User: {request.user.username if request.user.is_authenticated else 'anonymous'}, Is authenticated: {is_authenticated}")
        return Response({'is_authenticated': is_authenticated}, status=status.HTTP_200_OK)


class UserPropertiesView(APIView):
    """
    View to get properties associated with the authenticated user's profile
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info(f"User properties requested - User: {request.user.username}")
        
        try:
            # Get the user's profile
            profile = get_object_or_404(Profile, user=request.user)
            
            # Get properties associated with this profile
            properties = profile.get_properties()
            
            # Serialize the properties
            properties_data = []
            for prop in properties:
                properties_data.append({
                    'id': prop.id,
                    'name': prop.name,
                    'city': prop.city,
                    'country': prop.country,
                    'is_active': prop.is_active,
                    'created_at': prop.created_at
                })
            
            logger.info(f"Successfully retrieved {len(properties_data)} properties for user {request.user.username}")
            return Response({
                'properties': properties_data,
                'count': len(properties_data)
            })
            
        except Exception as e:
            logger.error(f"Error retrieving properties for user {request.user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to retrieve properties'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PropertyAssociationView(APIView):
    """
    View to add/remove properties from the authenticated user's profile
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logger.info(f"Property association requested - User: {request.user.username}")
        logger.debug(f"Property association data: {request.data}")
        
        try:
            # Get the user's profile
            profile = get_object_or_404(Profile, user=request.user)
            
            # Validate the request data
            serializer = PropertyAssociationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.warning(f"Invalid property association data for user {request.user.username}: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            property_id = serializer.validated_data['property_id']
            action = serializer.validated_data['action']
            
            # Get the property
            from dynamic_pricing.models import Property
            property_obj = get_object_or_404(Property, id=property_id)
            
            if action == 'add':
                if profile.has_property(property_obj):
                    logger.warning(f"Property {property_id} already associated with user {request.user.username}")
                    return Response(
                        {'error': 'Property already associated with this profile'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                profile.add_property(property_obj)
                logger.info(f"Successfully added property {property_id} to user {request.user.username}")
                return Response({
                    'message': 'Property added successfully',
                    'property_id': property_id
                })
                
            elif action == 'remove':
                if not profile.has_property(property_obj):
                    logger.warning(f"Property {property_id} not associated with user {request.user.username}")
                    return Response(
                        {'error': 'Property not associated with this profile'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                profile.remove_property(property_obj)
                logger.info(f"Successfully removed property {property_id} from user {request.user.username}")
                return Response({
                    'message': 'Property removed successfully',
                    'property_id': property_id
                })
            
        except Exception as e:
            logger.error(f"Error managing property association for user {request.user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to manage property association'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def set_jwt_token(user):
    """
    Generate a JWT token for an authenticated user and return it in a JsonResponse.

    Args:
        user: The authenticated user object.

    Returns:
        JsonResponse: A response containing the JWT token.
    """
    try:
        logger.debug(f'Generating JWT tokens for user: {user.username}')

        if not user.is_authenticated:
            logger.warning(f'JWT token generation failed - user not authenticated: {user.username}')
            return JsonResponse({'error': 'User not authenticated'}, status=401)

        # Debug: Log that the tokens are being created
        logger.debug(f'Creating refresh and access tokens for user: {user.username}')
        access_token = str(AccessToken.for_user(user))

        # Debug: Log the setting of the JWT cookie
        logger.debug(f'Setting JWT cookie with access token: {access_token}')
        response = JsonResponse({'token': access_token})
        response.set_cookie(
            'jwt',
            access_token,
            httponly=True,
            secure=False,  # Set to False if testing locally over HTTP
            samesite='Lax',
            path='/',
            max_age=None,
        )

        return response
    except Exception as e:
        logger.error(f'Error in set_jwt_token: {str(e)}', exc_info=True)
        return JsonResponse({'error': str(e)}, status=500)


class LoginView(APIView):
    """
    Handles user authentication and JWT token generation.
    
    Flow:
    1. Receives username/password credentials
    2. Validates credentials using Django's authenticate
    3. Generates JWT tokens (access and refresh)
    4. Sets refresh token in HTTP-only cookie
    5. Returns user data and access token in response
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get_client_ip(self, request):
        """Extracts client IP for rate limiting purposes."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def post(self, request):
        """
        Authenticates user and generates JWT tokens.
        
        Args:
            request: Contains username and password in request.data
            
        Returns:
            Response with:
            - User data (id, username, email, etc.)
            - Access token in response body
            - Refresh token in HTTP-only cookie
        """
        username = request.data.get('username')
        password = request.data.get('password')
        client_ip = self.get_client_ip(request)

        # Rate limiting check
        cache_key = f'login_attempts_{client_ip}'
        attempts = cache.get(cache_key, 0)
        
        if attempts >= 5:
            return Response(
                {'error': 'Too many login attempts. Please try again later.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        user = authenticate(request, username=username, password=password)

        if user:
            login(request, user)
            cache.delete(cache_key)  # Reset rate limiting on success

            try:
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)

                # Prepare response data
                response_data = {
                    'access': access_token,
                    'user': UserSerializer(user).data
                }

                response = Response(response_data)

                # Set refresh token in HTTP-only cookie
                response.set_cookie(
                    settings.SIMPLE_JWT['REFRESH_COOKIE'],
                    refresh_token,
                    httponly=True,
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                    path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                )

                return response
            except Exception as e:
                logger.error(f"Error generating tokens during login for user {user.username}: {str(e)}", exc_info=True)
                return Response(
                    {'error': 'Failed to generate tokens'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # Increment failed attempts
            cache.set(cache_key, attempts + 1, timeout=300)  # 5 minutes timeout
            logger.warning(f"Invalid credentials for user {username} from IP {client_ip}")
            return Response(
                {'error': 'Invalid credentials'},
                status=status.HTTP_403_FORBIDDEN
            )


class GetCsrfToken(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Ensure a CSRF cookie is set and return a simple JSON message.
        """
        get_token(request)  # This will set the CSRF cookie if it is not already set
        return Response({'message': 'CSRF cookie set'}, status=status.HTTP_200_OK)

   

class ProfileView(APIView):
    """
    View to get and update the authenticated user's profile
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get the current user's profile information
        """
        try:
            profile = get_object_or_404(Profile, user=request.user)
            serializer = ProfileSerializer(profile, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error getting profile for user {request.user.username}: {str(e)}")
            return Response(
                {'error': 'Failed to retrieve profile'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """
        Update the current user's profile information
        """
        try:
            profile = get_object_or_404(Profile, user=request.user)
            
            # Separate user fields from profile fields
            user_fields = {}
            profile_fields = {}
            
            for field, value in request.data.items():
                if field in ['first_name', 'last_name']:
                    user_fields[field] = value
                else:
                    profile_fields[field] = value
            
            # Update user fields if provided
            if user_fields:
                user = request.user
                for field, value in user_fields.items():
                    setattr(user, field, value)
                user.save()
            
            # Update profile fields
            serializer = ProfileSerializer(profile, data=profile_fields, partial=True, context={'request': request})
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating profile for user {request.user.username}: {str(e)}")
            return Response(
                {'error': 'Failed to update profile'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


def activate_account(request, uid, token):
    """
    Activates a user account if the provided token is valid. This function is typically used in the context of
    email verification after registration.

    Args:
        request: HttpRequest object containing metadata about the request.
        uid: URL-safe base64-encoded user ID.
        token: Token for verifying the user's email address.

    Returns:
        Rendered HTML response indicating whether the activation was successful or not.
    """
    try:
        # Decode the user ID from base64 encoding
        uid = force_str(urlsafe_base64_decode(uid))
        logger.debug(f"uid: {uid}")

        # Retrieve the user by decoded ID
        user = User.objects.get(pk=uid)

        # Check if the token is valid for the given user
        check_token = PasswordResetTokenGenerator().check_token(user, token)
        logger.debug(f"check_token: {check_token}")
    except(TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
        check_token = False

    if user is not None and check_token:
        # If token is valid, log them in
        # Note: email confirmation is handled by the token validation itself
        login(request, user)

        # Render the activation complete template
        template = "profiles/account_activate_complete.html"
        context = {}
        return render(request, template, context)
    else:
        # If the token is not valid, inform the user
        logger.warning(f"Activation link is invalid for user {user.username if user else 'unknown'} with token {token}")
        return HttpResponse('Activation link is invalid!')


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        try:
            logger.info(f"Processing logout request for user {request.user.username}")
            response = Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
            
            # Get the refresh token cookie name from settings
            refresh_cookie_name = settings.SIMPLE_JWT['REFRESH_COOKIE']
            logger.debug(f"Attempting to delete cookie: {refresh_cookie_name}")
            
            # Delete the refresh token cookie
            response.delete_cookie(
                refresh_cookie_name,
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                domain=None  # Let the browser determine the domain
            )
            
            logger.info(f"Logout successful for user {request.user.username}")
            return response
        except Exception as e:
            logger.error(f"Logout error for user {request.user.username}: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Logout failed: {str(e)}'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class CheckUserExistsView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, format=None):
        """
        Check if a user with the given email or username already exists
        """
        email = request.data.get('email')
        username = request.data.get('username')
        
        if not email and not username:
            return Response(
                {'error': 'Email or username is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        errors = {}
        
        if email and User.objects.filter(email=email).exists():
            errors['email'] = 'A user with that email already exists.'
        
        if username and User.objects.filter(username=username).exists():
            errors['username'] = 'A user with that username already exists.'
        
        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'message': 'Username and email are available'}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [] # No auth needed to register

    def post(self, request, format=None):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save() # This calls serializer.create() which now creates the Profile

            # Log the user in and set JWT token
            try:
                # Generate JWT tokens (same as login endpoint)
                refresh = RefreshToken.for_user(user)
                access_token = str(refresh.access_token)
                refresh_token = str(refresh)

                # Prepare response data with access token (same as login endpoint)
                response_data = {
                    **UserSerializer(user).data,
                    'access': access_token
                }

                response = Response(response_data, status=status.HTTP_201_CREATED)

                # Set refresh token in HTTP-only cookie (same as login endpoint)
                response.set_cookie(
                    settings.SIMPLE_JWT['REFRESH_COOKIE'],
                    refresh_token,
                    httponly=True,
                    secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                    samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                    path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
                )
                # Send verification email immediately after registration
                try:
                    from .email_service import email_service
                    # Get language from request header for email localization
                    language = request.META.get('HTTP_X_LANGUAGE', 'en')
                    success, message_id, verification_code = email_service.send_verification_email(
                        email=user.email,
                        user_name=user.first_name,
                        user=user,  # Pass the newly created user
                        language=language
                    )
                    
                    if success:
                        logger.info(f"Verification email sent to {user.email} after registration")
                        # Include verification info in response for debugging
                        response_data['verification_sent'] = True
                        if hasattr(settings, 'POSTMARK_TEST_MODE') and settings.POSTMARK_TEST_MODE:
                            response_data['verification_code'] = verification_code
                    else:
                        logger.warning(f"Failed to send verification email to {user.email}: {message_id}")
                        response_data['verification_sent'] = False
                        response_data['verification_error'] = message_id
                        
                except Exception as e:
                    logger.error(f"Error sending verification email during registration for {user.email}: {str(e)}")
                    response_data['verification_sent'] = False
                    response_data['verification_error'] = str(e)
                
                return response
            except Exception as e:
                # Log this error, as it's a server-side issue during token generation/setting
                logger.error(f"Error generating or setting JWT token during registration for user {user.username}: {str(e)}", exc_info=True)
                # Still return a 201 as user was created, but indicate token issue if desired, or just return user data.
                # For simplicity, we'll return the user data, but the client won't be auto-logged in via cookie.
                return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)





class RefreshTokenView(APIView):
    """
    Handles JWT token refresh.
    
    Flow:
    1. Gets refresh token from HTTP-only cookie
    2. Validates refresh token
    3. Generates new access token
    4. Returns new access token in response
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        """
        Refreshes the access token using the refresh token from cookie.
        
        Returns:
            Response with new access token
        """
        try:
            logger.debug(f"Token refresh attempt for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            refresh_token = request.COOKIES.get(settings.SIMPLE_JWT['REFRESH_COOKIE'])
            
            if not refresh_token:
                logger.warning(f"No refresh token found in cookies for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                return Response(
                    {'error': 'No refresh token found'},
                    status=status.HTTP_403_FORBIDDEN
                )

            logger.debug(f"Found refresh token in cookies for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            refresh = RefreshToken(refresh_token)
            access_token = str(refresh.access_token)
            logger.debug(f"Generated new access token for user {request.user.username if request.user.is_authenticated else 'anonymous'}")

            return Response({
                'access': access_token
            })

        except Exception as e:
            logger.error(f"Token refresh failed for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Invalid refresh token'},
                status=status.HTTP_403_FORBIDDEN
            )


class GoogleLoginView(SocialLoginView):
    """
    Handles Google OAuth authentication and JWT token generation.
    """
    permission_classes = [AllowAny]  # Allow unauthenticated access for login
    adapter_class = GoogleOAuth2Adapter
    client_class = OAuth2Client
    callback_url = None

    def post(self, request, *args, **kwargs):
        logger.info(f"Starting Google login process for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
        
        # Check for access token
        id_token = request.data.get('access_token')
        logger.debug(f"Received request data: {request.data}")
        logger.debug(f"Access token present: {bool(id_token)}")
        
        if not id_token:
            logger.error(f"No access token provided in request for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            return Response(
                {'error': 'No access token provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get Google's public keys
        try:
            logger.info(f"Fetching Google public keys for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            response = requests.get('https://www.googleapis.com/oauth2/v3/certs')
            if response.status_code != 200:
                logger.error(f"Failed to fetch Google public keys. Status code: {response.status_code} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                return Response(
                    {'error': 'Failed to fetch Google public keys'},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE
                )
            public_keys = response.json()
        except requests.RequestException as e:
            logger.error(f"Request error while fetching Google public keys for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to connect to Google services'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Verify and decode the ID token
        try:
            logger.info(f"Verifying ID token for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            unverified_header = jwt.get_unverified_header(id_token)
            key_id = unverified_header['kid']
            
            # Find matching public key
            public_key = None
            for key in public_keys['keys']:
                if key['kid'] == key_id:
                    public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key)
                    break
            
            if not public_key:
                logger.error(f"No matching public key found for token for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                return Response(
                    {'error': 'No matching public key found for token'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get Google OAuth client ID from settings
            client_id = settings.SOCIALACCOUNT_PROVIDERS['google']['APP']['client_id']
            logger.debug(f"Google OAuth client ID from settings: {client_id[:20]}..." if client_id else "None")
            
            if not client_id:
                logger.error(f"Google OAuth client ID not configured in settings for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                return Response(
                    {'error': 'Google OAuth client ID not configured'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Verify token
            try:
                decoded_token = jwt.decode(
                    id_token,
                    public_key,
                    algorithms=['RS256'],
                    audience=client_id,
                    issuer='https://accounts.google.com',
                    options={
                        'verify_iat': False,  # Don't verify issued at time
                        'verify_exp': True,   # Still verify expiration
                        'leeway': 10          # Allow 10 seconds of clock skew
                    }
                )
                logger.info(f"Successfully decoded and verified ID token for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            except jwt.ExpiredSignatureError:
                logger.error(f"Token has expired for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                return Response(
                    {'error': 'Token has expired. Please try logging in again.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except jwt.InvalidTokenError as e:
                logger.error(f"Invalid token error for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
                return Response(
                    {'error': f'Invalid ID token: {str(e)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            except Exception as e:
                logger.error(f"Unexpected error during token verification for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
                return Response(
                    {'error': 'Failed to verify token'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Error during token verification for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to verify token'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create user
        try:
            logger.info(f"Looking up social account for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            social_account = SocialAccount.objects.get(
                provider=GoogleProvider.id, 
                uid=decoded_token['sub']
            )
            user = social_account.user
            logger.info(f"Found existing user: {user.username} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
        except SocialAccount.DoesNotExist:
            logger.info(f"No existing social account found for user {request.user.username if request.user.is_authenticated else 'anonymous'}, creating new user")
            # Create new user
            email = decoded_token.get('email')
            if not email:
                logger.error(f"No email provided in Google token for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                return Response(
                    {'error': 'Email not provided by Google'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                user = User.objects.get(email=email)
                logger.info(f"Found existing user with email: {email} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            except User.DoesNotExist:
                logger.info(f"Creating new user with email: {email} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                username = email.split('@')[0]
                # Ensure unique username
                base_username = username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    first_name=decoded_token.get('given_name', ''),
                    last_name=decoded_token.get('family_name', '')
                )
                logger.info(f"Created new user: {username} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            
            # Create social account
            social_account = SocialAccount.objects.create(
                user=user,
                provider=GoogleProvider.id,
                uid=decoded_token['sub'],
                extra_data=decoded_token
            )
            logger.info(f"Created social account for user: {user.username} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")

        # Handle profile picture
        try:
            # Get profile picture URL from Google token
            picture_url = decoded_token.get('picture')
            logger.debug(f"Profile picture URL from token for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {picture_url}")
            
            if picture_url:
                # Download the image
                logger.info(f"Downloading profile picture for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                picture_response = requests.get(picture_url)
                if picture_response.status_code == 200:
                    # Get or create profile
                    profile, created = Profile.objects.get_or_create(user=user)
                    logger.info(f"{'Created' if created else 'Found'} profile for user: {user.username} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                    
                    # Save the profile picture
                    filename = f"{user.username}_{datetime.today().strftime('%h-%d-%y')}.jpeg"
                    logger.info(f"Saving profile picture as: {filename} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                    profile.profile_picture.save(
                        filename,
                        ContentFile(picture_response.content),
                        save=True
                    )
                    logger.info(f"Successfully saved profile picture for user {user.username} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
                else:
                    logger.error(f"Failed to download profile picture. Status code: {picture_response.status_code} for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
        except requests.RequestException as e:
            logger.error(f"Request error while downloading profile picture for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Error processing profile picture for user {user.username} for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
            # Continue with login process even if picture fails

        try:
            # Generate JWT tokens
            logger.info(f"Generating JWT tokens for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)

            # Prepare response
            response_data = {
                **UserSerializer(user).data,
                'access': access_token
            }

            response = Response(response_data)

            # Set refresh token in HTTP-only cookie
            response.set_cookie(
                settings.SIMPLE_JWT['REFRESH_COOKIE'],
                refresh_token,
                httponly=True,
                secure=settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
                samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
                path=settings.SIMPLE_JWT['AUTH_COOKIE_PATH'],
            )
            logger.info(f"Successfully completed Google login process for user {request.user.username if request.user.is_authenticated else 'anonymous'}")
            return response
        except Exception as e:
            logger.error(f"Error generating tokens or creating response for user {request.user.username if request.user.is_authenticated else 'anonymous'}: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Failed to complete login process'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PMSIntegrationRequirementView(APIView):
    """
    View to handle PMS integration requirements
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create a new PMS integration requirement
        """
        try:
            # Get the user's profile
            user_profile = request.user.profile
            
            # Get the property (assuming it's the most recent one for now)
            from dynamic_pricing.models import Property
            try:
                property_obj = user_profile.get_properties().latest('created_at')
            except Property.DoesNotExist:
                return Response({
                    'error': 'No property found for this user'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Prepare data for serializer
            pms_system_id = request.data.get('pms_system')
            custom_pms_name = request.data.get('custom_pms_name')
            
            data = {
                'property_obj': property_obj.id,
                'profile': user_profile.id,
                'custom_pms_name': custom_pms_name,
            }
            
            # If pms_system is provided, get the PMS object
            if pms_system_id:
                try:
                    from dynamic_pricing.models import PropertyManagementSystem
                    pms_system = PropertyManagementSystem.objects.get(id=pms_system_id)
                    data['pms_system'] = pms_system.id
                except PropertyManagementSystem.DoesNotExist:
                    return Response({
                        'error': 'PMS system not found'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if integration already exists
            existing_integration = PMSIntegrationRequirement.objects.filter(
                property_obj=property_obj,
                profile=user_profile
            ).first()
            
            if existing_integration:
                # Update existing integration
                serializer = PMSIntegrationRequirementSerializer(
                    existing_integration, 
                    data=data, 
                    partial=True
                )
            else:
                # Create new integration
                serializer = PMSIntegrationRequirementSerializer(data=data)
            
            if serializer.is_valid():
                integration = serializer.save()
                
                # Update the Property's PMS field to match the integration requirement
                if pms_system_id:
                    try:
                        from dynamic_pricing.models import PropertyManagementSystem
                        pms_system = PropertyManagementSystem.objects.get(id=pms_system_id)
                        property_obj.pms = pms_system
                        property_obj.pms_name = pms_system.name
                        property_obj.save()
                        logger.info(f"Updated Property {property_obj.id} PMS to: {pms_system.name}")
                    except PropertyManagementSystem.DoesNotExist:
                        logger.error(f"PMS system {pms_system_id} not found when updating property")
                elif custom_pms_name:
                    # For custom PMS, set pms_name but leave pms as null
                    property_obj.pms = None
                    property_obj.pms_name = custom_pms_name
                    property_obj.save()
                    logger.info(f"Updated Property {property_obj.id} with custom PMS: {custom_pms_name}")
                else:
                    # No PMS selected
                    property_obj.pms = None
                    property_obj.pms_name = None
                    property_obj.save()
                    logger.info(f"Updated Property {property_obj.id} to have no PMS")
                
                logger.info(f"PMS integration requirement created/updated: {integration}")
                
                return Response({
                    'message': 'PMS integration requirement saved successfully',
                    'integration': serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating PMS integration requirement: {str(e)}")
            return Response({
                'error': 'Failed to save PMS integration requirement'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """
        Get PMS integration requirements for the authenticated user
        """
        try:
            user_profile = request.user.profile
            integrations = PMSIntegrationRequirement.objects.filter(profile=user_profile)
            
            serializer = PMSIntegrationRequirementSerializer(integrations, many=True)
            
            return Response({
                'integrations': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting PMS integration requirements: {str(e)}")
            return Response({
                'error': 'Failed to retrieve PMS integration requirements'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class SendVerificationEmailView(APIView):
    """
    Send email verification code to user's email address
    For authenticated users: uses their email and first name
    For anonymous users: requires email and first_name in request
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Send verification email with 5-digit code
        
        For authenticated users: no payload needed (uses user.email and user.first_name)
        For anonymous users: Expected payload:
        {
            "email": "user@example.com",
            "first_name": "John"
        }
        """
        try:
            # Check if user is authenticated
            if request.user.is_authenticated:
                # Use authenticated user's data
                email = request.user.email
                first_name = request.user.first_name or request.user.username
                logger.info(f"Sending verification email to authenticated user: {email}")
            else:
                # Use data from request for anonymous users
                email = request.data.get('email', '').strip().lower()
                first_name = request.data.get('first_name', '').strip()
                
                if not email:
                    return Response({
                        'error': 'Email address is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                if not first_name:
                    return Response({
                        'error': 'First name is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                logger.info(f"Sending verification email to anonymous user: {email}")
            
            # Import email service
            from .email_service import email_service
            
            # Get language from request header for email localization
            language = request.META.get('HTTP_X_LANGUAGE', 'en')
            
            # Send verification email
            # Pass user object if authenticated, None otherwise
            user_obj = request.user if request.user.is_authenticated else None
            success, message_id_or_error, verification_code = email_service.send_verification_email(
                email=email,
                user_name=first_name,
                user=user_obj,
                language=language
            )
            
            if success:
                logger.info(f"Verification email sent to {email}")
                
                # In test mode, return the code for development purposes
                response_data = {
                    'message': 'Verification email sent successfully',
                    'message_id': message_id_or_error
                }
                
                # Only include verification code in test mode for development
                if hasattr(settings, 'POSTMARK_TEST_MODE') and settings.POSTMARK_TEST_MODE:
                    response_data['verification_code'] = verification_code
                
                return Response(response_data, status=status.HTTP_200_OK)
            else:
                logger.error(f"Failed to send verification email to {email}: {message_id_or_error}")
                return Response({
                    'error': 'Failed to send verification email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in SendVerificationEmailView: {str(e)}")
            return Response({
                'error': 'An unexpected error occurred. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyEmailCodeView(APIView):
    """
    Verify the email verification code
    For authenticated users: uses their email from user object
    For anonymous users: requires email in request
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Verify submitted verification code
        
        For authenticated users: Expected payload: { "code": "12345" }
        For anonymous users: Expected payload: { "email": "user@example.com", "code": "12345" }
        """
        try:
            # Get the verification code from request
            code = request.data.get('code', '').strip()
            
            if not code:
                return Response({
                    'error': 'Verification code is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Check if user is authenticated
            if request.user.is_authenticated:
                # Use authenticated user's email
                email = request.user.email
                user_obj = request.user
                logger.info(f"Verifying code for authenticated user: {email}")
            else:
                # Use email from request for anonymous users
                email = request.data.get('email', '').strip().lower()
                user_obj = None
                
                if not email:
                    return Response({
                        'error': 'Email address is required'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
                logger.info(f"Verifying code for anonymous user: {email}")
            
            # Import email service
            from .email_service import email_service
            
            # Verify the code
            success, message = email_service.verify_code(email, code, user_obj)
            
            if success:
                logger.info(f"Email verification successful for {email}")
                return Response({
                    'message': message,
                    'verified': True
                }, status=status.HTTP_200_OK)
            else:
                logger.warning(f"Email verification failed for {email}: {message}")
                return Response({
                    'error': message,
                    'verified': False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in VerifyEmailCodeView: {str(e)}")
            return Response({
                'error': 'An unexpected error occurred. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)





class OnboardingProgressView(APIView):
    """
    View to get and update onboarding progress
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get current onboarding progress
        """
        try:
            profile = request.user.profile
            progress = profile.get_onboarding_progress()
            
            return Response(progress, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting onboarding progress: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to get onboarding progress'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Update onboarding progress
        """
        try:
            step = request.data.get('step')
            
            if not step:
                return Response({
                    'error': 'Step is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate step
            valid_steps = [step[0] for step in request.user.profile.ONBOARDING_STEPS]
            if step not in valid_steps:
                return Response({
                    'error': f'Invalid step. Valid steps are: {valid_steps}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Update progress
            profile = request.user.profile
            profile.update_onboarding_step(step)
            
            # Return updated progress
            progress = profile.get_onboarding_progress()
            
            logger.info(f"Updated onboarding progress for user {request.user.username}: {step}")
            
            return Response({
                'message': 'Onboarding progress updated successfully',
                'progress': progress
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating onboarding progress: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to update onboarding progress'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TestEmailView(APIView):
    """
    Simple test endpoint for sending verification emails
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Test endpoint for sending verification emails
        
        Expected payload:
        {
            "email": "test@viverestays.com",  # Must be @viverestays.com while account is pending
            "first_name": "Test"
        }
        """
        try:
            email = request.data.get('email', '').strip().lower()
            first_name = request.data.get('first_name', '').strip()
            
            if not email:
                return Response({
                    'error': 'Email address is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not first_name:
                return Response({
                    'error': 'First name is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Import email service
            from .email_service import email_service
            
            # Get language from request header for email localization
            language = request.META.get('HTTP_X_LANGUAGE', 'en')
            
            # Send verification email
            success, message_id_or_error, verification_code = email_service.send_verification_email(
                email=email,
                user_name=first_name,
                language=language
            )
            
            if success:
                logger.info(f"Test verification email sent to {email}")
                
                response_data = {
                    'message': 'Test verification email sent successfully',
                    'message_id': message_id_or_error,
                    'email': email,
                    'first_name': first_name
                }
                
                # Always include verification code in test endpoint for easy testing
                response_data['verification_code'] = verification_code
                
                return Response(response_data, status=status.HTTP_200_OK)
            else:
                logger.error(f"Failed to send test verification email to {email}: {message_id_or_error}")
                return Response({
                    'error': f'Failed to send verification email: {message_id_or_error}',
                    'email': email,
                    'first_name': first_name
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error in TestEmailView: {str(e)}")
            return Response({
                'error': f'An unexpected error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ChangePasswordView(APIView):
    """
    View to change user password
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Change user password
        
        Expected payload:
        {
            "current_password": "current_password",
            "new_password": "new_password"
        }
        """
        try:
            current_password = request.data.get('current_password')
            new_password = request.data.get('new_password')
            
            if not current_password:
                return Response({
                    'error': 'Current password is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if not new_password:
                return Response({
                    'error': 'New password is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verify current password
            user = request.user
            if not user.check_password(current_password):
                return Response({
                    'error': 'Current password is incorrect'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate new password
            try:
                validate_password(new_password, user)
            except ValidationError as e:
                return Response({
                    'error': 'New password does not meet requirements',
                    'details': list(e.messages)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            logger.info(f"Password changed successfully for user {user.username}")
            
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error changing password for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to change password'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupportTicketView(APIView):
    """
    API view for creating and retrieving support tickets
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def post(self, request):
        """
        Create a new support ticket
        """
        try:
            # Add user to the data
            data = request.data.copy()
            data['user'] = request.user.id
            
            # Generate title from issue type if not provided
            if not data.get('title'):
                issue_type = data.get('issue_type', 'general_question')
                issue_type_display = dict(SupportTicket.ISSUE_TYPES).get(issue_type, 'General Question')
                data['title'] = f"{issue_type_display} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
            
            serializer = SupportTicketSerializer(data=data)
            
            if serializer.is_valid():
                support_ticket = serializer.save()
                
                logger.info(f"Support ticket created: {support_ticket.id} by user {request.user.username}")
                
                # Get language from request header for email localization
                language = request.META.get('HTTP_X_LANGUAGE', 'en')
                user_email = request.user.email
                user_name = request.user.first_name or request.user.username
                issue_type_display = support_ticket.get_issue_type_display() if hasattr(support_ticket, 'get_issue_type_display') else data.get('issue_type')
                support_description = data.get('description', 'No description provided')
                
                # Send notification email to support team (non-blocking)
                try:
                    from .email_service import email_service
                    support_description_full = f"User: {user_name} ({user_email})\n"
                    support_description_full += f"User ID: {request.user.id}\n"
                    support_description_full += f"Ticket ID: {support_ticket.id}\n\n"
                    support_description_full += "This is a support ticket from the main dashboard support center.\n"
                    support_description_full += "The user has submitted a detailed support request.\n\n"
                    support_description_full += "Description:\n"
                    support_description_full += support_description

                    success, message_id_or_error = email_service.send_support_team_notification_email(
                        user_name=user_name,
                        user_email=user_email,
                        ticket_id=support_ticket.id,
                        issue_type=f"Dashboard Support - {issue_type_display}",
                        description=support_description_full,
                        support_email="support@viverestays.com",
                        language=language
                    )
                    
                    if success:
                        logger.info(f"Support ticket notification email sent for ticket {support_ticket.id}, MessageID: {message_id_or_error}")
                    else:
                        logger.error(f"Failed to send support ticket notification for ticket {support_ticket.id}: {message_id_or_error}")
                except Exception as email_exc:
                    logger.error(f"Failed to send support ticket notification for ticket {support_ticket.id}: {email_exc}", exc_info=True)

                # Send confirmation email to the user (non-blocking)
                try:
                    from .email_service import email_service
                    description_excerpt = support_description
                    if len(description_excerpt) > 200:
                        description_excerpt = description_excerpt[:197] + '...'

                    email_service.send_support_confirmation_email(
                        to_email=user_email,
                        user_name=user_name,
                        ticket_id=support_ticket.id,
                        issue_type=issue_type_display,
                        description_excerpt=description_excerpt,
                        support_email=getattr(settings, 'SUPPORT_EMAIL', 'support@viverestays.com'),
                        portal_url=getattr(settings, 'FRONTEND_URL', '').rstrip('/') + '/support',
                        message=support_description,
                        language=language
                    )
                except Exception as user_email_exc:
                    logger.error(f"Failed to send support confirmation email for ticket {support_ticket.id}: {user_email_exc}", exc_info=True)
                
                return Response({
                    'message': 'Support ticket created successfully',
                    'ticket': SupportTicketSerializer(support_ticket).data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating support ticket for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to create support ticket'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        """
        Get support tickets for the authenticated user
        """
        try:
            support_tickets = SupportTicket.objects.filter(user=request.user)
            serializer = SupportTicketSerializer(support_tickets, many=True)
            
            return Response({
                'tickets': serializer.data,
                'count': support_tickets.count()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving support tickets for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to retrieve support tickets'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OnboardingPMSSupportView(APIView):
    """
    API view for sending PMS support requests during onboarding
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Send a PMS support request during onboarding
        """
        try:
            data = request.data
            message = data.get('message', '')
            property_id = data.get('property_id')
            
            # Get user information
            user = request.user
            user_name = user.first_name or user.username
            user_email = user.email
            
            # Build email content
            subject = f"PMS Support Request from {user_name} during Onboarding"
            
            # Build email body
            lines = [
                f"User: {user_name} ({user_email})",
                f"User ID: {user.id}",
                f"Property ID: {property_id or 'Not provided'}",
                "",
                "Message:",
                message if message else "No additional message provided",
                "",
                "This is a PMS support request from the onboarding flow.",
                "The user needs help choosing a compatible PMS system.",
            ]
            text_body = "\n".join([str(x) for x in lines if x is not None])
            
            # Send email to analytics team
            try:
                from .email_service import email_service
                # Get language from request header for email localization
                language = request.META.get('HTTP_X_LANGUAGE', 'en')
                
                # Use template-based email to ensure Postmark template renders
                # This method now sends emails to both user and support team
                success, message_id_or_error = email_service.send_onboarding_pms_support_email(
                    user_name=user_name,
                    user_email=user_email,
                    user_id=user.id,
                    property_id=property_id,
                    message=message,
                    language=language
                )
                if success:
                    logger.info(f"PMS support request email sent for user {user.username}")
                else:
                    logger.error(f"Failed to send PMS support request email for user {user.username}: {message_id_or_error}")
            except Exception as email_exc:
                logger.error(f"Failed to send PMS support request email for user {user.username}: {email_exc}", exc_info=True)
            
            return Response({
                'message': 'PMS support request sent successfully. Our team will contact you soon.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing PMS support request for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to send PMS support request'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OnboardingEmailVerificationSupportView(APIView):
    """
    API view for sending email verification support requests during onboarding
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Send an email verification support request during onboarding
        """
        try:
            data = request.data
            message = data.get('message', '')
            
            # Get user information
            user = request.user
            user_name = user.first_name or user.username
            user_email = user.email
            
            # Send email to analytics team
            try:
                from .email_service import email_service
                # Get language from request header for email localization
                language = request.META.get('HTTP_X_LANGUAGE', 'en')
                
                # Use template-based email to ensure Postmark template renders
                # This method now sends emails to both user and support team
                success, message_id_or_error = email_service.send_onboarding_email_verification_support_email(
                    user_name=user_name,
                    user_email=user_email,
                    user_id=user.id,
                    message=message,
                    language=language
                )
                if success:
                    logger.info(f"Email verification support request email sent for user {user.username}")
                else:
                    logger.error(f"Failed to send email verification support request email for user {user.username}: {message_id_or_error}")
            except Exception as email_exc:
                logger.error(f"Failed to send email verification support request email for user {user.username}: {email_exc}", exc_info=True)
            
            return Response({
                'message': 'Support request sent successfully. Our team will contact you soon.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing email verification support request for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to send support request'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OnboardingContactSalesView(APIView):
    """
    API view for sending contact sales requests during onboarding
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Send a contact sales request during onboarding
        """
        try:
            data = request.data
            property_id = data.get('property_id')
            
            # Get user information
            user = request.user
            user_name = user.first_name or user.username
            user_email = user.email
            
            # Send email to sales team
            try:
                from .email_service import email_service
                # Get language from request header for email localization
                language = request.META.get('HTTP_X_LANGUAGE', 'en')
                
                # Use template-based email to ensure Postmark template renders
                # This method now sends emails to both user and sales team
                success, message_id_or_error = email_service.send_onboarding_contact_sales_email(
                    user_name=user_name,
                    user_email=user_email,
                    user_id=user.id,
                    property_id=property_id,
                    language=language
                )
                if success:
                    logger.info(f"Contact sales request email sent for user {user.username}")
                else:
                    logger.error(f"Failed to send contact sales request email for user {user.username}: {message_id_or_error}")
            except Exception as email_exc:
                logger.error(f"Failed to send contact sales request email for user {user.username}: {email_exc}", exc_info=True)
            
            return Response({
                'message': 'Sales request sent successfully. Our sales team will contact you soon.'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing contact sales request for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to send sales request'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationListView(APIView):
    """
    API view for listing and creating notifications
    GET: List all notifications for the authenticated user with optional filters
    POST: Create a new notification for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get notifications for the authenticated user with optional filters
        
        Query parameters:
        - filter: 'all' (default), 'unread', 'read', 'new'
        - category: Filter by category (pms, pricing, payment, etc.)
        - priority: Filter by priority (low, medium, high, urgent)
        - limit: Number of notifications to return (default: 50)
        - offset: Pagination offset (default: 0)
        """
        try:
            user = request.user
            
            # Get query parameters
            filter_type = request.query_params.get('filter', 'all')
            category = request.query_params.get('category', None)
            priority = request.query_params.get('priority', None)
            limit = int(request.query_params.get('limit', 50))
            offset = int(request.query_params.get('offset', 0))
            
            # Base queryset
            queryset = Notification.objects.filter(user=user)
            
            # Apply filters
            if filter_type == 'unread':
                queryset = queryset.filter(is_read=False)
            elif filter_type == 'read':
                queryset = queryset.filter(is_read=True)
            elif filter_type == 'new':
                queryset = queryset.filter(is_new=True)
            
            # Apply category filter
            if category:
                queryset = queryset.filter(category=category)
            
            # Apply priority filter
            if priority:
                queryset = queryset.filter(priority=priority)
            
            # Get counts
            total_count = queryset.count()
            unread_count = Notification.get_user_unread_count(user)
            new_count = Notification.get_user_new_count(user)
            
            # Apply pagination
            notifications = queryset[offset:offset + limit]
            
            # Serialize
            serializer = NotificationSerializer(notifications, many=True)
            
            logger.info(f"Retrieved {len(serializer.data)} notifications for user {user.username} (filter: {filter_type})")
            
            return Response({
                'notifications': serializer.data,
                'total_count': total_count,
                'unread_count': unread_count,
                'new_count': new_count,
                'limit': limit,
                'offset': offset
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving notifications for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to retrieve notifications'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """
        Create a new notification for the authenticated user
        
        Expected payload:
        {
            "type": "success|warning|info|error",
            "category": "pms|pricing|payment|profile|competitor|system|general",
            "priority": "low|medium|high|urgent",
            "title": "Notification title",
            "description": "Notification description",
            "action_url": "Optional action URL",
            "metadata": {"key": "value"},
            "expires_at": "2024-12-31T23:59:59Z" (optional)
        }
        """
        try:
            # Add user to the data
            data = request.data.copy()
            
            # Validate and create notification
            serializer = NotificationCreateSerializer(data=data)
            
            if serializer.is_valid():
                # Create notification with the authenticated user
                notification = serializer.save(user=request.user)
                
                logger.info(f"Notification created: {notification.id} for user {request.user.username}")
                
                # Return full notification data
                response_serializer = NotificationSerializer(notification)
                
                return Response({
                    'message': 'Notification created successfully',
                    'notification': response_serializer.data
                }, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error creating notification for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to create notification'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationDetailView(APIView):
    """
    API view for retrieving, updating, and deleting a specific notification
    GET: Retrieve notification details
    PATCH: Update notification (mark as read/unread)
    DELETE: Delete notification
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, notification_id):
        """
        Get a specific notification
        """
        try:
            notification = get_object_or_404(
                Notification, 
                id=notification_id, 
                user=request.user
            )
            
            serializer = NotificationSerializer(notification)
            
            return Response({
                'notification': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving notification {notification_id} for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to retrieve notification'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def patch(self, request, notification_id):
        """
        Update a notification (mainly for marking as read/unread)
        
        Expected payload:
        {
            "is_read": true/false,
            "is_new": true/false
        }
        """
        try:
            notification = get_object_or_404(
                Notification, 
                id=notification_id, 
                user=request.user
            )
            
            serializer = NotificationUpdateSerializer(
                notification, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                
                logger.info(f"Notification {notification_id} updated for user {request.user.username}")
                
                # Return full notification data
                response_serializer = NotificationSerializer(notification)
                
                return Response({
                    'message': 'Notification updated successfully',
                    'notification': response_serializer.data
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Invalid data provided',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error updating notification {notification_id} for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to update notification'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, notification_id):
        """
        Delete a notification
        """
        try:
            notification = get_object_or_404(
                Notification, 
                id=notification_id, 
                user=request.user
            )
            
            notification.delete()
            
            logger.info(f"Notification {notification_id} deleted for user {request.user.username}")
            
            return Response({
                'message': 'Notification deleted successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting notification {notification_id} for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to delete notification'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationMarkAllReadView(APIView):
    """
    API view for marking all notifications as read
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Mark all notifications as read for the authenticated user
        """
        try:
            user = request.user
            
            # Mark all as read
            updated_count = Notification.mark_all_as_read(user)
            
            logger.info(f"Marked {updated_count} notifications as read for user {user.username}")
            
            return Response({
                'message': 'All notifications marked as read',
                'updated_count': updated_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error marking all notifications as read for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to mark all notifications as read'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationUnreadCountView(APIView):
    """
    API view for getting the count of unread notifications
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get count of unread and new notifications for the authenticated user
        """
        try:
            user = request.user
            
            unread_count = Notification.get_user_unread_count(user)
            new_count = Notification.get_user_new_count(user)
            
            return Response({
                'unread_count': unread_count,
                'new_count': new_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting notification counts for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to get notification counts'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckBookingUrlStatusView(APIView):
    """
    Check booking URL status and trigger notifications if needed
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Check if user's properties have booking URLs configured
        """
        from dynamic_pricing.notification_triggers import trigger_booking_url_not_configured_notification
        
        try:
            # Trigger the booking URL notification check
            notification = trigger_booking_url_not_configured_notification(request.user)
            
            if notification:
                return Response({
                    'message': 'Booking URL check completed - notification created',
                    'notification_created': True,
                    'notification_id': notification.id
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'message': 'Booking URL check completed - no notification needed',
                    'notification_created': False
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error checking booking URL status for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to check booking URL status'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CheckSpecialOffersStatusView(APIView):
    """
    Check special offers status and trigger notifications if needed
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Check if user's special offers have started or ended
        """
        from dynamic_pricing.notification_triggers import (
            trigger_special_offer_started_notification,
            trigger_special_offer_ended_notification
        )
        
        try:
            started_notifications = trigger_special_offer_started_notification(request.user)
            ended_notifications = trigger_special_offer_ended_notification(request.user)
            
            return Response({
                'message': 'Special offers check completed',
                'notifications_created': {
                    'started': len(started_notifications),
                    'ended': len(ended_notifications)
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error checking special offers status: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to check special offers status'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvoiceListView(APIView):
    """
    API view for retrieving user invoices
    GET: List all invoices for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get invoices for the authenticated user
        """
        try:
            user = request.user
            
            # Get invoices for the user, ordered by invoice date (newest first)
            invoices = Invoice.objects.filter(user=user).order_by('-invoice_date')
            
            # Serialize the invoices
            serializer = InvoiceSerializer(invoices, many=True, context={'request': request})
            
            logger.info(f"Retrieved {len(serializer.data)} invoices for user {user.username}")
            
            return Response({
                'invoices': serializer.data,
                'count': len(serializer.data)
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error retrieving invoices for user {request.user.username}: {str(e)}", exc_info=True)
            return Response({
                'error': 'Failed to retrieve invoices'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)