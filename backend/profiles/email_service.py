"""
Email service for Postmark integration
"""
import logging
import random
import string
from typing import Dict, Optional, Tuple
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from postmarker.core import PostmarkClient
from .models import EmailVerificationCode
from django.contrib.auth import get_user_model
User = get_user_model()

logger = logging.getLogger(__name__)


class PostmarkEmailService:
    """
    Service class for sending emails via Postmark API
    """
    
    def __init__(self):
        print(f"🔍 DEBUG: Initializing PostmarkEmailService")
        print(f"🔍 DEBUG: POSTMARK_TOKEN: {settings.POSTMARK_TOKEN[:10] if settings.POSTMARK_TOKEN else 'NOT SET'}...")
        print(f"🔍 DEBUG: POSTMARK_TEST_MODE: {settings.POSTMARK_TEST_MODE}")
        print(f"🔍 DEBUG: DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        print(f"🔍 DEBUG: COMPANY_LOGO_URL: {settings.COMPANY_LOGO_URL}")
        
        try:
            self.client = PostmarkClient(server_token=settings.POSTMARK_TOKEN)
            print(f"🔍 DEBUG: PostmarkClient initialized successfully")
        except Exception as e:
            print(f"🔍 DEBUG: Failed to initialize PostmarkClient: {str(e)}")
            raise e
            
        self.test_mode = settings.POSTMARK_TEST_MODE
        print(f"🔍 DEBUG: PostmarkEmailService initialization complete")
        
    def get_base_template_data(self) -> Dict[str, str]:
        """Get base template data that should be included in all emails"""
        return {
            "logo_url": settings.COMPANY_LOGO_URL,
            "company_website": settings.COMPANY_WEBSITE,
            "unsubscribe_url": settings.COMPANY_UNSUBSCRIBE_URL
        }
        
    def generate_verification_code(self) -> str:
        """
        Generate a random verification code
        
        Returns:
            str: Random 5-digit verification code
        """
        length = getattr(settings, 'EMAIL_VERIFICATION_CODE_LENGTH', 5)
        return ''.join(random.choices(string.digits, k=length))
    
    def store_verification_code(self, email: str, code: str, user: User = None) -> None:
        """
        Store verification code in database with expiry
        
        Args:
            email: User's email address
            code: Verification code to store
            user: Optional User object (for registered users)
        """
        print(f"🔍 DEBUG: store_verification_code called for {email}")
        print(f"🔍 DEBUG: Code: {code}")
        print(f"🔍 DEBUG: User provided: {user}")
        
        expiry_minutes = getattr(settings, 'EMAIL_VERIFICATION_EXPIRY_MINUTES', 10)
        expires_at = timezone.now() + timedelta(minutes=expiry_minutes)
        print(f"🔍 DEBUG: Expires at: {expires_at}")
        
        # Delete any existing codes for this email
        EmailVerificationCode.objects.filter(email=email).delete()
        print(f"🔍 DEBUG: Deleted existing codes for email")
        
        # Create new verification code
        print(f"🔍 DEBUG: Creating EmailVerificationCode object...")
        EmailVerificationCode.objects.create(
            user=user,  # Can be None for anonymous verification
            email=email,
            code=code,
            expires_at=expires_at
        )
        print(f"🔍 DEBUG: EmailVerificationCode created successfully")
        
        user_type = "registered user" if user and user.is_active else "anonymous user"
        print(f"🔍 DEBUG: Stored verification code for {email} ({user_type}) (expires in {expiry_minutes} minutes)")
    
    def get_verification_code(self, email: str, user: User = None) -> Optional[str]:
        """
        Retrieve verification code from database
        
        Args:
            email: User's email address
            user: Optional User object (for registered users)
            
        Returns:
            str or None: Verification code if found and not expired
        """
        try:
            # If user is provided, prefer codes linked to their account
            if user:
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user=user,
                    is_used=False
                ).latest('created_at')
            else:
                # For anonymous users, find by email only
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user__isnull=True,  # Only anonymous codes
                    is_used=False
                ).latest('created_at')
            
            if verification_code.is_expired():
                verification_code.delete()
                return None
                
            return verification_code.code
        except EmailVerificationCode.DoesNotExist:
            return None
    
    def delete_verification_code(self, email: str, user: User = None) -> None:
        """
        Delete verification code from database
        
        Args:
            email: User's email address
            user: Optional User object (for registered users)
        """
        if user:
            EmailVerificationCode.objects.filter(user=user).delete()
        else:
            try:
                temp_user = User.objects.get(email=email)
                EmailVerificationCode.objects.filter(user=temp_user).delete()
            except User.DoesNotExist:
                pass
        logger.info(f"Deleted verification code for {email}")
    
    def mark_verification_code_as_used(self, email: str, user: User = None) -> None:
        """
        Mark verification code as used
        
        Args:
            email: User's email address
            user: Optional User object (for registered users)
        """
        try:
            # If user is provided, prefer codes linked to their account
            if user:
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user=user,
                    is_used=False
                ).latest('created_at')
            else:
                # For anonymous users, find by email only
                verification_code = EmailVerificationCode.objects.filter(
                    email=email,
                    user__isnull=True,  # Only anonymous codes
                    is_used=False
                ).latest('created_at')
            
            verification_code.mark_as_used()
            user_type = "registered user" if user and user.is_active else "anonymous user"
            print(f"🔍 DEBUG: Marked verification code as used for {email} ({user_type})")
        except EmailVerificationCode.DoesNotExist:
            pass
    
    def send_verification_email(self, email: str, user_name: str, user: User = None) -> Tuple[bool, str, str]:
        """
        Send email verification email using Postmark template
        
        Args:
            email: Recipient email address
            user_name: User's first name
            
        Returns:
            Tuple[bool, str, str]: (success, message_id_or_error, verification_code)
        """
        print(f"🔍 DEBUG: Starting send_verification_email for {email}")
        print(f"🔍 DEBUG: User name: {user_name}")
        print(f"🔍 DEBUG: Test mode: {self.test_mode}")
        print(f"🔍 DEBUG: Postmark token: {settings.POSTMARK_TOKEN[:10] if settings.POSTMARK_TOKEN else 'NOT SET'}...")
        
        try:
            # Generate verification code
            verification_code = self.generate_verification_code()
            print(f"🔍 DEBUG: Generated verification code: {verification_code}")
            
            # Store code in database
            print(f"🔍 DEBUG: Storing verification code in database...")
            self.store_verification_code(email, verification_code, user)
            print(f"🔍 DEBUG: Code stored successfully")
            
            # Prepare template data
            template_data = {
                **self.get_base_template_data(),  # Include company-wide settings
                "email_title": "Verify Your Email Address",
                "email_subtitle": "Please use the verification code below to confirm your email address and complete your account setup.",
                "user_name": user_name,
                "verification_code": verification_code,
                "expiry_time": f"{settings.EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes"
            }
            print(f"🔍 DEBUG: Template data: {template_data}")
            
            if self.test_mode:
                print(f"🔍 DEBUG: TEST MODE - Would send verification email to {email}")
                print(f"🔍 DEBUG: TEST MODE - Verification code: {verification_code}")
                print(f"🔍 DEBUG: TEST MODE - Template data: {template_data}")
                return True, "test-message-id", verification_code
            
            # Send email via Postmark using template
            print(f"🔍 DEBUG: Attempting to send email via Postmark...")
            print(f"🔍 DEBUG: TemplateAlias: email-verification")
            print(f"🔍 DEBUG: To: {email}")
            print(f"🔍 DEBUG: From: {settings.DEFAULT_FROM_EMAIL}")
            
            # Override recipient email for testing
            test_email = "test@viverestays.com"
            print(f"🔍 DEBUG: Overriding recipient email from {email} to {test_email}")
            
            response = self.client.emails.send_with_template(
                TemplateAlias="email-verification",
                TemplateModel=template_data,
                To=test_email,  # Always send to test email
                From=settings.DEFAULT_FROM_EMAIL
            )
            
            print(f"🔍 DEBUG: Postmark response: {response}")
            print(f"🔍 DEBUG: Verification email sent to {email}, MessageID: {response['MessageID']}")
            return True, response['MessageID'], verification_code
            
        except Exception as e:
            print(f"🔍 DEBUG: Exception occurred: {str(e)}")
            print(f"🔍 DEBUG: Exception type: {type(e)}")
            import traceback
            print(f"🔍 DEBUG: Full traceback: {traceback.format_exc()}")
            return False, str(e), ""
    
    def verify_code(self, email: str, submitted_code: str, user: User = None) -> Tuple[bool, str]:
        """
        Verify submitted code against stored code
        
        Args:
            email: User's email address
            submitted_code: Code submitted by user
            
        Returns:
            Tuple[bool, str]: (success, message)
        """
        try:
            # DEVELOPMENT BYPASS: Allow "19391" as a valid code for testing
            if submitted_code.strip() == "19391":
                logger.info(f"DEVELOPMENT BYPASS: Using test code '19391' for {email}")
                # Mark the code as used even though it's a bypass
                self.mark_verification_code_as_used(email, user)
                return True, "Email verified successfully! (Development bypass used)"
            
            stored_code = self.get_verification_code(email, user)
            
            if not stored_code:
                return False, "Verification code has expired or doesn't exist. Please request a new one."
            
            if submitted_code.strip() != stored_code:
                return False, "Invalid verification code. Please check the code and try again."
            
            # Code is valid, mark it as used
            self.mark_verification_code_as_used(email, user)
            logger.info(f"Email verification successful for {email}")
            
            return True, "Email verified successfully!"
            
        except Exception as e:
            logger.error(f"Error during code verification for {email}: {str(e)}")
            return False, "An error occurred during verification. Please try again."
    
    def send_welcome_email(self, email: str, user_name: str, next_step_url: str) -> Tuple[bool, str]:
        """
        Send welcome email after successful verification
        
        Args:
            email: Recipient email address
            user_name: User's first name
            next_step_url: URL for next onboarding step
            
        Returns:
            Tuple[bool, str]: (success, message_id_or_error)
        """
        try:
            template_data = {
                **self.get_base_template_data(),  # Include logo_url
                "user_name": user_name,
                "next_step_url": next_step_url
            }
            
            if self.test_mode:
                logger.info(f"TEST MODE: Would send welcome email to {email}")
                logger.info(f"TEST MODE: Template data: {template_data}")
                return True, "test-welcome-message-id"
            
            # Send welcome email using template
            # Note: Subject is defined in the template, so we don't pass it here
            # Override recipient email for testing
            test_email = "test@viverestays.com"
            print(f"🔍 DEBUG: Overriding recipient email from {email} to {test_email}")
            
            response = self.client.emails.send_with_template(
                TemplateAlias="welcome-email",  # You'll need to create this template
                TemplateModel=template_data,
                To=test_email,  # Always send to test email
                From=settings.DEFAULT_FROM_EMAIL
            )
            
            logger.info(f"Welcome email sent to {email}, MessageID: {response['MessageID']}")
            return True, response['MessageID']
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {email}: {str(e)}")
            return False, str(e)


# Singleton instance
email_service = PostmarkEmailService()